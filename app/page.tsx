'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import AuthWrapper from '@/components/AuthWrapper';
import UserProfile from '@/components/UserProfile';
import VoiceRecorder from '@/components/VoiceRecorder';
import StreamingProgress from '@/components/StreamingProgress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getCurrentAuthToken, authenticatedFetch } from '@/lib/auth';
import { generateSSESessionId } from '@/lib/session-manager';

export default function Home() {
  const [apiResponse, setApiResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{type: 'user' | 'ai' | 'streaming', content: string, sseSessionId?: string, result?: any}>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');
  const [isTokenLoading, setIsTokenLoading] = useState(false);
  const [textMessage, setTextMessage] = useState<string>('');
  const [isTextChatLoading, setIsTextChatLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { session } = useAuth();

  const testApi = async () => {
    setIsLoading(true);
    setApiResponse('');
    
    try {
      const response = await authenticatedFetch('/api/test', {
        headers: {
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

  const getAuthToken = async () => {
    setIsTokenLoading(true);
    setAuthToken('');
    
    try {
      const token = await getCurrentAuthToken();
      
      if (!token) {
        setAuthToken('認証トークンが取得できません');
        return;
      }

      setAuthToken(token);
    } catch (error) {
      setAuthToken(`エラー: ${error}`);
    } finally {
      setIsTokenLoading(false);
    }
  };

  const copyTokenToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(authToken);
      setIsCopied(true);
      // 2秒後に元の状態に戻す
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('コピーに失敗しました:', error);
    }
  };

  const sendTextMessage = async () => {
    if (!textMessage.trim()) return;

    setIsTextChatLoading(true);
    
    // ユーザーメッセージを追加
    setChatMessages(prev => [...prev, { type: 'user', content: textMessage }]);
    const currentMessage = textMessage;
    setTextMessage(''); // 入力フィールドをクリア
    
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
          message: currentMessage,
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
      setIsTextChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <UserProfile />
          
          {/* チャット履歴 */}
          {chatMessages.length > 0 && (
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                チャット履歴
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
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
                          <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:dark:text-white prose-strong:text-gray-800 prose-strong:dark:text-white prose-p:text-gray-800 prose-p:dark:text-white prose-li:text-gray-800 prose-li:dark:text-white">
                            <ReactMarkdown>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* ストリーミング進捗表示 */}
                    {message.type === 'streaming' && message.sseSessionId && (
                      <StreamingProgress
                        sseSessionId={message.sseSessionId}
                        onComplete={(result) => {
                          // ストリーミング進捗表示をAIメッセージに置き換え
                          setChatMessages(prev => prev.map((msg, idx) => 
                            idx === index
                              ? { type: 'ai', content: result?.response || '処理が完了しました', result: result }
                              : msg
                          ));
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
                      />
                    )}
                  </div>
                ))}
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
                  disabled={isTextChatLoading}
                />
                <button
                  onClick={sendTextMessage}
                  disabled={isTextChatLoading || !textMessage.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                  {isTextChatLoading ? '送信中...' : '送信'}
                </button>
              </div>
              
              {isTextChatLoading && (
                <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Morizo AIが応答を生成中...
                </div>
              )}
            </div>
          </div>

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

          
          {/* 認証トークン表示セクション */}
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">
              認証トークン
            </h2>
            
            <button
              onClick={getAuthToken}
              disabled={isTokenLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 mb-4"
            >
              {isTokenLoading ? 'トークン取得中...' : '認証トークンを取得'}
            </button>
            
            {authToken && (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-left">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    アクセストークン:
                  </h3>
                  <button
                    onClick={copyTokenToClipboard}
                    className={`text-xs px-2 py-1 rounded transition-colors duration-200 ${
                      isCopied 
                        ? 'bg-green-500 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {isCopied ? 'Copied' : 'コピー'}
                  </button>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded p-3 border">
                  <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all overflow-auto max-h-32">
                    {authToken}
                  </pre>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  curl テスト用: <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">Authorization: Bearer {authToken.substring(0, 20)}...</code>
                </div>
              </div>
            )}
          </div>

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
