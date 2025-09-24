import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ServerLogger, LogCategory, logApiCall, logError, logVoice } from '@/lib/logging-utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  const timer = ServerLogger.startTimer('whisper-api');
  const requestId = Math.random().toString(36).substr(2, 9); // リクエストIDを生成
  
  try {
    ServerLogger.info(LogCategory.VOICE, 'Whisper API呼び出し開始', { 
      requestId,
      userAgent: request.headers.get('user-agent'),
      origin: request.headers.get('origin'),
      contentType: request.headers.get('content-type'),
      contentLength: request.headers.get('content-length')
    });
    
    ServerLogger.debug(LogCategory.VOICE, 'FormData解析開始', { requestId });
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    ServerLogger.info(LogCategory.VOICE, 'FormData解析完了', { 
      requestId,
      hasAudioFile: !!audioFile,
      fileSize: audioFile?.size,
      fileType: audioFile?.type,
      fileName: audioFile?.name,
      lastModified: audioFile?.lastModified
    });

    if (!audioFile) {
      ServerLogger.warn(LogCategory.VOICE, '音声ファイルが見つかりません', { requestId });
      const response = NextResponse.json(
        { error: '音声ファイルが見つかりません' },
        { status: 400 }
      );
      return setCorsHeaders(response);
    }

    // Whisper APIに送信
    ServerLogger.info(LogCategory.VOICE, 'OpenAI Whisper APIに送信開始', { 
      requestId,
      fileSize: audioFile.size,
      fileType: audioFile.type
    });
    logVoice('start_recording');
    
    const whisperStartTime = Date.now();
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja', // 日本語を指定
      response_format: 'text',
    });
    const whisperEndTime = Date.now();

    ServerLogger.info(LogCategory.VOICE, 'Whisper APIからの応答受信完了', { 
      requestId,
      transcriptionLength: transcription?.length,
      whisperDuration: `${whisperEndTime - whisperStartTime}ms`,
      transcriptionPreview: transcription?.substring(0, 50) + (transcription?.length > 50 ? '...' : '')
    });
    logVoice('transcription_success');

    timer();
    logApiCall('POST', '/api/whisper', 200, undefined);
    
    ServerLogger.info(LogCategory.VOICE, 'レスポンス送信開始', { 
      requestId,
      responseSize: transcription?.length || 0
    });
    
    const response = NextResponse.json({
      text: transcription,
      success: true,
    });
    const corsResponse = setCorsHeaders(response);
    
    ServerLogger.info(LogCategory.VOICE, 'レスポンス送信完了', { 
      requestId,
      statusCode: 200,
      hasCorsHeaders: corsResponse.headers.get('Access-Control-Allow-Origin') !== null
    });
    
    return corsResponse;

  } catch (error) {
    timer();
    
    ServerLogger.error(LogCategory.VOICE, 'Whisper API処理エラー', { 
      requestId,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : '不明なエラー',
      errorStack: error instanceof Error ? error.stack : undefined
    });
    
    logError(LogCategory.VOICE, error, 'whisper-api');
    logVoice('transcription_error', undefined, error instanceof Error ? error.message : '不明なエラー');
    logApiCall('POST', '/api/whisper', 500, undefined, error instanceof Error ? error.message : '不明なエラー');
    
    const response = NextResponse.json(
      { 
        error: '音声認識に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
    const corsResponse = setCorsHeaders(response);
    
    ServerLogger.error(LogCategory.VOICE, 'エラーレスポンス送信', { 
      requestId,
      statusCode: 500,
      hasCorsHeaders: corsResponse.headers.get('Access-Control-Allow-Origin') !== null
    });
    
    return corsResponse;
  }
}
