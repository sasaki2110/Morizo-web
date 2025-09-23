/**
 * Morizo Web - 統一ログユーティリティ
 * サーバーサイドとクライアントサイドの両方で使用できるログユーティリティ
 */

import { LogCategory } from './logging';
import { 
  ClientLogCategory, 
  clientLog, 
  logClientError, 
  logClientApiCall, 
  logClientAuth, 
  logClientVoice, 
  logClientChat 
} from './client-logging';

// LogCategoryを再エクスポート
export { LogCategory };

// サーバーサイド用のログユーティリティ
export class ServerLogger {
  private static getLogger() {
    // サーバーサイドでのみログインスタンスを取得
    if (typeof window !== 'undefined') {
      throw new Error('ServerLoggerはサーバーサイドでのみ使用可能です');
    }
    
    // 動的インポートでサーバーサイドログを取得
    const { getServerLogger } = require('./logging');
    return getServerLogger();
  }

  static debug(category: LogCategory, message: string, data?: any): void {
    if (typeof window !== 'undefined') return; // クライアントサイドでは何もしない
    try {
      this.getLogger().debug(category, message, data);
    } catch (error) {
      console.error('ServerLogger debug error:', error);
    }
  }

  static info(category: LogCategory, message: string, data?: any): void {
    if (typeof window !== 'undefined') return; // クライアントサイドでは何もしない
    try {
      this.getLogger().info(category, message, data);
    } catch (error) {
      console.error('ServerLogger info error:', error);
    }
  }

  static warn(category: LogCategory, message: string, data?: any): void {
    if (typeof window !== 'undefined') return; // クライアントサイドでは何もしない
    try {
      this.getLogger().warn(category, message, data);
    } catch (error) {
      console.error('ServerLogger warn error:', error);
    }
  }

  static error(category: LogCategory, message: string, data?: any): void {
    if (typeof window !== 'undefined') return; // クライアントサイドでは何もしない
    try {
      this.getLogger().error(category, message, data);
    } catch (error) {
      console.error('ServerLogger error error:', error);
    }
  }

  // パフォーマンス測定
  static startTimer(label: string): () => void {
    if (typeof window !== 'undefined') return () => {}; // クライアントサイドでは何もしない
    try {
      return this.getLogger().startTimer(label);
    } catch (error) {
      console.error('ServerLogger timer error:', error);
      return () => {};
    }
  }

  // セキュリティ配慮: 個人情報をマスク
  static maskEmail(email: string): string {
    if (typeof window !== 'undefined') return email; // クライアントサイドでは何もしない
    try {
      return this.getLogger().maskEmail(email);
    } catch (error) {
      console.error('ServerLogger maskEmail error:', error);
      return email;
    }
  }

  static maskToken(token: string): string {
    if (typeof window !== 'undefined') return token; // クライアントサイドでは何もしない
    try {
      return this.getLogger().maskToken(token);
    } catch (error) {
      console.error('ServerLogger maskToken error:', error);
      return token;
    }
  }
}

// 統一されたログインターフェース
export class UnifiedLogger {
  static debug(category: LogCategory, message: string, data?: any): void {
    if (typeof window !== 'undefined') {
      // クライアントサイド
      const clientCategory = category as unknown as ClientLogCategory;
      clientLog.debug(clientCategory, message, data);
    } else {
      // サーバーサイド
      ServerLogger.debug(category, message, data);
    }
  }

  static info(category: LogCategory, message: string, data?: any): void {
    if (typeof window !== 'undefined') {
      // クライアントサイド
      const clientCategory = category as unknown as ClientLogCategory;
      clientLog.info(clientCategory, message, data);
    } else {
      // サーバーサイド
      ServerLogger.info(category, message, data);
    }
  }

  static warn(category: LogCategory, message: string, data?: any): void {
    if (typeof window !== 'undefined') {
      // クライアントサイド
      const clientCategory = category as unknown as ClientLogCategory;
      clientLog.warn(clientCategory, message, data);
    } else {
      // サーバーサイド
      ServerLogger.warn(category, message, data);
    }
  }

  static error(category: LogCategory, message: string, data?: any): void {
    if (typeof window !== 'undefined') {
      // クライアントサイド
      const clientCategory = category as unknown as ClientLogCategory;
      clientLog.error(clientCategory, message, data);
    } else {
      // サーバーサイド
      ServerLogger.error(category, message, data);
    }
  }

  static startTimer(label: string): () => void {
    if (typeof window !== 'undefined') {
      return clientLog.timer(label);
    } else {
      return ServerLogger.startTimer(label);
    }
  }

  static maskEmail(email: string): string {
    if (typeof window !== 'undefined') {
      return clientLog.maskEmail(email);
    } else {
      return ServerLogger.maskEmail(email);
    }
  }

  static maskToken(token: string): string {
    if (typeof window !== 'undefined') {
      return clientLog.maskToken(token);
    } else {
      return ServerLogger.maskToken(token);
    }
  }
}

// 便利な関数
export const log = {
  debug: UnifiedLogger.debug,
  info: UnifiedLogger.info,
  warn: UnifiedLogger.warn,
  error: UnifiedLogger.error,
  timer: UnifiedLogger.startTimer,
  maskEmail: UnifiedLogger.maskEmail,
  maskToken: UnifiedLogger.maskToken,
};

// エラーハンドリング用のログ関数
export function logError(category: LogCategory, error: Error | unknown, context?: string): void {
  if (typeof window !== 'undefined') {
    // クライアントサイド
    const clientCategory = category as unknown as ClientLogCategory;
    logClientError(clientCategory, error, context);
  } else {
    // サーバーサイド
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    ServerLogger.error(category, `エラー発生${context ? ` (${context})` : ''}: ${errorMessage}`, {
      stack: errorStack,
      context,
    });
  }
}

// API呼び出し用のログ関数
export function logApiCall(
  method: string,
  url: string,
  status?: number,
  duration?: number,
  error?: string
): void {
  if (typeof window !== 'undefined') {
    // クライアントサイド
    logClientApiCall(method, url, status, duration, error);
  } else {
    // サーバーサイド
    const category = LogCategory.API;
    
    if (error) {
      ServerLogger.error(category, `API呼び出し失敗: ${method} ${url}`, {
        status,
        duration: duration ? `${duration}ms` : undefined,
        error,
      });
    } else {
      ServerLogger.info(category, `API呼び出し成功: ${method} ${url}`, {
        status,
        duration: duration ? `${duration}ms` : undefined,
      });
    }
  }
}

// 認証用のログ関数
export function logAuth(
  action: 'login' | 'logout' | 'signup' | 'token_refresh' | 'auth_error',
  email?: string,
  success?: boolean,
  error?: string
): void {
  if (typeof window !== 'undefined') {
    // クライアントサイド
    logClientAuth(action, email, success, error);
  } else {
    // サーバーサイド
    const category = LogCategory.AUTH;
    const maskedEmail = email ? ServerLogger.maskEmail(email) : undefined;
    
    if (error) {
      ServerLogger.error(category, `認証エラー: ${action}`, {
        email: maskedEmail,
        error,
      });
    } else if (success === false) {
      ServerLogger.warn(category, `認証失敗: ${action}`, {
        email: maskedEmail,
      });
    } else {
      ServerLogger.info(category, `認証成功: ${action}`, {
        email: maskedEmail,
      });
    }
  }
}

// 音声処理用のログ関数
export function logVoice(
  action: 'start_recording' | 'stop_recording' | 'transcription_success' | 'transcription_error',
  duration?: number,
  error?: string
): void {
  if (typeof window !== 'undefined') {
    // クライアントサイド
    logClientVoice(action, duration, error);
  } else {
    // サーバーサイド
    const category = LogCategory.VOICE;
    
    if (error) {
      ServerLogger.error(category, `音声処理エラー: ${action}`, {
        duration: duration ? `${duration}ms` : undefined,
        error,
      });
    } else {
      ServerLogger.info(category, `音声処理: ${action}`, {
        duration: duration ? `${duration}ms` : undefined,
      });
    }
  }
}

// チャット用のログ関数
export function logChat(
  action: 'message_sent' | 'message_received' | 'chat_error',
  messageLength?: number,
  error?: string
): void {
  if (typeof window !== 'undefined') {
    // クライアントサイド
    logClientChat(action, messageLength, error);
  } else {
    // サーバーサイド
    const category = LogCategory.CHAT;
    
    if (error) {
      ServerLogger.error(category, `チャットエラー: ${action}`, {
        messageLength,
        error,
      });
    } else {
      ServerLogger.info(category, `チャット: ${action}`, {
        messageLength,
      });
    }
  }
}

export default UnifiedLogger;
