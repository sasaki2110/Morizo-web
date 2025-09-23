# Morizo Web - プロジェクト概要

Smart Pantry MVPのWebアプリケーション（チャットUI + 音声入力）

## プロジェクト構成

- **Morizo-web** - Next.js 15 Webアプリ（このリポジトリ）
- **Morizo-ai** - Python AIエージェント（別リポジトリ）
- **Morizo-mobile** - Expo モバイルアプリ（別リポジトリ）

## サービス構成

- **morizo-web** - Next.js 15環境（ポート3000）
- **morizo-mobile** - Expo環境（ポート8081, 19000-19001, 19006）
- **morizo-ai** - Python AI環境（ポート8000）

## クラウドサービス

- **AWS EC2** - メインサーバー（Next.js + Python AI）
- **Supabase** - 認証・データベース・リアルタイム機能（クラウド）
- **OpenAI API** - LLM・音声認識（GPT-4, Whisper）

## セットアップ

### 1. 依存関係のインストール

```bash
# 依存関係をインストール
npm install
```

### 2. 環境変数の設定

```bash
# 環境変数ファイルの作成
cp .env.example .env.local

# 必要な環境変数を設定
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
# OPENAI_API_KEY=your-openai-api-key
```

### 3. 開発サーバーの起動

```bash
# Next.js 開発サーバーを起動
npm run dev
```

## 機能

### 認証機能
- Supabase認証（メール/パスワード、Google認証）
- 認証状態の管理
- 認証付きAPI呼び出し

### 音声入力
- Web Speech API による音声認識
- 自然言語での食材管理コマンド
- 音声データのPython AIエージェントへの送信

### チャットUI
- リアルタイムチャットインターフェース
- AIエージェントとの対話
- レシピ提案の表示

### API連携
- Python AIエージェント（localhost:8000）との通信
- Supabase（認証・データベース）との連携
- OpenAI API（音声認識・LLM）の活用

## アクセス先

- **Webアプリ**: http://localhost:3000
- **AI API**: http://localhost:8000
- **Expo DevTools**: http://localhost:19000
- **Supabase**: クラウド（認証・DB・リアルタイム）
- **OpenAI API**: クラウド（LLM・音声認識）

## 開発コマンド

```bash
# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# 本番サーバーの起動
npm run start

# リンター
npm run lint

# TypeScript型チェック
npm run type-check
```

## プロジェクト全体の起動

```bash
# ターミナル1: Next.js Webアプリ（このリポジトリ）
npm run dev

# ターミナル2: Python AIエージェント（別リポジトリ）
cd ../Morizo-ai
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **認証**: Supabase Auth
- **データベース**: Supabase PostgreSQL
- **音声認識**: Web Speech API
- **AI連携**: Python FastAPI (別リポジトリ)

## アーキテクチャ

```
Next.js (このリポジトリ)
├── チャットUI
├── 音声入力
├── 認証管理
└── API Routes
    ↓ HTTP API (localhost:8000)
Python AI (Morizo-ai リポジトリ)
    ↓
Supabase (認証 + データベース)
    ↓
OpenAI API (GPT-4 + Whisper)
```

## 関連リポジトリ

- **[Morizo-ai](../Morizo-ai)**: Python AIエージェント
- **[Morizo-mobile](../Morizo-mobile)**: Expo モバイルアプリ
