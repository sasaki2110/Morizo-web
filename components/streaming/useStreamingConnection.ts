/**
 * SSE接続管理のカスタムフック
 * 酔っぱらいコーディングの整理版
 */

import { useState, useEffect, useRef } from 'react';
import { getCurrentAuthToken } from '@/lib/auth';
import { StreamingMessage, StreamingState, ProgressData } from './types';

interface UseStreamingConnectionProps {
  sseSessionId: string;
  onComplete: (result?: unknown) => void;
  onError: (error: string) => void;
  onTimeout: () => void;
  onProgress?: (progress: ProgressData) => void;
}

export function useStreamingConnection({
  sseSessionId,
  onComplete,
  onError,
  onTimeout,
  onProgress
}: UseStreamingConnectionProps): StreamingState {
  const [state, setState] = useState<StreamingState>({
    progress: {
      completed_tasks: 0,
      total_tasks: 0,
      progress_percentage: 0,
      current_task: '',
      remaining_tasks: 0,
      is_complete: false
    },
    message: '',
    isConnected: false,
    error: '',
    lastValidResult: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastValidResultRef = useRef<unknown>(null);
  const isConnectingRef = useRef<boolean>(false);
  const isAbortedRef = useRef<boolean>(false);

  useEffect(() => {
    // Hot Reloadによる重複実行を防ぐ
    if (isConnectingRef.current) {
      console.log('🔍 [useStreamingConnection] Already connecting, skipping');
      return;
    }

    const connectToStream = async () => {
      // 既存の接続をクリーンアップ
      if (abortControllerRef.current) {
        isAbortedRef.current = true;
        abortControllerRef.current.abort();
      }

      isConnectingRef.current = true;
      isAbortedRef.current = false;

      try {
        console.log('🔍 [useStreamingConnection] Getting auth token');
        const token = await getCurrentAuthToken();
        if (!token) {
          throw new Error('認証トークンが取得できませんでした');
        }
        console.log('🔍 [useStreamingConnection] Auth token obtained');

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        console.log('🔍 [useStreamingConnection] Fetching SSE endpoint:', `/api/chat-stream/${sseSessionId}`);
        console.log('🔍 [useStreamingConnection] About to call fetch...');
        
        const response = await fetch(`/api/chat-stream/${sseSessionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          signal: abortController.signal,
        });
        
        console.log('🔍 [useStreamingConnection] Fetch completed!');
        console.log('🔍 [useStreamingConnection] SSE response status:', response.status);
        console.log('🔍 [useStreamingConnection] SSE response ok:', response.ok);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('ストリームリーダーが取得できませんでした');
        }

        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                const finalResult = lastValidResultRef.current;
                if (finalResult) {
                  onComplete(finalResult);
                } else {
                  console.warn('ストリーミング終了: 有効なレスポンスが見つかりませんでした');
                  onError('ストリーミングが完了しましたが、有効なレスポンスがありませんでした');
                }
                break;
              }

              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const jsonData = line.slice(6).trim();
                  
                  if (jsonData === '[DONE]') {
                    continue;
                  }

                  try {
                    const data: StreamingMessage = JSON.parse(jsonData);

                    // メッセージタイプ別の処理
                    switch (data.type) {
                      case 'connected':
                        setState(prev => ({
                          ...prev,
                          isConnected: true,
                          message: data.message || '接続が確立されました'
                        }));
                        break;

                      case 'start':
                        setState(prev => ({
                          ...prev,
                          message: data.message || '処理を開始しました'
                        }));
                        break;

                      case 'progress':
                        if (data.progress) {
                          setState(prev => ({
                            ...prev,
                            progress: data.progress,
                            message: data.message || ''
                          }));
                          // 進捗更新時にコールバックを実行
                          onProgress?.(data.progress);
                        }
                        break;

                      case 'complete':
                        if (data.result) {
                          lastValidResultRef.current = data.result;
                          setState(prev => ({
                            ...prev,
                            progress: {
                              ...prev.progress,
                              is_complete: true
                            },
                            lastValidResult: data.result
                          }));
                        }
                        break;

                      case 'error':
                        setState(prev => ({
                          ...prev,
                          error: data.error?.message || data.message || 'エラーが発生しました'
                        }));
                        onError(data.error?.message || data.message || 'エラーが発生しました');
                        break;

                      case 'timeout':
                        setState(prev => ({
                          ...prev,
                          error: 'タイムアウトが発生しました'
                        }));
                        onTimeout();
                        break;

                      case 'close':
                        setState(prev => ({
                          ...prev,
                          isConnected: false,
                          message: '接続が閉じられました'
                        }));
                        break;

                      default:
                        console.warn(`未知のメッセージタイプ [${data.type}]:`, data);
                        break;
                    }
                  } catch (parseError) {
                    console.error('メッセージ解析エラー:', parseError);
                  }
                }
              }
            }
          } catch (streamError) {
            // Hot Reloadによる中断は無視
            if (!isAbortedRef.current && !(streamError instanceof DOMException && streamError.name === 'AbortError')) {
              console.error('ストリーミング処理エラー:', streamError);
              setState(prev => ({
                ...prev,
                error: streamError instanceof Error ? streamError.message : 'ストリーミング処理でエラーが発生しました'
              }));
              onError(streamError instanceof Error ? streamError.message : 'ストリーミング処理でエラーが発生しました');
            }
          } finally {
            if (!isAbortedRef.current) {
              console.log('ストリーミング接続が正常に中断されました');
            }
          }
        };

        await processStream();

      } catch (error) {
        console.log('🔍 [useStreamingConnection] Error caught:', error);
        // Hot Reloadによる中断は無視
        if (!isAbortedRef.current && !(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('ストリーミング接続エラー:', error);
          setState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : '接続エラーが発生しました'
          }));
          onError(error instanceof Error ? error.message : '接続エラーが発生しました');
        } else {
          console.log('🔍 [useStreamingConnection] AbortError ignored (likely Hot Reload)');
        }
      } finally {
        console.log('🔍 [useStreamingConnection] Finally block executed');
        isConnectingRef.current = false;
      }
    };

    connectToStream();

    // クリーンアップ関数
    return () => {
      if (abortControllerRef.current) {
        isAbortedRef.current = true;
        abortControllerRef.current.abort();
      }
    };
  }, [sseSessionId, onComplete, onError, onTimeout]);

  return state;
}
