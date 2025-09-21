import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await authenticateRequest(request);
    
    // 認証失敗の場合はNextResponseを返す
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;

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
    // 認証チェック
    const authResult = await authenticateRequest(request);
    
    // 認証失敗の場合はNextResponseを返す
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;

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
