'use client';

import { useState, useRef, useCallback } from 'react';

/**
 * 画像選択とバリデーションを管理するカスタムフック
 * 
 * 責任: 画像選択、ファイル形式・サイズバリデーション、プレビューURL管理
 * 
 * @returns {Object} 画像選択関連の状態と関数
 */
export const useImagePicker = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイル形式チェック
  const validateImageFormat = useCallback((file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      alert('JPEGまたはPNGファイルのみアップロード可能です');
      return false;
    }
    return true;
  }, []);

  // ファイルサイズチェック（10MB）
  const validateImageSize = useCallback((file: File): boolean => {
    if (file.size > 10 * 1024 * 1024) {
      alert('ファイルサイズは10MB以下にしてください');
      return false;
    }
    return true;
  }, []);

  // 画像選択処理
  const selectImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // バリデーション
      if (!validateImageFormat(selectedFile)) {
        return;
      }
      if (!validateImageSize(selectedFile)) {
        return;
      }

      // 既存のプレビューURLをクリーンアップ
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setFile(selectedFile);
      
      // プレビューURL作成
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  }, [previewUrl, validateImageFormat, validateImageSize]);

  // 画像クリア処理
  const clearImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  return {
    file,
    previewUrl,
    fileInputRef,
    selectImage,
    clearImage,
  };
};

