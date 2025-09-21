'use client';

import { useState } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import UserProfile from '@/components/UserProfile';
import VoiceRecorder from '@/components/VoiceRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [apiResponse, setApiResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{type: 'user' | 'ai', content: string}>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { session } = useAuth();

  const testApi = async () => {
    setIsLoading(true);
    setApiResponse('');
    
    try {
      // 認証トークンを取得
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        setApiResponse('認証トークンが取得できません');
        return;
      }

      // Authorizationヘッダーにトークンを含めてAPIを呼び出し
      const response = await fetch('/api/test', {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setApiResponse(`エラー: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceTranscription = async (text: string) => {
    setIsChatLoading(true);
    
    // ユーザーメッセージを追加
    setChatMessages(prev => [...prev, { type: 'user', content: text }]);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error(`チャットAPI エラー: ${response.status}`);
      }

      const data = await response.json();
      
      // AIレスポンスを追加
      setChatMessages(prev => [...prev, { type: 'ai', content: data.response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        type: 'ai', 
        content: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}` 
      }]);
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
    <AuthWrapper>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <UserProfile />
          
          {/* 音声入力セクション */}
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

          {/* チャット履歴 */}
          {chatMessages.length > 0 && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                チャット履歴
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-100 dark:bg-blue-900 ml-8'
                        : 'bg-gray-100 dark:bg-gray-700 mr-8'
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      {message.type === 'user' ? 'あなた' : 'Morizo AI'}
                    </div>
                    <div className="text-sm text-gray-800 dark:text-white">
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* API テストセクション（既存） */}
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">
              API テスト
            </h2>
            
            <button
              onClick={testApi}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 mb-6"
            >
              {isLoading ? 'API確認中...' : 'API確認'}
            </button>
            
            {apiResponse && (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-left">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  API レスポンス:
                </h3>
                <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto">
                  {apiResponse}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}
