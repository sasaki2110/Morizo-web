'use client';

import React, { useState } from 'react';
import { RecipeCandidate } from '@/types/menu';
import { authenticatedFetch } from '@/lib/auth';

interface SelectionOptionsProps {
  candidates: RecipeCandidate[];
  onSelect: (selection: number) => void;
  onViewDetails?: (recipe: RecipeCandidate) => void;
  onViewList?: (candidates: RecipeCandidate[]) => void;
  taskId: string;
  sseSessionId: string;
  isLoading?: boolean;
  onRequestMore?: (sseSessionId: string) => void; // 追加提案用のコールバック
  isLatestSelection?: boolean; // 最新の選択候補かどうか
}

const SelectionOptions: React.FC<SelectionOptionsProps> = ({ 
  candidates, 
  onSelect, 
  onViewDetails,
  onViewList,
  taskId,
  sseSessionId,
  isLoading = false,
  onRequestMore,
  isLatestSelection = true
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isRequestingMore, setIsRequestingMore] = useState(false);

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
    if (isLoading || isConfirming || isRequestingMore) return;
    
    // 新しいSSEセッションIDを生成（既存のSSEセッションは切断済みのため）
    const newSseSessionId = `additional-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('[DEBUG] Generated new SSE session for additional proposal:', newSseSessionId);
    console.log('[DEBUG] Old SSE session ID:', sseSessionId);
    
    setIsRequestingMore(true);
    
    // 先にコールバックを呼び出してChatSectionにstreamingメッセージを追加してもらう
    if (onRequestMore) {
      onRequestMore(newSseSessionId);
    }
    
    try {
      // バックエンドに追加提案を要求（新しいSSEセッションID + 旧セッションIDを送信）
      const response = await authenticatedFetch('/api/chat/selection', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: taskId,
          selection: 0, // 0 = 追加提案要求
          sse_session_id: newSseSessionId,  // 新しいSSEセッションID
          old_sse_session_id: sseSessionId  // 旧セッションID（コンテキスト復元用）
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[DEBUG] Request more response:', result);
      
      if (result.success) {
        setSelectedIndex(null);
      } else {
        throw new Error(result.error || 'Request failed');
      }
    } catch (error) {
      console.error('Request more failed:', error);
      alert('追加提案の要求に失敗しました。');
    } finally {
      setIsRequestingMore(false);
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
      
      {/* 簡素化されたレシピリスト（ラジオボタンのみ） */}
      <div className="space-y-2 mb-4">
        {candidates.map((candidate, index) => (
          <div 
            key={index} 
            className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
              selectedIndex === index 
                ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500' 
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <input
              type="radio"
              id={`recipe-${index}`}
              name="recipe-selection"
              checked={selectedIndex === index}
              onChange={() => handleRadioChange(index)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              disabled={isLoading || isConfirming}
            />
            <label htmlFor={`recipe-${index}`} className="ml-3 flex-1 cursor-pointer">
              <span className="text-gray-800 dark:text-white font-medium">
                {index + 1}. {candidate.title}
              </span>
            </label>
          </div>
        ))}
      </div>
      
      {/* アクションボタン群 */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        {/* レシピ一覧を見るボタン - 常に表示 */}
        {onViewList && (
          <button 
            onClick={() => onViewList(candidates)}
            disabled={isLoading || isConfirming}
            className="px-6 py-3 rounded-lg font-medium transition-colors duration-200 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            📋 レシピ一覧を見る
          </button>
        )}
        
        {/* 確定ボタン - 最新の選択候補のみ表示 */}
        {isLatestSelection !== false && (
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
        )}
        
        {/* 他の提案を見るボタン - 最新の選択候補のみ表示 */}
        {isLatestSelection !== false && onRequestMore && (
          <button 
            onClick={handleRequestMore}
            disabled={isLoading || isConfirming || isRequestingMore}
            className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
              isLoading || isConfirming || isRequestingMore
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            他の提案を見る
          </button>
        )}
      </div>
      
      {isRequestingMore && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-blue-600">追加提案を取得中...</span>
          </div>
        </div>
      )}
      
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