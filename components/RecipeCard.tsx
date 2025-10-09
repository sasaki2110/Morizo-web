'use client';

/**
 * レシピカードコンポーネント
 * 個別のレシピ情報を美しく表示するカード（画像表示機能付き）
 */

import React, { useState, useEffect } from 'react';
import { RecipeCardProps, RecipeUrl } from '../types/menu';
import { extractImageFromUrl, DEFAULT_PLACEHOLDER_IMAGE } from '../lib/image-extractor';

/**
 * URLアイテムコンポーネント
 */
interface UrlItemProps {
  url: RecipeUrl;
  index: number;
  onUrlClick?: (url: string) => void;
}

function UrlItem({ url, index, onUrlClick }: UrlItemProps) {
  const handleClick = () => {
    if (onUrlClick) {
      onUrlClick(url.url);
    } else {
      // デフォルトの動作: 新しいタブで開く
      window.open(url.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 text-left group"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-blue-600 dark:text-blue-400 group-hover:underline font-medium">
          {url.title}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
          {url.domain}
        </span>
      </div>
    </button>
  );
}

/**
 * プルダウンメニューコンポーネント
 */
interface UrlDropdownProps {
  urls: RecipeUrl[];
  onUrlClick?: (url: string) => void;
}

function UrlDropdown({ urls, onUrlClick }: UrlDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedUrl = urls[selectedIndex];

  const handleUrlClick = (url: string, index: number) => {
    // 選択状態を更新
    setSelectedIndex(index);
    
    if (onUrlClick) {
      onUrlClick(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    setIsOpen(false);
  };

  const handleDropdownToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      {/* 選択されたURLの表示 */}
      <button
        onClick={handleDropdownToggle}
        className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 text-left group"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-600 dark:text-blue-400 group-hover:underline font-medium">
            {selectedUrl.title}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selectedUrl.domain}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
          {urls.map((url, index) => (
            <button
              key={index}
              onClick={() => handleUrlClick(url.url, index)}
              className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${
                index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              } ${index === 0 ? 'rounded-t-md' : ''} ${
                index === urls.length - 1 ? 'rounded-b-md' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  {url.title}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {url.domain}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * レシピカードコンポーネント
 */
export function RecipeCard({ recipe, onUrlClick }: RecipeCardProps) {
  const { title, urls, emoji } = recipe;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shouldLoadImages, setShouldLoadImages] = useState(false);

  // 複数URLの場合はプルダウンメニューを表示
  const hasMultipleUrls = urls.length > 1;

  // 画像を抽出（遅延実行）
  useEffect(() => {
    const loadImage = async () => {
      if (!shouldLoadImages || urls.length === 0) {
        return;
      }

      try {
        setImageLoading(true);
        setImageError(false);
        
        // 最初のURLから画像を抽出
        const extractedImageUrl = await extractImageFromUrl(urls[0].url);
        
        if (extractedImageUrl) {
          setImageUrl(extractedImageUrl);
        } else {
          setImageError(true);
        }
      } catch (error) {
        console.warn('画像抽出に失敗:', error);
        setImageError(true);
      } finally {
        setImageLoading(false);
      }
    };

    loadImage();
  }, [urls, shouldLoadImages]);

  // カードが表示領域に入った時に画像読み込みを開始
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoadImages(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const cardElement = document.querySelector(`[data-recipe-card="${title}"]`);
    if (cardElement) {
      observer.observe(cardElement);
    }

    return () => {
      if (cardElement) {
        observer.unobserve(cardElement);
      }
    };
  }, [title]);

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-200 border border-gray-200 dark:border-gray-700"
      data-recipe-card={title}
    >
      {/* 画像表示（クリック可能） */}
      <div className="mb-4">
        {imageLoading ? (
          <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : imageUrl && !imageError ? (
          <button
            onClick={() => {
              if (onUrlClick) {
                onUrlClick(urls[0].url);
              } else {
                window.open(urls[0].url, '_blank', 'noopener,noreferrer');
              }
            }}
            className="w-full h-48 rounded-lg overflow-hidden hover:opacity-90 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={`${title}のレシピを見る`}
          >
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </button>
        ) : (
          <button
            onClick={() => {
              if (onUrlClick) {
                onUrlClick(urls[0].url);
              } else {
                window.open(urls[0].url, '_blank', 'noopener,noreferrer');
              }
            }}
            className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={`${title}のレシピを見る`}
          >
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">📷</div>
              <div className="text-sm">No Image Found</div>
              <div className="text-xs mt-1 opacity-75">クリックしてレシピを見る</div>
            </div>
          </button>
        )}
      </div>

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
      <div className="space-y-2">
        {hasMultipleUrls ? (
          <UrlDropdown urls={urls} onUrlClick={onUrlClick} />
        ) : (
          <UrlItem url={urls[0]} index={0} onUrlClick={onUrlClick} />
        )}
      </div>

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