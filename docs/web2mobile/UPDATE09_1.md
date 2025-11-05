# UPDATE09_1.md - 在庫CSVアップロード機能実装（Phase 2）

## 概要

CSVファイルをアップロードして在庫データを一括登録する機能を実装しました。フロントエンドUI（Phase 2）を実装し、ユーザーがCSVファイルを選択して在庫データを一括登録できるようになりました。バックエンドAPI（Phase 1）は既に実装済みで、本ドキュメントではフロントエンド実装の内容を記載します。

## 実装日時

2025年11月5日（実装完了時）

## 実装背景

在庫管理システムにおいて、初期登録時に大量の在庫データを効率的に登録できる機能が必要でした。1件ずつ手入力するのは非効率なため、CSVファイルによる一括登録機能を実装しました。

既存の在庫CRUD機能（UPDATE08_1, UPDATE08_2）に加えて、以下の機能を追加しました：

1. **CSVファイルアップロード**
   - CSVファイルを選択してアップロード
   - ファイル形式の検証（.csvのみ）
   - アップロード進捗表示

2. **結果表示**
   - 成功件数・エラー件数の表示
   - エラー詳細の表示（行番号、アイテム名、エラーメッセージ）
   - 部分成功の処理（一部失敗しても成功したものは登録）

3. **エラーハンドリング**
   - JSONパースエラーの適切な処理
   - ネットワークエラーの処理
   - 詳細なログ出力

**注意**: バックエンドAPI（Phase 1）は既に実装済みです。本ドキュメントではフロントエンド実装のみを記載します。

## 実装内容

### 1. フロントエンド: InventoryCSVUploadModalコンポーネントの作成

**ファイル**: `/app/Morizo-web/components/InventoryCSVUploadModal.tsx`（新規作成）

#### 1.1 実装内容

```typescript
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

      const response = await authenticatedFetch('/api/inventory/upload-csv', {
        method: 'POST',
        body: formData,
      });

      // レスポンス本文をテキストとして取得（デバッグ用）
      const responseText = await response.text();

      if (!response.ok) {
        // エラーレスポンスの処理
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || errorMessage;
        } catch (parseError) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // 成功レスポンスの処理
      const result: CSVUploadResult = JSON.parse(responseText);
      setUploadResult(result);

      if (result.success && result.error_count === 0) {
        // 成功した場合、在庫一覧を再読み込み
        onUploadComplete();
      }
    } catch (error) {
      console.error('CSV upload failed:', error);
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
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              CSVアップロード
            </h2>
            <button onClick={handleClose}>✕</button>
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                選択中のファイル: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* アップロードボタン */}
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? 'アップロード中...' : 'アップロード'}
          </button>

          {/* 進捗表示 */}
          {isUploading && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
          )}

          {/* 結果表示 */}
          {uploadResult && (
            <div className="mt-4">
              <div className={`p-4 rounded-lg ${uploadResult.success && uploadResult.error_count === 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <h3 className="font-bold mb-2">
                  {uploadResult.success && uploadResult.error_count === 0 ? '✅ アップロード成功' : '⚠️ 部分成功'}
                </h3>
                <div className="text-sm space-y-1">
                  <p>総件数: {uploadResult.total}</p>
                  <p>成功件数: {uploadResult.success_count}</p>
                  {uploadResult.error_count > 0 && (
                    <p className="text-red-600">エラー件数: {uploadResult.error_count}</p>
                  )}
                </div>
              </div>

              {/* エラー詳細 */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-bold mb-2">エラー詳細:</h4>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th>行</th>
                          <th>アイテム名</th>
                          <th>エラー</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResult.errors.map((error, index) => (
                          <tr key={index}>
                            <td>{error.row}</td>
                            <td>{error.item_name || '-'}</td>
                            <td className="text-red-600">{error.error}</td>
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
            <button onClick={handleClose}>閉じる</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryCSVUploadModal;
```

#### 1.2 変更の理由

- CSVファイルをアップロードして在庫データを一括登録するUIを提供
- ファイル選択、進捗表示、結果表示、エラー詳細表示の機能を実装
- 既存の`InventoryEditModal`と同様のモーダルデザインで統一

---

### 2. フロントエンド: InventoryPanelコンポーネントの拡張

**ファイル**: `/app/Morizo-web/components/InventoryPanel.tsx`

#### 2.1 変更箇所

**行番号**: 6行目（インポート追加）、33行目（状態管理追加）、275-280行目（ボタン追加）、294-300行目（モーダル追加）

#### 2.2 変更前

```typescript
import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/auth';
import InventoryEditModal from '@/components/InventoryEditModal';

const InventoryPanel: React.FC<InventoryPanelProps> = ({ isOpen, onClose }) => {
  // ... 既存の状態管理 ...
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 新規追加ボタンのみ
  <div className="mt-4">
    <button onClick={handleAddNew}>
      + 新規追加
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

const InventoryPanel: React.FC<InventoryPanelProps> = ({ isOpen, onClose }) => {
  // ... 既存の状態管理 ...
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCSVUploadModalOpen, setIsCSVUploadModalOpen] = useState(false);

  // 新規追加ボタンとCSVアップロードボタン
  <div className="mt-4 space-y-2">
    <button onClick={handleAddNew}>
      + 新規追加
    </button>
    <button onClick={() => setIsCSVUploadModalOpen(true)}>
      📄 CSVアップロード
    </button>
  </div>

  // CSVアップロードモーダル
  {isCSVUploadModalOpen && (
    <InventoryCSVUploadModal
      isOpen={isCSVUploadModalOpen}
      onClose={() => setIsCSVUploadModalOpen(false)}
      onUploadComplete={loadInventory}
    />
  )}
}
```

#### 2.4 変更の理由

- CSVアップロード機能へのアクセスを提供
- 既存の「新規追加」ボタンの下に「CSVアップロード」ボタンを配置
- アップロード完了時に在庫一覧を自動再読み込み

---

### 3. フロントエンド: Next.js APIルートの作成

**ファイル**: `/app/Morizo-web/app/api/inventory/upload-csv/route.ts`（新規作成）

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
  const timer = ServerLogger.startTimer('inventory-upload-csv-api');
  
  try {
    ServerLogger.info(LogCategory.API, '在庫CSVアップロードAPI呼び出し開始');

    // 認証チェック
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) {
      return setCorsHeaders(authResult);
    }
    
    const { token } = authResult;

    // FormDataを取得
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      const errorResponse = NextResponse.json(
        { error: 'ファイルが提供されていません', detail: 'CSVファイルを選択してください' },
        { status: 400 }
      );
      return setCorsHeaders(errorResponse);
    }

    // Morizo AIに送信（認証トークン付き）
    const url = `${MORIZO_AI_URL}/api/inventory/upload-csv`;
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    const headers = {
      'Authorization': `Bearer ${token}`,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

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
    logApiCall('POST', '/api/inventory/upload-csv', 200, undefined);
    
    const nextResponse = NextResponse.json({
      success: data.success,
      total: data.total,
      success_count: data.success_count,
      error_count: data.error_count,
      errors: data.errors || []
    });
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'inventory-upload-csv-api');
    logApiCall('POST', '/api/inventory/upload-csv', 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
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
- 既存の`/api/inventory/add`等と同様のパターンで実装
- FormDataの処理とエラーハンドリングを適切に実装

---

## API仕様

### エンドポイント

**POST** `/api/inventory/upload-csv`

### リクエスト

**Content-Type**: `multipart/form-data`

**フィールド**:
- `file`: CSVファイル（必須）

**CSVフォーマット**:
```csv
item_name,quantity,unit,storage_location,expiry_date
りんご,5,個,冷蔵庫,2024-02-15
米,2,kg,常温倉庫,
牛乳,1,L,冷蔵庫,2024-01-25
```

**必須項目**:
- `item_name`: アイテム名（文字列、1-100文字）
- `quantity`: 数量（数値、0より大きい）
- `unit`: 単位（文字列、1-20文字）

**オプション項目**:
- `storage_location`: 保管場所（文字列、最大50文字、デフォルト: "冷蔵庫"）
- `expiry_date`: 消費期限（日付形式: YYYY-MM-DD）

### レスポンス

**成功時** (200):
```json
{
  "success": true,
  "total": 100,
  "success_count": 98,
  "error_count": 2,
  "errors": [
    {
      "row": 5,
      "item_name": "不正なデータ",
      "error": "数量は0より大きい値が必要です"
    }
  ]
}
```

**エラー時** (400, 401, 500):
```json
{
  "error": "エラーメッセージ",
  "detail": "詳細なエラーメッセージ"
}
```

---

## 実装上の注意点

### 1. エラーハンドリングについて

- **JSONパースエラー**: レスポンスがJSON形式でない場合（HTMLエラーページ等）、適切にエラーメッセージを表示
- **部分成功**: 一部のデータが失敗しても、成功したデータは登録される
- **エラー詳細**: 行番号、アイテム名、エラーメッセージを含む詳細なエラー情報を表示

### 2. FormDataの処理について

- Next.jsのAPIルートで`request.formData()`を使用してFormDataを取得
- バックエンドに転送する際は、FormDataを再構築
- `Content-Type`ヘッダーはFormDataの場合自動設定されるため、明示的に設定しない

### 3. ファイル検証について

- クライアント側で`.csv`拡張子をチェック
- サーバー側でもファイル形式の検証が実行される
- ファイルサイズ制限（10MB）はバックエンド側で実装済み

### 4. 進捗表示について

- アップロード中は進捗バーを表示
- アニメーション付きのプログレスバーで視覚的なフィードバックを提供

### 5. ログ出力について

- 詳細なログ出力を実装（リクエスト送信、レスポンス受信、エラー発生時）
- デバッグ時に役立つ情報をコンソールに出力

---

## モバイルアプリ実装時の注意事項

1. **UIコンポーネント**: 
   - モーダルはReact Nativeの`Modal`コンポーネントを使用
   - ファイル選択は`react-native-document-picker`や`expo-document-picker`を使用
   - 進捗表示は`ProgressBar`や`ActivityIndicator`を使用

2. **API呼び出し**: 
   - 既存の認証パターンに従って、`authenticatedFetch`相当の関数を使用
   - FormDataの送信は`FormData`クラスを使用（React Nativeでも利用可能）

3. **ファイル選択**: 
   - iOS/Androidのファイルピッカーを使用
   - CSVファイルのみ選択可能にする（MIMEタイプ: `text/csv`）

4. **エラーハンドリング**: 
   - エラーメッセージ表示は`Alert`を使用
   - エラー詳細テーブルは`FlatList`や`SectionList`を使用

5. **状態管理**: 
   - モーダルの開閉状態、アップロード状態、結果表示状態を管理
   - 既存の状態管理ライブラリと統合

6. **CSVフォーマット説明**: 
   - モーダル内にCSVフォーマットの説明を表示
   - サンプルCSVファイルのダウンロード機能を検討

7. **パフォーマンス**: 
   - 大量のデータ（100件以上）をアップロードする場合の処理時間を考慮
   - タイムアウト設定（3分）を実装

8. **セキュリティ**: 
   - ファイルサイズ制限（10MB）を確認
   - ファイル形式の検証を実装

---

## 関連ドキュメント

- **UPDATE08_1.md**: 在庫一覧表示機能（Phase 1-1, 1-2）の実装内容
- **UPDATE08_2.md**: 在庫CRUD操作機能（Phase 2-1, 2-2）の実装内容
- **INVENTORY_UPLOAD.md**: 在庫初期登録機能の全体計画
- **INVENTORY_UPLOAD_Phase1.md**: CSV一括登録機能（バックエンド）の実装詳細
- **INVENTORY_UPLOAD_Phase2.md**: CSVアップロード機能（フロントエンド）の実装詳細

---

**実装者**: AI Assistant  
**レビュー**: ユーザー承認済み  
**ステータス**: UPDATE09_1完了

