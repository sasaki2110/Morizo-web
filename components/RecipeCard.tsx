'use client';

/**
 * レシピカードコンポーネント
 * 個別のレシピ情報を美しく表示するカード（画像表示機能付き）
 */

import React from 'react';
import { RecipeCardProps, RecipeCard as RecipeCardType } from '../types/menu';
import ImageHandler from './ImageHandler';
import UrlHandler from './UrlHandler';
import { isRecipeAdopted } from '../lib/recipe-api';


/**
 * レシピカードコンポーネント
 */
export function RecipeCard({ recipe, onUrlClick, isSelected = false, onSelect, isAdopted = false }: RecipeCardProps) {
  const { title, urls, emoji } = recipe;

  // 複数URLの場合はプルダウンメニューを表示
  const hasMultipleUrls = urls.length > 1;

  // 採用済みかどうかをチェック（propsで渡されない場合は自動判定）
  const adopted = isAdopted || isRecipeAdopted(title);

  // チェックボックスの変更ハンドラー
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(recipe);
    }
  };

  return (
    <div 
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-200 border ${
        isSelected 
          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' 
          : 'border-gray-200 dark:border-gray-700'
      }`}
      data-recipe-card={title}
    >
      {/* チェックボックス（左上） */}
      {onSelect && (
        <div className="absolute top-4 left-4 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
          />
        </div>
      )}

      {/* 採用済みバッジ（右上） */}
      {adopted && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ✓ 採用済み
          </span>
        </div>
      )}

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