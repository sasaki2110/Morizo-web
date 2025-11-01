'use client';

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth';

interface HistoryRecipe {
  category: string | null;
  title: string;
  source: string;
  url?: string;
  history_id: string;
  duplicate_warning?: string;
}

interface HistoryEntry {
  date: string;
  recipes: HistoryRecipe[];
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [days, setDays] = useState(14);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, days, categoryFilter]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const url = `/api/menu/history?days=${days}${categoryFilter ? `&category=${categoryFilter}` : ''}`;
      const response = await authenticatedFetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setHistory(result.data);
      }
    } catch (error) {
      console.error('History load failed:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]})`;
  };

  const getCategoryIcon = (category: string | null) => {
    if (category === 'main') return '🍖';
    if (category === 'sub') return '🥗';
    if (category === 'soup') return '🍲';
    return '🍽️';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            📅 献立履歴
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
              期間: {days}日間
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setDays(7)}
                className={`px-3 py-1 rounded text-sm ${
                  days === 7
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                7日
              </button>
              <button
                onClick={() => setDays(14)}
                className={`px-3 py-1 rounded text-sm ${
                  days === 14
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                14日
              </button>
              <button
                onClick={() => setDays(30)}
                className={`px-3 py-1 rounded text-sm ${
                  days === 30
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                30日
              </button>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
              カテゴリ
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">全て</option>
              <option value="main">主菜</option>
              <option value="sub">副菜</option>
              <option value="soup">汁物</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">読み込み中...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            履歴がありません
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">
                  📆 {formatDate(entry.date)}
                </h3>
                <div className="space-y-2">
                  {entry.recipes.map((recipe, recipeIndex) => (
                    <div
                      key={recipeIndex}
                      className={`p-3 rounded-lg ${
                        recipe.duplicate_warning
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                          : 'bg-gray-50 dark:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start">
                        <span className="text-xl mr-2">
                          {getCategoryIcon(recipe.category)}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800 dark:text-white">
                            {recipe.title.replace(/^(主菜|副菜|汁物):\s*/, '')}
                          </p>
                          {recipe.duplicate_warning && (
                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                              ⚠️ 重複警告（{recipe.duplicate_warning}）
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;

