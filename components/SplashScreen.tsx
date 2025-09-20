'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [currentImage, setCurrentImage] = useState<number | null>(null)

  useEffect(() => {
    // ランダムに画像を選択（1-3の数値）
    const randomImage = Math.floor(Math.random() * 3) + 1
    setCurrentImage(randomImage)

    // 3秒後にフェードアウト開始
    const fadeOutTimer = setTimeout(() => {
      setIsVisible(false)
    }, 3000)

    // フェードアウト完了後にコールバック実行
    const completeTimer = setTimeout(() => {
      onComplete()
    }, 3500) // フェードアウト時間（0.5秒）を考慮

    return () => {
      clearTimeout(fadeOutTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  // 画像が選択されるまで表示しない
  if (currentImage === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="relative">
        <Image
          src={`/Morizo_Splash_0${currentImage}.png`}
          alt={`Morizo Splash ${currentImage}`}
          width={400}
          height={400}
          className="rounded-lg shadow-lg"
          priority
        />
        
        {/* ローディングアニメーション */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
