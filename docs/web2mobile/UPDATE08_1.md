# UPDATE08_1.md - 在庫ビューアー実装（Phase 1-1, 1-2）

## 概要

在庫一覧を表示する機能を実装しました。バックエンドAPI（Phase 1-1）とフロントエンドUI（Phase 1-2）を実装し、ユーザーが在庫を一覧表示できるようになりました。一覧表示とフィルター・ソート機能のみを実装し、CRUD操作（編集・削除）は Phase 2-2 で実装予定です。

## 実装日時

2025年11月2日（実装完了時）

## 実装背景

ユーザーが在庫を視覚的に確認できる機能が必要でした。既存の履歴ビューアーと同様のドロワー型UIで、以下の機能を実装しました：

1. **在庫一覧の表示**
   - アイテム名、数量、単位、保管場所、登録日をテーブル形式で表示
   
2. **フィルター機能**
   - 保管場所でのフィルター
   - アイテム名での検索

3. **ソート機能**
   - 登録日、アイテム名、数量、保管場所、消費期限でのソート
   - 昇順・降順の切り替え

**注意**: CRUD操作については設計思想としてLLM→MCP経由を想定していましたが、在庫ビューアーはパフォーマンス重視で直接DB呼び出しを採用しました。

## 実装内容

### 1. バックエンド: レスポンスモデルの拡張

**ファイル**: `/app/Morizo-aiv2/api/models/responses.py`

#### 1.1 変更箇所

**行番号**: 58-61行目（新規追加）

#### 1.2 変更内容

```python
class InventoryListResponse(BaseModel):
    """在庫一覧レスポンス"""
    success: bool = Field(..., description="成功フラグ")
    data: List[InventoryResponse] = Field(..., description="在庫アイテムリスト")
```

#### 1.3 変更の理由

在庫一覧取得APIのレスポンス形式を定義するため。既存の`InventoryResponse`を再利用。

---

### 2. バックエンド: 在庫ルートファイルの作成

**ファイル**: `/app/Morizo-aiv2/api/routes/inventory.py`（新規作成）

#### 2.1 実装内容

```python
#!/usr/bin/env python3
"""
API層 - 在庫ルート

在庫管理のエンドポイント（一覧取得のみ）
"""

from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any, Optional
from config.loggers import GenericLogger
from ..models import InventoryResponse, InventoryListResponse
from mcp_servers.inventory_crud import InventoryCRUD
from mcp_servers.utils import get_authenticated_client

router = APIRouter()
logger = GenericLogger("api", "inventory")


@router.get("/inventory/list", response_model=InventoryListResponse)
async def get_inventory_list(
    http_request: Request,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc"
):
    """在庫一覧を取得するエンドポイント
    
    Args:
        sort_by: ソート対象カラム (item_name, quantity, created_at, storage_location, expiry_date)
        sort_order: ソート順序 (asc, desc)
    """
    try:
        logger.info(f"🔍 [API] Inventory list request received: sort_by={sort_by}, sort_order={sort_order}")
        
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
        
        # 3. CRUDクラスを使用して在庫一覧を取得
        # 注意: 直接DB呼び出しは設計思想に反するが、在庫ビューアーは例外とする
        # (CRUD操作のためにLLM→MCP経由は重いため、パフォーマンス重視で直接呼び出し)
        crud = InventoryCRUD()
        result = await crud.get_all_items(client, user_id, sort_by=sort_by, sort_order=sort_order)
        
        if not result.get("success"):
            logger.error(f"❌ [API] Failed to get inventory list: {result.get('error')}")
            raise HTTPException(status_code=500, detail=result.get("error", "在庫取得処理でエラーが発生しました"))
        
        logger.info(f"✅ [API] Retrieved {len(result.get('data', []))} inventory items")
        
        return {
            "success": True,
            "data": result.get("data", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [API] Unexpected error in get_inventory_list: {e}")
        raise HTTPException(status_code=500, detail="在庫取得処理でエラーが発生しました")
```

#### 2.2 変更の理由

- フロントエンドから在庫データを取得できるようにする
- 履歴ビューアー（`/api/menu/history`）と同様のAPIパターンに統一
- 一覧表示に必要な最小限の機能のみを実装
- 直接DB呼び出しでパフォーマンスを重視

---

### 3. バックエンド: CRUDクラスのソート機能追加

**ファイル**: `/app/Morizo-aiv2/mcp_servers/inventory_crud.py`

#### 3.1 変更箇所

**行番号**: 59-104行目（`get_all_items`メソッドの拡張）

#### 3.2 変更前

```python
async def get_all_items(self, client: Client, user_id: str) -> Dict[str, Any]:
    """ユーザーの全在庫アイテムを取得"""
    try:
        self.logger.info(f"📋 [CRUD] Getting all items for user: {user_id}")
        
        result = client.table("inventory").select("*").eq("user_id", user_id).execute()
        
        self.logger.info(f"✅ [CRUD] Retrieved {len(result.data)} items")
        return {"success": True, "data": result.data}
        
    except Exception as e:
        self.logger.error(f"❌ [CRUD] Failed to get items: {e}")
        return {"success": False, "error": str(e)}
```

#### 3.3 変更後

```python
async def get_all_items(
    self, 
    client: Client, 
    user_id: str,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc"
) -> Dict[str, Any]:
    """ユーザーの全在庫アイテムを取得
    
    Args:
        client: Supabaseクライアント
        user_id: ユーザーID
        sort_by: ソート対象カラム (item_name, quantity, created_at, storage_location, expiry_date)
        sort_order: ソート順序 (asc, desc)
    """
    try:
        self.logger.info(f"📋 [CRUD] Getting all items for user: {user_id}, sort_by={sort_by}, sort_order={sort_order}")
        
        # ソート対象カラムの検証
        valid_sort_columns = ["item_name", "quantity", "created_at", "storage_location", "expiry_date"]
        if sort_by not in valid_sort_columns:
            sort_by = "created_at"
            self.logger.warning(f"⚠️ [CRUD] Invalid sort_by, using default: created_at")
        
        # ソート順序の検証
        if sort_order not in ["asc", "desc"]:
            sort_order = "desc"
            self.logger.warning(f"⚠️ [CRUD] Invalid sort_order, using default: desc")
        
        # Supabaseクエリビルダー
        query = client.table("inventory").select("*").eq("user_id", user_id)
        
        # ソート順を適用
        if sort_order == "desc":
            query = query.order(sort_by, desc=True)
        else:
            query = query.order(sort_by, desc=False)
        
        result = query.execute()
        
        self.logger.info(f"✅ [CRUD] Retrieved {len(result.data)} items")
        return {"success": True, "data": result.data}
        
    except Exception as e:
        self.logger.error(f"❌ [CRUD] Failed to get items: {e}")
        return {"success": False, "error": str(e)}
```

#### 3.4 変更の理由

ユーザーが在庫を任意の順序で表示できるようにするため。

---

### 4. バックエンド: ルーター登録

**ファイル**: `/app/Morizo-aiv2/api/routes/__init__.py`

#### 4.1 変更箇所

**行番号**: 12行目（インポート追加）、19行目（`__all__`に追加）

#### 4.2 変更内容

```python
from .inventory import router as inventory_router

__all__ = [
    'chat_router',
    'health_router',
    'recipe_router',
    'menu_router',
    'inventory_router'  # 追加
]
```

**ファイル**: `/app/Morizo-aiv2/main.py`

#### 4.3 変更箇所

**行番号**: 18行目（インポート追加）、94行目（ルーター登録追加）

#### 4.4 変更内容

```python
from api.routes import chat_router, health_router, recipe_router, menu_router, inventory_router

# ルートの登録
app.include_router(inventory_router, prefix="/api", tags=["inventory"])
```

#### 4.5 変更の理由

新規ルートをAPIとして利用可能にするため。

---

### 5. バックエンド: モデルエクスポート追加

**ファイル**: `/app/Morizo-aiv2/api/models/__init__.py`

#### 5.1 変更箇所

**行番号**: 9行目（インポート追加）、22行目（`__all__`に追加）

#### 5.2 変更内容

```python
from .responses import ChatResponse, HealthResponse, InventoryResponse, InventoryListResponse, ErrorResponse, ...

__all__ = [
    ...
    'InventoryResponse',
    'InventoryListResponse',  # 追加
    ...
]
```

#### 5.3 変更の理由

`InventoryListResponse`を他のモジュールからインポート可能にするため。

---

### 6. フロントエンド: useModalManagementフックの拡張

**ファイル**: `/app/Morizo-web/hooks/useModalManagement.ts`

#### 6.1 変更箇所

**行番号**: 6-7行目（コメント修正）、14行目（状態追加）、44-50行目（関数追加）、67-70行目（戻り値追加）

#### 6.2 変更前

```typescript
/**
 * モーダル管理フック
 * レシピ詳細モーダル、レシピ一覧モーダル、履歴パネルの状態を管理
 */
export function useModalManagement() {
  ...
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  ...

  return {
    // 詳細モーダル
    ...
    // 履歴パネル
    isHistoryPanelOpen,
    openHistoryPanel,
    closeHistoryPanel,
  };
}
```

#### 6.3 変更後

```typescript
/**
 * モーダル管理フック
 * レシピ詳細モーダル、レシピ一覧モーダル、履歴パネル、在庫パネルの状態を管理
 */
export function useModalManagement() {
  ...
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [isInventoryPanelOpen, setIsInventoryPanelOpen] = useState(false);

  ...

  const closeInventoryPanel = () => {
    setIsInventoryPanelOpen(false);
  };

  const openInventoryPanel = () => {
    setIsInventoryPanelOpen(true);
  };

  return {
    // 詳細モーダル
    ...
    // 履歴パネル
    isHistoryPanelOpen,
    openHistoryPanel,
    closeHistoryPanel,
    // 在庫パネル
    isInventoryPanelOpen,
    openInventoryPanel,
    closeInventoryPanel,
  };
}
```

#### 6.4 変更の理由

在庫パネルの開閉状態を管理するため。既存パターンに合わせた実装。

---

### 7. フロントエンド: InventoryPanelコンポーネントの作成

**ファイル**: `/app/Morizo-web/components/InventoryPanel.tsx`（新規作成）

#### 7.1 実装内容

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

interface InventoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const InventoryPanel: React.FC<InventoryPanelProps> = ({ isOpen, onClose }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storageLocationFilter, setStorageLocationFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  useEffect(() => {
    if (isOpen) {
      loadInventory();
    }
  }, [isOpen, sortBy, sortOrder]);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const url = `/api/inventory/list?sort_by=${sortBy}&sort_order=${sortOrder}`;
      const response = await authenticatedFetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setInventory(result.data);
      }
    } catch (error) {
      console.error('Inventory load failed:', error);
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  // フィルター適用
  const filteredInventory = inventory.filter(item => {
    const matchesStorage = !storageLocationFilter || item.storage_location === storageLocationFilter;
    const matchesSearch = !searchQuery || 
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStorage && matchesSearch;
  });

  // 保管場所の一意リストを取得
  const storageLocations = Array.from(new Set(
    inventory.map(item => item.storage_location).filter(Boolean) as string[]
  ));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            📦 在庫管理
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        {/* フィルター */}
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
              保管場所
            </label>
            <select
              value={storageLocationFilter}
              onChange={(e) => setStorageLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">全て</option>
              {storageLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
              検索
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="アイテム名で検索..."
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                並び順
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="created_at">登録日</option>
                <option value="item_name">アイテム名</option>
                <option value="quantity">数量</option>
                <option value="storage_location">保管場所</option>
                <option value="expiry_date">消費期限</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                順序
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="desc">降順</option>
                <option value="asc">昇順</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">読み込み中...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {inventory.length === 0 ? '在庫がありません' : '該当する在庫がありません'}
          </div>
        ) : (
          <div className="space-y-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">アイテム名</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400">数量</th>
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">単位</th>
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">場所</th>
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">登録日</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-2 text-gray-800 dark:text-white">{item.item_name}</td>
                    <td className="py-2 text-right text-gray-800 dark:text-white">{item.quantity}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">{item.unit}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">{item.storage_location || '-'}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPanel;
```

#### 7.2 変更の理由

- 履歴ビューアーと同様のドロワー型UIで統一
- テーブル形式で在庫情報を一覧表示
- フィルター機能（保管場所、検索）を実装
- ソート機能を実装
- CRUD操作ボタンは Phase 2-2 で実装予定

---

### 8. フロントエンド: ChatSectionへの統合

**ファイル**: `/app/Morizo-web/components/ChatSection.tsx`

#### 8.1 変更箇所

**行番号**: 9行目（インポート追加）、39-41行目（フックから取得）、123行目（プロパティ追加）、150-154行目（コンポーネント追加）

#### 8.2 変更内容

```typescript
import InventoryPanel from '@/components/InventoryPanel';

// useModalManagementから取得
const {
  ...
  isInventoryPanelOpen,
  openInventoryPanel,
  closeInventoryPanel,
} = useModalManagement();

// ChatInputに渡す
<ChatInput
  ...
  onOpenInventory={openInventoryPanel}
/>

// InventoryPanelコンポーネントの追加
<InventoryPanel
  isOpen={isInventoryPanelOpen}
  onClose={closeInventoryPanel}
/>
```

#### 8.3 変更の理由

在庫パネルを表示可能にするため。

---

### 9. フロントエンド: ChatInputへの在庫ボタン追加

**ファイル**: `/app/Morizo-web/components/ChatInput.tsx`

#### 9.1 変更箇所

**行番号**: 11行目（プロパティ追加）、26行目（パラメータ追加）、34-40行目（ボタン追加）

#### 9.2 変更前

```typescript
interface ChatInputProps {
  ...
  onOpenHistory: () => void;
}

export default function ChatInput({
  ...
  onOpenHistory,
}: ChatInputProps) {
  return (
    ...
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          Morizo AI テキストチャット
        </h2>
        <button
          onClick={onOpenHistory}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          📅 履歴
        </button>
      </div>
```

#### 9.3 変更後

```typescript
interface ChatInputProps {
  ...
  onOpenHistory: () => void;
  onOpenInventory: () => void;
}

export default function ChatInput({
  ...
  onOpenHistory,
  onOpenInventory,
}: ChatInputProps) {
  return (
    ...
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          Morizo AI テキストチャット
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onOpenInventory}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            📦 在庫
          </button>
          <button
            onClick={onOpenHistory}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            📅 履歴
          </button>
        </div>
      </div>
```

#### 9.4 変更の理由

ユーザーが在庫パネルにアクセスできるようにするため。

---

### 10. フロントエンド: Next.js APIルートの作成

**ファイル**: `/app/Morizo-web/app/api/inventory/list/route.ts`（新規作成）

#### 10.1 実装内容

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, authenticatedMorizoAIRequest } from '@/lib/auth-server';
import { ServerLogger, LogCategory, logApiCall, logError } from '@/lib/logging-utils';

const MORIZO_AI_URL = process.env.MORIZO_AI_URL || 'http://localhost:8000';

// CORSヘッダーを設定するヘルパー関数
function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

// OPTIONSリクエストのハンドラー（CORS preflight）
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}

export async function GET(request: NextRequest) {
  const timer = ServerLogger.startTimer('inventory-list-api');
  
  try {
    ServerLogger.info(LogCategory.API, '在庫一覧取得API呼び出し開始');

    // クエリパラメータの取得
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    
    ServerLogger.debug(LogCategory.API, 'クエリパラメータ解析完了', { 
      sortBy,
      sortOrder
    });

    // 認証チェック
    ServerLogger.debug(LogCategory.API, '認証チェック開始');
    const authResult = await authenticateRequest(request);
    
    // 認証失敗の場合はNextResponseを返す
    if (authResult instanceof NextResponse) {
      ServerLogger.warn(LogCategory.API, '認証失敗');
      return setCorsHeaders(authResult);
    }
    
    const { token } = authResult;
    ServerLogger.info(LogCategory.API, '認証成功', { tokenMasked: ServerLogger.maskToken(token) });

    // Morizo AIに送信（認証トークン付き）
    ServerLogger.info(LogCategory.API, 'Morizo AIに在庫一覧取得リクエスト送信開始');
    
    // クエリパラメータを構築
    const queryParams = new URLSearchParams();
    queryParams.append('sort_by', sortBy);
    queryParams.append('sort_order', sortOrder);
    
    const queryString = queryParams.toString();
    const url = `${MORIZO_AI_URL}/api/inventory/list?${queryString}`;
    
    const aiResponse = await authenticatedMorizoAIRequest(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }, token);

    if (!aiResponse.ok) {
      const errorMsg = `Morizo AI エラー: ${aiResponse.status}`;
      ServerLogger.error(LogCategory.API, errorMsg, { status: aiResponse.status });
      throw new Error(errorMsg);
    }

    const data = await aiResponse.json();
    ServerLogger.info(LogCategory.API, 'Morizo AIからのレスポンス受信完了', { 
      success: data.success,
      dataLength: data.data?.length || 0
    });

    timer();
    logApiCall('GET', '/api/inventory/list', 200, undefined);
    
    const nextResponse = NextResponse.json({
      success: data.success,
      data: data.data
    });
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'inventory-list-api');
    logApiCall('GET', '/api/inventory/list', 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
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

#### 10.2 変更の理由

フロントエンドからのリクエストをFastAPIサーバーにプロキシするため。既存の`/api/menu/history`と同様のパターン。

---

## API仕様

### エンドポイント

**GET** `/api/inventory/list`

### クエリパラメータ

- `sort_by` (Optional, Default: `"created_at"`)
  - ソート対象カラム
  - 指定可能な値: `item_name`, `quantity`, `created_at`, `storage_location`, `expiry_date`

- `sort_order` (Optional, Default: `"desc"`)
  - ソート順序
  - 指定可能な値: `asc` (昇順), `desc` (降順)

### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "item_name": "string",
      "quantity": 0.0,
      "unit": "string",
      "storage_location": "string | null",
      "expiry_date": "string | null",
      "created_at": "string",
      "updated_at": "string"
    }
  ]
}
```

---

## 実装上の注意点

### 1. 直接DB呼び出しについて

在庫ビューアーでは、設計思想に反して直接DB呼び出しを採用しています。これは以下の理由によるものです：

- CRUD操作のためにLLM→MCP経由は重いため、パフォーマンス重視で直接呼び出しを選択
- 在庫一覧表示は単純なデータ取得であり、AIエージェントの判断を必要としない
- ユーザー体験を優先した設計判断

### 2. ソート機能について

- ソートはDBレベルで実行されるため、パフォーマンスが良好
- 無効なソートパラメータが渡された場合、デフォルト値（`created_at`降順）にフォールバック

### 3. フィルター機能について

- 保管場所フィルターと検索機能はフロントエンド側で実装
- ソートはバックエンド側で実行され、フィルターはフロントエンド側で実行される

---

## 次のフェーズ

- **Phase 2-1**: CRUD操作のバックエンド実装（追加・更新・削除）
- **Phase 2-2**: CRUD操作のフロントエンド実装（編集・削除ボタンの追加）

---

## モバイルアプリ実装時の注意事項

1. **UIコンポーネント**: ドロワー型UIはモバイルアプリでも同様に実装可能。React Nativeの`Modal`や`Drawer`コンポーネントを使用。

2. **API呼び出し**: 既存の認証パターンに従って、`authenticatedFetch`相当の関数を使用。

3. **状態管理**: `useModalManagement`相当のフックをモバイルアプリでも実装するか、既存の状態管理ライブラリと統合。

4. **フィルター・ソート**: フロントエンド実装部分はそのまま移植可能。DBソートも同様に動作する。

5. **パフォーマンス**: 直接DB呼び出しを採用しているため、モバイルアプリでも高速に動作する。

