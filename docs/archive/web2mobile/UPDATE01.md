# morizo-mobile へ伝えるアップデート履歴

## 2025-01-XX: レシピ選択UI機能の実装

### 概要
レシピモーダルにチェックボックス選択機能を追加し、ユーザーが選択したレシピをバックエンドAPI（`/api/recipe/adopt`）に通知する機能を実装しました。

### 実装された機能

#### 1. レシピ選択機能
- **チェックボックス選択**: 各レシピカードにチェックボックスを配置
- **相互排他的選択**: カテゴリ内（主菜・副菜・汁物）で1つまで選択可能
- **視覚的フィードバック**: 選択時は青色のハイライト表示

#### 2. 採用済みレシピの管理
- **セッションストレージ**: 採用済みレシピをセッション内で管理
- **視覚的マーク**: 採用済みレシピに「✓ 採用済み」バッジを表示
- **ページリロードでリセット**: セッションストレージのため、ページリロードで採用済み情報はリセット

#### 3. バックエンドAPI連携
- **エンドポイント**: `POST /api/recipe/adopt`
- **認証**: `Authorization: Bearer <token>` ヘッダー
- **menu_source設定**:
  - 斬新提案のレシピ → `"llm_menu"`
  - 伝統提案のレシピ → `"rag_menu"`
- **エラーハンドリング**: 401, 422, 500エラーの適切な処理

#### 4. UI/UX改善
- **採用ボタン**: モーダルフッターに「この献立を採用」ボタンを追加
- **ローディング状態**: 採用中はスピナー表示とボタン無効化
- **選択数表示**: 「○件選択中」の表示
- **レスポンシブ対応**: デスクトップ版とモバイル版の両方に対応

### 変更されたファイル

#### 1. `types/menu.ts`
```typescript
// 追加された型定義
export interface RecipeAdoptionRequest {
  recipes: RecipeAdoptionItem[];
}

export interface RecipeAdoptionItem {
  title: string;
  category: "main_dish" | "side_dish" | "soup";
  menu_source: "llm_menu" | "rag_menu" | "manual";
  url?: string;
}

export interface SelectedRecipes {
  main_dish: RecipeCard | null;
  side_dish: RecipeCard | null;
  soup: RecipeCard | null;
}

export interface RecipeSelection {
  recipe: RecipeCard;
  category: 'main_dish' | 'side_dish' | 'soup';
  section: 'innovative' | 'traditional';
}

// RecipeCardPropsの拡張
export interface RecipeCardProps {
  recipe: RecipeCard;
  onUrlClick?: (url: string) => void;
  isSelected?: boolean;        // 新規追加
  onSelect?: (recipe: RecipeCard) => void;  // 新規追加
  isAdopted?: boolean;         // 新規追加
}

// MenuViewerPropsの拡張
export interface MenuViewerProps {
  response: string;
  result?: unknown;
  className?: string;
  selectedRecipes?: SelectedRecipes;  // 新規追加
  onRecipeSelect?: (recipe: RecipeCard, category: 'main_dish' | 'side_dish' | 'soup', section: 'innovative' | 'traditional') => void;  // 新規追加
}
```

#### 2. `lib/recipe-api.ts` (新規作成)
```typescript
// 主要な関数
export async function adoptRecipes(recipes: RecipeAdoptionItem[]): Promise<AdoptRecipesResult>
export function saveAdoptedRecipes(recipes: RecipeAdoptionItem[]): void
export function getAdoptedRecipes(): string[]
export function isRecipeAdopted(recipeTitle: string): boolean
export function clearAdoptedRecipes(): void
```

#### 3. `components/RecipeCard.tsx`
- **チェックボックス**: カード左上に配置、選択時は青色でハイライト
- **採用済みバッジ**: 右上に「✓ 採用済み」を緑色で表示
- **プロップ追加**: `isSelected`, `onSelect`, `isAdopted`
- **CSS変更**: `relative`クラスを追加（絶対配置のため）

#### 4. `components/MenuViewer.tsx`
- **RecipeGrid拡張**: `section`プロパティを追加
- **セクション情報**: 斬新提案は`"innovative"`、伝統提案は`"traditional"`
- **選択状態管理**: プロップとして受け取る形に変更
- **採用済みチェック**: `isRecipeAdopted`関数を使用

#### 5. `components/RecipeModal.tsx`
- **状態管理**: `selectedRecipes`と`recipeSelections`の2つの状態
- **選択ハンドラー**: セクション情報を含む選択処理
- **採用処理**: セクションに応じた`menu_source`設定
- **UI更新**: フッターに採用ボタンと選択数表示を追加
- **モバイル対応**: `RecipeModalMobile`も同様の機能を実装

### API仕様

#### リクエスト形式
```typescript
interface RecipeAdoptionRequest {
  recipes: RecipeAdoptionItem[];
}

interface RecipeAdoptionItem {
  title: string;
  category: "main_dish" | "side_dish" | "soup";
  menu_source: "llm_menu" | "rag_menu" | "manual";
  url?: string;
}
```

#### レスポンス形式
```typescript
interface RecipeAdoptionResponse {
  success: boolean;
  message: string;
  saved_recipes: Array<{
    title: string;
    category: string;
    history_id: string;
  }>;
  total_saved: number;
}
```

### mobile版への移植時の注意点

1. **セッションストレージ**: mobile版では`AsyncStorage`を使用することを推奨
2. **チェックボックス**: mobile版ではタッチフレンドリーなサイズに調整
3. **採用済みバッジ**: mobile版の画面サイズに合わせて調整
4. **API呼び出し**: mobile版の認証システムに合わせて調整
5. **エラーハンドリング**: mobile版のトースト/アラートシステムに合わせて調整

### テスト項目

1. **基本選択機能**
   - [ ] レシピカードにチェックボックスが表示される
   - [ ] チェックボックスをクリックして選択/解除できる
   - [ ] 同じカテゴリ内で1つまでしか選択できない（相互排他）

2. **セクション別menu_source**
   - [ ] 斬新提案のレシピ選択時は`menu_source: "llm_menu"`
   - [ ] 伝統提案のレシピ選択時は`menu_source: "rag_menu"`

3. **採用機能**
   - [ ] 「この献立を採用」ボタンが表示される
   - [ ] 選択がない場合はボタンが無効化される
   - [ ] 採用中はローディング表示される
   - [ ] 成功時に採用済みバッジが表示される

4. **エラーハンドリング**
   - [ ] 認証エラー（401）の適切な処理
   - [ ] バリデーションエラー（422）の適切な処理
   - [ ] サーバーエラー（500）の適切な処理
   - [ ] ネットワークエラーの適切な処理

5. **レスポンシブ対応**
   - [ ] デスクトップ版で正常動作
   - [ ] モバイル版で正常動作
   - [ ] 画面サイズに応じた適切な表示

---

## 2025-10-16: レシピ採用機能のデバッグと修正完了

### 概要
レシピ採用機能の実装後、チェックボックスの動作不良とフッターボタンの表示問題を解決し、完全に動作する状態になりました。

### 発見された問題と修正内容

#### 1. チェックボックスのイベントハンドラー問題
**問題**: チェックボックスをクリックしてもチェック状態にならない
**原因**: `onChange`イベントで`React.MouseEvent`型を使用していた
**修正**: `React.ChangeEvent<HTMLInputElement>`型に変更
**修正ファイル**: `components/RecipeCard.tsx`
```typescript
// 修正前
const handleCheckboxClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (onSelect) {
    onSelect(recipe);
  }
};

// 修正後
const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  e.stopPropagation();
  if (onSelect) {
    onSelect(recipe);
  }
};
```

#### 2. フッターボタンの表示問題
**問題**: 「この献立を採用」ボタンがモーダル最下部に表示されない
**原因**: レイアウトの高さ制限によりフッターが画面外に押し出される
**修正**: Flexboxレイアウト（`flex flex-col`）を使用
**修正ファイル**: `components/RecipeModal.tsx`
```typescript
// 修正前
<div className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">

// 修正後
<div className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
```

#### 3. API接続の問題
**問題**: フロントエンドからバックエンドへのAPI接続でJSONパースエラー
**原因**: `/api/recipe/adopt`のAPI Routeが存在しない
**修正**: Next.js API Routeを作成してバックエンドにプロキシ
**新規作成ファイル**: `app/api/recipe/adopt/route.ts`
- `/api/chat`と同じパターンで実装
- `authenticatedMorizoAIRequest`を使用してバックエンドに転送
- CORSヘッダーとエラーハンドリングを実装

#### 4. デバッグ機能の追加
**追加**: レスポンスの詳細ログ機能
**修正ファイル**: `lib/recipe-api.ts`
- レスポンスステータス、ヘッダー、テキストのログ出力
- 空レスポンスとJSONパースエラーの個別処理
- より詳細なエラーメッセージ

### 動作確認結果

#### 成功した機能
✅ **チェックボックス選択**: 正常にチェック/アンチェック可能
✅ **フッターボタン表示**: 「この献立を採用」ボタンが正しく表示
✅ **API連携**: バックエンドへの正常なリクエスト送信
✅ **データベース保存**: 3件のレシピが正常に履歴テーブルに保存
✅ **UI/UX**: 成功メッセージと採用済みバッジの表示

#### ログ確認結果
- **フロントエンド**: 認証成功、API呼び出し成功（694ms）
- **バックエンド**: 3件のレシピ処理完了、DB保存成功（434ms）
- **menu_sourceマッピング**: `llm_menu` → `web`、`rag_menu` → `rag`

### mobile版への重要な注意点

#### 1. イベントハンドラーの型
**React Native**: `onChange`イベントの型が異なる可能性
**推奨**: React Nativeの適切なイベント型を使用

#### 2. レイアウトシステム
**React Native**: `flexDirection: 'column'`と`flex: 1`を使用
**推奨**: フッターが確実に表示されるレイアウト設計

#### 3. API接続方法
**Web版**: Next.js API Route経由でバックエンド接続
**Mobile版**: 直接バックエンドURL（`http://localhost:8000/api/recipe/adopt`）に接続
**推奨**: 同様のプロキシサーバーを実装するか、直接接続を実装

#### 4. デバッグ機能
**推奨**: 同様のデバッグログ機能を実装してトラブルシューティングを容易にする

#### 5. エラーハンドリング
**推奨**: 空レスポンスとJSONパースエラーの個別処理を実装

### 実装完了
レシピ採用通知機能が完全に動作し、フロントエンド-バックエンド連携が確立されました。