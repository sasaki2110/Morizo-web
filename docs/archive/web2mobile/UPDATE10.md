# UPDATE10.md - 食材削除機能実装（SESSION5）

## 概要

レシピ履歴から利用した食材を削除または数量を減らす機能を実装しました。フロントエンドUI（SESSION5）を実装し、ユーザーがレシピ履歴から食材削除候補を確認し、チェックボックスで処理対象を選択してから実行できるようになりました。バックエンドAPI（SESSION1-4）は既に実装済みで、本ドキュメントではフロントエンド実装の内容を記載します。

## 実装日時

2025年11月9日（実装完了時）

## 実装背景

採用したレシピで利用した食材を在庫から削除または数量を減らす機能が必要でした。レシピ履歴から1日分の食材を集約し、ユーザーが選択的に処理を実行できるUIを実装しました。

既存のレシピ履歴表示機能（HistoryPanel）に加えて、以下の機能を追加しました：

1. **食材削除ボタン**
   - 1日分のレシピ履歴に「食材削除」ボタンを追加
   - `ingredients_deleted`フラグが`true`の場合は「削除済み」と表示し、グレーアウト

2. **食材削除モーダル**
   - 削除候補食材リストをテーブル形式で表示
   - チェックボックスで処理対象を選択
   - チェックされている場合のみ変更後数量入力欄が入力可能
   - デフォルトで全アイテムがチェック状態、変更後数量 = 変更前数量 - 1（最小0）

3. **削除済み表示**
   - APIレスポンスから`ingredients_deleted`フラグを取得
   - 削除済みの場合は「削除済み」と表示し、ボタンを非表示

**注意**: バックエンドAPI（SESSION1-4）は既に実装済みです。本ドキュメントではフロントエンド実装のみを記載します。

## 実装内容

### 1. フロントエンド: IngredientDeleteModalコンポーネントの作成

**ファイル**: `/app/Morizo-web/components/IngredientDeleteModal.tsx`（新規作成）

#### 1.1 実装内容

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth';

interface IngredientDeleteCandidate {
  inventory_id: string;
  item_name: string;
  current_quantity: number;
  unit: string;
}

interface IngredientDeleteModalProps {
  date: string; // YYYY-MM-DD形式
  isOpen: boolean;
  onClose: () => void;
  onDeleteComplete: () => void;
}

const IngredientDeleteModal: React.FC<IngredientDeleteModalProps> = ({
  date,
  isOpen,
  onClose,
  onDeleteComplete,
}) => {
  const [candidates, setCandidates] = useState<IngredientDeleteCandidate[]>([]);
  const [checkedItems, setCheckedItems] = useState<Map<string, boolean>>(new Map());
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルが開いたときに候補を取得
  useEffect(() => {
    if (isOpen && date) {
      loadCandidates();
    } else {
      // モーダルが閉じられたときに状態をリセット
      setCandidates([]);
      setCheckedItems(new Map());
      setQuantities(new Map());
      setError(null);
    }
  }, [isOpen, date]);

  const loadCandidates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch(
        `/api/recipe/ingredients/delete-candidates/${date}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setCandidates(result.candidates || []);
        // 初期状態: すべてチェック、変更後数量 = 変更前数量 - 1（最小0）
        const initialChecked = new Map<string, boolean>();
        const initialQuantities = new Map<string, number>();
        result.candidates?.forEach((candidate: IngredientDeleteCandidate) => {
          initialChecked.set(candidate.inventory_id, true);
          // 変更前数量 - 1、最小0
          const newQuantity = Math.max(0, candidate.current_quantity - 1);
          initialQuantities.set(candidate.inventory_id, newQuantity);
        });
        setCheckedItems(initialChecked);
        setQuantities(initialQuantities);
      } else {
        throw new Error('削除候補の取得に失敗しました');
      }
    } catch (err) {
      console.error('Failed to load candidates:', err);
      setError(err instanceof Error ? err.message : '削除候補の取得に失敗しました');
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckChange = (inventoryId: string, checked: boolean) => {
    const newChecked = new Map(checkedItems);
    newChecked.set(inventoryId, checked);
    setCheckedItems(newChecked);
  };

  const handleQuantityChange = (inventoryId: string, quantity: number) => {
    const newQuantities = new Map(quantities);
    newQuantities.set(inventoryId, quantity);
    setQuantities(newQuantities);
  };

  const handleDelete = async () => {
    // チェックされているアイテムを抽出して送信
    const itemsToDelete: Array<{
      item_name: string;
      quantity: number;
      inventory_id?: string;
    }> = [];

    candidates.forEach((candidate) => {
      const isChecked = checkedItems.get(candidate.inventory_id);
      if (!isChecked) {
        return; // チェックされていない場合はスキップ
      }

      const newQuantity = quantities.get(candidate.inventory_id) ?? 0;
      itemsToDelete.push({
        item_name: candidate.item_name,
        quantity: newQuantity,
        inventory_id: candidate.inventory_id,
      });
    });

    if (itemsToDelete.length === 0) {
      alert('処理対象がありません');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/recipe/ingredients/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: date,
          ingredients: itemsToDelete,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        alert(
          `処理が完了しました。\n削除: ${result.deleted_count}件\n更新: ${result.updated_count}件`
        );
        onDeleteComplete();
        onClose();
      } else {
        throw new Error('食材削除に失敗しました');
      }
    } catch (err) {
      console.error('Failed to delete ingredients:', err);
      setError(err instanceof Error ? err.message : '食材削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            🗑️ 食材削除 - {date}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={isDeleting}
          >
            ✕
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">⚠️ {error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">読み込み中...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              削除候補がありません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-12">
                      処理
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      アイテム名
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      変更前数量
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      変更後数量
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => {
                    const isChecked = checkedItems.get(candidate.inventory_id) ?? false;
                    const newQuantity = quantities.get(candidate.inventory_id) ?? 0;

                    return (
                      <tr
                        key={candidate.inventory_id}
                        className="border-b border-gray-200 dark:border-gray-700"
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              handleCheckChange(candidate.inventory_id, e.target.checked)
                            }
                            disabled={isDeleting}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-800 dark:text-white">
                          {candidate.item_name}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {candidate.current_quantity} {candidate.unit}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={isChecked ? newQuantity : ''}
                            onChange={(e) =>
                              handleQuantityChange(
                                candidate.inventory_id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            disabled={!isChecked || isDeleting}
                            min="0"
                            step="0.1"
                            className={`w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white ${
                              isChecked
                                ? ''
                                : 'bg-gray-100 dark:bg-gray-900 cursor-not-allowed'
                            }`}
                            placeholder={isChecked ? '数量を入力' : ''}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            disabled={isDeleting}
          >
            キャンセル
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || isLoading || candidates.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isDeleting ? '処理中...' : '削除実行'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientDeleteModal;
```

#### 1.2 変更の理由

- 削除候補食材リストをテーブル形式で表示し、チェックボックスで処理対象を選択できるUIを提供
- チェックボックス方式により、より直感的で使いやすいUIを実現
- デフォルトで全アイテムがチェック状態、変更後数量 = 変更前数量 - 1（最小0）で初期化
- チェックされている場合のみ変更後数量入力欄が入力可能
- 変更後数量が0の場合は削除、0以外の場合は数量更新
- 既存のモーダルデザインと統一

---

### 2. フロントエンド: HistoryPanelコンポーネントの拡張

**ファイル**: `/app/Morizo-web/components/HistoryPanel.tsx`

#### 2.1 変更箇所

**行番号**: 5行目（インポート追加）、19行目（インターフェース拡張）、32-33行目（状態管理追加）、76-92行目（ハンドラー追加）、183-198行目（ボタン追加）、234-240行目（モーダル追加）

#### 2.2 変更前

```typescript
import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth';

interface HistoryEntry {
  date: string;
  recipes: HistoryRecipe[];
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // ... 既存の状態管理 ...

  // 日付エントリの表示のみ
  <div className="space-y-4">
    {history.map((entry, index) => (
      <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
        <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">
          📆 {formatDate(entry.date)}
        </h3>
        {/* レシピリスト */}
      </div>
    ))}
  </div>
}
```

#### 2.3 変更後

```typescript
import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth';
import IngredientDeleteModal from './IngredientDeleteModal';

interface HistoryEntry {
  date: string;
  recipes: HistoryRecipe[];
  ingredients_deleted?: boolean; // 食材削除済みフラグ（オプショナル）
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // ... 既存の状態管理 ...
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const handleDeleteClick = (date: string) => {
    setSelectedDate(date);
    setDeleteModalOpen(true);
  };

  const handleDeleteComplete = () => {
    // 削除完了後、該当日付のingredients_deletedフラグを更新
    setHistory((prevHistory) =>
      prevHistory.map((entry) =>
        entry.date === selectedDate
          ? { ...entry, ingredients_deleted: true }
          : entry
      )
    );
  };

  // 日付エントリの表示 + 食材削除ボタン
  <div className="space-y-4">
    {history.map((entry, index) => (
      <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400">
            📆 {formatDate(entry.date)}
          </h3>
          {entry.ingredients_deleted ? (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              削除済み
            </span>
          ) : (
            <button
              onClick={() => handleDeleteClick(entry.date)}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              食材削除
            </button>
          )}
        </div>
        {/* レシピリスト */}
      </div>
    ))}
  </div>

  {/* 食材削除モーダル */}
  <IngredientDeleteModal
    date={selectedDate}
    isOpen={deleteModalOpen}
    onClose={() => setDeleteModalOpen(false)}
    onDeleteComplete={handleDeleteComplete}
  />
}
```

#### 2.4 変更の理由

- 各日付エントリに「食材削除」ボタンを追加
- `ingredients_deleted`フラグが`true`の場合は「削除済み」と表示
- ボタンクリックで食材削除モーダルを開く
- 削除完了後にローカル状態を更新

---

### 3. バックエンド: APIレスポンスモデルの拡張

**ファイル**: `/app/Morizo-aiv2/api/models/responses.py`

#### 3.1 変更箇所

**行番号**: 124-128行目（HistoryEntryモデルにingredients_deletedフィールドを追加）

#### 3.2 変更前

```python
class HistoryEntry(BaseModel):
    """履歴エントリ（日付単位）"""
    date: str = Field(..., description="日付（YYYY-MM-DD形式）")
    recipes: List[HistoryRecipe] = Field(..., description="その日のレシピリスト")
```

#### 3.3 変更後

```python
class HistoryEntry(BaseModel):
    """履歴エントリ（日付単位）"""
    date: str = Field(..., description="日付（YYYY-MM-DD形式）")
    recipes: List[HistoryRecipe] = Field(..., description="その日のレシピリスト")
    ingredients_deleted: bool = Field(default=False, description="食材削除済みフラグ")
```

#### 3.4 変更の理由

- フロントエンドで削除済み状態を表示するため
- その日のすべてのレシピが`ingredients_deleted=True`の場合のみ`True`を返す

---

### 4. バックエンド: メニュー履歴APIの拡張

**ファイル**: `/app/Morizo-aiv2/api/routes/menu.py`

#### 4.1 変更箇所

**行番号**: 224-302行目（ingredients_deletedフラグの収集と判定ロジックを追加）

#### 4.2 変更内容

- 日付ごとに`ingredients_deleted`フラグを収集
- その日のすべてのレシピが`ingredients_deleted=True`の場合のみ`True`を返す
- `HistoryEntry`に`ingredients_deleted`フラグを含めて返す

#### 4.3 変更の理由

- フロントエンドで削除済み状態を正確に表示するため
- 日付単位での削除済み判定を実装

---

## API仕様

### エンドポイント1: 削除候補取得

**GET** `/api/recipe/ingredients/delete-candidates/{date}`

**パラメータ**:
- `date`: 日付（YYYY-MM-DD形式、パスパラメータ）

**レスポンス** (200):
```json
{
  "success": true,
  "date": "2025-01-30",
  "candidates": [
    {
      "inventory_id": "uuid-123",
      "item_name": "りんご",
      "current_quantity": 5.0,
      "unit": "個"
    }
  ]
}
```

### エンドポイント2: 食材削除実行

**POST** `/api/recipe/ingredients/delete`

**リクエストボディ**:
```json
{
  "date": "2025-01-30",
  "ingredients": [
    {
      "item_name": "りんご",
      "quantity": 0,
      "inventory_id": "uuid-123"
    },
    {
      "item_name": "米",
      "quantity": 2.0,
      "inventory_id": "uuid-456"
    }
  ]
}
```

**レスポンス** (200):
```json
{
  "success": true,
  "deleted_count": 1,
  "updated_count": 1,
  "failed_items": []
}
```

### エンドポイント3: メニュー履歴取得（拡張）

**GET** `/api/menu/history?days={days}&category={category}`

**レスポンス** (200):
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-30",
      "recipes": [...],
      "ingredients_deleted": false
    }
  ]
}
```

---

## Next.js APIルートファイルの追加

### エンドポイント1: 削除候補取得（Next.js APIルート）

**ファイル**: `/app/Morizo-web/app/api/recipe/ingredients/delete-candidates/[date]/route.ts`（新規作成）

**実装内容**:
- GETリクエストを処理
- バックエンドの `/api/recipe/ingredients/delete-candidates/{date}` にプロキシ
- 認証チェック、CORSヘッダー設定、エラーハンドリングを実装

### エンドポイント2: 食材削除実行（Next.js APIルート）

**ファイル**: `/app/Morizo-web/app/api/recipe/ingredients/delete/route.ts`（新規作成）

**実装内容**:
- POSTリクエストを処理
- バックエンドの `/api/recipe/ingredients/delete` にプロキシ
- 認証チェック、CORSヘッダー設定、エラーハンドリングを実装

**注意**: 既存のAPIルート（`adopt/route.ts`、`menu/history/route.ts`）と同じパターンで実装されています。

---

## 実装上の注意点

### 1. チェックボックス方式について

- **チェックされているアイテム**: 処理対象としてAPIに送信される
- **チェックされていないアイテム**: 処理対象外（APIに送信されない）
- **デフォルト**: すべてのアイテムがチェック状態

### 2. 変更後数量について

- **初期値**: 変更前数量 - 1（最小0）
- **チェックされている場合**: 変更後数量入力欄が入力可能
- **チェックされていない場合**: 変更後数量入力欄が無効化（グレーアウト）
- **数値入力**: `type="number"`、`min="0"`、`step="0.1"`

### 3. 削除と数量更新の判定

- **変更後数量 = 0**: 在庫アイテムを削除（`delete_item_by_id`を呼び出す）
- **変更後数量 > 0**: 在庫アイテムの数量を更新（`update_item_by_id`を呼び出す）

### 4. 削除済み表示について

- APIレスポンスから`ingredients_deleted`フラグを取得
- その日のすべてのレシピが`ingredients_deleted=True`の場合のみ`True`を返す
- 削除済みの場合は「削除済み」と表示し、ボタンを非表示

### 5. エラーハンドリングについて

- 削除候補取得失敗時: エラーメッセージを表示
- 削除実行失敗時: エラーメッセージを表示し、成功した分は反映
- 部分成功の処理: 一部の食材削除に失敗しても、成功した分は反映

### 6. 状態管理について

- モーダルが開かれたときに削除候補を取得
- モーダルが閉じられたときに状態をリセット（`candidates`、`checkedItems`、`quantities`）
- 削除完了後にローカル状態を更新（`ingredients_deleted`フラグを`true`に設定）

---

## モバイルアプリ実装時の注意事項

1. **UIコンポーネント**: 
   - モーダルはReact Nativeの`Modal`コンポーネントを使用
   - テーブル形式のリストは`FlatList`や`SectionList`を使用
   - チェックボックスは`Switch`コンポーネントまたは`CheckBox`コンポーネントを使用
   - 数量入力は`TextInput`コンポーネントを使用（`keyboardType="numeric"`）

2. **チェックボックスUI**: 
   - チェックボックスは`Switch`コンポーネントまたは`CheckBox`コンポーネントを使用
   - デフォルトで全アイテムがチェック状態
   - チェック状態に応じて数量入力欄の有効/無効を切り替え

3. **数量入力**: 
   - チェックされている場合のみ入力欄を有効化
   - 初期値は変更前数量 - 1（最小0）
   - 数値キーボードを表示（`keyboardType="numeric"`）
   - 最小値0、小数点対応（`step="0.1"`相当）

4. **状態管理**: 
   - モーダルの開閉状態、削除候補リスト、処理選択状態を管理
   - `Map`の代わりに`Object`や`Record`を使用（React Nativeでは`Map`も利用可能）
   - 既存の状態管理ライブラリと統合

5. **API呼び出し**: 
   - 既存の認証パターンに従って、`authenticatedFetch`相当の関数を使用
   - 削除候補取得APIと削除実行APIを呼び出す
   - エラーハンドリングを適切に実装

6. **削除済み表示**: 
   - APIレスポンスから`ingredients_deleted`フラグを取得
   - フラグが`true`の場合は「削除済み」と表示し、ボタンを非表示

7. **エラーハンドリング**: 
   - エラーメッセージ表示は`Alert`を使用
   - ネットワークエラー、APIエラーを適切に処理
   - 部分成功の処理を実装

8. **パフォーマンス**: 
   - 大量の削除候補（50件以上）を表示する場合、`FlatList`の`virtualization`を活用
   - モーダルが開かれたときにのみ削除候補を取得（遅延読み込み）

9. **UX改善**: 
   - 削除実行前に確認ダイアログを表示（オプション）
   - 処理中のローディング表示を実装
   - 削除完了後の成功メッセージを表示

10. **レスポンシブ対応**: 
    - モバイル端末でも使いやすいUI
    - テーブル形式のリストは横スクロール対応
    - プルダウンと数量入力欄のレイアウトを調整

---

## 関連ドキュメント

- **INVENTORY_DELETE.md**: 食材削除機能の全体計画
- **INVENTORY_DELETE_SESSION1.md**: Phase 1A（段階提案での食材保持と保存）の実装詳細
- **INVENTORY_DELETE_SESSION2.md**: Phase 1B + Phase 1C（献立提案と提案レスポンス）の実装詳細
- **INVENTORY_DELETE_SESSION3.md**: Phase 2A（食材集約API）の実装詳細
- **INVENTORY_DELETE_SESSION4.md**: Phase 2B + Phase 3（在庫更新とフラグ更新）の実装詳細
- **INVENTORY_DELETE_SESSION5.md**: Phase 4（フロントエンド実装）の実装詳細

---

**実装者**: AI Assistant  
**レビュー**: ユーザー承認済み  
**ステータス**: UPDATE10完了

