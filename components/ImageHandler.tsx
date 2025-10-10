'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RecipeUrl } from '../types/menu';
import { extractImageFromUrl } from '../lib/image-extractor';

interface ImageHandlerProps {
  urls: RecipeUrl[];
  title: string;
  onUrlClick?: (url: string) => void;
}

export default function ImageHandler({ urls, title, onUrlClick }: ImageHandlerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shouldLoadImages, setShouldLoadImages] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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

    const cardElement = cardRef.current;
    if (cardElement) {
      observer.observe(cardElement);
    }

    return () => {
      if (cardElement) {
        observer.unobserve(cardElement);
      }
    };
  }, [title]);

  const handleImageClick = () => {
    if (onUrlClick) {
      onUrlClick(urls[0].url);
    } else {
      window.open(urls[0].url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div ref={cardRef} className="mb-4">
      {imageLoading ? (
        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : imageUrl && !imageError ? (
        <button
          onClick={handleImageClick}
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
          onClick={handleImageClick}
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
  );
}
