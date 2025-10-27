/**
 * メニューパーサーのメイン解析関数
 * JSON形式と文字列形式の両方に対応
 */

import { 
  MenuResponse, 
  MenuSection, 
  RecipeCard, 
  ParseResult,
  RECIPE_EMOJI_MAP 
} from '../../types/menu';
import { validateMenuSection } from './validator';
import { parseUrls, splitResponseIntoSections } from './utils';

/**
 * JSON形式のレスポンスからメニューデータを抽出
 * @param result APIレスポンスのresultオブジェクト
 * @returns ParseResult
 */
export function parseMenuFromJson(apiResult: unknown): ParseResult {
  try {
    // apiResultがオブジェクトでない場合はエラー
    if (!apiResult || typeof apiResult !== 'object') {
      return {
        success: false,
        error: 'apiResultがオブジェクトではありません',
      };
    }

    const resultObj = apiResult as Record<string, unknown>;
    
    // menu_dataフィールドが存在しない場合はエラー
    if (!resultObj.menu_data) {
      return {
        success: false,
        error: 'menu_dataフィールドが存在しません',
      };
    }

    const menuData = resultObj.menu_data as Record<string, unknown>;
    
    // innovativeとtraditionalの両方が存在することを確認
    if (!menuData.innovative || !menuData.traditional) {
      return {
        success: false,
        error: 'innovativeまたはtraditionalフィールドが存在しません',
      };
    }

    // 型チェックとバリデーション
    const innovative = validateMenuSection(menuData.innovative);
    const traditional = validateMenuSection(menuData.traditional);

    if (!innovative.success || !traditional.success) {
      return {
        success: false,
        error: `セクションのバリデーションに失敗: ${innovative.error || traditional.error}`,
      };
    }

    const menuResponse: MenuResponse = {
      innovative: innovative.data!,
      traditional: traditional.data!,
    };

    return {
      success: true,
      data: menuResponse,
    };

  } catch (error) {
    return {
      success: false,
      error: `JSON解析中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * メニューセクションを解析
 * 例: **📝 斬新な提案（AI生成）** または **📚 伝統的な提案（蓄積レシピ）**
 */
function parseMenuSection(sectionText: string): MenuSection | null {
  const lines = sectionText.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return null;
  }

  // セクションタイトルを抽出（より柔軟なパターン）
  const titlePatterns = [
    /\*\*📝.*斬新な提案.*\*\*/,
    /\*\*📚.*伝統的な提案.*\*\*/,
    /📝.*斬新な提案/,
    /📚.*伝統的な提案/,
  ];
  
  let title = 'Unknown Section';
  for (const pattern of titlePatterns) {
    const match = lines[0].match(pattern);
    if (match) {
      title = match[0].replace(/\*\*/g, '');
      break;
    }
  }

  // レシピカードを抽出
  const recipes = {
    main: [] as RecipeCard[],
    side: [] as RecipeCard[],
    soup: [] as RecipeCard[],
  };

  // セクション全体のテキストからレシピカードを抽出
  const fullText = lines.join('\n');
  
  // 各カテゴリごとに抽出（マルチライン対応）
  const categories = [
    { emoji: '🍖', category: 'main' as const, pattern: /🍖\s*\*\*([^*]+)\*\*:\s*([^\n]+)([\s\S]*?)(?=🍗|🥗|🍵|$)/g },
    { emoji: '🥗', category: 'side' as const, pattern: /🥗\s*\*\*([^*]+)\*\*:\s*([^\n]+)([\s\S]*?)(?=🍖|🍵|$)/g },
    { emoji: '🍵', category: 'soup' as const, pattern: /🍵\s*\*\*([^*]+)\*\*:\s*([^\n]+)([\s\S]*?)(?=🍖|🥗|$)/g },
  ];

  categories.forEach(({ emoji, category, pattern }) => {
    console.log(`🔍 ${category} カテゴリの抽出開始`);
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      const [, , recipeName, urlSection] = match;
      console.log(`🔍 ${category} マッチ:`, recipeName, urlSection.substring(0, 100));
      const urls = parseUrls(urlSection);
      console.log(`🔍 ${category} URL数:`, urls.length);
      
      if (urls.length > 0) {
        recipes[category].push({
          title: recipeName.trim(),
          urls,
          category,
          emoji,
        });
      }
    }
    console.log(`🔍 ${category} 最終結果:`, recipes[category].length, '個のレシピ');
  });

  return {
    title,
    recipes,
  };
}

/**
 * メニューレスポンスを解析
 */
export function parseMenuResponse(response: string): ParseResult {
  try {
    // レスポンスが空の場合はエラー
    if (!response || response.trim().length === 0) {
      return {
        success: false,
        error: 'レスポンスが空です',
      };
    }

    // メニュー提案でない場合はエラー
    const { isMenuResponse } = require('./utils');
    if (!isMenuResponse(response)) {
      return {
        success: false,
        error: 'メニュー提案のレスポンスではありません',
      };
    }

    // セクションに分割
    const sections = splitResponseIntoSections(response);
    
    if (!sections.innovative && !sections.traditional) {
      return {
        success: false,
        error: '有効なセクションが見つかりませんでした',
      };
    }

    // 各セクションを解析
    const innovative = sections.innovative ? parseMenuSection(sections.innovative) : null;
    const traditional = sections.traditional ? parseMenuSection(sections.traditional) : null;

    if (!innovative && !traditional) {
      return {
        success: false,
        error: 'セクションの解析に失敗しました',
      };
    }

    // デフォルトの空セクションを作成
    const createEmptySection = (title: string): MenuSection => ({
      title,
      recipes: {
        main: [],
        side: [],
        soup: [],
      },
    });

    const result: MenuResponse = {
      innovative: innovative || createEmptySection('📝 斬新な提案'),
      traditional: traditional || createEmptySection('📚 伝統的な提案'),
    };

    return {
      success: true,
      data: result,
    };

  } catch (error) {
    return {
      success: false,
      error: `解析中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * 統合されたメニュー解析関数
 * JSON形式を優先し、フォールバックとして文字列解析を使用
 */
export function parseMenuResponseUnified(response: string, apiResult?: unknown): ParseResult {

  // 1. JSON形式を優先
  if (apiResult) {
    const jsonResult = parseMenuFromJson(apiResult);
    
    if (jsonResult.success) {
      return jsonResult;
    }
    console.warn('JSON形式の解析に失敗、文字列解析にフォールバック:', jsonResult.error);
  }

  // 2. フォールバック: 文字列解析
  const textResult = parseMenuResponse(response);
  return textResult;
}
