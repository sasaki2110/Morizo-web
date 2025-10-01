/**
 * レシピ専用ビューアーのテスト用サンプルレスポンス
 * MorizoAIの献立提案レスポンスの形式を模擬（実際のURL使用）
 */

export const SAMPLE_MENU_RESPONSE = `
📝 斬新な提案

🍖 **サーモンのムース風パテ**: [サーモンムースの作り方](https://cookpad.com/recipe/1234567) [フレンチ風サーモンパテ](https://delishkitchen.tv/recipes/2345678)

🥗 **アボカドとトマトのサラダ**: [アボカドサラダの基本](https://cookpad.com/recipe/3456789) [トマトとアボカドの組み合わせ](https://delishkitchen.tv/recipes/4567890)

🍵 **コンソメスープ**: [コンソメスープの作り方](https://cookpad.com/recipe/5678901) [フレンチコンソメ](https://delishkitchen.tv/recipes/6789012)

📚 伝統的な提案

🍖 **生姜焼き**: [生姜焼きの基本レシピ](https://cookpad.com/recipe/7890123) [本格生姜焼き](https://delishkitchen.tv/recipes/8901234)

🥗 **ほうれん草のお浸し**: [お浸しの作り方](https://cookpad.com/recipe/9012345) [本格お浸し](https://delishkitchen.tv/recipes/0123456)

🍵 **味噌汁**: [味噌汁の基本](https://cookpad.com/recipe/1234567) [本格味噌汁](https://delishkitchen.tv/recipes/2345678)
`;

export const SAMPLE_INNOVATIVE_ONLY_RESPONSE = `
📝 斬新な提案

🍖 **フォアグラのテリーヌ**: [フォアグラテリーヌ](https://cookpad.com/recipe/1111111) [本格フォアグラ](https://delishkitchen.tv/recipes/2222222)

🥗 **エディブルフラワーサラダ**: [エディブルフラワー](https://cookpad.com/recipe/3333333) [花のサラダ](https://delishkitchen.tv/recipes/4444444)

🍵 **コンソメジェリー**: [コンソメジェリー](https://cookpad.com/recipe/5555555) [フレンチジェリー](https://delishkitchen.tv/recipes/6666666)
`;

export const SAMPLE_TRADITIONAL_ONLY_RESPONSE = `
📚 伝統的な提案

🍖 **親子丼**: [親子丼の作り方](https://cookpad.com/recipe/7777777) [本格親子丼](https://delishkitchen.tv/recipes/8888888)

🥗 **きんぴらごぼう**: [きんぴらごぼう](https://cookpad.com/recipe/9999999) [本格きんぴら](https://delishkitchen.tv/recipes/0000000)

🍵 **お吸い物**: [お吸い物の基本](https://cookpad.com/recipe/1111111) [本格お吸い物](https://delishkitchen.tv/recipes/2222222)
`;

export const SAMPLE_ERROR_RESPONSE = `
これは通常のチャットメッセージです。
レシピ情報は含まれていません。
`;

export const SAMPLE_EMPTY_RESPONSE = '';

export const SAMPLE_MALFORMED_RESPONSE = `
📝 斬新な提案

🍖 **不完全なレシピ**: これはURLが含まれていない不完全なレシピです。

🥗 **正常なレシピ**: [正常なレシピ](https://cookpad.com/recipe/1234567)
`;

// 実際のMorizoAIレスポンス形式のテストデータ
export const SAMPLE_REAL_MORIZO_RESPONSE = `
**📝 斬新な提案（AI生成）**
🚀 **AI生成による独創的な献立**

🍖 **主菜**: 牛すね肉の煮込み
   1. [お家で本格！牛すね肉の赤ワイン煮込み(クラシル)](https://www.kurashiru.com/recipes/d311151e-1856-419a-b45a-03c2914e111d)
   2. [牛すね肉のビール煮込み(Delish Kitchen)](https://delishkitchen.tv/recipes/174841714773590438)

🥗 **副菜**: もやしのナムル
   1. [超簡単！もやしナムル(クラシル)](https://www.kurashiru.com/recipes/231d10de-39fc-47f4-a9fb-0dc1a06da8d7)

🍵 **汁物**: ほうれん草と牛乳のスープ
   1. [ほうれん草と牛乳のスープ(DELISH KITCHEN)](https://delishkitchen.tv/recipes/309524781626032420)

💡 **この独創的な献立をお試しください！**

**📚 伝統的な提案（蓄積レシピ）**
📖 **蓄積レシピによる伝統的な献立**

🍖 **主菜**: 豚バラブロックの甘酢たれ丼
   1. [豚バラブロックの甘酢たれ丼(DELISH KITCHEN)](https://delishkitchen.tv/curations/5650)

🥗 **副菜**: 豚モモブロックでオニオンサイコロステーキ
   1. [豚モモブロックでオニオンサイコロステーキ(楽天レシピ（ましあ）)](https://recipe.rakuten.co.jp/recipe/1220024709/)

🍵 **汁物**: 肉大好き ♡豚バラブロックスタミナ焼き
   1. [肉大好き ♡豚バラブロックスタミナ焼き(DELISH KITCHEN)](https://delishkitchen.tv/curations/13445)

💡 **この伝統的な献立をお試しください！**

💡 **どちらの提案がお好みですか？選択してください。**
`;
