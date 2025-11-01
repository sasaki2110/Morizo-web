import { useState } from 'react';
import { ChatMessage } from '@/types/chat';
import { authenticatedFetch } from '@/lib/auth';
import { generateSSESessionId } from '@/lib/session-manager';

/**
 * チャットメッセージ管理フック
 * メッセージ送信、履歴管理、SSEセッション管理、確認要求の状態を管理
 */
export function useChatMessages(
  chatMessages: ChatMessage[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setIsTextChatLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  const [textMessage, setTextMessage] = useState<string>('');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<boolean>(false);
  const [confirmationSessionId, setConfirmationSessionId] = useState<string | null>(null);

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

  const clearChatHistory = (
    setAwaitingSelection: React.Dispatch<React.SetStateAction<boolean>>,
    clearSelectedRecipes: () => void
  ) => {
    setChatMessages([]);
    setAwaitingConfirmation(false);
    setConfirmationSessionId(null);
    setAwaitingSelection(false);
    // Phase 5B-3: 選択済みレシピもクリア
    clearSelectedRecipes();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  return {
    textMessage,
    setTextMessage,
    awaitingConfirmation,
    setAwaitingConfirmation,
    confirmationSessionId,
    setConfirmationSessionId,
    sendTextMessage,
    clearChatHistory,
    handleKeyPress,
  };
}

