'use client';

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth';

interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  storage_location: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

interface InventoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null; // nullの場合は新規作成
  onSave: () => void;
}

const InventoryEditModal: React.FC<InventoryEditModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
}) => {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState('個');
  const [storageLocation, setStorageLocation] = useState('冷蔵庫');
  const [expiryDate, setExpiryDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      // 編集モード
      setItemName(item.item_name);
      setQuantity(item.quantity);
      setUnit(item.unit);
      setStorageLocation(item.storage_location || '冷蔵庫');
      setExpiryDate(item.expiry_date ? item.expiry_date.split('T')[0] : '');
    } else {
      // 新規作成モード
      setItemName('');
      setQuantity(0);
      setUnit('個');
      setStorageLocation('冷蔵庫');
      setExpiryDate('');
    }
  }, [item, isOpen]);

  const handleSave = async () => {
    if (!itemName.trim()) {
      alert('アイテム名を入力してください');
      return;
    }
    
    if (quantity <= 0) {
      alert('数量は0より大きい値が必要です');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        item_name: itemName.trim(),
        quantity: quantity,
        unit: unit,
        storage_location: storageLocation || null,
        expiry_date: expiryDate || null,
      };

      let response;
      if (item) {
        // 更新
        response = await authenticatedFetch(`/api/inventory/update/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        // 新規作成
        response = await authenticatedFetch('/api/inventory/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        onSave();
      } else {
        throw new Error(result.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('Inventory save failed:', error);
      alert(error instanceof Error ? error.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const units = ['個', 'kg', 'g', 'L', 'ml', '本', 'パック', '袋'];
  const storageLocations = ['冷蔵庫', '冷凍庫', '常温倉庫', '野菜室', 'その他'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              {item ? '在庫編集' : '新規追加'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* アイテム名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                アイテム名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="例: りんご"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {/* 数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                数量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {/* 単位 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                単位 <span className="text-red-500">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              >
                {units.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* 保管場所 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                保管場所
              </label>
              <select
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              >
                {storageLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* 賞味期限 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                賞味期限
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryEditModal;

