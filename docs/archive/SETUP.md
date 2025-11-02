# Morizo Web - セットアップ手順

## 前提条件

### **必要なソフトウェア**
- Node.js 18.0.0以上
- npm または yarn
- Git
- テキストエディタ（VS Code推奨）

### **必要なアカウント**
- Supabaseアカウント
- OpenAI APIアカウント

## 1. プロジェクトのクローン

```bash
# リポジトリをクローン
git clone <repository-url>
cd Morizo-web

# 依存関係をインストール
npm install
```

## 2. 環境変数の設定

### **環境変数ファイルの作成**
```bash
# .env.localファイルを作成
cp .env.example .env.local
```

### **必要な環境変数**
```bash
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenAI API設定
OPENAI_API_KEY=your-openai-api-key

# Morizo AI設定（オプション）
MORIZO_AI_URL=http://localhost:8000
```

### **環境変数の取得方法**

#### **Supabase設定**
1. [Supabase](https://supabase.com)にログイン
2. プロジェクトを作成または選択
3. Settings → API から以下を取得：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### **OpenAI API設定**
1. [OpenAI Platform](https://platform.openai.com)にログイン
2. API Keys から新しいキーを作成
3. 作成したキーを `OPENAI_API_KEY` に設定

## 3. Supabaseデータベース設定

### **テーブル作成**
```sql
-- 在庫管理テーブル
CREATE TABLE inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT '個',
  storage_location TEXT NOT NULL DEFAULT '冷蔵庫',
  purchase_date DATE,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security設定
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view own inventory" ON inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory" ON inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory" ON inventory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory" ON inventory
  FOR DELETE USING (auth.uid() = user_id);
```

### **認証設定**

#### **基本設定**
1. Supabase Dashboard → Authentication → Settings
2. Site URL: `http://localhost:3000`（開発環境）
3. Redirect URLs: `http://localhost:3000/**`

#### **Google認証の有効化（オプション）**

Google認証を有効にする場合は、以下の手順に従って設定してください。

**注意**: Google CloudのOAuth 2.0クライアント作成は**無料**です。認証のみの用途であれば追加費用はかかりません。

##### **手順1: Google Cloud Consoleでの設定**

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
   - 新規作成する場合: 「プロジェクトを選択」→「新しいプロジェクト」→プロジェクト名を入力→「作成」
3. 「APIとサービス」→「認証情報」に移動
   - 左側メニューから「認証情報」を選択
4. **OAuth同意画面の設定**（初回のみ必要）:
   - 「APIとサービス」→「OAuth同意画面」を選択
   - 「Google Auth Platform はまだ構成されていません」という画面が表示された場合、「開始」ボタンをクリック
   - 以下の情報を入力：
     - **ユーザータイプ**: 「外部」を選択（一般ユーザーがアクセス可能にする場合）
       - 注意: 「内部」はGoogle Workspace組織内のユーザーのみアクセス可能
     - **アプリ名**: アプリ名を入力（例: "Morizo Web"）
       - ユーザーのログイン画面に表示されます
     - **ユーザーサポートメール**: あなたのメールアドレスを選択
     - **デベロッパーの連絡先情報**: メールアドレスを入力
   - 「保存して次へ」をクリック
   - **スコープ**: デフォルトのまま（基本プロフィール情報のみ）で「保存して次へ」
   - **テストユーザー**: 公開前にテストする場合は追加（オプション）→「保存して次へ」→「ダッシュボードに戻る」

5. **OAuth 2.0 クライアント ID の作成**:
   - 「APIとサービス」→「認証情報」に移動
   - 「認証情報を作成」ボタンをクリック→「OAuth 2.0 クライアント ID」を選択
   - **アプリケーションの種類**: 「Web アプリケーション」を選択
   - **名前**: 任意の名前（例: "Morizo Web OAuth Client"）
   - **承認済みのリダイレクト URI**に以下を追加：
     ```
     https://<your-project-id>.supabase.co/auth/v1/callback
     ```
     - `<your-project-id>`はSupabaseプロジェクトのID（Supabase Dashboard → Settings → API で確認可能）
     - 例: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
   - 「作成」をクリック
   - **クライアント ID**と**クライアント シークレット**をコピーして保存（後で使用します）

##### **手順2: Supabaseでの設定**

1. [Supabase Dashboard](https://app.supabase.com/)にアクセス
2. プロジェクトを選択
3. 左メニューから「Authentication」→「Providers」を選択
4. プロバイダー一覧から「Google」をクリック
5. 「Enable Google provider」トグルを ON にする
6. 以下を入力：
   - **Client ID (for OAuth)**: Google Cloud Consoleでコピーしたクライアント ID
   - **Client Secret (for OAuth)**: Google Cloud Consoleでコピーしたクライアント シークレット
7. 「Save」をクリック

##### **動作確認**

1. ブラウザで `http://localhost:3000` にアクセス
2. 「Googleでログイン」ボタンをクリック
3. Googleアカウントの選択画面が表示されることを確認
4. ログイン後、アプリに戻って認証が成功することを確認

##### **本番環境での設定**

本番環境でもGoogle認証を使用する場合：

1. **Google Cloud Console**:
   - 本番環境用のOAuth 2.0クライアントIDを作成（または既存のものを使用）
   - 承認済みのリダイレクト URIに本番URLを追加：
     ```
     https://<your-production-domain>/auth/v1/callback
     ```

2. **Supabase**:
   - 本番環境用のSupabaseプロジェクトで上記手順を繰り返す
   - または、開発環境と同じクライアントID/シークレットを使用する場合は、リダイレクトURIに本番URLを追加

##### **モバイルアプリ（iOS/Android）でのGoogle認証設定**

モバイルアプリでもGoogle認証を使用する場合の設定方法です。

**重要**: SupabaseのGoogleプロバイダー設定では、1つのクライアントIDとシークレットしか登録できません。以下の2つの方法があります。

###### **方法1: 同じWebアプリケーション用クライアントIDを使用（推奨：簡単）**

多くの場合、Webアプリケーション用に作成したOAuthクライアントIDを、そのままモバイルアプリでも使用できます。

**Google Cloud Consoleでの設定**:
1. 既存のWebアプリケーション用OAuthクライアントIDを選択
2. 「承認済みのリダイレクト URI」に以下を追加：
   - **Android用**: `com.your.package.name:/` （カスタムスキーム）
   - **iOS用**: `com.your.bundle.id:/` （カスタムスキーム）
   - または、Supabaseが提供するモバイル用リダイレクトURI

**Supabaseでの設定**:
- 既に設定済みのWebアプリケーション用のクライアントIDとシークレットをそのまま使用

**モバイルアプリ側での実装**:
- SupabaseのモバイルSDK（Expo/React Native）を使用する場合、自動的に適切なリダイレクトURIを処理します
- 追加設定は通常不要です

###### **方法2: プラットフォーム別のOAuthクライアントIDを作成（高度）**

プラットフォームごとに異なるクライアントIDを作成する場合：

**Google Cloud Consoleでの設定**:

1. **Android用OAuthクライアントID**:
   - 「認証情報を作成」→「OAuth 2.0 クライアント ID」
   - **アプリケーションの種類**: 「Android」を選択
   - **名前**: 任意（例: "Morizo Mobile Android"）
   - **パッケージ名**: モバイルアプリのパッケージ名（例: `com.morizo.app`）
   - **SHA-1証明書フィンガープリント**: アプリの署名証明書のSHA-1を入力
   - クライアントIDをコピー

2. **iOS用OAuthクライアントID**:
   - 「認証情報を作成」→「OAuth 2.0 クライアント ID」
   - **アプリケーションの種類**: 「iOS」を選択
   - **名前**: 任意（例: "Morizo Mobile iOS"）
   - **Bundle ID**: iOSアプリのBundle ID（例: `com.morizo.app`）
   - クライアントIDをコピー

**Supabaseでの設定**:
- **注意**: SupabaseのGoogleプロバイダー設定では1つのクライアントIDしか登録できないため、Webアプリケーション用のクライアントIDを優先的に使用します
- モバイルアプリ用のクライアントIDは、モバイルアプリ側で直接使用する必要がある場合があります

**実装上の考慮事項**:
- Expo/React Nativeを使用している場合、`@supabase/supabase-js`と`expo-auth-session`などのライブラリを使用
- プラットフォーム固有のクライアントIDを使用する場合は、モバイルアプリ側で直接OAuthフローを実装する必要がある場合があります

**推奨**: まずは**方法1**（同じWebアプリケーション用クライアントIDを使用）を試してください。SupabaseのモバイルSDKが適切にリダイレクトURIを処理するため、多くの場合そのまま動作します。

##### **トラブルシューティング**

- **エラー: redirect_uri_mismatch**: Google Cloud ConsoleのリダイレクトURI設定を確認
- **エラー: invalid_client**: クライアントIDとシークレットが正しいか確認
- **同意画面エラー**: Google Cloud Consoleの同意画面設定が完了しているか確認
- **モバイルで認証できない**: Webアプリケーション用のクライアントIDをそのまま使用できるか確認。できない場合は、プラットフォーム別のクライアントID作成を検討

## 4. 開発サーバーの起動

### **Next.js開発サーバー**
```bash
# 開発サーバーを起動
npm run dev

# ブラウザで http://localhost:3000 にアクセス
```

### **Morizo AIサーバー（別ターミナル）**
```bash
# Morizo AIディレクトリに移動
cd ../Morizo-ai

# 仮想環境をアクティベート
source venv/bin/activate

# AIサーバーを起動
uvicorn main:app --reload --port 8000
```

## 5. 動作確認

### **1. 認証テスト**
1. http://localhost:3000 にアクセス
2. 「アカウント作成」でユーザー登録
3. メール認証を完了
4. ログインしてユーザープロフィールが表示されることを確認

### **2. API接続テスト**
1. ログイン後、「API確認」ボタンをクリック
2. 成功レスポンスが表示されることを確認

### **3. 音声認識テスト**
1. 「Morizo AI 音声チャット」セクションで録音ボタンをクリック
2. 日本語で話しかける
3. 音声がテキストに変換されることを確認

### **4. チャット機能テスト**
1. テキスト入力または音声入力でメッセージを送信
2. Morizo AIからの応答が表示されることを確認

## 6. トラブルシューティング

### **よくある問題と解決方法**

#### **認証エラー**
```bash
# エラー: 認証に失敗しました
# 解決方法:
1. Supabaseの環境変数が正しく設定されているか確認
2. Supabaseプロジェクトがアクティブか確認
3. ブラウザのコンソールでエラーメッセージを確認
```

#### **API接続エラー**
```bash
# エラー: Morizo AIとの通信に失敗しました
# 解決方法:
1. Morizo AIサーバーが起動しているか確認 (http://localhost:8000)
2. ファイアウォール設定を確認
3. ネットワーク接続を確認
```

#### **音声認識エラー**
```bash
# エラー: 音声認識に失敗しました
# 解決方法:
1. OpenAI APIキーが正しく設定されているか確認
2. ブラウザが音声録音を許可しているか確認
3. マイクが正常に動作しているか確認
```

#### **環境変数エラー**
```bash
# エラー: 環境変数が見つかりません
# 解決方法:
1. .env.localファイルが存在するか確認
2. 環境変数名が正しいか確認
3. サーバーを再起動
```

### **ログの確認**
```bash
# Next.js開発サーバーのログ
npm run dev

# ブラウザの開発者ツール
F12 → Console タブ

# Supabaseのログ
Supabase Dashboard → Logs
```

## 7. 本番環境へのデプロイ

### **Vercelデプロイ**
```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
vercel

# 環境変数を設定
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add OPENAI_API_KEY
```

### **環境変数の本番設定**
- Vercel Dashboard → Project Settings → Environment Variables
- 本番用のSupabase URLとキーを設定
- OpenAI APIキーを設定

### **Supabase本番設定**
- Site URL: `https://your-domain.vercel.app`
- Redirect URLs: `https://your-domain.vercel.app/**`

## 8. 開発時のベストプラクティス

### **コード品質**
```bash
# ESLintチェック
npm run lint

# TypeScript型チェック
npm run type-check

# ビルドテスト
npm run build
```

### **Git管理**
```bash
# .gitignoreに追加すべきファイル
.env.local
.env.production
.next/
node_modules/
```

### **セキュリティ**
- 環境変数は絶対にコミットしない
- APIキーは定期的にローテーション
- SupabaseのRLS設定を適切に行う

## 9. 追加設定

### **PWA対応**
```bash
# PWAプラグインをインストール
npm install next-pwa

# next.config.jsに設定を追加
const withPWA = require('next-pwa')({
  dest: 'public'
});

module.exports = withPWA({
  // 既存の設定
});
```

### **ダークモード対応**
- Tailwind CSSのdark:クラスを使用
- システム設定に応じた自動切り替え

### **国際化対応**
```bash
# next-i18nextをインストール
npm install next-i18next
```
