'use client';

import React from 'react';
import { RecipeCandidate } from '@/types/menu';

interface SelectedRecipeCardProps {
  main?: RecipeCandidate;
  sub?: RecipeCandidate;
  soup?: RecipeCandidate;
  onSave?: () => void;
  onViewDetails?: (recipe: RecipeCandidate) => void;
  isSaving?: boolean;
  savedMessage?: string;
}

const SelectedRecipeCard: React.FC<SelectedRecipeCardProps> = ({
  main,
  sub,
  soup,
  onSave,
  onViewDetails,
  isSaving = false,
  savedMessage
}) => {
  const isComplete = main && sub && soup;
  const stage = main && !sub ? 'main' : main && sub && !soup ? 'sub' : 'completed';
  
  const getTitle = () => {
    if (isComplete) return '🎉 献立が完成しました！';
    if (sub) return '✅ 副菜が確定しました';
    if (main) return '✅ 主菜が確定しました';
    return '';
  };
  
  return (
    <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-500">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
        {getTitle()}
      </h3>
      
      {isComplete && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            📅 今日の献立
          </p>
        </div>
      )}
      
      <div className="space-y-3">
        {main && (
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="flex items-start">
              <span className="text-2xl mr-2">🍖</span>
              <div className="flex-1">
                <p className="font-medium text-gray-800 dark:text-white">
                  主菜: {main.title}
                </p>
                {main.ingredients && main.ingredients.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    食材: {main.ingredients.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {sub && (
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="flex items-start">
              <span className="text-2xl mr-2">🥗</span>
              <div className="flex-1">
                <p className="font-medium text-gray-800 dark:text-white">
                  副菜: {sub.title}
                </p>
                {sub.ingredients && sub.ingredients.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    食材: {sub.ingredients.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {soup && (
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="flex items-start">
              <span className="text-2xl mr-2">🍲</span>
              <div className="flex-1">
                <p className="font-medium text-gray-800 dark:text-white">
                  汁物: {soup.title}
                </p>
                {soup.ingredients && soup.ingredients.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    食材: {soup.ingredients.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        {onSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-3 rounded-lg font-medium transition-colors duration-200 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '献立を保存'}
          </button>
        )}
      </div>
      
      {savedMessage && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-800 dark:text-blue-300">
          {savedMessage}
        </div>
      )}
    </div>
  );
};

export default SelectedRecipeCard;
