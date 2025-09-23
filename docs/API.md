# Morizo Web - API仕様

## 概要

Morizo WebアプリケーションのAPI仕様書。Next.js 15 App RouterのAPI Routesと外部API連携について記載。

## 内部API Routes

### **POST /api/chat**

Morizo AIエージェントとのチャット通信を行うエンドポイント。

#### リクエスト
```typescript
{
  message: string
}
```

#### レスポンス
```typescript
{
  response: string,
  success: boolean
}
```

#### エラーレスポンス
```typescript
{
  error: string,
  details?: string
}
```

#### 認証
- Supabase JWT トークンが必要
- Authorization: Bearer {token}

#### 処理フロー
1. リクエスト認証チェック
2. Morizo AI (localhost:8000/chat) に転送
3. 認証トークンを付与してリクエスト
4. レスポンスを整形して返却

---

### **POST /api/whisper**

OpenAI Whisper APIを使用した音声認識エンドポイント。

#### リクエスト
- Content-Type: multipart/form-data
- audio: File (音声ファイル)

#### レスポンス
```typescript
{
  text: string,
  success: boolean
}
```

#### エラーレスポンス
```typescript
{
  error: string,
  details?: string
}
```

#### 処理フロー
1. FormDataから音声ファイルを取得
2. OpenAI Whisper APIに送信
3. 日本語音声認識を実行
4. テキスト結果を返却

#### Whisper API設定
- Model: whisper-1
- Language: ja (日本語)
- Response Format: text

---

### **GET /api/test**

API接続テスト用エンドポイント。

#### レスポンス
```typescript
{
  message: string,
  timestamp: string,
  status: string
}
```

## 外部API連携

### **Morizo AI API**

#### エンドポイント
- Base URL: http://localhost:8000
- Chat: POST /chat

#### 認証
- Bearer Token認証
- Supabase JWT トークンを使用

#### リクエスト例
```typescript
POST http://localhost:8000/chat
Authorization: Bearer {supabase_jwt_token}
Content-Type: application/json

{
  "message": "牛乳を2本、冷蔵庫に追加して"
}
```

#### レスポンス例
```typescript
{
  "response": "牛乳を2本、冷蔵庫に追加しました！",
  "success": true
}
```

---

### **OpenAI API**

#### Whisper API
- エンドポイント: https://api.openai.com/v1/audio/transcriptions
- 認証: Bearer {openai_api_key}
- モデル: whisper-1

#### リクエスト例
```typescript
POST https://api.openai.com/v1/audio/transcriptions
Authorization: Bearer {openai_api_key}
Content-Type: multipart/form-data

{
  "file": audio_file,
  "model": "whisper-1",
  "language": "ja",
  "response_format": "text"
}
```

---

### **Supabase API**

#### 認証API
- エンドポイント: {supabase_url}/auth/v1/
- 認証: Bearer {supabase_anon_key}

#### データベースAPI
- エンドポイント: {supabase_url}/rest/v1/
- 認証: Bearer {supabase_jwt_token}

## 認証フロー

### **1. ユーザー認証**
```
ユーザー → AuthForm → Supabase Auth → JWT Token → AuthContext
```

### **2. API認証**
```
フロントエンド → JWT Token → auth-server.ts → Morizo AI (Bearer Token)
```

### **3. 認証チェック**
```typescript
// auth-server.ts
export async function authenticateRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  
  // Supabaseでトークン検証
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
  }
  
  return { token, user };
}
```

## エラーハンドリング

### **HTTPステータスコード**
- 200: 成功
- 400: リクエストエラー
- 401: 認証エラー
- 500: サーバーエラー

### **エラーレスポンス形式**
```typescript
{
  error: string,        // エラーメッセージ
  details?: string     // 詳細情報（開発時のみ）
}
```

### **エラーハンドリング例**
```typescript
try {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message })
  });
  
  if (!response.ok) {
    throw new Error(`API エラー: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error('API呼び出しエラー:', error);
  throw error;
}
```

## 環境変数

### **必要な環境変数**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Morizo AI
MORIZO_AI_URL=http://localhost:8000
```

### **環境変数の使用**
```typescript
// クライアントサイド
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// サーバーサイド
const openaiApiKey = process.env.OPENAI_API_KEY;
const morizoAiUrl = process.env.MORIZO_AI_URL;
```

## セキュリティ

### **認証・認可**
- Supabase Row Level Security (RLS)
- JWT トークンベース認証
- API認証の二重チェック

### **データ保護**
- HTTPS通信の強制
- 環境変数による機密情報管理
- CORS設定

### **入力検証**
- TypeScript型チェック
- リクエストボディの検証
- ファイルサイズ制限

## パフォーマンス

### **最適化**
- レスポンスキャッシュ
- エラーレトライ
- タイムアウト設定

### **監視**
- API呼び出しログ
- エラーログ
- パフォーマンスメトリクス
