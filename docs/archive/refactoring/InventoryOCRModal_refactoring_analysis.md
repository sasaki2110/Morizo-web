# InventoryOCRModal リファクタリング分析レポート

**作成日**: 2025年1月23日  
**対象ファイル**: `components/InventoryOCRModal.tsx` (676行)  
**目的**: 責任の分離原則に従ったリファクタリング可能性の調査

---

## 1. 現状把握

### 1.1 ファイル概要

- **総行数**: 676行
- **コンポーネント**: 1つの大きなモーダルコンポーネント
- **状態管理**: 5つのuseStateフック
- **主要機能**: 画像選択、OCR解析、アイテム編集、選択管理、登録処理

### 1.2 現在の責任領域

このコンポーネントは以下の複数の責任を持っています：

1. **画像選択とバリデーション** (28-72行)
   - 権限リクエスト
   - 画像選択
   - ファイル形式チェック（JPEG/PNG）
   - ファイルサイズチェック（10MB以下）

2. **OCR解析処理** (74-102行)
   - API呼び出し
   - 結果処理
   - エラーハンドリング
   - 初期選択状態の設定

3. **アイテム編集管理** (104-108行)
   - アイテムフィールドの編集
   - 状態更新

4. **アイテム選択管理** (110-126行)
   - 個別選択/解除
   - 全選択/全解除

5. **登録処理** (128-177行)
   - 選択アイテムの抽出
   - 個別登録API呼び出し
   - 成功/失敗の集計
   - エラーハンドリング

6. **UI表示** (189-431行)
   - モーダルレイアウト
   - 画像選択UI
   - 画像プレビュー
   - OCR解析ボタン
   - 解析結果表示
   - アイテム編集フォーム
   - 登録ボタン

7. **スタイル定義** (434-673行)
   - 240行のスタイル定義

### 1.3 使用箇所

- `components/InventoryPanel.tsx` (291-295行): 在庫パネルから呼び出し

---

## 2. 問題点の分析

### 2.1 単一責任原則（SRP）違反

現在のコンポーネントは以下の7つの異なる責任を持っており、明確にSRPに違反しています：

- 画像選択とバリデーション
- OCR解析処理
- アイテム編集管理
- アイテム選択管理
- 登録処理
- UI表示
- スタイル定義

### 2.2 テスタビリティの問題

- ビジネスロジックがコンポーネント内に密結合
- 各機能を個別にテストすることが困難
- モック作成が複雑

### 2.3 再利用性の問題

- 画像選択機能を他のコンポーネントで再利用できない
- OCR解析機能を他の場所で利用できない
- アイテム編集フォームを他の場所で再利用できない

### 2.4 保守性の問題

- 676行のファイルは理解が困難
- 変更時の影響範囲が広い
- バグ修正時のリスクが高い

### 2.5 可読性の問題

- ファイルが長すぎて全体像の把握が困難
- 機能ごとの境界が不明確
- スタイル定義が240行と大きい

---

## 3. リファクタリング提案

### 3.1 分割戦略

以下のように分割することで、各コンポーネント/フックが単一の責任を持つようにします：

#### 3.1.1 カスタムフックへの分離

**1. `hooks/useImagePicker.ts`**
- 責任: 画像選択とバリデーション
- 機能:
  - 権限リクエスト
  - 画像選択
  - ファイル形式・サイズバリデーション
- 戻り値: `{ imageUri, selectImage, clearImage }`

**2. `hooks/useOCRAnalysis.ts`**
- 責任: OCR解析処理
- 機能:
  - OCR API呼び出し
  - 結果処理
  - エラーハンドリング
- 戻り値: `{ ocrResult, isAnalyzing, analyzeImage }`

**3. `hooks/useItemSelection.ts`**
- 責任: アイテム選択管理
- 機能:
  - 個別選択/解除
  - 全選択/全解除
  - 選択状態の管理
- 戻り値: `{ selectedItems, toggleItem, selectAll, clearSelection }`

**4. `hooks/useItemRegistration.ts`**
- 責任: アイテム登録処理
- 機能:
  - 選択アイテムの登録
  - 成功/失敗の集計
  - エラーハンドリング
- 戻り値: `{ isRegistering, registerItems }`

#### 3.1.2 コンポーネントへの分離

**1. `components/ocr/ImageSelector.tsx`**
- 責任: 画像選択UI
- Props: `{ imageUri, onSelect, disabled }`

**2. `components/ocr/ImagePreview.tsx`**
- 責任: 画像プレビュー表示
- Props: `{ imageUri }`

**3. `components/ocr/OCRAnalysisButton.tsx`**
- 責任: OCR解析ボタン
- Props: `{ onAnalyze, disabled, isAnalyzing }`

**4. `components/ocr/OCRResultSummary.tsx`**
- 責任: OCR解析結果のサマリー表示
- Props: `{ ocrResult, itemCount }`

**5. `components/ocr/EditableItemList.tsx`**
- 責任: 編集可能なアイテムリスト
- Props: `{ items, onItemEdit, selectedItems, onToggleItem, onSelectAll, units, storageLocations }`

**6. `components/ocr/RegistrationButton.tsx`**
- 責任: 登録ボタン
- Props: `{ selectedCount, onRegister, disabled, isRegistering }`

#### 3.1.3 ユーティリティへの分離

**1. `lib/utils/image-validation.ts`**
- 責任: 画像バリデーションロジック
- 関数:
  - `validateImageFormat(uri: string): boolean`
  - `validateImageSize(fileSize: number): boolean`

**2. `lib/utils/ocr-constants.ts`**
- 責任: OCR関連の定数定義
- 内容:
  - `UNITS`
  - `STORAGE_LOCATIONS`
  - `MAX_FILE_SIZE`
  - `VALID_EXTENSIONS`

#### 3.1.4 スタイルの分離

**1. `components/ocr/styles.ts`**
- 責任: OCRモーダル関連のスタイル定義
- 内容: すべてのStyleSheet定義を移動

### 3.2 分割後の構造

```
components/
  ocr/
    ImageSelector.tsx          (~50行)
    ImagePreview.tsx            (~30行)
    OCRAnalysisButton.tsx       (~30行)
    OCRResultSummary.tsx        (~40行)
    EditableItemList.tsx        (~150行)
    RegistrationButton.tsx      (~30行)
    styles.ts                   (~240行)

hooks/
  useImagePicker.ts             (~60行)
  useOCRAnalysis.ts             (~40行)
  useItemSelection.ts            (~30行)
  useItemRegistration.ts         (~50行)

lib/
  utils/
    image-validation.ts         (~30行)
    ocr-constants.ts           (~15行)

components/
  InventoryOCRModal.tsx         (~100行) - 統合コンポーネント
```

### 3.3 分割後のメインコンポーネント

```typescript
// components/InventoryOCRModal.tsx (分割後)
import React from 'react';
import { Modal, View, ScrollView } from 'react-native';
import { useImagePicker } from '../hooks/useImagePicker';
import { useOCRAnalysis } from '../hooks/useOCRAnalysis';
import { useItemSelection } from '../hooks/useItemSelection';
import { useItemRegistration } from '../hooks/useItemRegistration';
import { ImageSelector } from './ocr/ImageSelector';
import { ImagePreview } from './ocr/ImagePreview';
import { OCRAnalysisButton } from './ocr/OCRAnalysisButton';
import { OCRResultSummary } from './ocr/OCRResultSummary';
import { EditableItemList } from './ocr/EditableItemList';
import { RegistrationButton } from './ocr/RegistrationButton';
import { styles } from './ocr/styles';

const InventoryOCRModal: React.FC<InventoryOCRModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const { imageUri, selectImage, clearImage } = useImagePicker();
  const { ocrResult, isAnalyzing, analyzeImage, editableItems, setEditableItems } = useOCRAnalysis();
  const { selectedItems, toggleItem, selectAll, clearSelection } = useItemSelection(editableItems);
  const { isRegistering, registerItems } = useItemRegistration(onUploadComplete);

  const handleAnalyze = async () => {
    if (!imageUri) return;
    await analyzeImage(imageUri);
  };

  const handleRegister = async () => {
    const itemsToRegister = Array.from(selectedItems).map(idx => editableItems[idx]);
    await registerItems(itemsToRegister);
    handleClose();
  };

  const handleClose = () => {
    clearImage();
    clearSelection();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.title}>レシートOCR</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            {!ocrResult ? (
              <>
                <ImageSelector
                  imageUri={imageUri}
                  onSelect={selectImage}
                  disabled={isAnalyzing}
                />
                {imageUri && <ImagePreview imageUri={imageUri} />}
                <OCRAnalysisButton
                  onAnalyze={handleAnalyze}
                  disabled={!imageUri || isAnalyzing}
                  isAnalyzing={isAnalyzing}
                />
              </>
            ) : (
              <>
                <OCRResultSummary
                  ocrResult={ocrResult}
                  itemCount={editableItems.length}
                />
                <EditableItemList
                  items={editableItems}
                  onItemEdit={setEditableItems}
                  selectedItems={selectedItems}
                  onToggleItem={toggleItem}
                  onSelectAll={selectAll}
                />
                <RegistrationButton
                  selectedCount={selectedItems.size}
                  onRegister={handleRegister}
                  disabled={selectedItems.size === 0 || isRegistering}
                  isRegistering={isRegistering}
                />
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButtonStyle}>
              <Text style={styles.closeButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
```

---

## 4. リファクタリングのメリット

### 4.1 単一責任原則の遵守

- 各コンポーネント/フックが1つの明確な責任を持つ
- 変更時の影響範囲が限定的

### 4.2 テスタビリティの向上

- 各フックを個別にテスト可能
- 各コンポーネントを独立してテスト可能
- モック作成が容易

### 4.3 再利用性の向上

- 画像選択機能を他のコンポーネントで再利用可能
- OCR解析機能を他の場所で利用可能
- アイテム編集フォームを他の場所で再利用可能

### 4.4 保守性の向上

- ファイルサイズが小さくなり、理解が容易
- 機能ごとにファイルが分離され、変更時の影響範囲が明確
- バグ修正時のリスクが低減

### 4.5 可読性の向上

- 各ファイルの責務が明確
- コードの構造が理解しやすい
- 新しい開発者のオンボーディングが容易

### 4.6 パフォーマンスの向上

- 不要な再レンダリングを防ぐ
- コンポーネントのメモ化が容易

---

## 5. リファクタリングのリスクと対策

### 5.1 リスク

1. **既存機能の破壊**
   - リファクタリング中に既存機能が動作しなくなる可能性

2. **テスト不足**
   - 分割後の各コンポーネントのテストが不十分

3. **インターフェース変更**
   - Propsの変更により既存の呼び出し側に影響

### 5.2 対策

1. **段階的な移行**
   - 一度に全てを変更せず、機能ごとに分割
   - 各段階で動作確認

2. **テストの追加**
   - 各フックとコンポーネントにテストを追加
   - 統合テストで全体の動作を確認

3. **後方互換性の維持**
   - メインコンポーネントのPropsは変更しない
   - 内部実装のみを変更

4. **コードレビュー**
   - 各段階でコードレビューを実施
   - 設計の妥当性を確認

---

## 6. 実装優先順位

### Phase 1: ユーティリティと定数の分離（低リスク）
1. `lib/utils/ocr-constants.ts` の作成
2. `lib/utils/image-validation.ts` の作成
3. 既存コードでの利用開始

### Phase 2: カスタムフックの分離（中リスク）
1. `hooks/useImagePicker.ts` の作成
2. `hooks/useOCRAnalysis.ts` の作成
3. `hooks/useItemSelection.ts` の作成
4. `hooks/useItemRegistration.ts` の作成
5. 既存コンポーネントでの利用開始

### Phase 3: UIコンポーネントの分離（中リスク）
1. `components/ocr/ImageSelector.tsx` の作成
2. `components/ocr/ImagePreview.tsx` の作成
3. `components/ocr/OCRAnalysisButton.tsx` の作成
4. `components/ocr/OCRResultSummary.tsx` の作成
5. `components/ocr/RegistrationButton.tsx` の作成
6. 既存コンポーネントでの利用開始

### Phase 4: 複雑なコンポーネントの分離（高リスク）
1. `components/ocr/EditableItemList.tsx` の作成
2. 既存コンポーネントでの利用開始

### Phase 5: スタイルの分離（低リスク）
1. `components/ocr/styles.ts` の作成
2. 既存コンポーネントでの利用開始

### Phase 6: メインコンポーネントのリファクタリング（高リスク）
1. `InventoryOCRModal.tsx` の完全な書き直し
2. 統合テストの実施

---

## 6.5 各Phaseでの動作確認と破壊的変更のタイミング

### Phase 1: ユーティリティと定数の分離（低リスク）

**動作確認**: ✅ **各ステップ完了後に動作確認可能**

1. **`lib/utils/ocr-constants.ts` の作成**
   - 新規ファイル作成のみ
   - **動作確認**: 不要（まだ使用していない）

2. **`lib/utils/image-validation.ts` の作成**
   - 新規ファイル作成のみ
   - **動作確認**: 不要（まだ使用していない）

3. **既存コードでの利用開始**
   - 既存のハードコードされた値を定数に置き換え
   - 既存のバリデーションロジックを関数に置き換え
   - **動作確認**: ✅ **必須**
     - 画像選択機能の動作確認
     - ファイル形式チェックの動作確認
     - ファイルサイズチェックの動作確認

**破壊的変更**: ❌ **なし** - 内部実装のみの変更

---

### Phase 2: カスタムフックの分離（中リスク）

**動作確認**: ✅ **各フック完成後に動作確認可能**

**注意**: このPhaseは**段階的に1つずつ**実装することを強く推奨します。

#### 2.1 `hooks/useImagePicker.ts` の作成と統合

1. **フックの作成**
   - 新規ファイル作成
   - **動作確認**: 不要（まだ使用していない）

2. **既存コンポーネントでの利用開始**
   - 既存の`handleImageSelect`をフックに置き換え
   - 既存の`imageUri`状態をフックから取得
   - **動作確認**: ✅ **必須**
     - 画像選択機能の動作確認
     - 画像クリア機能の動作確認
     - バリデーションの動作確認

**破壊的変更**: ❌ **なし** - 内部実装のみの変更

#### 2.2 `hooks/useOCRAnalysis.ts` の作成と統合

1. **フックの作成**
   - 新規ファイル作成
   - **動作確認**: 不要（まだ使用していない）

2. **既存コンポーネントでの利用開始**
   - 既存の`handleAnalyze`をフックに置き換え
   - 既存の`ocrResult`、`isAnalyzing`、`editableItems`をフックから取得
   - **動作確認**: ✅ **必須**
     - OCR解析ボタンの動作確認
     - OCR解析結果の表示確認
     - エラーハンドリングの確認

**破壊的変更**: ❌ **なし** - 内部実装のみの変更

#### 2.3 `hooks/useItemSelection.ts` の作成と統合

1. **フックの作成**
   - 新規ファイル作成
   - **動作確認**: 不要（まだ使用していない）

2. **既存コンポーネントでの利用開始**
   - 既存の`handleItemToggle`、`handleSelectAll`をフックに置き換え
   - 既存の`selectedItems`をフックから取得
   - **動作確認**: ✅ **必須**
     - 個別アイテム選択の動作確認
     - 全選択/全解除の動作確認
     - 選択状態の表示確認

**破壊的変更**: ❌ **なし** - 内部実装のみの変更

#### 2.4 `hooks/useItemRegistration.ts` の作成と統合

1. **フックの作成**
   - 新規ファイル作成
   - **動作確認**: 不要（まだ使用していない）

2. **既存コンポーネントでの利用開始**
   - 既存の`handleRegister`をフックに置き換え
   - 既存の`isRegistering`をフックから取得
   - **動作確認**: ✅ **必須**
     - 登録ボタンの動作確認
     - 登録成功時の動作確認
     - 登録失敗時のエラーハンドリング確認
     - `onUploadComplete`コールバックの動作確認

**破壊的変更**: ❌ **なし** - 内部実装のみの変更

---

### Phase 3: UIコンポーネントの分離（中リスク）

**動作確認**: ✅ **各コンポーネント完成後に動作確認可能**

**注意**: このPhaseも**段階的に1つずつ**実装することを推奨します。

#### 3.1 `components/ocr/ImageSelector.tsx` の作成と統合

1. **コンポーネントの作成**
   - 新規ファイル作成
   - **動作確認**: 不要（まだ使用していない）

2. **既存コンポーネントでの利用開始**
   - 既存のJSXを新コンポーネントに置き換え
   - **動作確認**: ✅ **必須**
     - 画像選択ボタンの表示確認
     - 画像選択機能の動作確認
     - 無効状態の表示確認

**破壊的変更**: ❌ **なし** - 内部実装のみの変更

#### 3.2 `components/ocr/ImagePreview.tsx` の作成と統合

1. **コンポーネントの作成**
   - 新規ファイル作成
   - **動作確認**: 不要（まだ使用していない）

2. **既存コンポーネントでの利用開始**
   - 既存のJSXを新コンポーネントに置き換え
   - **動作確認**: ✅ **必須**
     - 画像プレビューの表示確認

**破壊的変更**: ❌ **なし** - 内部実装のみの変更

#### 3.3 `components/ocr/OCRAnalysisButton.tsx` の作成と統合

1. **コンポーネントの作成**
   - 新規ファイル作成
   - **動作確認**: 不要（まだ使用していない）

2. **既存コンポーネントでの利用開始**
   - 既存のJSXを新コンポーネントに置き換え
   - **動作確認**: ✅ **必須**
     - OCR解析ボタンの表示確認
     - ボタンの有効/無効状態の確認
     - ローディング状態の表示確認

**破壊的変更**: ❌ **なし** - 内部実装のみの変更

#### 3.4 `components/ocr/OCRResultSummary.tsx` の作成と統合

1. **コンポーネントの作成**
   - 新規ファイル作成
   - **動作確認**: 不要（まだ使用していない）

2. **既存コンポーネントでの利用開始**
   - 既存のJSXを新コンポーネントに置き換え
   - **動作確認**: ✅ **必須**
     - 成功時のサマリー表示確認
     - 失敗時のサマリー表示確認
     - エラーリストの表示確認

**破壊的変更**: ❌ **なし** - 内部実装のみの変更

#### 3.5 `components/ocr/RegistrationButton.tsx` の作成と統合

1. **コンポーネントの作成**
   - 新規ファイル作成
   - **動作確認**: 不要（まだ使用していない）

2. **既存コンポーネントでの利用開始**
   - 既存のJSXを新コンポーネントに置き換え
   - **動作確認**: ✅ **必須**
     - 登録ボタンの表示確認
     - 選択数の表示確認
     - ボタンの有効/無効状態の確認
     - ローディング状態の表示確認

**破壊的変更**: ❌ **なし** - 内部実装のみの変更

---

### Phase 4: 複雑なコンポーネントの分離（高リスク）

**動作確認**: ✅ **コンポーネント完成後に動作確認可能**

1. **`components/ocr/EditableItemList.tsx` の作成**
   - 新規ファイル作成
   - **動作確認**: 不要（まだ使用していない）

2. **既存コンポーネントでの利用開始**
   - 既存のFlatListとアイテム編集ロジックを新コンポーネントに移動
   - **動作確認**: ✅ **必須** - **特に重要**
     - アイテムリストの表示確認
     - アイテム名の編集機能確認
     - 数量の編集機能確認
     - 単位の選択機能確認
     - 保管場所の選択機能確認
     - 消費期限の編集機能確認
     - 選択チェックボックスの動作確認
     - 全選択/全解除の動作確認
     - テーブルヘッダーの表示確認

**破壊的変更**: ⚠️ **可能性あり** - このPhaseは最も複雑なため、慎重に実装

**注意**: このPhaseで問題が発生した場合、一時的に元の実装に戻すことが可能

---

### Phase 5: スタイルの分離（低リスク）

**動作確認**: ✅ **完了後に動作確認可能**

1. **`components/ocr/styles.ts` の作成**
   - 新規ファイル作成
   - StyleSheet定義を移動
   - **動作確認**: 不要（まだ使用していない）

2. **既存コンポーネントでの利用開始**
   - `styles`オブジェクトのimportを変更
   - **動作確認**: ✅ **必須**
     - すべてのUI要素のスタイル確認
     - レイアウトの崩れがないか確認

**破壊的変更**: ❌ **なし** - スタイル定義の移動のみ

---

### Phase 6: メインコンポーネントのリファクタリング（高リスク）

**動作確認**: ✅ **完了後に動作確認可能**

1. **`InventoryOCRModal.tsx` の完全な書き直し**
   - すべてのフックとコンポーネントを使用した新しい実装
   - **動作確認**: ✅ **必須** - **完全な統合テスト**
     - 画像選択からOCR解析、登録までの全フロー確認
     - エッジケースの確認
     - エラーハンドリングの確認

**破壊的変更**: ⚠️ **可能性あり** - ただし、Propsは変更しないため、呼び出し側への影響はなし

**注意**: このPhaseは最も慎重に実装し、問題が発生した場合は各Phaseまで戻れるよう準備

---

## 6.6 安全な実装戦略

### 推奨実装順序（動作確認ポイント付き）

1. **Phase 1** → **動作確認** → コミット
2. **Phase 2.1** → **動作確認** → コミット
3. **Phase 2.2** → **動作確認** → コミット
4. **Phase 2.3** → **動作確認** → コミット
5. **Phase 2.4** → **動作確認** → コミット
6. **Phase 3.1** → **動作確認** → コミット
7. **Phase 3.2** → **動作確認** → コミット
8. **Phase 3.3** → **動作確認** → コミット
9. **Phase 3.4** → **動作確認** → コミット
10. **Phase 3.5** → **動作確認** → コミット
11. **Phase 4** → **動作確認**（特に重要） → コミット
12. **Phase 5** → **動作確認** → コミット
13. **Phase 6** → **動作確認**（完全な統合テスト） → コミット

### 動作確認チェックリスト

各Phase完了後、以下の項目を確認：

- [ ] 画像選択機能が正常に動作する
- [ ] 画像プレビューが正常に表示される
- [ ] OCR解析が正常に実行される
- [ ] OCR解析結果が正常に表示される
- [ ] アイテム編集が正常に動作する
- [ ] アイテム選択が正常に動作する
- [ ] 全選択/全解除が正常に動作する
- [ ] 登録機能が正常に動作する
- [ ] エラーハンドリングが正常に動作する
- [ ] UIのスタイルが崩れていない
- [ ] モーダルの開閉が正常に動作する

### 動作しなくなるタイミング

**結論: 各Phaseの完了時点では動作するはずです**

ただし、以下のタイミングで一時的に動作しなくなる可能性があります：

1. **Phase 2-4の実装中（未完了時）**
   - フックやコンポーネントを作成中で、まだ統合していない場合
   - → この間は元のコードが動作するため問題なし

2. **Phase 4の実装中（統合時）**
   - `EditableItemList`の統合時に、Propsの受け渡しが間違っている場合
   - → すぐに修正可能、または元の実装に戻すことが可能

3. **Phase 6の実装中（統合時）**
   - メインコンポーネントの書き直し時に、フックやコンポーネントの呼び出しが間違っている場合
   - → すぐに修正可能、または各Phaseまで戻ることが可能

**重要なポイント**: 
- 各Phaseは**段階的に1つずつ**実装することで、常に動作する状態を保つことができます
- 問題が発生した場合、そのPhaseの変更を元に戻すことで、前のPhaseの状態に戻ることができます
- Gitのコミットを各Phase完了時に実施することで、安全にロールバックできます

---

## 7. 推奨事項

### 7.1 即座に実施可能な改善

1. **定数の分離**: `ocr-constants.ts` の作成（5分）
2. **バリデーション関数の分離**: `image-validation.ts` の作成（10分）
3. **スタイルの分離**: `styles.ts` の作成（10分）

### 7.2 段階的な改善

1. **Phase 1-2**: ユーティリティとフックの分離（1-2時間）
2. **Phase 3**: シンプルなUIコンポーネントの分離（1-2時間）
3. **Phase 4**: 複雑なコンポーネントの分離（2-3時間）
4. **Phase 5-6**: 最終的なリファクタリング（2-3時間）

### 7.3 テスト戦略

- 各フックにユニットテストを追加
- 各コンポーネントにスナップショットテストを追加
- 統合テストで全体の動作を確認

---

## 8. 結論

`InventoryOCRModal.tsx` (676行) は明確にリファクタリングが必要です。以下の理由から：

1. **単一責任原則違反**: 7つの異なる責任を持つ
2. **保守性の問題**: ファイルが大きすぎて理解が困難
3. **テスタビリティの問題**: ビジネスロジックがコンポーネントに密結合
4. **再利用性の問題**: 機能を他の場所で再利用できない

提案した分割戦略により、以下の改善が期待できます：

- **ファイルサイズ**: 676行 → 最大150行（メインコンポーネント）
- **責任の分離**: 7つの責任 → 各コンポーネント/フックが1つの責任
- **テスタビリティ**: 各機能を個別にテスト可能
- **再利用性**: 各機能を他の場所で再利用可能
- **保守性**: 変更時の影響範囲が明確

段階的なアプローチにより、リスクを最小限に抑えながらリファクタリングを実施できます。

---

**次のステップ**: このレポートを確認後、Phase 1から段階的に実装を開始することを推奨します。

