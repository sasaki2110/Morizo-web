'use client';

import React from 'react';
import { useImagePicker } from '@/hooks/useImagePicker';
import { useOCRAnalysis, type OCRItem, type OCRResult } from '@/hooks/useOCRAnalysis';
import { useItemSelection } from '@/hooks/useItemSelection';
import { useItemRegistration } from '@/hooks/useItemRegistration';
import ImageSelector from './ocr/ImageSelector';

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
  const { file, previewUrl, fileInputRef, selectImage, clearImage } = useImagePicker();
  const {
    isAnalyzing,
    ocrResult,
    editableItems,
    setEditableItems,
    analyzeImage,
    handleItemEdit,
    clearOCRResult,
  } = useOCRAnalysis();
  const { selectedItems, toggleItem, selectAll, clearSelection } = useItemSelection(editableItems);
  const { isRegistering, registerItems } = useItemRegistration(onUploadComplete);

  const units = ['個', 'kg', 'g', 'L', 'ml', '本', 'パック', '袋'];
  const storageLocations = ['冷蔵庫', '冷凍庫', '常温倉庫', '野菜室', 'その他'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectImage(e);
    // 画像選択時にOCR結果をクリア
    clearOCRResult();
    clearSelection();
  };

  const handleAnalyze = async () => {
    if (!file) return;
    await analyzeImage(file);
  };

  // OCR解析成功後、すべてのアイテムを選択状態にする
  React.useEffect(() => {
    if (ocrResult?.items && ocrResult.items.length > 0 && editableItems.length > 0) {
      selectAll();
    }
  }, [ocrResult, editableItems, selectAll]);

  const handleRegister = async () => {
    if (selectedItems.size === 0) {
      alert('登録するアイテムを選択してください');
      return;
    }

    // 選択されたアイテムのみを登録
    const itemsToRegister = Array.from(selectedItems).map(idx => editableItems[idx]);
    await registerItems(itemsToRegister);
  };

  const handleClose = () => {
    clearImage();
    clearOCRResult();
    clearSelection();
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
                            checked={selectedItems.size === editableItems.length && editableItems.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                selectAll();
                              } else {
                                clearSelection();
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
                              onChange={() => toggleItem(index)}
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

