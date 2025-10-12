'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import StreamingProgress from '@/components/StreamingProgress';
import { authenticatedFetch } from '@/lib/auth';
import { generateSSESessionId } from '@/lib/session-manager';
import { isMenuResponse, parseMenuResponseUnified } from '@/lib/menu-parser';

interface ChatMessage {
  type: 'user' | 'ai' | 'streaming';
  content: string;
  sseSessionId?: string;
  result?: unknown;
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

  const clearChatHistory = () => {
    setChatMessages([]);
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
                
                {/* ストリーミング進捗表示 */}
                {message.type === 'streaming' && message.sseSessionId && (
                  <StreamingProgress
                    sseSessionId={message.sseSessionId}
                    onComplete={(result) => {
                      // 複数completeメッセージの重複処理防止
                      // 同じSSEセッションでの重複処理を避けるため、一度だけ処理
                      const resultObj = result as { response?: string; menu_data?: unknown };
                      
                      // ストリーミング進捗表示をAIメッセージに置き換え（1回のみ）
                      setChatMessages(prev => prev.map((msg, idx) => 
                        idx === index
                          ? { type: 'ai', content: resultObj?.response || '処理が完了しました', result: result }
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
    </>
  );
}
