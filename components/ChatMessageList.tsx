'use client';

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import StreamingProgress from '@/components/StreamingProgress';
import SelectionOptions from '@/components/SelectionOptions';
import SelectedRecipeCard from '@/components/SelectedRecipeCard';
import { ChatMessage } from '@/types/chat';
import { RecipeCandidate } from '@/types/menu';
import { isMenuResponse, parseMenuResponseUnified } from '@/lib/menu-parser';

interface ChatMessageListProps {
  chatMessages: ChatMessage[];
  isTextChatLoading: boolean;
  awaitingSelection: boolean;
  selectedRecipes: {
    main?: RecipeCandidate;
    sub?: RecipeCandidate;
    soup?: RecipeCandidate;
  };
  isSavingMenu: boolean;
  savedMessage: string;
  onSaveMenu: () => void;
  onClearHistory: () => void;
  openRecipeModal: (response: string, result?: unknown) => void;
  onSelect: (selection: number, selectionResult?: any) => void;
  onViewDetails: (recipe: RecipeCandidate) => void;
  onViewList: (candidates: RecipeCandidate[]) => void;
  onRequestMore: (sseSessionId: string) => void;
  onNextStageRequested: () => void;
  createOnCompleteHandler: (message: ChatMessage) => (result: unknown) => void;
  createOnErrorHandler: (message: ChatMessage) => (error: string) => void;
  createOnTimeoutHandler: (message: ChatMessage) => () => void;
  createOnProgressHandler: () => () => void;
}

/**
 * チャットメッセージリストコンポーネント
 * チャット履歴の表示、メッセージレンダリング、選択UI、ストリーミング進捗を管理
 */
export default function ChatMessageList({
  chatMessages,
  isTextChatLoading,
  awaitingSelection,
  selectedRecipes,
  isSavingMenu,
  savedMessage,
  onSaveMenu,
  onClearHistory,
  openRecipeModal,
  onSelect,
  onViewDetails,
  onViewList,
  onRequestMore,
  onNextStageRequested,
  createOnCompleteHandler,
  createOnErrorHandler,
  createOnTimeoutHandler,
  createOnProgressHandler,
}: ChatMessageListProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // チャットメッセージ更新時の自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'end',
      inline: 'nearest' 
    });
  }, [chatMessages]);

  // デバッグログ: ChatSectionのレンダリング状況を確認（必要時のみ）
  if (chatMessages.length > 0 && chatMessages.some(msg => msg.type === 'ai' && msg.requiresSelection)) {
    console.log('[DEBUG] ChatSection rendering with selection message:', {
      chatMessagesCount: chatMessages.length,
      awaitingSelection,
      hasSelectionMessage: true
    });
  }

  if (chatMessages.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
        チャット履歴
      </h3>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {chatMessages.map((message, index) => (
          <div key={index}>
            {/* ユーザーメッセージ */}
            {message.type === 'user' && (
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900 ml-8">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  あなた
                </div>
                <div className="text-sm text-gray-800 dark:text-white">
                  {message.content}
                </div>
              </div>
            )}
            
            {/* AIメッセージ */}
            {message.type === 'ai' && (
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 mr-8">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Morizo AI
                </div>
                <div className="text-sm text-gray-800 dark:text-white">
                  {/* レシピレスポンスの場合はモーダル表示ボタンを追加 */}
                  {(() => {
                    // JSON形式を優先してレシピデータを解析
                    const parseResult = parseMenuResponseUnified(message.content, message.result);
                    
                    if (parseResult.success) {
                      // レシピデータが正常に解析できた場合
                      return (
                        <div className="space-y-4">
                          <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:dark:text-white prose-strong:text-gray-800 prose-strong:dark:text-white prose-p:text-gray-800 prose-p:dark:text-white prose-li:text-gray-800 prose-li:dark:text-white">
                            <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => openRecipeModal(message.content, message.result)}
                              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium flex items-center space-x-2"
                            >
                              <span>🍽️</span>
                              <span>レシピを表示</span>
                            </button>
                          </div>
                        </div>
                      );
                    } else if (isMenuResponse(message.content)) {
                      // フォールバック: 文字列解析でレシピデータを検出
                      return (
                        <div className="space-y-4">
                          <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:dark:text-white prose-strong:text-gray-800 prose-strong:dark:text-white prose-p:text-gray-800 prose-p:dark:text-white prose-li:text-gray-800 prose-li:dark:text-white">
                            <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => openRecipeModal(message.content, message.result)}
                              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium flex items-center space-x-2"
                            >
                              <span>🍽️</span>
                              <span>レシピを表示</span>
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      // 通常のテキスト表示
                      return (
                        <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:dark:text-white prose-strong:text-gray-800 prose-strong:dark:text-white prose-p:text-gray-800 prose-p:dark:text-white prose-li:text-gray-800 prose-li:dark:text-white">
                          <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            )}
            
            {/* 選択UI表示 */}
            {message.type === 'ai' && message.requiresSelection && message.candidates && message.taskId && (() => {
              // requiresSelectionがtrueのメッセージのインデックスリストを取得
              const selectionMessageIndices = chatMessages
                .map((m, idx) => m.type === 'ai' && m.requiresSelection ? idx : -1)
                .filter(idx => idx !== -1);
              
              // 現在のメッセージのインデックスがリストの最後かどうかで判定
              const isLatest = selectionMessageIndices.length > 0 && 
                               index === selectionMessageIndices[selectionMessageIndices.length - 1];
              
              // 同一ステージの提案回数（現在までに同ステージで出た選択UIの数 + 1）
              const proposalRound = chatMessages
                .slice(0, index)
                .filter(m => m.type === 'ai' && m.requiresSelection && m.currentStage === message.currentStage)
                .length + 1;
              
              return (
                <div className="ml-8" key={`selection-${index}-${message.taskId}`}>
                  <SelectionOptions
                    candidates={message.candidates}
                    onSelect={onSelect}
                    onViewDetails={onViewDetails}
                    onViewList={onViewList}
                    taskId={message.taskId}
                    sseSessionId={message.sseSessionId || 'unknown'}
                    isLoading={isTextChatLoading}
                    onRequestMore={onRequestMore}
                    isLatestSelection={isLatest}
                    currentStage={message.currentStage}
                    usedIngredients={message.usedIngredients}
                    menuCategory={message.menuCategory}
                    onNextStageRequested={onNextStageRequested}
                    // 提案回数（ラウンド）を渡してラジオグループ名を一意化
                    proposalRound={proposalRound}
                  />
                </div>
              );
            })()}
            
            {/* ストリーミング進捗表示 */}
            {message.type === 'streaming' && message.sseSessionId && (
              <StreamingProgress
                sseSessionId={message.sseSessionId}
                onComplete={createOnCompleteHandler(message)}
                onError={createOnErrorHandler(message)}
                onTimeout={createOnTimeoutHandler(message)}
                onProgress={createOnProgressHandler()}
              />
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      
      {/* Phase 5B-3: 選択済みレシピの表示 */}
      {(selectedRecipes.main || selectedRecipes.sub || selectedRecipes.soup) && (
        <div className="mt-6">
          <SelectedRecipeCard
            main={selectedRecipes.main}
            sub={selectedRecipes.sub}
            soup={selectedRecipes.soup}
            onSave={onSaveMenu}
            onViewList={onViewList}
            isSaving={isSavingMenu}
            savedMessage={savedMessage}
          />
        </div>
      )}
      
      <div className="mt-4 flex justify-end">
        <button
          onClick={onClearHistory}
          className="px-3 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md transition-colors duration-200"
          title="チャット履歴をクリア"
        >
          🗑️ クリア
        </button>
      </div>
    </div>
  );
}

