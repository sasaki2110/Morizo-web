'use client';

import React, { useState, useRef } from 'react';
import { authenticatedFetch } from '@/lib/auth';

interface CSVUploadResult {
  success: boolean;
  total: number;
  success_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    item_name?: string;
    error: string;
  }>;
}

interface InventoryCSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

const InventoryCSVUploadModal: React.FC<InventoryCSVUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<CSVUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        alert('CSVファイルのみアップロード可能です');
        return;
      }
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('ファイルを選択してください');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('📤 [CSV Upload] Sending request to /api/inventory/upload-csv');
      const response = await authenticatedFetch('/api/inventory/upload-csv', {
        method: 'POST',
        body: formData,
      });

      console.log('📥 [CSV Upload] Response status:', response.status, response.statusText);
      console.log('📥 [CSV Upload] Response headers:', Object.fromEntries(response.headers.entries()));

      // レスポンス本文をテキストとして取得（デバッグ用）
      const responseText = await response.text();
      console.log('📥 [CSV Upload] Response body (raw):', responseText.substring(0, 500));

      if (!response.ok) {
        // エラーレスポンスの処理
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || errorMessage;
          console.error('❌ [CSV Upload] Error data:', errorData);
        } catch (parseError) {
          // JSONパースに失敗した場合、レスポンステキストをそのまま使用
          console.error('❌ [CSV Upload] Failed to parse error response as JSON:', parseError);
          console.error('❌ [CSV Upload] Response text:', responseText);
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // 成功レスポンスの処理
      let result: CSVUploadResult;
      try {
        result = JSON.parse(responseText);
        console.log('✅ [CSV Upload] Parsed result:', result);
      } catch (parseError) {
        console.error('❌ [CSV Upload] Failed to parse response as JSON:', parseError);
        console.error('❌ [CSV Upload] Response text:', responseText);
        throw new Error(`サーバーからの応答が不正です: ${responseText.substring(0, 100)}`);
      }

      setUploadResult(result);

      if (result.success && result.error_count === 0) {
        // 成功した場合、在庫一覧を再読み込み
        onUploadComplete();
      }
    } catch (error) {
      console.error('❌ [CSV Upload] Upload failed:', error);
      console.error('❌ [CSV Upload] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      alert(error instanceof Error ? error.message : 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              CSVアップロード
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* CSVフォーマット説明 */}
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <strong>CSVフォーマット:</strong>
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              item_name,quantity,unit,storage_location,expiry_date
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              例: りんご,5,個,冷蔵庫,2024-02-15
            </p>
          </div>

          {/* ファイル選択 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CSVファイルを選択
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              disabled={isUploading}
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                選択中のファイル: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* アップロードボタン */}
          <div className="mb-4">
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'アップロード中...' : 'アップロード'}
            </button>
          </div>

          {/* 進捗表示 */}
          {isUploading && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                アップロード中...
              </p>
            </div>
          )}

          {/* 結果表示 */}
          {uploadResult && (
            <div className="mt-4">
              <div className={`p-4 rounded-lg ${uploadResult.success && uploadResult.error_count === 0 ? 'bg-green-50 dark:bg-green-900' : 'bg-yellow-50 dark:bg-yellow-900'}`}>
                <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                  {uploadResult.success && uploadResult.error_count === 0 ? '✅ アップロード成功' : '⚠️ 部分成功'}
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <p>総件数: {uploadResult.total}</p>
                  <p>成功件数: {uploadResult.success_count}</p>
                  {uploadResult.error_count > 0 && (
                    <p className="text-red-600 dark:text-red-400">エラー件数: {uploadResult.error_count}</p>
                  )}
                </div>
              </div>

              {/* エラー詳細 */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-2">エラー詳細:</h4>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2 text-gray-600 dark:text-gray-400">行</th>
                          <th className="text-left py-2 text-gray-600 dark:text-gray-400">アイテム名</th>
                          <th className="text-left py-2 text-gray-600 dark:text-gray-400">エラー</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResult.errors.map((error, index) => (
                          <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-2 text-gray-800 dark:text-white">{error.row}</td>
                            <td className="py-2 text-gray-600 dark:text-gray-400">{error.item_name || '-'}</td>
                            <td className="py-2 text-red-600 dark:text-red-400">{error.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
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

export default InventoryCSVUploadModal;

