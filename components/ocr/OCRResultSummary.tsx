'use client';

import React from 'react';
import type { OCRResult } from '@/hooks/useOCRAnalysis';

interface OCRResultSummaryProps {
  ocrResult: OCRResult;
  itemCount: number;
}

/**
 * OCR解析結果サマリー表示コンポーネント
 * 
 * 責任: OCR解析結果の成功/失敗状態とサマリー情報を表示
 * 
 * @param ocrResult - OCR解析結果
 * @param itemCount - 抽出されたアイテム数
 */
const OCRResultSummary: React.FC<OCRResultSummaryProps> = ({
  ocrResult,
  itemCount,
}) => {
  return (
    <div className={`p-4 rounded-lg mb-4 ${ocrResult.success ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}>
      <h3 className="font-bold text-gray-800 dark:text-white mb-2">
        {ocrResult.success ? '✅ OCR解析完了' : '❌ OCR解析失敗'}
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        抽出されたアイテム: {itemCount}件
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
  );
};

export default OCRResultSummary;

