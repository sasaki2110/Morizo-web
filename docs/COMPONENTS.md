# Morizo Web - コンポーネント仕様

## 概要

Morizo WebアプリケーションのReactコンポーネント仕様書。各コンポーネントの機能、プロパティ、使用方法について記載。

## ページコンポーネント

### **app/page.tsx**

メインアプリケーションページ。チャットUI、音声入力、認証トークン表示、APIテスト機能を統合。

#### 機能
- チャット履歴の表示
- テキストチャット機能
- 音声チャット機能
- 認証トークンの取得・表示
- API接続テスト

#### 状態管理
```typescript
const [apiResponse, setApiResponse] = useState<string>('');
const [isLoading, setIsLoading] = useState(false);
const [chatMessages, setChatMessages] = useState<Array<{type: 'user' | 'ai', content: string}>>([]);
const [isChatLoading, setIsChatLoading] = useState(false);
const [authToken, setAuthToken] = useState<string>('');
const [isTokenLoading, setIsTokenLoading] = useState(false);
const [textMessage, setTextMessage] = useState<string>('');
const [isTextChatLoading, setIsTextChatLoading] = useState(false);
const [isCopied, setIsCopied] = useState(false);
```

#### 主要メソッド
- `testApi()`: API接続テスト
- `handleVoiceTranscription()`: 音声認識結果の処理
- `handleVoiceError()`: 音声認識エラーの処理
- `getAuthToken()`: 認証トークンの取得
- `sendTextMessage()`: テキストメッセージの送信

---

## 認証コンポーネント

### **AuthForm.tsx**

ログイン・サインアップフォームコンポーネント。

#### プロパティ
なし（内部状態のみ）

#### 状態
```typescript
const [isSignUp, setIsSignUp] = useState(false);
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState('');
const [error, setError] = useState('');
```

#### 機能
- メール/パスワード認証
- Google OAuth認証
- ログイン・サインアップの切り替え
- エラーハンドリング
- 成功メッセージ表示

#### 使用方法
```tsx
<AuthForm />
```

---

### **AuthWrapper.tsx**

認証状態に基づくページ保護コンポーネント。

#### プロパティ
```typescript
interface AuthWrapperProps {
  children: React.ReactNode;
}
```

#### 機能
- 認証状態のチェック
- 未認証時の認証フォーム表示
- 認証済み時の子コンポーネント表示
- ローディング状態の管理

#### 使用方法
```tsx
<AuthWrapper>
  <YourProtectedComponent />
</AuthWrapper>
```

---

### **UserProfile.tsx**

ユーザープロフィール表示・ログアウト機能コンポーネント。

#### プロパティ
なし（AuthContextから認証情報を取得）

#### 機能
- ユーザー情報の表示
- ログアウト機能
- 認証状態の表示

#### 使用方法
```tsx
<UserProfile />
```

---

## 機能コンポーネント

### **VoiceRecorder.tsx**

音声録音・Whisper API連携コンポーネント。

#### プロパティ
```typescript
interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onError: (error: string) => void;
}
```

#### 状態
```typescript
const [isRecording, setIsRecording] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);
const recorderRef = useRef<WebAudioRecorder | null>(null);
```

#### 機能
- Web Audio APIを使用した音声録音
- OpenAI Whisper API連携
- 録音状態の視覚的表示
- エラーハンドリング

#### 主要メソッド
- `startRecording()`: 録音開始
- `stopRecording()`: 録音停止
- `sendToWhisper()`: Whisper API送信

#### 使用方法
```tsx
<VoiceRecorder 
  onTranscriptionComplete={(text) => console.log(text)}
  onError={(error) => console.error(error)}
/>
```

---

### **SplashScreen.tsx**

ローディング画面コンポーネント。

#### プロパティ
```typescript
interface SplashScreenProps {
  message?: string;
}
```

#### 機能
- ローディングアニメーション
- カスタムメッセージ表示
- レスポンシブデザイン

#### 使用方法
```tsx
<SplashScreen message="読み込み中..." />
```

---

## コンテキスト

### **AuthContext.tsx**

認証状態のグローバル管理コンテキスト。

#### プロパティ
```typescript
interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{error: AuthError | null}>;
  signIn: (email: string, password: string) => Promise<{error: AuthError | null}>;
  signInWithGoogle: () => Promise<{error: AuthError | null}>;
  signOut: () => Promise<void>;
}
```

#### 機能
- Supabase認証状態の管理
- 認証メソッドの提供
- セッション永続化
- 認証状態のリアルタイム更新

#### 使用方法
```tsx
const { session, signIn, signOut } = useAuth();
```

---

## ユーティリティ

### **lib/auth.ts**

認証関連のユーティリティ関数。

#### 主要関数
```typescript
// 認証付きfetch
export async function authenticatedFetch(url: string, options?: RequestInit): Promise<Response>;

// 現在の認証トークン取得
export async function getCurrentAuthToken(): Promise<string | null>;
```

#### 機能
- 認証トークンの自動付与
- API呼び出しの簡素化
- エラーハンドリング

---

### **lib/auth-server.ts**

サーバーサイド認証ユーティリティ。

#### 主要関数
```typescript
// リクエスト認証チェック
export async function authenticateRequest(request: NextRequest): Promise<{token: string, user: User} | NextResponse>;

// 認証付きMorizo AIリクエスト
export async function authenticatedMorizoAIRequest(url: string, options: RequestInit, token: string): Promise<Response>;
```

#### 機能
- API Routesでの認証チェック
- Morizo AIへの認証付きリクエスト
- エラーレスポンスの生成

---

### **lib/audio.ts**

音声処理ユーティリティ。

#### 主要クラス
```typescript
class WebAudioRecorder {
  async startRecording(): Promise<void>;
  async stopRecording(): Promise<Blob>;
}

// 音声録音サポートチェック
export function isAudioRecordingSupported(): boolean;
```

#### 機能
- Web Audio APIを使用した音声録音
- WebM形式での音声データ取得
- ブラウザ互換性チェック

---

### **lib/supabase.ts**

Supabaseクライアント設定。

#### 機能
- Supabaseクライアントの初期化
- 環境変数からの設定読み込み
- クライアントサイド用設定

---

### **lib/supabase-server.ts**

サーバーサイドSupabase設定。

#### 機能
- サーバーサイド用Supabaseクライアント
- 認証トークンの検証
- データベース操作

---

## スタイリング

### **Tailwind CSSクラス**

#### カラーパレット
```css
/* プライマリカラー */
bg-blue-600 hover:bg-blue-700
text-blue-600 hover:text-blue-800

/* セカンダリカラー */
bg-green-600 hover:bg-green-700
bg-red-600 hover:bg-red-700

/* グレースケール */
bg-gray-100 dark:bg-gray-700
text-gray-800 dark:text-white
```

#### レスポンシブデザイン
```css
/* モバイルファースト */
w-full md:w-1/2 lg:w-1/3
text-sm md:text-base lg:text-lg

/* ダークモード対応 */
dark:bg-gray-800 dark:text-white
```

#### アニメーション
```css
/* トランジション */
transition-colors duration-200
transition-all duration-200 transform hover:scale-105

/* アニメーション */
animate-pulse
animate-spin
animate-ping
```

---

## コンポーネント設計原則

### **1. 単一責任の原則**
各コンポーネントは一つの責任を持つ
- AuthForm: 認証のみ
- VoiceRecorder: 音声録音のみ
- UserProfile: ユーザー情報表示のみ

### **2. 再利用性**
共通機能はコンポーネント化
- AuthWrapper: 認証保護の共通化
- SplashScreen: ローディング表示の共通化

### **3. プロパティ設計**
明確なインターフェース定義
- 必須プロパティとオプションプロパティの分離
- TypeScript型定義の活用

### **4. 状態管理**
適切な状態管理の実装
- ローカル状態: useState
- グローバル状態: Context API
- 副作用: useEffect

### **5. エラーハンドリング**
適切なエラーハンドリング
- エラー状態の管理
- ユーザーフレンドリーなエラーメッセージ
- フォールバックUI

---

## テスト

### **コンポーネントテスト**
```typescript
// Jest + React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import AuthForm from '@/components/AuthForm';

test('ログインフォームが正しく表示される', () => {
  render(<AuthForm />);
  expect(screen.getByText('ログイン')).toBeInTheDocument();
});
```

### **統合テスト**
```typescript
// 認証フローのテスト
test('ユーザーがログインできる', async () => {
  render(<AuthWrapper><App /></AuthWrapper>);
  
  fireEvent.click(screen.getByText('ログイン'));
  fireEvent.change(screen.getByLabelText('メールアドレス'), {
    target: { value: 'test@example.com' }
  });
  fireEvent.change(screen.getByLabelText('パスワード'), {
    target: { value: 'password123' }
  });
  fireEvent.click(screen.getByText('ログイン'));
  
  await waitFor(() => {
    expect(screen.getByText('ログインに成功しました！')).toBeInTheDocument();
  });
});
```
