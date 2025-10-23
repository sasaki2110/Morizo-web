'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import StreamingProgress from '@/components/StreamingProgress';
import SelectionOptions from '@/components/SelectionOptions';
import { authenticatedFetch } from '@/lib/auth';
import { generateSSESessionId } from '@/lib/session-manager';
import { isMenuResponse, parseMenuResponseUnified } from '@/lib/menu-parser';
import { RecipeCandidate } from '@/types/menu';

interface ChatMessage {
  type: 'user' | 'ai' | 'streaming';
  content: string;
  sseSessionId?: string;
  result?: unknown;
  requiresConfirmation?: boolean;
  requiresSelection?: boolean;
  candidates?: RecipeCandidate[];
  taskId?: string;
}

interface ChatSectionProps {
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isTextChatLoading: boolean;
  setIsTextChatLoading: React.Dispatch<React.SetStateAction<boolean>>;
  openRecipeModal: (response: string, result?: unknown) => void;
}

export default function ChatSection({
  chatMessages,
  setChatMessages,
  isTextChatLoading,
  setIsTextChatLoading,
  openRecipeModal
}: ChatSectionProps) {
  const [textMessage, setTextMessage] = useState<string>('');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<boolean>(false);
  const [confirmationSessionId, setConfirmationSessionId] = useState<string | null>(null);
  const [awaitingSelection, setAwaitingSelection] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // チャットメッセージ更新時の自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'end',
      inline: 'nearest' 
    });
  }, [chatMessages]);

  const sendTextMessage = async () => {
    if (!textMessage.trim()) return;

    setIsTextChatLoading(true);
    
    // デバッグログ: 状態を確認
    console.log('[DEBUG] awaitingConfirmation:', awaitingConfirmation);
    console.log('[DEBUG] confirmationSessionId:', confirmationSessionId);
    
    // ユーザーメッセージを追加
    setChatMessages(prev => [...prev, { type: 'user', content: textMessage }]);
    const currentMessage = textMessage;
    setTextMessage(''); // 入力フィールドをクリア
    
    // SSEセッションIDの決定と送信時の確認応答フラグを記録
    let sseSessionId: string;
    const isConfirmationRequest = awaitingConfirmation && !!confirmationSessionId;

    if (isConfirmationRequest) {
      // 曖昧性確認中の場合は既存のセッションIDを使用
      sseSessionId = confirmationSessionId;
      console.log('[DEBUG] Using existing session ID:', sseSessionId);
    } else {
      // 新規リクエストの場合は新しいセッションIDを生成
      sseSessionId = generateSSESessionId();
      console.log('[DEBUG] Generated new session ID:', sseSessionId);
    }
    
    console.log('[DEBUG] Sending request with:', {
      message: currentMessage,
      sse_session_id: sseSessionId,
      confirm: isConfirmationRequest,
      awaitingConfirmation: awaitingConfirmation,
      confirmationSessionId: confirmationSessionId
    });
    
    // ストリーミング進捗表示を追加
    setChatMessages(prev => [...prev, { 
      type: 'streaming', 
      content: '', 
      sseSessionId: sseSessionId 
    }]);
    
    try {
      const response = await authenticatedFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: currentMessage,
          sse_session_id: sseSessionId,
          confirm: isConfirmationRequest
        }),
      });

      if (!response.ok) {
        throw new Error(`チャットAPI エラー: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('[DEBUG] HTTP Response received (for reference only):', {
        success: data.success,
        has_response: !!data.response
      });
      
      // 注意: 曖昧性確認の状態更新はSSEのStreamingProgressで処理されます
      // HTTPレスポンスでは状態を更新しません（SSEが優先）
      
      // 確認応答を送信した場合のみ、状態をリセット
      if (isConfirmationRequest && data.success && !data.requires_confirmation) {
        console.log('[DEBUG] Confirmation response completed, resetting confirmation state');
        setAwaitingConfirmation(false);
        setConfirmationSessionId(null);
      }
    } catch (error) {
      // エラー時はストリーミング進捗表示をエラーメッセージに置き換え
      setChatMessages(prev => prev.map((msg, index) => 
        msg.type === 'streaming' && msg.sseSessionId === sseSessionId
          ? { type: 'ai', content: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}` }
          : msg
      ));
      
      // エラー時は確認状態をリセット
      setAwaitingConfirmation(false);
      setConfirmationSessionId(null);
    } finally {
      setIsTextChatLoading(false);
    }
  };

  const handleSelection = (selection: number) => {
    // 選択完了後の処理
    setAwaitingSelection(false);
    
    // 選択結果メッセージを追加
    setChatMessages(prev => [...prev, {
      type: 'user',
      content: `${selection}番を選択しました`
    }]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  const clearChatHistory = () => {
    setChatMessages([]);
    setAwaitingConfirmation(false);
    setConfirmationSessionId(null);
    setAwaitingSelection(false);
  };

  return (
    <>
      {/* チャット履歴 */}
      {chatMessages.length > 0 && (
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
                {message.type === 'ai' && message.requiresSelection && message.candidates && message.taskId && (
                  <div className="ml-8">
                    <SelectionOptions
                      candidates={message.candidates}
                      onSelect={handleSelection}
                      taskId={message.taskId}
                      sseSessionId={message.sseSessionId || 'unknown'}
                      isLoading={isTextChatLoading}
                    />
                  </div>
                )}
                
                {/* ストリーミング進捗表示 */}
                {message.type === 'streaming' && message.sseSessionId && (
                  <StreamingProgress
                    sseSessionId={message.sseSessionId}
                    onComplete={(result) => {
                      console.log('[DEBUG] StreamingProgress onComplete called:', result);
                      
                      // resultから確認情報を取得
                      const typedResult = result as {
                        response: string;
                        menu_data?: {
                          requires_selection?: boolean;
                          candidates?: RecipeCandidate[];
                          task_id?: string;
                          message?: string;
                        };
                        requires_confirmation?: boolean;
                        confirmation_session_id?: string;
                      } | undefined;
                      
                      console.log('[DEBUG] Checking requires_confirmation:', typedResult?.requires_confirmation);
                      console.log('[DEBUG] Checking confirmation_session_id:', typedResult?.confirmation_session_id);
                      console.log('[DEBUG] Checking menu_data:', typedResult?.menu_data);
                      
                      // 選択要求が必要な場合
                      if (typedResult?.menu_data?.requires_selection && typedResult?.menu_data?.candidates && typedResult?.menu_data?.task_id) {
                        console.log('[DEBUG] Setting awaitingSelection from SSE');
                        console.log('[DEBUG] requires_selection:', typedResult.menu_data?.requires_selection);
                        console.log('[DEBUG] candidates:', typedResult.menu_data?.candidates);
                        console.log('[DEBUG] task_id:', typedResult.menu_data?.task_id);
                        setAwaitingSelection(true);
                        
                        // ストリーミング進捗表示をAIレスポンスに置き換え（選択要求フラグ付き）
                        setChatMessages(prev => 
                          prev.map((msg, idx) => 
                            idx === index
                              ? { 
                                  type: 'ai', 
                                  content: typedResult.response, 
                                  result: typedResult,
                                  requiresSelection: true,
                                  candidates: typedResult.menu_data?.candidates,
                                  taskId: typedResult.menu_data?.task_id,
                                  sseSessionId: message.sseSessionId
                                }
                              : msg
                          )
                        );
                        
                        // 選択要求時はローディング状態を維持（ユーザー入力を受け付ける）
                        setIsTextChatLoading(false);
                      } else if (typedResult?.requires_confirmation && typedResult?.confirmation_session_id) {
                        console.log('[DEBUG] Setting awaitingConfirmation from SSE');
                        console.log('[DEBUG] requires_confirmation:', typedResult.requires_confirmation);
                        console.log('[DEBUG] confirmation_session_id:', typedResult.confirmation_session_id);
                        setAwaitingConfirmation(true);
                        setConfirmationSessionId(typedResult.confirmation_session_id);
                        console.log('[DEBUG] State set - awaitingConfirmation: true, confirmationSessionId:', typedResult.confirmation_session_id);
                        
                        // ストリーミング進捗表示をAIレスポンスに置き換え（曖昧性確認フラグ付き）
                        setChatMessages(prev => 
                          prev.map((msg, idx) => 
                            idx === index
                              ? { 
                                  type: 'ai', 
                                  content: typedResult.response, 
                                  result: typedResult,
                                  requiresConfirmation: true 
                                }
                              : msg
                          )
                        );
                        
                        // 曖昧性確認時はローディング状態を維持（ユーザー入力を受け付ける）
                        setIsTextChatLoading(false);
                      } else {
                        // 通常の完了処理
                        setChatMessages(prev => 
                          prev.map((msg, idx) => 
                            idx === index
                              ? { type: 'ai', content: typedResult?.response || '処理が完了しました', result: typedResult }
                              : msg
                          )
                        );
                        
                        // 通常の完了時のみローディング終了
                        setIsTextChatLoading(false);
                      }
                    }}
                    onError={(error) => {
                      // エラー時はエラーメッセージに置き換え
                      setChatMessages(prev => prev.map((msg, idx) => 
                        idx === index
                          ? { type: 'ai', content: `エラー: ${error}` }
                          : msg
                      ));
                    }}
                    onTimeout={() => {
                      // タイムアウト時はタイムアウトメッセージに置き換え
                      setChatMessages(prev => prev.map((msg, idx) => 
                        idx === index
                          ? { type: 'ai', content: '処理がタイムアウトしました。しばらく時間をおいて再試行してください。' }
                          : msg
                      ));
                    }}
                    onProgress={() => {
                      // 進捗更新時に自動スクロールを実行
                      chatEndRef.current?.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'end',
                        inline: 'nearest' 
                      });
                    }}
                  />
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearChatHistory}
              className="px-3 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md transition-colors duration-200"
              title="チャット履歴をクリア"
            >
              🗑️ クリア
            </button>
          </div>
        </div>
      )}

      {/* テキストチャットセクション */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 text-center">
          Morizo AI テキストチャット
        </h2>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="メッセージを入力してください..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isTextChatLoading || awaitingSelection}
            />
            <button
              onClick={sendTextMessage}
              disabled={isTextChatLoading || !textMessage.trim() || awaitingSelection}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {isTextChatLoading ? '送信中...' : awaitingSelection ? '選択中...' : '送信'}
            </button>
          </div>
          
          {isTextChatLoading && (
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Morizo AIが応答を生成中...
            </div>
          )}
          
          {awaitingSelection && (
            <div className="text-sm text-blue-600 dark:text-blue-400 text-center">
              主菜を選択してください...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
