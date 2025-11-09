'use client';

import { useState, useCallback } from 'react';
import { authenticatedFetch } from '@/lib/auth';

export interface OCRItem {
  item_name: string;
  quantity: number;
  unit: string;
  storage_location: string | null;
  expiry_date: string | null;
  original_name?: string; // OCRで読み取られた元の名前（変換テーブル登録用）
}

export interface OCRResult {
  success: boolean;
  items: OCRItem[];
  registered_count: number;
  errors: string[];
}

/**
 * OCR解析処理を管理するカスタムフック
 * 
 * 責任: OCR API呼び出し、結果処理、エラーハンドリング、編集可能アイテムの管理
 * 
 * @returns {Object} OCR解析関連の状態と関数
 */
export const useOCRAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [editableItems, setEditableItems] = useState<OCRItem[]>([]);

  // OCR解析実行
  const analyzeImage = useCallback(async (file: File) => {
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

      // Content-Typeを確認
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        // エラーレスポンスの処理
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          if (contentType.includes('application/json')) {
            // JSONレスポンスの場合
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.error || errorMessage;
          } else {
            // JSON以外のレスポンスの場合（HTML、テキストなど）
            const errorText = await response.text();
            // HTMLレスポンスの場合は、より分かりやすいメッセージを表示
            if (errorText.includes('html') || errorText.includes('<!DOCTYPE') || errorText.trim().length === 0) {
              errorMessage = 'レシート画像を読み込めませんでした。レシート以外の画像が選択されている可能性があります。';
            } else {
              errorMessage = errorText || errorMessage;
            }
          }
        } catch (parseError) {
          // レスポンスの読み取りに失敗した場合
          console.error('Failed to read error response:', parseError);
          errorMessage = 'レシート画像を読み込めませんでした。レシート以外の画像が選択されている可能性があります。';
        }
        
        throw new Error(errorMessage);
      }

      // 成功時のレスポンス処理
      let result: OCRResult;
      
      try {
        if (contentType.includes('application/json')) {
          // JSONレスポンスの場合
          result = await response.json();
        } else {
          // JSON以外のレスポンスが返ってきた場合
          const responseText = await response.text();
          console.error('Unexpected response type:', contentType, responseText.substring(0, 100));
          throw new Error('レシート画像を読み込めませんでした。レシート以外の画像が選択されている可能性があります。');
        }
      } catch (parseError) {
        // JSON解析に失敗した場合
        if (parseError instanceof Error && parseError.message.includes('レシート画像を読み込めませんでした')) {
          throw parseError;
        }
        console.error('Failed to parse JSON response:', parseError);
        throw new Error('レシート画像を読み込めませんでした。レシート以外の画像が選択されている可能性があります。');
      }

      setOcrResult(result);
      
      // 編集可能なアイテムリストを作成
      if (result.items && result.items.length > 0) {
        // 各アイテムにoriginal_nameを設定（OCRで読み取られた元の名前を保持）
        const itemsWithOriginalName = result.items.map(item => ({
          ...item,
          original_name: item.item_name, // 初期値をoriginal_nameとして保持
        }));
        setEditableItems(itemsWithOriginalName);
      } else {
        // アイテムが抽出されなかった場合
        alert('レシートからアイテムを抽出できませんでした。レシート画像が鮮明でないか、レシート以外の画像が選択されている可能性があります。');
      }
    } catch (error) {
      console.error('OCR analysis failed:', error);
      
      // エラーメッセージをユーザーフレンドリーに変換
      let errorMessage = 'OCR解析に失敗しました';
      
      if (error instanceof Error) {
        const message = error.message;
        
        // JSON解析エラーの場合
        if (message.includes('JSON') || message.includes('Expecting value')) {
          errorMessage = 'レシート画像を読み込めませんでした。レシート以外の画像が選択されている可能性があります。';
        } else if (message.includes('HTTP error')) {
          errorMessage = 'サーバーエラーが発生しました。しばらく時間をおいて再度お試しください。';
        } else {
          errorMessage = message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // 変換テーブル登録
  const registerOCRMapping = useCallback(async (originalName: string, normalizedName: string) => {
    try {
      const response = await authenticatedFetch('/api/inventory/ocr-mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_name: originalName,
          normalized_name: normalizedName,
        }),
      });

      if (!response.ok) {
        // エラーが発生しても既存機能に影響しないため、警告ログのみ
        const errorData = await response.json().catch(() => ({}));
        console.warn('OCR変換テーブル登録に失敗しました:', errorData.detail || 'Unknown error');
        return;
      }

      const result = await response.json();
      if (result.success) {
        console.log(`OCR変換テーブルに登録しました: '${originalName}' -> '${normalizedName}'`);
      }
    } catch (error) {
      // エラーが発生しても既存機能に影響しないため、警告ログのみ
      console.warn('OCR変換テーブル登録中にエラーが発生しました:', error);
    }
  }, []);

  // アイテム編集
  const handleItemEdit = useCallback((index: number, field: keyof OCRItem, value: string | number | null) => {
    const updated = [...editableItems];
    const previousItem = updated[index];
    updated[index] = { ...updated[index], [field]: value };
    setEditableItems(updated);

    // item_nameが変更された場合、変換テーブルに登録
    if (field === 'item_name' && typeof value === 'string') {
      const originalName = previousItem.original_name || previousItem.item_name;
      const normalizedName = value.trim();

      // 元の名前と異なり、かつ空でない場合のみ登録
      if (originalName && normalizedName && originalName !== normalizedName) {
        // 非同期で変換テーブルに登録（エラーが発生しても既存機能に影響しない）
        registerOCRMapping(originalName, normalizedName).catch((error) => {
          console.warn('OCR変換テーブル登録中にエラーが発生しました:', error);
        });
      }
    }
  }, [editableItems, registerOCRMapping]);

  // OCR結果と編集可能アイテムをクリア
  const clearOCRResult = useCallback(() => {
    setOcrResult(null);
    setEditableItems([]);
  }, []);

  return {
    isAnalyzing,
    ocrResult,
    editableItems,
    setEditableItems,
    analyzeImage,
    handleItemEdit,
    clearOCRResult,
  };
};

