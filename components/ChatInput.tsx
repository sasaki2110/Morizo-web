'use client';

interface ChatInputProps {
  textMessage: string;
  setTextMessage: React.Dispatch<React.SetStateAction<string>>;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isTextChatLoading: boolean;
  awaitingSelection: boolean;
}

/**
 * チャット入力コンポーネント
 * テキスト入力フィールド、送信ボタン、履歴ボタンを表示
 */
export default function ChatInput({
  textMessage,
  setTextMessage,
  onSend,
  onKeyPress,
  isTextChatLoading,
  awaitingSelection,
}: ChatInputProps) {
  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          Morizo AI テキストチャット
        </h2>
      </div>
      
      <div className="space-y-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="メッセージを入力してください...または 使い方を教えて..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={isTextChatLoading || awaitingSelection}
          />
          <button
            onClick={onSend}
            disabled={isTextChatLoading || !textMessage.trim() || awaitingSelection}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            {isTextChatLoading ? '送信中...' : awaitingSelection ? '選択中...' : '送信'}
          </button>
        </div>
        
        {isTextChatLoading && (
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Morizo AIが応答を生成中...
          </div>
        )}
        
        {awaitingSelection && (
          <div className="text-sm text-blue-600 dark:text-blue-400 text-center">
            主菜を選択してください...
          </div>
        )}
      </div>
    </div>
  );
}

