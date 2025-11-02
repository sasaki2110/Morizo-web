# UPDATE06.md - レシピを見るボタンの追加・変更

## 概要

`SelectionOptions`コンポーネントの「レシピ一覧を見る」ボタンのテキストを「レシピを見る」に変更し、`SelectedRecipeCard`コンポーネントにも同様の「レシピを見る」ボタンを追加しました。これにより、選択中のレシピ候補と選択済みレシピの両方から、レシピ詳細情報を確認できるようになりました。

## 実装日時

2025年2月（実装完了時）

## 実装背景

ユーザーから以下の要望がありました：

1. `SelectionOptions`コンポーネントの「レシピ一覧を見る」ボタンのテキストを「レシピを見る」に変更
2. `SelectedRecipeCard`コンポーネントにも同様の「レシピを見る」ボタンを追加

これにより、選択中のレシピ候補だけでなく、選択済みレシピ（主菜・副菜・汁物）からも、レシピ詳細情報を確認できるようになり、ユーザー体験が向上します。

## 実装内容

### 1. SelectionOptions.tsxのボタンテキスト変更

**ファイル**: `/app/Morizo-web/components/SelectionOptions.tsx`

#### 1.1 変更箇所

**行番号**: 247行目

#### 1.2 変更前

```typescript
<button 
  onClick={() => onViewList(candidates)}
  disabled={isLoading || isConfirming}
  className="px-6 py-3 rounded-lg font-medium transition-colors duration-200 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
>
  📋 レシピ一覧を見る
</button>
```

#### 1.3 変更後

```typescript
<button 
  onClick={() => onViewList(candidates)}
  disabled={isLoading || isConfirming}
  className="px-6 py-3 rounded-lg font-medium transition-colors duration-200 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
>
  📋 レシピを見る
</button>
```

#### 1.4 変更内容

- ボタンのテキストを「📋 レシピ一覧を見る」から「📋 レシピを見る」に変更
- 機能や動作は変更なし（`onViewList`コールバックの呼び出しは同じ）

#### 1.5 変更の理由

ユーザー要求に基づき、ボタンのテキストをより簡潔で分かりやすい表現に変更しました。「レシピ一覧を見る」よりも「レシピを見る」の方が、ユーザーにとって直感的です。

---

### 2. SelectedRecipeCard.tsxにonViewListプロップとボタンを追加

**ファイル**: `/app/Morizo-web/components/SelectedRecipeCard.tsx`

#### 2.1 Propsインターフェースの拡張

**変更箇所**: 6-14行目（`SelectedRecipeCardProps`インターフェース）

**変更前**:

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

**変更後**:

```typescript
interface SelectedRecipeCardProps {
  main?: RecipeCandidate;
  sub?: RecipeCandidate;
  soup?: RecipeCandidate;
  onSave?: () => void;
  onViewDetails?: (recipe: RecipeCandidate) => void;
  onViewList?: (candidates: RecipeCandidate[]) => void;  // 新規追加
  isSaving?: boolean;
  savedMessage?: string;
}
```

#### 2.2 コンポーネント引数の拡張

**変更箇所**: 17-26行目（コンポーネントの引数リスト）

**変更前**:

```typescript
const SelectedRecipeCard: React.FC<SelectedRecipeCardProps> = ({
  main,
  sub,
  soup,
  onSave,
  onViewDetails,
  isSaving = false,
  savedMessage
}) => {
```

**変更後**:

```typescript
const SelectedRecipeCard: React.FC<SelectedRecipeCardProps> = ({
  main,
  sub,
  soup,
  onSave,
  onViewDetails,
  onViewList,  // 新規追加
  isSaving = false,
  savedMessage
}) => {
```

#### 2.3 保存ボタンと同じ行に「レシピを見る」ボタンを追加

**変更箇所**: 107-131行目（保存ボタンがある行）

**変更前**:

```typescript
<div className="mt-4 flex flex-col sm:flex-row gap-3">
  {onSave && (
    <button
      onClick={onSave}
      disabled={isSaving}
      className="px-6 py-3 rounded-lg font-medium transition-colors duration-200 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {isSaving ? '保存中...' : '献立を保存'}
    </button>
  )}
</div>
```

**変更後**:

```typescript
<div className="mt-4 flex flex-col sm:flex-row gap-3">
  {onSave && (
    <button
      onClick={onSave}
      disabled={isSaving}
      className="px-6 py-3 rounded-lg font-medium transition-colors duration-200 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {isSaving ? '保存中...' : '献立を保存'}
    </button>
  )}
  {onViewList && (main || sub || soup) && (
    <button
      onClick={() => {
        const recipes = [];
        if (main) recipes.push(main);
        if (sub) recipes.push(sub);
        if (soup) recipes.push(soup);
        onViewList(recipes);
      }}
      className="px-6 py-3 rounded-lg font-medium transition-colors duration-200 bg-indigo-600 hover:bg-indigo-700 text-white"
    >
      📋 レシピを見る
    </button>
  )}
</div>
```

#### 2.4 変更内容のまとめ

- **Propsインターフェース**: `onViewList?: (candidates: RecipeCandidate[]) => void;`を追加（オプショナル）
- **コンポーネント引数**: `onViewList`を追加
- **保存ボタンと同じ行**: 「レシピを見る」ボタンを追加
  - ボタンクリック時は、確定済みのレシピ（main/sub/soupがある分）を配列として`onViewList`に渡す
  - 主菜のみ確定している場合：主菜のみを配列として渡す
  - 主菜+副菜が確定している場合：主菜+副菜を配列として渡す
  - 全3件が確定している場合：主菜+副菜+汁物を配列として渡す

#### 2.5 スタイリング

- `SelectionOptions`のボタンと同じスタイル（`bg-indigo-600 hover:bg-indigo-700`）を使用
- 保存ボタンと同じサイズ（`px-6 py-3`）で、同じ行に配置
- レスポンシブデザインを維持（`flex-col sm:flex-row`により、モバイルでは縦並び、デスクトップでは横並び）

---

### 3. ChatMessageList.tsxでSelectedRecipeCardにonViewListプロップを渡す

**ファイル**: `/app/Morizo-web/components/ChatMessageList.tsx`

#### 3.1 変更箇所

**行番号**: 231-239行目（`SelectedRecipeCard`の呼び出し部分）

#### 3.2 変更前

```typescript
<SelectedRecipeCard
  main={selectedRecipes.main}
  sub={selectedRecipes.sub}
  soup={selectedRecipes.soup}
  onSave={onSaveMenu}
  isSaving={isSavingMenu}
  savedMessage={savedMessage}
/>
```

#### 3.3 変更後

```typescript
<SelectedRecipeCard
  main={selectedRecipes.main}
  sub={selectedRecipes.sub}
  soup={selectedRecipes.soup}
  onSave={onSaveMenu}
  onViewList={onViewList}  // 新規追加
  isSaving={isSavingMenu}
  savedMessage={savedMessage}
/>
```

#### 3.4 変更内容

- `ChatMessageList`コンポーネントは既に`onViewList`プロップを受け取っているため、それを`SelectedRecipeCard`に渡すように変更
- これにより、選択済みレシピからもレシピ一覧モーダルを開けるようになる

#### 3.5 変更の理由

`ChatMessageList`は既に`onViewList`プロップ（29行目のProps定義で確認）を持っており、これを`SelectedRecipeCard`に渡すことで、選択済みレシピからもレシピ詳細情報を確認できるようになります。

---

## 実装のポイント

### 1. ボタンの配置方針

**採用**: 保存ボタンと同じ行に1つのボタンを配置

- 「献立を保存」ボタンの右側に「レシピを見る」ボタンを1つ追加
- ボタンクリック時は、確定済みのレシピ（main/sub/soupがある分）を全て配列として`onViewList`に渡す
- これにより、ユーザーは確定している全てのレシピを一度に確認できる

### 2. スタイリングの統一

- `SelectionOptions`のボタンと同じスタイル（`bg-indigo-600 hover:bg-indigo-700`）を使用
- 保存ボタンと同じサイズ（`px-6 py-3`）で、同じ行に配置
- レスポンシブデザインを維持（`flex-col sm:flex-row`により、モバイルでは縦並び、デスクトップでは横並び）

### 3. 既存機能との互換性

- `onViewList`はオプショナルプロップとして実装
- 既存の`onViewDetails`とは別の機能として提供（詳細表示と一覧表示は用途が異なる）
- 既存の動作や表示ロジックに影響を与えない

### 4. ボタンの表示条件

- 確定済みのレシピ（main/sub/soupのいずれか）が存在する場合のみボタンを表示
- `onViewList`プロップが提供されている場合のみボタンを表示

---

## Mobile連携が必要な項目

### 1. SelectionOptionsコンポーネント

**ファイル**: モバイル版の`SelectionOptions.tsx`相当のコンポーネント

#### 1.1 ボタンテキストの変更

Web版と同様に、ボタンのテキストを「レシピ一覧を見る」から「レシピを見る」に変更します。

**React Native版の例**:

```tsx
import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';

// ... 既存のコード ...

{onViewList && (
  <TouchableOpacity
    onPress={() => onViewList(candidates)}
    disabled={isLoading || isConfirming}
    style={[
      styles.viewListButton,
      (isLoading || isConfirming) && styles.viewListButtonDisabled
    ]}
  >
    <Text style={styles.viewListButtonText}>📋 レシピを見る</Text>
  </TouchableOpacity>
)}
```

**スタイル定義**:

```tsx
const styles = StyleSheet.create({
  viewListButton: {
    backgroundColor: '#4f46e5', // indigo-600
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewListButtonDisabled: {
    backgroundColor: '#9ca3af', // gray-400
  },
  viewListButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
```

---

### 2. SelectedRecipeCardコンポーネント

**ファイル**: モバイル版の`SelectedRecipeCard.tsx`相当のコンポーネント

#### 2.1 Propsインターフェースの拡張

Web版と同様に、`onViewList`プロップを追加します。

```tsx
interface SelectedRecipeCardProps {
  main?: RecipeCandidate;
  sub?: RecipeCandidate;
  soup?: RecipeCandidate;
  onSave?: () => void;
  onViewDetails?: (recipe: RecipeCandidate) => void;
  onViewList?: (candidates: RecipeCandidate[]) => void;  // 新規追加
  isSaving?: boolean;
  savedMessage?: string;
}
```

#### 2.2 保存ボタンと同じ行にボタンを追加

**React Native版の例**:

```tsx
<View style={styles.buttonContainer}>
  {onSave && (
    <TouchableOpacity
      onPress={onSave}
      disabled={isSaving}
      style={[
        styles.saveButton,
        isSaving && styles.saveButtonDisabled
      ]}
    >
      <Text style={styles.saveButtonText}>
        {isSaving ? '保存中...' : '献立を保存'}
      </Text>
    </TouchableOpacity>
  )}
  {onViewList && (main || sub || soup) && (
    <TouchableOpacity
      onPress={() => {
        const recipes = [];
        if (main) recipes.push(main);
        if (sub) recipes.push(sub);
        if (soup) recipes.push(soup);
        onViewList(recipes);
      }}
      style={styles.viewRecipeButton}
    >
      <Text style={styles.viewRecipeButtonText}>📋 レシピを見る</Text>
    </TouchableOpacity>
  )}
</View>
```

**スタイル定義**:

```tsx
const styles = StyleSheet.create({
  buttonContainer: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  saveButton: {
    backgroundColor: '#16a34a', // green-600
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    minWidth: 120,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af', // gray-400
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  viewRecipeButton: {
    backgroundColor: '#4f46e5', // indigo-600
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    minWidth: 120,
  },
  viewRecipeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
```

---

### 3. ChatMessageListコンポーネント（または相当のコンポーネント）

**ファイル**: モバイル版の`ChatMessageList.tsx`相当のコンポーネント

Web版と同様に、`SelectedRecipeCard`に`onViewList`プロップを渡すように修正します。

```tsx
<SelectedRecipeCard
  main={selectedRecipes.main}
  sub={selectedRecipes.sub}
  soup={selectedRecipes.soup}
  onSave={onSaveMenu}
  onViewList={onViewList}  // 新規追加
  isSaving={isSavingMenu}
  savedMessage={savedMessage}
/>
```

---

### 4. モーダル管理フック（useModalManagement）

**ファイル**: モバイル版の`useModalManagement.ts`相当のフック

Web版と同様に、`handleViewList`関数が正しく実装されていることを確認します。

```tsx
const handleViewList = (candidates: RecipeCandidate[]) => {
  setListModalCandidates(candidates);
  setIsListModalOpen(true);
};
```

React Nativeでは、`Modal`コンポーネントを使用してレシピ一覧モーダルを実装します。

---

### 5. レシピ一覧モーダル（RecipeListModal）

**ファイル**: モバイル版の`RecipeListModal.tsx`相当のコンポーネント

Web版と同様に、レシピ一覧を表示するモーダルコンポーネントが正しく動作することを確認します。

React Native版の例:

```tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface RecipeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: RecipeCandidate[];
}

export default function RecipeListModal({
  isOpen,
  onClose,
  candidates,
}: RecipeListModalProps) {
  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>レシピ一覧</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {candidates.map((candidate, index) => (
              <View key={index} style={styles.recipeItem}>
                <Text style={styles.recipeItemTitle}>
                  {index + 1}. {candidate.title}
                </Text>
                {candidate.ingredients && candidate.ingredients.length > 0 && (
                  <Text style={styles.recipeItemIngredients}>
                    食材: {candidate.ingredients.join(', ')}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
```

---

## 変更の影響範囲

### 影響を受けるファイル

1. **components/SelectionOptions.tsx**: ボタンテキストを変更（1箇所）
2. **components/SelectedRecipeCard.tsx**: Props追加、保存ボタンと同じ行にボタン追加（2箇所）
3. **components/ChatMessageList.tsx**: `onViewList`プロップを渡すように変更（1箇所）

### 影響を受けないファイル

- **既存のコンポーネント**: `RecipeDetailModal`, `RecipeListModal`等は変更なし
- **既存のAPI**: バックエンドAPIとの連携は変更なし
- **既存のフック**: `useModalManagement`は変更なし（既存機能を活用）

### 互換性

- **後方互換**: `onViewListはオプショナルプロップのため、既存の使用箇所に影響なし
- **既存機能への影響**: なし（既存の`onViewDetails`とは別の機能として追加）

---

## テスト項目

### 1. SelectionOptionsのボタンテキスト確認

- [ ] 「レシピを見る」ボタンが正しく表示される
- [ ] ボタンクリック時にレシピ一覧モーダルが開く
- [ ] モーダルに候補レシピが正しく表示される

### 2. SelectedRecipeCardのボタン追加確認

- [ ] 確定済みのレシピ（main/sub/soupのいずれか）がある場合、「レシピを見る」ボタンが表示される
- [ ] ボタンが「献立を保存」ボタンの右側に表示される
- [ ] 主菜のみ確定している場合、ボタンクリック時に主菜のみが含まれるモーダルが開く
- [ ] 主菜+副菜が確定している場合、ボタンクリック時に主菜+副菜が含まれるモーダルが開く
- [ ] 全3件が確定している場合、ボタンクリック時に主菜+副菜+汁物が含まれるモーダルが開く

### 3. レスポンシブデザイン確認

- [ ] モバイル表示でもボタンが適切に表示される
- [ ] ボタンのレイアウトが崩れない
- [ ] ダークモードでもボタンが適切に表示される

### 4. 既存機能の動作確認

- [ ] 既存の「献立を保存」ボタンが正常に動作する
- [ ] 既存の`onViewDetails`機能（もし使用されている場合）が正常に動作する
- [ ] レシピ選択フローが正常に動作する
- [ ] `onViewList`プロップが渡されていない場合でもエラーが発生しない

---

## 実装の優先度

### 高優先度（完了）

1. ✅ **SelectionOptions.tsxのボタンテキスト変更**: 完了
2. ✅ **SelectedRecipeCard.tsxにプロップとボタンを追加**: 完了
3. ✅ **ChatMessageList.tsxでプロップを渡す**: 完了
4. ✅ **型チェックと検証**: 完了

### 中優先度（将来対応）

1. **モバイルアプリへの移植**: React Native版への実装
2. **単体テストの追加**: 各コンポーネントのテストを追加
3. **統合テストの追加**: コンポーネント間の統合テスト

---

## 成功基準

- ✅ `SelectionOptions`のボタンテキストが「レシピを見る」に変更された
- ✅ `SelectedRecipeCard`に「レシピを見る」ボタンが追加された（保存ボタンと同じ行の右端）
- ✅ ボタンクリック時に確定済みのレシピが全て含まれるレシピ一覧モーダルが正常に開く
- ✅ TypeScript型チェックを通過
- ✅ リンターエラーなし
- ✅ 既存の機能が破壊されていない
- ✅ レスポンシブデザインが維持されている

---

## 技術的補足

### コンポーネントの依存関係

```
ChatSection
└── ChatMessageList
    ├── SelectionOptions (onViewList prop)
    └── SelectedRecipeCard (onViewList prop - 新規追加)
        └── 保存ボタンと同じ行に「レシピを見る」ボタン
```

### プロップの流れ

```
useModalManagement (handleViewList)
    ↓
ChatMessageList (onViewList prop)
    ↓
SelectionOptions / SelectedRecipeCard (onViewList prop)
    ↓
RecipeListModal (candidates prop)
```

### ボタンの動作フロー

1. ユーザーが「レシピを見る」ボタンをクリック
2. `onViewList`コールバックが呼び出される
   - `SelectionOptions`では全候補レシピを配列として渡す
   - `SelectedRecipeCard`では確定済みのレシピ（main/sub/soupがある分）を全て配列として渡す
3. `useModalManagement`の`handleViewList`が実行される
4. レシピ一覧モーダルが開き、渡されたレシピが表示される

---

## まとめ

今回の実装により、以下の機能が追加・変更されました：

1. **ボタンテキストの統一**: `SelectionOptions`のボタンテキストを「レシピを見る」に変更
2. **選択済みレシピからの確認機能**: `SelectedRecipeCard`に「レシピを見る」ボタンを追加（保存ボタンと同じ行の右端に配置）。クリックすると確定済みのレシピ（main/sub/soupがある分）を全て表示
3. **ユーザー体験の向上**: 選択中のレシピ候補と選択済みレシピの両方から、レシピ詳細情報を確認できるようになりました

既存の機能は破壊されておらず、後方互換性を保ちながら、ユーザー体験を向上させました。

**次のステップ**: モバイルアプリへの移植を検討する予定です。

---

**実装者**: AI Assistant  
**レビュー**: ユーザー承認済み  
**ステータス**: UPDATE06完了

