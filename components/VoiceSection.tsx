'use client';

import { useState } from 'react';
import VoiceRecorder from '@/components/VoiceRecorder';
import { authenticatedFetch } from '@/lib/auth';
import { generateSSESessionId } from '@/lib/session-manager';
import { ChatMessage } from '@/types/chat';
import StreamingProgress from '@/components/streaming/StreamingProgress';
import { useSSEHandling } from '@/hooks/useSSEHandling';
import { applyTextReplacement } from '@/lib/voice-text-replacement';

interface VoiceSectionProps {
  isChatLoading: boolean;
  setIsChatLoading: React.Dispatch<React.SetStateAction<boolean>>;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export default function VoiceSection({
  isChatLoading,
  setIsChatLoading,
  chatMessages,
  setChatMessages
}: VoiceSectionProps) {
  // 確認状態管理
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<boolean>(false);
  const [confirmationSessionId, setConfirmationSessionId] = useState<string | null>(null);

  // SSE処理フック
  const {
    createOnCompleteHandler,
    createOnErrorHandler,
    createOnTimeoutHandler,
    createOnProgressHandler,
  } = useSSEHandling(
    chatMessages,
    setChatMessages,
    setIsChatLoading,
    setAwaitingConfirmation,
    setConfirmationSessionId,
    () => {}, // setAwaitingSelectionは音声入力では未使用
    null // chatEndRefは音声入力では未使用
  );

  const handleVoiceTranscription = async (text: string) => {
    setIsChatLoading(true);
    
    // 音声認識テキストに置換ルールを適用
    const replacedText = applyTextReplacement(text);
    
    // ユーザーメッセージを追加（置換後のテキストを使用）
    setChatMessages(prev => [...prev, { type: 'user', content: replacedText }]);
    
    // SSEセッションIDの決定と確認応答フラグを設定
    let sseSessionId: string;
    const isConfirmationRequest = awaitingConfirmation && !!confirmationSessionId;

    if (isConfirmationRequest) {
      // 曖昧性確認中の場合は既存のセッションIDを使用
      sseSessionId = confirmationSessionId;
    } else {
      // 新規リクエストの場合は新しいセッションIDを生成
      sseSessionId = generateSSESessionId();
    }
    
    // ストリーミング進捗表示を追加
    const streamingMessage: ChatMessage = { 
      type: 'streaming', 
      content: '', 
      sseSessionId: sseSessionId 
    };
    setChatMessages(prev => [...prev, streamingMessage]);
    
    try {
      const response = await authenticatedFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: replacedText,
          sse_session_id: sseSessionId,
          confirm: isConfirmationRequest
        }),
      });

      if (!response.ok) {
        throw new Error(`チャットAPI エラー: ${response.status}`);
      }

      const data = await response.json();
      
      // HTTPレスポンスから確認情報を取得して状態を更新
      if (data.requires_confirmation && data.confirmation_session_id) {
        setAwaitingConfirmation(true);
        setConfirmationSessionId(data.confirmation_session_id);
      } else if (isConfirmationRequest && data.success && !data.requires_confirmation) {
        // 確認応答が完了した場合は状態をリセット
        setAwaitingConfirmation(false);
        setConfirmationSessionId(null);
      }
      
      // ストリーミング進捗表示をAIレスポンスに置き換え
      // 選択要求がある場合は、選択関連情報も含める
      setChatMessages(prev => prev.map((msg, index) => 
        msg.type === 'streaming' && msg.sseSessionId === sseSessionId
          ? { 
              type: 'ai', 
              content: data.response, 
              result: data,
              requiresConfirmation: data.requires_confirmation,
              // 選択関連情報を追加
              requiresSelection: data.requires_selection || false,
              candidates: data.candidates || undefined,
              taskId: data.task_id || undefined,
              currentStage: data.current_stage || undefined,
              usedIngredients: data.used_ingredients || undefined,
              menuCategory: data.menu_category || undefined,
              sseSessionId: sseSessionId
            }
          : msg
      ));
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
      setIsChatLoading(false);
    }
  };

  const handleVoiceError = (error: string) => {
    setChatMessages(prev => [...prev, { 
      type: 'ai', 
      content: `音声認識エラー: ${error}` 
    }]);
  };

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">
        Morizo AI 音声チャット
      </h2>
      
      <VoiceRecorder 
        onTranscriptionComplete={handleVoiceTranscription}
        onError={handleVoiceError}
      />
      
      {isChatLoading && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Morizo AIが応答を生成中...
        </div>
      )}

      {/* SSEストリーミング進捗表示 */}
      {chatMessages
        .filter(msg => msg.type === 'streaming' && msg.sseSessionId)
        .map((msg, index) => (
          <div key={`streaming-${msg.sseSessionId}-${index}`} className="mt-4">
            <StreamingProgress
              sseSessionId={msg.sseSessionId!}
              onComplete={createOnCompleteHandler(msg)}
              onError={createOnErrorHandler(msg)}
              onTimeout={createOnTimeoutHandler(msg)}
              onProgress={createOnProgressHandler()}
            />
          </div>
        ))}
    </div>
  );
}
