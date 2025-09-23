import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ServerLogger, LogCategory, logAuth, logError } from './logging-utils';

/**
 * API Routes用の認証ユーティリティ
 */

/**
 * リクエストから認証トークンを抽出
 * @param request NextRequestオブジェクト
 * @returns 認証トークン（取得できない場合はnull）
 */
export function extractAuthToken(request: NextRequest): string | null {
  ServerLogger.debug(LogCategory.AUTH, '認証トークン抽出開始');
  
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ServerLogger.warn(LogCategory.AUTH, '認証ヘッダーが見つからないか、Bearer形式ではありません');
    return null;
  }
  
  const token = authHeader.substring(7); // "Bearer " を除去
  ServerLogger.debug(LogCategory.AUTH, '認証トークン抽出完了', { 
    tokenMasked: ServerLogger.maskToken(token) 
  });
  
  return token;
}

/**
 * 認証トークンからユーザー情報を取得
 * @param token 認証トークン
 * @returns ユーザー情報（取得できない場合はnull）
 */
export async function getUserFromToken(token: string) {
  try {
    ServerLogger.debug(LogCategory.AUTH, 'Supabaseクライアント初期化');
    const supabase = await createClient();
    
    ServerLogger.debug(LogCategory.AUTH, 'Supabaseでユーザー情報取得開始');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      ServerLogger.warn(LogCategory.AUTH, 'ユーザー情報取得失敗', { 
        error: error?.message,
        hasUser: !!user 
      });
      return null;
    }
    
    ServerLogger.info(LogCategory.AUTH, 'ユーザー情報取得成功', { 
      userId: user.id,
      emailMasked: ServerLogger.maskEmail(user.email || '')
    });
    
    return user;
  } catch (error) {
    logError(LogCategory.AUTH, error, 'getUserFromToken');
    return null;
  }
}

/**
 * 認証が必要なAPIエンドポイント用の認証チェック
 * @param request NextRequestオブジェクト
 * @returns 認証成功時はユーザー情報、失敗時はNextResponse
 */
export async function authenticateRequest(request: NextRequest) {
  ServerLogger.info(LogCategory.AUTH, '認証リクエスト処理開始');
  
  const token = extractAuthToken(request);
  
  if (!token) {
    ServerLogger.warn(LogCategory.AUTH, '認証トークンが提供されていません');
    logAuth('auth_error', undefined, false, '認証トークンが提供されていません');
    
    return NextResponse.json(
      { 
        error: '認証トークンが必要です',
        message: 'AuthorizationヘッダーにBearerトークンを設定してください'
      },
      { status: 401 }
    );
  }
  
  const user = await getUserFromToken(token);
  
  if (!user) {
    ServerLogger.warn(LogCategory.AUTH, '認証に失敗しました');
    logAuth('auth_error', undefined, false, '無効なトークンまたはユーザーが見つかりません');
    
    return NextResponse.json(
      { 
        error: '認証に失敗しました',
        message: '無効なトークンまたはユーザーが見つかりません'
      },
      { status: 401 }
    );
  }
  
  ServerLogger.info(LogCategory.AUTH, '認証成功');
  logAuth('login', user.email, true);
  
  return { user, token };
}

/**
 * 認証付きでMorizo AIにリクエストを送信
 * @param url Morizo AIのエンドポイントURL
 * @param options fetchのオプション
 * @param token 認証トークン
 * @returns fetchのレスポンス
 */
export async function authenticatedMorizoAIRequest(
  url: string, 
  options: RequestInit = {}, 
  token: string
): Promise<Response> {
  ServerLogger.debug(LogCategory.API, 'Morizo AI認証付きリクエスト準備', { 
    url,
    method: options.method || 'GET',
    tokenMasked: ServerLogger.maskToken(token)
  });
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };
  
  ServerLogger.info(LogCategory.API, 'Morizo AIにリクエスト送信中');
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    ServerLogger.info(LogCategory.API, 'Morizo AIからのレスポンス受信', { 
      status: response.status,
      statusText: response.statusText
    });
    
    return response;
  } catch (error) {
    logError(LogCategory.API, error, 'authenticatedMorizoAIRequest');
    throw error;
  }
}
