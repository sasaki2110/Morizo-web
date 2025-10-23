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
  /** 選択状態 */
  isSelected?: boolean;
  /** 選択時のコールバック */
  onSelect?: (recipe: RecipeCard) => void;
  /** 採用済みかどうか */
  isAdopted?: boolean;
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
  /** 選択状態の管理（オプション） */
  selectedRecipes?: SelectedRecipes;
  /** レシピ選択時のコールバック（オプション） */
  onRecipeSelect?: (recipe: RecipeCard, category: 'main_dish' | 'side_dish' | 'soup', section: 'innovative' | 'traditional') => void;
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

/**
 * レシピ採用リクエストの型定義
 */
export interface RecipeAdoptionRequest {
  recipes: RecipeAdoptionItem[];
}

export interface RecipeAdoptionItem {
  title: string;
  category: "main_dish" | "side_dish" | "soup";
  menu_source: "llm_menu" | "rag_menu" | "manual";
  url?: string;
}

/**
 * 選択状態の管理用
 */
export interface SelectedRecipes {
  main_dish: RecipeCard | null;
  side_dish: RecipeCard | null;
  soup: RecipeCard | null;
}

/**
 * レシピ選択情報（セクション情報付き）
 */
export interface RecipeSelection {
  recipe: RecipeCard;
  category: 'main_dish' | 'side_dish' | 'soup';
  section: 'innovative' | 'traditional';
}

/**
 * 主菜候補の型定義（Phase 2B用）
 */
export interface RecipeCandidate {
  /** レシピのタイトル */
  title: string;
  /** 食材リスト */
  ingredients: string[];
  /** 調理時間（オプション） */
  cooking_time?: string;
  /** 説明（オプション） */
  description?: string;
  /** カテゴリ */
  category?: 'main' | 'sub' | 'soup';
  /** ソース（LLM/RAG/Web） */
  source?: 'llm' | 'rag' | 'web';
}

/**
 * 選択リクエストの型定義
 */
export interface SelectionRequest {
  /** タスクID */
  task_id: string;
  /** 選択番号（1-5） */
  selection: number;
}

/**
 * 選択レスポンスの型定義
 */
export interface SelectionResponse {
  /** 成功フラグ */
  success: boolean;
  /** メッセージ（オプション） */
  message?: string;
  /** エラーメッセージ（オプション） */
  error?: string;
  /** 次のステップ（オプション） */
  next_step?: string;
}
