'use client';

import React from 'react';
import { RecipeCandidate } from '@/types/menu';
import ImageHandler from './ImageHandler';

interface RecipeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: RecipeCandidate[];
}

const RecipeListModal: React.FC<RecipeListModalProps> = ({
  isOpen,
  onClose,
  candidates
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* ヘッダー */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                主菜の提案（5件）
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
              >
                ✕
              </button>
            </div>
            
            {/* レシピグリッド（3列×2行） */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidates.map((candidate, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-600 transition-all duration-200 hover:shadow-lg"
                >
                  {/* 画像表示 */}
                  {candidate.urls && candidate.urls.length > 0 && (
                    <div className="mb-3">
                      <ImageHandler
                        urls={candidate.urls}
                        title={candidate.title}
                        onUrlClick={(url) => window.open(url, '_blank')}
                      />
                    </div>
                  )}
                  
                  {/* レシピタイトル */}
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    {index + 1}. {candidate.title}
                  </h3>
                  
                  {/* 食材情報 */}
                  <div className="mb-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      📋 使用食材
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {candidate.ingredients.join(', ')}
                    </p>
                  </div>
                  
                  {/* 調理時間 */}
                  {candidate.cooking_time && (
                    <div className="mb-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        ⏱️ 調理時間
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {candidate.cooking_time}
                      </p>
                    </div>
                  )}
                  
                  {/* 説明 */}
                  {candidate.description && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        {candidate.description}
                      </p>
                    </div>
                  )}
                  
                  {/* ソース情報 */}
                  {candidate.source && (
                    <div className="mb-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-white text-xs ${
                        candidate.source === 'llm' 
                          ? 'bg-purple-500' 
                          : candidate.source === 'rag' 
                            ? 'bg-green-500' 
                            : 'bg-blue-500'
                      }`}>
                        {candidate.source === 'llm' ? 'LLM提案' : 
                         candidate.source === 'rag' ? 'RAG検索' : 'Web検索'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* フッター */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
  );
};

export default RecipeListModal;
