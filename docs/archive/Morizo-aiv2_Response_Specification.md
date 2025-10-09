# Morizo-aiv2 レスポンス仕様書

## 概要
フロントエンド（Morizo-web）が期待するレスポンス形式の仕様書です。
Morizo-aiv2は以下の形式でレスポンスを返す必要があります。

## 1. 通常のチャットAPIレスポンス (`/chat`)

### 成功時のレスポンス形式
```json
{
  "response": "実際のAIレスポンスメッセージ",
  "success": true
}
```

### エラー時のレスポンス形式
```json
{
  "error": "エラーメッセージ",
  "success": false
}
```

## 2. ストリーミングAPIレスポンス (`/chat/stream/{sseSessionId}`)

### SSEメッセージ形式
すべてのSSEメッセージは以下の基本構造を持ちます：

```json
{
  "type": "メッセージタイプ",
  "sse_session_id": "セッションID",
  "timestamp": "2025-01-27T12:00:00.000Z",
  "message": "メッセージ内容",
  "progress": {
    "completed_tasks": 0,
    "total_tasks": 0,
    "progress_percentage": 0,
    "current_task": "",
    "remaining_tasks": 0,
    "is_complete": false
  }
}
```

### メッセージタイプ別の詳細仕様

#### 2.1 `start` - 処理開始
```json
{
  "type": "start",
  "sse_session_id": "66f958f4-170f-48be-99c9-7a7f66dc48c6",
  "timestamp": "2025-01-27T12:00:00.000Z",
  "message": "処理を開始します",
  "progress": {
    "completed_tasks": 0,
    "total_tasks": 4,
    "progress_percentage": 0,
    "current_task": "リクエストを受信",
    "remaining_tasks": 4,
    "is_complete": false
  }
}
```

#### 2.2 `progress` - 進捗更新
```json
{
  "type": "progress",
  "sse_session_id": "66f958f4-170f-48be-99c9-7a7f66dc48c6",
  "timestamp": "2025-01-27T12:00:01.000Z",
  "message": "リクエストを処理中...",
  "progress": {
    "completed_tasks": 1,
    "total_tasks": 4,
    "progress_percentage": 25,
    "current_task": "AI処理中",
    "remaining_tasks": 3,
    "is_complete": false
  }
}
```

#### 2.3 `complete` - 処理完了 ⭐ **最重要**
```json
{
  "type": "complete",
  "sse_session_id": "66f958f4-170f-48be-99c9-7a7f66dc48c6",
  "timestamp": "2025-01-27T12:00:05.000Z",
  "message": "処理が完了しました",
  "progress": {
    "completed_tasks": 4,
    "total_tasks": 4,
    "progress_percentage": 100,
    "current_task": "完了",
    "remaining_tasks": 0,
    "is_complete": true
  },
  "result": {
    "response": "実際のAIレスポンスメッセージ"
  }
}
```

**重要**: `result.response`フィールドに実際のAIレスポンスを設定してください。
これがフロントエンドで表示されるメッセージになります。

#### 2.4 `error` - エラー発生
```json
{
  "type": "error",
  "sse_session_id": "66f958f4-170f-48be-99c9-7a7f66dc48c6",
  "timestamp": "2025-01-27T12:00:03.000Z",
  "message": "エラーが発生しました",
  "progress": {
    "completed_tasks": 2,
    "total_tasks": 4,
    "progress_percentage": 50,
    "current_task": "エラー発生",
    "remaining_tasks": 2,
    "is_complete": false
  },
  "error": {
    "code": "PROCESSING_ERROR",
    "message": "詳細なエラーメッセージ",
    "details": "エラーの詳細情報（オプション）"
  }
}
```

#### 2.5 `timeout` - タイムアウト
```json
{
  "type": "timeout",
  "sse_session_id": "66f958f4-170f-48be-99c9-7a7f66dc48c6",
  "timestamp": "2025-01-27T12:03:00.000Z",
  "message": "処理がタイムアウトしました",
  "progress": {
    "completed_tasks": 2,
    "total_tasks": 4,
    "progress_percentage": 50,
    "current_task": "タイムアウト",
    "remaining_tasks": 2,
    "is_complete": false
  }
}
```

## 3. 現在の問題と解決方法

### 問題の詳細
現在、Morizo-aiv2から以下のメッセージが送信されています：
```
"タスクが完了しましたが、結果を取得できませんでした。"
```

しかし、フロントエンドは`result.response`フィールドを期待しているため、フォールバック値「処理が完了しました」が表示されています。

### 解決方法
`complete`メッセージの`result.response`フィールドに実際のAIレスポンスを設定してください：

```json
{
  "type": "complete",
  "message": "処理が完了しました",
  "result": {
    "response": "こんにちは！何かお手伝いできることはありますか？"
  }
}
```

## 4. レシピ表示機能の対応

### レシピレスポンスの形式
レシピ表示機能を使用する場合は、以下の形式でレスポンスを返してください：

```
📝 斬新な提案

🍖 **サーモンのムース風パテ**: [サーモンムースの作り方](https://cookpad.com/recipe/1234567) [フレンチ風サーモンパテ](https://delishkitchen.tv/recipes/2345678)

🥗 **アボカドとトマトのサラダ**: [アボカドサラダの基本](https://cookpad.com/recipe/3456789) [トマトとアボカドの組み合わせ](https://delishkitchen.tv/recipes/4567890)

🍵 **コンソメスープ**: [コンソメスープの作り方](https://cookpad.com/recipe/5678901) [フレンチコンソメ](https://delishkitchen.tv/recipes/6789012)

📚 伝統的な提案

🍖 **生姜焼き**: [生姜焼きの基本レシピ](https://cookpad.com/recipe/7890123) [本格生姜焼き](https://delishkitchen.tv/recipes/8901234)

🥗 **ほうれん草のお浸し**: [お浸しの作り方](https://cookpad.com/recipe/9012345) [本格お浸し](https://delishkitchen.tv/recipes/0123456)

🍵 **味噌汁**: [味噌汁の基本](https://cookpad.com/recipe/1234567) [本格味噌汁](https://delishkitchen.tv/recipes/2345678)
```

## 5. 実装チェックリスト

### 必須実装項目
- [ ] `complete`メッセージに`result.response`フィールドを追加
- [ ] 実際のAIレスポンスを`result.response`に設定
- [ ] エラーハンドリングの実装
- [ ] タイムアウト処理の実装

### 推奨実装項目
- [ ] `connected`メッセージタイプの対応（現在は警告レベル）
- [ ] より詳細な進捗メッセージ
- [ ] エラーコードの標準化

## 6. テスト方法

### フロントエンドでの確認方法
1. ブラウザの開発者ツールを開く
2. コンソールタブでログを確認
3. 以下のログが表示されることを確認：
   ```
   ストリーミングメッセージ受信: { type: "complete", result: { response: "実際のメッセージ" } }
   ```

### 期待される結果
- フロントエンドに「処理が完了しました」ではなく、実際のAIレスポンスが表示される
- レシピ表示機能が正常に動作する

## 7. 連絡先

この仕様書について質問がある場合は、フロントエンド開発チームまでお問い合わせください。

---
**作成日**: 2025年1月27日  
**対象**: Morizo-aiv2開発チーム  
**作成者**: Morizo-web開発チーム
