/**
 * SSEセッション管理機能
 * バックエンドのストリーミング機能と連携するためのセッションID管理
 */

/**
 * SSEセッションIDを生成する
 * UUID v4形式でバックエンドと互換性を確保
 * @returns {string} SSEセッションID
 */
export function generateSSESessionId(): string {
  // ブラウザ環境でのUUID生成
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // フォールバック: 手動でUUID v4を生成
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * SSEセッションIDの形式を検証する
 * @param {string} sessionId - 検証するセッションID
 * @returns {boolean} 有効な形式かどうか
 */
export function validateSSESessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  // UUID v4の正規表現パターン
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sessionId);
}

/**
 * SSEセッションIDの有効期限を管理する
 * デフォルトで30分の有効期限を設定
 */
export class SSESessionManager {
  private sessions: Map<string, { createdAt: number; expiresAt: number }> = new Map();
  private readonly DEFAULT_EXPIRY_MINUTES = 30;

  /**
   * セッションを登録する
   * @param {string} sessionId - セッションID
   * @param {number} expiryMinutes - 有効期限（分）
   */
  registerSession(sessionId: string, expiryMinutes: number = this.DEFAULT_EXPIRY_MINUTES): void {
    const now = Date.now();
    const expiresAt = now + (expiryMinutes * 60 * 1000);
    
    this.sessions.set(sessionId, {
      createdAt: now,
      expiresAt: expiresAt
    });
  }

  /**
   * セッションが有効かどうかを確認する
   * @param {string} sessionId - セッションID
   * @returns {boolean} 有効かどうか
   */
  isSessionValid(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    const now = Date.now();
    return now < session.expiresAt;
  }

  /**
   * セッションを削除する
   * @param {string} sessionId - セッションID
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * 期限切れのセッションをクリーンアップする
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now >= session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * アクティブなセッション数を取得する
   * @returns {number} アクティブなセッション数
   */
  getActiveSessionCount(): number {
    this.cleanupExpiredSessions();
    return this.sessions.size;
  }
}

// グローバルなセッション管理インスタンス
export const sseSessionManager = new SSESessionManager();

// 定期的なクリーンアップ（5分ごと）
if (typeof window !== 'undefined') {
  setInterval(() => {
    sseSessionManager.cleanupExpiredSessions();
  }, 5 * 60 * 1000);
}
