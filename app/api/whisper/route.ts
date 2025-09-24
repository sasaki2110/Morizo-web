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
  
  try {
    ServerLogger.info(LogCategory.VOICE, 'Whisper API呼び出し開始');
    
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    ServerLogger.debug(LogCategory.VOICE, 'FormData解析完了', { 
      hasAudioFile: !!audioFile,
      fileSize: audioFile?.size,
      fileType: audioFile?.type
    });

    if (!audioFile) {
      ServerLogger.warn(LogCategory.VOICE, '音声ファイルが見つかりません');
      const response = NextResponse.json(
        { error: '音声ファイルが見つかりません' },
        { status: 400 }
      );
      return setCorsHeaders(response);
    }

    // Whisper APIに送信
    ServerLogger.info(LogCategory.VOICE, 'OpenAI Whisper APIに送信開始');
    logVoice('start_recording');
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja', // 日本語を指定
      response_format: 'text',
    });

    ServerLogger.info(LogCategory.VOICE, 'Whisper APIからの応答受信完了', { 
      transcriptionLength: transcription?.length 
    });
    logVoice('transcription_success');

    timer();
    logApiCall('POST', '/api/whisper', 200, undefined);
    
    const response = NextResponse.json({
      text: transcription,
      success: true,
    });
    return setCorsHeaders(response);

  } catch (error) {
    timer();
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
    return setCorsHeaders(response);
  }
}
