'use client';

import React from 'react';
import { useImagePicker } from '@/hooks/useImagePicker';
import { useOCRAnalysis } from '@/hooks/useOCRAnalysis';
import { useItemSelection } from '@/hooks/useItemSelection';
import { useItemRegistration } from '@/hooks/useItemRegistration';
import { UNITS, STORAGE_LOCATIONS } from '@/lib/utils/ocr-constants';
import ImageSelector from './ocr/ImageSelector';
import ImagePreview from './ocr/ImagePreview';
import OCRAnalysisButton from './ocr/OCRAnalysisButton';
import OCRResultSummary from './ocr/OCRResultSummary';
import EditableItemList from './ocr/EditableItemList';
import RegistrationButton from './ocr/RegistrationButton';

interface InventoryOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

/**
 * レシートOCRモーダルコンポーネント
 * 
 * 責任: レシート画像のOCR解析と在庫アイテムの登録を統合的に管理
 * 
 * このコンポーネントは以下のフックとコンポーネントを使用して実装されています：
 * - useImagePicker: 画像選択とバリデーション
 * - useOCRAnalysis: OCR解析処理
 * - useItemSelection: アイテム選択管理
 * - useItemRegistration: アイテム登録処理
 * - ocr/*: UIコンポーネント群
 */

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
    analyzeImage,
    handleItemEdit,
    clearOCRResult,
  } = useOCRAnalysis();
  const { selectedItems, toggleItem, selectAll, clearSelection } = useItemSelection(editableItems);
  const { isRegistering, registerItems } = useItemRegistration(onUploadComplete);

  // 画像選択時のハンドラー
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectImage(e);
    // 画像選択時にOCR結果と選択状態をクリア
    clearOCRResult();
    clearSelection();
  };

  // OCR解析実行ハンドラー
  const handleAnalyze = async () => {
    if (!file) return;
    await analyzeImage(file);
  };

  // OCR解析成功後、すべてのアイテムを自動選択
  React.useEffect(() => {
    if (ocrResult?.items && ocrResult.items.length > 0 && editableItems.length > 0) {
      selectAll();
    }
  }, [ocrResult, editableItems, selectAll]);

  // アイテム登録ハンドラー
  const handleRegister = async () => {
    // 選択されたアイテムのみを登録（バリデーションはuseItemRegistration内で実施）
    const itemsToRegister = Array.from(selectedItems).map(idx => editableItems[idx]);
    await registerItems(itemsToRegister);
  };

  // モーダル閉じるハンドラー
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

              {previewUrl && <ImagePreview previewUrl={previewUrl} />}

              <OCRAnalysisButton
                onAnalyze={handleAnalyze}
                disabled={!file || isAnalyzing}
                isAnalyzing={isAnalyzing}
              />
            </>
          )}

          {/* ステップ2: 解析結果の確認・編集 */}
          {ocrResult && editableItems.length > 0 && (
            <>
              <OCRResultSummary
                ocrResult={ocrResult}
                itemCount={editableItems.length}
              />

              <EditableItemList
                items={editableItems}
                onItemEdit={handleItemEdit}
                selectedItems={selectedItems}
                onToggleItem={toggleItem}
                onSelectAll={selectAll}
                onClearSelection={clearSelection}
                units={UNITS}
                storageLocations={STORAGE_LOCATIONS}
              />

              <RegistrationButton
                selectedCount={selectedItems.size}
                onRegister={handleRegister}
                disabled={selectedItems.size === 0 || isRegistering}
                isRegistering={isRegistering}
              />
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

