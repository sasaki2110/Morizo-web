import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔍 [Test SSE] Endpoint called');
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      console.log('🔍 [Test SSE] Stream started');
      
      // 即座に接続メッセージを送信
      const connectedMessage = 'data: {"type": "connected", "message": "Test SSE connected"}\n\n';
      controller.enqueue(encoder.encode(connectedMessage));
      console.log('🔍 [Test SSE] Connected message sent');
      
      // 1秒後に進捗メッセージを送信
      setTimeout(() => {
        const progressMessage = 'data: {"type": "progress", "message": "Test progress"}\n\n';
        controller.enqueue(encoder.encode(progressMessage));
        console.log('🔍 [Test SSE] Progress message sent');
      }, 1000);
      
      // 2秒後に完了メッセージを送信
      setTimeout(() => {
        const completeMessage = 'data: {"type": "complete", "message": "Test complete"}\n\n';
        controller.enqueue(encoder.encode(completeMessage));
        console.log('🔍 [Test SSE] Complete message sent');
        controller.close();
      }, 2000);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
