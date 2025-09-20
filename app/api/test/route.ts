import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { 
          message: '認証トークンが提供されていません',
          error: 'No token provided',
          status: 'error'
        },
        { status: 401 }
      );
    }

    // サーバーサイドでSupabaseクライアントを作成
    const supabase = await createClient();
    
    // トークンを使用してユーザー情報を取得
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          message: '認証が必要です',
          error: 'Unauthorized',
          status: 'error'
        },
        { status: 401 }
      );
    }

    // 認証成功時のレスポンス
    const response = NextResponse.json({
      message: 'Morizo API is working! (認証済み)',
      timestamp: new Date().toISOString(),
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });

    // CORSヘッダーを追加
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  } catch (error) {
    return NextResponse.json(
      { 
        message: 'サーバーエラーが発生しました',
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { 
          message: '認証トークンが提供されていません',
          error: 'No token provided',
          status: 'error'
        },
        { status: 401 }
      );
    }

    // サーバーサイドでSupabaseクライアントを作成
    const supabase = await createClient();
    
    // トークンを使用してユーザー情報を取得
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          message: '認証が必要です',
          error: 'Unauthorized',
          status: 'error'
        },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await request.json().catch(() => ({}));

    // 認証成功時のレスポンス
    const response = NextResponse.json({
      message: 'Morizo API POST is working! (認証済み)',
      timestamp: new Date().toISOString(),
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      receivedData: body
    });

    // CORSヘッダーを追加
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  } catch (error) {
    return NextResponse.json(
      { 
        message: 'サーバーエラーが発生しました',
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  
  // CORSプリフライトリクエスト用のヘッダー
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}
