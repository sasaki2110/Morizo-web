'use client';

import { useState } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import UserProfile from '@/components/UserProfile';
import ChatSection from '@/components/ChatSection';
import VoiceSection from '@/components/VoiceSection';
import HistoryPanel from '@/components/HistoryPanel';
import InventoryPanel from '@/components/InventoryPanel';
import { RecipeModalResponsive } from '../components/RecipeModal';
import { ChatMessage } from '@/types/chat';

export default function Home() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isTextChatLoading, setIsTextChatLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalResponse, setModalResponse] = useState('');
  const [modalResult, setModalResult] = useState<unknown>(undefined);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [isInventoryPanelOpen, setIsInventoryPanelOpen] = useState(false);



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

  // 履歴パネル管理
  const openHistoryPanel = () => setIsHistoryPanelOpen(true);
  const closeHistoryPanel = () => setIsHistoryPanelOpen(false);

  // 在庫パネル管理
  const openInventoryPanel = () => setIsInventoryPanelOpen(true);
  const closeInventoryPanel = () => setIsInventoryPanelOpen(false);

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <UserProfile
            onOpenHistory={openHistoryPanel}
            onOpenInventory={openInventoryPanel}
          />
          
          {/* チャットセクション */}
          <ChatSection
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            isTextChatLoading={isTextChatLoading}
            setIsTextChatLoading={setIsTextChatLoading}
            openRecipeModal={openRecipeModal}
            isHistoryPanelOpen={isHistoryPanelOpen}
            closeHistoryPanel={closeHistoryPanel}
            isInventoryPanelOpen={isInventoryPanelOpen}
            closeInventoryPanel={closeInventoryPanel}
          />

          {/* 音声入力セクション */}
          <VoiceSection
            isChatLoading={isChatLoading}
            setIsChatLoading={setIsChatLoading}
            chatMessages={chatMessages}
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

      {/* 履歴パネル */}
      <HistoryPanel
        isOpen={isHistoryPanelOpen}
        onClose={closeHistoryPanel}
      />
      
      {/* 在庫パネル */}
      <InventoryPanel
        isOpen={isInventoryPanelOpen}
        onClose={closeInventoryPanel}
      />
    </AuthWrapper>
  );
}
