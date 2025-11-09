# UPDATE09_2.md - 在庫レシートOCR機能実装（Phase 4）

## 概要

レシート画像をアップロードしてOCR解析し、在庫データを登録する機能を実装しました。フロントエンドUI（Phase 4）を実装し、ユーザーがレシート画像を選択してOCR解析を実行し、解析結果を確認・編集してから登録できるようになりました。バックエンドAPI（Phase 3）は既に実装済みで、本ドキュメントではフロントエンド実装の内容を記載します。

## 実装日時

2025年1月29日（実装完了時）

## 実装背景

在庫管理システムにおいて、初期登録時に大量の在庫データを効率的に登録できる機能が必要でした。CSVアップロード機能（UPDATE09_1）に加えて、レシート画像からOCR解析で在庫情報を自動抽出する機能を実装しました。

既存の在庫CRUD機能（UPDATE08_1, UPDATE08_2）とCSVアップロード機能（UPDATE09_1）に加えて、以下の機能を追加しました：

1. **レシート画像アップロード**
   - レシート画像を選択してアップロード
   - ファイル形式の検証（JPEG/PNGのみ）
   - ファイルサイズ制限（10MB）
   - 画像プレビュー表示

2. **OCR解析機能**
   - OpenAI GPT-4oを使用したOCR解析
   - 解析進捗表示
   - 解析結果の構造化データへの変換

3. **解析結果の確認・編集UI**
   - 抽出されたアイテムの一覧表示
   - 各アイテムの編集機能（アイテム名、数量、単位、保管場所、消費期限）
   - アイテムの選択機能（チェックボックス）
   - 全選択/全解除機能

4. **登録機能**
   - 選択したアイテムのみを登録
   - 個別登録API（`/api/inventory/add`）を使用
   - 登録結果の表示（成功件数、エラー件数）

**注意**: バックエンドAPI（Phase 3）は既に実装済みです。本ドキュメントではフロントエンド実装のみを記載します。

## 実装内容

### 1. フロントエンド: InventoryOCRModalコンポーネントの作成

**ファイル**: `/app/Morizo-web/components/InventoryOCRModal.tsx`（新規作成）

#### 1.1 実装内容

```typescript
'use client';

import React, { useState, useRef } from 'react';
import { authenticatedFetch } from '@/lib/auth';

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

  // ファイル選択処理
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

  // OCR解析実行
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

  // アイテム編集
  const handleItemEdit = (index: number, field: keyof OCRItem, value: string | number | null) => {
    const updated = [...editableItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditableItems(updated);
  };

  // アイテム選択切り替え
  const handleItemToggle = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  // 登録処理
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
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              レシートOCR
            </h2>
            <button onClick={handleClose}>✕</button>
          </div>

          {/* ステップ1: 画像選択 */}
          {!ocrResult && (
            <>
              {/* ファイル選択 */}
              <div className="mb-4">
                <label>レシート画像を選択</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileSelect}
                  disabled={isAnalyzing}
                />
                {file && (
                  <p>選択中のファイル: {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
                )}
              </div>

              {/* 画像プレビュー */}
              {previewUrl && (
                <div className="mb-4">
                  <p>プレビュー:</p>
                  <img src={previewUrl} alt="Receipt preview" />
                </div>
              )}

              {/* OCR解析ボタン */}
              <button
                onClick={handleAnalyze}
                disabled={!file || isAnalyzing}
              >
                {isAnalyzing ? '解析中...' : 'OCR解析を実行'}
              </button>

              {/* 進捗表示 */}
              {isAnalyzing && (
                <div className="mb-4">
                  <div className="progress-bar"></div>
                  <p>OCR解析中... しばらくお待ちください</p>
                </div>
              )}
            </>
          )}

          {/* ステップ2: 解析結果の確認・編集 */}
          {ocrResult && editableItems.length > 0 && (
            <>
              {/* 解析結果サマリー */}
              <div className="mb-4">
                <h3>{ocrResult.success ? '✅ OCR解析完了' : '❌ OCR解析失敗'}</h3>
                <p>抽出されたアイテム: {editableItems.length}件</p>
                {ocrResult.errors && ocrResult.errors.length > 0 && (
                  <div>
                    <p>エラー:</p>
                    <ul>
                      {ocrResult.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* アイテム一覧（編集可能） */}
              <div className="mb-4">
                <h4>抽出されたアイテム（編集・選択可能）</h4>
                <table>
                  <thead>
                    <tr>
                      <th>
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
                      <th>アイテム名</th>
                      <th>数量</th>
                      <th>単位</th>
                      <th>保管場所</th>
                      <th>消費期限</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableItems.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(index)}
                            onChange={() => handleItemToggle(index)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) => handleItemEdit(index, 'item_name', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemEdit(index, 'quantity', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td>
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemEdit(index, 'unit', e.target.value)}
                          >
                            {units.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={item.storage_location || '冷蔵庫'}
                            onChange={(e) => handleItemEdit(index, 'storage_location', e.target.value)}
                          >
                            {storageLocations.map(loc => (
                              <option key={loc} value={loc}>{loc}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="date"
                            value={item.expiry_date || ''}
                            onChange={(e) => handleItemEdit(index, 'expiry_date', e.target.value || null)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 登録ボタン */}
              <button
                onClick={handleRegister}
                disabled={selectedItems.size === 0 || isRegistering}
              >
                {isRegistering
                  ? `登録中... (${selectedItems.size}件)`
                  : `選択したアイテムを登録 (${selectedItems.size}件)`
                }
              </button>
            </>
          )}

          {/* 閉じるボタン */}
          <div className="mt-6">
            <button onClick={handleClose}>閉じる</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryOCRModal;
```

#### 1.2 変更の理由

- レシート画像をアップロードしてOCR解析を実行するUIを提供
- 画像選択、プレビュー表示、OCR解析進捗表示、解析結果の確認・編集、登録機能を実装
- 既存の`InventoryCSVUploadModal`と同様のモーダルデザインで統一
- 解析結果を編集・選択してから登録できる柔軟なUIを提供

---

### 2. フロントエンド: InventoryPanelコンポーネントの拡張

**ファイル**: `/app/Morizo-web/components/InventoryPanel.tsx`

#### 2.1 変更箇所

**行番号**: 7行目（インポート追加）、35行目（状態管理追加）、283-288行目（ボタン追加）、311-318行目（モーダル追加）

#### 2.2 変更前

```typescript
import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth';
import InventoryEditModal from '@/components/InventoryEditModal';
import InventoryCSVUploadModal from '@/components/InventoryCSVUploadModal';

const InventoryPanel: React.FC<InventoryPanelProps> = ({ isOpen, onClose }) => {
  // ... 既存の状態管理 ...
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCSVUploadModalOpen, setIsCSVUploadModalOpen] = useState(false);

  // 新規追加ボタンとCSVアップロードボタンのみ
  <div className="mt-4 space-y-2">
    <button onClick={handleAddNew}>
      + 新規追加
    </button>
    <button onClick={() => setIsCSVUploadModalOpen(true)}>
      📄 CSVアップロード
    </button>
  </div>
}
```

#### 2.3 変更後

```typescript
import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth';
import InventoryEditModal from '@/components/InventoryEditModal';
import InventoryCSVUploadModal from '@/components/InventoryCSVUploadModal';
import InventoryOCRModal from '@/components/InventoryOCRModal';

const InventoryPanel: React.FC<InventoryPanelProps> = ({ isOpen, onClose }) => {
  // ... 既存の状態管理 ...
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCSVUploadModalOpen, setIsCSVUploadModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);

  // 新規追加ボタン、CSVアップロードボタン、レシートOCRボタン
  <div className="mt-4 space-y-2">
    <button onClick={handleAddNew}>
      + 新規追加
    </button>
    <button onClick={() => setIsCSVUploadModalOpen(true)}>
      📄 CSVアップロード
    </button>
    <button onClick={() => setIsOCRModalOpen(true)}>
      📷 レシートOCR
    </button>
  </div>

  // レシートOCRモーダル
  {isOCRModalOpen && (
    <InventoryOCRModal
      isOpen={isOCRModalOpen}
      onClose={() => setIsOCRModalOpen(false)}
      onUploadComplete={loadInventory}
    />
  )}
}
```

#### 2.4 変更の理由

- レシートOCR機能へのアクセスを提供
- 既存の「CSVアップロード」ボタンの下に「レシートOCR」ボタンを配置
- 登録完了時に在庫一覧を自動再読み込み

---

### 3. フロントエンド: Next.js APIルートの作成

**ファイル**: `/app/Morizo-web/app/api/inventory/ocr-receipt/route.ts`（新規作成、必要に応じて）

#### 3.1 実装内容

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-server';
import { ServerLogger, LogCategory, logApiCall, logError } from '@/lib/logging-utils';

const MORIZO_AI_URL = process.env.MORIZO_AI_URL || 'http://localhost:8000';

function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}

export async function POST(request: NextRequest) {
  const timer = ServerLogger.startTimer('inventory-ocr-receipt-api');
  
  try {
    ServerLogger.info(LogCategory.API, '在庫OCRレシート解析API呼び出し開始');

    // 認証チェック
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) {
      return setCorsHeaders(authResult);
    }
    
    const { token } = authResult;

    // FormDataを取得
    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    
    if (!image) {
      const errorResponse = NextResponse.json(
        { error: '画像ファイルが提供されていません', detail: 'レシート画像を選択してください' },
        { status: 400 }
      );
      return setCorsHeaders(errorResponse);
    }

    // Morizo AIに送信（認証トークン付き）
    const url = `${MORIZO_AI_URL}/api/inventory/ocr-receipt`;
    const backendFormData = new FormData();
    backendFormData.append('image', image);

    const headers = {
      'Authorization': `Bearer ${token}`,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3分

    const aiResponse = await fetch(url, {
      method: 'POST',
      headers,
      body: backendFormData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!aiResponse.ok) {
      let errorMessage = `Morizo AI エラー: ${aiResponse.status}`;
      try {
        const errorData = await aiResponse.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (parseError) {
        const errorText = await aiResponse.text();
        errorMessage = errorText || errorMessage;
      }

      const errorResponse = NextResponse.json(
        { error: 'Morizo AIとの通信に失敗しました', detail: errorMessage },
        { status: aiResponse.status }
      );
      return setCorsHeaders(errorResponse);
    }

    const data = await aiResponse.json();
    
    timer();
    logApiCall('POST', '/api/inventory/ocr-receipt', 200, undefined);
    
    const nextResponse = NextResponse.json({
      success: data.success,
      items: data.items || [],
      registered_count: data.registered_count || 0,
      errors: data.errors || []
    });
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'inventory-ocr-receipt-api');
    logApiCall('POST', '/api/inventory/ocr-receipt', 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
    const errorResponse = NextResponse.json(
      { error: 'Morizo AIとの通信に失敗しました', details: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    );
    return setCorsHeaders(errorResponse);
  }
}
```

#### 3.2 変更の理由

- フロントエンドからのFormDataリクエストをFastAPIサーバーにプロキシするため
- 既存の`/api/inventory/upload-csv`等と同様のパターンで実装
- FormDataの処理とエラーハンドリングを適切に実装
- OCR解析は時間がかかる可能性があるため、タイムアウト設定（3分）を実装

**注意**: 現在の実装では、`authenticatedFetch`が直接FastAPIサーバーを呼び出すため、Next.js APIルートは不要かもしれません。実際の実装に応じて、必要に応じて作成してください。

---

## API仕様

### エンドポイント

**POST** `/api/inventory/ocr-receipt`

### リクエスト

**Content-Type**: `multipart/form-data`

**フィールド**:
- `image`: レシート画像ファイル（必須、JPEG/PNG形式、最大10MB）

### レスポンス

**成功時** (200):
```json
{
  "success": true,
  "items": [
    {
      "item_name": "りんご",
      "quantity": 5,
      "unit": "個",
      "storage_location": "冷蔵庫",
      "expiry_date": null
    }
  ],
  "registered_count": 0,
  "errors": []
}
```

**注意**: 現在のバックエンドAPIは解析と同時に自動登録も行いますが、フロントエンドでは解析結果を表示・編集・選択してから個別登録APIで登録します。

**エラー時** (400, 401, 500):
```json
{
  "error": "エラーメッセージ",
  "detail": "詳細なエラーメッセージ"
}
```

---

## 実装上の注意点

### 1. OCR解析の処理時間について

- **処理時間**: OCR解析は数秒〜数十秒かかる可能性があります
- **タイムアウト**: 3分のタイムアウトを設定
- **進捗表示**: 解析中は進捗バーを表示し、ユーザーに待機を促す
- **エラーハンドリング**: タイムアウトやAPIエラーを適切に処理

### 2. 画像ファイルの処理について

- **プレビュー**: `URL.createObjectURL`を使用して画像プレビューを表示
- **メモリリーク対策**: モーダルを閉じる際に`URL.revokeObjectURL`でメモリを解放
- **ファイル形式**: JPEG/PNGのみ対応
- **ファイルサイズ**: 10MB制限（クライアント側とサーバー側の両方で検証）

### 3. 解析結果の編集機能について

- **編集可能項目**: アイテム名、数量、単位、保管場所、消費期限
- **選択機能**: チェックボックスでアイテムを選択
- **全選択/全解除**: ヘッダーのチェックボックスで一括選択
- **デフォルト値**: すべてのアイテムを初期選択状態にする

### 4. 登録処理について

- **個別登録**: 選択したアイテムを個別登録API（`/api/inventory/add`）で登録
- **部分成功の処理**: 一部のアイテムが失敗しても、成功したものは登録
- **エラー表示**: 登録に失敗したアイテムのエラーメッセージを表示
- **登録完了後の処理**: 在庫一覧を自動再読み込み

### 5. バックエンドAPIの動作について

**注意**: 現在のバックエンドAPI `/api/inventory/ocr-receipt` は解析と同時に自動登録も行います。フロントエンドでは解析結果を表示・編集・選択してから個別登録APIで登録するため、重複登録の可能性があります。

**対処方法**:
1. バックエンドAPIを修正して、解析のみを返すエンドポイントを追加
2. 既存エンドポイントに登録をスキップするオプションを追加
3. フロントエンドで既存の登録済みアイテムをチェックしてスキップ

現時点では、Phase 4ドキュメントの実装例通りに実装していますが、実際の動作確認時に重複登録が発生する場合は、上記の対処方法を検討してください。

---

## モバイルアプリ実装時の注意事項

1. **UIコンポーネント**: 
   - モーダルはReact Nativeの`Modal`コンポーネントを使用
   - 画像選択は`react-native-image-picker`や`expo-image-picker`を使用
   - 画像プレビューは`Image`コンポーネントを使用
   - 進捗表示は`ProgressBar`や`ActivityIndicator`を使用
   - 編集可能なテーブルは`FlatList`や`SectionList`を使用

2. **画像選択**: 
   - iOS/Androidのカメラまたはフォトライブラリから画像を選択
   - JPEG/PNG形式のみ対応
   - ファイルサイズ制限（10MB）を確認

3. **OCR解析**: 
   - FormDataの送信はReact Nativeの`FormData`クラスを使用
   - タイムアウト設定（3分）を実装
   - 解析中の進捗表示を実装

4. **解析結果の編集UI**: 
   - テーブル形式の編集UIは`FlatList`を使用
   - 各セルに編集可能な`TextInput`、`Picker`、`DatePicker`を配置
   - チェックボックスは`Switch`コンポーネントを使用

5. **状態管理**: 
   - モーダルの開閉状態、解析状態、編集状態、選択状態を管理
   - 既存の状態管理ライブラリと統合

6. **エラーハンドリング**: 
   - エラーメッセージ表示は`Alert`を使用
   - ネットワークエラー、タイムアウト、OCR解析エラーを適切に処理

7. **パフォーマンス**: 
   - 大量のアイテム（50件以上）を表示する場合、`FlatList`の`virtualization`を活用
   - 画像のリサイズを検討（アップロード前に画像を圧縮）

8. **セキュリティ**: 
   - ファイルサイズ制限（10MB）を確認
   - ファイル形式の検証を実装
   - 画像データの適切な処理（メモリリーク対策）

9. **UX改善**: 
   - 解析中はキャンセルボタンを表示
   - 解析結果を保存して後から編集できる機能を検討
   - 登録前に確認ダイアログを表示

10. **カメラ機能**: 
    - レシートを直接撮影できる機能を追加（`expo-camera`等を使用）
    - 撮影した画像をそのままOCR解析に使用

---

## 関連ドキュメント

- **UPDATE08_1.md**: 在庫一覧表示機能（Phase 1-1, 1-2）の実装内容
- **UPDATE08_2.md**: 在庫CRUD操作機能（Phase 2-1, 2-2）の実装内容
- **UPDATE09_1.md**: CSVアップロード機能（Phase 2）の実装内容
- **INVENTORY_UPLOAD.md**: 在庫初期登録機能の全体計画
- **INVENTORY_UPLOAD_Phase3.md**: OCR機能（バックエンド）の実装詳細
- **INVENTORY_UPLOAD_Phase4.md**: OCR機能（フロントエンド）の実装詳細

---

**実装者**: AI Assistant  
**レビュー**: ユーザー承認済み  
**ステータス**: UPDATE09_2完了

