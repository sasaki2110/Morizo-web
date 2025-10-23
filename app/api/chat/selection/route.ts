import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, authenticatedMorizoAIRequest } from '@/lib/auth-server';
import { ServerLogger, LogCategory, logApiCall, logError } from '@/lib/logging-utils';
import { SelectionRequest, SelectionResponse } from '@/types/menu';

const MORIZO_AI_URL = 'http://localhost:8000';

// CORSヘッダーを設定するヘルパー関数
function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

// OPTIONSリクエストのハンドラー（CORS preflight）
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}

export async function POST(request: NextRequest) {
  const timer = ServerLogger.startTimer('selection-api');
  
  try {
    ServerLogger.info(LogCategory.API, '選択API呼び出し開始');
    
    const body: SelectionRequest = await request.json();
    ServerLogger.debug(LogCategory.API, 'リクエストボディ解析完了', { 
      taskId: body.task_id,
      selection: body.selection 
    });

    // バリデーション
    if (!body.task_id || !body.selection || body.selection < 1 || body.selection > 5) {
      ServerLogger.warn(LogCategory.API, '無効な選択リクエスト');
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Invalid selection request. task_id and selection (1-5) are required.' 
        } as SelectionResponse,
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
    ServerLogger.info(LogCategory.API, 'Morizo AIに選択リクエスト送信開始');
    const aiResponse = await authenticatedMorizoAIRequest(`${MORIZO_AI_URL}/chat/selection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }, token);

    if (!aiResponse.ok) {
      const errorMsg = `Morizo AI エラー: ${aiResponse.status}`;
      ServerLogger.error(LogCategory.API, errorMsg, { status: aiResponse.status });
      throw new Error(errorMsg);
    }

    const result: SelectionResponse = await aiResponse.json();
    ServerLogger.info(LogCategory.API, 'Morizo AIからのレスポンス受信完了');

    timer();
    logApiCall('POST', '/api/chat/selection', 200, undefined);
    
    const nextResponse = NextResponse.json(result);
    return setCorsHeaders(nextResponse);

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'selection-api');
    logApiCall('POST', '/api/chat/selection', 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
    const errorResponse = NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      } as SelectionResponse,
      { status: 500 }
    );
    return setCorsHeaders(errorResponse);
  }
}
