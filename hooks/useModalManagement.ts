import { useState } from 'react';
import { RecipeCandidate } from '@/types/menu';

/**
 * モーダル管理フック
 * レシピ詳細モーダル、レシピ一覧モーダル、履歴パネルの状態を管理
 */
export function useModalManagement() {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeCandidate | null>(null);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listModalCandidates, setListModalCandidates] = useState<RecipeCandidate[]>([]);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  const handleViewDetails = (recipe: RecipeCandidate) => {
    setSelectedRecipe(recipe);
    setIsDetailModalOpen(true);
  };

  const handleViewList = (candidates: RecipeCandidate[]) => {
    setListModalCandidates(candidates);
    setIsListModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRecipe(null);
  };

  const closeListModal = () => {
    setIsListModalOpen(false);
    setListModalCandidates([]);
  };

  const closeHistoryPanel = () => {
    setIsHistoryPanelOpen(false);
  };

  const openHistoryPanel = () => {
    setIsHistoryPanelOpen(true);
  };

  return {
    // 詳細モーダル
    isDetailModalOpen,
    selectedRecipe,
    handleViewDetails,
    closeDetailModal,
    // 一覧モーダル
    isListModalOpen,
    listModalCandidates,
    handleViewList,
    closeListModal,
    // 履歴パネル
    isHistoryPanelOpen,
    openHistoryPanel,
    closeHistoryPanel,
  };
}

