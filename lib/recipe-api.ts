/**
 * レシピ採用API呼び出しとセッションストレージ管理
 */

import { authenticatedFetch } from './auth';
import { RecipeAdoptionItem, RecipeAdoptionRequest } from '../types/menu';

/**
 * レシピ採用APIのレスポンス型
 */
interface RecipeAdoptionResponse {
  success: boolean;
  message: string;
  saved_recipes: Array<{
    title: string;
    category: string;
    history_id: string;
  }>;
  total_saved: number;
}

/**
 * API呼び出し結果の型
 */
export interface AdoptRecipesResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * レシピを採用するAPIを呼び出す
 * @param recipes 採用するレシピの配列
 * @returns API呼び出し結果
 */
export async function adoptRecipes(recipes: RecipeAdoptionItem[]): Promise<AdoptRecipesResult> {
  try {
    if (recipes.length === 0) {
      return {
        success: false,
        message: '採用するレシピが選択されていません',
        error: 'NO_RECIPES_SELECTED'
      };
    }

    const requestBody: RecipeAdoptionRequest = { recipes };

    const response = await authenticatedFetch('/api/recipe/adopt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // デバッグ: レスポンスの詳細を確認
    console.log('[DEBUG] Response status:', response.status);
    console.log('[DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('[DEBUG] Response ok:', response.ok);
    
    // レスポンステキストを先に取得して確認
    const responseText = await response.text();
    console.log('[DEBUG] Response text:', responseText);
    
    // 空のレスポンスの場合はエラー
    if (!responseText.trim()) {
      return {
        success: false,
        message: 'サーバーから空のレスポンスが返されました',
        error: 'EMPTY_RESPONSE'
      };
    }
    
    // JSONパースを試行
    let result: RecipeAdoptionResponse;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[DEBUG] JSON parse error:', parseError);
      console.error('[DEBUG] Response text that failed to parse:', responseText);
      return {
        success: false,
        message: 'サーバーからのレスポンスが無効な形式です',
        error: 'INVALID_JSON_RESPONSE'
      };
    }

    if (!response.ok) {
      // エラーレスポンスの処理
      switch (response.status) {
        case 401:
          return {
            success: false,
            message: 'ログインが必要です',
            error: 'AUTHENTICATION_REQUIRED'
          };
        case 422:
          return {
            success: false,
            message: '入力内容に問題があります',
            error: result.message || 'VALIDATION_ERROR'
          };
        case 500:
          return {
            success: false,
            message: 'サーバーエラーが発生しました',
            error: 'SERVER_ERROR'
          };
        default:
          return {
            success: false,
            message: '予期しないエラーが発生しました',
            error: 'UNKNOWN_ERROR'
          };
      }
    }

    if (result.success) {
      // 成功時は採用済みレシピをセッションストレージに保存
      saveAdoptedRecipes(recipes);
      
      return {
        success: true,
        message: result.message || `${result.total_saved}つのレシピを採用しました`
      };
    } else {
      return {
        success: false,
        message: result.message || 'レシピの採用に失敗しました',
        error: 'API_ERROR'
      };
    }
  } catch (error) {
    console.error('レシピ採用エラー:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'リクエストがタイムアウトしました',
          error: 'TIMEOUT'
        };
      }
    }
    
    return {
      success: false,
      message: 'ネットワークエラーが発生しました',
      error: 'NETWORK_ERROR'
    };
  }
}

/**
 * セッションストレージのキー名
 */
const ADOPTED_RECIPES_KEY = 'morizo_adopted_recipes';

/**
 * 採用済みレシピをセッションストレージに保存
 * @param recipes 採用したレシピの配列
 */
export function saveAdoptedRecipes(recipes: RecipeAdoptionItem[]): void {
  try {
    const existingRecipes = getAdoptedRecipes();
    const newRecipes = recipes.map(recipe => recipe.title);
    
    // 重複を避けて追加
    const allRecipes = [...new Set([...existingRecipes, ...newRecipes])];
    
    sessionStorage.setItem(ADOPTED_RECIPES_KEY, JSON.stringify(allRecipes));
  } catch (error) {
    console.error('セッションストレージへの保存に失敗:', error);
  }
}

/**
 * セッションストレージから採用済みレシピ一覧を取得
 * @returns 採用済みレシピのタイトル配列
 */
export function getAdoptedRecipes(): string[] {
  try {
    const stored = sessionStorage.getItem(ADOPTED_RECIPES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('セッションストレージからの読み込みに失敗:', error);
    return [];
  }
}

/**
 * 指定したレシピが採用済みかチェック
 * @param recipeTitle レシピのタイトル
 * @returns 採用済みかどうか
 */
export function isRecipeAdopted(recipeTitle: string): boolean {
  const adoptedRecipes = getAdoptedRecipes();
  return adoptedRecipes.includes(recipeTitle);
}

/**
 * セッションストレージから採用済みレシピ情報をクリア
 */
export function clearAdoptedRecipes(): void {
  try {
    sessionStorage.removeItem(ADOPTED_RECIPES_KEY);
  } catch (error) {
    console.error('セッションストレージのクリアに失敗:', error);
  }
}
