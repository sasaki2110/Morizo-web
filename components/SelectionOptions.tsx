'use client';

import React, { useState } from 'react';
import { RecipeCandidate } from '@/types/menu';
import { authenticatedFetch } from '@/lib/auth';

interface SelectionOptionsProps {
  candidates: RecipeCandidate[];
  onSelect: (selection: number) => void;
  taskId: string;
  sseSessionId: string;
  isLoading?: boolean;
}

const SelectionOptions: React.FC<SelectionOptionsProps> = ({ 
  candidates, 
  onSelect, 
  taskId,
  sseSessionId,
  isLoading = false
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelection = async (selection: number) => {
    if (isLoading) return;
    
    // SSEセッションIDの検証
    if (!sseSessionId || sseSessionId === 'unknown') {
      alert('セッション情報が無効です。ページを再読み込みしてください。');
      return;
    }
    
    setSelectedIndex(selection);
    
    try {
      // バックエンドに選択結果を送信
      const response = await authenticatedFetch('/api/chat/selection', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: taskId,
          selection: selection,
          sse_session_id: sseSessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // デバッグ: 選択結果のレスポンスを確認
      console.log('[DEBUG] Selection response:', result);
      
      if (result.success) {
        onSelect(selection);
      } else {
        throw new Error(result.error || 'Selection failed');
      }
    } catch (error) {
      console.error('Selection failed:', error);
      alert('選択に失敗しました。もう一度お試しください。');
      setSelectedIndex(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">選択を処理中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 text-center">
        以下の5件から選択してください:
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidates.map((candidate, index) => (
          <div 
            key={index} 
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-2 transition-all duration-200 ${
              selectedIndex === index + 1 
                ? 'border-blue-500 ring-2 ring-blue-200' 
                : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
            }`}
          >
            <div className="mb-3">
              <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                {index + 1}. {candidate.title}
              </h4>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="text-sm">
                <span className="font-medium text-gray-600 dark:text-gray-400">食材:</span>
                <span className="ml-1 text-gray-800 dark:text-white">
                  {candidate.ingredients.join(', ')}
                </span>
              </div>
              
              {candidate.cooking_time && (
                <div className="text-sm">
                  <span className="font-medium text-gray-600 dark:text-gray-400">調理時間:</span>
                  <span className="ml-1 text-gray-800 dark:text-white">
                    {candidate.cooking_time}
                  </span>
                </div>
              )}
              
              {candidate.description && (
                <div className="text-sm text-gray-600 dark:text-gray-300 italic">
                  {candidate.description}
                </div>
              )}
              
              {candidate.source && (
                <div className="text-xs">
                  <span className={`px-2 py-1 rounded-full text-white ${
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
            
            <div className="text-center">
              <button 
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  selectedIndex === index + 1
                    ? 'bg-blue-600 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                onClick={() => handleSelection(index + 1)}
                disabled={selectedIndex !== null}
              >
                {selectedIndex === index + 1 ? '選択中...' : '選択'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {selectedIndex && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {selectedIndex}番を選択しました。処理中です...
          </p>
        </div>
      )}
    </div>
  );
};

export default SelectionOptions;
