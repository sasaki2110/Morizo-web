import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-server';
import { ServerLogger, LogCategory } from '@/lib/logging-utils';

const MORIZO_AI_URL = process.env.MORIZO_AI_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sseSessionId: string }> }
) {
  const timer = ServerLogger.startTimer('chat-stream-api');
  
  try {
    const { sseSessionId } = await params;
    
    ServerLogger.info(LogCategory.API, 'ストリーミングAPI呼び出し開始', {
      sseSessionId: sseSessionId
    });

    // 認証チェック
    ServerLogger.debug(LogCategory.API, '認証チェック開始');
    const authResult = await authenticateRequest(request);
    
    // 認証失敗の場合はNextResponseを返す
    if (authResult instanceof NextResponse) {
      ServerLogger.warn(LogCategory.API, '認証失敗');
      return authResult;
    }
    
    const { token } = authResult;
    ServerLogger.info(LogCategory.API, '認証成功', { 
      tokenMasked: ServerLogger.maskToken(token) 
    });

    // バックエンドのSSEエンドポイントにプロキシ
    const backendUrl = `${MORIZO_AI_URL}/chat/stream/${sseSessionId}`;
    ServerLogger.info(LogCategory.API, 'バックエンドSSE接続開始', { backendUrl });
    console.log('🔍 [SSE API] Backend URL:', backendUrl);
    console.log('🔍 [SSE API] MORIZO_AI_URL:', MORIZO_AI_URL);

    // バックエンド接続にタイムアウトを設定（10秒）
    const backendController = new AbortController();
    const backendTimeoutId = setTimeout(() => {
      console.log('🔍 [SSE API] Backend connection timeout after 10 seconds');
      backendController.abort();
    }, 10000);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      signal: backendController.signal,
    });
    
    clearTimeout(backendTimeoutId);
    console.log('🔍 [SSE API] Backend response status:', response.status);
    console.log('🔍 [SSE API] Backend response ok:', response.ok);

    if (!response.ok) {
      const errorMsg = `バックエンドSSE接続エラー: ${response.status}`;
      ServerLogger.error(LogCategory.API, errorMsg, { status: response.status });
      throw new Error(errorMsg);
    }

    ServerLogger.info(LogCategory.API, 'バックエンドSSE接続成功');

    // ストリーミングレスポンスをそのまま転送
    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.close();
                break;
              }
              controller.enqueue(value);
            }
          } catch (error) {
            ServerLogger.error(LogCategory.API, 'ストリーミング転送エラー', error);
            controller.error(error);
          }
        };

        pump();
      },
    });

    timer();
    logApiCall('GET', `/api/chat-stream/${sseSessionId}`, 200, undefined);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'chat-stream-api');
    const { sseSessionId } = await params;
    logApiCall('GET', `/api/chat-stream/${sseSessionId}`, 500, undefined, 
      error instanceof Error ? error.message : '不明なエラー');
    
    // エラー時はSSE形式でエラーメッセージを送信
    const errorMessage = `data: ${JSON.stringify({
      type: 'error',
      message: 'ストリーミング接続にエラーが発生しました',
      error: {
        code: 'STREAMING_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー'
      }
    })}\n\n`;

    return new Response(errorMessage, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}

// CORS対応のためのOPTIONSメソッド
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}

// ログ出力関数
function logApiCall(method: string, path: string, status: number, duration?: number, error?: string) {
  ServerLogger.info(LogCategory.API, 'API呼び出しログ', {
    method,
    path,
    status,
    duration,
    error
  });
}

function logError(category: LogCategory, error: unknown, context: string) {
  ServerLogger.error(category, `${context}でエラーが発生`, error);
}
