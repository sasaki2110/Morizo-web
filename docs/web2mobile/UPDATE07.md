# UPDATE07.md - 主菜⇒副菜⇒汁物選択フローの確認ステップ追加

## 概要

主菜⇒副菜⇒汁物の選択フローにおいて、主菜・副菜確定時に確認ダイアログを表示し、ユーザーが「進む」を選択してから次の段階に進むように変更しました。これにより、段階の遷移が明確になり、ユーザーが次に何が起こるかを理解してから進めることができるようになりました。

## 実装日時

2025年11月2日（実装完了時）

## 実装背景

現在の主菜⇒副菜⇒汁物の選択フローにおいて、以下の問題点がありました：

1. **主菜確定時の自動遷移が突然**
   - 主菜を確定すると、即座に副菜選択画面に遷移
   - ユーザーが「何が起こったか」を理解する前に次の画面が表示される
   - 段階の区切りが視覚的に不明確

2. **確定ボタンの意味が不明確**
   - 「確定」ボタンを押すと、何が確定されたのか、次に何が起こるのかが分からない

この問題を解決するため、確認ステップを追加し、ユーザーが次に何が起こるかを理解してから進めるようにしました。

## 実装内容

### 1. SelectionOptions.tsxの状態管理追加

**ファイル**: `/app/Morizo-web/components/SelectionOptions.tsx`

#### 1.1 変更箇所

**行番号**: 43-50行目（状態管理の追加）

#### 1.2 変更前

```typescript
const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
const [isConfirming, setIsConfirming] = useState<boolean>(false);
const [isRequestingMore, setIsRequestingMore] = useState(false);
```

#### 1.3 変更後

```typescript
const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
const [isConfirming, setIsConfirming] = useState<boolean>(false);
const [isRequestingMore, setIsRequestingMore] = useState(false);
const [showStageConfirmation, setShowStageConfirmation] = useState<boolean>(false);
const [confirmationData, setConfirmationData] = useState<{
  message: string;
  nextStageName: string;
} | null>(null);
```

#### 1.4 変更内容

- `showStageConfirmation`: 確認ダイアログの表示/非表示を管理する状態を追加
- `confirmationData`: 確認メッセージと次の段階名を保持する状態を追加

#### 1.5 変更の理由

確認ダイアログを表示するためには、その表示状態と表示内容を管理する状態が必要なため。

---

### 2. SelectionOptions.tsxのhandleConfirm関数の修正

**ファイル**: `/app/Morizo-web/components/SelectionOptions.tsx`

#### 2.1 変更箇所

**行番号**: 92-113行目

#### 2.2 変更前

```typescript
if (result.success) {
  // Phase 5B-2: レスポンス全体をonSelectに渡す
  onSelect(selectedIndex + 1, result);
  
  // Phase 3C-3: 次の段階の提案が要求されている場合はフラグをチェック
  if (result.requires_next_stage && onNextStageRequested) {
    console.log('[DEBUG] requires_next_stage flag detected, calling onNextStageRequested');
    onNextStageRequested();
  }
} else {
  throw new Error(result.error || 'Selection failed');
}
```

#### 2.3 変更後

```typescript
if (result.success) {
  // Phase 5B-2: レスポンス全体をonSelectに渡す
  onSelect(selectedIndex + 1, result);
  
  // 確認ステップが必要な場合（requires_stage_confirmationフラグがtrue）
  if (result.requires_stage_confirmation && result.confirmation_message && result.next_stage_name) {
    console.log('[DEBUG] requires_stage_confirmation flag detected, showing confirmation dialog');
    setConfirmationData({
      message: result.confirmation_message,
      nextStageName: result.next_stage_name
    });
    setShowStageConfirmation(true);
    // 確認待ちのため、ここではonNextStageRequestedを呼ばない
    return;
  }
  
  // 確認ステップが不要な場合（旧方式のフォールバック）
  // Phase 3C-3: 次の段階の提案が要求されている場合はフラグをチェック
  if (result.requires_next_stage && onNextStageRequested) {
    console.log('[DEBUG] requires_next_stage flag detected, calling onNextStageRequested');
    onNextStageRequested();
  }
} else {
  throw new Error(result.error || 'Selection failed');
}
```

#### 2.4 変更内容

- バックエンドからのレスポンスに`requires_stage_confirmation`フラグがある場合、確認ダイアログを表示
- 確認データを設定し、確認ダイアログを表示状態にする
- 確認待ちのため、ここでは`onNextStageRequested`を呼ばない
- 確認ステップが不要な場合（旧方式）は、既存の`requires_next_stage`処理を実行（後方互換性）

#### 2.5 変更の理由

バックエンドが新しい`requires_stage_confirmation`フラグを返した場合、確認ダイアログを表示してユーザーの確認を待つため。旧バージョンとの互換性を保つため、`requires_next_stage`フラグの処理も維持。

---

### 3. SelectionOptions.tsxに確認ダイアログUIを追加

**ファイル**: `/app/Morizo-web/components/SelectionOptions.tsx`

#### 3.1 変更箇所

**行番号**: 317-351行目（`</div>`閉じタグの前に追加）

#### 3.2 追加内容

```typescript
{/* 段階遷移確認ダイアログ */}
{showStageConfirmation && confirmationData && (
  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
    <p className="text-base font-medium text-gray-800 dark:text-white mb-4 text-center">
      {confirmationData.message}
    </p>
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <button
        onClick={() => {
          // 進むボタン: 次の段階を開始
          setShowStageConfirmation(false);
          setConfirmationData(null);
          if (onNextStageRequested) {
            console.log(`[DEBUG] User confirmed, proceeding to ${confirmationData.nextStageName} stage`);
            onNextStageRequested();
          }
        }}
        className="px-6 py-3 rounded-lg font-medium transition-colors duration-200 bg-blue-600 hover:bg-blue-700 text-white"
      >
        進む
      </button>
      <button
        onClick={() => {
          // キャンセルボタン: 確認を閉じる（現在の段階に留まる）
          setShowStageConfirmation(false);
          setConfirmationData(null);
          console.log('[DEBUG] User cancelled stage transition');
        }}
        className="px-6 py-3 rounded-lg font-medium transition-colors duration-200 bg-gray-400 hover:bg-gray-500 text-white"
      >
        キャンセル
      </button>
    </div>
  </div>
)}
```

#### 3.3 変更内容

- 確認ダイアログUIを追加
  - 確認メッセージを中央表示
  - 「進む」ボタン: 次の段階を開始（`onNextStageRequested()`を呼び出し）
  - 「キャンセル」ボタン: 確認を閉じる（現在の段階に留まる）
- ダークモード対応のスタイリング
- レスポンシブデザイン（モバイルでは縦並び、デスクトップでは横並び）

#### 3.4 変更の理由

ユーザーに確認を求めるためのUIが必要なため。ユーザーが「進む」を選択した場合のみ次の段階に進み、「キャンセル」を選択した場合は現在の段階に留まる。

#### 3.5 スタイリング

- 確認ダイアログ: `bg-blue-50 dark:bg-blue-900/20`で背景色を設定（ダークモード対応）
- 進むボタン: `bg-blue-600 hover:bg-blue-700`でプライマリアクションを示す
- キャンセルボタン: `bg-gray-400 hover:bg-gray-500`でセカンダリアクションを示す
- レスポンシブ: `flex-col sm:flex-row`により、モバイルでは縦並び、デスクトップでは横並び

---

## 実装のポイント

### 1. バックエンドとの連携

バックエンドから以下のフラグとメッセージが返されます：

- `requires_stage_confirmation: true`: 確認が必要であることを示すフラグ
- `confirmation_message: string`: 確認ダイアログに表示するメッセージ（例: "主菜が確定しました。副菜の選択に進みますか？"）
- `next_stage_name: string`: 次の段階名（"sub" または "soup"）
- `requires_next_stage: true`: 後方互換性のため維持（旧バージョン対応）

### 2. 後方互換性の維持

- 既存の`requires_next_stage`フラグの処理は維持
- バックエンドが`requires_stage_confirmation`を返さない場合（旧バージョン）、確認なしで自動遷移する

### 3. 確認フローの動作

1. ユーザーが主菜・副菜を選択して「確定」ボタンをクリック
2. バックエンドから`requires_stage_confirmation: true`が返される
3. フロントエンドが確認ダイアログを表示
4. ユーザーが「進む」を選択 → `onNextStageRequested()`が呼び出され、次の段階に進む
5. ユーザーが「キャンセル」を選択 → 確認ダイアログが閉じ、現在の段階に留まる

### 4. 既存機能との互換性

- 既存の選択フローは破壊されない（確認が必要な場合のみ確認ダイアログが表示される）
- 既存の`requires_next_stage`処理は維持（後方互換性）
- 既存のUIレイアウトに影響を与えない（確認ダイアログは既存のボタン群の下に追加表示）

---

## Mobile連携が必要な項目

### 1. SelectionOptionsコンポーネント（モバイル版）

**ファイル**: モバイル版の`SelectionOptions.tsx`相当のコンポーネント

#### 1.1 状態管理の追加

Web版と同様に、確認ダイアログ用の状態管理を追加します。

**React Native版の例**:

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

// ... 既存のコード ...

const [showStageConfirmation, setShowStageConfirmation] = useState<boolean>(false);
const [confirmationData, setConfirmationData] = useState<{
  message: string;
  nextStageName: string;
} | null>(null);
```

---

#### 1.2 handleConfirm関数の修正

**React Native版の例**:

```tsx
const handleConfirm = async () => {
  if (isLoading || selectedIndex === null) return;
  
  // SSEセッションIDの検証
  if (!sseSessionId || sseSessionId === 'unknown') {
    Alert.alert('エラー', 'セッション情報が無効です。ページを再読み込みしてください。');
    return;
  }
  
  setIsConfirming(true);
  
  try {
    // バックエンドに選択結果を送信
    const response = await authenticatedFetch('/api/chat/selection', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_id: taskId,
        selection: selectedIndex + 1, // 1-based index
        sse_session_id: sseSessionId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      // レスポンス全体をonSelectに渡す
      onSelect(selectedIndex + 1, result);
      
      // 確認ステップが必要な場合（requires_stage_confirmationフラグがtrue）
      if (result.requires_stage_confirmation && result.confirmation_message && result.next_stage_name) {
        console.log('[DEBUG] requires_stage_confirmation flag detected, showing confirmation dialog');
        setConfirmationData({
          message: result.confirmation_message,
          nextStageName: result.next_stage_name
        });
        setShowStageConfirmation(true);
        // 確認待ちのため、ここではonNextStageRequestedを呼ばない
        return;
      }
      
      // 確認ステップが不要な場合（旧方式のフォールバック）
      // 次の段階の提案が要求されている場合はフラグをチェック
      if (result.requires_next_stage && onNextStageRequested) {
        console.log('[DEBUG] requires_next_stage flag detected, calling onNextStageRequested');
        onNextStageRequested();
      }
    } else {
      throw new Error(result.error || 'Selection failed');
    }
  } catch (error) {
    console.error('Selection failed:', error);
    Alert.alert('エラー', '選択に失敗しました。もう一度お試しください。');
    setSelectedIndex(null);
  } finally {
    setIsConfirming(false);
  }
};
```

---

#### 1.3 確認ダイアログUIの追加

**React Native版の例（Modalを使用）**:

```tsx
import { Modal, Alert } from 'react-native';

// ... 既存のコード ...

{/* 段階遷移確認ダイアログ */}
<Modal
  visible={showStageConfirmation && confirmationData !== null}
  transparent={true}
  animationType="fade"
  onRequestClose={() => {
    setShowStageConfirmation(false);
    setConfirmationData(null);
  }}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>
        {confirmationData?.message}
      </Text>
      
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.modalButtonPrimary]}
          onPress={() => {
            // 進むボタン: 次の段階を開始
            setShowStageConfirmation(false);
            const nextStageName = confirmationData?.nextStageName;
            setConfirmationData(null);
            if (onNextStageRequested) {
              console.log(`[DEBUG] User confirmed, proceeding to ${nextStageName} stage`);
              onNextStageRequested();
            }
          }}
        >
          <Text style={styles.modalButtonTextPrimary}>進む</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modalButton, styles.modalButtonSecondary]}
          onPress={() => {
            // キャンセルボタン: 確認を閉じる（現在の段階に留まる）
            setShowStageConfirmation(false);
            setConfirmationData(null);
            console.log('[DEBUG] User cancelled stage transition');
          }}
        >
          <Text style={styles.modalButtonTextSecondary}>キャンセル</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

**スタイル定義**:

```tsx
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#2563eb', // blue-600
  },
  modalButtonSecondary: {
    backgroundColor: '#9ca3af', // gray-400
  },
  modalButtonTextPrimary: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtonTextSecondary: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
```

**ダークモード対応版**:

```tsx
import { useColorScheme } from 'react-native';

const colorScheme = useColorScheme();
const isDark = colorScheme === 'dark';

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    // ... その他のスタイル
  },
  modalTitle: {
    color: isDark ? '#ffffff' : '#1f2937',
    // ... その他のスタイル
  },
});
```

---

#### 1.4 代替案: Alert.alertを使用（シンプルな実装）

React Nativeでよりシンプルに実装したい場合は、`Alert.alert`を使用することもできます。

**React Native版の例（Alert.alertを使用）**:

```tsx
import { Alert } from 'react-native';

// ... handleConfirm関数内 ...

if (result.requires_stage_confirmation && result.confirmation_message && result.next_stage_name) {
  Alert.alert(
    '確認',
    result.confirmation_message,
    [
      {
        text: 'キャンセル',
        style: 'cancel',
        onPress: () => {
          console.log('[DEBUG] User cancelled stage transition');
        },
      },
      {
        text: '進む',
        onPress: () => {
          if (onNextStageRequested) {
            console.log(`[DEBUG] User confirmed, proceeding to ${result.next_stage_name} stage`);
            onNextStageRequested();
          }
        },
      },
    ],
    { cancelable: true }
  );
  return;
}
```

この方法のメリット：
- 実装がシンプル
- ネイティブのAlertを使用するため、OS標準のUIで表示される

この方法のデメリット：
- カスタマイズ性が低い
- Web版と同じUIデザインを再現しにくい

---

## 変更の影響範囲

### 影響を受けるファイル

1. **components/SelectionOptions.tsx**: 状態管理追加、handleConfirm関数の修正、確認ダイアログUI追加（3箇所）

### 影響を受けないファイル

- **既存のコンポーネント**: `SelectedRecipeCard`, `ChatMessageList`等は変更なし
- **既存のAPI**: バックエンドAPIとの連携は変更なし（バックエンドが新しいフラグを返すようになったが、既存のフラグも維持されている）
- **既存のフック**: `useRecipeSelection`等は変更なし

### 互換性

- **後方互換**: `requires_next_stage`フラグの処理は維持されているため、バックエンドが旧バージョンの場合でも動作する
- **既存機能への影響**: なし（確認が必要な場合のみ確認ダイアログが表示される）

---

## テスト項目

### 1. 主菜確定時の確認表示

- [ ] 主菜を選択して「確定」ボタンをクリック
- [ ] 確認ダイアログが表示される
- [ ] メッセージが「主菜が確定しました。副菜の選択に進みますか？」と表示される
- [ ] 「進む」ボタンをクリックすると、副菜選択画面が表示される

### 2. 副菜確定時の確認表示

- [ ] 副菜を選択して「確定」ボタンをクリック
- [ ] 確認ダイアログが表示される
- [ ] メッセージが「副菜が確定しました。汁物の選択に進みますか？」と表示される
- [ ] 「進む」ボタンをクリックすると、汁物選択画面が表示される

### 3. キャンセル動作

- [ ] 主菜確定後に表示される確認ダイアログで「キャンセル」ボタンをクリック
- [ ] 確認ダイアログが閉じる
- [ ] 副菜選択画面は表示されず、主菜確定状態が維持される

### 4. 後方互換性

- [ ] バックエンドが`requires_stage_confirmation`を返さない場合（旧バージョン対応）
- [ ] `requires_next_stage`のみが返される場合、確認なしで自動遷移する

### 5. UI/UX

- [ ] モバイル表示で確認ダイアログが適切に表示される
- [ ] ボタンのレイアウトが崩れない
- [ ] ダークモードで確認ダイアログが適切に表示される

### 6. 既存機能の動作確認

- [ ] 既存の選択フローが正常に動作しているか
- [ ] 献立保存機能が正常に動作しているか
- [ ] エラー処理が正常に動作しているか

---

## 実装の優先度

### 高優先度（完了）

1. ✅ **SelectionOptions.tsxの状態管理追加**: 完了
2. ✅ **handleConfirm関数の修正**: 完了
3. ✅ **確認ダイアログUIの追加**: 完了
4. ✅ **型チェックと検証**: 完了

### 中優先度（将来対応）

1. **モバイルアプリへの移植**: React Native版への実装
2. **単体テストの追加**: 各コンポーネントのテストを追加
3. **統合テストの追加**: コンポーネント間の統合テスト

---

## 成功基準

- ✅ `SelectionOptions`に確認ダイアログ用の状態管理が追加された
- ✅ `handleConfirm`関数で`requires_stage_confirmation`フラグをチェックし、確認ダイアログを表示する処理が追加された
- ✅ 確認ダイアログUIが追加され、「進む」「キャンセル」ボタンが正しく動作する
- ✅ TypeScript型チェックを通過
- ✅ リンターエラーなし
- ✅ 既存の機能が破壊されていない
- ✅ レスポンシブデザインが維持されている
- ✅ ダークモード対応が実装されている

---

## 技術的補足

### バックエンドとの連携フロー

```
ユーザーが「確定」ボタンをクリック
    ↓
フロントエンド: POST /api/chat/selection
    ↓
バックエンド: selection_handler.py
    ↓
バックエンド: requires_stage_confirmation: true を返す
    ↓
フロントエンド: 確認ダイアログを表示
    ↓
ユーザーが「進む」を選択
    ↓
フロントエンド: onNextStageRequested() を呼び出し
    ↓
次の段階（副菜/汁物選択）を開始
```

### 確認ダイアログの表示条件

- `showStageConfirmation === true` かつ `confirmationData !== null` の場合に表示
- `result.requires_stage_confirmation === true` かつ `result.confirmation_message` と `result.next_stage_name` が存在する場合に表示状態になる

### プロップの流れ

```
useRecipeSelection / ChatSection
    ↓
SelectionOptions (onNextStageRequested prop)
    ↓
handleConfirm 内で requires_stage_confirmation をチェック
    ↓
確認ダイアログ表示 → ユーザーが「進む」を選択
    ↓
onNextStageRequested() を呼び出し
    ↓
次の段階の提案を開始
```

---

## まとめ

今回の実装により、以下の機能が追加されました：

1. **確認ステップの追加**: 主菜・副菜確定時に確認ダイアログを表示し、ユーザーが「進む」を選択してから次の段階に進む
2. **段階遷移の明確化**: 確認ダイアログにより、段階の遷移が明確になり、ユーザーが次に何が起こるかを理解してから進める
3. **後方互換性の維持**: 既存の`requires_next_stage`フラグの処理は維持され、バックエンドが旧バージョンの場合でも動作する

既存の機能は破壊されておらず、後方互換性を保ちながら、ユーザー体験を向上させました。

**次のステップ**: モバイルアプリへの移植を検討する予定です。

---

**実装者**: AI Assistant  
**レビュー**: ユーザー承認済み  
**ステータス**: UPDATE07完了

