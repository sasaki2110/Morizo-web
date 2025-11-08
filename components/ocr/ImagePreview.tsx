'use client';

import React from 'react';

interface ImagePreviewProps {
  previewUrl: string;
}

/**
 * 画像プレビュー表示コンポーネント
 * 
 * 責任: 選択されたレシート画像のプレビューを表示
 * 
 * @param previewUrl - プレビュー用の画像URL
 */
const ImagePreview: React.FC<ImagePreviewProps> = ({ previewUrl }) => {
  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        プレビュー:
      </p>
      <img
        src={previewUrl}
        alt="Receipt preview"
        className="max-w-full h-auto border rounded-lg"
      />
    </div>
  );
};

export default ImagePreview;

