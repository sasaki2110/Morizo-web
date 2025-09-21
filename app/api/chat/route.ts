import { NextRequest, NextResponse } from 'next/server';

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

    // Morizo AIに送信
    const response = await fetch(`${MORIZO_AI_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
      }),
    });

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
