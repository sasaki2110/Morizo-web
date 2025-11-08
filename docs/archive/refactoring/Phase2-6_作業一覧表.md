# Phase2〜Phase6 作業一覧表

**作成日**: 2025年1月23日  
**目的**: フロント側（Morizo-web）とバック側（Morizo-mobile）の作業を明確化

---

## 📋 作業対象の説明

- **フロント側（Morizo-web）**: `/app/Morizo-web` - Next.jsのWebアプリケーション
- **バック側（Morizo-mobile）**: `/app/Morizo-mobile` - React Nativeのモバイルアプリケーション

**注意**: このリファクタリングは両方のプロジェクトで同じコンポーネント（`InventoryOCRModal.tsx`）を対象としているため、**両方で作業が必要**です。

---

## 📊 Phase2〜Phase6 作業一覧表

| Phase | サブタスク | 作業内容 | フロント側<br/>(Morizo-web) | バック側<br/>(Morizo-mobile) | 難易度 | 推定時間 | 備考 |
|-------|-----------|---------|---------------------------|----------------------------|--------|---------|------|
| **Phase 2** | **2.1** | `hooks/useImagePicker.ts` の作成 | ✅ **必要** | ✅ **完了済み** | 中 | 30-40分 | Web版は`File`オブジェクト、モバイル版は`imageUri`を使用 |
| | **2.1** | `InventoryOCRModal.tsx` への統合 | ✅ **必要** | ✅ **完了済み** | 中 | 10-15分 | 動作確認必須 |
| | **2.2** | `hooks/useOCRAnalysis.ts` の作成 | ✅ **必要** | ✅ **完了済み** | 中 | 30-40分 | Web版は`authenticatedFetch`、モバイル版は`analyzeReceiptOCR`を使用 |
| | **2.2** | `InventoryOCRModal.tsx` への統合 | ✅ **必要** | ✅ **完了済み** | 中 | 10-15分 | 動作確認必須 |
| | **2.3** | `hooks/useItemSelection.ts` の作成 | ✅ **必要** | ✅ **完了済み** | 低 | 20-30分 | ロジックは同じ |
| | **2.3** | `InventoryOCRModal.tsx` への統合 | ✅ **必要** | ✅ **完了済み** | 低 | 10-15分 | 動作確認必須 |
| | **2.4** | `hooks/useItemRegistration.ts` の作成 | ✅ **必要** | ✅ **完了済み** | 中 | 30-40分 | Web版は`authenticatedFetch`、モバイル版は`addInventoryItem`を使用 |
| | **2.4** | `InventoryOCRModal.tsx` への統合 | ✅ **必要** | ✅ **完了済み** | 中 | 10-15分 | 動作確認必須 |
| **Phase 3** | **3.1** | `components/ocr/ImageSelector.tsx` の作成 | ✅ **完了済み** | ✅ **必要** | 低 | 15-20分 | Web版は`<input type="file">`、モバイル版は`ImagePicker` |
| | **3.1** | `InventoryOCRModal.tsx` への統合 | ✅ **完了済み** | ✅ **必要** | 低 | 5-10分 | 動作確認必須 |
| | **3.2** | `components/ocr/ImagePreview.tsx` の作成 | ✅ **必要** | ✅ **必要** | 低 | 10-15分 | Web版は`<img>`、モバイル版は`<Image>` |
| | **3.2** | `InventoryOCRModal.tsx` への統合 | ✅ **必要** | ✅ **必要** | 低 | 5-10分 | 動作確認必須 |
| | **3.3** | `components/ocr/OCRAnalysisButton.tsx` の作成 | ✅ **必要** | ✅ **必要** | 低 | 15-20分 | Web版は`<button>`、モバイル版は`<TouchableOpacity>` |
| | **3.3** | `InventoryOCRModal.tsx` への統合 | ✅ **必要** | ✅ **必要** | 低 | 5-10分 | 動作確認必須 |
| | **3.4** | `components/ocr/OCRResultSummary.tsx` の作成 | ✅ **必要** | ✅ **必要** | 低 | 15-20分 | ロジックは同じ、スタイルが異なる |
| | **3.4** | `InventoryOCRModal.tsx` への統合 | ✅ **必要** | ✅ **必要** | 低 | 5-10分 | 動作確認必須 |
| | **3.5** | `components/ocr/RegistrationButton.tsx` の作成 | ✅ **必要** | ✅ **必要** | 低 | 10-15分 | Web版は`<button>`、モバイル版は`<TouchableOpacity>` |
| | **3.5** | `InventoryOCRModal.tsx` への統合 | ✅ **必要** | ✅ **必要** | 低 | 5-10分 | 動作確認必須 |
| **Phase 4** | **4.1** | `components/ocr/EditableItemList.tsx` の作成 | ✅ **必要** | ✅ **必要** | **高** | 1-2時間 | Web版は`<table>`、モバイル版は`<FlatList>` |
| | **4.1** | `InventoryOCRModal.tsx` への統合 | ✅ **必要** | ✅ **必要** | **高** | 30-60分 | 動作確認必須（特に重要） |
| **Phase 5** | **5.1** | `components/ocr/styles.ts` の作成 | ⚠️ **簡易化** | ✅ **必要** | 低 | 5-10分 | Web版はTailwind CSSのため、定数のみ分離 |
| | **5.1** | `InventoryOCRModal.tsx` への統合 | ⚠️ **簡易化** | ✅ **必要** | 低 | 5-10分 | 動作確認必須 |
| **Phase 6** | **6.1** | `InventoryOCRModal.tsx` の完全な書き直し | ✅ **必要** | ✅ **必要** | 中 | 30-60分 | すべてのコンポーネントとフックを統合 |
| | **6.2** | 統合テストの実施 | ✅ **必要** | ✅ **必要** | 中 | 30-60分 | 全フローの動作確認 |

---

## 📝 作業状況サマリー

### フロント側（Morizo-web）の残作業

| Phase | 完了状況 | 残作業数 | 推定残時間 |
|-------|---------|---------|-----------|
| Phase 2 | ❌ **未着手** | 8タスク | **約2.5-3時間** |
| Phase 3 | ✅ **3.1完了** | 8タスク | **約1-1.5時間** |
| Phase 4 | ❌ **未着手** | 2タスク | **約1.5-3時間** |
| Phase 5 | ❌ **未着手** | 2タスク | **約10-20分** |
| Phase 6 | ❌ **未着手** | 2タスク | **約1-2時間** |
| **合計** | - | **22タスク** | **約6-10時間** |

### バック側（Morizo-mobile）の残作業

| Phase | 完了状況 | 残作業数 | 推定残時間 |
|-------|---------|---------|-----------|
| Phase 2 | ✅ **完了済み** | 0タスク | **0時間** |
| Phase 3 | ❌ **未着手** | 10タスク | **約1-1.5時間** |
| Phase 4 | ❌ **未着手** | 2タスク | **約1.5-3時間** |
| Phase 5 | ❌ **未着手** | 2タスク | **約10-20分** |
| Phase 6 | ❌ **未着手** | 2タスク | **約1-2時間** |
| **合計** | - | **16タスク** | **約3.5-7時間** |

---

## ⚠️ 重要な注意点

### 1. フロント側とバック側の違い

- **フロント側（Morizo-web）**: Next.js + React（Web）
  - HTML要素（`<input>`, `<button>`, `<table>`, `<img>`）
  - Tailwind CSS
  - `authenticatedFetch` を使用したAPI呼び出し
  - `File` オブジェクトを使用

- **バック側（Morizo-mobile）**: React Native（モバイル）
  - React Nativeコンポーネント（`<TouchableOpacity>`, `<Image>`, `<FlatList>`）
  - StyleSheet
  - `expo-image-picker` を使用
  - `imageUri` を使用

### 2. Phase2の状況

- **バック側（Morizo-mobile）**: Phase2.4まで完了済み
- **フロント側（Morizo-web）**: Phase2は未着手（直接的な`useState`実装のまま）

### 3. 推奨実装順序

#### フロント側（Morizo-web）の場合
1. **Phase 2を先に実装**（フック分離）→ Phase 3以降に進む
2. または **Phase 3から実装** → Phase 2は後回し（ただし、Phase 6で必要）

#### バック側（Morizo-mobile）の場合
1. **Phase 3から実装**（Phase 2は完了済み）
2. Phase 3.1はフロント側で完了済みのため、参考にできる

---

## 🎯 次のステップ

### フロント側（Morizo-web）の推奨アプローチ

**オプションA: Phase2を先に実装（推奨）**
- Phase 2.1 → Phase 2.2 → Phase 2.3 → Phase 2.4
- その後、Phase 3.2以降に進む

**オプションB: Phase3から実装**
- Phase 3.2 → Phase 3.3 → Phase 3.4 → Phase 3.5
- Phase 2は後で実装（Phase 6の前に必要）

### バック側（Morizo-mobile）の推奨アプローチ

- Phase 3.1 → Phase 3.2 → Phase 3.3 → Phase 3.4 → Phase 3.5
- その後、Phase 4 → Phase 5 → Phase 6

---

**最終更新**: 2025年1月23日

