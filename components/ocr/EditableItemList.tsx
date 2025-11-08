'use client';

import React from 'react';
import type { OCRItem } from '@/hooks/useOCRAnalysis';

interface EditableItemListProps {
  items: OCRItem[];
  onItemEdit: (index: number, field: keyof OCRItem, value: string | number | null) => void;
  selectedItems: Set<number>;
  onToggleItem: (index: number) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  units: string[];
  storageLocations: string[];
}

/**
 * 編集可能なアイテムリストコンポーネント
 * 
 * 責任: OCR解析結果のアイテム一覧を編集可能なテーブル形式で表示し、選択機能を提供
 * 
 * @param items - 編集可能なアイテムリスト
 * @param onItemEdit - アイテム編集時のコールバック
 * @param selectedItems - 選択されたアイテムのインデックスセット
 * @param onToggleItem - アイテム選択/解除時のコールバック
 * @param onSelectAll - 全選択時のコールバック
 * @param onClearSelection - 全解除時のコールバック
 * @param units - 単位の配列
 * @param storageLocations - 保管場所の配列
 */
const EditableItemList: React.FC<EditableItemListProps> = ({
  items,
  onItemEdit,
  selectedItems,
  onToggleItem,
  onSelectAll,
  onClearSelection,
  units,
  storageLocations,
}) => {
  const allSelected = selectedItems.size === items.length && items.length > 0;

  return (
    <div className="mb-4">
      <h4 className="font-bold text-gray-800 dark:text-white mb-2">
        抽出されたアイテム（編集・選択可能）
      </h4>
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 text-gray-600 dark:text-gray-400 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectAll();
                    } else {
                      onClearSelection();
                    }
                  }}
                />
              </th>
              <th className="text-left py-2 text-gray-600 dark:text-gray-400">アイテム名</th>
              <th className="text-right py-2 text-gray-600 dark:text-gray-400">数量</th>
              <th className="text-left py-2 text-gray-600 dark:text-gray-400">単位</th>
              <th className="text-left py-2 text-gray-600 dark:text-gray-400">保管場所</th>
              <th className="text-left py-2 text-gray-600 dark:text-gray-400">消費期限</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(index)}
                    onChange={() => onToggleItem(index)}
                  />
                </td>
                <td className="py-2">
                  <input
                    type="text"
                    value={item.item_name}
                    onChange={(e) => onItemEdit(index, 'item_name', e.target.value)}
                    className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onItemEdit(index, 'quantity', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white text-right"
                  />
                </td>
                <td className="py-2">
                  <select
                    value={item.unit}
                    onChange={(e) => onItemEdit(index, 'unit', e.target.value)}
                    className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white"
                  >
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2">
                  <select
                    value={item.storage_location || '冷蔵庫'}
                    onChange={(e) => onItemEdit(index, 'storage_location', e.target.value)}
                    className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white"
                  >
                    {storageLocations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2">
                  <input
                    type="date"
                    value={item.expiry_date || ''}
                    onChange={(e) => onItemEdit(index, 'expiry_date', e.target.value || null)}
                    className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EditableItemList;

