/**
 * 音声入力テキストの置換ルール定義と処理
 */

export interface ReplacementRule {
  from: string;
  to: string;
}

// 置換ルールの定義（拡張可能）
const REPLACEMENT_RULES: ReplacementRule[] = [
  { from: 'こんだて', to: '献立' },
  { from: '根立', to: '献立' },
  { from: 'おしえて', to: '教えて' },
  { from: '主催', to: '主菜' },
  { from: '取材', to: '主菜' },
  // 将来的に他のルールを追加可能
];

/**
 * 音声認識テキストに置換ルールを適用
 * @param text 元のテキスト
 * @returns 置換後のテキスト
 */
export function applyTextReplacement(text: string): string {
  if (!text) {
    return text;
  }

  let replacedText = text;

  // 各置換ルールを順番に適用
  for (const rule of REPLACEMENT_RULES) {
    replacedText = replacedText.replace(new RegExp(rule.from, 'g'), rule.to);
  }

  return replacedText;
}

/**
 * 置換ルールを取得（デバッグ・設定用）
 */
export function getReplacementRules(): ReplacementRule[] {
  return [...REPLACEMENT_RULES];
}

