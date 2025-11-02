# UPDATE08_2.md - 在庫CRUD操作実装（Phase 2-1, 2-2）

## 概要

在庫アイテムの作成・更新・削除を行うCRUD操作機能を実装しました。バックエンドAPI（Phase 2-1）とフロントエンドUI（Phase 2-2）を実装し、ユーザーが在庫を追加・編集・削除できるようになりました。Phase 1で実装した一覧表示機能に加えて、完全なCRUD操作が可能になりました。

## 実装日時

2025年11月2日（実装完了時）

## 実装背景

Phase 1で在庫の一覧表示機能を実装しましたが、ユーザーが在庫を管理するためには追加・編集・削除機能が必要でした。既存の履歴ビューアーと同様のUIパターンで、以下の機能を実装しました：

1. **在庫アイテムの追加**
   - 新規追加ボタンからモーダルを開いて在庫を追加
   
2. **在庫アイテムの編集**
   - 各行の「編集」ボタンからモーダルを開いて在庫を編集
   
3. **在庫アイテムの削除**
   - 各行の「削除」ボタンから確認ダイアログを表示して削除

**注意**: CRUD操作についてもPhase 1と同様、設計思想としてLLM→MCP経由を想定していましたが、在庫ビューアーはパフォーマンス重視で直接DB呼び出しを採用しました（特例）。

## 実装内容

### 1. バックエンド: レスポンスモデルの拡張

**ファイル**: `/app/Morizo-aiv2/api/models/responses.py`

#### 1.1 変更箇所

**行番号**: 64-67行目（新規追加）

#### 1.2 変更内容

```python
class InventoryItemResponse(BaseModel):
    """在庫アイテム単体レスポンス（追加・更新用）"""
    success: bool = Field(..., description="成功フラグ")
    data: InventoryResponse = Field(..., description="在庫アイテム")
```

#### 1.3 変更の理由

在庫アイテムの追加・更新APIのレスポンス形式を定義するため。既存の`InventoryResponse`を再利用。

---

### 2. バックエンド: モデルエクスポート追加

**ファイル**: `/app/Morizo-aiv2/api/models/__init__.py`

#### 2.1 変更箇所

**行番号**: 9行目（インポート追加）、23行目（`__all__`に追加）

#### 2.2 変更内容

```python
from .responses import ChatResponse, HealthResponse, InventoryResponse, InventoryListResponse, InventoryItemResponse, ErrorResponse, ...

__all__ = [
    ...
    'InventoryResponse',
    'InventoryListResponse',
    'InventoryItemResponse',  # 追加
    ...
]
```

#### 2.3 変更の理由

`InventoryItemResponse`を他のモジュールからインポート可能にするため。

---

### 3. バックエンド: 在庫ルートファイルの拡張

**ファイル**: `/app/Morizo-aiv2/api/routes/inventory.py`

#### 3.1 変更箇所

**行番号**: 11行目（インポート修正）、79-133行目（追加エンドポイント）、136-194行目（更新エンドポイント）、197-243行目（削除エンドポイント）

#### 3.2 変更前

```python
from mcp_servers.inventory_mcp import inventory_add, inventory_update_by_id, inventory_delete_by_id
from mcp_servers.inventory_crud import InventoryCRUD
from mcp_servers.utils import get_authenticated_client

# 一覧取得エンドポイントのみ
```

#### 3.3 変更後

```python
from mcp_servers.inventory_crud import InventoryCRUD
from mcp_servers.utils import get_authenticated_client

# 一覧取得エンドポイント + CRUD操作エンドポイント

@router.post("/inventory/add", response_model=InventoryItemResponse)
async def add_inventory_item(request: InventoryRequest, http_request: Request):
    """在庫アイテムを追加するエンドポイント"""
    try:
        logger.info(f"🔍 [API] Inventory add request received: item_name={request.item_name}")
        
        # 1. 認証処理
        authorization = http_request.headers.get("Authorization")
        token = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
        
        user_info = getattr(http_request.state, 'user_info', None)
        if not user_info:
            logger.error("❌ [API] User info not found in request state")
            raise HTTPException(status_code=401, detail="認証が必要です")
        
        user_id = user_info['user_id']
        logger.info(f"🔍 [API] User ID: {user_id}")
        
        # 2. 認証済みSupabaseクライアントの作成
        try:
            client = get_authenticated_client(user_id, token)
            logger.info(f"✅ [API] Authenticated client created for user: {user_id}")
        except Exception as e:
            logger.error(f"❌ [API] Failed to create authenticated client: {e}")
            raise HTTPException(status_code=401, detail="認証に失敗しました")
        
        # 3. CRUDクラスを使用して在庫を追加
        # 【特例】直接DB呼び出しは設計思想に反するが、在庫ビューアーは例外とする
        # CRUD操作のためにLLM→MCP経由は重いため、パフォーマンス重視で直接呼び出し
        crud = InventoryCRUD()
        result = await crud.add_item(
            client=client,
            user_id=user_id,
            item_name=request.item_name,
            quantity=request.quantity,
            unit=request.unit,
            storage_location=request.storage_location,
            expiry_date=request.expiry_date
        )
        
        if not result.get("success"):
            logger.error(f"❌ [API] Failed to add inventory: {result.get('error')}")
            raise HTTPException(status_code=500, detail=result.get("error", "在庫追加処理でエラーが発生しました"))
        
        logger.info(f"✅ [API] Inventory item added: {result.get('data', {}).get('id')}")
        
        return {
            "success": True,
            "data": result.get("data")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [API] Unexpected error in add_inventory_item: {e}")
        raise HTTPException(status_code=500, detail="在庫追加処理でエラーが発生しました")


@router.put("/inventory/update/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(
    item_id: str,
    request: InventoryRequest,
    http_request: Request
):
    """在庫アイテムを更新するエンドポイント"""
    try:
        logger.info(f"🔍 [API] Inventory update request received: item_id={item_id}")
        
        # 1. 認証処理
        authorization = http_request.headers.get("Authorization")
        token = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
        
        user_info = getattr(http_request.state, 'user_info', None)
        if not user_info:
            logger.error("❌ [API] User info not found in request state")
            raise HTTPException(status_code=401, detail="認証が必要です")
        
        user_id = user_info['user_id']
        
        # 2. 認証済みSupabaseクライアントの作成
        try:
            client = get_authenticated_client(user_id, token)
            logger.info(f"✅ [API] Authenticated client created for user: {user_id}")
        except Exception as e:
            logger.error(f"❌ [API] Failed to create authenticated client: {e}")
            raise HTTPException(status_code=401, detail="認証に失敗しました")
        
        # 3. CRUDクラスを使用して在庫を更新
        # 【特例】直接DB呼び出しは設計思想に反するが、在庫ビューアーは例外とする
        # CRUD操作のためにLLM→MCP経由は重いため、パフォーマンス重視で直接呼び出し
        crud = InventoryCRUD()
        result = await crud.update_item_by_id(
            client=client,
            user_id=user_id,
            item_id=item_id,
            quantity=request.quantity,
            unit=request.unit,
            storage_location=request.storage_location,
            expiry_date=request.expiry_date
        )
        
        if not result.get("success"):
            logger.error(f"❌ [API] Failed to update inventory: {result.get('error')}")
            raise HTTPException(status_code=500, detail=result.get("error", "在庫更新処理でエラーが発生しました"))
        
        logger.info(f"✅ [API] Inventory item updated: {item_id}")
        
        return {
            "success": True,
            "data": result.get("data")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [API] Unexpected error in update_inventory_item: {e}")
        raise HTTPException(status_code=500, detail="在庫更新処理でエラーが発生しました")


@router.delete("/inventory/delete/{item_id}")
async def delete_inventory_item(item_id: str, http_request: Request):
    """在庫アイテムを削除するエンドポイント"""
    try:
        logger.info(f"🔍 [API] Inventory delete request received: item_id={item_id}")
        
        # 1. 認証処理
        authorization = http_request.headers.get("Authorization")
        token = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
        
        user_info = getattr(http_request.state, 'user_info', None)
        if not user_info:
            logger.error("❌ [API] User info not found in request state")
            raise HTTPException(status_code=401, detail="認証が必要です")
        
        user_id = user_info['user_id']
        
        # 2. 認証済みSupabaseクライアントの作成
        try:
            client = get_authenticated_client(user_id, token)
            logger.info(f"✅ [API] Authenticated client created for user: {user_id}")
        except Exception as e:
            logger.error(f"❌ [API] Failed to create authenticated client: {e}")
            raise HTTPException(status_code=401, detail="認証に失敗しました")
        
        # 3. CRUDクラスを使用して在庫を削除
        # 【特例】直接DB呼び出しは設計思想に反するが、在庫ビューアーは例外とする
        # CRUD操作のためにLLM→MCP経由は重いため、パフォーマンス重視で直接呼び出し
        crud = InventoryCRUD()
        result = await crud.delete_item_by_id(client, user_id, item_id)
        
        if not result.get("success"):
            logger.error(f"❌ [API] Failed to delete inventory: {result.get('error')}")
            raise HTTPException(status_code=500, detail=result.get("error", "在庫削除処理でエラーが発生しました"))
        
        logger.info(f"✅ [API] Inventory item deleted: {item_id}")
        
        return {
            "success": True,
            "message": "在庫アイテムを削除しました"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [API] Unexpected error in delete_inventory_item: {e}")
        raise HTTPException(status_code=500, detail="在庫削除処理でエラーが発生しました")
```

#### 3.4 変更の理由

- フロントエンドから在庫のCRUD操作を実行できるようにする
- 一覧取得エンドポイントと同様のパターンで統一
- MCPツール経由ではなく、直接CRUDクラスを呼び出すことでパフォーマンスを向上（特例）

---

### 4. フロントエンド: InventoryEditModalコンポーネントの作成

**ファイル**: `/app/Morizo-web/components/InventoryEditModal.tsx`（新規作成）

#### 4.1 実装内容

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth';

interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  storage_location: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

interface InventoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null; // nullの場合は新規作成
  onSave: () => void;
}

const InventoryEditModal: React.FC<InventoryEditModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
}) => {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState('個');
  const [storageLocation, setStorageLocation] = useState('冷蔵庫');
  const [expiryDate, setExpiryDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      // 編集モード
      setItemName(item.item_name);
      setQuantity(item.quantity);
      setUnit(item.unit);
      setStorageLocation(item.storage_location || '冷蔵庫');
      setExpiryDate(item.expiry_date ? item.expiry_date.split('T')[0] : '');
    } else {
      // 新規作成モード
      setItemName('');
      setQuantity(0);
      setUnit('個');
      setStorageLocation('冷蔵庫');
      setExpiryDate('');
    }
  }, [item, isOpen]);

  const handleSave = async () => {
    if (!itemName.trim()) {
      alert('アイテム名を入力してください');
      return;
    }
    
    if (quantity <= 0) {
      alert('数量は0より大きい値が必要です');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        item_name: itemName.trim(),
        quantity: quantity,
        unit: unit,
        storage_location: storageLocation || null,
        expiry_date: expiryDate || null,
      };

      let response;
      if (item) {
        // 更新
        response = await authenticatedFetch(`/api/inventory/update/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        // 新規作成
        response = await authenticatedFetch('/api/inventory/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        onSave();
      } else {
        throw new Error(result.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('Inventory save failed:', error);
      alert(error instanceof Error ? error.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const units = ['個', 'kg', 'g', 'L', 'ml', '本', 'パック', '袋'];
  const storageLocations = ['冷蔵庫', '冷凍庫', '常温倉庫', '野菜室', 'その他'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              {item ? '在庫編集' : '新規追加'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* アイテム名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                アイテム名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="例: りんご"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {/* 数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                数量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {/* 単位 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                単位 <span className="text-red-500">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              >
                {units.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* 保管場所 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                保管場所
              </label>
              <select
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              >
                {storageLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* 賞味期限 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                賞味期限
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryEditModal;
```

#### 4.2 変更の理由

- 新規追加と編集を同一モーダルで処理
- バリデーション機能の実装（必須項目、数量の正の値チェック）
- ユーザーフレンドリーなフォーム設計

---

### 5. フロントエンド: InventoryPanelコンポーネントの拡張

**ファイル**: `/app/Morizo-web/components/InventoryPanel.tsx`

#### 5.1 変更箇所

**行番号**: 5行目（インポート追加）、30-32行目（状態管理追加）、80-125行目（関数追加）、230行目（操作列追加）、241-257行目（編集・削除ボタン追加）、265-273行目（新規追加ボタン）、277-284行目（編集モーダル）

#### 5.2 変更前

```typescript
import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth';

const InventoryPanel: React.FC<InventoryPanelProps> = ({ isOpen, onClose }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  // ... 既存の状態管理 ...

  // テーブルに操作列なし、新規追加ボタンなし
}
```

#### 5.3 変更後

```typescript
import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth';
import InventoryEditModal from '@/components/InventoryEditModal';

const InventoryPanel: React.FC<InventoryPanelProps> = ({ isOpen, onClose }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  // ... 既存の状態管理 ...
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleAddNew = () => {
    setEditingItem(null);
    setIsEditModalOpen(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (itemId: string, itemName: string) => {
    if (!confirm(`「${itemName}」を削除しますか？`)) {
      return;
    }
    
    setIsDeleting(itemId);
    try {
      const response = await authenticatedFetch(`/api/inventory/delete/${itemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        await loadInventory(); // 一覧を再読み込み
      }
    } catch (error) {
      console.error('Inventory delete failed:', error);
      alert('削除に失敗しました');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  const handleEditModalSave = async () => {
    await loadInventory(); // 一覧を再読み込み
    handleEditModalClose();
  };

  // テーブルに操作列を追加
  <th className="text-center py-2 text-gray-600 dark:text-gray-400">操作</th>

  // テーブル行に編集・削除ボタンを追加
  <td className="py-2">
    <div className="flex gap-2 justify-center">
      <button
        onClick={() => handleEdit(item)}
        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
      >
        編集
      </button>
      <button
        onClick={() => handleDelete(item.id, item.item_name)}
        disabled={isDeleting === item.id}
        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs disabled:opacity-50"
      >
        {isDeleting === item.id ? '削除中...' : '削除'}
      </button>
    </div>
  </td>

  // 新規追加ボタンを追加
  <div className="mt-4">
    <button
      onClick={handleAddNew}
      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
    >
      + 新規追加
    </button>
  </div>

  // 編集モーダルの表示
  {isEditModalOpen && (
    <InventoryEditModal
      isOpen={isEditModalOpen}
      onClose={handleEditModalClose}
      item={editingItem}
      onSave={handleEditModalSave}
    />
  )}
}
```

#### 5.4 変更の理由

- CRUD操作機能を追加
- 編集・削除ボタンを配置
- 新規追加ボタンを配置
- 編集モーダルとの連携

---

### 6. フロントエンド: Next.js APIルートの追加

**ファイル**: 
- `/app/Morizo-web/app/api/inventory/add/route.ts`（新規作成）
- `/app/Morizo-web/app/api/inventory/update/[item_id]/route.ts`（新規作成）
- `/app/Morizo-web/app/api/inventory/delete/[item_id]/route.ts`（新規作成）

#### 6.1 実装内容（add/route.ts）

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, authenticatedMorizoAIRequest } from '@/lib/auth-server';
import { ServerLogger, LogCategory, logApiCall, logError } from '@/lib/logging-utils';

const MORIZO_AI_URL = process.env.MORIZO_AI_URL || 'http://localhost:8000';

function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}

export async function POST(request: NextRequest) {
  const timer = ServerLogger.startTimer('inventory-add-api');
  
  try {
    ServerLogger.info(LogCategory.API, '在庫追加API呼び出し開始');

    const body = await request.json();
    ServerLogger.debug(LogCategory.API, 'リクエストボディ解析完了', { 
      itemName: body.item_name,
      quantity: body.quantity
    });

    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) {
      ServerLogger.warn(LogCategory.API, '認証失敗');
      return setCorsHeaders(authResult);
    }
    
    const { token } = authResult;
    ServerLogger.info(LogCategory.API, '認証成功', { tokenMasked: ServerLogger.maskToken(token) });

    const url = `${MORIZO_AI_URL}/api/inventory/add`;
    
    const aiResponse = await authenticatedMorizoAIRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }, token);

    if (!aiResponse.ok) {
      const errorMsg = `Morizo AI エラー: ${aiResponse.status}`;
      ServerLogger.error(LogCategory.API, errorMsg, { status: aiResponse.status });
      throw new Error(errorMsg);
    }

    const data = await aiResponse.json();
    ServerLogger.info(LogCategory.API, 'Morizo AIからのレスポンス受信完了', { 
      success: data.success,
      itemId: data.data?.id
    });

    timer();
    logApiCall('POST', '/api/inventory/add', 200, undefined);
    
    const nextResponse = NextResponse.json({
      success: data.success,
      data: data.data
    });
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'inventory-add-api');
    logApiCall('POST', '/api/inventory/add', 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
    const errorResponse = NextResponse.json(
      { 
        error: 'Morizo AIとの通信に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
    return setCorsHeaders(errorResponse);
  }
}
```

#### 6.2 実装内容（update/[item_id]/route.ts）

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { item_id: string } }
) {
  const timer = ServerLogger.startTimer('inventory-update-api');
  
  try {
    const itemId = params.item_id;
    ServerLogger.info(LogCategory.API, '在庫更新API呼び出し開始', { itemId });

    const body = await request.json();
    // ... 認証処理 ...
    
    const url = `${MORIZO_AI_URL}/api/inventory/update/${itemId}`;
    
    const aiResponse = await authenticatedMorizoAIRequest(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }, token);

    // ... エラーハンドリング ...
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    // ... エラーハンドリング ...
  }
}
```

#### 6.3 実装内容（delete/[item_id]/route.ts）

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { item_id: string } }
) {
  const timer = ServerLogger.startTimer('inventory-delete-api');
  
  try {
    const itemId = params.item_id;
    ServerLogger.info(LogCategory.API, '在庫削除API呼び出し開始', { itemId });

    // ... 認証処理 ...
    
    const url = `${MORIZO_AI_URL}/api/inventory/delete/${itemId}`;
    
    const aiResponse = await authenticatedMorizoAIRequest(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }, token);

    // ... エラーハンドリング ...
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    // ... エラーハンドリング ...
  }
}
```

#### 6.4 変更の理由

フロントエンドからのリクエストをFastAPIサーバーにプロキシするため。既存の`/api/inventory/list`と同様のパターン。

---

## API仕様

### エンドポイント

#### POST `/api/inventory/add`

在庫アイテムを追加するエンドポイント。

**リクエストボディ**:
```json
{
  "item_name": "string",
  "quantity": 0.0,
  "unit": "string",
  "storage_location": "string | null",
  "expiry_date": "string | null"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "item_name": "string",
    "quantity": 0.0,
    "unit": "string",
    "storage_location": "string | null",
    "expiry_date": "string | null",
    "created_at": "string",
    "updated_at": "string"
  }
}
```

#### PUT `/api/inventory/update/{item_id}`

在庫アイテムを更新するエンドポイント。

**パスパラメータ**:
- `item_id`: 更新する在庫アイテムのID

**リクエストボディ**:
```json
{
  "item_name": "string",
  "quantity": 0.0,
  "unit": "string",
  "storage_location": "string | null",
  "expiry_date": "string | null"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "item_name": "string",
    "quantity": 0.0,
    "unit": "string",
    "storage_location": "string | null",
    "expiry_date": "string | null",
    "created_at": "string",
    "updated_at": "string"
  }
}
```

#### DELETE `/api/inventory/delete/{item_id}`

在庫アイテムを削除するエンドポイント。

**パスパラメータ**:
- `item_id`: 削除する在庫アイテムのID

**レスポンス**:
```json
{
  "success": true,
  "message": "在庫アイテムを削除しました"
}
```

---

## 実装上の注意点

### 1. 直接DB呼び出しについて（特例）

在庫ビューアーのCRUD操作でも、設計思想に反して直接DB呼び出しを採用しています。これは以下の理由によるものです：

- CRUD操作のためにLLM→MCP経由は重いため、パフォーマンス重視で直接呼び出しを選択
- 在庫の追加・更新・削除は単純なデータ操作であり、AIエージェントの判断を必要としない
- ユーザー体験を優先した設計判断

**重要**: この直接DB呼び出しは在庫ビューアーのみの特例です。他の機能では設計思想（LLM→MCP経由）に従ってください。

### 2. バリデーションについて

- クライアント側で基本的なバリデーションを実装（必須項目、数量の正の値チェック）
- サーバー側でもPydanticモデルによるバリデーションが実行される
- エラーハンドリングは適切に実装されている

### 3. モーダル管理について

- 新規作成と編集を同一モーダルで処理
- `item`プロパティが`null`の場合は新規作成、存在する場合は編集
- モーダル閉鎖時に一覧を自動再読み込み

### 4. エラーハンドリングについて

- API呼び出し失敗時のエラーメッセージ表示
- 削除確認ダイアログの実装
- ローディング状態の表示（保存中、削除中など）

---

## モバイルアプリ実装時の注意事項

1. **UIコンポーネント**: 
   - 編集モーダルはReact Nativeの`Modal`コンポーネントを使用
   - 編集・削除ボタンは`TouchableOpacity`や`Pressable`を使用
   - フォーム入力は`TextInput`と`Picker`を使用

2. **API呼び出し**: 
   - 既存の認証パターンに従って、`authenticatedFetch`相当の関数を使用
   - `POST`、`PUT`、`DELETE`メソッドに対応

3. **状態管理**: 
   - 編集モーダルの開閉状態、編集中のアイテム、削除中のアイテムIDを管理
   - 既存の状態管理ライブラリと統合

4. **バリデーション**: 
   - クライアント側のバリデーションはそのまま移植可能
   - サーバー側のバリデーションも同様に動作する

5. **エラーハンドリング**: 
   - 削除確認ダイアログはReact Nativeの`Alert`を使用
   - エラーメッセージ表示も`Alert`を使用

6. **パフォーマンス**: 
   - 直接DB呼び出しを採用しているため、モバイルアプリでも高速に動作する
   - CRUD操作後の一覧再読み込みも自動で実行される

---

## 関連ドキュメント

- **UPDATE08_1.md**: 在庫一覧表示機能（Phase 1-1, 1-2）の実装内容

---

