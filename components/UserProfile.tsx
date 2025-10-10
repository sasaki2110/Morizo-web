'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function UserProfile() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
    } catch (error) {
      console.error('ログアウトエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ユーザーアイコン */}
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setShowProfileModal(true)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="プロフィールを表示"
        >
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
        </button>
      </div>

      {/* プロフィールモーダル */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* オーバーレイ */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setShowProfileModal(false)}
            aria-hidden="true"
          />
          
          {/* モーダルコンテンツ */}
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 text-center">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                プロフィール
              </h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
                aria-label="閉じる"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            
            {/* プロフィール情報 */}
            <div className="mb-6">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                ログイン中
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>

            {/* ログアウトボタン */}
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {loading ? 'ログアウト中...' : 'ログアウト'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
