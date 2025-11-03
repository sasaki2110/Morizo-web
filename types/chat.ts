import { RecipeCandidate } from './menu';

/**
 * チャットメッセージの型定義
 */
export interface ChatMessage {
  type: 'user' | 'ai' | 'streaming';
  content: string;
  sseSessionId?: string;
  result?: unknown;
  requiresConfirmation?: boolean;
  requiresSelection?: boolean;
  candidates?: RecipeCandidate[];
  taskId?: string;
  // Phase 3D: 段階情報
  currentStage?: 'main' | 'sub' | 'soup';
  usedIngredients?: string[];
  menuCategory?: 'japanese' | 'western' | 'chinese';
  selectedRecipe?: {
    main?: RecipeCandidate;
    sub?: RecipeCandidate;
    soup?: RecipeCandidate;
  };
}

/**
 * ChatSectionコンポーネントのProps
 */
export interface ChatSectionProps {
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isTextChatLoading: boolean;
  setIsTextChatLoading: React.Dispatch<React.SetStateAction<boolean>>;
  openRecipeModal: (response: string, result?: unknown) => void;
  isHistoryPanelOpen: boolean;
  closeHistoryPanel: () => void;
  isInventoryPanelOpen: boolean;
  closeInventoryPanel: () => void;
}

