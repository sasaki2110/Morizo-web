/**
 * 進捗表示コンポーネント
 * 酔っぱらいコーディングの整理版
 */

import React from 'react';
import { ProgressData, AnimationStage } from './types';

interface ProgressDisplayProps {
  progress: ProgressData;
  message: string;
  isConnected: boolean;
  error: string;
}

export function ProgressDisplay({ progress, message, isConnected, error }: ProgressDisplayProps) {
  // アニメーション段階の判定
  const getAnimationStage = (progress: ProgressData): AnimationStage => {
    if (progress.total_tasks === 0) return 'gradient'; // 0/0 → 0/4: グラデーション
    if (progress.completed_tasks === 0) return 'pulse'; // 0/4 → 1/4: パルス
    return 'sparkle'; // 1/4 → 4/4: スパークル
  };

  const animationStage = getAnimationStage(progress);

  // アニメーションクラスの生成
  const getAnimationClasses = (stage: AnimationStage) => {
    switch (stage) {
      case 'gradient':
        return 'bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-pulse';
      case 'pulse':
        return 'bg-gradient-to-r from-green-400 to-blue-500 animate-pulse';
      case 'sparkle':
        return 'bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 animate-pulse';
      default:
        return 'bg-gray-400';
    }
  };

  // エラー表示
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 接続状態表示
  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400 animate-spin" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">接続中...</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>サーバーに接続しています...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          🚀 処理進捗
        </h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getAnimationClasses(animationStage)}`}></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {animationStage}
          </span>
        </div>
      </div>

      {/* タスク数と進捗バー */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span>進捗</span>
          <span>
            {progress.total_tasks === 0 
              ? `初期化中 (${progress.progress_percentage}%)`
              : `${progress.completed_tasks}/${progress.total_tasks} 完了 (${progress.progress_percentage}%)`
            }
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getAnimationClasses(animationStage)}`}
            style={{ width: `${progress.progress_percentage}%` }}
          ></div>
        </div>
      </div>


      {/* 現在のタスク */}
      {progress.current_task && (
        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-3 mb-4">
          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            現在のタスク
          </div>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            {progress.current_task}
          </div>
        </div>
      )}

      {/* メッセージ */}
      {message && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {message}
          </div>
        </div>
      )}

      {/* 完了状態 */}
      {progress.is_complete && (
        <div className="mt-4 bg-green-50 dark:bg-green-900 rounded-lg p-3">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              処理が完了しました！
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
