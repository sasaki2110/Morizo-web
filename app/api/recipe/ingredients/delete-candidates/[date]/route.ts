import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, authenticatedMorizoAIRequest } from '@/lib/auth-server';
import { ServerLogger, LogCategory, logApiCall, logError } from '@/lib/logging-utils';

const MORIZO_AI_URL = process.env.MORIZO_AI_URL || 'http://localhost:8000';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const timer = ServerLogger.startTimer('ingredient-delete-candidates-api');
  
  try {
    ServerLogger.info(LogCategory.API, '食材削除候補取得API呼び出し開始');
    
    const { date } = await params;
    ServerLogger.debug(LogCategory.API, 'パラメータ解析完了', { 
      date
    });

    if (!date) {
      ServerLogger.warn(LogCategory.API, '日付パラメータが不足しています');
      const response = NextResponse.json(
        { error: '日付パラメータが必要です' },
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
    ServerLogger.info(LogCategory.API, 'Morizo AIに食材削除候補取得リクエスト送信開始');
    const aiResponse = await authenticatedMorizoAIRequest(
      `${MORIZO_AI_URL}/api/recipe/ingredients/delete-candidates/${date}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      token
    );

    if (!aiResponse.ok) {
      const errorMsg = `Morizo AI エラー: ${aiResponse.status}`;
      ServerLogger.error(LogCategory.API, errorMsg, { status: aiResponse.status });
      throw new Error(errorMsg);
    }

    const data = await aiResponse.json();
    ServerLogger.info(LogCategory.API, 'Morizo AIからのレスポンス受信完了', { 
      success: data.success,
      candidatesCount: data.candidates?.length || 0
    });

    timer();
    logApiCall('GET', `/api/recipe/ingredients/delete-candidates/${date}`, 200, undefined);
    
    const nextResponse = NextResponse.json({
      success: data.success,
      date: data.date,
      candidates: data.candidates
    });
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'ingredient-delete-candidates-api');
    const dateParam = params ? (await params).date : 'unknown';
    logApiCall('GET', `/api/recipe/ingredients/delete-candidates/${dateParam}`, 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
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

