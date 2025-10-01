'use client';

/**
 * メニュービューアーコンポーネント
 * MorizoAIの献立提案レスポンスを美しく表示する専用ビューアー
 */

import React, { useMemo, useState } from 'react';
import { MenuViewerProps, MenuResponse, RecipeCard } from '../types/menu';
import { parseMenuResponse, isMenuResponse } from '../lib/menu-parser';
import { RecipeCard as RecipeCardComponent, RecipeCardSkeleton, RecipeCardError } from './RecipeCard';

/**
 * セクションタイトルコンポーネント
 */
interface SectionTitleProps {
  title: string;
  recipeCount: number;
}

function SectionTitle({ title, recipeCount }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
        {title}
      </h2>
      <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
        {recipeCount}個のレシピ
      </span>
    </div>
  );
}

/**
 * レシピグリッドコンポーネント
 */
interface RecipeGridProps {
  recipes: RecipeCard[];
  category: string;
  emoji: string;
}

function RecipeGrid({ recipes, category, emoji }: RecipeGridProps) {
  if (recipes.length === 0) {
    return (
      <div className="col-span-full">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <span className="text-4xl mb-2 block">{emoji}</span>
          <p>このカテゴリにはレシピがありません</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {recipes.map((recipe, index) => (
        <RecipeCardComponent
          key={`${category}-${index}`}
          recipe={recipe}
        />
      ))}
    </>
  );
}

/**
 * メニュービューアーのメインコンポーネント
 */
export function MenuViewer({ response, className = '' }: MenuViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);

  // レスポンス解析
  const parseResult = useMemo(() => {
    setIsLoading(true);
    setParseError(null);

    try {
      const result = parseMenuResponse(response);
      
      if (!result.success) {
        setParseError(result.error || '解析に失敗しました');
        return null;
      }

      return result.data;
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [response]);

  // ローディング状態
  if (isLoading) {
    return (
      <div className={`menu-viewer ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <RecipeCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  // エラー状態
  if (parseError || !parseResult) {
    return (
      <div className={`menu-viewer ${className}`}>
        <RecipeCardError
          title="メニュー解析エラー"
          error={parseError || 'レスポンスの解析に失敗しました'}
        />
      </div>
    );
  }

  const { innovative, traditional } = parseResult;

  // 全レシピ数を計算
  const getTotalRecipeCount = (section: MenuResponse['innovative']) => {
    return section.recipes.main.length + section.recipes.side.length + section.recipes.soup.length;
  };

  const innovativeCount = getTotalRecipeCount(innovative);
  const traditionalCount = getTotalRecipeCount(traditional);

  return (
    <div className={`menu-viewer ${className}`}>
      {/* 斬新な提案セクション */}
      {innovativeCount > 0 && (
        <div className="mb-12">
          <SectionTitle title={innovative.title} recipeCount={innovativeCount} />
          
          {/* レスポンシブグリッドレイアウト */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* メイン料理 */}
            <RecipeGrid
              recipes={innovative.recipes.main}
              category="main"
              emoji="🍖"
            />
            
            {/* 副菜 */}
            <RecipeGrid
              recipes={innovative.recipes.side}
              category="side"
              emoji="🥗"
            />
            
            {/* 汁物 */}
            <RecipeGrid
              recipes={innovative.recipes.soup}
              category="soup"
              emoji="🍵"
            />
          </div>
        </div>
      )}

      {/* 伝統的な提案セクション */}
      {traditionalCount > 0 && (
        <div className="mb-12">
          <SectionTitle title={traditional.title} recipeCount={traditionalCount} />
          
          {/* レスポンシブグリッドレイアウト */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* メイン料理 */}
            <RecipeGrid
              recipes={traditional.recipes.main}
              category="main"
              emoji="🍖"
            />
            
            {/* 副菜 */}
            <RecipeGrid
              recipes={traditional.recipes.side}
              category="side"
              emoji="🥗"
            />
            
            {/* 汁物 */}
            <RecipeGrid
              recipes={traditional.recipes.soup}
              category="soup"
              emoji="🍵"
            />
          </div>
        </div>
      )}

      {/* レシピが存在しない場合 */}
      {innovativeCount === 0 && traditionalCount === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🍽️</div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            レシピが見つかりませんでした
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            レスポンスに有効なレシピ情報が含まれていません
          </p>
        </div>
      )}

      {/* フッター情報 */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>MorizoAI レシピビューアー</span>
          <span>
            合計 {innovativeCount + traditionalCount} 個のレシピ
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * メニュービューアーのラッパーコンポーネント
 * レスポンスがメニュー提案かどうかを自動判定
 */
interface MenuViewerWrapperProps {
  response: string;
  className?: string;
  fallbackComponent?: React.ReactNode;
}

export function MenuViewerWrapper({ 
  response, 
  className = '', 
  fallbackComponent 
}: MenuViewerWrapperProps) {
  // メニュー提案かどうかを判定
  if (!isMenuResponse(response)) {
    return fallbackComponent ? <>{fallbackComponent}</> : null;
  }

  return <MenuViewer response={response} className={className} />;
}

/**
 * デバッグ用: 解析結果を表示するコンポーネント
 */
interface DebugMenuViewerProps {
  response: string;
  showDebugInfo?: boolean;
}

export function DebugMenuViewer({ response, showDebugInfo = false }: DebugMenuViewerProps) {
  const parseResult = useMemo(() => {
    return parseMenuResponse(response);
  }, [response]);

  return (
    <div className="space-y-6">
      {/* デバッグ情報 */}
      {showDebugInfo && (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">デバッグ情報</h4>
          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
            {JSON.stringify(parseResult, null, 2)}
          </pre>
        </div>
      )}

      {/* メインビューアー */}
      <MenuViewer response={response} />
    </div>
  );
}
