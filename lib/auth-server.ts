import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * API Routes用の認証ユーティリティ
 */

/**
 * リクエストから認証トークンを抽出
 * @param request NextRequestオブジェクト
 * @returns 認証トークン（取得できない場合はnull）
 */
export function extractAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // "Bearer " を除去
}

/**
 * 認証トークンからユーザー情報を取得
 * @param token 認証トークン
 * @returns ユーザー情報（取得できない場合はnull）
 */
export async function getUserFromToken(token: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('ユーザー情報の取得に失敗しました:', error);
    return null;
  }
}

/**
 * 認証が必要なAPIエンドポイント用の認証チェック
 * @param request NextRequestオブジェクト
 * @returns 認証成功時はユーザー情報、失敗時はNextResponse
 */
export async function authenticateRequest(request: NextRequest) {
  const token = extractAuthToken(request);
  
  if (!token) {
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
    return NextResponse.json(
      { 
        error: '認証に失敗しました',
        message: '無効なトークンまたはユーザーが見つかりません'
      },
      { status: 401 }
    );
  }
  
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
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };
  
  return fetch(url, {
    ...options,
    headers,
  });
}
