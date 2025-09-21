import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, authenticatedMorizoAIRequest } from '@/lib/auth-server';

const MORIZO_AI_URL = 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'メッセージが空です' },
        { status: 400 }
      );
    }

    // 認証チェック
    const authResult = await authenticateRequest(request);
    
    // 認証失敗の場合はNextResponseを返す
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { token } = authResult;

    // Morizo AIに送信（認証トークン付き）
    const response = await authenticatedMorizoAIRequest(`${MORIZO_AI_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
      }),
    }, token);

    if (!response.ok) {
      throw new Error(`Morizo AI エラー: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      response: data.response || data.message || 'レスポンスを取得できませんでした',
      success: true,
    });

  } catch (error) {
    console.error('Morizo AI 通信エラー:', error);
    
    return NextResponse.json(
      { 
        error: 'Morizo AIとの通信に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
}
