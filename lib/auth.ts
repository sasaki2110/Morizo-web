import { supabase } from './supabase';

/**
 * 現在のユーザーの認証トークンを取得
 * @returns 認証トークン（取得できない場合はnull）
 */
export async function getCurrentAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('認証トークンの取得に失敗しました:', error);
    return null;
  }
}

/**
 * 認証トークンが必要なAPIリクエストのヘッダーを生成
 * @returns Authorizationヘッダーを含むヘッダーオブジェクト
 */
export async function getAuthHeaders(): Promise<{ 'Authorization': string } | null> {
  const token = await getCurrentAuthToken();
  if (!token) {
    return null;
  }
  
  return {
    'Authorization': `Bearer ${token}`
  };
}

/**
 * 認証が必要なAPIリクエストを実行
 * @param url APIエンドポイントのURL
 * @param options fetchのオプション
 * @returns fetchのレスポンス
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  
  if (!authHeaders) {
    throw new Error('認証トークンが取得できません。ログインしてください。');
  }
  
  const headers = {
    ...options.headers,
    ...authHeaders,
  };

  // 3分のタイムアウトを設定
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // 180秒 = 3分
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
