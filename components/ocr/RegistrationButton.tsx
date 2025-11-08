'use client';

import React from 'react';

interface RegistrationButtonProps {
  selectedCount: number;
  onRegister: () => void;
  disabled: boolean;
  isRegistering: boolean;
}

/**
 * 登録ボタンコンポーネント
 * 
 * 責任: 選択されたアイテムの登録ボタンを提供
 * 
 * @param selectedCount - 選択されたアイテム数
 * @param onRegister - 登録実行時のコールバック
 * @param disabled - ボタンの無効状態
 * @param isRegistering - 登録中の状態
 */
const RegistrationButton: React.FC<RegistrationButtonProps> = ({
  selectedCount,
  onRegister,
  disabled,
  isRegistering,
}) => {
  return (
    <div className="mb-4">
      <button
        onClick={onRegister}
        disabled={disabled}
        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRegistering
          ? `登録中... (${selectedCount}件)`
          : `選択したアイテムを登録 (${selectedCount}件)`
        }
      </button>
    </div>
  );
};

export default RegistrationButton;

