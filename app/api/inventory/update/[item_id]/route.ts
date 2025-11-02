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

export async function PUT(
  request: NextRequest,
  { params }: { params: { item_id: string } }
) {
  const timer = ServerLogger.startTimer('inventory-update-api');
  
  try {
    const itemId = params.item_id;
    ServerLogger.info(LogCategory.API, '在庫更新API呼び出し開始', { itemId });

    // リクエストボディの取得
    const body = await request.json();
    ServerLogger.debug(LogCategory.API, 'リクエストボディ解析完了', { 
      itemId,
      itemName: body.item_name,
      quantity: body.quantity
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
    ServerLogger.info(LogCategory.API, 'Morizo AIに在庫更新リクエスト送信開始');
    
    const url = `${MORIZO_AI_URL}/api/inventory/update/${itemId}`;
    
    const aiResponse = await authenticatedMorizoAIRequest(url, {
      method: 'PUT',
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

    const data = await aiResponse.json();
    ServerLogger.info(LogCategory.API, 'Morizo AIからのレスポンス受信完了', { 
      success: data.success,
      itemId: data.data?.id
    });

    timer();
    logApiCall('PUT', `/api/inventory/update/${itemId}`, 200, undefined);
    
    const nextResponse = NextResponse.json({
      success: data.success,
      data: data.data
    });
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'inventory-update-api');
    logApiCall('PUT', `/api/inventory/update/${params.item_id}`, 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
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

