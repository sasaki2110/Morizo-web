'use client';

/**
 * レシピ専用ビューアーのモーダルコンポーネント
 * シンプルで軽量、Expo Mobile展開対応
 */

import React, { useEffect, useState } from 'react';
import { MenuViewer } from './MenuViewer';
import { parseMenuResponseUnified } from '../lib/menu-parser';
import { SelectedRecipes, RecipeCard, RecipeAdoptionItem, RecipeSelection } from '../types/menu';
import { adoptRecipes } from '../lib/recipe-api';

interface RecipeModalProps {
  /** モーダルの表示状態 */
  isOpen: boolean;
  /** モーダルを閉じる関数 */
  onClose: () => void;
  /** レシピレスポンス */
  response: string;
  /** APIレスポンスのresultオブジェクト（JSON形式対応） */
  result?: unknown;
  /** カスタムクラス名 */
  className?: string;
}

export function RecipeModal({ isOpen, onClose, response, result, className = '' }: RecipeModalProps) {
  // 選択状態の管理
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipes>({
    main_dish: null,
    side_dish: null,
    soup: null
  });

  // 選択されたレシピのセクション情報を管理
  const [recipeSelections, setRecipeSelections] = useState<RecipeSelection[]>([]);

  // ローディング状態
  const [isAdopting, setIsAdopting] = useState(false);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // モーダル表示時にbodyのスクロールを無効化
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // モーダル閉じる時にbodyのスクロールを復元
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // レシピ選択ハンドラー（相互排他）
  const handleRecipeSelect = (recipe: RecipeCard, category: 'main_dish' | 'side_dish' | 'soup', section: 'innovative' | 'traditional') => {
    setSelectedRecipes(prev => ({
      ...prev,
      [category]: prev[category]?.title === recipe.title ? null : recipe
    }));

    // セクション情報も更新
    setRecipeSelections(prev => {
      const filtered = prev.filter(sel => sel.category !== category);
      if (prev.find(sel => sel.category === category && sel.recipe.title === recipe.title)) {
        // 同じレシピをクリックした場合は選択解除
        return filtered;
      } else {
        // 新しいレシピを選択
        return [...filtered, { recipe, category, section }];
      }
    });
  };

  // 採用ボタンのクリックハンドラー
  const handleAdoptRecipes = async () => {
    const recipesToAdopt: RecipeAdoptionItem[] = [];
    
    // 選択されたレシピを配列に変換
    recipeSelections.forEach(selection => {
      const { recipe, category, section } = selection;
      recipesToAdopt.push({
        title: recipe.title,
        category: category,
        menu_source: section === 'innovative' ? 'llm_menu' : 'rag_menu',
        url: recipe.urls[0]?.url // 最初のURLを使用
      });
    });

    if (recipesToAdopt.length === 0) {
      alert('採用するレシピを選択してください');
      return;
    }

    setIsAdopting(true);
    
    try {
      const result = await adoptRecipes(recipesToAdopt);
      
      if (result.success) {
        alert(result.message);
        // 成功時は選択状態をリセット
        setSelectedRecipes({
          main_dish: null,
          side_dish: null,
          soup: null
        });
        setRecipeSelections([]);
        // MenuViewerを再レンダリングするためにキーを変更
        // これは簡単な方法で、実際にはより良い状態管理が必要
      } else {
        alert(`エラー: ${result.message}`);
      }
    } catch (error) {
      console.error('レシピ採用エラー:', error);
      alert('レシピの採用に失敗しました');
    } finally {
      setIsAdopting(false);
    }
  };

  // 選択されたレシピ数を計算
  const selectedCount = Object.values(selectedRecipes).filter(Boolean).length;

  // モーダルが閉じている場合は何も表示しない
  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}>
      {/* オーバーレイ（背景） */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* モーダルコンテンツ */}
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            🍽️ レシピ提案
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
            aria-label="閉じる"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6">
            <MenuViewer 
              response={response} 
              result={result} 
              selectedRecipes={selectedRecipes}
              onRecipeSelect={handleRecipeSelect}
            />
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              MorizoAI レシピ専用ビューアー
            </div>
            {selectedCount > 0 && (
              <div className="text-sm text-blue-600 dark:text-blue-400">
                {selectedCount}件選択中
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAdoptRecipes}
              disabled={selectedCount === 0 || isAdopting}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 font-medium ${
                selectedCount === 0 || isAdopting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isAdopting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>採用中...</span>
                </div>
              ) : (
                'この献立を採用'
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * モバイル最適化版モーダル
 */
export function RecipeModalMobile({ isOpen, onClose, response, result, className = '' }: RecipeModalProps) {
  // 選択状態の管理
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipes>({
    main_dish: null,
    side_dish: null,
    soup: null
  });

  // 選択されたレシピのセクション情報を管理
  const [recipeSelections, setRecipeSelections] = useState<RecipeSelection[]>([]);

  // ローディング状態
  const [isAdopting, setIsAdopting] = useState(false);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // レシピ選択ハンドラー（相互排他）
  const handleRecipeSelect = (recipe: RecipeCard, category: 'main_dish' | 'side_dish' | 'soup', section: 'innovative' | 'traditional') => {
    setSelectedRecipes(prev => ({
      ...prev,
      [category]: prev[category]?.title === recipe.title ? null : recipe
    }));

    // セクション情報も更新
    setRecipeSelections(prev => {
      const filtered = prev.filter(sel => sel.category !== category);
      if (prev.find(sel => sel.category === category && sel.recipe.title === recipe.title)) {
        // 同じレシピをクリックした場合は選択解除
        return filtered;
      } else {
        // 新しいレシピを選択
        return [...filtered, { recipe, category, section }];
      }
    });
  };

  // 採用ボタンのクリックハンドラー
  const handleAdoptRecipes = async () => {
    const recipesToAdopt: RecipeAdoptionItem[] = [];
    
    // 選択されたレシピを配列に変換
    recipeSelections.forEach(selection => {
      const { recipe, category, section } = selection;
      recipesToAdopt.push({
        title: recipe.title,
        category: category,
        menu_source: section === 'innovative' ? 'llm_menu' : 'rag_menu',
        url: recipe.urls[0]?.url // 最初のURLを使用
      });
    });

    if (recipesToAdopt.length === 0) {
      alert('採用するレシピを選択してください');
      return;
    }

    setIsAdopting(true);
    
    try {
      const result = await adoptRecipes(recipesToAdopt);
      
      if (result.success) {
        alert(result.message);
        // 成功時は選択状態をリセット
        setSelectedRecipes({
          main_dish: null,
          side_dish: null,
          soup: null
        });
        setRecipeSelections([]);
      } else {
        alert(`エラー: ${result.message}`);
      }
    } catch (error) {
      console.error('レシピ採用エラー:', error);
      alert('レシピの採用に失敗しました');
    } finally {
      setIsAdopting(false);
    }
  };

  // 選択されたレシピ数を計算
  const selectedCount = Object.values(selectedRecipes).filter(Boolean).length;

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${className}`}>
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* モーダルコンテンツ（フルスクリーン） */}
      <div className="relative flex-1 bg-white dark:bg-gray-800 flex flex-col max-h-screen">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            🍽️ レシピ提案
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
            aria-label="閉じる"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4">
            <MenuViewer 
              response={response} 
              result={result} 
              selectedRecipes={selectedRecipes}
              onRecipeSelect={handleRecipeSelect}
            />
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="space-y-3">
            {selectedCount > 0 && (
              <div className="text-sm text-blue-600 dark:text-blue-400 text-center">
                {selectedCount}件選択中
              </div>
            )}
            <button
              onClick={handleAdoptRecipes}
              disabled={selectedCount === 0 || isAdopting}
              className={`w-full py-3 rounded-lg transition-colors duration-200 font-medium ${
                selectedCount === 0 || isAdopting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isAdopting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>採用中...</span>
                </div>
              ) : (
                'この献立を採用'
              )}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * レスポンシブ対応モーダル（自動切り替え）
 */
export function RecipeModalResponsive({ isOpen, onClose, response, result, className = '' }: RecipeModalProps) {
  return (
    <>
      {/* デスクトップ版 */}
      <div className="hidden md:block">
        <RecipeModal 
          isOpen={isOpen} 
          onClose={onClose} 
          response={response} 
          result={result}
          className={className}
        />
      </div>
      
      {/* モバイル版 */}
      <div className="block md:hidden">
        <RecipeModalMobile 
          isOpen={isOpen} 
          onClose={onClose} 
          response={response} 
          result={result}
          className={className}
        />
      </div>
    </>
  );
}