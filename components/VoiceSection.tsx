'use client';

import VoiceRecorder from '@/components/VoiceRecorder';
import { authenticatedFetch } from '@/lib/auth';
import { generateSSESessionId } from '@/lib/session-manager';
import { ChatMessage } from '@/types/chat';

interface VoiceSectionProps {
  isChatLoading: boolean;
  setIsChatLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export default function VoiceSection({
  isChatLoading,
  setIsChatLoading,
  setChatMessages
}: VoiceSectionProps) {
  const handleVoiceTranscription = async (text: string) => {
    setIsChatLoading(true);
    
    // ユーザーメッセージを追加
    setChatMessages(prev => [...prev, { type: 'user', content: text }]);
    
    // SSEセッションIDを生成
    const sseSessionId = generateSSESessionId();
    
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
          message: text,
          sse_session_id: sseSessionId 
        }),
      });

      if (!response.ok) {
        throw new Error(`チャットAPI エラー: ${response.status}`);
      }

      const data = await response.json();
      
      // ストリーミング進捗表示をAIレスポンスに置き換え
      setChatMessages(prev => prev.map((msg, index) => 
        msg.type === 'streaming' && msg.sseSessionId === sseSessionId
          ? { type: 'ai', content: data.response, result: data }
          : msg
      ));
    } catch (error) {
      // エラー時はストリーミング進捗表示をエラーメッセージに置き換え
      setChatMessages(prev => prev.map((msg, index) => 
        msg.type === 'streaming' && msg.sseSessionId === sseSessionId
          ? { type: 'ai', content: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}` }
          : msg
      ));
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
    </div>
  );
}
