# UPDATE04_1.md - Phase 5B: 選択履歴表示UIと保存機能の実装

## 概要

Phase 5Bで実装された選択履歴表示UIと保存機能を実装しました。ユーザーが選択した主菜・副菜・汁物を視覚的に確認でき、任意のタイミングで献立をDBに保存できるようになりました。

## 実装日時

2025年11月1日

## 実装背景

Phase 3で実装された段階的選択システム（主菜→副菜→汁物）において、選択したレシピを履歴として保存・閲覧する機能が不足していました。Phase 5Bでは、選択履歴の表示UIとDB保存機能を実装しました。

## 実装内容

### 1. SelectedRecipeCardコンポーネントの作成（Phase 5B-1）

**ファイル**: `/app/Morizo-web/components/SelectedRecipeCard.tsx` (新規作成)

#### 1.1 コンポーネント概要

選択したレシピを表示するUIコンポーネント。主菜・副菜・汁物の段階的な表示に対応。

#### 1.2 Props定義

```typescript
interface SelectedRecipeCardProps {
  main?: RecipeCandidate;
  sub?: RecipeCandidate;
  soup?: RecipeCandidate;
  onSave?: () => void;
  onViewDetails?: (recipe: RecipeCandidate) => void;
  isSaving?: boolean;
  savedMessage?: string;
}
```

#### 1.3 実装内容

**段階的な表示ロジック**:
- 主菜のみ選択時: 「✅ 主菜が確定しました」と表示し、主菜カードのみ表示
- 主菜+副菜選択時: 「✅ 副菜が確定しました」と表示し、主菜+副菜カードを表示
- 全3件選択時: 「🎉 献立が完成しました！」と表示し、全3件のカードを表示

**レシピカードの構造**:
- 各レシピには絵文字アイコン（🍖主菜、🥗副菜、🍲汁物）
- レシピタイトルと食材リストを表示
- ダークモード対応

**保存ボタン**:
- `onSave`が指定された場合のみ表示
- `isSaving`で保存中の状態を管理
- 保存成功メッセージを表示（5秒後に自動で消える）

**スタイリング**:
- Tailwind CSSを使用
- レスポンシブ対応（`sm:flex-row`等）
- 緑色の枠線と背景で「完成」状態を視覚的に表現

### 2. 選択確定時の情報取得（Phase 5B-2）

**ファイル**: 
- `/app/Morizo-aiv2/core/handlers/selection_handler.py`
- `/app/Morizo-web/components/ChatSection.tsx`
- `/app/Morizo-web/components/SelectionOptions.tsx`

#### 2.1 バックエンドレスポンス拡張

**修正箇所**: `selection_handler.py`の`process_user_selection`メソッド

各レスポンスに`selected_recipe`フィールドを追加：

```python
# next_stage == "sub"の場合
return {
    "success": True,
    "message": "主菜が確定しました。副菜を提案します。",
    "requires_next_stage": True,
    "selected_recipe": {  # 新規追加
        "category": "main",
        "recipe": selected_recipe
    }
}

# next_stage == "soup"の場合
return {
    "success": True,
    "message": "副菜が確定しました。汁物を提案します。",
    "requires_next_stage": True,
    "selected_recipe": {  # 新規追加
        "category": "sub",
        "recipe": selected_recipe
    }
}

# next_stage == "completed"の場合
return {
    "success": True,
    "message": "献立が完成しました。",
    "menu": {...},
    "selected_recipe": {  # 新規追加
        "category": "soup",
        "recipe": selected_recipe
    }
}
```

#### 2.2 フロントエンド状態管理の追加

**修正箇所**: `ChatSection.tsx`

選択済みレシピを管理する状態を追加：

```typescript
// Phase 5B-2: 選択済みレシピを管理
const [selectedRecipes, setSelectedRecipes] = useState<{
  main?: RecipeCandidate;
  sub?: RecipeCandidate;
  soup?: RecipeCandidate;
}>({});
```

#### 2.3 選択処理の拡張

**修正箇所**: `SelectionOptions.tsx`と`ChatSection.tsx`

`SelectionOptions`の`onSelect`コールバックを拡張して、レスポンス全体を渡すように変更：

```typescript
// SelectionOptions.tsx
interface SelectionOptionsProps {
  onSelect: (selection: number, selectionResult?: any) => void;  // 拡張
  // ...
}

// handleConfirm関数内
if (result.success) {
  // Phase 5B-2: レスポンス全体をonSelectに渡す
  onSelect(selectedIndex + 1, result);
  // ...
}
```

`ChatSection`の`handleSelection`関数で、レスポンスから選択したレシピ情報を取得：

```typescript
const handleSelection = (selection: number, selectionResult?: any) => {
  // Phase 5B-2: 選択したレシピ情報を取得して状態に保存
  if (selectionResult && selectionResult.selected_recipe) {
    const { category, recipe } = selectionResult.selected_recipe;
    const categoryKey = category as 'main' | 'sub' | 'soup';
    
    // RecipeCandidate型に変換
    const recipeCandidate: RecipeCandidate = {
      title: recipe.title || '',
      ingredients: recipe.ingredients || [],
      cooking_time: recipe.cooking_time,
      description: recipe.description,
      category: categoryKey,
      source: recipe.source,
      urls: recipe.urls
    };
    
    // selectedRecipes状態を更新
    setSelectedRecipes(prev => ({
      ...prev,
      [categoryKey]: recipeCandidate
    }));
  }
  
  // 選択結果メッセージを追加
  setChatMessages(prev => [...prev, {
    type: 'user' as const,
    content: `${selection}番を選択しました`
  }]);
};
```

### 3. 保存機能の実装と統合（Phase 5B-3）

**ファイル**: `/app/Morizo-web/components/ChatSection.tsx`

#### 3.1 コンポーネントのインポート

```typescript
import SelectedRecipeCard from '@/components/SelectedRecipeCard';  // Phase 5B-3
```

#### 3.2 保存機能の状態管理

```typescript
// Phase 5B-3: 保存機能の状態管理
const [isSavingMenu, setIsSavingMenu] = useState(false);
const [savedMessage, setSavedMessage] = useState<string>('');
```

#### 3.3 保存機能の実装

```typescript
const handleSaveMenu = async () => {
  if (!selectedRecipes.main && !selectedRecipes.sub && !selectedRecipes.soup) {
    alert('保存するレシピがありません');
    return;
  }
  
  setIsSavingMenu(true);
  setSavedMessage('');
  
  try {
    // 現在のSSEセッションIDを取得
    const currentSseSessionId = chatMessages
      .find(msg => msg.sseSessionId)?.sseSessionId || '';
    
    if (!currentSseSessionId || currentSseSessionId === 'unknown') {
      throw new Error('セッション情報が取得できません');
    }
    
    // Phase 5Aで実装したAPIを呼び出し
    const response = await authenticatedFetch('/api/menu/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sse_session_id: currentSseSessionId
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      setSavedMessage(result.message || `${result.total_saved}つのレシピが保存されました`);
      
      // 保存成功後、メッセージをクリア（5秒後）
      setTimeout(() => {
        setSavedMessage('');
      }, 5000);
    } else {
      throw new Error(result.message || '保存に失敗しました');
    }
  } catch (error) {
    console.error('Menu save failed:', error);
    alert('献立の保存に失敗しました。もう一度お試しください。');
    setSavedMessage('');
  } finally {
    setIsSavingMenu(false);
  }
};
```

#### 3.4 UI統合

チャット履歴の表示部分に、選択済みレシピのカードを表示：

```typescript
{/* Phase 5B-3: 選択済みレシピの表示 */}
{(selectedRecipes.main || selectedRecipes.sub || selectedRecipes.soup) && (
  <div className="mt-6">
    <SelectedRecipeCard
      main={selectedRecipes.main}
      sub={selectedRecipes.sub}
      soup={selectedRecipes.soup}
      onSave={handleSaveMenu}
      isSaving={isSavingMenu}
      savedMessage={savedMessage}
    />
  </div>
)}
```

#### 3.5 チャット履歴クリア時の処理拡張

```typescript
const clearChatHistory = () => {
  setChatMessages([]);
  setAwaitingConfirmation(false);
  setConfirmationSessionId(null);
  setAwaitingSelection(false);
  // Phase 5B-3: 選択済みレシピもクリア
  setSelectedRecipes({});
  setSavedMessage('');
};
```

## 動作フロー

### 1. レシピ選択時

1. ユーザーが選択UIでレシピを選択
2. `SelectionOptions`コンポーネントが`/api/chat/selection`にリクエスト送信
3. バックエンドが選択を処理し、`selected_recipe`を含むレスポンスを返す
4. `ChatSection`の`handleSelection`が呼び出される
5. `selectedRecipes`状態が更新される
6. `SelectedRecipeCard`コンポーネントが表示される（該当するレシピが存在する場合）

### 2. 献立保存時

1. ユーザーが「献立を保存」ボタンをクリック
2. `handleSaveMenu`関数が実行される
3. 現在のSSEセッションIDを取得
4. `/api/menu/save`エンドポイントにリクエスト送信
5. バックエンドがセッションから選択済みレシピを取得してDBに保存
6. 成功メッセージを表示（5秒後に自動で消える）

## モバイルアプリへの移植ポイント

### 1. SelectedRecipeCardコンポーネント

**対応するモバイルコンポーネント**: `SelectedRecipeCard.tsx`（新規作成）

**実装内容**:
- React Nativeの`View`と`Text`コンポーネントを使用
- Tailwind CSSのクラスをStyleSheetに変換
- 絵文字はそのまま使用可能
- レスポンシブ対応はReact Nativeの`Dimensions`を使用

**注意点**:
- `dark:`クラスは、モバイルアプリのテーマシステムに対応
- `sm:flex-row`などのブレークポイントは、画面サイズベースで判定

### 2. 状態管理の追加

**対応するファイル**: チャット画面の状態管理ファイル

**追加する状態**:
```typescript
// 選択済みレシピを管理
const [selectedRecipes, setSelectedRecipes] = useState<{
  main?: RecipeCandidate;
  sub?: RecipeCandidate;
  soup?: RecipeCandidate;
}>({});

// 保存機能の状態管理
const [isSavingMenu, setIsSavingMenu] = useState(false);
const [savedMessage, setSavedMessage] = useState<string>('');
```

### 3. 選択処理の拡張

**対応するファイル**: 選択UIコンポーネント

**変更内容**:
- `onSelect`コールバックにレスポンス全体を渡すように変更
- 選択確定時に`selectedRecipes`状態を更新

### 4. 保存機能の実装

**対応するファイル**: チャット画面のAPI呼び出しファイル

**実装内容**:
- `/api/menu/save`エンドポイントを呼び出す関数を実装
- SSEセッションIDの取得方法を確認（モバイルアプリでのセッション管理方法に合わせて調整）
- 成功/失敗のフィードバックを実装（アラートまたはトーストメッセージ）

### 5. UI統合

**対応するファイル**: チャット画面のレンダリング部分

**実装内容**:
- チャット履歴の下に`SelectedRecipeCard`を表示
- 条件: `selectedRecipes.main || selectedRecipes.sub || selectedRecipes.soup`

## 依存関係

### Phase 5Aとの関係

Phase 5B-3の保存機能は、Phase 5Aで実装された`/api/menu/save`エンドポイントを使用します。Phase 5Aの実装が完了している必要があります。

### Phase 5B-2との関係

Phase 5B-3は、Phase 5B-2で実装された`selectedRecipes`状態管理と選択情報取得機能に依存します。

## テスト項目

### 単体テスト

1. **SelectedRecipeCardコンポーネント**
   - 主菜のみ表示
   - 主菜+副菜表示
   - 全3件表示
   - 保存ボタンの表示/非表示
   - 保存状態の表示

2. **保存機能**
   - 保存成功時の処理
   - 保存失敗時の処理
   - エラーハンドリング

### 統合テスト

1. **選択確定時の情報取得**
   - バックエンドレスポンスに`selected_recipe`が含まれること
   - `selectedRecipes`状態が正しく更新されること

2. **保存機能**
   - `/api/menu/save`エンドポイントが正しく呼び出されること
   - 保存成功メッセージが表示されること

## 注意事項

1. **セッションIDの取得**: モバイルアプリでのセッション管理方法に合わせて、SSEセッションIDの取得方法を調整する必要があります。

2. **認証**: `authenticatedFetch`はモバイルアプリの認証システムに合わせて実装する必要があります。

3. **エラーハンドリング**: モバイルアプリでは、アラートの代わりにトーストメッセージやスナックバーを使用することを推奨します。

4. **ダークモード**: モバイルアプリのテーマシステムに合わせて、ダークモード対応を実装する必要があります。

## 関連ファイル

- `/app/Morizo-web/components/SelectedRecipeCard.tsx` (新規作成)
- `/app/Morizo-web/components/ChatSection.tsx` (修正)
- `/app/Morizo-web/components/SelectionOptions.tsx` (修正)
- `/app/Morizo-aiv2/core/handlers/selection_handler.py` (修正)
- `/app/Morizo-aiv2/api/routes/menu.py` (Phase 5Aで作成)

