import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json({
    message: 'Morizo API is working!',
    timestamp: new Date().toISOString(),
    status: 'success'
  });

  // CORSヘッダーを追加
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export async function POST() {
  const response = NextResponse.json({
    message: 'Morizo API POST is working!',
    timestamp: new Date().toISOString(),
    status: 'success'
  });

  // CORSヘッダーを追加
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  
  // CORSプリフライトリクエスト用のヘッダー
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}
