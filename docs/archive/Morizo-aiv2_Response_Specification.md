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

## 7. レシピ専用ビューアー対応（JSON形式）

### 7.1 概要
レシピ専用ビューアーを正確に表示するため、文字列解析に依存しないJSON形式でのデータ授受を実装します。
フロント側の既存データ構造に合わせた厳密なJSON形式でレスポンスを返してください。

### 7.2 フロント側のデータ構造
```typescript
interface MenuResponse {
  innovative: MenuSection;    // 斬新な提案
  traditional: MenuSection;   // 伝統的な提案
}

interface MenuSection {
  title: string;
  recipes: {
    main: RecipeCard[];      // 主菜
    side: RecipeCard[];      // 副菜
    soup: RecipeCard[];       // 汁物
  };
}

interface RecipeCard {
  title: string;             // レシピタイトル
  urls: RecipeUrl[];         // レシピURL一覧
  category: 'main' | 'side' | 'soup';
  emoji: string;             // 表示用絵文字
}

interface RecipeUrl {
  title: string;             // URLのタイトル
  url: string;               // 実際のURL
  domain: string;            // ドメイン名
}
```

### 7.3 レシピ専用レスポンス形式
レシピ提案の場合は、`result.menu_data`フィールドにJSON形式でデータを設定してください：

```json
{
  "type": "complete",
  "sse_session_id": "セッションID",
  "timestamp": "2025-01-27T12:00:00.000Z",
  "message": "献立提案が完了しました",
  "progress": {
    "completed_tasks": 4,
    "total_tasks": 4,
    "progress_percentage": 100,
    "current_task": "完了",
    "remaining_tasks": 0,
    "is_complete": true
  },
  "result": {
    "response": "📝 斬新な提案\n\n🍖 **サーモンのムース風パテ**: [サーモンムースの作り方](https://cookpad.com/recipe/1234567) [フレンチ風サーモンパテ](https://delishkitchen.tv/recipes/2345678)\n\n🥗 **アボカドとトマトのサラダ**: [アボカドサラダの基本](https://cookpad.com/recipe/3456789) [トマトとアボカドの組み合わせ](https://delishkitchen.tv/recipes/4567890)\n\n🍵 **コンソメスープ**: [コンソメスープの作り方](https://cookpad.com/recipe/5678901) [フレンチコンソメ](https://delishkitchen.tv/recipes/6789012)\n\n📚 伝統的な提案\n\n🍖 **生姜焼き**: [生姜焼きの基本レシピ](https://cookpad.com/recipe/7890123) [本格生姜焼き](https://delishkitchen.tv/recipes/8901234)\n\n🥗 **ほうれん草のお浸し**: [お浸しの作り方](https://cookpad.com/recipe/9012345) [本格お浸し](https://delishkitchen.tv/recipes/0123456)\n\n🍵 **味噌汁**: [味噌汁の基本](https://cookpad.com/recipe/1234567) [本格味噌汁](https://delishkitchen.tv/recipes/2345678)",
    "menu_data": {
      "innovative": {
        "title": "📝 斬新な提案",
        "recipes": {
          "main": [
            {
              "title": "サーモンのムース風パテ",
              "emoji": "🍖",
              "category": "main",
              "urls": [
                {
                  "title": "サーモンムースの作り方",
                  "url": "https://cookpad.com/recipe/1234567",
                  "domain": "cookpad.com"
                },
                {
                  "title": "フレンチ風サーモンパテ",
                  "url": "https://delishkitchen.tv/recipes/2345678",
                  "domain": "delishkitchen.tv"
                }
              ]
            }
          ],
          "side": [
            {
              "title": "アボカドとトマトのサラダ",
              "emoji": "🥗",
              "category": "side",
              "urls": [
                {
                  "title": "アボカドサラダの基本",
                  "url": "https://cookpad.com/recipe/3456789",
                  "domain": "cookpad.com"
                },
                {
                  "title": "トマトとアボカドの組み合わせ",
                  "url": "https://delishkitchen.tv/recipes/4567890",
                  "domain": "delishkitchen.tv"
                }
              ]
            }
          ],
          "soup": [
            {
              "title": "コンソメスープ",
              "emoji": "🍵",
              "category": "soup",
              "urls": [
                {
                  "title": "コンソメスープの作り方",
                  "url": "https://cookpad.com/recipe/5678901",
                  "domain": "cookpad.com"
                },
                {
                  "title": "フレンチコンソメ",
                  "url": "https://delishkitchen.tv/recipes/6789012",
                  "domain": "delishkitchen.tv"
                }
              ]
            }
          ]
        }
      },
      "traditional": {
        "title": "📚 伝統的な提案",
        "recipes": {
          "main": [
            {
              "title": "生姜焼き",
              "emoji": "🍖",
              "category": "main",
              "urls": [
                {
                  "title": "生姜焼きの基本レシピ",
                  "url": "https://cookpad.com/recipe/7890123",
                  "domain": "cookpad.com"
                },
                {
                  "title": "本格生姜焼き",
                  "url": "https://delishkitchen.tv/recipes/8901234",
                  "domain": "delishkitchen.tv"
                }
              ]
            }
          ],
          "side": [
            {
              "title": "ほうれん草のお浸し",
              "emoji": "🥗",
              "category": "side",
              "urls": [
                {
                  "title": "お浸しの作り方",
                  "url": "https://cookpad.com/recipe/9012345",
                  "domain": "cookpad.com"
                },
                {
                  "title": "本格お浸し",
                  "url": "https://delishkitchen.tv/recipes/0123456",
                  "domain": "delishkitchen.tv"
                }
              ]
            }
          ],
          "soup": [
            {
              "title": "味噌汁",
              "emoji": "🍵",
              "category": "soup",
              "urls": [
                {
                  "title": "味噌汁の基本",
                  "url": "https://cookpad.com/recipe/1234567",
                  "domain": "cookpad.com"
                },
                {
                  "title": "本格味噌汁",
                  "url": "https://delishkitchen.tv/recipes/2345678",
                  "domain": "delishkitchen.tv"
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

### 7.4 実装ガイドライン

#### 7.4.1 必須フィールド
- `result.menu_data`: レシピデータのJSON形式
- `result.response`: 従来のテキスト形式（フォールバック用）
- `innovative`と`traditional`の両方のセクション
- 各レシピの`title`, `emoji`, `category`, `urls`フィールド

#### 7.4.2 カテゴリ分類
- `main`: 主菜（🍖）
- `side`: 副菜（🥗）
- `soup`: 汁物（🍵）

#### 7.4.3 URL構造
- `title`: リンクテキスト
- `url`: 実際のURL
- `domain`: ドメイン名（表示用）

### 7.5 フロント側の対応
フロント側は以下の優先順位で処理します：

1. **JSON形式優先**: `result.menu_data`が存在する場合は、JSON形式を使用
2. **フォールバック**: `menu_data`が存在しない場合は、従来の文字列解析を使用
3. **エラーハンドリング**: どちらも失敗した場合は、通常のテキスト表示

### 7.6 テスト方法

#### 7.6.1 バック側での確認
```python
# レシピ提案レスポンスの例
response_data = {
    "type": "complete",
    "result": {
        "response": "テキスト形式のレスポンス",
        "menu_data": {
            "innovative": {...},
            "traditional": {...}
        }
    }
}
```

#### 7.6.2 フロント側での確認
1. ブラウザの開発者ツールを開く
2. コンソールで以下のログを確認：
   ```
   JSON形式のレシピデータを検出
   レシピビューアーを表示
   ```

### 7.7 移行計画

#### Phase 1: バック側実装
- [ ] JSON形式でのレスポンス実装
- [ ] `menu_data`フィールドの追加
- [ ] テストデータでの動作確認

#### Phase 2: フロント側対応
- [ ] JSON形式の優先処理実装
- [ ] フォールバック機能の維持
- [ ] 統合テストの実行

#### Phase 3: 本格運用
- [ ] 本番環境での動作確認
- [ ] パフォーマンステスト
- [ ] ユーザーフィードバック収集

## 8. 連絡先

この仕様書について質問がある場合は、フロントエンド開発チームまでお問い合わせください。

---
**作成日**: 2025年1月27日  
**対象**: Morizo-aiv2開発チーム  
**作成者**: Morizo-web開発チーム
