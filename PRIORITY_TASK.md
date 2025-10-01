# 優先タスク - レシピ専用ビューアー実装

## 概要

MorizoAIの献立提案レスポンスを美しく表示する専用ビューアーを実装する。現在のテキストベースの表示から、視覚的で使いやすいカード形式の表示に変更し、ユーザー体験を大幅に向上させる。

## 背景

- **現在の状況**: MorizoAIの献立提案が長いテキストで表示される
- **問題**: レシピ情報が読みにくく、URLへのアクセスが不便
- **目標**: 視覚的で直感的なレシピカード表示
- **技術**: Next.js 15 App Router + React + CSS Grid + Tailwind CSS

## 実装アーキテクチャ

```
MorizoAIレスポンス → レスポンス解析 → レシピデータ抽出 → 専用ビューアー表示
```

### レスポンス解析フロー
1. **特殊キーワード検出**: `📝 斬新な提案` / `📚 伝統的提案`
2. **レシピデータ抽出**: 正規表現でレシピ情報を抽出
3. **データ構造化**: カテゴリ別にレシピを整理
4. **ビューアー表示**: レスポンシブレイアウトで表示

## タスク一覧

### Phase 1: レスポンス解析システム実装

#### 1.1 レスポンス解析ロジック
- [ ] `lib/menu-parser.ts` ファイル作成
- [ ] 特殊キーワード検出機能
- [ ] 正規表現パターン定義
- [ ] レシピデータ抽出機能
- [ ] エラーハンドリング実装

#### 1.2 データ構造定義
- [ ] `types/menu.ts` ファイル作成
- [ ] `MenuResponse` インターフェース定義
- [ ] `RecipeCard` インターフェース定義
- [ ] `MenuSection` インターフェース定義
- [ ] TypeScript型定義の完備

#### 1.3 テスト・検証
- [ ] 解析ロジックの単体テスト
- [ ] サンプルレスポンスでのテスト
- [ ] エラーケースのテスト
- [ ] パフォーマンステスト

### Phase 2: レシピカードコンポーネント実装

#### 2.1 基本カードコンポーネント
- [ ] `components/RecipeCard.tsx` ファイル作成
- [ ] カード表示UI実装
- [ ] 画像表示機能
- [ ] クリック処理実装
- [ ] ホバーエフェクト

#### 2.2 複数URL対応
- [ ] プルダウンメニュー実装
- [ ] URL選択機能
- [ ] 選択状態管理
- [ ] デフォルト選択ロジック

#### 2.3 カードスタイリング
- [ ] レスポンシブデザイン（Tailwind CSS）
- [ ] ダークモード対応
- [ ] アニメーション効果
- [ ] アクセシビリティ対応

### Phase 3: メインビューアー実装

#### 3.1 メインビューアーコンポーネント
- [ ] `components/MenuViewer.tsx` ファイル作成
- [ ] レスポンス解析統合
- [ ] レイアウト制御
- [ ] エラーハンドリング
- [ ] ローディング状態

#### 3.2 レスポンシブレイアウト
- [ ] PC表示（3列 × 2行）
- [ ] タブレット表示（2列 × 3行）
- [ ] モバイル表示（1列 × 6行）
- [ ] ブレークポイント設定

#### 3.3 レイアウト最適化
- [ ] CSS Grid実装（レイアウト基盤）
- [ ] Tailwind CSS統合（細かいスタイリング）
- [ ] フレックスボックス対応
- [ ] スペーシング調整
- [ ] 視覚的階層の構築

### Phase 4: チャット統合

#### 4.1 チャット表示統合
- [ ] `app/page.tsx` の更新
- [ ] レスポンス検出ロジック
- [ ] ビューアー表示切り替え
- [ ] 既存チャット機能との統合

#### 4.2 表示制御
- [ ] 自動検出機能
- [ ] 手動切り替え機能
- [ ] 表示/非表示制御
- [ ] 状態管理

#### 4.3 ユーザー体験向上
- [ ] スムーズな切り替え
- [ ] ローディング表示
- [ ] エラーメッセージ
- [ ] フォールバック機能

### Phase 5: 最適化・テスト

#### 5.1 パフォーマンス最適化
- [ ] 画像最適化
- [ ] レンダリング最適化
- [ ] メモリ使用量最適化
- [ ] バンドルサイズ最適化

#### 5.2 総合テスト
- [ ] 統合テスト実行
- [ ] ユーザー受け入れテスト
- [ ] レスポンシブテスト
- [ ] アクセシビリティテスト

#### 5.3 ドキュメント・デプロイ
- [ ] コンポーネントドキュメント
- [ ] 使用方法ガイド
- [ ] デプロイ準備
- [ ] リリースノート

## 技術仕様

### データ構造
```typescript
interface MenuResponse {
  innovative: MenuSection;
  traditional: MenuSection;
}

interface MenuSection {
  title: string;
  recipes: {
    main: RecipeCard[];
    side: RecipeCard[];
    soup: RecipeCard[];
  };
}

interface RecipeCard {
  title: string;
  urls: RecipeUrl[];
  category: 'main' | 'side' | 'soup';
  emoji: string;
}

interface RecipeUrl {
  title: string;
  url: string;
  domain: string;
}
```

### レスポンス解析パターン
```typescript
// 特殊キーワード検出
const MENU_RESPONSE_PATTERN = /📝 斬新な提案|📚 伝統的な提案/;

// レシピカード抽出
const CARD_PATTERN = /(🍖|🥗|🍵)\s*\*\*([^*]+)\*\*:\s*([^\n]+)/g;

// URL抽出
const URL_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;
```

### レスポンシブレイアウト
```css
/* CSS Grid（レイアウト基盤） */
.menu-viewer {
  display: grid;
  gap: 1rem;
}

/* PC表示（3列 × 2行） */
@media (min-width: 1024px) {
  .menu-viewer {
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: auto auto;
  }
}

/* タブレット表示（2列 × 3行） */
@media (min-width: 768px) and (max-width: 1023px) {
  .menu-viewer {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto auto;
  }
}

/* モバイル表示（1列 × 6行） */
@media (max-width: 767px) {
  .menu-viewer {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(6, auto);
  }
}
```

### Tailwind CSS統合例
```tsx
// レシピカードコンポーネント
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
    {emoji} {title}
  </h3>
  <div className="space-y-2">
    {urls.map((url, index) => (
      <a
        key={index}
        href={url.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
      >
        <span className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          {url.title}
        </span>
      </a>
    ))}
  </div>
</div>
```

## 成功指標

### 機能指標
- [ ] レスポンス解析精度: 95%以上
- [ ] レシピカード表示: 100%正常
- [ ] URL遷移: 100%正常
- [ ] レスポンシブ対応: 全デバイス対応

### ユーザー体験指標
- [ ] 表示速度: 1秒以内
- [ ] 操作性: 直感的な操作
- [ ] 視認性: 読みやすい表示
- [ ] アクセシビリティ: WCAG 2.1 AA準拠

### パフォーマンス指標
- [ ] 初期表示時間: 500ms以内
- [ ] レンダリング時間: 200ms以内
- [ ] メモリ使用量: 50MB以内
- [ ] バンドルサイズ増加: 100KB以内

## リスク・課題

### 技術的リスク
- [ ] レスポンス形式の変更
- [ ] 正規表現の複雑性
- [ ] レスポンシブレイアウトの複雑性
- [ ] パフォーマンス問題

### 運用リスク
- [ ] 既存機能への影響
- [ ] ユーザー学習コスト
- [ ] メンテナンス負荷
- [ ] デバッグの複雑性

## スケジュール

### Week 1: Phase 1 (レスポンス解析)
- 月曜日: 解析ロジック実装
- 火曜日: データ構造定義
- 水曜日: テスト・検証
- 木曜日: レビュー・修正
- 金曜日: 統合テスト

### Week 2: Phase 2 (カードコンポーネント)
- 月曜日: 基本カード実装
- 火曜日: 複数URL対応
- 水曜日: スタイリング
- 木曜日: テスト・検証
- 金曜日: レビュー・修正

### Week 3: Phase 3 (メインビューアー)
- 月曜日: メインビューアー実装
- 火曜日: レスポンシブレイアウト
- 水曜日: レイアウト最適化
- 木曜日: テスト・検証
- 金曜日: レビュー・修正

### Week 4: Phase 4-5 (統合・最適化)
- 月曜日: チャット統合
- 火曜日: パフォーマンス最適化
- 水曜日: 総合テスト
- 木曜日: ドキュメント・デプロイ
- 金曜日: リリース・監視

## 完了条件

### 必須条件
- [ ] レスポンス解析が正常に動作
- [ ] レシピカードが美しく表示
- [ ] レスポンシブ対応が完備
- [ ] 既存機能に影響がない

### 推奨条件
- [ ] ユーザー体験が向上している
- [ ] パフォーマンスが最適化されている
- [ ] アクセシビリティが確保されている
- [ ] ドキュメントが充実している

## 関連ファイル

### 新規作成予定
- `lib/menu-parser.ts` - レスポンス解析ロジック
- `types/menu.ts` - データ型定義
- `components/RecipeCard.tsx` - レシピカードコンポーネント
- `components/MenuViewer.tsx` - メインビューアーコンポーネント
- `styles/menu-viewer.css` - CSS Gridレイアウト
- `tailwind.config.js` - Tailwind CSS設定（必要に応じて）

### 更新予定
- `app/page.tsx` - チャット表示統合
- `components/StreamingProgress.tsx` - ビューアー表示対応
- `lib/session-manager.ts` - ビューアー状態管理

## 備考

- 既存のチャット機能は維持し、ビューアー機能を追加
- **ハイブリッドアプローチ**: CSS Grid（レイアウト）+ Tailwind CSS（スタイリング）
- **Expo Mobile展開**: CSS Gridベースで移植性を確保
- レスポンス形式が変更された場合の対応を考慮
- ユーザーフィードバックを収集して継続的に改善
- アクセシビリティを重視した設計

---

**作成日**: 2025年10月1日  
**更新日**: 2025年10月1日  
**作成者**: AIエージェント協働チーム  
**ステータス**: 計画中