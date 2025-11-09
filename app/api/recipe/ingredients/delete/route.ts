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

export async function POST(request: NextRequest) {
  const timer = ServerLogger.startTimer('ingredient-delete-api');
  
  try {
    ServerLogger.info(LogCategory.API, '食材削除API呼び出し開始');
    
    const body = await request.json();
    const { date, ingredients } = body;
    ServerLogger.debug(LogCategory.API, 'リクエストボディ解析完了', { 
      date,
      ingredientsCount: ingredients?.length || 0
    });

    if (!date) {
      ServerLogger.warn(LogCategory.API, '日付パラメータが不足しています');
      const response = NextResponse.json(
        { error: '日付パラメータが必要です' },
        { status: 400 }
      );
      return setCorsHeaders(response);
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      ServerLogger.warn(LogCategory.API, '食材リストが空または無効です');
      const response = NextResponse.json(
        { error: '食材リストが必要です' },
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
    ServerLogger.info(LogCategory.API, 'Morizo AIに食材削除リクエスト送信開始');
    const aiResponse = await authenticatedMorizoAIRequest(
      `${MORIZO_AI_URL}/api/recipe/ingredients/delete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: date,
          ingredients: ingredients
        }),
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
      deletedCount: data.deleted_count,
      updatedCount: data.updated_count
    });

    timer();
    logApiCall('POST', '/api/recipe/ingredients/delete', 200, undefined);
    
    const nextResponse = NextResponse.json({
      success: data.success,
      deleted_count: data.deleted_count,
      updated_count: data.updated_count,
      failed_items: data.failed_items || []
    });
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'ingredient-delete-api');
    logApiCall('POST', '/api/recipe/ingredients/delete', 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
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

