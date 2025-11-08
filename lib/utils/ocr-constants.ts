/**
 * OCR関連の定数定義
 * 
 * 責任: OCR機能で使用する共通の定数を定義
 */

/**
 * 在庫アイテムの単位一覧
 */
export const UNITS = ['個', 'kg', 'g', 'L', 'ml', '本', 'パック', '袋'] as const;

/**
 * 保管場所の一覧
 */
export const STORAGE_LOCATIONS = ['冷蔵庫', '冷凍庫', '常温倉庫', '野菜室', 'その他'] as const;

/**
 * 画像ファイルの最大サイズ（バイト）
 * 10MB = 10 * 1024 * 1024
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * 有効な画像ファイル拡張子
 */
export const VALID_IMAGE_EXTENSIONS = ['image/jpeg', 'image/jpg', 'image/png'] as const;

