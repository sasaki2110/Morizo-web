'use client';

import React from 'react';
import { RecipeCandidate } from '@/types/menu';
import ImageHandler from './ImageHandler';

interface RecipeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: RecipeCandidate;
}

const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  isOpen,
  onClose,
  recipe
}) => {
  const handleVisitSite = () => {
    if (recipe.urls && recipe.urls.length > 0) {
      window.open(recipe.urls[0].url, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* ヘッダー */}
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {recipe.title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          {/* 画像表示（既存のImageHandlerコンポーネントを活用） */}
          {recipe.urls && recipe.urls.length > 0 && (
            <div className="mb-4">
              <ImageHandler
                urls={recipe.urls}
                title={recipe.title}
                onUrlClick={(url) => window.open(url, '_blank')}
              />
            </div>
          )}
          
          {/* 食材情報 */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              使用食材
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              {recipe.ingredients.join(', ')}
            </p>
          </div>
          
          {/* 調理時間 */}
          {recipe.cooking_time && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                調理時間
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {recipe.cooking_time}
              </p>
            </div>
          )}
          
          {/* 説明 */}
          {recipe.description && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                説明
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {recipe.description}
              </p>
            </div>
          )}
          
          {/* ソース情報 */}
          {recipe.source && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                情報源
              </h3>
              <span className={`px-3 py-1 rounded-full text-white ${
                recipe.source === 'llm' 
                  ? 'bg-purple-500' 
                  : recipe.source === 'rag' 
                    ? 'bg-green-500' 
                    : 'bg-blue-500'
              }`}>
                {recipe.source === 'llm' ? 'LLM提案' : 
                 recipe.source === 'rag' ? 'RAG検索' : 'Web検索'}
              </span>
            </div>
          )}
          
          {/* アクションボタン */}
          <div className="flex gap-3">
            <button
              onClick={handleVisitSite}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              レシピサイトを見る
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailModal;
