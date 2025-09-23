import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, authenticatedMorizoAIRequest } from '@/lib/auth-server';
import { ServerLogger, LogCategory, logApiCall, logError } from '@/lib/logging-utils';

const MORIZO_AI_URL = 'http://localhost:8000';

export async function POST(request: NextRequest) {
  const timer = ServerLogger.startTimer('chat-api');
  
  try {
    ServerLogger.info(LogCategory.API, 'チャットAPI呼び出し開始');
    
    const { message } = await request.json();
    ServerLogger.debug(LogCategory.API, 'リクエストボディ解析完了', { messageLength: message?.length });

    if (!message) {
      ServerLogger.warn(LogCategory.API, 'メッセージが空です');
      return NextResponse.json(
        { error: 'メッセージが空です' },
        { status: 400 }
      );
    }

    // 認証チェック
    ServerLogger.debug(LogCategory.API, '認証チェック開始');
    const authResult = await authenticateRequest(request);
    
    // 認証失敗の場合はNextResponseを返す
    if (authResult instanceof NextResponse) {
      ServerLogger.warn(LogCategory.API, '認証失敗');
      return authResult;
    }
    
    const { token } = authResult;
    ServerLogger.info(LogCategory.API, '認証成功', { tokenMasked: ServerLogger.maskToken(token) });

    // Morizo AIに送信（認証トークン付き）
    ServerLogger.info(LogCategory.API, 'Morizo AIにリクエスト送信開始');
    const response = await authenticatedMorizoAIRequest(`${MORIZO_AI_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
      }),
    }, token);

    if (!response.ok) {
      const errorMsg = `Morizo AI エラー: ${response.status}`;
      ServerLogger.error(LogCategory.API, errorMsg, { status: response.status });
      throw new Error(errorMsg);
    }

    const data = await response.json();
    ServerLogger.info(LogCategory.API, 'Morizo AIからのレスポンス受信完了', { 
      responseLength: data.response?.length || data.message?.length 
    });

    timer();
    logApiCall('POST', '/api/chat', 200, undefined);
    
    return NextResponse.json({
      response: data.response || data.message || 'レスポンスを取得できませんでした',
      success: true,
    });

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'chat-api');
    logApiCall('POST', '/api/chat', 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
    return NextResponse.json(
      { 
        error: 'Morizo AIとの通信に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
}
