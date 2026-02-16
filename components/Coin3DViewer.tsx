
import React, { useRef, useMemo, useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  PerspectiveCamera, 
  Environment, 
  ContactShadows, 
  Float, 
  useTexture, 
  Text, 
  Html, 
  AdaptiveDpr,
  AdaptiveEvents,
  Preload
} from '@react-three/drei';
import * as THREE from 'three';
import { 
  Maximize2, RotateCw, Sparkles, Globe, Loader2, Move, MousePointer2,
  AlignCenterVertical, Target, ZoomIn, ZoomOut
} from 'lucide-react';
import { CoinData } from '../types';

interface Coin3DViewerProps {
  obverseUrl: string;
  reverseUrl: string;
  historicalSceneUrl?: string;
  coinData?: Partial<CoinData>;
  lightColor?: string;
  playSfx?: (type: string) => void;
}

const triggerHaptic = (duration = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch (e) {}
  }
};

const AncientPedestal: React.FC<{ active: boolean, civilization?: string }> = ({ active, civilization }) => {
  const isRoman = civilization?.toLowerCase().includes('roman') || civilization?.toLowerCase().includes('romana');
  
  const stoneMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: isRoman ? "#dcdcdc" : "#5d574f",
    roughness: 0.9,
    metalness: 0.05,
  }), [isRoman]);

  const geometries = useMemo(() => {
    if (isRoman) {
      return {
        shaft: new THREE.CylinderGeometry(1.4, 1.4, 1.2, 24),
        cap: new THREE.BoxGeometry(3.2, 0.4, 3.2),
        base: new THREE.BoxGeometry(3.4, 0.4, 3.4)
      };
    } else {
      return {
        body: new THREE.BoxGeometry(2.8, 1.6, 2.8),
        top: new THREE.BoxGeometry(3.2, 0.2, 3.2)
      };
    }
  }, [isRoman]);

  if (!active) return null;

  return (
    <group position={[0, -2.8, -0.5]}>
      {isRoman ? (
        <group>
          <mesh receiveShadow castShadow material={stoneMaterial} geometry={geometries.shaft} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, 0.7, 0]} geometry={geometries.cap} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, -0.7, 0]} geometry={geometries.base} />
        </group>
      ) : (
        <group>
          <mesh receiveShadow castShadow material={stoneMaterial} geometry={geometries.body} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, 0.9, 0]} geometry={geometries.top} />
        </group>
      )}
    </group>
  );
};

const FlickeringTorch: React.FC<{ active: boolean }> = ({ active }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (!lightRef.current || !active) return;
    const time = state.clock.elapsedTime;
    lightRef.current.intensity = 2.0 + Math.sin(time * 10) * 0.3 + Math.sin(time * 25) * 0.15;
  });

  return (
    <pointLight 
      ref={lightRef} 
      position={[2, 2, 4]} 
      color="#ffaa44" 
      distance={20} 
      visible={active}
      castShadow
    />
  );
};

const AtmosphericParticles: React.FC<{ active: boolean }> = ({ active }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 100;
  
  const [positions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return [pos];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current || !active) return;
    pointsRef.current.rotation.y += 0.0003;
  });

  return (
    <points ref={pointsRef} visible={active}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.04} 
        color="#d4af37" 
        transparent 
        opacity={0.2} 
        sizeAttenuation 
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const CoinSurfaceLabel: React.FC<{ coinData?: Partial<CoinData>, visible: boolean }> = ({ coinData, visible }) => {
  if (!coinData?.name || !visible) return null;

  return (
    <group position={[0, 2.6, 0.2]}>
      <Text
        font="https://fonts.gstatic.com/s/cinzel/v14/8vIK7w8m279skn7aRIp_zAs.woff"
        fontSize={0.2}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {coinData.name.toUpperCase()}
      </Text>
    </group>
  );
};

const CoinPlaceholder: React.FC<{ zoomScale: number }> = ({ zoomScale }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  const responsiveScale = Math.min(viewport.width / 5, 1.0) * zoomScale;

  return (
    <group scale={responsiveScale}>
      <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2, 2, 0.18, 32]} />
        <meshStandardMaterial color="#333" roughness={1} metalness={0} />
      </mesh>
      <Html center>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="text-amber-400 animate-spin" size={24} />
          <span className="mono text-[8px] text-amber-400 font-black uppercase tracking-widest whitespace-nowrap">Restaurando Reliquia...</span>
        </div>
      </Html>
    </group>
  );
};

const HighResCoin: React.FC<{ 
  obverseUrl: string; 
  reverseUrl: string; 
  isFlipped: boolean;
  isPressed: boolean;
  rotationY: number;
  rotationX: number;
  panOffset: [number, number];
  zoomScale: number;
}> = ({ obverseUrl, reverseUrl, isFlipped, isPressed, rotationY, rotationX, panOffset, zoomScale }) => {
  const meshRef = useRef<THREE.Group>(null);
  const internalRotationY = useRef(0);
  const internalRotationX = useRef(0);
  const { viewport } = useThree();
  
  // Robust texture loading
  const obverseTex = useTexture(obverseUrl);
  const reverseTex = useTexture(reverseUrl);

  useMemo(() => {
    [obverseTex, reverseTex].forEach(t => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.center.set(0.5, 0.5);
      t.anisotropy = 8;
      t.minFilter = THREE.LinearMipmapLinearFilter;
    });
    // Normal flip without negative scaling to avoid UV issues in some drivers
    reverseTex.rotation = Math.PI;
  }, [obverseTex, reverseTex]);

  const materials = useMemo(() => [
    // 0: Side
    new THREE.MeshStandardMaterial({ color: '#8b7355', roughness: 0.7, metalness: 0.95 }),
    // 1: Top (Obverse)
    new THREE.MeshStandardMaterial({ color: '#ffffff', map: obverseTex, roughness: 0.4, metalness: 0.9, bumpMap: obverseTex, bumpScale: 0.08 }),
    // 2: Bottom (Reverse)
    new THREE.MeshStandardMaterial({ color: '#ffffff', map: reverseTex, roughness: 0.4, metalness: 0.9, bumpMap: reverseTex, bumpScale: 0.08 }),
  ], [obverseTex, reverseTex]);

  useFrame(() => {
    if (!meshRef.current) return;
    
    const baseFlipRotation = isFlipped ? Math.PI : 0;
    const targetRotY = baseFlipRotation + rotationY;
    const targetRotX = rotationX;

    const dampFactor = isPressed ? 0.1 : 0.15;

    internalRotationY.current = THREE.MathUtils.lerp(internalRotationY.current, targetRotY, dampFactor);
    internalRotationX.current = THREE.MathUtils.lerp(internalRotationX.current, targetRotX, dampFactor);
    
    meshRef.current.rotation.y = internalRotationY.current;
    meshRef.current.rotation.x = internalRotationX.current;

    const responsiveScale = Math.min(viewport.width / 5, 1.1) * zoomScale;
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, responsiveScale, 0.1));
    
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, panOffset[0], 0.1);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, panOffset[1], 0.1);
  });

  return (
    <group ref={meshRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow material={materials}>
        <cylinderGeometry args={[2, 2, 0.2, 128]} />
      </mesh>
    </group>
  );
};

const SceneBackground: React.FC<{ url: string }> = ({ url }) => {
  const tex = useTexture(url);
  return (
    <group position={[0, 0, -18]}>
      <mesh>
        <planeGeometry args={[70, 40]} />
        <meshBasicMaterial map={tex} transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
};

export const Coin3DViewer: React.FC<Coin3DViewerProps> = ({ obverseUrl, reverseUrl, historicalSceneUrl, coinData, playSfx }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(0);
  const [panOffset, setPanOffset] = useState<[number, number]>([0, 0]);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [dioramaMode, setDioramaMode] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  
  const activePointers = useRef<Map<number, { x: number, y: number }>>(new Map());
  const initialPinchDist = useRef<number | null>(null);
  const initialZoom = useRef(1);
  const initialPanCenter = useRef<{x: number, y: number} | null>(null);
  const initialPanOffset = useRef<[number, number]>([0, 0]);
  const lastX = useRef(0);
  const lastY = useRef(0);

  const resetView = () => {
    triggerHaptic(40);
    setRotationY(0);
    setRotationX(0);
    setPanOffset([0, 0]);
    setZoomScale(1.0);
    setIsFlipped(false);
  };

  const alignStraight = (side: 'OBVERSE' | 'REVERSE') => {
    triggerHaptic(30);
    setIsFlipped(side === 'REVERSE');
    setRotationX(0);
    setRotationY(0);
    setPanOffset([0, 0]);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    setIsPressed(true);
    triggerHaptic(10);

    if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values()) as { x: number, y: number }[];
      initialPinchDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialZoom.current = zoomScale;
      initialPanCenter.current = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      initialPanOffset.current = [...panOffset];
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    const ipc = initialPanCenter.current;
    if (activePointers.current.size === 2 && initialPinchDist.current !== null && ipc !== null) {
      const pts = Array.from(activePointers.current.values()) as { x: number, y: number }[];
      const currentCenter = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const dx = (currentCenter.x - ipc.x) * 0.008;
      const dy = (ipc.y - currentCenter.y) * 0.008;
      setPanOffset([initialPanOffset.current[0] + dx, initialPanOffset.current[1] + dy]);

      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const rawRatio = dist / initialPinchDist.current;
      const smoothRatio = Math.pow(rawRatio, 1.2); 
      const nextZoom = initialZoom.current * smoothRatio;
      setZoomScale(Math.max(0.4, Math.min(5.0, nextZoom)));

    } else if (activePointers.current.size === 1) {
      const dx = e.clientX - lastX.current;
      const dy = e.clientY - lastY.current;
      lastX.current = e.clientX;
      lastY.current = e.clientY;

      setRotationY(prev => prev + dx * 0.008);
      setRotationX(prev => Math.max(-Math.PI / 3, Math.min(Math.PI / 3, prev + dy * 0.008)));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const startPos = activePointers.current.get(e.pointerId) as { x: number, y: number } | undefined;
    if (startPos && activePointers.current.size === 1) {
      const dy = e.clientY - startPos.y;
      if (Math.abs(dy) > 180) { 
        setIsFlipped(p => !p); 
        triggerHaptic(30); 
      }
    }
    setIsPressed(false);
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      initialPinchDist.current = null;
      initialPanCenter.current = null;
    }
  };

  return (
    <div className="w-full h-full relative touch-none select-none overflow-hidden" 
         onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true, antialias: true }}>
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <Preload all />
        <PerspectiveCamera makeDefault position={[0, 0, 9]} fov={28} />
        
        {/* Lights (Redundant for reliability) */}
        <ambientLight intensity={dioramaMode ? 0.3 : 0.8} />
        <directionalLight position={[5, 5, 10]} intensity={1.5} castShadow />
        <pointLight position={[-5, 5, 5]} intensity={0.5} color="#d4af37" />
        
        <FlickeringTorch active={dioramaMode} />
        <Environment preset={dioramaMode ? "night" : "studio"} />
        
        <ContactShadows position={[0, -2.8, 0]} opacity={0.6} scale={10} blur={3} far={5} />
        
        <Float speed={isPressed ? 0.2 : 1.2} rotationIntensity={isPressed ? 0.02 : 0.3} floatIntensity={isPressed ? 0.05 : 0.5}>
          <Suspense fallback={<CoinPlaceholder zoomScale={zoomScale} />}>
            <HighResCoin 
              obverseUrl={obverseUrl} 
              reverseUrl={reverseUrl} 
              isFlipped={isFlipped} 
              isPressed={isPressed} 
              rotationY={rotationY} 
              rotationX={rotationX}
              panOffset={panOffset}
              zoomScale={zoomScale} 
            />
          </Suspense>
          <CoinSurfaceLabel coinData={coinData} visible={showLabels} />
        </Float>
        
        <AncientPedestal active={dioramaMode} civilization={coinData?.civilization} />
        <AtmosphericParticles active={dioramaMode} />
        
        {historicalSceneUrl && dioramaMode && (
          <Suspense fallback={null}>
            <SceneBackground url={historicalSceneUrl} />
          </Suspense>
        )}
      </Canvas>

      {/* Control Overlay Panels */}
      <div className="absolute top-1/2 right-6 -translate-y-1/2 flex flex-col gap-4 z-50">
        <button onClick={() => { setDioramaMode(!dioramaMode); triggerHaptic(20); }} className={`w-14 h-14 rounded-full glass-island flex items-center justify-center border-2 transition-all active:scale-90 ${dioramaMode ? 'border-amber-400 bg-amber-400/20 shadow-gold' : 'border-white/10'}`}>
          <Globe size={20} className={dioramaMode ? "text-amber-400" : "text-white/60"} />
        </button>
        
        <div className="flex flex-col gap-1 p-1 glass-island rounded-full border-white/10">
          <button onClick={() => alignStraight('OBVERSE')} className="w-12 h-12 rounded-full flex flex-col items-center justify-center text-amber-400/60 hover:text-amber-400 transition-colors">
            <AlignCenterVertical size={16} />
            <span className="mono text-[6px] font-black uppercase tracking-tighter mt-0.5">Anv</span>
          </button>
          <button onClick={() => alignStraight('REVERSE')} className="w-12 h-12 rounded-full flex flex-col items-center justify-center text-amber-400/60 hover:text-amber-400 transition-colors">
            <AlignCenterVertical size={16} className="rotate-180" />
            <span className="mono text-[6px] font-black uppercase tracking-tighter mt-0.5">Rev</span>
          </button>
        </div>

        <button onClick={resetView} className="w-14 h-14 rounded-full glass-island flex items-center justify-center border-2 border-white/10 text-white/40 transition-all active:scale-90">
          <Target size={20} />
        </button>
      </div>

      <div className="absolute top-1/2 left-6 -translate-y-1/2 flex flex-col gap-4 z-50">
        <button onClick={() => { setZoomScale(p => Math.min(5, p + 0.5)); triggerHaptic(10); }} className="w-14 h-14 rounded-full glass-island flex items-center justify-center border-2 border-white/10 text-white/60 active:scale-90">
          <ZoomIn size={20} />
        </button>
        <button onClick={() => { setZoomScale(p => Math.max(0.4, p - 0.5)); triggerHaptic(10); }} className="w-14 h-14 rounded-full glass-island flex items-center justify-center border-2 border-white/10 text-white/60 active:scale-90">
          <ZoomOut size={20} />
        </button>
      </div>
      
      {/* Dynamic Interaction Guide */}
      <div className="absolute bottom-10 left-0 right-0 pointer-events-none flex flex-col items-center gap-2">
        <div className="px-5 py-2.5 glass-island rounded-full flex items-center gap-6 shadow-gold border-amber-400/10">
          <div className="flex items-center gap-2">
             <MousePointer2 size={12} className="text-amber-400" />
             <span className="mono text-[8px] uppercase font-bold text-white/60">Girar</span>
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 pl-6">
             <Move size={12} className="text-amber-400" />
             <span className="mono text-[8px] uppercase font-bold text-white/60">Pan / Zoom</span>
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 pl-6">
             <RotateCw size={12} className="text-amber-400" />
             <span className="mono text-[8px] uppercase font-bold text-white/60">Swipe Voltear</span>
          </div>
        </div>
      </div>
    </div>
  );
};
