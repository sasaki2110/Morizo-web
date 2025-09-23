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
1. Supabase Dashboard → Authentication → Settings
2. Site URL: `http://localhost:3000`
3. Redirect URLs: `http://localhost:3000/**`
4. Google認証を有効にする場合：
   - Google OAuth設定を追加
   - Client IDとClient Secretを設定

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
