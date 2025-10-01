'use client';

/**
 * レシピ専用ビューアーのテストページ
 * 実装した機能の動作確認用
 */

import React, { useState } from 'react';
import { MenuViewer, DebugMenuViewer } from '../../components/MenuViewer';
import { 
  SAMPLE_MENU_RESPONSE, 
  SAMPLE_INNOVATIVE_ONLY_RESPONSE, 
  SAMPLE_TRADITIONAL_ONLY_RESPONSE,
  SAMPLE_ERROR_RESPONSE,
  SAMPLE_EMPTY_RESPONSE,
  SAMPLE_MALFORMED_RESPONSE,
  SAMPLE_REAL_URLS_RESPONSE,
  SAMPLE_REAL_MORIZO_RESPONSE
} from '../../lib/test-samples';

export default function TestPage() {
  const [selectedSample, setSelectedSample] = useState(SAMPLE_MENU_RESPONSE);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const samples = [
    { name: '完全なメニューレスポンス', value: SAMPLE_MENU_RESPONSE },
    { name: '斬新な提案のみ', value: SAMPLE_INNOVATIVE_ONLY_RESPONSE },
    { name: '伝統的な提案のみ', value: SAMPLE_TRADITIONAL_ONLY_RESPONSE },
    { name: 'エラーレスポンス', value: SAMPLE_ERROR_RESPONSE },
    { name: '空のレスポンス', value: SAMPLE_EMPTY_RESPONSE },
    { name: '不完全なレスポンス', value: SAMPLE_MALFORMED_RESPONSE },
    { name: '実際のURL（画像テスト用）', value: SAMPLE_REAL_URLS_RESPONSE },
    { name: '実際のMorizoAIレスポンス', value: SAMPLE_REAL_MORIZO_RESPONSE },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          レシピ専用ビューアー テストページ
        </h1>

        {/* サンプル選択 */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            テストサンプル選択
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {samples.map((sample, index) => (
              <button
                key={index}
                onClick={() => setSelectedSample(sample.value)}
                className={`p-3 rounded-lg border transition-colors duration-200 ${
                  selectedSample === sample.value
                    ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-800 dark:text-blue-200'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {sample.name}
              </button>
            ))}
          </div>
        </div>

        {/* デバッグ情報の表示切り替え */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showDebugInfo}
                onChange={(e) => setShowDebugInfo(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                デバッグ情報を表示
              </span>
            </label>
          </div>
        </div>

        {/* レスポンス表示 */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            生のレスポンス
          </h2>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-sm text-gray-800 dark:text-gray-200 overflow-auto max-h-64">
            {selectedSample}
          </pre>
        </div>

        {/* ビューアー表示 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            レシピ専用ビューアー
          </h2>
          {showDebugInfo ? (
            <DebugMenuViewer 
              response={selectedSample} 
              showDebugInfo={true}
            />
          ) : (
            <MenuViewer response={selectedSample} />
          )}
        </div>

        {/* フッター情報 */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>MorizoAI レシピ専用ビューアー - テストページ</p>
          <p>実装完了: Phase 1-4</p>
        </div>
      </div>
    </div>
  );
}
