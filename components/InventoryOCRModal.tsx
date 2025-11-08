'use client';

import React, { useState, useRef } from 'react';
import { authenticatedFetch } from '@/lib/auth';
import ImageSelector from './ocr/ImageSelector';

interface OCRItem {
  item_name: string;
  quantity: number;
  unit: string;
  storage_location: string | null;
  expiry_date: string | null;
}

interface OCRResult {
  success: boolean;
  items: OCRItem[];
  registered_count: number;
  errors: string[];
}

interface InventoryOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

const InventoryOCRModal: React.FC<InventoryOCRModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [editableItems, setEditableItems] = useState<OCRItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isRegistering, setIsRegistering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const units = ['個', 'kg', 'g', 'L', 'ml', '本', 'パック', '袋'];
  const storageLocations = ['冷蔵庫', '冷凍庫', '常温倉庫', '野菜室', 'その他'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // ファイル形式チェック
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(selectedFile.type)) {
        alert('JPEGまたはPNGファイルのみアップロード可能です');
        return;
      }
      
      // ファイルサイズチェック（10MB）
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('ファイルサイズは10MB以下にしてください');
        return;
      }
      
      setFile(selectedFile);
      
      // プレビューURL作成
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      setOcrResult(null);
      setEditableItems([]);
      setSelectedItems(new Set());
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      alert('画像ファイルを選択してください');
      return;
    }

    setIsAnalyzing(true);
    setOcrResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await authenticatedFetch('/api/inventory/ocr-receipt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result: OCRResult = await response.json();
      setOcrResult(result);
      
      // 編集可能なアイテムリストを作成
      if (result.items && result.items.length > 0) {
        setEditableItems([...result.items]);
        // すべてのアイテムを選択状態にする
        setSelectedItems(new Set(result.items.map((_, idx) => idx)));
      }
    } catch (error) {
      console.error('OCR analysis failed:', error);
      alert(error instanceof Error ? error.message : 'OCR解析に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleItemEdit = (index: number, field: keyof OCRItem, value: string | number | null) => {
    const updated = [...editableItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditableItems(updated);
  };

  const handleItemToggle = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleRegister = async () => {
    if (selectedItems.size === 0) {
      alert('登録するアイテムを選択してください');
      return;
    }

    setIsRegistering(true);

    try {
      // 選択されたアイテムのみを登録
      const itemsToRegister = Array.from(selectedItems).map(idx => editableItems[idx]);
      
      // 個別登録APIを呼び出す
      let successCount = 0;
      const errors: string[] = [];

      for (const item of itemsToRegister) {
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
  };

  const handleClose = () => {
    setFile(null);
    setPreviewUrl(null);
    setOcrResult(null);
    setEditableItems([]);
    setSelectedItems(new Set());
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              レシートOCR
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* ステップ1: 画像選択 */}
          {!ocrResult && (
            <>
              <ImageSelector
                file={file}
                onSelect={handleFileSelect}
                disabled={isAnalyzing}
                fileInputRef={fileInputRef}
              />

              {/* 画像プレビュー */}
              {previewUrl && (
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
              )}

              {/* OCR解析ボタン */}
              <div className="mb-4">
                <button
                  onClick={handleAnalyze}
                  disabled={!file || isAnalyzing}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? '解析中...' : 'OCR解析を実行'}
                </button>
              </div>

              {/* 進捗表示 */}
              {isAnalyzing && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                    OCR解析中... しばらくお待ちください
                  </p>
                </div>
              )}
            </>
          )}

          {/* ステップ2: 解析結果の確認・編集 */}
          {ocrResult && editableItems.length > 0 && (
            <>
              <div className={`p-4 rounded-lg mb-4 ${ocrResult.success ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}>
                <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                  {ocrResult.success ? '✅ OCR解析完了' : '❌ OCR解析失敗'}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  抽出されたアイテム: {editableItems.length}件
                </p>
                {ocrResult.errors && ocrResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-red-600 dark:text-red-400">エラー:</p>
                    <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                      {ocrResult.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* アイテム一覧（編集可能） */}
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
                            checked={selectedItems.size === editableItems.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems(new Set(editableItems.map((_, idx) => idx)));
                              } else {
                                setSelectedItems(new Set());
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
                      {editableItems.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="py-2">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(index)}
                              onChange={() => handleItemToggle(index)}
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="text"
                              value={item.item_name}
                              onChange={(e) => handleItemEdit(index, 'item_name', e.target.value)}
                              className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemEdit(index, 'quantity', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white text-right"
                            />
                          </td>
                          <td className="py-2">
                            <select
                              value={item.unit}
                              onChange={(e) => handleItemEdit(index, 'unit', e.target.value)}
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
                              onChange={(e) => handleItemEdit(index, 'storage_location', e.target.value)}
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
                              onChange={(e) => handleItemEdit(index, 'expiry_date', e.target.value || null)}
                              className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 登録ボタン */}
              <div className="mb-4">
                <button
                  onClick={handleRegister}
                  disabled={selectedItems.size === 0 || isRegistering}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegistering
                    ? `登録中... (${selectedItems.size}件)`
                    : `選択したアイテムを登録 (${selectedItems.size}件)`
                  }
                </button>
              </div>
            </>
          )}

          {/* 閉じるボタン */}
          <div className="mt-6">
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryOCRModal;

