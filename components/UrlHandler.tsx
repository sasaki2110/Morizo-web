'use client';

import React, { useState } from 'react';
import { RecipeUrl } from '../types/menu';

/**
 * URLアイテムコンポーネント
 */
interface UrlItemProps {
  url: RecipeUrl;
  index: number;
  onUrlClick?: (url: string) => void;
}

export function UrlItem({ url, index, onUrlClick }: UrlItemProps) {
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

export function UrlDropdown({ urls, onUrlClick }: UrlDropdownProps) {
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
 * URLハンドラーコンポーネント（メイン）
 */
interface UrlHandlerProps {
  urls: RecipeUrl[];
  onUrlClick?: (url: string) => void;
}

export default function UrlHandler({ urls, onUrlClick }: UrlHandlerProps) {
  // 複数URLの場合はプルダウンメニューを表示
  const hasMultipleUrls = urls.length > 1;

  return (
    <div className="space-y-2">
      {hasMultipleUrls ? (
        <UrlDropdown urls={urls} onUrlClick={onUrlClick} />
      ) : (
        <UrlItem url={urls[0]} index={0} onUrlClick={onUrlClick} />
      )}
    </div>
  );
}
