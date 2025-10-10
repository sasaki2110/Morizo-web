/**
 * メニューパーサーのメインエクスポート
 * 外部から使用する際の統一インターフェース
 */

// メイン解析関数
export { 
  parseMenuResponse, 
  parseMenuFromJson, 
  parseMenuResponseUnified 
} from './parser';

// ユーティリティ関数
export { 
  isMenuResponse, 
  parseUrls, 
  extractDomain, 
  splitResponseIntoSections 
} from './utils';

// バリデーション関数（必要に応じて）
export { 
  validateMenuSection, 
  validateRecipeCard, 
  validateRecipeUrl 
} from './validator';
