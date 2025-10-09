/**
 * URLから画像を抽出する機能
 * Open Graph メタデータやHTMLから画像URLを取得
 */

/**
 * URLから画像を抽出する関数（タイムアウト付き）
 */
export async function extractImageFromUrl(url: string): Promise<string | null> {
  try {
    // CORS対応のため、プロキシ経由でアクセス
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
    
    // タイムアウト付きのfetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト
    
    const response = await fetch(proxyUrl, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Open Graph画像を抽出
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    if (ogImageMatch) {
      const imageUrl = ogImageMatch[1];
      // 相対URLを絶対URLに変換
      return resolveImageUrl(imageUrl, url);
    }
    
    // Twitter Card画像を抽出
    const twitterImageMatch = html.match(/<meta name="twitter:image" content="([^"]+)"/i);
    if (twitterImageMatch) {
      const imageUrl = twitterImageMatch[1];
      return resolveImageUrl(imageUrl, url);
    }
    
    // フォールバック: 最初の画像を抽出
    const imgMatch = html.match(/<img[^>]+src="([^"]+)"/i);
    if (imgMatch) {
      const imageUrl = imgMatch[1];
      return resolveImageUrl(imageUrl, url);
    }
    
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`画像抽出がタイムアウトしました (${url})`);
    } else {
      console.warn(`画像抽出に失敗しました (${url}):`, error);
    }
    return null;
  }
}

/**
 * 相対URLを絶対URLに変換
 */
function resolveImageUrl(imageUrl: string, baseUrl: string): string {
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  if (imageUrl.startsWith('//')) {
    return `https:${imageUrl}`;
  }
  
  if (imageUrl.startsWith('/')) {
    const base = new URL(baseUrl);
    return `${base.protocol}//${base.host}${imageUrl}`;
  }
  
  // 相対パスの場合
  const base = new URL(baseUrl);
  return `${base.protocol}//${base.host}${base.pathname.replace(/\/[^\/]*$/, '/')}${imageUrl}`;
}

/**
 * 複数のURLから画像を並行して抽出（並行制限付き）
 */
export async function extractImagesFromUrls(urls: string[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const MAX_CONCURRENT = 3; // 同時実行数を3に制限
  
  // バッチ処理で並行実行数を制限
  for (let i = 0; i < urls.length; i += MAX_CONCURRENT) {
    const batch = urls.slice(i, i + MAX_CONCURRENT);
    const promises = batch.map(async (url) => {
      const imageUrl = await extractImageFromUrl(url);
      results.set(url, imageUrl);
    });
    
    await Promise.allSettled(promises);
  }
  
  return results;
}

/**
 * 画像URLの妥当性をチェック
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  // 一般的な画像拡張子をチェック
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const hasImageExtension = imageExtensions.some(ext => 
    url.toLowerCase().includes(ext)
  );
  
  // URLが有効かチェック
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 画像の読み込みをテスト
 */
export function testImageLoad(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    
    // タイムアウト設定（5秒）
    setTimeout(() => resolve(false), 5000);
  });
}


/**
 * デフォルトのプレースホルダー画像（No Image Found）
 */
export const DEFAULT_PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2IiBkYXJrOmZpbGw9IiMzNzQxNTEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmI3MjgwIiBkYXJrOmZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZSBGb3VuZDwvdGV4dD48L3N2Zz4=';
