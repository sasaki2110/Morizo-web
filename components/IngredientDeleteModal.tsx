'use client';

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth';

interface IngredientDeleteCandidate {
  inventory_id: string;
  item_name: string;
  current_quantity: number;
  unit: string;
}

interface IngredientDeleteModalProps {
  date: string; // YYYY-MM-DD形式
  isOpen: boolean;
  onClose: () => void;
  onDeleteComplete: () => void;
}

const IngredientDeleteModal: React.FC<IngredientDeleteModalProps> = ({
  date,
  isOpen,
  onClose,
  onDeleteComplete,
}) => {
  const [candidates, setCandidates] = useState<IngredientDeleteCandidate[]>([]);
  const [checkedItems, setCheckedItems] = useState<Map<string, boolean>>(new Map());
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルが開いたときに候補を取得
  useEffect(() => {
    if (isOpen && date) {
      loadCandidates();
    } else {
      // モーダルが閉じられたときに状態をリセット
      setCandidates([]);
      setCheckedItems(new Map());
      setQuantities(new Map());
      setError(null);
    }
  }, [isOpen, date]);

  const loadCandidates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch(
        `/api/recipe/ingredients/delete-candidates/${date}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setCandidates(result.candidates || []);
        // 初期状態: すべてチェック、変更後数量 = 変更前数量 - 1（最小0）
        const initialChecked = new Map<string, boolean>();
        const initialQuantities = new Map<string, number>();
        result.candidates?.forEach((candidate: IngredientDeleteCandidate) => {
          initialChecked.set(candidate.inventory_id, true);
          // 変更前数量 - 1、最小0
          const newQuantity = Math.max(0, candidate.current_quantity - 1);
          initialQuantities.set(candidate.inventory_id, newQuantity);
        });
        setCheckedItems(initialChecked);
        setQuantities(initialQuantities);
      } else {
        throw new Error('削除候補の取得に失敗しました');
      }
    } catch (err) {
      console.error('Failed to load candidates:', err);
      setError(err instanceof Error ? err.message : '削除候補の取得に失敗しました');
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckChange = (inventoryId: string, checked: boolean) => {
    const newChecked = new Map(checkedItems);
    newChecked.set(inventoryId, checked);
    setCheckedItems(newChecked);
  };

  const handleQuantityChange = (inventoryId: string, quantity: number) => {
    const newQuantities = new Map(quantities);
    newQuantities.set(inventoryId, quantity);
    setQuantities(newQuantities);
  };

  const handleDelete = async () => {
    // チェックされているアイテムを抽出して送信
    const itemsToDelete: Array<{
      item_name: string;
      quantity: number;
      inventory_id?: string;
    }> = [];

    candidates.forEach((candidate) => {
      const isChecked = checkedItems.get(candidate.inventory_id);
      if (!isChecked) {
        return; // チェックされていない場合はスキップ
      }

      const newQuantity = quantities.get(candidate.inventory_id) ?? 0;
      itemsToDelete.push({
        item_name: candidate.item_name,
        quantity: newQuantity,
        inventory_id: candidate.inventory_id,
      });
    });

    if (itemsToDelete.length === 0) {
      alert('処理対象がありません');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/recipe/ingredients/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: date,
          ingredients: itemsToDelete,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        alert(
          `処理が完了しました。\n削除: ${result.deleted_count}件\n更新: ${result.updated_count}件`
        );
        onDeleteComplete();
        onClose();
      } else {
        throw new Error('食材削除に失敗しました');
      }
    } catch (err) {
      console.error('Failed to delete ingredients:', err);
      setError(err instanceof Error ? err.message : '食材削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            🗑️ 食材削除 - {date}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={isDeleting}
          >
            ✕
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">⚠️ {error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">読み込み中...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              削除候補がありません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-12">
                      処理
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      アイテム名
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      変更前数量
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      変更後数量
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => {
                    const isChecked = checkedItems.get(candidate.inventory_id) ?? false;
                    const newQuantity = quantities.get(candidate.inventory_id) ?? 0;

                    return (
                      <tr
                        key={candidate.inventory_id}
                        className="border-b border-gray-200 dark:border-gray-700"
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              handleCheckChange(candidate.inventory_id, e.target.checked)
                            }
                            disabled={isDeleting}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-800 dark:text-white">
                          {candidate.item_name}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {candidate.current_quantity} {candidate.unit}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={isChecked ? newQuantity : ''}
                            onChange={(e) =>
                              handleQuantityChange(
                                candidate.inventory_id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            disabled={!isChecked || isDeleting}
                            min="0"
                            step="0.1"
                            className={`w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white ${
                              isChecked
                                ? ''
                                : 'bg-gray-100 dark:bg-gray-900 cursor-not-allowed'
                            }`}
                            placeholder={isChecked ? '数量を入力' : ''}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            disabled={isDeleting}
          >
            キャンセル
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || isLoading || candidates.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isDeleting ? '処理中...' : '削除実行'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientDeleteModal;

