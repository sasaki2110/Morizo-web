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
  const timer = ServerLogger.startTimer('inventory-upload-csv-api');
  
  try {
    ServerLogger.info(LogCategory.API, '在庫CSVアップロードAPI呼び出し開始');

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

    // FormDataを取得
    ServerLogger.debug(LogCategory.API, 'FormData取得開始');
    const formData = await request.formData();
    
    // ファイルの存在確認
    const file = formData.get('file') as File | null;
    if (!file) {
      ServerLogger.error(LogCategory.API, 'ファイルが提供されていません');
      const errorResponse = NextResponse.json(
        { 
          error: 'ファイルが提供されていません',
          detail: 'CSVファイルを選択してください'
        },
        { status: 400 }
      );
      return setCorsHeaders(errorResponse);
    }

    ServerLogger.info(LogCategory.API, 'ファイル取得完了', { 
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Morizo AIに送信（認証トークン付き）
    ServerLogger.info(LogCategory.API, 'Morizo AIにCSVアップロードリクエスト送信開始');
    
    const url = `${MORIZO_AI_URL}/api/inventory/upload-csv`;
    
    // FormDataを再構築（バックエンドに転送するため）
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    // 認証ヘッダーを設定
    const headers = {
      'Authorization': `Bearer ${token}`,
      // Content-TypeはFormDataの場合は自動設定されるため、明示的に設定しない
    };

    ServerLogger.debug(LogCategory.API, 'バックエンドへのリクエスト送信', { url });

    // 3分のタイムアウトを設定
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 180秒 = 3分

    const aiResponse = await fetch(url, {
      method: 'POST',
      headers,
      body: backendFormData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!aiResponse.ok) {
      // エラーレスポンスの処理
      let errorMessage = `Morizo AI エラー: ${aiResponse.status}`;
      try {
        const errorData = await aiResponse.json();
        errorMessage = errorData.detail || errorMessage;
        ServerLogger.error(LogCategory.API, 'Morizo AI エラー', { 
          status: aiResponse.status,
          error: errorMessage
        });
      } catch (parseError) {
        const errorText = await aiResponse.text();
        ServerLogger.error(LogCategory.API, 'Morizo AI エラーレスポンス解析失敗', { 
          status: aiResponse.status,
          errorText: errorText.substring(0, 200)
        });
        errorMessage = errorText || errorMessage;
      }

      const errorResponse = NextResponse.json(
        { 
          error: 'Morizo AIとの通信に失敗しました',
          detail: errorMessage
        },
        { status: aiResponse.status }
      );
      return setCorsHeaders(errorResponse);
    }

    const data = await aiResponse.json();
    ServerLogger.info(LogCategory.API, 'Morizo AIからのレスポンス受信完了', { 
      success: data.success,
      total: data.total,
      successCount: data.success_count,
      errorCount: data.error_count
    });

    timer();
    logApiCall('POST', '/api/inventory/upload-csv', 200, undefined);
    
    const nextResponse = NextResponse.json({
      success: data.success,
      total: data.total,
      success_count: data.success_count,
      error_count: data.error_count,
      errors: data.errors || []
    });
    
    return setCorsHeaders(nextResponse);

  } catch (error) {
    timer();
    logError(LogCategory.API, error, 'inventory-upload-csv-api');
    logApiCall('POST', '/api/inventory/upload-csv', 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
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

