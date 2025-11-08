'use client';

import React from 'react';

interface ImageSelectorProps {
  file: File | null;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

/**
 * 画像選択UIコンポーネント
 * 
 * 責任: レシート画像の選択UIを提供
 * 
 * @param file - 選択されたファイル
 * @param onSelect - ファイル選択時のコールバック
 * @param disabled - 無効状態
 * @param fileInputRef - input要素の参照
 */
const ImageSelector: React.FC<ImageSelectorProps> = ({
  file,
  onSelect,
  disabled = false,
  fileInputRef,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        レシート画像を選択
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={onSelect}
        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      />
      {file && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          選択中のファイル: {file.name} ({(file.size / 1024).toFixed(2)} KB)
        </p>
      )}
    </div>
  );
};

export default ImageSelector;

