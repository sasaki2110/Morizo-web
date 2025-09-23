/**
 * Morizo Web - クライアントサイド専用ログ関数
 * ブラウザ環境でのみ使用可能なログ機能
 */

// ログレベル定義（クライアントサイド用）
export enum ClientLogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// ログカテゴリ定義（クライアントサイド用）
export enum ClientLogCategory {
  MAIN = 'MAIN',
  AUTH = 'AUTH',
  API = 'API',
  VOICE = 'VOICE',
  CHAT = 'CHAT',
  SESSION = 'SESSION',
  COMPONENT = 'COMPONENT',
}

// クライアントサイドログ設定
interface ClientLogConfig {
  level: ClientLogLevel;
  enableConsole: boolean;
}

// デフォルト設定
const defaultClientConfig: ClientLogConfig = {
  level: process.env.NODE_ENV === 'production' ? ClientLogLevel.INFO : ClientLogLevel.DEBUG,
  enableConsole: true,
};

class ClientLogger {
  private config: ClientLogConfig;

  constructor(config: Partial<ClientLogConfig> = {}) {
    this.config = { ...defaultClientConfig, ...config };
  }

  private formatMessage(level: ClientLogLevel, category: ClientLogCategory, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = ClientLogLevel[level];
    const emoji = this.getEmoji(level);
    const paddedCategory = category.padEnd(5, ' ');
    const paddedLevel = levelName.padEnd(5, ' ');
    
    let formattedMessage = `${timestamp} - ${paddedCategory} - ${paddedLevel} - ${emoji} ${message}`;
    
    if (data) {
      formattedMessage += ` | Data: ${JSON.stringify(data)}`;
    }
    
    return formattedMessage;
  }

  private getEmoji(level: ClientLogLevel): string {
    switch (level) {
      case ClientLogLevel.DEBUG:
        return '🔍';
      case ClientLogLevel.INFO:
        return 'ℹ️';
      case ClientLogLevel.WARN:
        return '⚠️';
      case ClientLogLevel.ERROR:
        return '❌';
      default:
        return '📝';
    }
  }

  private log(level: ClientLogLevel, category: ClientLogCategory, message: string, data?: any): void {
    if (level < this.config.level || !this.config.enableConsole) return;

    const formattedMessage = this.formatMessage(level, category, message, data);
    
    // ブラウザのコンソールに出力
    switch (level) {
      case ClientLogLevel.DEBUG:
        console.log(formattedMessage, data || '');
        break;
      case ClientLogLevel.INFO:
        console.log(formattedMessage, data || '');
        break;
      case ClientLogLevel.WARN:
        console.warn(formattedMessage, data || '');
        break;
      case ClientLogLevel.ERROR:
        console.error(formattedMessage, data || '');
        break;
    }
  }

  // パブリックメソッド
  debug(category: ClientLogCategory, message: string, data?: any): void {
    this.log(ClientLogLevel.DEBUG, category, message, data);
  }

  info(category: ClientLogCategory, message: string, data?: any): void {
    this.log(ClientLogLevel.INFO, category, message, data);
  }

  warn(category: ClientLogCategory, message: string, data?: any): void {
    this.log(ClientLogLevel.WARN, category, message, data);
  }

  error(category: ClientLogCategory, message: string, data?: any): void {
    this.log(ClientLogLevel.ERROR, category, message, data);
  }

  // パフォーマンス測定
  startTimer(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.info(ClientLogCategory.MAIN, `Timer: ${label}`, { duration: `${duration.toFixed(2)}ms` });
    };
  }

  // セキュリティ配慮: 個人情報をマスク
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    
    const [local, domain] = email.split('@', 2);
    if (local.length <= 2) {
      return `${local[0]}*@${domain}`;
    }
    return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  }

  maskToken(token: string): string {
    if (!token || token.length < 20) return token;
    return `${token.substring(0, 20)}...`;
  }
}

// シングルトンインスタンス
export const clientLogger = new ClientLogger();

// 便利な関数
export const clientLog = {
  debug: clientLogger.debug.bind(clientLogger),
  info: clientLogger.info.bind(clientLogger),
  warn: clientLogger.warn.bind(clientLogger),
  error: clientLogger.error.bind(clientLogger),
  timer: clientLogger.startTimer.bind(clientLogger),
  maskEmail: clientLogger.maskEmail.bind(clientLogger),
  maskToken: clientLogger.maskToken.bind(clientLogger),
};

// エラーハンドリング用のログ関数
export function logClientError(category: ClientLogCategory, error: Error | unknown, context?: string): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  clientLog.error(category, `エラー発生${context ? ` (${context})` : ''}: ${errorMessage}`, {
    stack: errorStack,
    context,
  });
}

// API呼び出し用のログ関数
export function logClientApiCall(
  method: string,
  url: string,
  status?: number,
  duration?: number,
  error?: string
): void {
  const category = ClientLogCategory.API;
  
  if (error) {
    clientLog.error(category, `API呼び出し失敗: ${method} ${url}`, {
      status,
      duration: duration ? `${duration}ms` : undefined,
      error,
    });
  } else {
    clientLog.info(category, `API呼び出し成功: ${method} ${url}`, {
      status,
      duration: duration ? `${duration}ms` : undefined,
    });
  }
}

// 認証用のログ関数
export function logClientAuth(
  action: 'login' | 'logout' | 'signup' | 'token_refresh' | 'auth_error',
  email?: string,
  success?: boolean,
  error?: string
): void {
  const category = ClientLogCategory.AUTH;
  const maskedEmail = email ? clientLog.maskEmail(email) : undefined;
  
  if (error) {
    clientLog.error(category, `認証エラー: ${action}`, {
      email: maskedEmail,
      error,
    });
  } else if (success === false) {
    clientLog.warn(category, `認証失敗: ${action}`, {
      email: maskedEmail,
    });
  } else {
    clientLog.info(category, `認証成功: ${action}`, {
      email: maskedEmail,
    });
  }
}

// 音声処理用のログ関数
export function logClientVoice(
  action: 'start_recording' | 'stop_recording' | 'transcription_success' | 'transcription_error',
  duration?: number,
  error?: string
): void {
  const category = ClientLogCategory.VOICE;
  
  if (error) {
    clientLog.error(category, `音声処理エラー: ${action}`, {
      duration: duration ? `${duration}ms` : undefined,
      error,
    });
  } else {
    clientLog.info(category, `音声処理: ${action}`, {
      duration: duration ? `${duration}ms` : undefined,
    });
  }
}

// チャット用のログ関数
export function logClientChat(
  action: 'message_sent' | 'message_received' | 'chat_error',
  messageLength?: number,
  error?: string
): void {
  const category = ClientLogCategory.CHAT;
  
  if (error) {
    clientLog.error(category, `チャットエラー: ${action}`, {
      messageLength,
      error,
    });
  } else {
    clientLog.info(category, `チャット: ${action}`, {
      messageLength,
    });
  }
}

export default clientLogger;
