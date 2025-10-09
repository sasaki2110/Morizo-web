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
  type: 'start' | 'progress' | 'complete' | 'error' | 'timeout';
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
  const [message, setMessage] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const connectToStream = async () => {
      try {
        const token = await getCurrentAuthToken();
        if (!token) {
          throw new Error('認証トークンが取得できません');
        }

        console.log('ストリーミング接続開始:', sseSessionId);

        // fetch API + ReadableStreamを使用してSSE接続
        const response = await fetch(`/api/chat-stream/${sseSessionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          // 180秒のタイムアウトを設定
          signal: AbortSignal.timeout(180000),
        });

        if (!response.ok) {
          throw new Error(`SSE接続エラー: ${response.status}`);
        }

        console.log('SSE接続が開かれました');
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
                console.log('ストリーミング接続が終了しました');
                break;
              }

              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const jsonData = line.slice(6).trim();
                    if (jsonData) {
                      const data: StreamingMessage = JSON.parse(jsonData);
                      console.log('ストリーミングメッセージ受信:', data);

                      switch (data.type) {
                        case 'start':
                          setProgress(data.progress);
                          setMessage(data.message);
                          break;

                        case 'progress':
                          setProgress(data.progress);
                          setMessage(data.message);
                          break;

                        case 'complete':
                          setProgress(data.progress);
                          setMessage(data.message);
                          setIsConnected(false);
                          onComplete(data.result);
                          return; // ストリーミング終了

                        case 'error':
                          setError(data.message);
                          setIsConnected(false);
                          onError(data.message);
                          return; // ストリーミング終了

                        case 'timeout':
                          setIsConnected(false);
                          onTimeout();
                          return; // ストリーミング終了

                        default:
                          console.warn('未知のメッセージタイプ:', data.type);
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
            console.error('ストリーミング処理エラー:', streamError);
            setIsConnected(false);
            setError('ストリーミング処理にエラーが発生しました');
            onError('ストリーミング処理にエラーが発生しました');
          }
        };

        // ストリーミング処理を開始
        processStream();

      } catch (error) {
        console.error('ストリーミング接続エラー:', error);
        setError(error instanceof Error ? error.message : '不明なエラー');
        setIsConnected(false);
        onError(error instanceof Error ? error.message : '不明なエラー');
      }
    };

    connectToStream();

    // クリーンアップ関数
    return () => {
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
      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
        Morizo AI - 処理中
      </div>
      
      {/* プログレスバー */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>進捗: {progress.completed_tasks}/{progress.total_tasks} 完了</span>
          <span>{progress.progress_percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress.progress_percentage}%` }}
          />
        </div>
      </div>

      {/* 現在のタスク */}
      {progress.current_task && (
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
