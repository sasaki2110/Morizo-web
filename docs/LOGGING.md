# Morizo Web - ロギング設定

## 概要

Morizo Webアプリケーションのロギングシステム設定ファイル。
**Morizo-mobile実装時の参考資料として作成されています。**

## 実装完了機能

### ✅ **サーバーサイドロギング** (`lib/logging.ts`)
- ファイル出力 + コンソール出力
- ログローテーション（自動バックアップ）
- セキュリティ配慮（個人情報マスキング）
- パフォーマンス測定（タイマー機能）

### ✅ **クライアントサイドロギング** (`lib/client-logging.ts`)
- ブラウザコンソール出力
- 環境判定による適切な処理
- エラーハンドリング

### ✅ **統一ロギングインターフェース** (`lib/logging-utils.ts`)
- サーバー・クライアント自動判定
- 環境に応じた適切なログ出力
- エラー耐性のある実装

### ✅ **ログフォーマット最適化**
- カテゴリ・レベル5文字パディング
- 視認性の高い整列フォーマット
- 絵文字による視覚的識別

## 環境変数

### **ログレベル設定**
```bash
# ログレベル (0=DEBUG, 1=INFO, 2=WARN, 3=ERROR)
LOG_LEVEL=1

# コンソール出力の有効/無効
LOG_CONSOLE=true

# ファイル出力の有効/無効
LOG_FILE=true
```

### **ログファイル設定**
```bash
# ログファイル名
LOG_FILE_NAME=morizo_web.log

# 最大ファイルサイズ (MB)
LOG_MAX_FILE_SIZE=10

# 最大ファイル数
LOG_MAX_FILES=5
```

## ログカテゴリ

### **MAIN**
- アプリケーション起動・終了
- モジュール初期化
- 全般的な処理フロー

### **AUTH**
- 認証・認可処理
- ログイン・ログアウト
- トークン検証
- セキュリティ関連

### **API**
- API呼び出し
- リクエスト・レスポンス
- 外部サービス連携
- エラーハンドリング

### **VOICE**
- 音声録音
- Whisper API連携
- 音声認識処理
- 音声エラー

### **CHAT**
- チャットメッセージ
- AI応答
- チャットエラー
- セッション管理

### **SESSION**
- セッション開始・終了
- セッション更新
- セッションエラー

### **COMPONENT**
- Reactコンポーネント
- UI操作
- ユーザーインタラクション

## ログフォーマット

### **標準フォーマット（パディング適用済み）**
```
YYYY-MM-DDTHH:mm:ss.sssZ - CATEGORY - LEVEL  - EMOJI MESSAGE | Data: {...}
```

### **実際の出力例**
```
2025-09-23T12:39:55.229Z - MAIN  - INFO  - ℹ️ 🚀 Morizo Web サーバーサイドロギングシステム初期化完了
2025-09-23T12:39:55.230Z - AUTH  - DEBUG - 🔍 認証トークン抽出開始
2025-09-23T12:39:55.417Z - AUTH  - INFO  - ℹ️ 認証成功 | Data: {"userId":"d0e0d523-1831-4541-bd67-f312386db951","emailMasked":"t*********1@gmail.com"}
2025-09-23T12:40:02.825Z - MAIN  - INFO  - ℹ️ Timer: chat-api | Data: {"duration":"7596ms"}
```

### **パディング仕様**
- **カテゴリ**: 5文字右パディング（`MAIN `, `API  `, `AUTH `, `VOICE`）
- **レベル**: 5文字右パディング（`INFO `, `DEBUG`, `WARN `, `ERROR`）
- **視認性**: 完璧に整列された読みやすいフォーマット

## セキュリティ

### **個人情報マスキング**
- メールアドレス: `t***@example.com`
- トークン: `eyJhbGciOiJIUzI1NiIs...`
- パスワード: 完全に除外

### **ログファイル保護**
- 適切なファイル権限設定
- 本番環境での機密情報除外
- ログローテーション

## パフォーマンス

### **非同期ログ**
- UIをブロックしない
- バックグラウンド処理
- エラーハンドリング

### **ログサイズ管理**
- 自動ローテーション
- 古いログの削除
- ディスク容量監視

## 監視・アラート

### **エラー監視**
- エラー率の追跡
- 異常なエラー発生時のアラート
- パフォーマンス低下の検出

### **ログ分析**
- ユーザー行動分析
- 機能利用率
- エラーパターン分析

## 開発・本番環境

### **開発環境**
- コンソール + ファイル出力
- DEBUGレベル
- 詳細なログ

### **本番環境**
- ファイル出力のみ
- INFOレベル以上
- 機密情報除外

## Morizo-mobile実装時の参考情報

### **ファイル構成**
```
lib/
├── logging.ts          # サーバーサイドロギング（Node.js環境）
├── client-logging.ts   # クライアントサイドロギング（ブラウザ環境）
└── logging-utils.ts    # 統一インターフェース（環境自動判定）

logs/
├── morizo_web.log      # 現在のログファイル
└── morizo_web.log.1    # バックアップログファイル
```

### **実装のポイント**

#### **1. 環境分離**
- **サーバーサイド**: `fs`モジュール使用、ファイル出力
- **クライアントサイド**: `console`使用、ブラウザ出力
- **統一インターフェース**: `typeof window !== 'undefined'`で環境判定

#### **2. エラー耐性**
```typescript
// ServerLogger呼び出し時のtry-catch
try {
  ServerLogger.info(LogCategory.API, 'API呼び出し開始');
} catch (error) {
  console.error('ログ初期化エラー:', error);
}
```

#### **3. パディング実装**
```typescript
const paddedCategory = category.padEnd(5, ' ');
const paddedLevel = levelName.padEnd(5, ' ');
```

### **使用方法**

#### **基本的な使用方法**
```typescript
import { log, LogCategory } from '@/lib/logging-utils';

// 情報ログ
log.info(LogCategory.API, 'API呼び出し開始');

// エラーログ
log.error(LogCategory.AUTH, '認証失敗', { error: 'Invalid token' });

// パフォーマンス測定
const timer = log.timer('api-call');
// ... 処理 ...
timer();
```

#### **専用ログ関数**
```typescript
import { logAuth, logVoice, logChat } from '@/lib/logging-utils';

// 認証ログ
logAuth('login', 'user@example.com', true);

// 音声ログ
logVoice('start_recording');

// チャットログ
logChat('message_sent', 150);
```

## トラブルシューティング

### **ログが出力されない場合**
1. 環境変数 `LOG_LEVEL` を確認
2. ログファイルの権限を確認
3. ディスク容量を確認

### **ログファイルが大きくなりすぎる場合**
1. `LOG_MAX_FILE_SIZE` を調整
2. ログローテーション設定を確認
3. 古いログファイルを手動削除

### **パフォーマンス問題**
1. ログレベルを上げる（DEBUG → INFO）
2. コンソール出力を無効化
3. ログ出力頻度を調整
