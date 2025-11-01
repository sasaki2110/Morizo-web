import { useRef } from 'react';
import { ChatMessage } from '@/types/chat';
import { RecipeCandidate } from '@/types/menu';
import { authenticatedFetch } from '@/lib/auth';

/**
 * SSE処理フック
 * ストリーミング更新、選択要求、確認要求の処理を管理
 */
export function useSSEHandling(
  chatMessages: ChatMessage[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setIsTextChatLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setAwaitingConfirmation: React.Dispatch<React.SetStateAction<boolean>>,
  setConfirmationSessionId: React.Dispatch<React.SetStateAction<string | null>>,
  setAwaitingSelection: React.Dispatch<React.SetStateAction<boolean>>,
  chatEndRef: React.RefObject<HTMLDivElement | null>
) {
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

  // StreamingProgressのonCompleteコールバック（最も複雑なロジック）
  const createOnCompleteHandler = (message: ChatMessage) => {
    return (result: unknown) => {
      console.log('[DEBUG] StreamingProgress onComplete called:', result);
      
      // resultから確認情報を取得
      const typedResult = result as {
        response: string;
        menu_data?: {
          requires_selection?: boolean;
          candidates?: RecipeCandidate[];
          task_id?: string;
          message?: string;
          current_stage?: 'main' | 'sub' | 'soup';
          used_ingredients?: string[];
          menu_category?: 'japanese' | 'western' | 'chinese';
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
    };
  };

  // StreamingProgressのonErrorコールバック
  const createOnErrorHandler = (message: ChatMessage) => {
    return (error: string) => {
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
    };
  };

  // StreamingProgressのonTimeoutコールバック
  const createOnTimeoutHandler = (message: ChatMessage) => {
    return () => {
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
    };
  };

  // StreamingProgressのonProgressコールバック
  const createOnProgressHandler = () => {
    return () => {
      // 進捗更新時に自動スクロールを実行
      chatEndRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end',
        inline: 'nearest' 
      });
    };
  };

  return {
    handleRequestMore,
    handleNextStageRequested,
    createOnCompleteHandler,
    createOnErrorHandler,
    createOnTimeoutHandler,
    createOnProgressHandler,
  };
}

