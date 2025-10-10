/**
 * ストリーミング進捗表示コンポーネント（リファクタリング版）
 * 酔っぱらいコーディングの整理版
 */

import React from 'react';
import { StreamingProgressProps } from './types';
import { useStreamingConnection } from './useStreamingConnection';
import { ProgressDisplay } from './ProgressDisplay';

export default function StreamingProgress({
  sseSessionId,
  onComplete,
  onError,
  onTimeout
}: StreamingProgressProps) {
  const state = useStreamingConnection({
    sseSessionId,
    onComplete,
    onError,
    onTimeout
  });

  return (
    <ProgressDisplay
      progress={state.progress}
      message={state.message}
      isConnected={state.isConnected}
      error={state.error}
    />
  );
}
