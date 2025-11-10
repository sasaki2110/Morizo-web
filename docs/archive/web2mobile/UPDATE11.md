# UPDATE11.md - OCR変換テーブル自動登録機能実装（セッション4）

## 概要

レシートOCR読み取り精度向上のため、ユーザーがOCR編集時にアイテム名を変更した場合、自動的に変換テーブルに登録する機能を実装しました。これにより、次回のOCR解析時に同じ商品名が自動的に正規化された名前で表示されるようになります。

## 実装日時

2025年1月（実装完了時）

## 実装背景

レシートOCRで読み取られた商品名には、ブランド名やサイズ表記など不要な情報が含まれることがあります（例: 「もっちり仕込み」→「食パン」、「新ＢＰコクのある絹豆腐」→「豆腐」）。

ユーザーがOCR編集時にアイテム名を変更した場合、その変換を自動的に変換テーブルに登録することで、次回以降のOCR解析時に同じ商品名が自動的に正規化された名前で表示されるようになります。

**注意**: バックエンドAPI（セッション3A、3B）は既に実装済みです。本ドキュメントではフロントエンド実装のみを記載します。

## 実装内容

### 1. フロントエンド: useOCRAnalysisフックの拡張

**ファイル**: `/app/Morizo-web/hooks/useOCRAnalysis.ts`

#### 1.1 OCRItemインターフェースの拡張

**変更箇所**: 6-13行目

**変更前**:
```typescript
export interface OCRItem {
  item_name: string;
  quantity: number;
  unit: string;
  storage_location: string | null;
  expiry_date: string | null;
}
```

**変更後**:
```typescript
export interface OCRItem {
  item_name: string;
  quantity: number;
  unit: string;
  storage_location: string | null;
  expiry_date: string | null;
  original_name?: string; // OCRで読み取られた元の名前（変換テーブル登録用）
}
```

**変更の理由**:
- OCRで読み取られた元の名前を保持するため
- 後方互換性のため、オプショナルフィールドとして追加

#### 1.2 analyzeImage関数の修正

**変更箇所**: 108-115行目

**変更前**:
```typescript
// 編集可能なアイテムリストを作成
if (result.items && result.items.length > 0) {
  setEditableItems([...result.items]);
} else {
  // アイテムが抽出されなかった場合
  alert('レシートからアイテムを抽出できませんでした。レシート画像が鮮明でないか、レシート以外の画像が選択されている可能性があります。');
}
```

**変更後**:
```typescript
// 編集可能なアイテムリストを作成
if (result.items && result.items.length > 0) {
  // 各アイテムにoriginal_nameを設定（OCRで読み取られた元の名前を保持）
  const itemsWithOriginalName = result.items.map(item => ({
    ...item,
    original_name: item.item_name, // 初期値をoriginal_nameとして保持
  }));
  setEditableItems(itemsWithOriginalName);
} else {
  // アイテムが抽出されなかった場合
  alert('レシートからアイテムを抽出できませんでした。レシート画像が鮮明でないか、レシート以外の画像が選択されている可能性があります。');
}
```

**変更の理由**:
- OCR解析時に読み取られた元の名前を`original_name`として保持
- ユーザーが編集した場合、元の名前と比較して変換テーブルに登録するため

#### 1.3 registerOCRMapping関数の追加

**変更箇所**: 145-174行目（新規追加）

**実装内容**:
```typescript
// 変換テーブル登録
const registerOCRMapping = useCallback(async (originalName: string, normalizedName: string) => {
  try {
    const response = await authenticatedFetch('/api/inventory/ocr-mapping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original_name: originalName,
        normalized_name: normalizedName,
      }),
    });

    if (!response.ok) {
      // エラーが発生しても既存機能に影響しないため、警告ログのみ
      const errorData = await response.json().catch(() => ({}));
      console.warn('OCR変換テーブル登録に失敗しました:', errorData.detail || 'Unknown error');
      return;
    }

    const result = await response.json();
    if (result.success) {
      console.log(`OCR変換テーブルに登録しました: '${originalName}' -> '${normalizedName}'`);
    }
  } catch (error) {
    // エラーが発生しても既存機能に影響しないため、警告ログのみ
    console.warn('OCR変換テーブル登録中にエラーが発生しました:', error);
  }
}, []);
```

**実装の理由**:
- `POST /api/inventory/ocr-mapping`を呼び出して変換テーブルに登録
- エラーが発生しても既存機能に影響しないため、警告ログのみ（ユーザーには通知しない）
- 非同期処理で実行し、UIのブロッキングを防ぐ

#### 1.4 handleItemEdit関数の修正

**変更箇所**: 176-196行目

**変更前**:
```typescript
// アイテム編集
const handleItemEdit = useCallback((index: number, field: keyof OCRItem, value: string | number | null) => {
  const updated = [...editableItems];
  updated[index] = { ...updated[index], [field]: value };
  setEditableItems(updated);
}, [editableItems]);
```

**変更後**:
```typescript
// アイテム編集
const handleItemEdit = useCallback((index: number, field: keyof OCRItem, value: string | number | null) => {
  const updated = [...editableItems];
  const previousItem = updated[index];
  updated[index] = { ...updated[index], [field]: value };
  setEditableItems(updated);

  // item_nameが変更された場合、変換テーブルに登録
  if (field === 'item_name' && typeof value === 'string') {
    const originalName = previousItem.original_name || previousItem.item_name;
    const normalizedName = value.trim();

    // 元の名前と異なり、かつ空でない場合のみ登録
    if (originalName && normalizedName && originalName !== normalizedName) {
      // 非同期で変換テーブルに登録（エラーが発生しても既存機能に影響しない）
      registerOCRMapping(originalName, normalizedName).catch((error) => {
        console.warn('OCR変換テーブル登録中にエラーが発生しました:', error);
      });
    }
  }
}, [editableItems, registerOCRMapping]);
```

**変更の理由**:
- `item_name`が変更された場合、元の名前と比較
- 異なる場合、自動的に変換テーブルに登録
- エラーが発生しても既存機能に影響しないため、警告ログのみ

---

## API仕様

### エンドポイント: OCR変換テーブル登録

**POST** `/api/inventory/ocr-mapping`

**リクエストボディ**:
```json
{
  "original_name": "もっちり仕込み",
  "normalized_name": "食パン"
}
```

**レスポンス** (200):
```json
{
  "success": true,
  "message": "変換テーブルに登録しました",
  "mapping_id": "uuid-123"
}
```

**エラーレスポンス** (500):
```json
{
  "detail": "変換テーブルへの登録に失敗しました"
}
```

---

## 動作フロー

1. **OCR解析実行**
   - ユーザーがレシート画像をアップロード
   - OCR解析APIを呼び出し
   - 各アイテムに`original_name`を設定（初期値として`item_name`を保持）

2. **アイテム名編集**
   - ユーザーがアイテム名を編集（例: 「もっちり仕込み」→「食パン」）
   - `handleItemEdit`が変更を検知

3. **変換テーブル登録**
   - 元の名前（`original_name`）と編集後の名前（`normalized_name`）を比較
   - 異なる場合、`registerOCRMapping`を非同期で呼び出し
   - `POST /api/inventory/ocr-mapping`を呼び出して変換テーブルに登録

4. **次回のOCR解析**
   - 同じ商品名が読み取られた場合、登録された変換が自動適用される
   - バックエンドの`apply_item_mappings`メソッドが変換テーブルを参照して適用

---

## 実装上の注意点

### 1. エラーハンドリングについて

- **変換テーブル登録が失敗しても、アイテム編集は正常に完了**
- エラーはコンソールに警告ログとして記録（ユーザーには通知しない）
- 既存のOCR機能に影響しない

### 2. 元の名前の保持について

- OCR解析時に`original_name`を設定（初期値として`item_name`を保持）
- `original_name`が存在しない場合（既存データなど）、編集前の`item_name`を使用
- 後方互換性のため、`original_name`はオプショナルフィールド

### 3. 変換テーブル登録の条件

- `item_name`が変更された場合のみ登録
- 元の名前と異なり、かつ空でない場合のみ登録
- 非同期処理で実行し、UIのブロッキングを防ぐ

### 4. パフォーマンスについて

- 変換テーブル登録は非同期処理で実行
- エラーが発生しても既存機能に影響しない
- ユーザー操作をブロックしない

---

## モバイルアプリ実装時の注意事項

1. **OCRItemインターフェースの拡張**:
   - `original_name?: string`フィールドを追加
   - 後方互換性のため、オプショナルフィールドとして実装

2. **OCR解析時の処理**:
   - OCR解析結果の各アイテムに`original_name`を設定
   - 初期値として`item_name`を保持

3. **アイテム編集時の処理**:
   - `item_name`が変更された場合、元の名前と比較
   - 異なる場合、変換テーブルに登録
   - エラーが発生しても既存機能に影響しない

4. **API呼び出し**:
   - `POST /api/inventory/ocr-mapping`を呼び出す
   - 既存の認証パターンに従って実装
   - エラーハンドリングを適切に実装

5. **エラーハンドリング**:
   - 変換テーブル登録が失敗しても、アイテム編集は正常に完了
   - エラーはログに記録（ユーザーには通知しない）
   - 既存のOCR機能に影響しない

6. **非同期処理**:
   - 変換テーブル登録は非同期処理で実行
   - UIのブロッキングを防ぐ
   - ユーザー操作をブロックしない

7. **状態管理**:
   - `original_name`を状態として保持
   - アイテム編集時に`original_name`と比較
   - 変更があった場合のみ変換テーブルに登録

8. **UX改善**:
   - 変換テーブル登録はバックグラウンドで実行
   - ユーザーには通知しない（静かに実行）
   - 次回のOCR解析時に自動適用されることを期待

9. **テスト**:
   - OCR解析後にアイテム名を編集
   - ブラウザの開発者ツールでネットワークタブを確認
   - `POST /api/inventory/ocr-mapping`が呼び出されていることを確認
   - 次回のOCR解析で、編集した名前が自動適用されることを確認

10. **パフォーマンス**:
    - 変換テーブル登録は非同期処理で実行
    - エラーが発生しても既存機能に影響しない
    - ユーザー操作をブロックしない

---

## 関連ドキュメント

- **OCR_TUNING.md**: レシートOCR読み取り精度向上の実装プラン
- **セッション1**: 画像LLM解析プロンプトの改善
- **セッション2**: パターンマッチングによる後処理
- **セッション3A**: データベースとCRUDサービスの実装
- **セッション3B**: API統合の実装
- **セッション4**: フロントエンド実装（本ドキュメント）

---

**実装者**: AI Assistant  
**レビュー**: ユーザー承認済み  
**ステータス**: UPDATE11完了

