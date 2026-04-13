
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
  Preload,
  Edges
} from '@react-three/drei';
import * as THREE from 'three';
import { 
  Maximize2, RotateCw, Sparkles, Globe, Loader2, Move, MousePointer2,
  AlignCenterVertical, Target, ZoomIn, ZoomOut, Download, Activity, Scan
} from 'lucide-react';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { CoinData } from '../types';

interface Coin3DViewerProps {
  obverseUrl: string;
  reverseUrl: string;
  historicalSceneUrl?: string;
  coinData?: Partial<CoinData>;
  lightColor?: string;
  playSfx?: (type: string, value?: number) => void;
  isMuted?: boolean;
}

const triggerHaptic = (pattern: number | number[] = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
};

type PedestalStyle = 'ROMAN' | 'IBERIAN' | 'GREEK' | 'BYZANTINE' | 'ETRUSCAN' | 'HELLENISTIC';

const AncientPedestal: React.FC<{ active: boolean, style: PedestalStyle }> = ({ active, style }) => {
  const stoneMaterial = useMemo(() => {
    switch (style) {
      case 'ROMAN':
        return new THREE.MeshStandardMaterial({ color: "#dcdcdc", roughness: 0.8, metalness: 0.1 });
      case 'IBERIAN':
        return new THREE.MeshStandardMaterial({ color: "#4a453f", roughness: 0.95, metalness: 0.05 });
      case 'GREEK':
        return new THREE.MeshStandardMaterial({ color: "#f5f5f0", roughness: 0.7, metalness: 0.1 });
      case 'BYZANTINE':
        return new THREE.MeshStandardMaterial({ color: "#8b7355", roughness: 0.4, metalness: 0.6, emissive: "#443311", emissiveIntensity: 0.2 });
      case 'ETRUSCAN':
        return new THREE.MeshStandardMaterial({ color: "#a0522d", roughness: 0.9, metalness: 0.0, emissive: "#221100", emissiveIntensity: 0.1 });
      case 'HELLENISTIC':
        return new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.2, metalness: 0.3 });
      default:
        return new THREE.MeshStandardMaterial({ color: "#5d574f", roughness: 0.9 });
    }
  }, [style]);

  const geometries = useMemo(() => {
    switch (style) {
      case 'ROMAN':
        return {
          shaft: new THREE.CylinderGeometry(1.4, 1.4, 1.2, 24),
          cap: new THREE.BoxGeometry(3.2, 0.4, 3.2),
          base: new THREE.BoxGeometry(3.4, 0.4, 3.4)
        };
      case 'IBERIAN':
        return {
          body: new THREE.BoxGeometry(2.8, 1.6, 2.8),
          top: new THREE.BoxGeometry(3.2, 0.2, 3.2)
        };
      case 'GREEK':
        return {
          shaft: new THREE.CylinderGeometry(1.3, 1.3, 1.4, 32),
          cap: new THREE.CylinderGeometry(1.6, 1.3, 0.3, 32),
          base: new THREE.CylinderGeometry(1.3, 1.6, 0.3, 32)
        };
      case 'BYZANTINE':
        return {
          shaft: new THREE.CylinderGeometry(1.2, 1.5, 1.2, 8),
          cap: new THREE.BoxGeometry(3.0, 0.5, 3.0),
          base: new THREE.BoxGeometry(3.5, 0.3, 3.5)
        };
      case 'ETRUSCAN':
        return {
          shaft: new THREE.CylinderGeometry(1.1, 1.6, 1.5, 4, 1, false), // Pirámide truncada cuadrada
          cap: new THREE.BoxGeometry(2.8, 0.2, 2.8),
          base: new THREE.BoxGeometry(3.2, 0.3, 3.2)
        };
      case 'HELLENISTIC':
        return {
          shaft: new THREE.CylinderGeometry(1.0, 1.0, 1.8, 32),
          cap: new THREE.CylinderGeometry(1.5, 1.0, 0.4, 32),
          base: new THREE.CylinderGeometry(1.0, 1.5, 0.4, 32)
        };
      default:
        return {
          body: new THREE.BoxGeometry(2.8, 1.6, 2.8),
          top: new THREE.BoxGeometry(3.2, 0.2, 3.2)
        };
    }
  }, [style]);

  if (!active) return null;

  return (
    <group position={[0, -2.8, -0.5]}>
      {style === 'ROMAN' && (
        <group>
          <mesh receiveShadow castShadow material={stoneMaterial} geometry={geometries.shaft} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, 0.7, 0]} geometry={geometries.cap} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, -0.7, 0]} geometry={geometries.base} />
        </group>
      )}
      {style === 'IBERIAN' && (
        <group>
          <mesh receiveShadow castShadow material={stoneMaterial} geometry={geometries.body} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, 0.9, 0]} geometry={geometries.top} />
        </group>
      )}
      {style === 'GREEK' && (
        <group>
          <mesh receiveShadow castShadow material={stoneMaterial} geometry={geometries.shaft} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, 0.8, 0]} geometry={geometries.cap} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, -0.8, 0]} geometry={geometries.base} />
        </group>
      )}
      {style === 'BYZANTINE' && (
        <group>
          <mesh receiveShadow castShadow material={stoneMaterial} geometry={geometries.shaft} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, 0.75, 0]} geometry={geometries.cap} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, -0.75, 0]} geometry={geometries.base} />
          {/* Detalles dorados adicionales */}
          <mesh position={[0, 0.75, 0]} scale={[1.05, 1.05, 1.05]}>
            <boxGeometry args={[3.0, 0.1, 3.0]} />
            <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
          </mesh>
        </group>
      )}
      {style === 'ETRUSCAN' && (
        <group>
          <mesh receiveShadow castShadow material={stoneMaterial} geometry={geometries.shaft} rotation={[0, Math.PI / 4, 0]} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, 0.8, 0]} geometry={geometries.cap} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, -0.8, 0]} geometry={geometries.base} />
        </group>
      )}
      {style === 'HELLENISTIC' && (
        <group>
          <mesh receiveShadow castShadow material={stoneMaterial} geometry={geometries.shaft} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, 1.0, 0]} geometry={geometries.cap} />
          <mesh receiveShadow castShadow material={stoneMaterial} position={[0, -1.0, 0]} geometry={geometries.base} />
          {/* Anillos dorados */}
          <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.05, 0.05, 16, 32]} />
            <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.05, 0.05, 16, 32]} />
            <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
          </mesh>
        </group>
      )}
    </group>
  );
};

const HistoricalAmbient: React.FC<{ active: boolean, style: PedestalStyle, isMuted?: boolean }> = ({ active, style, isMuted }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Cleanup previous audio if any
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (!active || isMuted) return;

    const soundUrls: Record<PedestalStyle, string> = {
      ROMAN: 'https://assets.mixkit.co/sfx/preview/mixkit-crowd-talking-in-a-market-2465.mp3',
      IBERIAN: 'https://assets.mixkit.co/sfx/preview/mixkit-wind-blowing-soughing-1153.mp3',
      GREEK: 'https://assets.mixkit.co/sfx/preview/mixkit-forest-birds-ambience-1210.mp3',
      BYZANTINE: 'https://assets.mixkit.co/sfx/preview/mixkit-church-bell-ringing-647.mp3',
      ETRUSCAN: 'https://assets.mixkit.co/sfx/preview/mixkit-campfire-crackles-1330.mp3',
      HELLENISTIC: 'https://assets.mixkit.co/sfx/preview/mixkit-sea-waves-loop-1196.mp3'
    };

    const audio = new Audio(soundUrls[style]);
    audio.loop = true;
    audio.volume = 0.12; // Very subtle background ambiance
    
    const playAudio = async () => {
      try {
        await audio.play();
      } catch (e) {
        // Browser might block autoplay until interaction
        console.warn("Ambient audio play blocked. Interaction required.", e);
      }
    };

    playAudio();
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [active, style, isMuted]);

  return null;
};

const FlickeringTorch: React.FC<{ active: boolean }> = ({ active }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const secondaryLightRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (!active) return;
    const time = state.clock.elapsedTime;
    
    if (lightRef.current) {
      // Variación de intensidad y color para un efecto de fuego más realista
      const flicker = Math.sin(time * 12) * 0.5 + Math.sin(time * 28) * 0.2;
      lightRef.current.intensity = 2.8 + flicker;
      
      // Cambio sutil de color entre naranja y rojo fuego
      const colorIntensity = (flicker + 0.7) / 1.4;
      lightRef.current.color.setHSL(0.08 + colorIntensity * 0.02, 1, 0.5);
    }
    if (secondaryLightRef.current) {
      secondaryLightRef.current.intensity = 1.2 + Math.cos(time * 8) * 0.4;
    }
  });

  return (
    <group visible={active}>
      <pointLight 
        ref={lightRef} 
        position={[5, 4, 6]} 
        color="#ff8833" 
        distance={30} 
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight 
        ref={secondaryLightRef} 
        position={[-5, 3, 4]} 
        color="#ff4400" 
        distance={20} 
        intensity={0.6}
      />
      {/* Luz de relleno cálida desde abajo para resaltar relieves */}
      <pointLight position={[0, -5, 2]} color="#442200" intensity={0.4} distance={10} />
    </group>
  );
};

const AtmosphericParticles: React.FC<{ active: boolean }> = ({ active }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 250; // Más partículas para mayor densidad
  
  const [positions, speeds, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      spd[i] = 0.001 + Math.random() * 0.004;
      sz[i] = Math.random() * 0.08 + 0.02;
    }
    return [pos, spd, sz];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current || !active) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    
    for (let i = 0; i < count; i++) {
      let y = posAttr.getY(i);
      y += speeds[i];
      if (y > 10) y = -10;
      posAttr.setY(i, y);
      
      let x = posAttr.getX(i);
      x += Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.003;
      posAttr.setX(i, x);
    }
    posAttr.needsUpdate = true;
    pointsRef.current.rotation.y += 0.0002;
  });

  return (
    <points ref={pointsRef} visible={active}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.08} 
        color="#ffcc66" 
        transparent 
        opacity={0.4} 
        sizeAttenuation 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
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

  const responsiveScale = Math.max(0.1, Math.min(viewport.width / 5, 1.0)) * zoomScale;

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
  xRayMode: boolean;
  autoRotate: boolean;
}> = ({ obverseUrl, reverseUrl, isFlipped, isPressed, rotationY, rotationX, panOffset, zoomScale, xRayMode, autoRotate }) => {
  const meshRef = useRef<THREE.Group>(null);
  const xRayMeshRef = useRef<THREE.Group>(null);
  const scanRingRef = useRef<THREE.Mesh>(null);
  const internalRotationY = useRef(0);
  const internalRotationX = useRef(0);
  const autoRotationY = useRef(0);
  const { viewport } = useThree();
  
  // Carga de texturas con manejo de errores y optimización
  const obverseTex = useTexture(obverseUrl || 'https://picsum.photos/seed/coin1/512/512');
  const reverseTex = useTexture(reverseUrl || 'https://picsum.photos/seed/coin2/512/512');

  useEffect(() => {
    if (obverseTex && reverseTex) {
      [obverseTex, reverseTex].forEach(t => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.center.set(0.5, 0.5);
        t.anisotropy = 16;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.needsUpdate = true;
      });
      // El reverso suele necesitar una rotación de 180 grados para verse derecho al voltear
      reverseTex.rotation = Math.PI;
    }
  }, [obverseTex, reverseTex]);

  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);

  const materials = useMemo(() => [
    // 0: Canto (Lateral)
    new THREE.MeshStandardMaterial({ 
      color: '#8b7355', 
      roughness: 0.6, 
      metalness: 0.9,
      transparent: xRayMode,
      opacity: xRayMode ? 0.15 : 1,
      clippingPlanes: xRayMode ? [clippingPlane] : []
    }),
    // 1: Anverso (Superior)
    new THREE.MeshStandardMaterial({ 
      color: '#ffffff', 
      map: obverseTex, 
      roughness: 0.3, 
      metalness: 0.8, 
      bumpMap: obverseTex, 
      bumpScale: 0.05,
      transparent: xRayMode,
      opacity: xRayMode ? 0.2 : 1,
      clippingPlanes: xRayMode ? [clippingPlane] : []
    }),
    // 2: Reverso (Inferior)
    new THREE.MeshStandardMaterial({ 
      color: '#ffffff', 
      map: reverseTex, 
      roughness: 0.3, 
      metalness: 0.8, 
      bumpMap: reverseTex, 
      bumpScale: 0.05,
      transparent: xRayMode,
      opacity: xRayMode ? 0.2 : 1,
      clippingPlanes: xRayMode ? [clippingPlane] : []
    }),
  ], [obverseTex, reverseTex, xRayMode, clippingPlane]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Debug logging
    if (Math.random() < 0.01) {
      console.log("HighResCoin Rendering", { obverseUrl: obverseUrl.substring(0, 50), zoomScale });
    }
    
    if (autoRotate && !isPressed) {
      autoRotationY.current += 0.005;
    }

    const baseFlipRotation = isFlipped ? Math.PI : 0;
    const targetRotY = baseFlipRotation + rotationY + autoRotationY.current;
    const targetRotX = rotationX;

    const dampFactor = isPressed ? 0.08 : 0.12;

    internalRotationY.current = THREE.MathUtils.lerp(internalRotationY.current, targetRotY, dampFactor);
    internalRotationX.current = THREE.MathUtils.lerp(internalRotationX.current, targetRotX, dampFactor);
    
    meshRef.current.rotation.y = internalRotationY.current;
    meshRef.current.rotation.x = internalRotationX.current;

    // Escala responsiva mejorada
    const responsiveScale = Math.max(0.15, Math.min(viewport.width / 4.5, 1.2)) * zoomScale;
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, responsiveScale, 0.1));
    
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, panOffset[0], 0.1);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, panOffset[1], 0.1);

    if (xRayMode) {
      const time = state.clock.elapsedTime;
      clippingPlane.constant = Math.sin(time * 0.5) * 0.1; // Move clipping plane up and down
      
      if (xRayMeshRef.current) {
        xRayMeshRef.current.visible = true;
        xRayMeshRef.current.rotation.x = Math.sin(time) * 0.05;
        
        if (scanRingRef.current) {
          scanRingRef.current.position.y = Math.sin(time * 2) * 0.15;
          const mat = scanRingRef.current.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.5 + Math.sin(time * 5) * 0.3;
        }
      }
    } else {
      if (xRayMeshRef.current) xRayMeshRef.current.visible = false;
    }
  });

  const xRayMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#00ffff',
    wireframe: true,
    transparent: true,
    opacity: 0.4,
    emissive: '#00ffff',
    emissiveIntensity: 0.5,
    side: THREE.DoubleSide
  }), []);

  return (
    <group ref={meshRef} scale={0.1} name="coin-model">
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow material={materials}>
        <cylinderGeometry args={[2, 2, 0.18, 128]} />
        {xRayMode && <Edges color="#00ffff" threshold={15} />}
      </mesh>
      
      {/* X-Ray Internal Structure View */}
      <group ref={xRayMeshRef}>
        {/* Outer wireframe shell */}
        <mesh rotation={[Math.PI / 2, 0, 0]} material={xRayMaterial} scale={[1.02, 1.02, 1.02]}>
          <cylinderGeometry args={[2, 2, 0.18, 64, 4, true]} />
        </mesh>
        
        {/* Internal "Core" representation - Metal density simulation */}
        <mesh scale={[0.8, 0.05, 0.8]}>
          <cylinderGeometry args={[1.8, 1.8, 0.1, 32]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.1} wireframe />
        </mesh>

        {/* Structural Ribs */}
        {[0, 45, 90, 135].map((rot, i) => (
          <mesh key={i} rotation={[0, (rot * Math.PI) / 180, 0]}>
            <boxGeometry args={[3.8, 0.01, 0.02]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
          </mesh>
        ))}

        {/* Cross-section "Scanner" Plane */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[4.2, 0.02]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
        
        {/* Internal "Core" representation */}
        <mesh scale={[0.4, 0.08, 0.4]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.3} wireframe />
        </mesh>

        {/* Scanning Ring */}
        <mesh ref={scanRingRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.05, 0.02, 16, 100]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
        </mesh>

        {/* Internal Labels */}
        <group position={[0, 0.5, 0]}>
          <Text
            fontSize={0.1}
            color="#00ffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.005}
            outlineColor="#000000"
          >
            DENSITY: HIGH
          </Text>
        </group>
        <group position={[0, -0.5, 0]}>
          <Text
            fontSize={0.1}
            color="#00ffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.005}
            outlineColor="#000000"
          >
            STRUCTURAL INTEGRITY: 98%
          </Text>
        </group>
      </group>
    </group>
  );
};

const SceneBackground: React.FC<{ url: string }> = ({ url }) => {
  const tex = useTexture(url);
  return (
    <group position={[0, 0, -20]}>
      <mesh>
        <planeGeometry args={[80, 45]} />
        <meshBasicMaterial 
          map={tex} 
          transparent 
          opacity={0.4} 
          depthWrite={false} 
          color="#443322" // Tinte cálido para integrar con antorchas
        />
      </mesh>
      {/* Gradiente de oscuridad en la base */}
      <mesh position={[0, -15, 1]}>
        <planeGeometry args={[80, 15]} />
        <meshBasicMaterial 
          color="#000000" 
          transparent 
          opacity={0.6} 
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

const SceneContent: React.FC<{
  obverseUrl: string;
  reverseUrl: string;
  historicalSceneUrl?: string;
  coinData?: Partial<CoinData>;
  isFlipped: boolean;
  isPressed: boolean;
  rotationY: number;
  rotationX: number;
  panOffset: [number, number];
  zoomScale: number;
  dioramaMode: boolean;
  xRayMode: boolean;
  autoRotate: boolean;
  pedestalStyle: PedestalStyle;
  showLabels: boolean;
  onSceneReady: (scene: THREE.Scene) => void;
}> = ({ 
  obverseUrl, reverseUrl, historicalSceneUrl, coinData, 
  isFlipped, isPressed, rotationY, rotationX, panOffset, zoomScale, 
  dioramaMode, xRayMode, autoRotate, pedestalStyle, showLabels, onSceneReady 
}) => {
  const { scene } = useThree();
  
  useEffect(() => {
    console.log("SceneContent Ready", { scene: !!scene, obverseUrl: obverseUrl.substring(0, 50) });
    onSceneReady(scene);
  }, [scene, onSceneReady, obverseUrl]);

  return (
    <>
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <Preload all />
      <PerspectiveCamera makeDefault position={[0, 0, 9]} fov={28} />
      
      <ambientLight intensity={dioramaMode ? 0.15 : 0.8} />
      <directionalLight position={[5, 5, 10]} intensity={dioramaMode ? 0.5 : 1.5} castShadow />
      <pointLight position={[-5, 5, 5]} intensity={dioramaMode ? 0.2 : 0.5} color="#d4af37" />
      
      {dioramaMode && <fog attach="fog" args={['#0a0502', 8, 30]} />}
      
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
            xRayMode={xRayMode}
            autoRotate={autoRotate}
          />
        </Suspense>
        <CoinSurfaceLabel coinData={coinData} visible={showLabels} />
      </Float>
      
      <AncientPedestal active={dioramaMode} style={pedestalStyle} />
      <AtmosphericParticles active={dioramaMode} />
      
      {historicalSceneUrl && dioramaMode && (
        <Suspense fallback={null}>
          <SceneBackground url={historicalSceneUrl} />
        </Suspense>
      )}
    </>
  );
};

export const Coin3DViewer: React.FC<Coin3DViewerProps> = ({ 
  obverseUrl, 
  reverseUrl, 
  historicalSceneUrl, 
  coinData, 
  playSfx,
  isMuted = false
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(0);
  const [panOffset, setPanOffset] = useState<[number, number]>([0, 0]);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [dioramaMode, setDioramaMode] = useState(false);
  const [xRayMode, setXRayMode] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pedestalStyle, setPedestalStyle] = useState<PedestalStyle>('ROMAN');
  const [showLabels, setShowLabels] = useState(true);
  
  // Efecto para establecer el estilo inicial basado en la civilización
  useEffect(() => {
    if (coinData?.civilization) {
      const civ = coinData.civilization.toLowerCase();
      if (civ.includes('roman')) setPedestalStyle('ROMAN');
      else if (civ.includes('iber') || civ.includes('hispan')) setPedestalStyle('IBERIAN');
      else if (civ.includes('gree') || civ.includes('grieg')) setPedestalStyle('GREEK');
      else if (civ.includes('byzant') || civ.includes('bizant')) setPedestalStyle('BYZANTINE');
      else if (civ.includes('etrusc')) setPedestalStyle('ETRUSCAN');
      else if (civ.includes('hellen') || civ.includes('helen')) setPedestalStyle('HELLENISTIC');
    }
  }, [coinData?.civilization]);
  
  const activePointers = useRef<Map<number, { x: number, y: number }>>(new Map());
  const initialPinchDist = useRef<number | null>(null);
  const initialZoom = useRef(1);
  const initialPanCenter = useRef<{x: number, y: number} | null>(null);
  const initialPanOffset = useRef<[number, number]>([0, 0]);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastSoundTime = useRef(0);
  const lastHapticTime = useRef(0);
  const hapticAccumulator = useRef(0);
  const zoomHapticAccumulator = useRef(0);
  const [isExporting, setIsExporting] = useState(false);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Persistencia del estado de la vista
  useEffect(() => {
    if (coinData?.id) {
      const savedState = localStorage.getItem(`coin_view_state_${coinData.id}`);
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          if (state.rotationX !== undefined) setRotationX(state.rotationX);
          if (state.rotationY !== undefined) setRotationY(state.rotationY);
          if (state.panOffset !== undefined) setPanOffset(state.panOffset);
          if (state.zoomScale !== undefined) setZoomScale(state.zoomScale);
          if (state.dioramaMode !== undefined) setDioramaMode(state.dioramaMode);
          if (state.xRayMode !== undefined) setXRayMode(state.xRayMode);
          if (state.autoRotate !== undefined) setAutoRotate(state.autoRotate);
          if (state.pedestalStyle !== undefined) setPedestalStyle(state.pedestalStyle);
          if (state.isFlipped !== undefined) setIsFlipped(state.isFlipped);
        } catch (e) {
          console.error('Error al cargar el estado persistente de la moneda:', e);
        }
      }
    }
  }, [coinData?.id]);

  useEffect(() => {
    if (coinData?.id) {
      const state = {
        rotationX,
        rotationY,
        panOffset,
        zoomScale,
        dioramaMode,
        xRayMode,
        autoRotate,
        pedestalStyle,
        isFlipped
      };
      localStorage.setItem(`coin_view_state_${coinData.id}`, JSON.stringify(state));
    }
  }, [coinData?.id, rotationX, rotationY, panOffset, zoomScale, dioramaMode, xRayMode, autoRotate, pedestalStyle, isFlipped]);

  const exportToGLTF = () => {
    if (!sceneRef.current) return;

    const coinGroup = sceneRef.current.getObjectByName('coin-model');
    if (!coinGroup) {
      console.error('No se encontró el modelo de la moneda');
      return;
    }

    setIsExporting(true);
    triggerHaptic(50);

    const exporter = new GLTFExporter();
    exporter.parse(
      coinGroup,
      (result) => {
        const fileName = coinData?.name?.replace(/\s+/g, '_') || 'moneda_aurexia';
        
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${fileName}.glb`;
          link.click();
          URL.revokeObjectURL(url);
        } else {
          const output = JSON.stringify(result, null, 2);
          const blob = new Blob([output], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${fileName}.gltf`;
          link.click();
          URL.revokeObjectURL(url);
        }
        setIsExporting(false);
      },
      (error) => {
        console.error('Error al exportar GLTF:', error);
        setIsExporting(false);
      },
      { binary: true, animations: [], includeCustomExtensions: true }
    );
  };

  const resetView = () => {
    triggerHaptic([10, 50, 10]);
    setRotationY(0);
    setRotationX(0);
    setPanOffset([0, 0]);
    setZoomScale(1.0);
    setIsFlipped(false);
  };

  const alignStraight = (side: 'OBVERSE' | 'REVERSE') => {
    triggerHaptic([20, 10, 20]);
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
      const clampedZoom = Math.max(0.4, Math.min(5.0, nextZoom));
      
      // Retroalimentación háptica para zoom
      const zoomDiff = Math.abs(clampedZoom - zoomScale);
      if (zoomDiff > 0.001) {
        zoomHapticAccumulator.current += zoomDiff * 100;
        if (zoomHapticAccumulator.current > 1.5 && Date.now() - lastHapticTime.current > 60) {
          const intensity = Math.min(15, Math.max(2, zoomDiff * 500));
          triggerHaptic(intensity);
          lastHapticTime.current = Date.now();
          zoomHapticAccumulator.current = 0;
        }
      }
      
      setZoomScale(clampedZoom);

    } else if (activePointers.current.size === 1) {
      const dx = e.clientX - lastX.current;
      const dy = e.clientY - lastY.current;
      lastX.current = e.clientX;
      lastY.current = e.clientY;

      const speed = Math.sqrt(dx * dx + dy * dy);
      
      // Sonido de rotación sutil basado en velocidad
      if (speed > 2 && playSfx && Date.now() - lastSoundTime.current > 60) {
        playSfx('rotate', speed);
        lastSoundTime.current = Date.now();
      }

      // Retroalimentación háptica dinámica basada en velocidad y distancia
      hapticAccumulator.current += speed;
      const hapticThreshold = Math.max(15, 40 - speed * 2); // Más frecuente si es más rápido
      
      if (hapticAccumulator.current > hapticThreshold && Date.now() - lastHapticTime.current > 40) {
        // La duración de la vibración escala con la velocidad para simular inercia y fricción
        const hapticDuration = Math.min(25, Math.max(3, speed * 0.3));
        triggerHaptic(hapticDuration);
        lastHapticTime.current = Date.now();
        hapticAccumulator.current = 0;
      }

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
        // Haptic de volteo más complejo y satisfactorio (doble pulso)
        triggerHaptic([25, 30, 15]); 
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
    <div className="w-full h-full min-h-[400px] relative touch-none select-none overflow-hidden" 
         onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      
      <HistoricalAmbient active={dioramaMode} style={pedestalStyle} isMuted={isMuted} />

      <Canvas 
        shadows 
        dpr={[1, 2]} 
        gl={{ preserveDrawingBuffer: true, antialias: true, localClippingEnabled: true }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        <SceneContent 
          obverseUrl={obverseUrl}
          reverseUrl={reverseUrl}
          historicalSceneUrl={historicalSceneUrl}
          coinData={coinData}
          isFlipped={isFlipped}
          isPressed={isPressed}
          rotationY={rotationY}
          rotationX={rotationX}
          panOffset={panOffset}
          zoomScale={zoomScale}
          dioramaMode={dioramaMode}
          xRayMode={xRayMode}
          autoRotate={autoRotate}
          pedestalStyle={pedestalStyle}
          showLabels={showLabels}
          onSceneReady={(s) => sceneRef.current = s}
        />
      </Canvas>

      {/* Control Overlay Panels */}
      <div className="absolute top-1/2 right-4 sm:right-6 -translate-y-1/2 flex flex-col gap-3 sm:gap-4 z-50">
        <button 
          onClick={exportToGLTF} 
          disabled={isExporting}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full glass-island flex items-center justify-center border-2 border-white/10 text-white/60 transition-all active:scale-90 hover:border-amber-400/50 hover:text-amber-400 disabled:opacity-50"
          title="Exportar GLTF"
        >
          {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        </button>

        <button 
          onClick={() => { 
            const next = !dioramaMode;
            setDioramaMode(next); 
            triggerHaptic(next ? [15, 20, 10] : 15); 
            if (playSfx) playSfx('toggle', next ? 1 : 0);
          }} 
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full glass-island flex items-center justify-center border-2 transition-all active:scale-90 relative ${dioramaMode ? 'border-amber-400 bg-amber-400/20 shadow-gold' : 'border-white/10'}`}
          title={dioramaMode ? "Desactivar Modo Diorama" : "Activar Modo Diorama"}
        >
          <Sparkles size={18} className={dioramaMode ? "text-amber-400 animate-pulse" : "text-white/60"} />
          {dioramaMode && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
          )}
        </button>

        <button 
          onClick={() => { 
            const next = !xRayMode;
            setXRayMode(next); 
            triggerHaptic(next ? [10, 30, 10] : 20); 
            if (playSfx) playSfx('scan', next ? 1 : 0);
          }} 
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full glass-island flex items-center justify-center border-2 transition-all active:scale-90 relative ${xRayMode ? 'border-cyan-400 bg-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'border-white/10'}`}
          title={xRayMode ? "Desactivar Modo Rayos X" : "Activar Modo Rayos X"}
        >
          <Scan size={18} className={xRayMode ? "text-cyan-400 animate-pulse" : "text-white/60"} />
          {xRayMode && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
          )}
        </button>

        <button 
          onClick={() => { 
            const next = !autoRotate;
            setAutoRotate(next); 
            triggerHaptic(15); 
          }} 
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full glass-island flex items-center justify-center border-2 transition-all active:scale-90 relative ${autoRotate ? 'border-amber-400 bg-amber-400/20 shadow-gold' : 'border-white/10'}`}
          title={autoRotate ? "Pausar Rotación" : "Activar Rotación"}
        >
          <RotateCw size={18} className={autoRotate ? "text-amber-400 animate-spin-slow" : "text-white/60"} />
        </button>
        
        <div className="flex flex-col gap-1 p-1 glass-island rounded-full border-white/10">
          <button onClick={() => alignStraight('OBVERSE')} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex flex-col items-center justify-center text-amber-400/60 hover:text-amber-400 transition-colors">
            <AlignCenterVertical size={14} />
            <span className="mono text-[5px] sm:text-[6px] font-black uppercase tracking-tighter mt-0.5">Anv</span>
          </button>
          <button onClick={() => alignStraight('REVERSE')} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex flex-col items-center justify-center text-amber-400/60 hover:text-amber-400 transition-colors">
            <AlignCenterVertical size={14} className="rotate-180" />
            <span className="mono text-[5px] sm:text-[6px] font-black uppercase tracking-tighter mt-0.5">Rev</span>
          </button>
        </div>

        <button onClick={resetView} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full glass-island flex items-center justify-center border-2 border-white/10 text-white/40 transition-all active:scale-90">
          <Target size={18} />
        </button>

        {dioramaMode && (
          <div className="flex flex-col gap-2 p-1 glass-island rounded-2xl border-white/10 animate-fadeIn overflow-y-auto max-h-[40vh]">
            {(['ROMAN', 'IBERIAN', 'GREEK', 'BYZANTINE', 'ETRUSCAN', 'HELLENISTIC'] as PedestalStyle[]).map(style => (
              <button 
                key={style}
                onClick={() => { setPedestalStyle(style); triggerHaptic([10, 10]); }}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${pedestalStyle === style ? 'bg-amber-400 text-black' : 'text-white/40 hover:text-white'}`}
                title={`Estilo ${style}`}
              >
                <span className="mono text-[7px] sm:text-[8px] font-black">{style[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute top-1/2 left-4 sm:left-6 -translate-y-1/2 flex flex-col gap-3 sm:gap-4 z-50">
        <button onClick={() => { setZoomScale(p => Math.min(5, p + 0.5)); triggerHaptic([10, 5, 10]); }} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full glass-island flex items-center justify-center border-2 border-white/10 text-white/60 active:scale-90">
          <ZoomIn size={18} />
        </button>
        <button onClick={() => { setZoomScale(p => Math.max(0.4, p - 0.5)); triggerHaptic([10, 5, 10]); }} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full glass-island flex items-center justify-center border-2 border-white/10 text-white/60 active:scale-90">
          <ZoomOut size={18} />
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
