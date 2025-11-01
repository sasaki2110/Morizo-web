'use client';

import { useState } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import UserProfile from '@/components/UserProfile';
import ChatSection from '@/components/ChatSection';
import VoiceSection from '@/components/VoiceSection';
import { RecipeModalResponsive } from '../components/RecipeModal';
import { ChatMessage } from '@/types/chat';

export default function Home() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isTextChatLoading, setIsTextChatLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalResponse, setModalResponse] = useState('');
  const [modalResult, setModalResult] = useState<unknown>(undefined);



  // レシピモーダルを開く関数
  const openRecipeModal = (response: string, result?: unknown) => {
    setModalResponse(response);
    setModalResult(result);
    setModalOpen(true);
  };

  // レシピモーダルを閉じる関数
  const closeRecipeModal = () => {
    setModalOpen(false);
    setModalResponse('');
    setModalResult(undefined);
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <UserProfile />
          
          {/* チャットセクション */}
          <ChatSection
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            isTextChatLoading={isTextChatLoading}
            setIsTextChatLoading={setIsTextChatLoading}
            openRecipeModal={openRecipeModal}
          />

          {/* 音声入力セクション */}
          <VoiceSection
            isChatLoading={isChatLoading}
            setIsChatLoading={setIsChatLoading}
            setChatMessages={setChatMessages}
          />

          
        </div>
      </div>
      
      {/* レシピモーダル */}
      <RecipeModalResponsive
        isOpen={modalOpen}
        onClose={closeRecipeModal}
        response={modalResponse}
        result={modalResult}
      />
    </AuthWrapper>
  );
}
