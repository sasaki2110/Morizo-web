# Morizo - 開発環境

この環境は、morizo-web Next.js 15 web アプリ開発環境です。

3つのリポジトリに対応したDocker開発環境

## リポジトリ構成

- **morizo** - この開発環境構築用リポジトリ
- **morizo-web** - Next.js 15 Webアプリ（Vercelデプロイ用）
- **morizo-mobile** - Expo モバイルアプリ（API呼び出し用）

## サービス構成

- **morizo-web** - Next.js 15環境（ポート3000）
- **morizo-mobile** - Expo環境（ポート8081, 19000-19001, 19006）
- **morizo-postgres** - PostgreSQL（ポート5432）
- **morizo-redis** - Redis（ポート6379）
- **morizo-supabase** - Supabase（ポート5433）

## セットアップ

### 1. 環境変数の設定

```bash
# 環境変数テンプレートをコピー
cp .env.example .env
```

**`.env`ファイルの編集：**

最低限、以下の設定が必要です：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# データベース設定
DATABASE_URL=postgresql://postgres:password@localhost:5432/morizo
REDIS_URL=redis://localhost:6379

# 開発設定
NODE_ENV=development
JWT_SECRET=your-jwt-secret-key-here # ここでJWT_SECRETは設定不要です。メモとして記述してあります。
```

**JWT_SECRETの生成方法：**

```bash
# 方法1: OpenSSLを使用（推奨）
openssl rand -base64 64

# 方法2: Node.jsを使用
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# 方法3: オンラインツール
# https://generate-secret.vercel.app/32
```

**注意：**
- JWT_SECRETは64文字以上のランダムな文字列を使用
- 本番環境では、より強力な秘密鍵を生成してください
- 生成された文字列をそのまま`.env`ファイルに貼り付けてください

### 2. 開発環境の起動

```bash
# Docker Composeで開発環境を起動
cd docker
docker-compose up -d
```

### 3. アプリケーションの作成

#### Webアプリ（morizo-web）

```bash
# Webコンテナに接続
docker-compose exec morizo-web bash

# /app フォルダで Next.js 15アプリを作成
cd /app
npx create-next-app@latest . --typescript --tailwind --eslint --app

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

#### モバイルアプリ（morizo-mobile）

```bash
# モバイルコンテナに接続
docker-compose exec morizo-mobile bash

# /app フォルダで Expoアプリを作成
cd /app
npx create-expo-app@latest . --template blank-typescript

# 依存関係をインストール
npm install

# 開発サーバーを起動
# Expo Goで実機確認する場合（Android/iOS端末）
npx expo start --tunnel

# Webブラウザで簡易確認する場合
npx expo start --web
```

## アクセス先

- **Webアプリ**: http://localhost:3000
- **Expo DevTools**: http://localhost:19000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Supabase**: localhost:5433

## 開発コマンド

```bash
# 開発環境の起動
docker-compose up -d

# 開発環境の停止
docker-compose down

# ログの確認
docker-compose logs -f

# 特定のサービスのログ
docker-compose logs -f morizo-web
docker-compose logs -f morizo-mobile
```

## 注意事項

- WebアプリはVercelにデプロイ可能
- モバイルアプリはWebアプリのAPIを呼び出す
- 各アプリは独立したコンテナで動作
- データベースは共有される