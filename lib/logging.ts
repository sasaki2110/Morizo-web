/**
 * Morizo Web - サーバーサイド専用ロギング設定
 * Morizo-aiのロギングシステムを参考にしたNext.js用ロギング設定
 * 注意: このファイルはサーバーサイドでのみ使用可能
 */

import fs from 'fs';
import path from 'path';

// ログレベル定義
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// ログカテゴリ定義
export enum LogCategory {
  MAIN = 'MAIN',
  AUTH = 'AUTH',
  API = 'API',
  VOICE = 'VOICE',
  CHAT = 'CHAT',
  SESSION = 'SESSION',
  COMPONENT = 'COMPONENT',
}

// ログ設定インターフェース
interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logFile: string;
  maxFileSize: number; // MB
  maxFiles: number;
}

// デフォルト設定
const defaultConfig: LogConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableFile: true,
  logFile: 'morizo_web.log',
  maxFileSize: 10, // 10MB
  maxFiles: 5,
};

class Logger {
  private config: LogConfig;
  private logDir: string;

  constructor(config: Partial<LogConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
    this.setupLogRotation();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private setupLogRotation(): void {
    const logPath = path.join(this.logDir, this.config.logFile);
    const backupPath = path.join(this.logDir, `${this.config.logFile}.1`);

    // 既存のログファイルがある場合、バックアップを作成
    if (fs.existsSync(logPath)) {
      try {
        // 既存のバックアップファイルがある場合は削除
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
          console.log(`🗑️ 古いバックアップログを削除: ${backupPath}`);
        }

        // 現在のログファイルをバックアップに移動
        fs.renameSync(logPath, backupPath);
        console.log(`📦 ログファイルをバックアップ: ${logPath} → ${backupPath}`);
      } catch (error) {
        console.error(`⚠️ ログローテーション失敗: ${error}`);
      }
    } else {
      console.log(`📝 新しいログファイルを作成: ${logPath}`);
    }
  }

  private formatMessage(level: LogLevel, category: LogCategory, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const emoji = this.getEmoji(level);
    const paddedCategory = category.padEnd(5, ' ');
    const paddedLevel = levelName.padEnd(5, ' ');
    
    let formattedMessage = `${timestamp} - ${paddedCategory} - ${paddedLevel} - ${emoji} ${message}`;
    
    if (data) {
      formattedMessage += ` | Data: ${JSON.stringify(data)}`;
    }
    
    return formattedMessage;
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍';
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      default:
        return '📝';
    }
  }

  private writeToFile(message: string): void {
    if (!this.config.enableFile) return;

    const logPath = path.join(this.logDir, this.config.logFile);
    
    try {
      fs.appendFileSync(logPath, message + '\n', 'utf8');
    } catch (error) {
      console.error(`ログファイル書き込みエラー: ${error}`);
    }
  }

  private writeToConsole(message: string): void {
    if (!this.config.enableConsole) return;
    console.log(message);
  }

  private log(level: LogLevel, category: LogCategory, message: string, data?: any): void {
    if (level < this.config.level) return;

    const formattedMessage = this.formatMessage(level, category, message, data);
    
    this.writeToConsole(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  // パブリックメソッド
  debug(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
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

  // パフォーマンス測定
  startTimer(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(LogCategory.MAIN, `Timer: ${label}`, { duration: `${duration}ms` });
    };
  }
}

// サーバーサイドでのみ初期化
let logger: Logger | null = null;

export function getServerLogger(): Logger {
  if (!logger) {
    logger = new Logger();
    
    // 環境変数による設定
    if (process.env.LOG_LEVEL) {
      const envLevel = parseInt(process.env.LOG_LEVEL);
      if (!isNaN(envLevel) && envLevel >= 0 && envLevel <= 3) {
        logger['config'].level = envLevel;
      }
    }

    if (process.env.LOG_CONSOLE === 'false') {
      logger['config'].enableConsole = false;
    }

    if (process.env.LOG_FILE === 'false') {
      logger['config'].enableFile = false;
    }

    // 初期化ログ
    logger.info(LogCategory.MAIN, '🚀 Morizo Web サーバーサイドロギングシステム初期化完了');
  }
  
  return logger;
}

export default getServerLogger;
