'use client';

import { useState, useRef } from 'react';
import { WebAudioRecorder, isAudioRecordingSupported } from '@/lib/audio';
import { clientLog, ClientLogCategory, logClientVoice } from '@/lib/client-logging';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onError: (error: string) => void;
}

export default function VoiceRecorder({ onTranscriptionComplete, onError }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recorderRef = useRef<WebAudioRecorder | null>(null);

  const startRecording = async () => {
    clientLog.info(ClientLogCategory.VOICE, '音声録音開始処理');
    
    if (!isAudioRecordingSupported()) {
      const errorMsg = 'お使いのブラウザは音声録音をサポートしていません';
      clientLog.error(ClientLogCategory.VOICE, errorMsg);
      logClientVoice('start_recording', undefined, errorMsg);
      onError(errorMsg);
      return;
    }

    try {
      clientLog.debug(ClientLogCategory.VOICE, 'WebAudioRecorder初期化');
      recorderRef.current = new WebAudioRecorder();
      
      clientLog.debug(ClientLogCategory.VOICE, '録音開始');
      await recorderRef.current.startRecording();
      setIsRecording(true);
      
      clientLog.info(ClientLogCategory.VOICE, '音声録音開始成功');
      logClientVoice('start_recording');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '録音の開始に失敗しました';
      clientLog.error(ClientLogCategory.VOICE, errorMsg, { error });
      logClientVoice('start_recording', undefined, errorMsg);
      onError(errorMsg);
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current) {
      clientLog.warn(ClientLogCategory.VOICE, '録音停止: recorderRefがnullです');
      return;
    }

    try {
      clientLog.info(ClientLogCategory.VOICE, '音声録音停止処理開始');
      setIsProcessing(true);
      
      const timer = clientLog.timer('stop-recording');
      const audioBlob = await recorderRef.current.stopRecording();
      timer();
      
      setIsRecording(false);
      
      clientLog.info(ClientLogCategory.VOICE, '音声録音停止成功', { 
        blobSize: audioBlob.size,
        blobType: audioBlob.type 
      });
      logClientVoice('stop_recording');

      // Whisper APIに送信
      await sendToWhisper(audioBlob);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '録音の停止に失敗しました';
      clientLog.error(ClientLogCategory.VOICE, errorMsg, { error });
      logClientVoice('stop_recording', undefined, errorMsg);
      onError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendToWhisper = async (audioBlob: Blob) => {
    try {
      clientLog.info(ClientLogCategory.VOICE, 'Whisper API送信開始', { 
        blobSize: audioBlob.size,
        blobType: audioBlob.type 
      });
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const timer = clientLog.timer('whisper-api-call');
      const response = await fetch('/api/whisper', {
        method: 'POST',
        body: formData,
      });
      timer();

      if (!response.ok) {
        const errorMsg = `Whisper API エラー: ${response.status}`;
        clientLog.error(ClientLogCategory.VOICE, errorMsg, { status: response.status });
        logClientVoice('transcription_error', undefined, errorMsg);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      clientLog.info(ClientLogCategory.VOICE, 'Whisper API応答受信完了', { 
        transcriptionLength: data.text?.length 
      });
      logClientVoice('transcription_success');
      
      onTranscriptionComplete(data.text);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '音声認識に失敗しました';
      clientLog.error(ClientLogCategory.VOICE, errorMsg, { error });
      logClientVoice('transcription_error', undefined, errorMsg);
      onError(errorMsg);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-200 transform hover:scale-105
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            shadow-lg
          `}
        >
          {isProcessing ? (
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          ) : isRecording ? (
            <div className="w-8 h-8 bg-white rounded-sm" />
          ) : (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          )}
        </button>
        
        {isRecording && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-ping" />
        )}
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          {isProcessing 
            ? '音声を認識中...' 
            : isRecording 
              ? '録音中... クリックして停止' 
              : 'クリックして録音開始'
          }
        </p>
      </div>
    </div>
  );
}
