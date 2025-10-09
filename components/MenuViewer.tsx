'use client';

/**
 * メニュービューアーコンポーネント
 * MorizoAIの献立提案レスポンスを美しく表示する専用ビューアー
 */

import React, { useMemo, useState } from 'react';
import { MenuViewerProps, MenuResponse, RecipeCard } from '../types/menu';
import { parseMenuResponse, isMenuResponse, parseMenuResponseUnified } from '../lib/menu-parser';
import { RecipeCard as RecipeCardComponent, RecipeCardSkeleton, RecipeCardError } from './RecipeCard';

/**
 * セクションタイトルコンポーネント
 */
interface SectionTitleProps {
  title: string;
}

function SectionTitle({ title }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
        {title}
      </h2>
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
        <div key={`${category}-${index}`}>
          <RecipeCardComponent
            recipe={recipe}
          />
        </div>
      ))}
    </>
  );
}

/**
 * セクション情報を取得するヘルパー関数
 */
function getSectionInfo(parseResult: MenuResponse) {
  const innovative = parseResult.innovative.title;
  const traditional = parseResult.traditional.title;
  
  const innovativeRecipes = {
    main: parseResult.innovative.recipes.main,
    side: parseResult.innovative.recipes.side,
    soup: parseResult.innovative.recipes.soup,
  };
  
  const traditionalRecipes = {
    main: parseResult.traditional.recipes.main,
    side: parseResult.traditional.recipes.side,
    soup: parseResult.traditional.recipes.soup,
  };
  
  return {
    innovative,
    traditional,
    innovativeRecipes,
    traditionalRecipes,
  };
}

/**
 * レシピ数を計算するヘルパー関数
 */
function getTotalRecipeCount(recipes: { main: RecipeCard[]; side: RecipeCard[]; soup: RecipeCard[] }) {
  return recipes.main.length + recipes.side.length + recipes.soup.length;
}

/**
 * メニュービューアーのメインコンポーネント
 */
export function MenuViewer({ response, result, className = '' }: MenuViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);

  // レスポンス解析（JSON形式を優先）
  const parseResult = useMemo(() => {
    setIsLoading(true);
    setParseError(null);

    try {
      // JSON形式を優先してレシピデータを解析
      const parseResponse = parseMenuResponseUnified(response, result);
      
      if (!parseResponse.success) {
        console.error('MenuViewer: 解析失敗', parseResponse.error);
        setParseError(parseResponse.error || '解析に失敗しました');
        return null;
      }
      
      return parseResponse.data;
    } catch (error) {
      console.error('MenuViewer: 解析エラー', error);
      setParseError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [response, result]);

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

  // ローディング状態
  if (isLoading) {
    return (
      <div className={`menu-viewer ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <RecipeCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  // セクション情報を取得
  const { innovative, traditional, innovativeRecipes, traditionalRecipes } = getSectionInfo(parseResult);

  // レシピ数を計算
  const innovativeCount = getTotalRecipeCount(innovativeRecipes);
  const traditionalCount = getTotalRecipeCount(traditionalRecipes);

  return (
    <div className={`menu-viewer ${className}`}>

      {/* 斬新な提案セクション */}
      {innovativeCount > 0 && (
        <div className="mb-8">
          <SectionTitle title={innovative} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <RecipeGrid recipes={innovativeRecipes.main} category="main" emoji="🍖" />
            <RecipeGrid recipes={innovativeRecipes.side} category="side" emoji="🥗" />
            <RecipeGrid recipes={innovativeRecipes.soup} category="soup" emoji="🍵" />
          </div>
        </div>
      )}

      {/* 伝統的な提案セクション */}
      {traditionalCount > 0 && (
        <div className="mb-8">
          <SectionTitle title={traditional} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <RecipeGrid recipes={traditionalRecipes.main} category="main" emoji="🍖" />
            <RecipeGrid recipes={traditionalRecipes.side} category="side" emoji="🥗" />
            <RecipeGrid recipes={traditionalRecipes.soup} category="soup" emoji="🍵" />
          </div>
        </div>
      )}

      {/* レシピがない場合 */}
      {innovativeCount === 0 && traditionalCount === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <span className="text-4xl mb-2 block">🍽️</span>
          <p>レシピが見つかりませんでした</p>
        </div>
      )}
    </div>
  );
}

/**
 * メニュービューアーのラッパーコンポーネント
 * レスポンスがメニュー提案かどうかを自動判定
 */
interface MenuViewerWrapperProps {
  response: string;
  result?: unknown;
  className?: string;
  fallbackComponent?: React.ReactNode;
}

export function MenuViewerWrapper({ 
  response, 
  result,
  className = '', 
  fallbackComponent 
}: MenuViewerWrapperProps) {
  // メニュー提案かどうかを判定
  if (!isMenuResponse(response)) {
    return fallbackComponent ? <>{fallbackComponent}</> : null;
  }

  return <MenuViewer response={response} result={result} className={className} />;
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