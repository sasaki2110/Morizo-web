'use client';

import { useState, useRef } from 'react';
import ChatMessageList from '@/components/ChatMessageList';
import ChatInput from '@/components/ChatInput';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import RecipeListModal from '@/components/RecipeListModal';
import HistoryPanel from '@/components/HistoryPanel';
import InventoryPanel from '@/components/InventoryPanel';
import { ChatSectionProps } from '@/types/chat';
import { useModalManagement } from '@/hooks/useModalManagement';
import { useRecipeSelection } from '@/hooks/useRecipeSelection';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useSSEHandling } from '@/hooks/useSSEHandling';

export default function ChatSection({
  chatMessages,
  setChatMessages,
  isTextChatLoading,
  setIsTextChatLoading,
  openRecipeModal
}: ChatSectionProps) {
  const [awaitingSelection, setAwaitingSelection] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // モーダル管理フック
  const {
    isDetailModalOpen,
    selectedRecipe,
    handleViewDetails,
    closeDetailModal,
    isListModalOpen,
    listModalCandidates,
    handleViewList,
    closeListModal,
    isHistoryPanelOpen,
    openHistoryPanel,
    closeHistoryPanel,
    isInventoryPanelOpen,
    openInventoryPanel,
    closeInventoryPanel,
  } = useModalManagement();

  // レシピ選択管理フック
  const {
    selectedRecipes,
    isSavingMenu,
    savedMessage,
    handleSelection,
    handleSaveMenu,
    clearSelectedRecipes,
  } = useRecipeSelection(setChatMessages, setAwaitingSelection);

  // チャットメッセージ管理フック
  const {
    textMessage,
    setTextMessage,
    awaitingConfirmation,
    setAwaitingConfirmation,
    confirmationSessionId,
    setConfirmationSessionId,
    sendTextMessage,
    clearChatHistory,
    handleKeyPress,
  } = useChatMessages(chatMessages, setChatMessages, setIsTextChatLoading);

  // SSE処理フック
  const {
    handleRequestMore,
    handleNextStageRequested,
    createOnCompleteHandler,
    createOnErrorHandler,
    createOnTimeoutHandler,
    createOnProgressHandler,
  } = useSSEHandling(
    chatMessages,
    setChatMessages,
    setIsTextChatLoading,
    setAwaitingConfirmation,
    setConfirmationSessionId,
    setAwaitingSelection,
    chatEndRef
  );

  // チャット履歴クリア処理（フックを統合）
  const handleClearHistory = () => {
    clearChatHistory(setAwaitingSelection, clearSelectedRecipes);
  };

  return (
    <>
      {/* チャット履歴 */}
      <ChatMessageList
        chatMessages={chatMessages}
        isTextChatLoading={isTextChatLoading}
        awaitingSelection={awaitingSelection}
        selectedRecipes={selectedRecipes}
        isSavingMenu={isSavingMenu}
        savedMessage={savedMessage}
        onSaveMenu={handleSaveMenu}
        onClearHistory={handleClearHistory}
        openRecipeModal={openRecipeModal}
        onSelect={handleSelection}
        onViewDetails={handleViewDetails}
        onViewList={handleViewList}
        onRequestMore={handleRequestMore}
        onNextStageRequested={handleNextStageRequested}
        createOnCompleteHandler={createOnCompleteHandler}
        createOnErrorHandler={createOnErrorHandler}
        createOnTimeoutHandler={createOnTimeoutHandler}
        createOnProgressHandler={createOnProgressHandler}
      />

      {/* テキストチャットセクション */}
      <ChatInput
        textMessage={textMessage}
        setTextMessage={setTextMessage}
        onSend={sendTextMessage}
        onKeyPress={handleKeyPress}
        isTextChatLoading={isTextChatLoading}
        awaitingSelection={awaitingSelection}
        onOpenHistory={openHistoryPanel}
        onOpenInventory={openInventoryPanel}
      />
      
      {/* レシピ詳細モーダル */}
      {isDetailModalOpen && selectedRecipe && (
        <RecipeDetailModal
          isOpen={isDetailModalOpen}
          onClose={closeDetailModal}
          recipe={selectedRecipe}
        />
      )}
      
      {/* レシピ一覧モーダル */}
      {isListModalOpen && listModalCandidates.length > 0 && (
        <RecipeListModal
          isOpen={isListModalOpen}
          onClose={closeListModal}
          candidates={listModalCandidates}
        />
      )}
      
      {/* Phase 5C-3: 履歴パネル */}
      <HistoryPanel
        isOpen={isHistoryPanelOpen}
        onClose={closeHistoryPanel}
      />
      
      {/* Phase 1-2: 在庫パネル */}
      <InventoryPanel
        isOpen={isInventoryPanelOpen}
        onClose={closeInventoryPanel}
      />
    </>
  );
}
