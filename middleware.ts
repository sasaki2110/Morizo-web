import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  // Edge Runtime対応のシンプルなログ
  console.log(`[MIDDLEWARE] HTTPリクエスト受信: ${request.method} ${request.nextUrl.pathname}`, {
    requestId,
    method: request.method,
    url: request.url,
    pathname: request.nextUrl.pathname,
    userAgent: request.headers.get('user-agent'),
    origin: request.headers.get('origin'),
    contentType: request.headers.get('content-type'),
    contentLength: request.headers.get('content-length'),
    timestamp: new Date().toISOString()
  });

  // レスポンスを返す前にログを記録
  const response = NextResponse.next();
  
  response.headers.set('X-Request-ID', requestId);
  
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
