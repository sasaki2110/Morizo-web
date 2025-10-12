/**
 * StreamingProgress関連の型定義
 * 酔っぱらいコーディングの整理版
 */

export interface ProgressData {
  completed_tasks: number;
  total_tasks: number;
  progress_percentage: number;
  current_task: string;
  remaining_tasks: number;
  is_complete: boolean;
}

export interface StreamingMessage {
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

export interface StreamingProgressProps {
  sseSessionId: string;
  onComplete: (result?: unknown) => void;
  onError: (error: string) => void;
  onTimeout: () => void;
  onProgress?: (progress: ProgressData) => void;
}

export type AnimationStage = 'gradient' | 'pulse' | 'sparkle';

export interface StreamingState {
  progress: ProgressData;
  message: string;
  isConnected: boolean;
  error: string;
  lastValidResult: unknown | null;
}
