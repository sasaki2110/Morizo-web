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
  const timer = ServerLogger.startTimer('recipe-adopt-api');
  
  try {
    ServerLogger.info(LogCategory.API, 'レシピ採用API呼び出し開始');
    
    const { recipes } = await request.json();
    ServerLogger.debug(LogCategory.API, 'リクエストボディ解析完了', { 
      recipesCount: recipes?.length || 0
    });

    if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
      ServerLogger.warn(LogCategory.API, 'レシピが空または無効です');
      const response = NextResponse.json(
        { error: 'レシピが選択されていません' },
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
    ServerLogger.info(LogCategory.API, 'Morizo AIにレシピ採用リクエスト送信開始');
    const aiResponse = await authenticatedMorizoAIRequest(`${MORIZO_AI_URL}/api/recipe/adopt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipes: recipes
      }),
    }, token);

    if (!aiResponse.ok) {
      const errorMsg = `Morizo AI エラー: ${aiResponse.status}`;
      ServerLogger.error(LogCategory.API, errorMsg, { status: aiResponse.status });
      throw new Error(errorMsg);
    }

    const data = await aiResponse.json();
    ServerLogger.info(LogCategory.API, 'Morizo AIからのレスポンス受信完了', { 
      success: data.success,
      totalSaved: data.total_saved
    });

    timer();
    logApiCall('POST', '/api/recipe/adopt', 200, undefined);
    
    const nextResponse = NextResponse.json({
      success: data.success,
      message: data.message,
      saved_recipes: data.saved_recipes,
      total_saved: data.total_saved
    });
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'recipe-adopt-api');
    logApiCall('POST', '/api/recipe/adopt', 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
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
