/**
 * メニューパーサーのユーティリティ関数
 * 文字列処理、URL処理、判定関数など
 */

import { RecipeUrl } from '../../types/menu';

/**
 * レスポンスがメニュー提案かどうかを判定
 */
export function isMenuResponse(response: string): boolean {
  return /📝.*斬新な提案|📚.*伝統的な提案/.test(response);
}

/**
 * URLからドメイン名を抽出
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

/**
 * Markdown形式のURLを解析
 * 例: [レシピタイトル](https://example.com)
 */
export function parseUrls(urlText: string): RecipeUrl[] {
  const urlPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const urls: RecipeUrl[] = [];
  let match;

  while ((match = urlPattern.exec(urlText)) !== null) {
    const [, title, url] = match;
    urls.push({
      title: title.trim(),
      url: url.trim(),
      domain: extractDomain(url.trim()),
    });
  }

  return urls;
}

/**
 * レスポンスをセクションに分割（より柔軟なパターン）
 */
export function splitResponseIntoSections(response: string): { innovative?: string; traditional?: string } {
  const sections: { innovative?: string; traditional?: string } = {};
  
  console.log('🔍 レスポンス分割開始:', response.substring(0, 200) + '...');
  
  // より柔軟なパターンで斬新な提案セクションを抽出
  const innovativePatterns = [
    /\*\*📝.*斬新な提案.*\*\*[\s\S]*?(?=\*\*📚.*伝統的な提案.*\*\*|$)/,
    /📝.*斬新な提案[\s\S]*?(?=📚.*伝統的な提案|$)/,
    /\*\*📝.*斬新な提案.*\*\*[\s\S]*?(?=\*\*📚|$)/,
  ];
  
  for (const pattern of innovativePatterns) {
    const match = response.match(pattern);
    if (match) {
      sections.innovative = match[0].trim();
      console.log('🔍 斬新な提案マッチ成功:', pattern.toString());
      break;
    }
  }
  
  if (!sections.innovative) {
    console.log('🔍 斬新な提案マッチ失敗');
  }

  // より柔軟なパターンで伝統的な提案セクションを抽出
  const traditionalPatterns = [
    /\*\*📚.*伝統的な提案.*\*\*[\s\S]*$/,
    /📚.*伝統的な提案[\s\S]*$/,
    /\*\*📚.*伝統的な提案.*\*\*[\s\S]*?(?=\*\*📝|$)/,
  ];
  
  for (const pattern of traditionalPatterns) {
    const match = response.match(pattern);
    if (match) {
      sections.traditional = match[0].trim();
      console.log('🔍 伝統的な提案マッチ成功:', pattern.toString());
      break;
    }
  }
  
  if (!sections.traditional) {
    console.log('🔍 伝統的な提案マッチ失敗');
  }

  console.log('🔍 分割結果:', Object.keys(sections));
  return sections;
}
