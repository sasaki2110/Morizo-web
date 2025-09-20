'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function UserProfile() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(false)

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
    <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
        ようこそMorizoへ
      </h1>
      
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

      <button
        onClick={handleSignOut}
        disabled={loading}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
      >
        {loading ? 'ログアウト中...' : 'ログアウト'}
      </button>
    </div>
  )
}
