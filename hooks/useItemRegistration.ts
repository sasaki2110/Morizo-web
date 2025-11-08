'use client';

import { useState, useCallback } from 'react';
import { authenticatedFetch } from '@/lib/auth';
import type { OCRItem } from './useOCRAnalysis';

/**
 * アイテム登録処理を管理するカスタムフック
 * 
 * 責任: 選択アイテムの登録、成功/失敗の集計、エラーハンドリング
 * 
 * @param onUploadComplete - 登録完了時のコールバック
 * @returns {Object} 登録関連の状態と関数
 */
export const useItemRegistration = (onUploadComplete: () => void) => {
  const [isRegistering, setIsRegistering] = useState(false);

  // アイテム登録処理
  const registerItems = useCallback(async (items: OCRItem[]) => {
    if (items.length === 0) {
      alert('登録するアイテムを選択してください');
      return;
    }

    setIsRegistering(true);

    try {
      // 個別登録APIを呼び出す
      let successCount = 0;
      const errors: string[] = [];

      for (const item of items) {
        try {
          const response = await authenticatedFetch('/api/inventory/add', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item),
          });

          if (response.ok) {
            successCount++;
          } else {
            const errorData = await response.json();
            errors.push(`${item.item_name}: ${errorData.detail || '登録失敗'}`);
          }
        } catch (error) {
          errors.push(`${item.item_name}: ${error instanceof Error ? error.message : '登録失敗'}`);
        }
      }

      if (successCount > 0) {
        alert(`${successCount}件のアイテムを登録しました${errors.length > 0 ? `\nエラー: ${errors.length}件` : ''}`);
        onUploadComplete();
      } else {
        alert(`登録に失敗しました: ${errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      alert('登録に失敗しました');
    } finally {
      setIsRegistering(false);
    }
  }, [onUploadComplete]);

  return {
    isRegistering,
    registerItems,
  };
};

