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

export async function GET(request: NextRequest) {
  const timer = ServerLogger.startTimer('inventory-list-api');
  
  try {
    ServerLogger.info(LogCategory.API, '在庫一覧取得API呼び出し開始');

    // クエリパラメータの取得
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    
    ServerLogger.debug(LogCategory.API, 'クエリパラメータ解析完了', { 
      sortBy,
      sortOrder
    });

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
    ServerLogger.info(LogCategory.API, 'Morizo AIに在庫一覧取得リクエスト送信開始');
    
    // クエリパラメータを構築
    const queryParams = new URLSearchParams();
    queryParams.append('sort_by', sortBy);
    queryParams.append('sort_order', sortOrder);
    
    const queryString = queryParams.toString();
    const url = `${MORIZO_AI_URL}/api/inventory/list?${queryString}`;
    
    const aiResponse = await authenticatedMorizoAIRequest(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }, token);

    if (!aiResponse.ok) {
      const errorMsg = `Morizo AI エラー: ${aiResponse.status}`;
      ServerLogger.error(LogCategory.API, errorMsg, { status: aiResponse.status });
      throw new Error(errorMsg);
    }

    const data = await aiResponse.json();
    ServerLogger.info(LogCategory.API, 'Morizo AIからのレスポンス受信完了', { 
      success: data.success,
      dataLength: data.data?.length || 0
    });

    timer();
    logApiCall('GET', '/api/inventory/list', 200, undefined);
    
    const nextResponse = NextResponse.json({
      success: data.success,
      data: data.data
    });
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'inventory-list-api');
    logApiCall('GET', '/api/inventory/list', 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
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

