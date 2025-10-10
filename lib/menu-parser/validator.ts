/**
 * メニューパーサーのバリデーション関数
 * 型安全性を確保するためのバリデーションロジック
 */

import { 
  MenuSection, 
  RecipeCard, 
  RecipeUrl, 
  ParseResult 
} from '../../types/menu';

/**
 * MenuSectionのバリデーション
 */
export function validateMenuSection(section: unknown): ParseResult<MenuSection> {
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
export function validateRecipeCard(card: unknown): ParseResult<RecipeCard> {
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
export function validateRecipeUrl(url: unknown): ParseResult<RecipeUrl> {
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
