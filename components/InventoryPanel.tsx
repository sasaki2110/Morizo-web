'use client';

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth';
import InventoryEditModal from '@/components/InventoryEditModal';
import InventoryCSVUploadModal from '@/components/InventoryCSVUploadModal';
import InventoryOCRModal from '@/components/InventoryOCRModal';

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

interface InventoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const InventoryPanel: React.FC<InventoryPanelProps> = ({ isOpen, onClose }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storageLocationFilter, setStorageLocationFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCSVUploadModalOpen, setIsCSVUploadModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInventory();
    }
  }, [isOpen, sortBy, sortOrder]);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const url = `/api/inventory/list?sort_by=${sortBy}&sort_order=${sortOrder}`;
      const response = await authenticatedFetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setInventory(result.data);
      }
    } catch (error) {
      console.error('Inventory load failed:', error);
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  // フィルター適用
  const filteredInventory = inventory.filter(item => {
    const matchesStorage = !storageLocationFilter || item.storage_location === storageLocationFilter;
    const matchesSearch = !searchQuery || 
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStorage && matchesSearch;
  });

  // 保管場所の一意リストを取得
  const storageLocations = Array.from(new Set(
    inventory.map(item => item.storage_location).filter(Boolean) as string[]
  ));

  const handleAddNew = () => {
    setEditingItem(null);
    setIsEditModalOpen(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (itemId: string, itemName: string) => {
    if (!confirm(`「${itemName}」を削除しますか？`)) {
      return;
    }
    
    setIsDeleting(itemId);
    try {
      const response = await authenticatedFetch(`/api/inventory/delete/${itemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        await loadInventory(); // 一覧を再読み込み
      }
    } catch (error) {
      console.error('Inventory delete failed:', error);
      alert('削除に失敗しました');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  const handleEditModalSave = async () => {
    await loadInventory(); // 一覧を再読み込み
    handleEditModalClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            📦 在庫管理
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        {/* フィルター */}
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
              保管場所
            </label>
            <select
              value={storageLocationFilter}
              onChange={(e) => setStorageLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">全て</option>
              {storageLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
              検索
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="アイテム名で検索..."
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                並び順
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="created_at">登録日</option>
                <option value="item_name">アイテム名</option>
                <option value="quantity">数量</option>
                <option value="storage_location">保管場所</option>
                <option value="expiry_date">消費期限</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                順序
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="desc">降順</option>
                <option value="asc">昇順</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">読み込み中...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {inventory.length === 0 ? '在庫がありません' : '該当する在庫がありません'}
          </div>
        ) : (
          <div className="space-y-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">アイテム名</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400">数量</th>
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">単位</th>
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">場所</th>
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">登録日</th>
                  <th className="text-center py-2 text-gray-600 dark:text-gray-400">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-2 text-gray-800 dark:text-white">{item.item_name}</td>
                    <td className="py-2 text-right text-gray-800 dark:text-white">{item.quantity}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">{item.unit}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">{item.storage_location || '-'}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">{formatDate(item.created_at)}</td>
                    <td className="py-2">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.item_name)}
                          disabled={isDeleting === item.id}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs disabled:opacity-50"
                        >
                          {isDeleting === item.id ? '削除中...' : '削除'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* 新規追加ボタン */}
        <div className="mt-4 space-y-2">
          <button
            onClick={handleAddNew}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + 新規追加
          </button>
          <button
            onClick={() => setIsCSVUploadModalOpen(true)}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            📄 CSVアップロード
          </button>
          <button
            onClick={() => setIsOCRModalOpen(true)}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            📷 レシートOCR
          </button>
        </div>
      </div>
      
      {/* 編集モーダル */}
      {isEditModalOpen && (
        <InventoryEditModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          item={editingItem}
          onSave={handleEditModalSave}
        />
      )}
      
      {/* CSVアップロードモーダル */}
      {isCSVUploadModalOpen && (
        <InventoryCSVUploadModal
          isOpen={isCSVUploadModalOpen}
          onClose={() => setIsCSVUploadModalOpen(false)}
          onUploadComplete={loadInventory}
        />
      )}
      
      {/* レシートOCRモーダル */}
      {isOCRModalOpen && (
        <InventoryOCRModal
          isOpen={isOCRModalOpen}
          onClose={() => setIsOCRModalOpen(false)}
          onUploadComplete={loadInventory}
        />
      )}
    </div>
  );
};

export default InventoryPanel;

