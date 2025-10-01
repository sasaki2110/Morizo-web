'use client';

/**
 * レシピ専用ビューアーのモーダルコンポーネント
 * シンプルで軽量、Expo Mobile展開対応
 */

import React, { useEffect } from 'react';
import { MenuViewer } from './MenuViewer';

interface RecipeModalProps {
  /** モーダルの表示状態 */
  isOpen: boolean;
  /** モーダルを閉じる関数 */
  onClose: () => void;
  /** レシピレスポンス */
  response: string;
  /** カスタムクラス名 */
  className?: string;
}

export function RecipeModal({ isOpen, onClose, response, className = '' }: RecipeModalProps) {
  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // モーダル表示時にbodyのスクロールを無効化
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // モーダル閉じる時にbodyのスクロールを復元
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // モーダルが閉じている場合は何も表示しない
  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}>
      {/* オーバーレイ（背景） */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* モーダルコンテンツ */}
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            🍽️ レシピ提案
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
            aria-label="閉じる"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6">
            <MenuViewer response={response} />
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            MorizoAI レシピ専用ビューアー
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * モバイル最適化版モーダル
 */
export function RecipeModalMobile({ isOpen, onClose, response, className = '' }: RecipeModalProps) {
  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${className}`}>
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* モーダルコンテンツ（フルスクリーン） */}
      <div className="relative flex-1 bg-white dark:bg-gray-800 flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            🍽️ レシピ提案
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
            aria-label="閉じる"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <MenuViewer response={response} />
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * レスポンシブ対応モーダル（自動切り替え）
 */
export function RecipeModalResponsive({ isOpen, onClose, response, className = '' }: RecipeModalProps) {
  return (
    <>
      {/* デスクトップ版 */}
      <div className="hidden md:block">
        <RecipeModal 
          isOpen={isOpen} 
          onClose={onClose} 
          response={response} 
          className={className}
        />
      </div>
      
      {/* モバイル版 */}
      <div className="block md:hidden">
        <RecipeModalMobile 
          isOpen={isOpen} 
          onClose={onClose} 
          response={response} 
          className={className}
        />
      </div>
    </>
  );
}
