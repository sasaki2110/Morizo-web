'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getCurrentAuthToken } from '@/lib/auth';

interface ProgressData {
  completed_tasks: number;
  total_tasks: number;
  progress_percentage: number;
  current_task: string;
  remaining_tasks: number;
  is_complete: boolean;
}

interface StreamingMessage {
  type: 'connected' | 'start' | 'progress' | 'complete' | 'error' | 'timeout' | 'close';
  sse_session_id: string;
  timestamp: string;
  message: string;
  progress: ProgressData;
  result?: unknown;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

interface StreamingProgressProps {
  sseSessionId: string;
  onComplete: (result?: unknown) => void;
  onError: (error: string) => void;
  onTimeout: () => void;
}

export default function StreamingProgress({
  sseSessionId,
  onComplete,
  onError,
  onTimeout
}: StreamingProgressProps) {
  const [progress, setProgress] = useState<ProgressData>({
    completed_tasks: 0,
    total_tasks: 0,
    progress_percentage: 0,
    current_task: '',
    remaining_tasks: 0,
    is_complete: false
  });

  // アニメーション段階の管理
  const getAnimationStage = (progress: ProgressData): 'gradient' | 'pulse' | 'sparkle' => {
    if (progress.total_tasks === 0) return 'gradient'; // 0/0 → 0/4: グラデーション
    if (progress.completed_tasks === 0) return 'pulse'; // 0/4 → 1/4: パルス
    return 'sparkle'; // 1/4 → 4/4: スパークル
  };

  const animationStage = getAnimationStage(progress);

  // 進捗状態変更時のログ
  useEffect(() => {
    if (progress) {
      console.log('📈 [UI] Progress updated:', {
        completed: progress.completed_tasks,
        total: progress.total_tasks,
        percentage: progress.progress_percentage,
        currentTask: progress.current_task,
        remaining: progress.remaining_tasks,
        isComplete: progress.is_complete,
        sessionId: sseSessionId,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('📈 [UI] Progress is undefined:', {
        sessionId: sseSessionId,
        timestamp: new Date().toISOString()
      });
    }
  }, [progress, sseSessionId]);
  const [message, setMessage] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [lastValidResult, setLastValidResult] = useState<unknown>(null);
  
  // 複数SSE接続の防止とlastValidResultの状態管理改善
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastValidResultRef = useRef<unknown>(null);
  const isConnectingRef = useRef<boolean>(false);
  const isAbortedRef = useRef<boolean>(false);

  useEffect(() => {
    const connectToStream = async () => {
      // 既存の接続をクリーンアップ
      if (abortControllerRef.current) {
        isAbortedRef.current = true;
        abortControllerRef.current.abort();
      }
      
      // 接続中の場合は重複接続を防止
      if (isConnectingRef.current) {
        return;
      }
      
      isConnectingRef.current = true;
      isAbortedRef.current = false;
      
      try {
        const token = await getCurrentAuthToken();
        if (!token) {
          throw new Error('認証トークンが取得できません');
        }
        
        // AbortControllerを作成
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // fetch API + ReadableStreamを使用してSSE接続
        const response = await fetch(`/api/chat-stream/${sseSessionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          // 180秒のタイムアウトを設定
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`SSE接続エラー: ${response.status}`);
        }

        setIsConnected(true);
        setError('');

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('ストリーミングデータの読み取りができません');
        }

        // ストリーミングデータの処理
        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                // ストリーミング終了時に最後の有効なレスポンスを送信
                const finalResult = lastValidResultRef.current;
                if (finalResult) {
                  onComplete(finalResult);
                } else {
                  console.warn('ストリーミング終了: 有効なレスポンスが見つかりませんでした');
                  // エラーとして処理
                  onError('ストリーミング処理中に有効なレスポンスが受信されませんでした');
                }
                break;
              }

              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const jsonData = line.slice(6).trim();
                    if (jsonData) {
                      console.log('📨 [SSE] Raw message received:', {
                        rawData: jsonData,
                        sessionId: sseSessionId,
                        timestamp: new Date().toISOString()
                      });
                      
                      const data: StreamingMessage = JSON.parse(jsonData);
                      
                      console.log('📨 [SSE] Message parsed:', {
                        parsedData: data,
                        sessionId: sseSessionId,
                        timestamp: new Date().toISOString()
                      });

                      switch (data.type) {
                        case 'connected':
                          console.log('🔗 [SSE] Connected:', {
                            sessionId: sseSessionId,
                            timestamp: data.timestamp
                          });
                          setIsConnected(true);
                          break;

                        case 'start':
                          console.log('🚀 [SSE] Start received:', {
                            type: data.type,
                            progress: data.progress,
                            message: data.message,
                            timestamp: data.timestamp,
                            sessionId: sseSessionId
                          });
                          if (data.progress) {
                            setProgress(data.progress);
                          }
                          if (data.message) {
                            setMessage(data.message);
                          }
                          break;

                        case 'progress':
                          console.log('📊 [SSE] Progress received:', {
                            type: data.type,
                            progress: data.progress,
                            message: data.message,
                            timestamp: data.timestamp,
                            sessionId: sseSessionId
                          });
                          if (data.progress) {
                            setProgress(data.progress);
                          }
                          if (data.message) {
                            setMessage(data.message);
                          }
                          break;

                        case 'complete':
                          console.log('✅ [SSE] Complete received:', {
                            type: data.type,
                            progress: data.progress,
                            message: data.message,
                            timestamp: data.timestamp,
                            sessionId: sseSessionId,
                            hasResult: !!data.result
                          });
                          
                          // progressが存在する場合のみ更新
                          if (data.progress) {
                            setProgress(data.progress);
                          }
                          if (data.message) {
                            setMessage(data.message);
                          }
                          
                          // 複数のcompleteメッセージに対応するため、ストリーミングを継続
                          // レスポンス優先順位: JSON形式 > テキスト形式
                          if (data.result) {
                            const resultObj = data.result as Record<string, unknown>;
                            const hasMenuData = resultObj && 'menu_data' in resultObj;
                            
                            // JSON形式のレスポンスを最優先で保持
                            if (hasMenuData) {
                              setLastValidResult(data.result);
                              lastValidResultRef.current = data.result;
                            } else if (!lastValidResultRef.current) {
                              // テキスト形式はJSON形式がない場合のみフォールバックとして使用
                              setLastValidResult(data.result);
                              lastValidResultRef.current = data.result;
                            }
                          }
                          
                          // 複数completeメッセージの吸収: 親コンポーネントへの通知は最後の1回のみ
                          // ストリーミング終了時にlastValidResultを使用するため、ここでは通知しない
                          break;

                        case 'error':
                          console.log('❌ [SSE] Error received:', {
                            type: data.type,
                            message: data.message,
                            error: data.error,
                            timestamp: data.timestamp,
                            sessionId: sseSessionId
                          });
                          setError(data.message);
                          setIsConnected(false);
                          onError(data.message);
                          return; // ストリーミング終了

                        case 'timeout':
                          console.log('⏰ [SSE] Timeout received:', {
                            type: data.type,
                            message: data.message,
                            timestamp: data.timestamp,
                            sessionId: sseSessionId
                          });
                          setIsConnected(false);
                          onTimeout();
                          return; // ストリーミング終了

                        case 'close':
                          console.log('🔒 [SSE] Close received:', {
                            type: data.type,
                            message: data.message,
                            timestamp: data.timestamp,
                            sessionId: sseSessionId
                          });
                          setIsConnected(false);
                          // ストリーミング終了処理はreader.read()のdoneで処理される
                          break;

                        default:
                          console.warn(`未知のメッセージタイプ [${data.type}]:`, data);
                      }
                    }
                  } catch (parseError) {
                    console.error('メッセージ解析エラー:', parseError);
                    setError('メッセージの解析に失敗しました');
                  }
                }
              }
            }
          } catch (streamError) {
            // AbortErrorは正常な中断として処理
            if (streamError instanceof Error && streamError.name === 'AbortError') {
              return;
            }
            
            // その他のエラーのみエラーとして処理
            console.error('ストリーミング処理エラー:', streamError);
            if (!isAbortedRef.current) {
              setIsConnected(false);
              setError('ストリーミング処理にエラーが発生しました');
              onError('ストリーミング処理にエラーが発生しました');
            }
          }
        };

        // ストリーミング処理を開始
        processStream();

      } catch (error) {
        // AbortErrorは正常な中断として処理
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('ストリーミング接続が正常に中断されました');
          // 中断の場合はエラーとして処理しない
          return;
        }
        
        // その他のエラーのみエラーとして処理
        console.error('ストリーミング接続エラー:', error);
        if (!isAbortedRef.current) {
          setError(error instanceof Error ? error.message : '不明なエラー');
          setIsConnected(false);
          onError(error instanceof Error ? error.message : '不明なエラー');
        }
      } finally {
        isConnectingRef.current = false;
      }
    };

    connectToStream();

    // クリーンアップ関数
    return () => {
      isAbortedRef.current = true;
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      isConnectingRef.current = false;
      setIsConnected(false);
    };
  }, [sseSessionId, onComplete, onError, onTimeout]);

  // エラーが発生した場合の表示
  if (error) {
    return (
      <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900 mr-8">
        <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
          Morizo AI - エラー
        </div>
        <div className="text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 mr-8">
      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-between">
        <span>Morizo AI - 処理中</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          animationStage === 'gradient' 
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-pulse'
            : animationStage === 'pulse'
            ? 'bg-blue-500 text-white animate-pulse shadow-lg shadow-blue-500/50'
            : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white animate-pulse'
        }`}>
          {animationStage === 'gradient' ? '🌈 準備中' : 
           animationStage === 'pulse' ? '⚡ 開始！' : 
           '✨ 進行中'}
        </span>
      </div>
      
      {/* プログレスバー */}
      {progress && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>進捗: {progress.completed_tasks || 0}/{progress.total_tasks || 0} 完了</span>
            <span>{progress.progress_percentage || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 relative overflow-hidden" style={{ willChange: 'transform' }}>
            {/* プログレスバーの背景 */}
            <div
              className={`h-3 rounded-full transition-all duration-500 ease-out relative ${
                animationStage === 'gradient' 
                  ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 animate-pulse' 
                  : animationStage === 'pulse'
                  ? 'bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50'
                  : 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500'
              }`}
              style={{ width: `${progress.progress_percentage || 0}%` }}
            >
              {/* スパークル効果 */}
              {animationStage === 'sparkle' && (
                <>
                  {/* メインのスパークル背景 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 opacity-80 animate-pulse"></div>
                  
                  {/* シャイニー効果 - 光の帯が流れる */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60 transform -skew-x-12 animate-pulse"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200 to-transparent opacity-40 transform -skew-x-12 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                  
                  {/* キラキラパーティクル */}
                  <div className="absolute inset-0">
                    <div className="absolute top-1 left-1/4 w-1 h-1 bg-white rounded-full opacity-80 animate-ping" style={{ animationDelay: '0s', willChange: 'transform, opacity' }}></div>
                    <div className="absolute top-2 right-1/3 w-1 h-1 bg-yellow-200 rounded-full opacity-80 animate-ping" style={{ animationDelay: '0.3s', willChange: 'transform, opacity' }}></div>
                    <div className="absolute bottom-1 left-1/2 w-1 h-1 bg-white rounded-full opacity-80 animate-ping" style={{ animationDelay: '0.6s', willChange: 'transform, opacity' }}></div>
                    <div className="absolute top-1 right-1/4 w-1 h-1 bg-yellow-200 rounded-full opacity-80 animate-ping" style={{ animationDelay: '0.9s', willChange: 'transform, opacity' }}></div>
                    <div className="absolute bottom-2 left-1/3 w-1 h-1 bg-white rounded-full opacity-80 animate-ping" style={{ animationDelay: '1.2s', willChange: 'transform, opacity' }}></div>
                    <div className="absolute top-0 left-1/6 w-0.5 h-0.5 bg-yellow-300 rounded-full opacity-90 animate-ping" style={{ animationDelay: '1.5s', willChange: 'transform, opacity' }}></div>
                    <div className="absolute bottom-0 right-1/6 w-0.5 h-0.5 bg-white rounded-full opacity-90 animate-ping" style={{ animationDelay: '1.8s', willChange: 'transform, opacity' }}></div>
                  </div>
                  
                  {/* グリッター効果 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 opacity-30 animate-pulse"></div>
                </>
              )}
              
              {/* グラデーション効果 */}
              {animationStage === 'gradient' && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 opacity-80 animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 現在のタスク */}
      {progress?.current_task && (
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          <span className="font-medium">現在の処理:</span> {progress.current_task}
        </div>
      )}

      {/* 接続状態 */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
        <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
        {isConnected ? 'リアルタイム接続中' : '接続待機中'}
      </div>

      {/* メッセージ */}
      {message && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {message}
        </div>
      )}
    </div>
  );
}
