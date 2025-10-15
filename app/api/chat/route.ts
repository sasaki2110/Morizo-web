import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, authenticatedMorizoAIRequest } from '@/lib/auth-server';
import { ServerLogger, LogCategory, logApiCall, logError } from '@/lib/logging-utils';

const MORIZO_AI_URL = 'http://localhost:8000';

// CORSヘッダーを設定するヘルパー関数
function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

// OPTIONSリクエストのハンドラー（CORS preflight）
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}

export async function POST(request: NextRequest) {
  const timer = ServerLogger.startTimer('chat-api');
  
  try {
    ServerLogger.info(LogCategory.API, 'チャットAPI呼び出し開始');
    
    const { message, sse_session_id, confirm } = await request.json();
    ServerLogger.debug(LogCategory.API, 'リクエストボディ解析完了', { 
      messageLength: message?.length,
      sseSessionId: sse_session_id 
    });

    if (!message) {
      ServerLogger.warn(LogCategory.API, 'メッセージが空です');
      const response = NextResponse.json(
        { error: 'メッセージが空です' },
        { status: 400 }
      );
      return setCorsHeaders(response);
    }

    // 認証チェック
    ServerLogger.debug(LogCategory.API, '認証チェック開始');
    const authResult = await authenticateRequest(request);
    
    // 認証失敗の場合はNextResponseを返す
    if (authResult instanceof NextResponse) {
      ServerLogger.warn(LogCategory.API, '認証失敗');
      return setCorsHeaders(authResult);
    }
    
    const { token } = authResult;
    ServerLogger.info(LogCategory.API, '認証成功', { tokenMasked: ServerLogger.maskToken(token) });

    // Morizo AIに送信（認証トークン付き）
    ServerLogger.info(LogCategory.API, 'Morizo AIにリクエスト送信開始');
    ServerLogger.info(LogCategory.API, 'チャットAPI呼び出し開始 | Data', { 
      sseSessionId: sse_session_id 
    });
    const aiResponse = await authenticatedMorizoAIRequest(`${MORIZO_AI_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        sse_session_id: sse_session_id,
        confirm: confirm || false
      }),
    }, token);

    if (!aiResponse.ok) {
      const errorMsg = `Morizo AI エラー: ${aiResponse.status}`;
      ServerLogger.error(LogCategory.API, errorMsg, { status: aiResponse.status });
      throw new Error(errorMsg);
    }

    const data = await aiResponse.json();
    ServerLogger.info(LogCategory.API, 'Morizo AIからのレスポンス受信完了', { 
      responseLength: data.response?.length || data.message?.length 
    });

    timer();
    logApiCall('POST', '/api/chat', 200, undefined);
    
    const nextResponse = NextResponse.json({
      response: data.response || data.message || 'レスポンスを取得できませんでした',
      success: true,
    });
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'chat-api');
    logApiCall('POST', '/api/chat', 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
    const errorResponse = NextResponse.json(
      { 
        error: 'Morizo AIとの通信に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
    return setCorsHeaders(errorResponse);
  }
}
