'use client';

/**
 * レシピカードコンポーネント
 * 個別のレシピ情報を美しく表示するカード（画像表示機能付き）
 */

import React from 'react';
import { RecipeCardProps } from '../types/menu';
import ImageHandler from './ImageHandler';
import UrlHandler from './UrlHandler';


/**
 * レシピカードコンポーネント
 */
export function RecipeCard({ recipe, onUrlClick }: RecipeCardProps) {
  const { title, urls, emoji } = recipe;

  // 複数URLの場合はプルダウンメニューを表示
  const hasMultipleUrls = urls.length > 1;

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-200 border border-gray-200 dark:border-gray-700"
      data-recipe-card={title}
    >
      {/* 画像表示（クリック可能） */}
      <ImageHandler
        urls={urls}
        title={title}
        onUrlClick={onUrlClick}
      />

      {/* カードヘッダー */}
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">{emoji}</span>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex-1">
          {title}
        </h3>
        {hasMultipleUrls && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
            {urls.length}件
          </span>
        )}
      </div>

      {/* URL一覧 */}
      <UrlHandler
        urls={urls}
        onUrlClick={onUrlClick}
      />

      {/* フッター情報 */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>レシピカテゴリ: {recipe.category}</span>
          <span>{urls.length}個のレシピ</span>
        </div>
      </div>
    </div>
  );
}

/**
 * レシピカードのスケルトンローダー
 */
export function RecipeCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
      {/* ヘッダー */}
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded mr-3"></div>
        <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded flex-1"></div>
      </div>

      {/* URL部分 */}
      <div className="space-y-2">
        <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>

      {/* フッター */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * エラー状態のレシピカード
 */
interface RecipeCardErrorProps {
  title: string;
  error: string;
}

export function RecipeCardError({ title, error }: RecipeCardErrorProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-lg p-6 border border-red-200 dark:border-red-800">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">❌</span>
        <h3 className="text-lg font-bold text-red-800 dark:text-red-200">
          {title}
        </h3>
      </div>
      <div className="text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    </div>
  );
}