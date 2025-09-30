# docs フォルダ構成

## 概要

このフォルダは、Morizo Webプロジェクトの技術ドキュメントを整理・保管する場所です。

## フォルダ構成

### 📁 archive/
実装や検証が完了し、過去資料となったドキュメントの保管場所

- `LOGGING.md` - ロギング設定（実装完了）
- `LOGGING_IMPLEMENTATION.md` - ロギングシステム実装完了レポート
- `SETUP.md` - セットアップ手順（ルートREADME.mdに統合済み）

### 📁 reference/
重要ではあるが、常時参照はせず、必要時に参照するドキュメント

- `ARCHITECTURE.md` - アーキテクチャ設計書
- `COMPONENTS.md` - コンポーネント仕様書
- `API.md` - API仕様書
- `ROADMAP.md` - 開発ロードマップ

## ドキュメント管理方針

### 基本方針
- **PRIORITY_TASK.md**: 基本的なタスク・ToDo管理
- **README.md**: 全体像の概要管理
- **docs/**: 技術的な詳細ドキュメント

### 分類基準
- **archive/**: 実装完了・検証済みの過去資料
- **reference/**: 重要だが常時参照しない技術資料

### 更新ルール
- 実装完了時: archive/に移動
- 新機能追加時: reference/に追加
- 定期的な見直しと整理

## 関連ファイル

### ルートレベル
- `README.md` - プロジェクト概要とセットアップ
- `PRIORITY_TASK.md` - 優先タスクとToDo管理
- `AGENTS.md` - AIエージェント協働ルール

### 開発時参照
- `docs/reference/ARCHITECTURE.md` - システム設計確認時
- `docs/reference/COMPONENTS.md` - コンポーネント開発時
- `docs/reference/API.md` - API開発時
- `docs/reference/ROADMAP.md` - 開発計画確認時

---

**最終更新**: 2025年1月27日  
**作成者**: AIエージェント協働チーム
