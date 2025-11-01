# UPDATE04_2.md - Phase 5C-3: 履歴パネルUIの実装

## 概要

Phase 5C-3で実装された履歴パネルUIを実装しました。過去に保存した献立履歴を閲覧できるドロワー型のUIパネルを追加し、期間とカテゴリでのフィルタリング機能を提供します。

## 実装日時

2025年1月（Phase 5C-3実装完了時）

## 実装背景

Phase 5C-1で実装された履歴取得API (`/api/menu/history`) を使用して、過去の献立履歴を閲覧できるフロントエンドUIが必要でした。Phase 5C-3では、右側からスライドインするドロワー型の履歴パネルを実装しました。

## 実装内容

### 1. Next.js API Routeの作成

**ファイル**: `/app/Morizo-web/app/api/menu/history/route.ts` (新規作成)

#### 1.1 エンドポイント概要

履歴取得API (`/api/menu/history`) のNext.js API Route。Morizo AIバックエンドへのリクエストを転送します。

#### 1.2 実装内容

**HTTPメソッド**: GET

**クエリパラメータ**:
- `days`: 取得期間（デフォルト: 14）
- `category`: カテゴリフィルター（"main", "sub", "soup", または未指定で全件）

**認証**: Bearerトークン認証が必要

**実装コード**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, authenticatedMorizoAIRequest } from '@/lib/auth-server';
import { ServerLogger, LogCategory, logApiCall, logError } from '@/lib/logging-utils';

const MORIZO_AI_URL = process.env.MORIZO_AI_URL || 'http://localhost:8000';

// CORSヘッダーを設定するヘルパー関数
function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

// OPTIONSリクエストのハンドラー（CORS preflight）
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}

export async function GET(request: NextRequest) {
  const timer = ServerLogger.startTimer('menu-history-api');
  
  try {
    ServerLogger.info(LogCategory.API, '献立履歴取得API呼び出し開始');
    
    // クエリパラメータの取得
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days');
    const category = searchParams.get('category');
    
    ServerLogger.debug(LogCategory.API, 'クエリパラメータ解析完了', { 
      days,
      category
    });

    // 認証チェック
    ServerLogger.debug(LogCategory.API, '認証チェック開始');
    const authResult = await authenticateRequest(request);
    
    // 認証失敗の場合はNextResponseを返す
    if (authResult instanceof NextResponse) {
      ServerLogger.warn(LogCategory.API, '認証失敗');
      return setCorsHeaders(authResult);
    }
    
    const { token } = authResult;
    ServerLogger.info(LogCategory.API, '認証成功', { tokenMasked: ServerLogger.maskToken(token) });

    // Morizo AIに送信（認証トークン付き）
    ServerLogger.info(LogCategory.API, 'Morizo AIに献立履歴取得リクエスト送信開始');
    
    // クエリパラメータを構築
    const queryParams = new URLSearchParams();
    if (days) {
      queryParams.append('days', days);
    }
    if (category) {
      queryParams.append('category', category);
    }
    
    const queryString = queryParams.toString();
    const url = `${MORIZO_AI_URL}/api/menu/history${queryString ? `?${queryString}` : ''}`;
    
    const aiResponse = await authenticatedMorizoAIRequest(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }, token);

    if (!aiResponse.ok) {
      const errorMsg = `Morizo AI エラー: ${aiResponse.status}`;
      ServerLogger.error(LogCategory.API, errorMsg, { status: aiResponse.status });
      throw new Error(errorMsg);
    }

    const data = await aiResponse.json();
    ServerLogger.info(LogCategory.API, 'Morizo AIからのレスポンス受信完了', { 
      success: data.success,
      dataLength: data.data?.length || 0
    });

    timer();
    logApiCall('GET', '/api/menu/history', 200, undefined);
    
    const nextResponse = NextResponse.json({
      success: data.success,
      data: data.data
    });
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'menu-history-api');
    logApiCall('GET', '/api/menu/history', 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
    const errorResponse = NextResponse.json(
      { 
        error: 'Morizo AIとの通信に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
    return setCorsHeaders(errorResponse);
  }
}
```

**レスポンス形式**:

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "recipes": [
        {
          "category": "main",
          "title": "主菜: 鶏もも肉の唐揚げ",
          "source": "web",
          "url": "...",
          "history_id": "uuid-xxx"
        },
        {
          "category": "sub",
          "title": "副菜: ほうれん草の胡麻和え",
          "source": "rag",
          "url": null,
          "history_id": "uuid-yyy"
        },
        {
          "category": "soup",
          "title": "汁物: 味噌汁",
          "source": "web",
          "url": "...",
          "history_id": "uuid-zzz"
        }
      ]
    }
  ]
}
```

### 2. HistoryPanelコンポーネントの作成

**ファイル**: `/app/Morizo-web/components/HistoryPanel.tsx` (新規作成)

#### 2.1 コンポーネント概要

過去の献立履歴を表示するドロワー型のUIパネル。期間とカテゴリでフィルタリング可能。

#### 2.2 Props定義

```typescript
interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}
```

#### 2.3 実装内容

**主な機能**:
1. **履歴取得**: `/api/menu/history`エンドポイントを呼び出し
2. **期間フィルター**: 7日、14日、30日のボタンで選択
3. **カテゴリフィルター**: 全て、主菜、副菜、汁物のドロップダウン
4. **日付別表示**: 日付ごとにグループ化して表示
5. **ローディング状態**: データ取得中の表示
6. **空状態**: 履歴が存在しない場合の表示

**UI構造**:
- 固定位置（`fixed inset-y-0 right-0`）で右側に表示
- デスクトップ: 幅384px (`sm:w-96`)
- モバイル: 全幅 (`w-full`)
- スクロール可能 (`overflow-y-auto`)

**実装コードの主要部分**:

```typescript
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

  // ... レンダリング部分
};
```

**スタイリング**:
- Tailwind CSSを使用
- ダークモード対応 (`dark:`プレフィックス)
- レスポンシブ対応（`sm:w-96`）
- アニメーション（ローディングスピナー）

### 3. ChatSectionへの統合

**ファイル**: `/app/Morizo-web/components/ChatSection.tsx` (修正)

#### 3.1 インポートの追加

```typescript
import HistoryPanel from '@/components/HistoryPanel';  // Phase 5C-3: 履歴パネルコンポーネント
```

#### 3.2 状態管理の追加

```typescript
// Phase 5C-3: 履歴パネルの状態管理
const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
```

#### 3.3 ヘッダー部分の修正

**修正前**:
```typescript
<h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 text-center">
  Morizo AI テキストチャット
</h2>
```

**修正後**:
```typescript
<div className="flex items-center justify-between mb-6">
  <h2 className="text-xl font-bold text-gray-800 dark:text-white">
    Morizo AI テキストチャット
  </h2>
  <button
    onClick={() => setIsHistoryPanelOpen(true)}
    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
  >
    📅 履歴
  </button>
</div>
```

#### 3.4 HistoryPanelコンポーネントの追加

レシピ一覧モーダルの後に追加：

```typescript
{/* Phase 5C-3: 履歴パネル */}
<HistoryPanel
  isOpen={isHistoryPanelOpen}
  onClose={() => setIsHistoryPanelOpen(false)}
/>
```

## 動作フロー

### 1. 履歴パネルを開く

1. ユーザーが「📅 履歴」ボタンをクリック
2. `isHistoryPanelOpen`が`true`に設定される
3. `HistoryPanel`コンポーネントが表示される
4. `useEffect`が発火し、`loadHistory()`が呼び出される

### 2. 履歴データの取得

1. `/api/menu/history`エンドポイントにGETリクエストを送信
2. クエリパラメータ（`days`, `category`）を含める
3. 認証トークンを含める
4. レスポンスを受信し、`history`状態を更新

### 3. フィルター変更

1. ユーザーが期間ボタンまたはカテゴリドロップダウンを変更
2. `days`または`categoryFilter`状態が更新される
3. `useEffect`が発火し、`loadHistory()`が再度呼び出される
4. 新しいフィルター条件で履歴を取得

### 4. 履歴パネルを閉じる

1. ユーザーが「✕」ボタンをクリック
2. `onClose`コールバックが呼び出される
3. `isHistoryPanelOpen`が`false`に設定される
4. `HistoryPanel`コンポーネントが非表示になる

## モバイルアプリへの移植ポイント

### 1. API呼び出しの実装

**対応するファイル**: APIクライアントファイル

**実装内容**:
- `/api/menu/history`エンドポイントを呼び出す関数を実装
- クエリパラメータ（`days`, `category`）を渡す
- 認証トークンをヘッダーに含める
- エラーハンドリングを実装

**実装例**:
```typescript
// APIクライアントファイル
export async function getMenuHistory(days: number = 14, category?: string): Promise<HistoryEntry[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('days', days.toString());
  if (category) {
    queryParams.append('category', category);
  }
  
  const response = await authenticatedFetch(
    `/api/menu/history?${queryParams.toString()}`
  );
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  if (result.success) {
    return result.data;
  }
  
  throw new Error(result.error || '履歴取得に失敗しました');
}
```

**注意点**:
- モバイルアプリでは、Next.js API Routeの代わりに直接Morizo AIバックエンドURL (`${MORIZO_AI_URL}/api/menu/history`) に接続
- 認証方法はモバイルアプリの認証システムに合わせて実装

### 2. HistoryPanelコンポーネントの移植

**対応するモバイルコンポーネント**: `HistoryPanel.tsx`（新規作成）

**実装内容**:
- React Nativeのコンポーネントを使用
  - `View`, `Text`, `TouchableOpacity`, `ScrollView`, `ActivityIndicator`
- Tailwind CSSのクラスをStyleSheetに変換
- レスポンシブ対応はReact Nativeの`Dimensions`を使用
- ナビゲーションドロワーまたはモーダルとして実装

**実装例**:
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { getMenuHistory } from '@/api/menu-history';

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
      const data = await getMenuHistory(days, categoryFilter || undefined);
      setHistory(data);
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

  const screenWidth = Dimensions.get('window').width;
  const panelWidth = screenWidth > 640 ? 384 : screenWidth;

  return (
    <View style={[styles.container, { width: panelWidth }]}>
      {/* ヘッダー部分 */}
      <View style={styles.header}>
        <Text style={styles.title}>📅 献立履歴</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>
      
      {/* フィルター部分 */}
      <View style={styles.filters}>
        {/* 期間フィルター */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>期間: {days}日間</Text>
          <View style={styles.buttonGroup}>
            {[7, 14, 30].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setDays(d)}
                style={[styles.filterButton, days === d && styles.filterButtonActive]}
              >
                <Text style={[styles.filterButtonText, days === d && styles.filterButtonTextActive]}>
                  {d}日
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* カテゴリフィルター */}
        {/* Pickerコンポーネントを使用 */}
      </View>
      
      {/* 履歴リスト */}
      <ScrollView style={styles.content}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>履歴がありません</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {history.map((entry, index) => (
              <View key={index} style={styles.historyEntry}>
                <Text style={styles.dateText}>📆 {formatDate(entry.date)}</Text>
                {entry.recipes.map((recipe, recipeIndex) => (
                  <View
                    key={recipeIndex}
                    style={[
                      styles.recipeCard,
                      recipe.duplicate_warning && styles.recipeCardWarning
                    ]}
                  >
                    <Text style={styles.categoryIcon}>{getCategoryIcon(recipe.category)}</Text>
                    <View style={styles.recipeContent}>
                      <Text style={styles.recipeTitle}>
                        {recipe.title.replace(/^(主菜|副菜|汁物):\s*/, '')}
                      </Text>
                      {recipe.duplicate_warning && (
                        <Text style={styles.warningText}>
                          ⚠️ 重複警告（{recipe.duplicate_warning}）
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    fontSize: 20,
    color: '#6b7280',
  },
  filters: {
    padding: 16,
    gap: 12,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#4b5563',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4b5563',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  historyList: {
    gap: 16,
  },
  historyEntry: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 8,
  },
  recipeCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  recipeCardWarning: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  recipeContent: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 4,
  },
});

export default HistoryPanel;
```

**注意点**:
- React Nativeでは`@react-native-picker/picker`を使用してドロップダウンを実装
- ダークモードは`useColorScheme`フックを使用
- ナビゲーションライブラリ（React Navigation等）を使用する場合は、ドロワーコンポーネントを活用

### 3. ChatSectionへの統合

**対応するファイル**: チャット画面コンポーネント

**実装内容**:
1. **状態管理の追加**:
```typescript
const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
```

2. **履歴ボタンの追加**:
```typescript
<TouchableOpacity
  onPress={() => setIsHistoryPanelOpen(true)}
  style={styles.historyButton}
>
  <Text>📅 履歴</Text>
</TouchableOpacity>
```

3. **HistoryPanelコンポーネントの表示**:
```typescript
{isHistoryPanelOpen && (
  <HistoryPanel
    isOpen={isHistoryPanelOpen}
    onClose={() => setIsHistoryPanelOpen(false)}
  />
)}
```

**注意点**:
- モバイルアプリでは、ドロワーまたはモーダルとして実装
- ナビゲーションライブラリを使用する場合は、専用のドロワーコンポーネントを使用することを推奨

## 依存関係

### Phase 5C-1との関係

Phase 5C-3は、Phase 5C-1で実装された`/api/menu/history`エンドポイントを使用します。Phase 5C-1の実装が完了している必要があります。

### Phase 5Aとの関係

Phase 5C-3で表示する履歴データは、Phase 5Aで実装された`/api/menu/save`エンドポイントで保存されたデータです。Phase 5Aの実装が完了している必要があります。

## テスト項目

### 単体テスト

1. **Next.js API Route**
   - GETリクエストの処理
   - クエリパラメータの取得
   - 認証チェック
   - エラーハンドリング

2. **HistoryPanelコンポーネント**
   - 履歴の表示
   - フィルター機能（期間、カテゴリ）
   - ローディング状態の表示
   - 空の状態の表示
   - パネルの開閉

3. **ChatSection統合**
   - 履歴ボタンの表示
   - パネルの開閉

### 統合テスト

1. **Phase 5C-1との統合**
   - API呼び出しが正しく動作すること
   - レスポンスが正しく表示されること

2. **フィルター機能**
   - 期間フィルターが正しく動作すること
   - カテゴリフィルターが正しく動作すること
   - フィルター変更時にAPIが再呼び出しされること

3. **レスポンシブ対応**
   - デスクトップで正しく表示されること
   - モバイルで正しく表示されること

## 注意事項

1. **認証**: `authenticatedFetch`はモバイルアプリの認証システムに合わせて実装する必要があります。

2. **APIエンドポイント**: モバイルアプリでは、Next.js API Routeの代わりに直接Morizo AIバックエンドURLに接続します。

3. **ダークモード**: モバイルアプリのテーマシステムに合わせて、ダークモード対応を実装する必要があります。

4. **ナビゲーション**: モバイルアプリでは、React Navigationのドロワーナビゲーションを使用することを推奨します。

5. **パフォーマンス**: 履歴データが大量にある場合、ページネーションを検討してください。

## 関連ファイル

- `/app/Morizo-web/app/api/menu/history/route.ts` (新規作成)
- `/app/Morizo-web/components/HistoryPanel.tsx` (新規作成)
- `/app/Morizo-web/components/ChatSection.tsx` (修正)
- `/app/Morizo-aiv2/api/routes/menu.py` (Phase 5C-1で作成)

