
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { X, Volume2, Mic, MicOff, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

interface LiveExpertProps {
  coinName: string;
  onClose: () => void;
}

export const LiveExpert: React.FC<LiveExpertProps> = ({ coinName, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'active' | 'closed'>('connecting');
  const [transcription, setTranscription] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContextRef.current = inputCtx;
    outputAudioContextRef.current = outputCtx;

    let session: any;

    const connect = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        inputStreamRef.current = stream;

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => {
              setStatus('active');
              const source = inputCtx.createMediaStreamSource(stream);
              const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                if (isMuted) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
                const pcmBlob = {
                  data: encode(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputCtx.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              const audioBase64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audioBase64) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(audioBase64), outputCtx, 24000, 1);
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }
              if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                setTranscription(prev => [...prev.slice(-4), text]);
              }
            },
            onerror: (e) => { console.error("Live Error", e); setStatus('closed'); },
            onclose: () => { setStatus('closed'); }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            systemInstruction: `Eres un arqueólogo numismático experto en AUREXIA. Estás analizando la moneda: ${coinName}. Responde de forma culta, amable y apasionada sobre la historia romana e ibérica.`,
            outputAudioTranscription: {}
          }
        });
        session = await sessionPromise;
      } catch (e) {
        console.error(e);
        setStatus('closed');
      }
    };

    connect();

    return () => {
      if (inputStreamRef.current) inputStreamRef.current.getTracks().forEach(t => t.stop());
      if (inputCtx) inputCtx.close();
      if (outputCtx) outputCtx.close();
    };
  }, [coinName, isMuted]);

  return (
    <div className="fixed inset-0 z-[3000] bg-black/95 backdrop-blur-2xl flex flex-col animate-fadeIn">
      <div className="p-8 pt-16 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full glass-island flex items-center justify-center border-amber-400/40 border shadow-gold">
            <Sparkles className="text-amber-400" size={20} />
          </div>
          <div>
            <h3 className="serif-neo text-lg font-black text-amber-400 uppercase tracking-widest">Consultor Imperial</h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="mono text-[8px] text-white/40 uppercase font-black">{status === 'active' ? 'Sesión Activa' : 'Conectando con el Archivo...'}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-4 glass-island rounded-full text-white/60 active:scale-90"><X size={24} /></button>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center p-10 text-center">
        <div className="relative mb-16">
          <div className="absolute inset-0 bg-amber-400/20 blur-[100px] rounded-full animate-pulse" />
          <div className="relative w-48 h-48 rounded-full border-[10px] border-amber-400/20 flex items-center justify-center">
            {status === 'active' ? (
              <div className="flex gap-1.5 h-16 items-end">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div 
                    key={i} 
                    className="w-2 bg-amber-400 rounded-full animate-[wave_1.5s_infinite_ease-in-out]" 
                    style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }} 
                  />
                ))}
              </div>
            ) : (
              <Loader2 className="text-amber-400 animate-spin" size={60} />
            )}
          </div>
        </div>

        <div className="max-w-xs h-32 flex flex-col justify-end">
           {transcription.map((t, i) => (
             <p key={i} className={`text-sm serif-neo transition-all duration-500 ${i === transcription.length - 1 ? 'text-white scale-100 opacity-100' : 'text-white/20 scale-95 opacity-50'}`}>{t}</p>
           ))}
        </div>
      </div>

      <div className="p-10 pb-20 flex justify-center gap-8">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 ${isMuted ? 'bg-red-500/20 text-red-500 border-2 border-red-500/50' : 'glass-island text-amber-400 border-2 border-amber-400/50 shadow-gold'}`}
        >
          {isMuted ? <MicOff size={32} /> : <Mic size={32} />}
        </button>
      </div>
      
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
};
