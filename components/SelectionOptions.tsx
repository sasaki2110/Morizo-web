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
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const handleRadioChange = (index: number) => {
    setSelectedIndex(index);
  };

  const handleConfirm = async () => {
    if (isLoading || selectedIndex === null) return;
    
    // SSEセッションIDの検証
    if (!sseSessionId || sseSessionId === 'unknown') {
      alert('セッション情報が無効です。ページを再読み込みしてください。');
      return;
    }
    
    setIsConfirming(true);
    
    try {
      // バックエンドに選択結果を送信
      const response = await authenticatedFetch('/api/chat/selection', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: taskId,
          selection: selectedIndex + 1, // 1-based index
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
        onSelect(selectedIndex + 1);
      } else {
        throw new Error(result.error || 'Selection failed');
      }
    } catch (error) {
      console.error('Selection failed:', error);
      alert('選択に失敗しました。もう一度お試しください。');
      setSelectedIndex(null);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRequestMore = async () => {
    if (isLoading) return;
    
    // SSEセッションIDの検証
    if (!sseSessionId || sseSessionId === 'unknown') {
      alert('セッション情報が無効です。ページを再読み込みしてください。');
      return;
    }
    
    try {
      // バックエンドに追加提案を要求
      const response = await authenticatedFetch('/api/chat/selection', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: taskId,
          selection: 0, // 0 = 追加提案要求
          sse_session_id: sseSessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // 追加提案が成功した場合、選択状態をリセット
        setSelectedIndex(null);
        // 親コンポーネントに追加提案の結果を通知
        onSelect(0);
      } else {
        throw new Error(result.error || 'Request more failed');
      }
    } catch (error) {
      console.error('Request more failed:', error);
      alert('追加提案の取得に失敗しました。もう一度お試しください。');
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
        採用したいレシピがありましたら、チェックして確定ボタンを押して下さい
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidates.map((candidate, index) => (
          <div 
            key={index} 
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-2 transition-all duration-200 ${
              selectedIndex === index 
                ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50 dark:bg-blue-900' 
                : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
            }`}
          >
            {/* ラジオボタン */}
            <div className="flex items-start mb-3">
              <input
                type="radio"
                id={`recipe-${index}`}
                name="recipe-selection"
                checked={selectedIndex === index}
                onChange={() => handleRadioChange(index)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={isLoading || isConfirming}
              />
              <label htmlFor={`recipe-${index}`} className="ml-3 flex-1 cursor-pointer">
                <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                  {index + 1}. {candidate.title}
                </h4>
              </label>
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
          </div>
        ))}
      </div>
      
      {/* アクションボタン群 */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <button 
          onClick={handleConfirm}
          disabled={selectedIndex === null || isLoading || isConfirming}
          className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
            selectedIndex === null || isLoading || isConfirming
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isConfirming ? '確定中...' : '確定'}
        </button>
        
        <button 
          onClick={handleRequestMore}
          disabled={isLoading || isConfirming}
          className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
            isLoading || isConfirming
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          他の提案を見る
        </button>
      </div>
      
      {selectedIndex !== null && (
        <div className="mt-4 text-center">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {selectedIndex + 1}番のレシピを選択しています
          </p>
        </div>
      )}
    </div>
  );
};

export default SelectionOptions;
