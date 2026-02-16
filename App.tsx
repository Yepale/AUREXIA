
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
        if (onHudUpdateRef.current) onHudUpdateRef.current(newState);
        return newState;
      });
    }
    requestRef.current = requestAnimationFrame(analyzeFrame);
  }, [videoRef]);

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
        <img src={src} className="w-full h-full object-cover rounded-full" alt={label} />
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

  const playSfx = useCallback((type: string) => {
    if (isMuted || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    if (type === 'success') { osc.frequency.setValueAtTime(660, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1); }
    else if (type === 'capture') { osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05); }
    else { osc.frequency.setValueAtTime(440, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1); }
    g.gain.setValueAtTime(0.05, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
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
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('aurexia_theme') !== 'light');
  const { isMuted, setIsMuted, initAudio, playSfx } = useSoundEngine();
  const [collection, setCollection] = useState<CoinData[]>(() => {
    const saved = localStorage.getItem('aurexia_collection');
    return saved ? JSON.parse(saved) : [];
  });
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

  const handleHudUpdate = useCallback((s: any) => {
    lastHudState.current = s;
  }, []);

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

  const handleSetImage = (dataUrl: string) => {
    if (scanningSide === 'OBVERSE') {
      setObverseImage(dataUrl);
      if (!reverseImage) setScanningSide('REVERSE');
    } else {
      setReverseImage(dataUrl);
      if (!obverseImage) setScanningSide('OBVERSE');
    }
    playSfx('success');
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

  const captureFrame = async () => {
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
    setIsProcessing(true);
    try {
      const res = await identifyCoin(obverseImage.split(',')[1], reverseImage.split(',')[1], parseFloat(weightInput), parseFloat(diameterInput), materialInput);
      setCurrentResult(res);
      
      const shouldGenScene = user?.plan !== 'FREE';
      const scene = shouldGenScene ? await generateHistoricalScene(res.bestMatch) : null;
      const desc = await expandCoinDescription(res.bestMatch);
      
      setHistoricalScene(scene); 
      setExpandedDescription(desc);
      setView('RESULT'); playSfx('success');
    } catch (e) { showError("Error en la identificación Imperial."); }
    finally { setIsProcessing(false); }
  };

  const handleGenerateVideo = async () => {
    if (!checkPermission('CINEMATIC_VIDEO')) return;
    if (!currentResult?.bestMatch || !obverseImage) return;
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

  const saveToCollection = () => {
    if (!user) return;
    const limit = PERMISSIONS.COLLECTION_LIMIT(user.plan);
    if (collection.length >= limit) {
      setShowSubscriptionModal(true);
      showError("Límite de archivo alcanzado para tu rango.");
      return;
    }

    if (!currentResult?.bestMatch) return;
    const newCoin: CoinData = {
      ...currentResult.bestMatch as CoinData,
      id: Date.now().toString(), obverseImage: obverseImage!, reverseImage: reverseImage!,
      historicalScene: historicalScene || undefined, historicalContext: expandedDescription || undefined,
      dateSaved: Date.now(), confidence: currentResult.confidence,
      location: { lat: 40.4168 + (Math.random() - 0.5) * 5, lng: -3.7038 + (Math.random() - 0.5) * 5 }
    };
    const updated = [newCoin, ...collection];
    setCollection(updated);
    localStorage.setItem('aurexia_collection', JSON.stringify(updated));
    navigateTo('COLLECTION');
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
        <div className="fixed top-12 left-6 right-6 z-[3000] p-4 glass-island rounded-xl border-red-500/30 flex items-center gap-4 bg-red-500/10">
          <Zap size={20} className="text-red-500" />
          <p className="text-xs font-bold text-red-500 uppercase flex-grow">{errorNotification}</p>
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
          <header className="fixed top-0 left-0 right-0 px-6 pt-12 flex justify-between items-center z-[100] pointer-events-none">
            <AurexiaLogo size={40} className="gold-glow pointer-events-auto" onClick={() => (view !== 'SCAN' && setView('SCAN'))} />
            <div className="flex gap-3 pointer-events-auto">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 glass-island rounded-full text-amber-400 active:scale-90 transition-transform">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
              <button onClick={() => navigateTo('PROFILE')} className="p-3 glass-island rounded-full text-amber-400 active:scale-90 transition-transform relative">
                {user?.avatar ? (
                  <img src={user.avatar} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <User size={20} />
                )}
                {user?.plan !== 'FREE' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-black" />}
              </button>
            </div>
          </header>
          <nav className="fixed bottom-10 left-6 right-6 z-[150] flex justify-center pointer-events-none">
            <div className="glass-island px-8 py-4 rounded-[2.5rem] flex items-center gap-12 border-amber-400/20 shadow-2xl pointer-events-auto">
              <button onClick={() => navigateTo('SCAN')} className={view === 'SCAN' ? 'text-amber-400' : 'text-white/40'}><Camera size={24} /></button>
              <button onClick={() => navigateTo('COLLECTION')} className={view === 'COLLECTION' ? 'text-amber-400' : 'text-white/40'}><History size={24} /></button>
              <button onClick={() => navigateTo('MAP')} className={view === 'MAP' ? 'text-amber-400' : 'text-white/40'}><MapPin size={24} /></button>
            </div>
          </nav>
        </>
      )}

      <main className="flex-grow w-full relative">
        {view === 'SCAN' && (
          <div className="absolute inset-0">
            {scannerStage === 'CAPTURE' ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="full-camera-view" />
                <div className="camera-vignette" />
                <DynamicScannerHUD videoRef={videoRef} side={scanningSide} onHudUpdate={handleHudUpdate} />
                <div className={`fixed inset-0 bg-white pointer-events-none transition-opacity duration-200 ${isFlashing ? 'opacity-80' : 'opacity-0'}`} />
                
                <div className="absolute top-32 left-0 right-0 flex justify-center gap-12 px-10 animate-fadeIn z-50">
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

                <div className="absolute bottom-40 left-0 right-0 flex flex-col items-center gap-6 px-10">
                  <div className="flex items-center gap-8">
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      className="w-16 h-16 glass-island rounded-full flex items-center justify-center text-amber-400 border-amber-400/30 active:scale-95 transition-transform"
                    >
                      <Upload size={24} />
                    </button>
                    <button 
                      onClick={captureFrame} 
                      className="w-24 h-24 premium-gold-btn rounded-full border-[6px] border-black/20 flex items-center justify-center shadow-gold active:scale-95 transition-transform"
                    >
                      <Camera size={38} />
                    </button>
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
                      className="px-10 py-4 glass-island rounded-full border-amber-400 text-amber-400 mono text-[11px] font-black uppercase tracking-[0.3em] animate-bounce shadow-gold active:scale-95"
                    >
                      Proceder al Análisis
                    </button>
                  ) : (
                    <p className="mono text-[9px] text-white/40 uppercase tracking-[0.2em] font-bold text-center mt-2">
                      Selecciona la cara y captura para completar el archivo
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 glass-island p-10 pt-32 overflow-y-auto no-scrollbar">
                <div className="flex justify-center gap-12 mb-12">
                   <div className="flex flex-col items-center gap-3">
                      <div className="w-24 h-24 rounded-full border-2 border-amber-400/60 shadow-gold p-0.5 overflow-hidden bg-black/40">
                        <img src={obverseImage!} className="w-full h-full object-cover rounded-full" />
                      </div>
                      <span className="mono text-[9px] text-amber-400 font-black uppercase tracking-widest">Anverso</span>
                   </div>
                   <div className="flex flex-col items-center gap-3">
                      <div className="w-24 h-24 rounded-full border-2 border-amber-400/60 shadow-gold p-0.5 overflow-hidden bg-black/40">
                        <img src={reverseImage!} className="w-full h-full object-cover rounded-full" />
                      </div>
                      <span className="mono text-[9px] text-amber-400 font-black uppercase tracking-widest">Reverso</span>
                   </div>
                </div>
                <h3 className="serif-neo text-3xl font-black text-amber-400 text-center mb-10 tracking-widest uppercase">Metrología Imperial</h3>
                {isEstimating ? (
                  <div className="flex flex-col items-center gap-6 py-10">
                    <RotateCw className="text-amber-400 animate-spin" size={48} />
                    <p className="mono text-[10px] text-amber-400 uppercase font-black tracking-widest animate-pulse">Consultando el Archivo Astral...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <p className="mono text-[10px] uppercase font-bold text-amber-400 mb-2 tracking-widest flex justify-between items-center">
                        Peso Estimado (g)
                        <Weight size={12} className="opacity-40" />
                      </p>
                      <input type="number" step="0.01" value={weightInput} onChange={e => setWeightInput(e.target.value)} className="w-full glass-island p-5 rounded-2xl mono text-amber-400 outline-none border-amber-400/20 text-xl font-black" />
                    </div>
                    <div>
                      <p className="mono text-[10px] uppercase font-bold text-amber-400 mb-2 tracking-widest flex justify-between items-center">
                        Diámetro (mm)
                        <Diameter size={12} className="opacity-40" />
                      </p>
                      <input type="number" step="0.1" value={diameterInput} onChange={e => setDiameterInput(e.target.value)} className="w-full glass-island p-5 rounded-2xl mono text-amber-400 outline-none border-amber-400/20 text-xl font-black" />
                    </div>
                    <div>
                      <p className="mono text-[10px] uppercase font-bold text-amber-400 mb-2 tracking-widest flex justify-between items-center">
                        Material
                        <Layers size={12} className="opacity-40" />
                      </p>
                      <input type="text" value={materialInput} onChange={e => setMaterialInput(e.target.value)} className="w-full glass-island p-5 rounded-2xl mono text-amber-400 outline-none border-amber-400/20 text-xl font-black" />
                    </div>
                    <button onClick={processIdentification} className="w-full py-6 premium-gold-btn rounded-full font-black text-lg uppercase tracking-widest mt-10 shadow-gold active:scale-95">Catalogar Reliquia</button>
                    <button onClick={() => { setScannerStage('CAPTURE'); }} className="w-full py-4 text-white/40 mono text-[10px] uppercase font-bold tracking-widest">Revisar Capturas</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'RESULT' && currentResult && (
          <div className="absolute inset-0 pt-24 h-full flex flex-col animate-fadeIn">
            <div className="flex-grow overflow-hidden relative">
              {resultTab === '3D' && (
                <Coin3DViewer obverseUrl={obverseImage!} reverseUrl={reverseImage!} historicalSceneUrl={historicalScene || undefined} coinData={currentResult.bestMatch} playSfx={playSfx} />
              )}
              {resultTab === 'INFO' && (
                <div className="p-8 space-y-8 overflow-y-auto h-full pb-60 no-scrollbar">
                  <div className="text-center">
                    <h2 className="serif-neo text-3xl font-black text-amber-400 uppercase mb-2 tracking-tight">{currentResult.bestMatch.name}</h2>
                    <p className="mono text-[10px] text-white/40 uppercase tracking-[0.3em] font-black">{currentResult.bestMatch.period}</p>
                  </div>
                  <div className="flex justify-center gap-4">
                    <button 
                      onClick={() => { if(checkPermission('LIVE_EXPERT')) setShowLiveExpert(true); }} 
                      className={`glass-island px-6 py-3 rounded-full flex items-center gap-3 border-amber-400/30 text-amber-400 shadow-gold active:scale-95 ${user?.plan === 'FREE' ? 'opacity-60' : ''}`}
                    >
                      {user?.plan === 'FREE' ? <Lock size={14} /> : <Volume2 size={16} />}
                      <span className="mono text-[9px] font-black uppercase tracking-widest">Experto</span>
                    </button>
                    <button 
                      onClick={handleGenerateVideo} 
                      className={`glass-island px-6 py-3 rounded-full flex items-center gap-3 border-amber-400/30 text-amber-400 active:scale-95 ${user?.plan !== 'IMPERATOR' ? 'opacity-60' : ''}`}
                    >
                      {user?.plan !== 'IMPERATOR' ? <Lock size={14} /> : <ImageIcon size={16} />}
                      <span className="mono text-[9px] font-black uppercase tracking-widest">Vídeo Veo</span>
                    </button>
                  </div>
                  <div className="glass-island p-6 rounded-3xl border-amber-400/10">
                    <p className="mono text-[10px] uppercase text-amber-400 font-black mb-3 tracking-widest">Análisis Numismático</p>
                    <p className="text-sm opacity-80 leading-relaxed text-white">{currentResult.bestMatch.description}</p>
                  </div>
                  {expandedDescription && (
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-amber-400 rounded-[2.5rem] blur opacity-10" />
                      <div className="relative glass-island p-8 rounded-[2.5rem] border-amber-400/40 bg-amber-400/5 shadow-inner">
                        <div className="flex items-center gap-3 mb-6">
                          <Globe size={18} className="text-amber-400 gold-glow" />
                          <p className="serif-neo text-[11px] uppercase text-amber-400 font-black tracking-widest">Crónica de AUREXIA</p>
                        </div>
                        <p className="text-sm text-white/95 leading-[1.8] serif-neo italic text-justify whitespace-pre-line px-2 border-l border-amber-400/20">
                          {expandedDescription}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="glass-island p-8 rounded-[2.5rem] text-center border-amber-400/20 shadow-gold">
                    <p className="mono text-[9px] uppercase opacity-40 mb-2 font-black tracking-widest">Valoración Estimada</p>
                    <p className="serif-neo text-5xl font-black text-amber-400">{currentResult.bestMatch.estimatedValue}</p>
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
            <div className="absolute bottom-10 left-8 right-8 flex flex-col gap-4 z-[200]">
               <div className="glass-island p-1.5 rounded-full flex shadow-2xl">
                  <button onClick={() => setResultTab('3D')} className={`flex-1 py-4 rounded-full mono text-[10px] font-black transition-all ${resultTab === '3D' ? 'bg-amber-400 text-black shadow-gold' : 'text-white'}`}>VISOR 3D</button>
                  <button onClick={() => setResultTab('INFO')} className={`flex-1 py-4 rounded-full mono text-[10px] font-black transition-all ${resultTab === 'INFO' ? 'bg-amber-400 text-black shadow-gold' : 'text-white'}`}>HISTORIA</button>
                  {generatedVideoUrl && <button onClick={() => setResultTab('VIDEO')} className={`flex-1 py-4 rounded-full mono text-[10px] font-black transition-all ${resultTab === 'VIDEO' ? 'bg-amber-400 text-black shadow-gold' : 'text-white'}`}>VIDEO</button>}
               </div>
               <button onClick={saveToCollection} className="w-full py-6 premium-gold-btn rounded-full font-black shadow-gold uppercase tracking-widest active:scale-95 transition-transform">Archivar en Legado</button>
            </div>
          </div>
        )}

        {view === 'COLLECTION' && (
          <div className="absolute inset-0 pt-32 px-8 overflow-y-auto no-scrollbar h-full pb-40">
            <div className="flex justify-between items-end mb-8">
              <h2 className="serif-neo text-3xl font-black text-amber-400 tracking-[0.2em] uppercase">Mi Archivo</h2>
              <div className="flex flex-col items-end">
                <p className="mono text-[8px] uppercase text-white/40 font-bold mb-1">Capacidad</p>
                <div className="flex items-center gap-2">
                  <span className="mono text-xs font-black text-amber-400">{collection.length} / {PERMISSIONS.COLLECTION_LIMIT(user?.plan || 'FREE')}</span>
                </div>
              </div>
            </div>
            <div className="grid gap-5">
              {collection.length === 0 ? (
                <div className="glass-island p-10 rounded-3xl text-center opacity-40 flex flex-col items-center gap-4 border-dashed border-2">
                  <Box size={40} />
                  <p className="mono text-[10px] uppercase font-bold tracking-widest">Archivo Imperial Vacío</p>
                </div>
              ) : collection.map(c => (
                <div key={c.id} onClick={() => setSelectedCoin(c)} className="glass-island p-5 rounded-[2rem] flex items-center gap-6 border-amber-400/10 active:scale-95 transition-all">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400/20 bg-black/40 p-0.5">
                    <img src={c.obverseImage} className="w-full h-full object-cover rounded-full" />
                  </div>
                  <div className="flex-grow">
                    <h4 className="serif-neo text-sm font-black text-white uppercase truncate tracking-widest">{c.name}</h4>
                    <p className="mono text-[9px] text-white/40 mt-1 uppercase tracking-tight">{c.period}</p>
                  </div>
                  <ChevronRight size={20} className="text-amber-400/30" />
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'MAP' && (
          <MapView collection={collection} onClose={() => setView('SCAN')} onSelectCoin={(c) => setSelectedCoin(c)} />
        )}

        {view === 'PROFILE' && (
          <div className="absolute inset-0 pt-32 px-8 overflow-y-auto no-scrollbar h-full pb-40">
            <div className="flex flex-col items-center gap-8 mb-12">
               <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                 <div className="w-32 h-32 rounded-full border-4 border-amber-400 shadow-gold p-1 overflow-hidden relative">
                   <div className="w-full h-full rounded-full bg-amber-400/20 flex items-center justify-center overflow-hidden">
                     {user?.avatar ? (
                       <img src={user.avatar} className="w-full h-full object-cover" alt="Avatar" />
                     ) : (
                       <User size={60} className="text-amber-400" />
                     )}
                   </div>
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} className="text-amber-400" />
                   </div>
                 </div>
                 <div className="absolute bottom-0 right-0 bg-amber-400 text-black p-1.5 rounded-full shadow-lg border-2 border-black z-10">
                    <Edit3 size={12} />
                 </div>
                 <div className="absolute -bottom-2 -left-2 bg-amber-400 text-black px-4 py-1 rounded-full mono text-[8px] font-black uppercase tracking-widest z-10">{user?.plan}</div>
               </div>
               <div className="text-center">
                 <h2 className="serif-neo text-2xl font-black text-white tracking-widest uppercase">{user?.name}</h2>
                 <p className="mono text-[10px] text-white/40 uppercase mt-2 tracking-widest">{user?.email}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="glass-island p-6 rounded-3xl text-center border-amber-400/10">
                <p className="mono text-[8px] uppercase text-white/30 mb-2 font-bold tracking-widest">Reliquias</p>
                <p className="serif-neo text-3xl font-black text-amber-400">{collection.length}</p>
              </div>
              <div className="glass-island p-6 rounded-3xl text-center border-amber-400/10">
                <p className="mono text-[8px] uppercase text-white/30 mb-2 font-bold tracking-widest">Prestigio</p>
                <p className="serif-neo text-xl font-black text-amber-400">{user?.plan === 'FREE' ? 'Tiro' : user?.plan === 'CENTURION' ? 'Centurio' : 'Imperator'}</p>
              </div>
            </div>

            <div className="glass-island p-2 rounded-[2.5rem] space-y-2 mb-8 border-amber-400/10">
               <button onClick={() => setShowSubscriptionModal(true)} className="w-full p-6 flex justify-between items-center hover:bg-white/5 rounded-[2rem] transition-colors">
                  <div className="flex items-center gap-4 text-amber-400">
                    <Shield size={20} />
                    <span className="mono text-[10px] font-black uppercase tracking-widest">Ascender de Rango</span>
                  </div>
                  <Crown size={18} className="text-amber-400" />
               </button>
               <button className="w-full p-6 flex justify-between items-center hover:bg-white/5 rounded-[2rem] transition-colors">
                  <div className="flex items-center gap-4 text-white/60">
                    <Settings size={20} />
                    <span className="mono text-[10px] font-black uppercase tracking-widest">Ajustes Imperial</span>
                  </div>
                  <ChevronRight size={18} />
               </button>
               <button onClick={() => { localStorage.removeItem('aurexia_user'); setView('INTRO'); }} className="w-full p-6 flex justify-between items-center hover:bg-red-500/10 rounded-[2rem] transition-colors text-red-500/60">
                  <div className="flex items-center gap-4">
                    <LogOut size={20} />
                    <span className="mono text-[10px] font-black uppercase tracking-widest">Retirada Archivo</span>
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
                <img src={selectedCoin.obverseImage} className="w-full h-full object-cover rounded-full" />
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
