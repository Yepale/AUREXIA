
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AurexiaLogo, Camera, History, MapIcon, User, 
  Moon, Sun, Box, Info, 
  Layers, ChevronLeft, Save, 
  Shield, Globe, 
  Sparkles, Upload, RotateCw, Check, Settings, LogOut, Crown,
  ChevronRight, Fingerprint, Weight, Diameter, MapPin, Download, Image as ImageIcon,
  Trash2, Edit3, Award, RefreshCw, Key, Zap, Volume2, VolumeX, Eye, EyeOff, Mail,
  LayoutDashboard, Star, Award as AwardIcon, Palette, Sliders, Bell, Database, Filter, Search,
  LogIn, Share2, X, LayoutGrid, List, Music, ArrowRight, Lock, MousePointer2
} from './components/Icons';
import { AppView, CoinData, IdentificationResult, UserProfile, UserPlan } from './types';
import { Coin3DViewer } from './components/Coin3DViewer';
import { MapView } from './components/MapView';
import { LiveExpert } from './components/LiveExpert';
import { expandCoinDescription, generateHistoricalScene, identifyCoin, estimatePhysicalProperties, generateCoinVideo } from './services/geminiService';

declare const window: any;

type MapFilter = 'ALL' | 'ROMAN' | 'IBERIAN';

const PERMISSIONS = {
  COLLECTION_LIMIT: (plan: UserPlan) => plan === 'FREE' ? 5 : Infinity,
  LIVE_EXPERT: (plan: UserPlan) => plan !== 'FREE',
  CINEMATIC_VIDEO: (plan: UserPlan) => plan === 'IMPERATOR',
  SCENE_GENERATION: (plan: UserPlan) => plan !== 'FREE',
  EXPORT_3D: (plan: UserPlan) => plan === 'IMPERATOR'
};

const SubscriptionModal: React.FC<{ plan: UserPlan, onClose: () => void, onUpgrade: (p: UserPlan) => void }> = ({ plan, onClose, onUpgrade }) => (
  <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fadeIn">
    <div className="glass-island w-full max-w-sm rounded-[3rem] overflow-hidden border-amber-400/30 flex flex-col shadow-gold">
      <div className="bg-amber-400/10 p-10 text-center relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/40"><X size={20}/></button>
        <Crown size={48} className="text-amber-400 mx-auto mb-4 gold-glow" />
        <h3 className="serif-neo text-2xl font-black text-amber-400 tracking-widest uppercase">Ascenso de Rango</h3>
        <p className="mono text-[9px] text-white/40 mt-2 uppercase tracking-widest">Desbloquea el Archivo Prohibido</p>
      </div>
      <div className="p-8 space-y-6">
        <div className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${plan === 'CENTURION' ? 'border-amber-400 bg-amber-400/5' : 'border-white/5 bg-white/5'}`} onClick={() => onUpgrade('CENTURION')}>
          <div className="flex justify-between items-center mb-2">
            <span className="serif-neo text-sm font-black text-white uppercase tracking-widest">CENTURIÓN</span>
            <span className="mono text-[10px] text-amber-400 font-black">9.99€ / mes</span>
          </div>
          <p className="text-[10px] text-white/60 leading-relaxed italic">Consultas ilimitadas con el Experto, reconstrucción de escenas y archivo sin límites.</p>
        </div>
        <div className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${plan === 'IMPERATOR' ? 'border-amber-400 bg-amber-400/5' : 'border-white/5 bg-white/5'}`} onClick={() => onUpgrade('IMPERATOR')}>
           <div className="relative">
             <div className="absolute -top-8 right-0 bg-amber-400 text-black px-3 py-0.5 rounded-full mono text-[7px] font-black uppercase tracking-widest">Más Popular</div>
             <div className="flex justify-between items-center mb-2">
               <span className="serif-neo text-sm font-black text-amber-400 uppercase tracking-widest">IMPERATOR</span>
               <span className="mono text-[10px] text-amber-400 font-black">19.99€ / mes</span>
             </div>
             <p className="text-[10px] text-white/60 leading-relaxed italic">Todo lo anterior + Vídeo Cinematográfico Veo, exportación 4K y acceso al Círculo Interno.</p>
           </div>
        </div>
        <button onClick={onClose} className="w-full py-4 premium-gold-btn rounded-full mono text-xs font-black uppercase tracking-widest shadow-gold">Confirmar Ascenso</button>
      </div>
    </div>
  </div>
);

const ScanLine: React.FC = () => (
  <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
    <div className="w-[300px] h-[300px] relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(212,175,55,0.8)] animate-scanLine" />
    </div>
    <style>{`
      @keyframes scanLineAnim {
        0% { top: 0%; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { top: 100%; opacity: 0; }
      }
      .animate-scanLine {
        animation: scanLineAnim 3s linear infinite;
      }
    `}</style>
  </div>
);

const DynamicScannerHUD: React.FC<{ videoRef: React.RefObject<HTMLVideoElement | null>, side: 'OBVERSE' | 'REVERSE', onHudUpdate?: (state: any) => void }> = ({ videoRef, side, onHudUpdate }) => {
  const [hudState, setHudState] = useState({ size: 280, opacity: 0.4, locked: false, x: 0, y: 0, bounds: null as any });
  const analysisCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const requestRef = useRef<number>(0);
  const onHudUpdateRef = useRef(onHudUpdate);

  useEffect(() => {
    onHudUpdateRef.current = onHudUpdate;
  }, [onHudUpdate]);

  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      requestRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = analysisCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (ctx) {
      canvas.width = 100; canvas.height = 100;
      const vWidth = video.videoWidth; const vHeight = video.videoHeight;
      const vMin = Math.min(vWidth, vHeight);
      const sx = (vWidth - vMin) / 2; const sy = (vHeight - vMin) / 2;

      ctx.drawImage(video, sx, sy, vMin, vMin, 0, 0, 100, 100);
      const imageData = ctx.getImageData(0, 0, 100, 100);
      const data = imageData.data;
      
      let minX = 100, maxX = 0, minY = 100, maxY = 0;
      let count = 0;
      let avgB = 0;
      for (let i = 0; i < data.length; i += 4) {
        avgB += (data[i] + data[i+1] + data[i+2]) / 3;
      }
      avgB /= (100 * 100);

      for (let y = 10; y < 90; y++) {
        for (let x = 10; x < 90; x++) {
          const idx = (y * 100 + x) * 4;
          const b = (data[idx] + data[idx+1] + data[idx+2]) / 3;
          if (Math.abs(b - avgB) > 40) {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            count++;
          }
        }
      }
      
      setHudState(prev => {
        let newState;
        if (count > 200) {
          const detectedW = (maxX - minX);
          const detectedH = (maxY - minY);
          const detectedDiameter = Math.max(detectedW, detectedH);
          const targetGuideSize = Math.max(160, Math.min(320, detectedDiameter * 3.5));
          const centerX = ((minX + maxX) / 2 - 50) * 2;
          const centerY = ((minY + maxY) / 2 - 50) * 2;
          
          newState = {
            size: prev.size * 0.9 + targetGuideSize * 0.1,
            x: prev.x * 0.9 + centerX * 0.1,
            y: prev.y * 0.9 + centerY * 0.1,
            opacity: 0.8, locked: true,
            bounds: { minX, maxX, minY, maxY }
          };
        } else {
          newState = {
            size: prev.size * 0.95 + 280 * 0.05,
            x: prev.x * 0.95, y: prev.y * 0.95,
            opacity: 0.3, locked: false,
            bounds: null
          };
        }
        return newState;
      });
    }
    requestRef.current = requestAnimationFrame(analyzeFrame);
  }, [videoRef]);

  useEffect(() => {
    if (onHudUpdate) onHudUpdate(hudState);
  }, [hudState, onHudUpdate]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(analyzeFrame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [analyzeFrame]);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden">
      <ScanLine />
      <div 
        className="relative transition-all duration-500 ease-out flex items-center justify-center"
        style={{ 
          width: `${hudState.size}px`, 
          height: `${hudState.size}px`,
          transform: `translate(${hudState.x}px, ${hudState.y}px)`,
          opacity: hudState.opacity
        }}
      >
        {[0, 90, 180, 270].map(rot => (
          <div 
            key={rot}
            className={`absolute w-10 h-10 border-t-2 border-l-2 transition-colors duration-300 ${hudState.locked ? 'border-amber-400' : 'border-white/40'}`}
            style={{ 
              top: 0, left: 0, 
              transform: `rotate(${rot}deg)`,
              transformOrigin: `${hudState.size / 2}px ${hudState.size / 2}px`
            }}
          />
        ))}
        <div className={`w-full h-full rounded-full border border-dashed transition-all duration-300 ${hudState.locked ? 'border-amber-400/50 scale-100' : 'border-white/20 scale-90'}`} />
        <div className="absolute -bottom-20 flex flex-col items-center gap-2 min-w-[240px]">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${hudState.locked ? 'bg-amber-400 animate-pulse' : 'bg-white/20'}`} />
            <span className={`mono text-[10px] uppercase tracking-[0.2em] font-black ${hudState.locked ? 'text-amber-400' : 'text-white/40'}`}>
              {hudState.locked ? 'OBJETO DETECTADO' : 'BUSCANDO RELIQUIA...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CoinThumbnail = ({ src, label, active, onClick, onClear }: { src?: string | null, label: string, active: boolean, onClick: () => void, onClear?: () => void }) => (
  <div 
    onClick={onClick}
    className={`flex flex-col items-center gap-2 transition-all duration-500 relative ${active ? 'scale-110' : 'scale-90 opacity-60'}`}
  >
    <div className={`w-20 h-20 rounded-full overflow-hidden border-2 p-0.5 bg-black/40 shadow-xl transition-all ${active ? 'border-amber-400 shadow-gold scale-105' : 'border-white/20'}`}>
      {src ? (
        <img src={src} className="w-full h-full object-cover rounded-full" alt={label} referrerPolicy="no-referrer" />
      ) : (
        <div className="w-full h-full rounded-full flex items-center justify-center bg-white/5">
           <Camera size={24} className="text-white/20" />
        </div>
      )}
    </div>
    <span className={`mono text-[8px] font-black uppercase tracking-widest ${active ? 'text-amber-400' : 'text-white/40'}`}>{label}</span>
    {src && active && onClear && (
      <button 
        onClick={(e) => { e.stopPropagation(); onClear(); }}
        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg animate-fadeIn"
      >
        <Trash2 size={12} />
      </button>
    )}
    {active && (
      <div className="absolute -bottom-1 w-8 h-1 bg-amber-400 rounded-full shadow-gold" />
    )}
  </div>
);

const useSoundEngine = () => {
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('aurexia_muted') === 'true');
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem('aurexia_muted', isMuted.toString());
  }, [isMuted]);

  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);

  const playSfx = useCallback((type: string, value?: number) => {
    if (isMuted || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    
    if (type === 'success') { 
      osc.frequency.setValueAtTime(660, ctx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1); 
      g.gain.setValueAtTime(0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    }
    else if (type === 'capture') { 
      osc.frequency.setValueAtTime(800, ctx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05); 
      g.gain.setValueAtTime(0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    }
    else if (type === 'rotate') {
      const speed = value || 0;
      const freq = 100 + Math.min(speed * 2, 400);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + 0.05);
      g.gain.setValueAtTime(Math.min(speed * 0.001, 0.02), ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    }
    else if (type === 'scan') {
      const active = value === 1;
      osc.type = 'sine';
      if (active) {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        g.gain.setValueAtTime(0.1, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);
        g.gain.setValueAtTime(0.1, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      }
    }
    else { 
      osc.frequency.setValueAtTime(440, ctx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1); 
      g.gain.setValueAtTime(0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    }
    
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  }, [isMuted]);

  return { isMuted, setIsMuted, initAudio, playSfx };
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('aurexia_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [view, setView] = useState<AppView>(user ? 'SCAN' : 'INTRO');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MapFilter>('ALL');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('aurexia_theme') !== 'light');
  const { isMuted, setIsMuted, initAudio, playSfx } = useSoundEngine();
  const [collection, setCollection] = useState<CoinData[]>(() => {
    const saved = localStorage.getItem('aurexia_collection');
    if (saved) return JSON.parse(saved);
    
    // 5 Example Coins for the user to interact with
    const examples: CoinData[] = [
      {
        id: 'ex-1',
        name: 'Denario de Julio César',
        period: 'República Romana (44 a.C.)',
        civilization: 'Romana',
        material: 'Plata',
        denomination: 'Denario',
        referenceCodes: ['RRC 443/1'],
        confidence: 0.98,
        weight: 3.9,
        diameter: 18,
        obverseImage: 'https://picsum.photos/seed/denarius1/512/512',
        reverseImage: 'https://picsum.photos/seed/denarius2/512/512',
        description: 'Denario de plata acuñado por Julio César. Muestra un elefante aplastando una serpiente.',
        location: { lat: 41.8902, lng: 12.4922 }, // Roma
        dateSaved: Date.now()
      },
      {
        id: 'ex-2',
        name: 'As de Cástulo',
        period: 'Siglo II a.C.',
        civilization: 'Ibérica',
        material: 'Bronce',
        denomination: 'As',
        referenceCodes: ['Villaronga 123'],
        confidence: 0.95,
        weight: 24.5,
        diameter: 32,
        obverseImage: 'https://picsum.photos/seed/castulo1/512/512',
        reverseImage: 'https://picsum.photos/seed/castulo2/512/512',
        description: 'Moneda de bronce de la ceca de Cástulo (Linares). Muestra una esfinge.',
        location: { lat: 38.0333, lng: -3.6333 }, // Cástulo
        dateSaved: Date.now()
      },
      {
        id: 'ex-3',
        name: 'Sestercio de Adriano',
        period: 'Imperio Romano (117-138 d.C.)',
        civilization: 'Romana',
        material: 'Auricalco',
        denomination: 'Sestercio',
        referenceCodes: ['RIC II 587'],
        confidence: 0.99,
        weight: 27.2,
        diameter: 34,
        obverseImage: 'https://picsum.photos/seed/hadrian1/512/512',
        reverseImage: 'https://picsum.photos/seed/hadrian2/512/512',
        description: 'Sestercio de gran tamaño acuñado bajo el mandato de Adriano.',
        location: { lat: 37.4431, lng: -6.0453 }, // Itálica
        dateSaved: Date.now()
      },
      {
        id: 'ex-4',
        name: 'Dracma de Emporion',
        period: 'Siglo III a.C.',
        civilization: 'Ibérica',
        material: 'Plata',
        denomination: 'Dracma',
        referenceCodes: ['Villaronga 456'],
        confidence: 0.92,
        weight: 4.7,
        diameter: 19,
        obverseImage: 'https://picsum.photos/seed/emporion1/512/512',
        reverseImage: 'https://picsum.photos/seed/emporion2/512/512',
        description: 'Dracma de plata con la cabeza de Perséfone y Pegaso.',
        location: { lat: 42.1333, lng: 3.1167 }, // Empúries
        dateSaved: Date.now()
      },
      {
        id: 'ex-5',
        name: 'Áureo de Trajano',
        period: 'Imperio Romano (98-117 d.C.)',
        civilization: 'Romana',
        material: 'Oro',
        denomination: 'Áureo',
        referenceCodes: ['RIC II 123'],
        confidence: 0.99,
        weight: 7.2,
        diameter: 20,
        obverseImage: 'https://picsum.photos/seed/trajan1/512/512',
        reverseImage: 'https://picsum.photos/seed/trajan2/512/512',
        description: 'Áureo de oro puro celebrando las victorias en Dacia.',
        location: { lat: 41.8902, lng: 12.4922 }, // Roma
        dateSaved: Date.now()
      }
    ];
    return examples;
  });

  const updateCoinLocation = (coinId: string, lat: number, lng: number) => {
    const updated = collection.map(c => c.id === coinId ? { ...c, location: { lat, lng } } : c);
    setCollection(updated);
    localStorage.setItem('aurexia_collection', JSON.stringify(updated));
    playSfx('success');
    triggerHaptic(20);
  };

  const createCoinAtLocation = (lat: number, lng: number) => {
    const newCoin: CoinData = {
      id: `new-${Date.now()}`,
      name: 'Nueva Moneda Hallada',
      period: 'Desconocido',
      civilization: 'Romana',
      material: 'Desconocido',
      denomination: 'Desconocida',
      obverseImage: 'https://picsum.photos/seed/newcoin/512/512',
      reverseImage: 'https://picsum.photos/seed/newcoin2/512/512',
      description: 'Nueva moneda registrada en el mapa.',
      referenceCodes: [],
      confidence: 0.5,
      location: { lat, lng },
      dateSaved: Date.now()
    };
    const updated = [newCoin, ...collection];
    setCollection(updated);
    localStorage.setItem('aurexia_collection', JSON.stringify(updated));
    playSfx('success');
    triggerHaptic(30);
    setSelectedCoin(newCoin);
    setObverseImage(newCoin.obverseImage);
    setReverseImage(newCoin.reverseImage);
    setView('RESULT');
    setCurrentResult({
      bestMatch: newCoin as IdentificationResult['bestMatch'],
      confidence: 0.5,
      alternatives: []
    });
  };
  const [obverseImage, setObverseImage] = useState<string | null>(null);
  const [reverseImage, setReverseImage] = useState<string | null>(null);
  const [scannerStage, setScannerStage] = useState<'CAPTURE' | 'SPECS'>('CAPTURE');
  const [scanningSide, setScanningSide] = useState<'OBVERSE' | 'REVERSE'>('OBVERSE');
  const [weightInput, setWeightInput] = useState('');
  const [diameterInput, setDiameterInput] = useState('');
  const [materialInput, setMaterialInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isHudLocked, setIsHudLocked] = useState(false);
  const [currentResult, setCurrentResult] = useState<IdentificationResult | null>(null);
  const [historicalScene, setHistoricalScene] = useState<string | null>(null);
  const [expandedDescription, setExpandedDescription] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
  const [resultTab, setResultTab] = useState<'3D' | 'INFO' | 'VIDEO'>('3D');
  const [errorNotification, setErrorNotification] = useState<string | null>(null);
  const [showLiveExpert, setShowLiveExpert] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoStatusMsg, setVideoStatusMsg] = useState('');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const lastHudState = useRef<any>(null);

  const triggerHaptic = (duration = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(duration);
  };

  const autoCaptureTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSetImage = useCallback((dataUrl: string) => {
    if (scanningSide === 'OBVERSE') {
      setObverseImage(dataUrl);
      if (!reverseImage) setScanningSide('REVERSE');
    } else {
      setReverseImage(dataUrl);
      if (!obverseImage) setScanningSide('OBVERSE');
    }
    playSfx('success');
  }, [scanningSide, reverseImage, obverseImage, playSfx]);

  const captureFrame = useCallback(async () => {
    if (videoRef.current && canvasRef.current) {
      setIsFlashing(true); playSfx('capture'); triggerHaptic(30);
      setTimeout(() => setIsFlashing(false), 200);
      const video = videoRef.current;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const vW = video.videoWidth; 
        const vH = video.videoHeight;
        const vMin = Math.min(vW, vH);
        const bounds = lastHudState.current?.bounds;

        let coinDiameter = bounds ? Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) : 60;
        let coinCX = bounds ? (bounds.minX + bounds.maxX) / 2 : 50;
        let coinCY = bounds ? (bounds.minY + bounds.maxY) / 2 : 50;

        const outputSize = 1024;
        canvasRef.current.width = outputSize; 
        canvasRef.current.height = outputSize;
        
        ctx.clearRect(0, 0, outputSize, outputSize);
        ctx.save();
        ctx.beginPath();
        const r = (coinDiameter / 100) * (outputSize / 2) * 1.15;
        ctx.arc(outputSize / 2, outputSize / 2, r, 0, Math.PI * 2);
        ctx.clip();

        const sourceScale = vMin / 100;
        const sSize = coinDiameter * sourceScale * 1.3;
        const sx = (vW - vMin) / 2 + (coinCX - coinDiameter * 0.65) * sourceScale;
        const sy = (vH - vMin) / 2 + (coinCY - coinDiameter * 0.65) * sourceScale;

        ctx.drawImage(video, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize);
        ctx.restore();

        const dataUrl = canvasRef.current.toDataURL('image/png');
        handleSetImage(dataUrl);
      }
    }
  }, [playSfx, triggerHaptic, handleSetImage]);

  const handleHudUpdate = useCallback((s: any) => {
    lastHudState.current = s;
    if (s.locked !== isHudLocked) {
      setIsHudLocked(s.locked);
      if (s.locked) {
        if (autoCaptureTimerRef.current) clearTimeout(autoCaptureTimerRef.current);
        autoCaptureTimerRef.current = setTimeout(() => {
          if (view === 'SCAN' && scannerStage === 'CAPTURE' && lastHudState.current?.locked) {
            captureFrame();
          }
        }, 1500); // Slightly faster auto-capture
      } else {
        if (autoCaptureTimerRef.current) {
          clearTimeout(autoCaptureTimerRef.current);
          autoCaptureTimerRef.current = null;
        }
      }
    }
  }, [isHudLocked, view, scannerStage, captureFrame]);

  const checkPermission = (key: keyof typeof PERMISSIONS) => {
    if (!user) return false;
    const has = PERMISSIONS[key](user.plan);
    if (!has) {
      setShowSubscriptionModal(true);
      playSfx('error');
      triggerHaptic(40);
    }
    return has;
  };

  const showError = useCallback((msg: string) => {
    setErrorNotification(msg);
    triggerHaptic(100);
    playSfx('error');
    setTimeout(() => setErrorNotification(null), 5000);
  }, [playSfx]);

  const navigateTo = (newView: AppView) => {
    playSfx('click'); setView(newView);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) { showError("No se pudo acceder a la cámara."); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    playSfx('click');
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      handleSetImage(dataUrl);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updatedUser = { ...user, avatar: dataUrl };
      setUser(updatedUser);
      localStorage.setItem('aurexia_user', JSON.stringify(updatedUser));
      playSfx('success');
      triggerHaptic(20);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const proceedToSpecs = async () => {
    if (!obverseImage || !reverseImage) {
      showError("Captura ambas caras antes de proceder.");
      return;
    }
    setScannerStage('SPECS');
    setIsEstimating(true);
    try {
      const estimate = await estimatePhysicalProperties(obverseImage!.split(',')[1], reverseImage!.split(',')[1]);
      setWeightInput(estimate.weight.toString());
      setDiameterInput(estimate.diameter.toString());
      setMaterialInput(estimate.material);
    } catch (e) {
      console.warn("Estimación fallida", e);
    } finally {
      setIsEstimating(false);
    }
  };

  const processIdentification = async () => {
    if (!obverseImage || !reverseImage) return;
    console.log("Starting identification process...", { obverse: !!obverseImage, reverse: !!reverseImage, weight: weightInput, diameter: diameterInput });
    setIsProcessing(true);
    try {
      // Robust decimal parsing for European and standard formats
      const cleanWeight = weightInput.trim().replace(',', '.');
      const cleanDiameter = diameterInput.trim().replace(',', '.');
      
      const weight = cleanWeight ? parseFloat(cleanWeight) : undefined;
      const diameter = cleanDiameter ? parseFloat(cleanDiameter) : undefined;
      const material = materialInput || undefined;

      // Validate numeric inputs if provided
      if (cleanWeight && isNaN(weight!)) {
        showError("El peso debe ser un número válido.");
        setIsProcessing(false);
        return;
      }
      if (cleanDiameter && isNaN(diameter!)) {
        showError("El diámetro debe ser un número válido.");
        setIsProcessing(false);
        return;
      }

      const res = await identifyCoin(
        obverseImage.split(',')[1], 
        reverseImage.split(',')[1], 
        weight, 
        diameter, 
        material
      );
      console.log("Identification result:", res);
      setCurrentResult(res);
      
      // Secondary AI calls are now more resilient - they won't block the whole process if they fail
      let scene = null;
      let desc = null;
      
      try {
        const shouldGenScene = user?.plan !== 'FREE';
        if (shouldGenScene) {
          scene = await generateHistoricalScene(res.bestMatch);
        }
      } catch (e) {
        console.warn("Historical scene generation failed", e);
      }

      try {
        desc = await expandCoinDescription(res.bestMatch);
      } catch (e) {
        console.warn("Historical description expansion failed", e);
        desc = res.bestMatch.description || "Crónica no disponible en este momento.";
      }
      
      setHistoricalScene(scene); 
      setExpandedDescription(desc);
      setView('RESULT'); playSfx('success');
    } catch (e) { 
      console.error("Identification error:", e);
      showError("Error en la identificación Imperial. Revisa tu conexión."); 
    }
    finally { setIsProcessing(false); }
  };

  const handleGenerateVideo = async () => {
    if (!checkPermission('CINEMATIC_VIDEO')) return;
    if (!currentResult?.bestMatch || !obverseImage) return;

    // Check for API Key selection for Veo
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
      // Proceed after selection
    }

    setIsProcessing(true);
    setVideoStatusMsg('Iniciando grabación cinematográfica...');
    try {
      const url = await generateCoinVideo(currentResult.bestMatch, obverseImage.split(',')[1], (m) => setVideoStatusMsg(m));
      setGeneratedVideoUrl(url);
      setResultTab('VIDEO');
      playSfx('success');
    } catch (e) {
      showError("Error al generar el archivo de video.");
    } finally {
      setIsProcessing(false);
      setVideoStatusMsg('');
    }
  };

  const handleOpenLiveExpert = async () => {
    if (!checkPermission('LIVE_EXPERT')) return;
    
    // Check for API Key selection for Live API
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
    }
    
    setShowLiveExpert(true);
  };

  const saveToCollection = () => {
    console.log("Saving to collection...", { user, currentResult: !!currentResult, obverse: !!obverseImage });
    if (!user) {
      showError("Usuario no identificado. Por favor, reinicia la aplicación.");
      return;
    }
    
    if (!currentResult?.bestMatch) {
      showError("No hay datos de moneda para archivar.");
      return;
    }

    const limit = PERMISSIONS.COLLECTION_LIMIT(user.plan);
    if (collection.length >= limit) {
      setShowSubscriptionModal(true);
      showError("Límite de archivo alcanzado para tu rango.");
      return;
    }

    try {
      const newCoin: CoinData = {
        ...currentResult.bestMatch as CoinData,
        id: Date.now().toString(), 
        obverseImage: obverseImage || '', 
        reverseImage: reverseImage || '',
        historicalScene: historicalScene || undefined, 
        historicalContext: expandedDescription || undefined,
        dateSaved: Date.now(), 
        confidence: currentResult.confidence,
        location: { lat: 40.4168 + (Math.random() - 0.5) * 5, lng: -3.7038 + (Math.random() - 0.5) * 5 }
      };
      
      const updated = [newCoin, ...collection];
      setCollection(updated);
      localStorage.setItem('aurexia_collection', JSON.stringify(updated));
      console.log("Saved successfully!", newCoin.id);
      navigateTo('COLLECTION');
    } catch (e) {
      console.error("Error saving to collection", e);
      showError("Error al guardar en el legado imperial.");
    }
  };

  const handleUpgrade = (plan: UserPlan) => {
    if (!user) return;
    const updated = { ...user, plan };
    setUser(updated);
    localStorage.setItem('aurexia_user', JSON.stringify(updated));
    setShowSubscriptionModal(false);
    playSfx('success');
  };

  useEffect(() => { if (view === 'SCAN' && scannerStage === 'CAPTURE') startCamera(); }, [view, scannerStage]);

  return (
    <div className={`fixed inset-0 flex flex-col items-center bg-transparent overflow-hidden ${isDarkMode ? '' : 'light-mode'}`} onClick={initAudio}>
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
      
      {showSubscriptionModal && (
        <SubscriptionModal plan={user?.plan || 'FREE'} onClose={() => setShowSubscriptionModal(false)} onUpgrade={handleUpgrade} />
      )}

      {showLiveExpert && currentResult?.bestMatch.name && (
        <LiveExpert coinName={currentResult.bestMatch.name} onClose={() => setShowLiveExpert(false)} />
      )}

      {errorNotification && (
        <div className="fixed bottom-48 left-6 right-6 z-[3000] p-4 glass-island rounded-xl border-red-500/30 flex items-center gap-4 bg-red-500/10 animate-slide-up shadow-2xl">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <Zap size={20} className="text-red-500" />
          </div>
          <div className="flex flex-col">
            <p className="mono text-[10px] font-black text-red-500 uppercase tracking-widest">Alerta Imperial</p>
            <p className="text-[11px] font-bold text-white/90 uppercase">{errorNotification}</p>
          </div>
        </div>
      )}

      {view === 'INTRO' && (
        <div className="absolute inset-0 bg-black z-[2000] flex flex-col items-center justify-center p-10">
          <AurexiaLogo size={120} className="gold-glow mb-10" />
          <h1 className="serif-neo text-4xl font-black text-white tracking-[0.2em] mb-4">AUREXIA</h1>
          <p className="mono text-[10px] text-amber-400 uppercase tracking-[0.4em] text-center mb-12">Neo-Numismática Imperial</p>
          <button onClick={() => { 
            const newUser: UserProfile = { id: '1', name: 'Legionario', email: 'user@aurexia.ia', avatar: '', role: 'LEGIONNAIRE', plan: 'FREE', joinedDate: Date.now() };
            setUser(newUser); 
            localStorage.setItem('aurexia_user', JSON.stringify(newUser));
            setView('SCAN'); 
          }} className="px-10 py-4 premium-gold-btn rounded-full mono text-xs font-black uppercase tracking-widest active:scale-95 transition-transform">Acceder al Archivo</button>
        </div>
      )}

      {view !== 'INTRO' && (
        <>
          <header className="fixed top-0 left-0 right-0 px-6 pt-safe flex justify-between items-center z-[500] pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto" onClick={() => navigateTo('SCAN')}>
              <AurexiaLogo size={32} className="gold-glow" />
              <h1 className="serif-neo text-lg font-black text-white tracking-widest hidden sm:block">AUREXIA</h1>
            </div>
            
            <div className="flex items-center gap-2 pointer-events-auto">
              <button onClick={() => setIsMuted(!isMuted)} className="p-2.5 glass-island rounded-full text-amber-400/60 active:scale-90 transition-transform">
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 glass-island rounded-full text-amber-400/60 active:scale-90 transition-transform">
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={() => navigateTo('PROFILE')} className={`relative p-0.5 rounded-full border-2 transition-all ${view === 'PROFILE' ? 'border-amber-400 scale-105' : 'border-white/10'}`}>
                {user?.avatar ? (
                  <img src={user.avatar} className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                    <User size={16} className="text-white/40" />
                  </div>
                )}
                {user?.plan !== 'FREE' && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-black" />}
              </button>
            </div>
          </header>

          <nav className={`fixed bottom-safe left-6 right-6 z-[150] flex justify-center pointer-events-none transition-all duration-500 ${scannerStage === 'SPECS' && view === 'SCAN' ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
            <div className="glass-island px-8 py-4 rounded-[2.5rem] flex items-center gap-12 border-amber-400/20 shadow-2xl pointer-events-auto">
              <button onClick={() => navigateTo('SCAN')} className={`flex flex-col items-center gap-1 transition-all ${view === 'SCAN' ? 'text-amber-400 scale-110' : 'text-white/40'}`}>
                <Camera size={24} />
                <span className="mono text-[7px] font-black uppercase tracking-widest">Escáner</span>
              </button>
              <button onClick={() => navigateTo('COLLECTION')} className={`flex flex-col items-center gap-1 transition-all ${view === 'COLLECTION' ? 'text-amber-400 scale-110' : 'text-white/40'}`}>
                <History size={24} />
                <span className="mono text-[7px] font-black uppercase tracking-widest">Legado</span>
              </button>
              <button onClick={() => navigateTo('MAP')} className={`flex flex-col items-center gap-1 transition-all ${view === 'MAP' ? 'text-amber-400 scale-110' : 'text-white/40'}`}>
                <MapPin size={24} />
                <span className="mono text-[7px] font-black uppercase tracking-widest">Mapa</span>
              </button>
            </div>
          </nav>
        </>
      )}

      <main className="flex-grow w-full relative">
        {view === 'MAP' && (
          <MapView 
            collection={collection} 
            onClose={() => setView('SCAN')} 
            onSelectCoin={(coin) => {
              setSelectedCoin(coin);
              setObverseImage(coin.obverseImage);
              setReverseImage(coin.reverseImage);
              setCurrentResult({
                bestMatch: coin as IdentificationResult['bestMatch'],
                confidence: 1.0,
                alternatives: []
              });
              setView('RESULT');
            }}
            onUpdateCoinLocation={updateCoinLocation}
            onCreateCoinAtLocation={createCoinAtLocation}
          />
        )}
            {view === 'SCAN' && (
          <div className="absolute inset-0">
            {scannerStage === 'CAPTURE' ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="full-camera-view" />
                <div className="camera-vignette" />
                <DynamicScannerHUD videoRef={videoRef} side={scanningSide} onHudUpdate={handleHudUpdate} />
                <div className={`fixed inset-0 bg-white pointer-events-none transition-opacity duration-200 ${isFlashing ? 'opacity-80' : 'opacity-0'}`} />
                
                {/* Top Previews for SCAN view */}
                <div className="absolute top-24 left-0 right-0 flex justify-center gap-6 px-10 z-50 animate-fadeIn">
                   <CoinThumbnail 
                     src={obverseImage} 
                     label="ANVERSO" 
                     active={scanningSide === 'OBVERSE'} 
                     onClick={() => { setScanningSide('OBVERSE'); triggerHaptic(10); }}
                     onClear={() => { setObverseImage(null); setScanningSide('OBVERSE'); triggerHaptic(20); }}
                   />
                   <CoinThumbnail 
                     src={reverseImage} 
                     label="REVERSO" 
                     active={scanningSide === 'REVERSE'} 
                     onClick={() => { setScanningSide('REVERSE'); triggerHaptic(10); }}
                     onClear={() => { setReverseImage(null); setScanningSide('REVERSE'); triggerHaptic(20); }}
                   />
                </div>

                <div className="absolute bottom-32 left-0 right-0 flex flex-col items-center gap-6 px-10 z-50">
                  <div className="flex items-center gap-8">
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      className="w-16 h-16 glass-island rounded-full flex items-center justify-center text-amber-400 border-amber-400/30 active:scale-95 transition-transform shadow-gold"
                    >
                      <Upload size={24} />
                    </button>
                    <div className="relative">
                      <button 
                        onClick={captureFrame} 
                        className={`w-24 h-24 rounded-full border-[6px] border-black/20 flex items-center justify-center shadow-gold active:scale-95 transition-all ${isHudLocked ? 'premium-gold-btn scale-110' : 'bg-white/10 text-white/40'}`}
                      >
                        <Camera size={32} />
                      </button>
                      {isHudLocked && (
                        <div className="absolute -top-2 -right-2 bg-amber-400 text-black px-2 py-0.5 rounded-full mono text-[7px] font-black animate-pulse">AUTO</div>
                      )}
                    </div>
                    <button 
                      onClick={() => { setObverseImage(null); setReverseImage(null); setScanningSide('OBVERSE'); triggerHaptic(20); }} 
                      className="w-16 h-16 glass-island rounded-full flex items-center justify-center text-white/40 border-white/10 active:scale-95 transition-transform"
                    >
                      <RefreshCw size={24} />
                    </button>
                  </div>
                  
                  {obverseImage && reverseImage ? (
                    <button 
                      onClick={proceedToSpecs}
                      className="px-10 py-4 premium-gold-btn rounded-full text-black mono text-[11px] font-black uppercase tracking-[0.3em] animate-bounce shadow-gold active:scale-95"
                    >
                      Proceder al Análisis
                    </button>
                  ) : (
                    <div className="glass-island px-6 py-2 rounded-full border-white/5">
                      <p className="mono text-[9px] text-white/60 uppercase tracking-[0.2em] font-bold text-center">
                        {scanningSide === 'OBVERSE' ? 'Encuadra el ANVERSO' : 'Encuadra el REVERSO'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 pt-24 px-6 sm:px-10 overflow-y-auto no-scrollbar pb-80">
                <h3 className="serif-neo text-2xl sm:text-3xl font-black text-amber-400 text-center mb-8 sm:mb-10 tracking-widest uppercase">Metrología Imperial</h3>
                {isEstimating ? (
                  <div className="flex flex-col items-center gap-6 py-10">
                    <RotateCw className="text-amber-400 animate-spin" size={48} />
                    <p className="mono text-[10px] text-amber-400 uppercase font-black tracking-widest animate-pulse">Consultando el Archivo Astral...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2 relative group">
                        <p className="mono text-[9px] uppercase font-bold text-amber-400 tracking-widest flex justify-between items-center">
                          Peso (g)
                          <Weight size={10} className="opacity-40" />
                        </p>
                        <div className="relative">
                          <input 
                            type="text" 
                            inputMode="decimal" 
                            value={weightInput} 
                            onChange={e => setWeightInput(e.target.value)} 
                            className="w-full glass-island p-4 rounded-2xl mono text-amber-400 outline-none border-amber-400/20 text-xl font-black focus:border-amber-400/50 transition-all pr-12" 
                            placeholder="0.00" 
                          />
                          {weightInput && (
                            <button 
                              onClick={() => { setWeightInput(''); triggerHaptic(5); }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-amber-400 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 relative group">
                        <p className="mono text-[9px] uppercase font-bold text-amber-400 tracking-widest flex justify-between items-center">
                          Diám. (mm)
                          <Diameter size={10} className="opacity-40" />
                        </p>
                        <div className="relative">
                          <input 
                            type="text" 
                            inputMode="decimal" 
                            value={diameterInput} 
                            onChange={e => setDiameterInput(e.target.value)} 
                            className="w-full glass-island p-4 rounded-2xl mono text-amber-400 outline-none border-amber-400/20 text-xl font-black focus:border-amber-400/50 transition-all pr-12" 
                            placeholder="0.0" 
                          />
                          {diameterInput && (
                            <button 
                              onClick={() => { setDiameterInput(''); triggerHaptic(5); }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-amber-400 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="mono text-[9px] uppercase font-bold text-amber-400 tracking-widest flex justify-between items-center">
                        Material Imperial
                        <Layers size={10} className="opacity-40" />
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'Oro', icon: <Crown size={14} />, color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40' },
                          { id: 'Plata', icon: <Sparkles size={14} />, color: 'bg-slate-300/20 text-slate-300 border-slate-300/40' },
                          { id: 'Bronce', icon: <History size={14} />, color: 'bg-orange-700/20 text-orange-700 border-orange-700/40' },
                          { id: 'Vellón', icon: <Layers size={14} />, color: 'bg-stone-500/20 text-stone-400 border-stone-500/40' },
                          { id: 'Auricalco', icon: <Zap size={14} />, color: 'bg-amber-600/20 text-amber-500 border-amber-600/40' },
                          { id: 'Otro', icon: <Search size={14} />, color: 'bg-white/10 text-white/60 border-white/10' }
                        ].map(mat => (
                          <button
                            key={mat.id}
                            onClick={() => { setMaterialInput(mat.id); playSfx('click'); triggerHaptic(5); }}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 ${materialInput === mat.id ? mat.color + ' shadow-gold ring-1 ring-amber-400/50' : 'bg-white/5 border-white/10 text-white/40 grayscale'}`}
                          >
                            {mat.icon}
                            <span className="mono text-[7px] font-black uppercase mt-1 tracking-tighter">{mat.id}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Fixed Bottom Action Bar for SPECS stage */}
                <div className="fixed bottom-safe left-6 right-6 z-[200] flex flex-col gap-4 pb-6">
                  {/* Thumbnail Preview at Bottom */}
                  <div className="flex justify-center gap-6 mb-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full border border-amber-400/40 shadow-gold p-0.5 overflow-hidden bg-black/40">
                        <img src={obverseImage!} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                      </div>
                      <span className="mono text-[6px] text-amber-400/60 font-black uppercase tracking-widest">Anverso</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full border border-amber-400/40 shadow-gold p-0.5 overflow-hidden bg-black/40">
                        <img src={reverseImage!} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                      </div>
                      <span className="mono text-[6px] text-amber-400/60 font-black uppercase tracking-widest">Reverso</span>
                    </div>
                  </div>

                  <button 
                    onClick={processIdentification} 
                    className="w-full py-6 premium-gold-btn rounded-[2rem] font-black text-lg uppercase tracking-[0.2em] shadow-gold active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Sparkles size={20} />
                    Catalogar Reliquia
                  </button>
                  <button 
                    onClick={() => { setScannerStage('CAPTURE'); triggerHaptic(10); }} 
                    className="w-full py-4 glass-island rounded-full text-white/60 mono text-[10px] uppercase font-black tracking-widest border-white/10 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <ChevronLeft size={14} />
                    Revisar Capturas
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'RESULT' && currentResult && (
          <div className="absolute inset-0 pt-safe h-full flex flex-col animate-fadeIn">
            <div className="flex-grow overflow-hidden relative">
              {resultTab === '3D' && (
                <Coin3DViewer obverseUrl={obverseImage!} reverseUrl={reverseImage!} historicalSceneUrl={historicalScene || undefined} coinData={currentResult.bestMatch} playSfx={playSfx} isMuted={isMuted} />
              )}
              {resultTab === 'INFO' && (
                <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto h-full pb-60 no-scrollbar">
                  <div className="text-center">
                    <h2 className="serif-neo text-2xl sm:text-3xl font-black text-amber-400 uppercase mb-2 tracking-tight">{currentResult.bestMatch.name}</h2>
                    <p className="mono text-[9px] sm:text-[10px] text-white/40 uppercase tracking-[0.3em] font-black">{currentResult.bestMatch.period}</p>
                  </div>
                  <div className="flex justify-center gap-3 sm:gap-4">
                    <button 
                      onClick={handleOpenLiveExpert} 
                      className={`glass-island px-4 sm:px-6 py-2.5 sm:py-3 rounded-full flex items-center gap-2 sm:gap-3 border-amber-400/30 text-amber-400 shadow-gold active:scale-95 ${user?.plan === 'FREE' ? 'opacity-60' : ''}`}
                    >
                      {user?.plan === 'FREE' ? <Lock size={12} /> : <Volume2 size={14} />}
                      <span className="mono text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Experto</span>
                    </button>
                    <button 
                      onClick={handleGenerateVideo} 
                      className={`glass-island px-4 sm:px-6 py-2.5 sm:py-3 rounded-full flex items-center gap-2 sm:gap-3 border-amber-400/30 text-amber-400 active:scale-95 ${user?.plan !== 'IMPERATOR' ? 'opacity-60' : ''}`}
                    >
                      {user?.plan !== 'IMPERATOR' ? <Lock size={12} /> : <ImageIcon size={14} />}
                      <span className="mono text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Vídeo Veo</span>
                    </button>
                  </div>
                  <div className="glass-island p-4 sm:p-6 rounded-3xl border-amber-400/10">
                    <p className="mono text-[8px] sm:text-[10px] uppercase text-amber-400 font-black mb-3 tracking-widest">Análisis Numismático</p>
                    <p className="text-xs sm:text-sm opacity-80 leading-relaxed text-white">{currentResult.bestMatch.description}</p>
                  </div>
                  {expandedDescription && (
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-amber-400 rounded-[2rem] sm:rounded-[2.5rem] blur opacity-10" />
                      <div className="relative glass-island p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-amber-400/40 bg-amber-400/5 shadow-inner">
                        <div className="flex items-center gap-3 mb-4 sm:mb-6">
                          <Globe size={16} className="text-amber-400 gold-glow" />
                          <p className="serif-neo text-[10px] sm:text-[11px] uppercase text-amber-400 font-black tracking-widest">Crónica de AUREXIA</p>
                        </div>
                        <p className="text-xs sm:text-sm text-white/95 leading-[1.6] sm:leading-[1.8] serif-neo italic text-justify whitespace-pre-line px-2 border-l border-amber-400/20">
                          {expandedDescription}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="glass-island p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] text-center border-amber-400/20 shadow-gold">
                    <p className="mono text-[8px] sm:text-[9px] uppercase opacity-40 mb-2 font-black tracking-widest">Valoración Estimada</p>
                    <p className="serif-neo text-3xl sm:text-5xl font-black text-amber-400">{currentResult.bestMatch.estimatedValue}</p>
                  </div>
                </div>
              )}
              {resultTab === 'VIDEO' && generatedVideoUrl && (
                <div className="w-full h-full flex items-center justify-center p-8">
                  <div className="glass-island rounded-[3rem] overflow-hidden border-2 border-amber-400 shadow-gold aspect-video w-full flex items-center justify-center bg-black">
                    <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
            </div>
            <div className="absolute bottom-safe left-6 right-6 flex flex-col gap-3 sm:gap-4 z-[200]">
               <div className="glass-island p-1 rounded-full flex shadow-2xl">
                  <button onClick={() => setResultTab('3D')} className={`flex-1 py-3 sm:py-4 rounded-full mono text-[9px] sm:text-[10px] font-black transition-all ${resultTab === '3D' ? 'bg-amber-400 text-black shadow-gold' : 'text-white'}`}>VISOR 3D</button>
                  <button onClick={() => setResultTab('INFO')} className={`flex-1 py-3 sm:py-4 rounded-full mono text-[9px] sm:text-[10px] font-black transition-all ${resultTab === 'INFO' ? 'bg-amber-400 text-black shadow-gold' : 'text-white'}`}>HISTORIA</button>
                  {generatedVideoUrl && <button onClick={() => setResultTab('VIDEO')} className={`flex-1 py-3 sm:py-4 rounded-full mono text-[9px] sm:text-[10px] font-black transition-all ${resultTab === 'VIDEO' ? 'bg-amber-400 text-black shadow-gold' : 'text-white'}`}>VIDEO</button>}
               </div>
               <button onClick={saveToCollection} className="w-full py-5 sm:py-6 premium-gold-btn rounded-full font-black shadow-gold uppercase tracking-widest active:scale-95 transition-transform text-sm sm:text-base">Archivar en Legado</button>
            </div>
          </div>
        )}

        {view === 'COLLECTION' && (
          <div className="absolute inset-0 pt-safe px-6 sm:px-8 overflow-y-auto no-scrollbar h-full pb-64">
            <div className="flex justify-between items-end mb-8 mt-12 sm:mt-16">
              <h2 className="serif-neo text-2xl sm:text-3xl font-black text-amber-400 tracking-[0.2em] uppercase">Mi Archivo</h2>
              <div className="flex flex-col items-end">
                <p className="mono text-[7px] sm:text-[8px] uppercase text-white/40 font-bold mb-1">Capacidad</p>
                <div className="flex items-center gap-2">
                  <span className="mono text-[10px] sm:text-xs font-black text-amber-400">{collection.length} / {PERMISSIONS.COLLECTION_LIMIT(user?.plan || 'FREE')}</span>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:gap-5">
              {collection.length === 0 ? (
                <div className="glass-island p-10 rounded-3xl text-center opacity-40 flex flex-col items-center gap-4 border-dashed border-2">
                  <Box size={40} />
                  <p className="mono text-[10px] uppercase font-bold tracking-widest">Archivo Imperial Vacío</p>
                </div>
              ) : collection.filter(c => {
                const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesFilter = activeFilter === 'ALL' || 
                  (activeFilter === 'ROMAN' && c.civilization === 'Romana') || 
                  (activeFilter === 'IBERIAN' && c.civilization === 'Ibérica');
                return matchesSearch && matchesFilter;
              }).map(c => (
                <div 
                  key={c.id} 
                  onClick={() => {
                    setSelectedCoin(c);
                    setObverseImage(c.obverseImage);
                    setReverseImage(c.reverseImage);
                    setCurrentResult({
                      bestMatch: c as IdentificationResult['bestMatch'],
                      confidence: 1.0,
                      alternatives: []
                    });
                    setView('RESULT');
                    setResultTab('INFO');
                    triggerHaptic(10);
                  }}
                  className="glass-island p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] flex items-center gap-4 sm:gap-6 border-amber-400/10 active:scale-95 transition-all cursor-pointer group hover:border-amber-400/30"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-amber-400/20 bg-black/40 p-0.5 group-hover:border-amber-400/60 transition-colors">
                    <img src={c.obverseImage} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-grow">
                    <h4 className="serif-neo text-xs sm:text-sm font-black text-white uppercase truncate tracking-widest group-hover:text-amber-400 transition-colors">{c.name}</h4>
                    <p className="mono text-[8px] sm:text-[9px] text-white/40 mt-1 uppercase tracking-tight">{c.period}</p>
                  </div>
                  <ChevronRight size={18} className="text-amber-400/30 group-hover:text-amber-400 transition-colors" />
                </div>
              ))}
            </div>

            {/* Bottom Search & Filter Bar for Collection */}
            <div className="fixed bottom-24 left-6 right-6 z-[150] flex flex-col gap-3 pointer-events-none">
              <div className="glass-island w-full rounded-2xl flex items-center px-4 py-3 border-white/5 pointer-events-auto focus-within:border-amber-400/40 transition-colors shadow-2xl">
                <Search size={18} className="text-white/20" />
                <input 
                  type="text" 
                  placeholder="Buscar en el legado..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none flex-grow ml-3 text-xs mono text-white placeholder:text-white/20"
                />
              </div>
              <div className="flex gap-2 pointer-events-auto overflow-x-auto no-scrollbar pb-2">
                {(['ALL', 'ROMAN', 'IBERIAN'] as MapFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-5 py-2 rounded-full mono text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeFilter === f ? 'bg-amber-400 text-black border-amber-400' : 'glass-island text-white/40 border-white/10'}`}
                  >
                    {f === 'ALL' ? 'Todo' : f === 'ROMAN' ? 'Roma' : 'Iberia'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}


        {view === 'PROFILE' && (
          <div className="absolute inset-0 pt-safe px-6 sm:px-8 overflow-y-auto no-scrollbar h-full pb-40">
            <div className="flex flex-col items-center gap-6 sm:gap-8 mb-10 sm:mb-12 mt-12 sm:mt-16">
               <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                 <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-amber-400 shadow-gold p-1 overflow-hidden relative">
                   <div className="w-full h-full rounded-full bg-amber-400/20 flex items-center justify-center overflow-hidden">
                     {user?.avatar ? (
                       <img src={user.avatar} className="w-full h-full object-cover" alt="Avatar" referrerPolicy="no-referrer" />
                     ) : (
                       <User size={50} className="text-amber-400" />
                     )}
                   </div>
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} className="text-amber-400" />
                   </div>
                 </div>
                 <div className="absolute bottom-0 right-0 bg-amber-400 text-black p-1.5 rounded-full shadow-lg border-2 border-black z-10">
                    <Edit3 size={12} />
                 </div>
                 <div className="absolute -bottom-2 -left-2 bg-amber-400 text-black px-3 py-0.5 rounded-full mono text-[7px] sm:text-[8px] font-black uppercase tracking-widest z-10">{user?.plan}</div>
               </div>
               <div className="text-center">
                 <h2 className="serif-neo text-xl sm:text-2xl font-black text-white tracking-widest uppercase">{user?.name}</h2>
                 <p className="mono text-[9px] sm:text-[10px] text-white/40 uppercase mt-2 tracking-widest">{user?.email}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
              <div className="glass-island p-5 sm:p-6 rounded-3xl text-center border-amber-400/10">
                <p className="mono text-[7px] sm:text-[8px] uppercase text-white/30 mb-2 font-black tracking-widest">Reliquias</p>
                <p className="serif-neo text-2xl sm:text-3xl font-black text-amber-400">{collection.length}</p>
              </div>
              <div className="glass-island p-5 sm:p-6 rounded-3xl text-center border-amber-400/10">
                <p className="mono text-[7px] sm:text-[8px] uppercase text-white/30 mb-2 font-black tracking-widest">Prestigio</p>
                <p className="serif-neo text-lg sm:text-xl font-black text-amber-400">{user?.plan === 'FREE' ? 'Tiro' : user?.plan === 'CENTURION' ? 'Centurio' : 'Imperator'}</p>
              </div>
            </div>

            <div className="glass-island p-1.5 rounded-[2rem] sm:rounded-[2.5rem] space-y-1 mb-8 border-amber-400/10">
               <button onClick={() => setShowSubscriptionModal(true)} className="w-full p-5 sm:p-6 flex justify-between items-center hover:bg-white/5 rounded-[1.5rem] sm:rounded-[2rem] transition-colors">
                  <div className="flex items-center gap-4 text-amber-400">
                    <Shield size={18} />
                    <span className="mono text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Ascender de Rango</span>
                  </div>
                  <Crown size={16} className="text-amber-400" />
               </button>
               <button className="w-full p-5 sm:p-6 flex justify-between items-center hover:bg-white/5 rounded-[1.5rem] sm:rounded-[2rem] transition-colors">
                  <div className="flex items-center gap-4 text-white/60">
                    <Settings size={18} />
                    <span className="mono text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Ajustes Imperial</span>
                  </div>
                  <ChevronRight size={16} />
               </button>
               <button onClick={() => { localStorage.removeItem('aurexia_user'); setView('INTRO'); }} className="w-full p-5 sm:p-6 flex justify-between items-center hover:bg-red-500/10 rounded-[1.5rem] sm:rounded-[2rem] transition-colors text-red-500/60">
                  <div className="flex items-center gap-4">
                    <LogOut size={18} />
                    <span className="mono text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Retirada Archivo</span>
                  </div>
               </button>
            </div>
          </div>
        )}
      </main>

      {isProcessing && (
        <div className="fixed inset-0 z-[2500] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center gap-10">
           <div className="relative flex items-center justify-center">
             <RotateCw size={120} className="text-amber-400 animate-spin opacity-20" />
             <AurexiaLogo size={60} className="absolute gold-glow animate-pulse" />
           </div>
           <div className="text-center px-10">
             <p className="mono text-[11px] text-amber-400 tracking-[0.5em] font-black uppercase animate-pulse">{videoStatusMsg || 'Invocando el Archivo Imperial'}</p>
             <p className="mono text-[8px] text-white/30 uppercase tracking-widest mt-4">Analizando iconografía, metrología y contexto...</p>
           </div>
        </div>
      )}

      {selectedCoin && (
        <div className="fixed inset-0 z-[1000] bg-black/99 backdrop-blur-3xl p-8 pt-24 flex flex-col overflow-y-auto no-scrollbar">
           <button onClick={() => setSelectedCoin(null)} className="absolute top-10 left-8 p-3 glass-island rounded-full text-amber-400 border-amber-400/30 shadow-gold active:scale-90 transition-transform"><X size={24} /></button>
           <div className="flex flex-col items-center gap-8 pb-32">
              <div className="w-64 h-64 rounded-full border-4 border-amber-400/30 bg-black p-1 shadow-gold">
                <img src={selectedCoin.obverseImage} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
              </div>
              <div className="text-center">
                <h2 className="serif-neo text-4xl font-black text-amber-400 uppercase mb-2 tracking-tight">{selectedCoin.name}</h2>
                <p className="mono text-[10px] text-white/40 uppercase tracking-[0.4em] font-black">{selectedCoin.period}</p>
              </div>
              <div className="glass-island p-8 rounded-[2.5rem] w-full border-amber-400/10 bg-amber-400/5">
                 <p className="mono text-[10px] uppercase text-amber-400 font-black mb-4 tracking-widest">Crónica Histórica</p>
                 <p className="text-sm text-white/80 leading-[1.8] serif-neo italic text-justify whitespace-pre-line border-l border-amber-400/20 pl-4">{selectedCoin.historicalContext}</p>
              </div>
              <div className="glass-island p-8 rounded-[2.5rem] w-full text-center border-amber-400/20 shadow-gold">
                <p className="mono text-[9px] uppercase opacity-40 mb-2 font-black tracking-widest">Valoración Imperial</p>
                <p className="serif-neo text-4xl font-black text-amber-400">{selectedCoin.estimatedValue}</p>
              </div>
              <button onClick={() => { if(confirm('¿Eliminar del legado?')) { setCollection(prev => prev.filter(x => x.id !== selectedCoin.id)); setSelectedCoin(null); } }} className="w-full py-5 text-red-500/60 mono text-[10px] font-black uppercase tracking-widest hover:bg-red-500/5 rounded-full transition-colors">Eliminar del Archivo</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
