# UPDATE02.md - Phase 2B: フロントエンド選択UI実装

## 概要

Phase 2Aで実装したバックエンド選択機能に対応するフロントエンドUIを実装しました。主菜5件の選択機能を既存のチャットシステムに統合し、ユーザーが視覚的に選択できるUIを提供します。

## 実装日時

2025年1月23日

## 更新履歴

- **2025-10-23**: Phase 2C統合テスト完了後の修正内容を反映
  - SSEセッションID対応
  - 認証処理の統一
  - バックエンドエンドポイント修正
  - 複数ユーザー並行処理テスト結果
- **2025-10-27**: Phase 2D-2 UI改善実装内容を反映
  - SelectionOptionsの簡素化（カード表示を削除、ラジオボタンのみ）
  - RecipeListModalの新規作成（3列×2行のレシピ一覧表示）
  - チャット欄をスッキリさせ、詳細はモーダルで表示

## 実装内容

### 1. 型定義の拡張

**ファイル**: `/app/Morizo-web/types/menu.ts`

既存の型定義に以下を追加：

```typescript
/**
 * 主菜候補の型定義（Phase 2B用）
 */
export interface RecipeCandidate {
  /** レシピのタイトル */
  title: string;
  /** 食材リスト */
  ingredients: string[];
  /** 調理時間（オプション） */
  cooking_time?: string;
  /** 説明（オプション） */
  description?: string;
  /** カテゴリ */
  category?: 'main' | 'sub' | 'soup';
  /** ソース（LLM/RAG/Web） */
  source?: 'llm' | 'rag' | 'web';
}

/**
 * 選択リクエストの型定義
 */
export interface SelectionRequest {
  /** タスクID */
  task_id: string;
  /** 選択番号（1-5） */
  selection: number;
  /** SSEセッションID（Phase 2Cで追加） */
  sse_session_id: string;
}

/**
 * 選択レスポンスの型定義
 */
export interface SelectionResponse {
  /** 成功フラグ */
  success: boolean;
  /** メッセージ（オプション） */
  message?: string;
  /** エラーメッセージ（オプション） */
  error?: string;
  /** 次のステップ（オプション） */
  next_step?: string;
}
```

### 2. API Routeの作成

**ファイル**: `/app/Morizo-web/app/api/chat/selection/route.ts` (新規作成)

選択結果を受け取るAPI Route：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticatedFetch } from '@/lib/auth';
import { SelectionRequest, SelectionResponse } from '@/types/menu';

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body: SelectionRequest = await request.json();
    
    // バリデーション
    if (!body.task_id || !body.selection || body.selection < 1 || body.selection > 5) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid selection request. task_id and selection (1-5) are required.' 
        } as SelectionResponse,
        { status: 400 }
      );
    }

    // 認証チェック
    const authResult = await authenticateRequest(request);
    
    // 認証失敗の場合はNextResponseを返す
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { token } = authResult;

    // バックエンドに選択リクエストを転送（認証トークン付き）
    const backendUrl = 'http://localhost:8000/chat/selection';
    
    const response = await authenticatedMorizoAIRequest(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }, token);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend selection API error:', response.status, errorText);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Backend error: ${response.status}` 
        } as SelectionResponse,
        { status: response.status }
      );
    }

    const result: SelectionResponse = await response.json();
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Selection API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      } as SelectionResponse,
      { status: 500 }
    );
  }
}
```

**機能**:
- バックエンド（`http://localhost:8000/chat/selection`）にPOST転送
- 認証トークンの引き継ぎ（`authenticatedMorizoAIRequest`使用）
- バリデーション（task_id, selection 1-5, sse_session_id）
- エラーハンドリング
- CORS対応（OPTIONSリクエスト処理）

### 3. 選択UIコンポーネントの作成

**ファイル**: `/app/Morizo-web/components/SelectionOptions.tsx` (新規作成)

主菜5件を表示する選択UIコンポーネント：

```typescript
'use client';

import React, { useState } from 'react';
import { RecipeCandidate } from '@/types/menu';

interface SelectionOptionsProps {
  candidates: RecipeCandidate[];
  onSelect: (selection: number) => void;
  taskId: string;
  sseSessionId: string;  // Phase 2Cで追加
  isLoading?: boolean;
}

const SelectionOptions: React.FC<SelectionOptionsProps> = ({ 
  candidates, 
  onSelect, 
  taskId,
  sseSessionId,
  isLoading = false
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelection = async (selection: number) => {
    if (isLoading) return;
    
    // SSEセッションIDの検証
    if (!sseSessionId || sseSessionId === 'unknown') {
      alert('セッション情報が無効です。ページを再読み込みしてください。');
      return;
    }
    
    setSelectedIndex(selection);
    
    try {
      // バックエンドに選択結果を送信（認証付き）
      const response = await authenticatedFetch('/api/chat/selection', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: taskId,
          selection: selection,
          sse_session_id: sseSessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        onSelect(selection);
      } else {
        throw new Error(result.error || 'Selection failed');
      }
    } catch (error) {
      console.error('Selection failed:', error);
      alert('選択に失敗しました。もう一度お試しください。');
      setSelectedIndex(null);
    }
  };

  // ... レンダリング部分（省略）
};
```

**機能**:
- 5件のカードをグリッド表示（レスポンシブ対応）
- 各カードに料理名、食材、調理時間、説明、ソース表示
- 「選択」ボタンでバックエンドにPOST送信（認証付き）
- SSEセッションID検証
- ローディング状態とエラーハンドリング
- Tailwind CSSで既存デザインと統一

### 4. ChatSectionコンポーネントの拡張

**ファイル**: `/app/Morizo-web/components/ChatSection.tsx`

既存のChatSectionに選択UI機能を統合：

#### 4.1 型定義の拡張

```typescript
interface ChatMessage {
  type: 'user' | 'ai' | 'streaming';
  content: string;
  sseSessionId?: string;
  result?: unknown;
  requiresConfirmation?: boolean;
  requiresSelection?: boolean;  // 新規追加
  candidates?: RecipeCandidate[];  // 新規追加
  taskId?: string;  // 新規追加
}
```

#### 4.2 状態管理の追加

```typescript
const [awaitingSelection, setAwaitingSelection] = useState<boolean>(false);
```

#### 4.3 選択処理の追加

```typescript
const handleSelection = (selection: number) => {
  // 選択完了後の処理
  setAwaitingSelection(false);
  
  // 選択結果メッセージを追加
  setChatMessages(prev => [...prev, {
    type: 'user',
    content: `${selection}番を選択しました`
  }]);
};
```

#### 4.4 SSE処理の拡張

```typescript
// resultから確認情報を取得
const typedResult = result as {
  response: string;
  menu_data?: unknown;
  requires_confirmation?: boolean;
  confirmation_session_id?: string;
  requires_selection?: boolean;  // 新規追加
  candidates?: RecipeCandidate[];  // 新規追加
  task_id?: string;  // 新規追加
} | undefined;

// 選択要求が必要な場合
if (typedResult?.requires_selection && typedResult?.candidates && typedResult?.task_id) {
  console.log('[DEBUG] Setting awaitingSelection from SSE');
  setAwaitingSelection(true);
  
  // ストリーミング進捗表示をAIレスポンスに置き換え（選択要求フラグ付き）
  setChatMessages(prev => 
    prev.map((msg, idx) => 
      idx === index
        ? { 
            type: 'ai', 
            content: typedResult.response, 
            result: typedResult,
            requiresSelection: true,
            candidates: typedResult.candidates,
            taskId: typedResult.task_id
          }
        : msg
    )
  );
  
  // 選択要求時はローディング状態を維持（ユーザー入力を受け付ける）
  setIsTextChatLoading(false);
}
```

#### 4.5 UI表示の追加

```typescript
{/* 選択UI表示 */}
{message.type === 'ai' && message.requiresSelection && message.candidates && message.taskId && (
  <div className="ml-8">
    <SelectionOptions
      candidates={message.candidates}
      onSelect={handleSelection}
      taskId={message.taskId}
      sseSessionId={message.sseSessionId || 'unknown'}
      isLoading={isTextChatLoading}
    />
  </div>
)}
```

#### 4.6 入力制御の追加

```typescript
<input
  type="text"
  value={textMessage}
  onChange={(e) => setTextMessage(e.target.value)}
  onKeyPress={handleKeyPress}
  placeholder="メッセージを入力してください..."
  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
  disabled={isTextChatLoading || awaitingSelection}  // 選択中は無効化
/>
<button
  onClick={sendTextMessage}
  disabled={isTextChatLoading || !textMessage.trim() || awaitingSelection}  // 選択中は無効化
  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors duration-200"
>
  {isTextChatLoading ? '送信中...' : awaitingSelection ? '選択中...' : '送信'}
</button>
```

## 技術仕様

- **フレームワーク**: Next.js 15.5.3 + React 19.1.0 + TypeScript 5
- **スタイリング**: Tailwind CSS 4（レスポンシブデザイン対応）
- **認証**: 既存の `authenticatedFetch` を使用
- **通信**: 既存のSSE進捗表示（`StreamingProgress`）を活用
- **デザイン**: 既存のデザインシステムに従った実装

## 成功基準

- ✅ 主菜5件が視覚的に分かりやすく表示される
- ✅ 選択ボタンクリックで選択結果がバックエンドに送信される
- ✅ 選択中はテキスト入力が無効化される
- ✅ 選択完了後、通常のチャットフローに復帰する
- ✅ エラー時に適切なメッセージが表示される
- ✅ 既存のチャット機能が破壊されない

## 制約事項

- 既存のデザインシステム（Tailwind CSS）に従う
- 既存の認証フロー（authenticatedFetch）を使用
- 既存のSSE進捗表示（StreamingProgress）を活用
- レスポンシブデザイン対応（モバイル/タブレット/デスクトップ）

## ビルド結果

```
✓ Compiled successfully in 6.4s
✓ Generating static pages (13/13)
```

- TypeScriptエラーなし
- 新しいAPI Route `/api/chat/selection` が正常にビルドに含まれている
- 既存機能への影響なし

## Mobile連携が必要な項目

### 1. 型定義の同期
- `/app/Morizo-web/types/menu.ts` の変更内容をmobileコンテナに同期
- `RecipeCandidate`, `SelectionRequest`, `SelectionResponse` の型定義

### 2. API Routeの実装
- `/app/Morizo-web/app/api/chat/selection/route.ts` の実装をmobileコンテナに移植
- バックエンド連携ロジックの実装

### 3. コンポーネントの実装
- `/app/Morizo-web/components/SelectionOptions.tsx` の実装をmobileコンテナに移植
- レスポンシブデザインの調整（モバイル最適化）

### 4. ChatSectionの拡張
- `/app/Morizo-web/components/ChatSection.tsx` の変更内容をmobileコンテナに同期
- 選択UI機能の統合
- 状態管理の追加

### 5. インポート文の追加
```typescript
import SelectionOptions from '@/components/SelectionOptions';
import { RecipeCandidate } from '@/types/menu';
```

## Phase 2C 統合テスト結果

### テスト実施日時
2025-10-23

### テスト結果
- ✅ **フロントエンド選択UI表示**: 正常動作
- ✅ **バックエンド選択受信**: 正常動作  
- ✅ **認証処理**: 正常動作
- ✅ **適切なレスポンス返却**: 正常動作
- ✅ **基本的な選択フロー**: 正常動作
- ✅ **複数ユーザー並行処理（基本動作）**: 正常動作

### 発見された課題
- **タスクID競合問題**: 複数ユーザーが同じtask_idを使用する可能性
- **セッション管理改善**: ユーザー固有のセッション管理が必要

### 修正内容
1. **SSEセッションID対応**: `SelectionRequest`に`sse_session_id`追加
2. **認証処理統一**: `authenticatedMorizoAIRequest`使用
3. **バックエンドエンドポイント修正**: `http://localhost:8000/chat/selection`
4. **CORS対応**: OPTIONSリクエスト処理追加

## Phase 2D-2: UI改善実装（2025-10-27）

### 概要

ユーザー体験の改善のため、SelectionOptionsを簡素化し、レシピ詳細は別モーダルで表示する仕様に変更しました。

### 実装内容

#### 1. SelectionOptionsの簡素化

**ファイル**: `/app/Morizo-web/components/SelectionOptions.tsx`

変更内容：
- カード表示（画像、詳細情報）を削除
- ラジオボタンのみを表示
- 「レシピ一覧を見る」ボタンを追加
- チャット欄をスッキリした表示に

```typescript
interface SelectionOptionsProps {
  candidates: RecipeCandidate[];
  onSelect: (selection: number) => void;
  onViewDetails?: (recipe: RecipeCandidate) => void;
  onViewList?: (candidates: RecipeCandidate[]) => void;  // 新規追加
  taskId: string;
  sseSessionId: string;
  isLoading?: boolean;
}
```

#### 2. RecipeListModalの新規作成

**ファイル**: `/app/Morizo-web/components/RecipeListModal.tsx` (新規作成)

レシピ一覧を3列×2行で横長表示するモーダル：

```typescript
interface RecipeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: RecipeCandidate[];
}

const RecipeListModal: React.FC<RecipeListModalProps> = ({
  isOpen,
  onClose,
  candidates
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* ヘッダー */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              主菜の提案（5件）
            </h2>
            <button onClick={onClose}>✕</button>
          </div>
          
          {/* レシピグリッド（3列×2行） */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map((candidate, index) => (
              <div key={index}>
                {/* 画像表示 */}
                {candidate.urls && candidate.urls.length > 0 && (
                  <ImageHandler
                    urls={candidate.urls}
                    title={candidate.title}
                    onUrlClick={(url) => window.open(url, '_blank')}
                  />
                )}
                
                {/* レシピタイトル */}
                <h3>{index + 1}. {candidate.title}</h3>
                
                {/* 食材情報 */}
                <div>📋 使用食材: {candidate.ingredients.join(', ')}</div>
                
                {/* 調理時間 */}
                {candidate.cooking_time && (
                  <div>⏱️ 調理時間: {candidate.cooking_time}</div>
                )}
                
                {/* ソース情報 */}
                {candidate.source && (
                  <span>{candidate.source === 'llm' ? 'LLM提案' : 'RAG検索'}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

**機能**:
- 3列×2行のグリッド表示（レスポンシブ対応）
- 各カードに画像、タイトル、食材、調理時間を表示
- ソース情報（LLM/RAG）を表示
- ImageHandlerコンポーネントで画像表示

#### 3. ChatSectionの拡張

**ファイル**: `/app/Morizo-web/components/ChatSection.tsx`

RecipeListModalとの連携を追加：

```typescript
// モーダル状態の追加
const [isListModalOpen, setIsListModalOpen] = useState(false);
const [listModalCandidates, setListModalCandidates] = useState<RecipeCandidate[]>([]);

// 一覧表示ハンドラ
const handleViewList = (candidates: RecipeCandidate[]) => {
  setListModalCandidates(candidates);
  setIsListModalOpen(true);
};

// SelectionOptionsにプロップを追加
<SelectionOptions
  candidates={message.candidates}
  onSelect={handleSelection}
  onViewDetails={handleViewDetails}
  onViewList={handleViewList}  // 新規追加
  taskId={message.taskId}
  sseSessionId={message.sseSessionId || 'unknown'}
  isLoading={isTextChatLoading}
/>

// RecipeListModalの表示
{isListModalOpen && listModalCandidates.length > 0 && (
  <RecipeListModal
    isOpen={isListModalOpen}
    onClose={() => {
      setIsListModalOpen(false);
      setListModalCandidates([]);
    }}
    candidates={listModalCandidates}
  />
)}
```

### 改善効果

- ✅ **チャット欄がスッキリ**: ラジオボタンのみの表示で読みやすい
- ✅ **詳細確認可能**: モーダルで画像や詳細情報を確認可能
- ✅ **3列×2行表示**: 横長モーダルで5件を効率的に表示
- ✅ **レスポンシブ対応**: モバイル・タブレット・デスクトップで適切に表示

### Mobile連携が必要な項目（Phase 2D-2追加分）

#### 1. RecipeListModalコンポーネントの実装
- `/app/Morizo-web/components/RecipeListModal.tsx` をmobileコンテナに移植
- 3列×2行グリッドの実装
- ImageHandlerコンポーネントの活用

#### 2. SelectionOptionsの更新
- `/app/Morizo-web/components/SelectionOptions.tsx` の変更内容をmobileコンテナに同期
- `onViewList`プロップの追加
- カード表示を削除し、ラジオボタンのみ表示

#### 3. ChatSectionの拡張
- `/app/Morizo-web/components/ChatSection.tsx` の変更内容をmobileコンテナに同期
- `handleViewList`ハンドラの実装
- RecipeListModalの状態管理追加

#### 4. インポート文の追加
```typescript
import RecipeListModal from '@/components/RecipeListModal';
```

## 次のステップ

Phase 2D-2完了後、Phase 2D-3（結合試験）に進む予定です。

---

**実装者**: AI Assistant  
**レビュー**: ユーザー承認済み  
**ステータス**: Phase 2D-2完了
