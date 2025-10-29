'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import StreamingProgress from '@/components/StreamingProgress';
import SelectionOptions from '@/components/SelectionOptions';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import RecipeListModal from '@/components/RecipeListModal';
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
  // Phase 3D: 段階情報
  currentStage?: 'main' | 'sub' | 'soup';
  usedIngredients?: string[];
  menuCategory?: 'japanese' | 'western' | 'chinese';
  selectedRecipe?: {
    main?: RecipeCandidate;
    sub?: RecipeCandidate;
    soup?: RecipeCandidate;
  };
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
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeCandidate | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listModalCandidates, setListModalCandidates] = useState<RecipeCandidate[]>([]);
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
    setChatMessages(prev => [...prev, { type: 'user' as const, content: textMessage }]);
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
      type: 'streaming' as const, 
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
      setChatMessages(prev => prev.map((msg, index): ChatMessage => 
        msg.type === 'streaming' && msg.sseSessionId === sseSessionId
          ? { type: 'ai' as const, content: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}` }
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
      type: 'user' as const,
      content: `${selection}番を選択しました`
    }]);
  };

  const handleViewDetails = (recipe: RecipeCandidate) => {
    setSelectedRecipe(recipe);
    setIsDetailModalOpen(true);
  };

  const handleViewList = (candidates: RecipeCandidate[]) => {
    setListModalCandidates(candidates);
    setIsListModalOpen(true);
  };

  const handleRequestMore = (sseSessionId: string) => {
    // 新しいstreamingメッセージを追加（SSEセッションIDはSelectionOptionsから渡される）
    setChatMessages(prev => [...prev, { 
      type: 'streaming' as const, 
      content: '追加提案を取得中...', 
      sseSessionId: sseSessionId 
    }]);
    
    console.log('[DEBUG] Added streaming message for additional proposal with SSE session:', sseSessionId);
  };

  // Phase 3C-3: 次の段階の提案を要求
  const handleNextStageRequested = async () => {
    // 最後のメッセージからSSEセッションIDを取得
    const lastMessage = chatMessages[chatMessages.length - 1];
    const sseSessionId = lastMessage.sseSessionId || 'unknown';
    
    console.log('[DEBUG] Next stage requested, SSE session ID:', sseSessionId);
    
    // 新しいstreamingメッセージを追加
    setChatMessages(prev => [...prev, { 
      type: 'streaming' as const, 
      content: '次段階の提案を取得中...', 
      sseSessionId: sseSessionId 
    }]);
    
    // スペース1つのメッセージで/api/chatを呼び出す（バックエンドが自動的に次の提案を開始）
    try {
      const response = await authenticatedFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: ' ', // スペース1つ（バックエンドがセッションから次の提案を読み取る）
          sse_session_id: sseSessionId,
          confirm: false
        }),
      });

      if (!response.ok) {
        throw new Error(`チャットAPI エラー: ${response.status}`);
      }

      // SSEのStreamingProgressが処理するため、ここでは何もしない
      console.log('[DEBUG] Next stage request sent successfully');
    } catch (error) {
      console.error('Next stage request failed:', error);
      alert('次段階の提案の取得に失敗しました。');
    }
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

  // デバッグログ: ChatSectionのレンダリング状況を確認（必要時のみ）
  if (chatMessages.length > 0 && chatMessages.some(msg => msg.type === 'ai' && msg.requiresSelection)) {
    console.log('[DEBUG] ChatSection rendering with selection message:', {
      chatMessagesCount: chatMessages.length,
      awaitingSelection,
      hasSelectionMessage: true
    });
  }

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
                {message.type === 'ai' && message.requiresSelection && message.candidates && message.taskId && (() => {
                  // requiresSelectionがtrueのメッセージのインデックスリストを取得
                  const selectionMessageIndices = chatMessages
                    .map((m, idx) => m.type === 'ai' && m.requiresSelection ? idx : -1)
                    .filter(idx => idx !== -1);
                  
                  // 現在のメッセージのインデックスがリストの最後かどうかで判定
                  const isLatest = selectionMessageIndices.length > 0 && 
                                   index === selectionMessageIndices[selectionMessageIndices.length - 1];
                  
                  return (
                    <div className="ml-8" key={`selection-${index}-${message.taskId}`}>
                      <SelectionOptions
                        candidates={message.candidates}
                        onSelect={handleSelection}
                        onViewDetails={handleViewDetails}
                        onViewList={handleViewList}
                        taskId={message.taskId}
                        sseSessionId={message.sseSessionId || 'unknown'}
                        isLoading={isTextChatLoading}
                        onRequestMore={handleRequestMore}
                        isLatestSelection={isLatest}
                        currentStage={message.currentStage}
                        usedIngredients={message.usedIngredients}
                        menuCategory={message.menuCategory}
                        onNextStageRequested={handleNextStageRequested}
                      />
                    </div>
                  );
                })()}
                
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
                        console.log('[DEBUG] task_id from SSE:', typedResult.menu_data?.task_id);
                        console.log('[DEBUG] current_stage from SSE:', typedResult.menu_data?.current_stage);
                        console.log('[DEBUG] updating message with sseSessionId:', message.sseSessionId);
                        setAwaitingSelection(true);
                        
                        // ストリーミング進捗表示をAIレスポンスに置き換え（選択要求フラグ付き）
                        // sseSessionIdで対応するメッセージを特定。同じセッションIDが複数ある場合、最後のstreamingメッセージを更新
                        setChatMessages(prev => {
                          const targetSseSessionId = message.sseSessionId;
                          const incomingTaskId = typedResult.menu_data?.task_id;
                          const incomingStage = typedResult.menu_data?.current_stage;
                          
                          console.log('[DEBUG] Looking for streaming message with:', {
                            targetSseSessionId,
                            incomingTaskId,
                            incomingStage,
                            allMessages: prev.map((m, i) => ({
                              index: i,
                              type: m.type,
                              sseSessionId: m.sseSessionId,
                              taskId: m.taskId,
                              currentStage: m.currentStage
                            }))
                          });
                          
                          // currentStageに基づいて、既に存在する選択メッセージを確認
                          const existingMessageWithStage = prev.find(m => 
                            m.type === 'ai' && 
                            m.currentStage === incomingStage &&
                            m.sseSessionId === targetSseSessionId
                          );
                          
                          if (existingMessageWithStage) {
                            console.log('[DEBUG] Message already exists for stage:', incomingStage, 'taskId:', existingMessageWithStage.taskId);
                            return prev; // 既にこの段階のメッセージが存在する場合は更新しない
                          }
                          
                          // 最後の選択メッセージ（ai + taskId）のインデックスを見つける
                          let lastAiMessageIndex = -1;
                          for (let i = prev.length - 1; i >= 0; i--) {
                            if (prev[i].type === 'ai' && prev[i].taskId && prev[i].sseSessionId === targetSseSessionId) {
                              lastAiMessageIndex = i;
                              break;
                            }
                          }
                          
                          // 最後の選択メッセージ以降で、最初のstreamingメッセージを見つける
                          let targetStreamingIndex = -1;
                          if (lastAiMessageIndex >= 0) {
                            for (let i = lastAiMessageIndex + 1; i < prev.length; i++) {
                              if (prev[i].type === 'streaming' && prev[i].sseSessionId === targetSseSessionId) {
                                targetStreamingIndex = i;
                                break;
                              }
                            }
                          } else {
                            // 選択メッセージが存在しない場合は、最後のstreamingメッセージを使用
                            for (let i = prev.length - 1; i >= 0; i--) {
                              if (prev[i].type === 'streaming' && prev[i].sseSessionId === targetSseSessionId) {
                                targetStreamingIndex = i;
                                break;
                              }
                            }
                          }
                          
                          console.log('[DEBUG] Target streaming message index:', targetStreamingIndex, 'lastAiMessageIndex:', lastAiMessageIndex);
                          
                          const updatedMessages: ChatMessage[] = prev.map((msg, idx) => {
                            // 更新対象のstreamingメッセージか確認
                            if (idx === targetStreamingIndex && msg.type === 'streaming' && msg.sseSessionId === targetSseSessionId) {
                              console.log('[DEBUG] Updating streaming message at index:', idx, 'with taskId:', incomingTaskId, 'stage:', incomingStage);
                              return { 
                                type: 'ai' as const, 
                                content: typedResult.response, 
                                result: typedResult,
                                requiresSelection: typedResult.menu_data?.requires_selection,
                                candidates: typedResult.menu_data?.candidates,
                                taskId: incomingTaskId,
                                sseSessionId: targetSseSessionId,
                                currentStage: incomingStage,
                                usedIngredients: typedResult.menu_data?.used_ingredients,
                                menuCategory: typedResult.menu_data?.menu_category
                              };
                            }
                            return msg;
                          });
                          
                          // デバッグログ: 更新されたメッセージを確認
                          const updatedMessage = updatedMessages.find(msg => 
                            msg.type === 'ai' && msg.sseSessionId === targetSseSessionId && msg.taskId === typedResult.menu_data?.task_id
                          );
                          console.log('[DEBUG] Updated message:', {
                            type: updatedMessage?.type,
                            requiresSelection: updatedMessage?.requiresSelection,
                            hasCandidates: !!updatedMessage?.candidates,
                            candidatesLength: updatedMessage?.candidates?.length,
                            hasTaskId: !!updatedMessage?.taskId,
                            taskId: updatedMessage?.taskId,
                            sseSessionId: updatedMessage?.sseSessionId,
                            currentStage: updatedMessage?.currentStage
                          });
                          
                          // デバッグログ: 条件分岐の各条件を個別に確認
                          console.log('[DEBUG] Condition check for SelectionOptions:', {
                            messageType: updatedMessage?.type,
                            messageTypeCheck: updatedMessage?.type === 'ai',
                            requiresSelection: updatedMessage?.requiresSelection,
                            requiresSelectionCheck: !!updatedMessage?.requiresSelection,
                            candidates: updatedMessage?.candidates,
                            candidatesCheck: !!updatedMessage?.candidates,
                            taskId: updatedMessage?.taskId,
                            taskIdCheck: !!updatedMessage?.taskId,
                            allConditionsMet: (updatedMessage?.type === 'ai') && 
                                           (!!updatedMessage?.requiresSelection) && 
                                           (!!updatedMessage?.candidates) && 
                                           (!!updatedMessage?.taskId)
                          });
                          
                          return updatedMessages;
                        });
                        
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
                        setChatMessages(prev => {
                          const targetSseSessionId = message.sseSessionId;
                          
                          // 同じsseSessionIdを持つstreamingメッセージの最後のインデックスを見つける
                          let lastStreamingIndex = -1;
                          for (let i = prev.length - 1; i >= 0; i--) {
                            if (prev[i].type === 'streaming' && prev[i].sseSessionId === targetSseSessionId) {
                              lastStreamingIndex = i;
                              break;
                            }
                          }
                          
                          return prev.map((msg, idx): ChatMessage => 
                            idx === lastStreamingIndex && msg.type === 'streaming' && msg.sseSessionId === targetSseSessionId
                              ? { 
                                  type: 'ai' as const, 
                                  content: typedResult.response, 
                                  result: typedResult,
                                  requiresConfirmation: typedResult.requires_confirmation // スネークケースをキャメルケースに変換
                                }
                              : msg
                          );
                        });
                        
                        // 曖昧性確認時はローディング状態を維持（ユーザー入力を受け付ける）
                        setIsTextChatLoading(false);
                      } else {
                        // 通常の完了処理
                        setChatMessages(prev => {
                          const targetSseSessionId = message.sseSessionId;
                          
                          // 同じsseSessionIdを持つstreamingメッセージの最後のインデックスを見つける
                          let lastStreamingIndex = -1;
                          for (let i = prev.length - 1; i >= 0; i--) {
                            if (prev[i].type === 'streaming' && prev[i].sseSessionId === targetSseSessionId) {
                              lastStreamingIndex = i;
                              break;
                            }
                          }
                          
                          return prev.map((msg, idx): ChatMessage => 
                            idx === lastStreamingIndex && msg.type === 'streaming' && msg.sseSessionId === targetSseSessionId
                              ? { type: 'ai' as const, content: typedResult?.response || '処理が完了しました', result: typedResult }
                              : msg
                          );
                        });
                        
                        // 通常の完了時のみローディング終了
                        setIsTextChatLoading(false);
                      }
                    }}
                    onError={(error) => {
                      // エラー時はエラーメッセージに置き換え
                      setChatMessages(prev => {
                        const targetSseSessionId = message.sseSessionId;
                        let lastStreamingIndex = -1;
                        for (let i = prev.length - 1; i >= 0; i--) {
                          if (prev[i].type === 'streaming' && prev[i].sseSessionId === targetSseSessionId) {
                            lastStreamingIndex = i;
                            break;
                          }
                        }
                        return prev.map((msg, idx): ChatMessage => 
                          idx === lastStreamingIndex && msg.type === 'streaming' && msg.sseSessionId === targetSseSessionId
                            ? { type: 'ai' as const, content: `エラー: ${error}` }
                            : msg
                        );
                      });
                    }}
                    onTimeout={() => {
                      // タイムアウト時はタイムアウトメッセージに置き換え
                      setChatMessages(prev => {
                        const targetSseSessionId = message.sseSessionId;
                        let lastStreamingIndex = -1;
                        for (let i = prev.length - 1; i >= 0; i--) {
                          if (prev[i].type === 'streaming' && prev[i].sseSessionId === targetSseSessionId) {
                            lastStreamingIndex = i;
                            break;
                          }
                        }
                        return prev.map((msg, idx): ChatMessage => 
                          idx === lastStreamingIndex && msg.type === 'streaming' && msg.sseSessionId === targetSseSessionId
                            ? { type: 'ai' as const, content: '処理がタイムアウトしました。しばらく時間をおいて再試行してください。' }
                            : msg
                        );
                      });
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
      
      {/* レシピ詳細モーダル */}
      {isDetailModalOpen && selectedRecipe && (
        <RecipeDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedRecipe(null);
          }}
          recipe={selectedRecipe}
        />
      )}
      
      {/* レシピ一覧モーダル */}
      {isListModalOpen && listModalCandidates.length > 0 && (
        <RecipeListModal
          isOpen={isListModalOpen}
          onClose={() => {
            setIsListModalOpen(false);
            setListModalCandidates([]);
          }}
          candidates={listModalCandidates}
        />
      )}
    </>
  );
}
