'use client';

import { useState, useCallback, useEffect } from 'react';

/**
 * アイテム選択管理を管理するカスタムフック
 * 
 * 責任: 個別選択/解除、全選択/全解除、選択状態の管理
 * 
 * @param items - 選択対象のアイテム配列
 * @returns {Object} 選択関連の状態と関数
 */
export const useItemSelection = <T,>(items: T[]) => {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // 個別アイテムの選択/解除
  const toggleItem = useCallback((index: number) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      return newSelected;
    });
  }, []);

  // 全選択
  const selectAll = useCallback(() => {
    setSelectedItems(new Set(items.map((_, idx) => idx)));
  }, [items]);

  // 全解除
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // アイテム数が変更された場合、選択状態をリセット
  useEffect(() => {
    // アイテム数が減った場合、存在しないインデックスを削除
    setSelectedItems(prev => {
      const newSelected = new Set<number>();
      prev.forEach(idx => {
        if (idx >= 0 && idx < items.length) {
          newSelected.add(idx);
        }
      });
      return newSelected;
    });
  }, [items.length]);

  return {
    selectedItems,
    toggleItem,
    selectAll,
    clearSelection,
  };
};

