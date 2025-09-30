# Morizo Web - アーキテクチャ設計

## 全体アーキテクチャ

### **現在のアーキテクチャ（Next.js 15 App Router）**
```
Morizo Web Application
├── Frontend (Next.js 15)
│   ├── App Router
│   │   ├── app/page.tsx (メインページ)
│   │   ├── app/layout.tsx (ルートレイアウト)
│   │   └── app/api/ (API Routes)
│   │       ├── chat/route.ts (チャットAPI)
│   │       ├── whisper/route.ts (音声認識API)
│   │       └── test/route.ts (テストAPI)
│   ├── Components
│   │   ├── AuthForm.tsx (認証フォーム)
│   │   ├── AuthWrapper.tsx (認証ラッパー)
│   │   ├── UserProfile.tsx (ユーザープロフィール)
│   │   ├── VoiceRecorder.tsx (音声録音)
│   │   └── SplashScreen.tsx (スプラッシュ画面)
│   ├── Contexts
│   │   └── AuthContext.tsx (認証状態管理)
│   └── Lib
│       ├── auth.ts (認証ユーティリティ)
│       ├── auth-server.ts (サーバーサイド認証)
│       ├── supabase.ts (Supabaseクライアント)
│       ├── supabase-server.ts (サーバーサイドSupabase)
│       └── audio.ts (音声処理)
├── External Services
│   ├── Morizo AI (Python FastAPI - localhost:8000)
│   ├── Supabase (認証・データベース)
│   └── OpenAI API (Whisper・GPT-4)
└── Styling
    └── Tailwind CSS
```

## データフロー

### **1. 認証フロー**
```
ユーザー → AuthForm → Supabase Auth → AuthContext → AuthWrapper → メインアプリ
```

### **2. 音声チャットフロー**
```
ユーザー音声 → VoiceRecorder → WebAudioRecorder → /api/whisper → OpenAI Whisper → テキスト変換 → /api/chat → Morizo AI → レスポンス表示
```

### **3. テキストチャットフロー**
```
ユーザー入力 → テキストフィールド → /api/chat → Morizo AI → レスポンス表示
```

### **4. API認証フロー**
```
フロントエンド → Supabase認証トークン → auth-server.ts → Morizo AI (Bearer Token) → レスポンス
```

## コンポーネント設計

### **ページコンポーネント**
- **app/page.tsx**: メインページ（チャットUI、音声入力、認証トークン表示、APIテスト、Markdownレンダリング）

### **認証コンポーネント**
- **AuthForm.tsx**: ログイン・サインアップフォーム
- **AuthWrapper.tsx**: 認証状態に基づくページ保護
- **UserProfile.tsx**: ユーザー情報表示・ログアウト

### **機能コンポーネント**
- **VoiceRecorder.tsx**: 音声録音・Whisper API連携
- **SplashScreen.tsx**: ローディング画面

### **コンテキスト**
- **AuthContext.tsx**: 認証状態のグローバル管理

## API設計

### **内部API Routes**
- **POST /api/chat**: Morizo AIとのチャット通信
- **POST /api/whisper**: OpenAI Whisper音声認識
- **GET /api/test**: API接続テスト

### **外部API連携**
- **Morizo AI**: http://localhost:8000/chat
- **OpenAI Whisper**: 音声→テキスト変換
- **Supabase**: 認証・データベース操作

## 認証システム

### **Supabase認証**
- メール/パスワード認証
- Google OAuth認証
- JWT トークンベース認証

### **認証フロー**
1. ユーザーがAuthFormでログイン
2. Supabaseが認証処理
3. AuthContextが認証状態を管理
4. AuthWrapperがページアクセスを制御
5. API呼び出し時にJWTトークンを付与

## 音声処理システム

### **WebAudioRecorder**
- Web Audio APIを使用した音声録音
- WebM形式での音声データ取得
- ブラウザ互換性チェック

### **Whisper API連携**
- OpenAI Whisper-1モデル使用
- 日本語音声認識対応
- リアルタイム音声→テキスト変換

## Markdownレンダリングシステム

### **ReactMarkdown統合**
- AIからの回答を美しく表示
- 基本的なMarkdown記法サポート
- Tailwind CSSのproseクラス連携

### **対応機能**
- 見出し（H1-H6）
- 強調（**太字**）
- リスト（番号付き・箇条書き）
- 段落・改行
- インラインコード

### **スタイリング**
- ダークモード対応
- レスポンシブデザイン
- カスタムカラーパレット
- 統一されたタイポグラフィ

## 状態管理

### **認証状態**
- AuthContextによるグローバル状態管理
- セッション永続化
- 認証状態のリアルタイム更新

### **チャット状態**
- ローカル状態（useState）でチャット履歴管理
- ユーザーメッセージとAIレスポンスの分離
- ローディング状態の管理

## スタイリング

### **Tailwind CSS**
- ユーティリティファーストCSS
- ダークモード対応
- レスポンシブデザイン
- カスタムカラーパレット

### **デザインシステム**
- 統一されたカラースキーム
- 一貫したスペーシング
- アクセシビリティ対応

## セキュリティ

### **認証・認可**
- Supabase Row Level Security (RLS)
- JWT トークンベース認証
- API認証の二重チェック

### **データ保護**
- 環境変数による機密情報管理
- HTTPS通信
- CORS設定

## パフォーマンス

### **最適化**
- Next.js 15 App Router
- サーバーサイドレンダリング
- 静的生成の活用
- 画像最適化

### **バンドル最適化**
- Tree Shaking
- コード分割
- 動的インポート

## 拡張性

### **モジュラー設計**
- コンポーネント分離
- API Routes分離
- ユーティリティ関数分離

### **将来の拡張**
- PWA対応
- オフライン機能
- プッシュ通知
- リアルタイム機能

## 開発・デプロイ

### **開発環境**
- Next.js 開発サーバー
- TypeScript型チェック
- ESLint静的解析
- Hot Reload

### **本番環境**
- Vercel/Netlifyデプロイ
- 環境変数管理
- パフォーマンス監視
- エラートラッキング
