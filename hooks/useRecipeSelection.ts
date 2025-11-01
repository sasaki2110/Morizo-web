import { useState } from 'react';
import { RecipeCandidate } from '@/types/menu';
import { ChatMessage } from '@/types/chat';
import { authenticatedFetch } from '@/lib/auth';

/**
 * レシピ選択管理フック
 * レシピの選択状態と献立保存機能を管理
 */
export function useRecipeSelection(
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setAwaitingSelection: React.Dispatch<React.SetStateAction<boolean>>
) {
  // Phase 5B-2: 選択済みレシピを管理
  const [selectedRecipes, setSelectedRecipes] = useState<{
    main?: RecipeCandidate;
    sub?: RecipeCandidate;
    soup?: RecipeCandidate;
  }>({});

  // Phase 5B-3: 保存機能の状態管理
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string>('');

  // Phase 5B-2: 選択確定時の情報取得に対応
  const handleSelection = (selection: number, selectionResult?: any) => {
    // 選択完了後の処理
    setAwaitingSelection(false);
    
    // Phase 5B-2: 選択したレシピ情報を取得して状態に保存
    if (selectionResult && selectionResult.selected_recipe) {
      const { category, recipe } = selectionResult.selected_recipe;
      const categoryKey = category as 'main' | 'sub' | 'soup';
      
      // RecipeCandidate型に変換（必要に応じて）
      const recipeCandidate: RecipeCandidate = {
        title: recipe.title || '',
        ingredients: recipe.ingredients || [],
        cooking_time: recipe.cooking_time,
        description: recipe.description,
        category: categoryKey,
        source: recipe.source,
        urls: recipe.urls
      };
      
      // selectedRecipes状態を更新
      setSelectedRecipes(prev => ({
        ...prev,
        [categoryKey]: recipeCandidate
      }));
      
      console.log('[DEBUG] Updated selectedRecipes:', {
        category: categoryKey,
        recipe: recipeCandidate
      });
    }
    
    // 選択結果メッセージを追加
    setChatMessages(prev => [...prev, {
      type: 'user' as const,
      content: `${selection}番を選択しました`
    }]);
  };

  // Phase 5B-3: 保存機能の実装
  const handleSaveMenu = async () => {
    if (!selectedRecipes.main && !selectedRecipes.sub && !selectedRecipes.soup) {
      alert('保存するレシピがありません');
      return;
    }
    
    setIsSavingMenu(true);
    setSavedMessage('');
    
    try {
      console.log('[DEBUG] Saving menu with selectedRecipes:', selectedRecipes);
      
      // Phase 5B-3修正: フロントエンドのselectedRecipesを直接送信
      // セッションIDに依存せず、確実に選択済みレシピを保存できる
      const recipesToSave: { main?: any; sub?: any; soup?: any } = {};
      
      if (selectedRecipes.main) {
        recipesToSave.main = {
          title: selectedRecipes.main.title,
          source: selectedRecipes.main.source || 'web',
          url: selectedRecipes.main.urls && selectedRecipes.main.urls.length > 0 
            ? selectedRecipes.main.urls[0].url 
            : undefined,
          ingredients: selectedRecipes.main.ingredients || []
        };
      }
      
      if (selectedRecipes.sub) {
        recipesToSave.sub = {
          title: selectedRecipes.sub.title,
          source: selectedRecipes.sub.source || 'web',
          url: selectedRecipes.sub.urls && selectedRecipes.sub.urls.length > 0 
            ? selectedRecipes.sub.urls[0].url 
            : undefined,
          ingredients: selectedRecipes.sub.ingredients || []
        };
      }
      
      if (selectedRecipes.soup) {
        recipesToSave.soup = {
          title: selectedRecipes.soup.title,
          source: selectedRecipes.soup.source || 'web',
          url: selectedRecipes.soup.urls && selectedRecipes.soup.urls.length > 0 
            ? selectedRecipes.soup.urls[0].url 
            : undefined,
          ingredients: selectedRecipes.soup.ingredients || []
        };
      }
      
      console.log('[DEBUG] Prepared recipes to save:', recipesToSave);
      
      // Phase 5Aで実装したAPIを呼び出し（recipesを直接送信）
      const response = await authenticatedFetch('/api/menu/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipes: recipesToSave
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSavedMessage(result.message || `${result.total_saved}つのレシピが保存されました`);
        
        // 保存成功後、メッセージをクリア（5秒後）
        setTimeout(() => {
          setSavedMessage('');
        }, 5000);
      } else {
        throw new Error(result.message || '保存に失敗しました');
      }
    } catch (error) {
      console.error('Menu save failed:', error);
      alert('献立の保存に失敗しました。もう一度お試しください。');
      setSavedMessage('');
    } finally {
      setIsSavingMenu(false);
    }
  };

  const clearSelectedRecipes = () => {
    setSelectedRecipes({});
    setSavedMessage('');
  };

  return {
    selectedRecipes,
    isSavingMenu,
    savedMessage,
    handleSelection,
    handleSaveMenu,
    clearSelectedRecipes,
  };
}

