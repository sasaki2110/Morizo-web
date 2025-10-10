/**
 * レシピ専用ビューアーのデータ型定義
 * MorizoAIの献立提案レスポンスを構造化するための型定義
 */

/**
 * レシピURL情報
 */
export interface RecipeUrl {
  /** URLのタイトル */
  title: string;
  /** 実際のURL */
  url: string;
  /** ドメイン名 */
  domain: string;
}

/**
 * レシピカード情報
 */
export interface RecipeCard {
  /** レシピのタイトル */
  title: string;
  /** レシピのURL一覧 */
  urls: RecipeUrl[];
  /** レシピのカテゴリ */
  category: 'main' | 'side' | 'soup';
  /** 表示用の絵文字 */
  emoji: string;
}

/**
 * メニューセクション（斬新な提案 or 伝統的な提案）
 */
export interface MenuSection {
  /** セクションのタイトル */
  title: string;
  /** カテゴリ別レシピ一覧 */
  recipes: {
    /** メイン料理 */
    main: RecipeCard[];
    /** 副菜 */
    side: RecipeCard[];
    /** 汁物 */
    soup: RecipeCard[];
  };
}

/**
 * メニューレスポンス全体
 */
export interface MenuResponse {
  /** 斬新な提案セクション */
  innovative: MenuSection;
  /** 伝統的な提案セクション */
  traditional: MenuSection;
}

/**
 * レスポンス解析結果
 */
export interface ParseResult<T = MenuResponse> {
  /** 解析成功フラグ */
  success: boolean;
  /** 解析されたデータ（成功時） */
  data?: T;
  /** エラーメッセージ（失敗時） */
  error?: string;
}

/**
 * レシピカードコンポーネントのプロパティ
 */
export interface RecipeCardProps {
  /** レシピデータ */
  recipe: RecipeCard;
  /** URLクリック時のコールバック */
  onUrlClick?: (url: string) => void;
}

/**
 * メニュービューアーコンポーネントのプロパティ
 */
export interface MenuViewerProps {
  /** 生のレスポンステキスト */
  response: string;
  /** APIレスポンスのresultオブジェクト（JSON形式対応） */
  result?: unknown;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * レスポンシブレイアウト設定
 */
export interface LayoutConfig {
  /** PC表示（3列 × 2行） */
  desktop: {
    columns: number;
    rows: number;
  };
  /** タブレット表示（2列 × 3行） */
  tablet: {
    columns: number;
    rows: number;
  };
  /** モバイル表示（1列 × 6行） */
  mobile: {
    columns: number;
    rows: number;
  };
}

/**
 * デフォルトレイアウト設定
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  desktop: { columns: 3, rows: 2 },
  tablet: { columns: 2, rows: 3 },
  mobile: { columns: 1, rows: 6 },
};

/**
 * レシピカテゴリの絵文字マッピング
 */
export const RECIPE_EMOJI_MAP: Record<string, string> = {
  '🍖': 'main',
  '🥗': 'side',
  '🍵': 'soup',
};

/**
 * レシピカテゴリの逆マッピング
 */
export const CATEGORY_EMOJI_MAP: Record<string, string> = {
  main: '🍖',
  side: '🥗',
  soup: '🍵',
};
