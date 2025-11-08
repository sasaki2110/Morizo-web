'use client';

import React from 'react';

interface OCRAnalysisButtonProps {
  onAnalyze: () => void;
  disabled: boolean;
  isAnalyzing: boolean;
}

/**
 * OCR解析ボタンコンポーネント
 * 
 * 責任: OCR解析の実行ボタンと進捗表示を提供
 * 
 * @param onAnalyze - OCR解析実行時のコールバック
 * @param disabled - ボタンの無効状態
 * @param isAnalyzing - 解析中の状態
 */
const OCRAnalysisButton: React.FC<OCRAnalysisButtonProps> = ({
  onAnalyze,
  disabled,
  isAnalyzing,
}) => {
  return (
    <>
      <div className="mb-4">
        <button
          onClick={onAnalyze}
          disabled={disabled}
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
  );
};

export default OCRAnalysisButton;

