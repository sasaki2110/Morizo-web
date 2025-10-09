/**
 * レシピ専用ビューアーのレスポンス解析ロジック
 * MorizoAIの献立提案レスポンスを構造化データに変換
 */

import { 
  MenuResponse, 
  MenuSection, 
  RecipeCard, 
  RecipeUrl, 
  ParseResult,
  RECIPE_EMOJI_MAP 
} from '../types/menu';

/**
 * レスポンスがメニュー提案かどうかを判定
 */
export function isMenuResponse(response: string): boolean {
  return /📝.*斬新な提案|📚.*伝統的な提案/.test(response);
}

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
 * MenuSectionのバリデーション
 */
function validateMenuSection(section: unknown): ParseResult {
  try {
    if (!section || typeof section !== 'object') {
      return {
        success: false,
        error: 'セクションがオブジェクトではありません',
      };
    }

    const sectionObj = section as Record<string, unknown>;
    
    // titleフィールドの確認
    if (!sectionObj.title || typeof sectionObj.title !== 'string') {
      return {
        success: false,
        error: 'titleフィールドが存在しないか、文字列ではありません',
      };
    }

    // recipesフィールドの確認
    if (!sectionObj.recipes || typeof sectionObj.recipes !== 'object') {
      return {
        success: false,
        error: 'recipesフィールドが存在しないか、オブジェクトではありません',
      };
    }

    const recipesObj = sectionObj.recipes as Record<string, unknown>;
    
    // main, side, soupフィールドの確認
    const categories = ['main', 'side', 'soup'] as const;
    const validatedRecipes: { main: RecipeCard[]; side: RecipeCard[]; soup: RecipeCard[] } = {
      main: [],
      side: [],
      soup: [],
    };

    for (const category of categories) {
      if (!recipesObj[category] || !Array.isArray(recipesObj[category])) {
        return {
          success: false,
          error: `${category}フィールドが存在しないか、配列ではありません`,
        };
      }

      const recipeCards = recipesObj[category] as unknown[];
      for (const recipeCard of recipeCards) {
        const validatedCard = validateRecipeCard(recipeCard);
        if (!validatedCard.success) {
          return {
            success: false,
            error: `${category}のレシピカードのバリデーションに失敗: ${validatedCard.error}`,
          };
        }
        validatedRecipes[category].push(validatedCard.data!);
      }
    }

    const menuSection: MenuSection = {
      title: sectionObj.title as string,
      recipes: validatedRecipes,
    };

    return {
      success: true,
      data: menuSection,
    };

  } catch (error) {
    return {
      success: false,
      error: `セクションのバリデーション中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * RecipeCardのバリデーション
 */
function validateRecipeCard(card: unknown): ParseResult {
  try {
    if (!card || typeof card !== 'object') {
      return {
        success: false,
        error: 'レシピカードがオブジェクトではありません',
      };
    }

    const cardObj = card as Record<string, unknown>;
    
    // 必須フィールドの確認
    const requiredFields = ['title', 'emoji', 'category', 'urls'];
    for (const field of requiredFields) {
      if (!cardObj[field]) {
        return {
          success: false,
          error: `${field}フィールドが存在しません`,
        };
      }
    }

    // titleの確認
    if (typeof cardObj.title !== 'string') {
      return {
        success: false,
        error: 'titleが文字列ではありません',
      };
    }

    // emojiの確認
    if (typeof cardObj.emoji !== 'string') {
      return {
        success: false,
        error: 'emojiが文字列ではありません',
      };
    }

    // categoryの確認
    if (!['main', 'side', 'soup'].includes(cardObj.category as string)) {
      return {
        success: false,
        error: 'categoryが有効な値ではありません',
      };
    }

    // urlsの確認
    if (!Array.isArray(cardObj.urls)) {
      return {
        success: false,
        error: 'urlsが配列ではありません',
      };
    }

    const urls: RecipeUrl[] = [];
    for (const url of cardObj.urls as unknown[]) {
      const validatedUrl = validateRecipeUrl(url);
      if (!validatedUrl.success) {
        return {
          success: false,
          error: `URLのバリデーションに失敗: ${validatedUrl.error}`,
        };
      }
      urls.push(validatedUrl.data!);
    }

    const recipeCard: RecipeCard = {
      title: cardObj.title as string,
      emoji: cardObj.emoji as string,
      category: cardObj.category as 'main' | 'side' | 'soup',
      urls: urls,
    };

    return {
      success: true,
      data: recipeCard,
    };

  } catch (error) {
    return {
      success: false,
      error: `レシピカードのバリデーション中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * RecipeUrlのバリデーション
 */
function validateRecipeUrl(url: unknown): ParseResult {
  try {
    if (!url || typeof url !== 'object') {
      return {
        success: false,
        error: 'URLがオブジェクトではありません',
      };
    }

    const urlObj = url as Record<string, unknown>;
    
    // 必須フィールドの確認
    const requiredFields = ['title', 'url', 'domain'];
    for (const field of requiredFields) {
      if (!urlObj[field] || typeof urlObj[field] !== 'string') {
        return {
          success: false,
          error: `${field}フィールドが存在しないか、文字列ではありません`,
        };
      }
    }

    const recipeUrl: RecipeUrl = {
      title: urlObj.title as string,
      url: urlObj.url as string,
      domain: urlObj.domain as string,
    };

    return {
      success: true,
      data: recipeUrl,
    };

  } catch (error) {
    return {
      success: false,
      error: `URLのバリデーション中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
  return parseMenuResponse(response);
}

/**
 * URLからドメイン名を抽出
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

/**
 * Markdown形式のURLを解析
 * 例: [レシピタイトル](https://example.com)
 */
function parseUrls(urlText: string): RecipeUrl[] {
  const urlPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const urls: RecipeUrl[] = [];
  let match;

  while ((match = urlPattern.exec(urlText)) !== null) {
    const [, title, url] = match;
    urls.push({
      title: title.trim(),
      url: url.trim(),
      domain: extractDomain(url.trim()),
    });
  }

  return urls;
}

/**
 * レシピカード情報を抽出
 * 例: 🍖 **主菜**: レシピ名
 *     1. [URL1](link1)
 *     2. [URL2](link2)
 */
function parseRecipeCard(cardText: string): RecipeCard | null {
  // 絵文字とタイトルを抽出（新しい形式に対応）
  const cardPattern = /(🍖|🥗|🍵)\s*\*\*([^*]+)\*\*:\s*([^\n]+)/;
  const match = cardText.match(cardPattern);

  if (!match) {
    return null;
  }

  const [, emoji, title, recipeName] = match;
  const category = RECIPE_EMOJI_MAP[emoji] as 'main' | 'side' | 'soup';
  
  if (!category) {
    return null;
  }

  // セクション全体からURLを抽出（番号付きリスト対応）
  const urls = parseUrls(cardText);
  
  if (urls.length === 0) {
    return null;
  }

  return {
    title: recipeName.trim(),
    urls,
    category,
    emoji,
  };
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
 * レスポンスをセクションに分割（より柔軟なパターン）
 */
function splitResponseIntoSections(response: string): { innovative?: string; traditional?: string } {
  const sections: { innovative?: string; traditional?: string } = {};
  
  console.log('🔍 レスポンス分割開始:', response.substring(0, 200) + '...');
  
  // より柔軟なパターンで斬新な提案セクションを抽出
  const innovativePatterns = [
    /\*\*📝.*斬新な提案.*\*\*[\s\S]*?(?=\*\*📚.*伝統的な提案.*\*\*|$)/,
    /📝.*斬新な提案[\s\S]*?(?=📚.*伝統的な提案|$)/,
    /\*\*📝.*斬新な提案.*\*\*[\s\S]*?(?=\*\*📚|$)/,
  ];
  
  for (const pattern of innovativePatterns) {
    const match = response.match(pattern);
    if (match) {
      sections.innovative = match[0].trim();
      console.log('🔍 斬新な提案マッチ成功:', pattern.toString());
      break;
    }
  }
  
  if (!sections.innovative) {
    console.log('🔍 斬新な提案マッチ失敗');
  }

  // より柔軟なパターンで伝統的な提案セクションを抽出
  const traditionalPatterns = [
    /\*\*📚.*伝統的な提案.*\*\*[\s\S]*$/,
    /📚.*伝統的な提案[\s\S]*$/,
    /\*\*📚.*伝統的な提案.*\*\*[\s\S]*?(?=\*\*📝|$)/,
  ];
  
  for (const pattern of traditionalPatterns) {
    const match = response.match(pattern);
    if (match) {
      sections.traditional = match[0].trim();
      console.log('🔍 伝統的な提案マッチ成功:', pattern.toString());
      break;
    }
  }
  
  if (!sections.traditional) {
    console.log('🔍 伝統的な提案マッチ失敗');
  }

  console.log('🔍 分割結果:', Object.keys(sections));
  return sections;
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
 * 解析結果の検証
 */
export function validateParseResult(result: ParseResult): boolean {
  if (!result.success || !result.data) {
    return false;
  }

  const { innovative, traditional } = result.data;

  // 各セクションにレシピが存在するかチェック
  const hasRecipes = (section: MenuSection) => {
    const { main, side, soup } = section.recipes;
    return main.length > 0 || side.length > 0 || soup.length > 0;
  };

  return hasRecipes(innovative) || hasRecipes(traditional);
}

/**
 * デバッグ用: 解析結果をログ出力
 */
export function logParseResult(result: ParseResult): void {
  if (result.success && result.data) {
    console.log('✅ メニュー解析成功:', result.data);
    
    const { innovative, traditional } = result.data;
    console.log(`📝 斬新な提案: ${innovative.recipes.main.length + innovative.recipes.side.length + innovative.recipes.soup.length} レシピ`);
    console.log(`📚 伝統的な提案: ${traditional.recipes.main.length + traditional.recipes.side.length + traditional.recipes.soup.length} レシピ`);
  } else {
    console.error('❌ メニュー解析失敗:', result.error);
  }
}
