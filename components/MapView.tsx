
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CoinData } from '../types';
import { X, MapPin, Search, Navigation, Filter, Layers, Compass, Crosshair, ChevronRight, Plus, Info, Eye, Loader2 } from './Icons';

declare const L: any;

interface MapViewProps {
  collection: CoinData[];
  onClose: () => void;
  onSelectCoin: (coin: CoinData) => void;
  onUpdateCoinLocation?: (coinId: string, lat: number, lng: number) => void;
  onCreateCoinAtLocation?: (lat: number, lng: number) => void;
}

type MapFilter = 'ALL' | 'ROMAN' | 'IBERIAN';

const triggerHaptic = (pattern: number | number[] = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
};

export const MapView: React.FC<MapViewProps> = ({ 
  collection, 
  onClose, 
  onSelectCoin,
  onUpdateCoinLocation,
  onCreateCoinAtLocation
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  
  const [activeFilter, setActiveFilter] = useState<MapFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
  const [mapStyle, setMapStyle] = useState<'DARK' | 'SATELLITE'>('DARK');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (typeof L === 'undefined') return;
    
    L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';
    const tileLayer = mapStyle === 'DARK' 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    
    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true
    }).setView([40.4168, -3.7038], 5);

    L.tileLayer(tileLayer, {
      maxZoom: 19,
    }).addTo(mapRef.current);

    mapRef.current.whenReady(() => {
      setIsMapReady(true);
    });

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 1000);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  // Handle map clicks for creation
  useEffect(() => {
    if (!mapRef.current) return;
    
    const handleClick = (e: any) => {
      if (isCreating && onCreateCoinAtLocation) {
        onCreateCoinAtLocation(e.latlng.lat, e.latlng.lng);
        setIsCreating(false);
      }
    };

    mapRef.current.on('click', handleClick);
    return () => {
      if (mapRef.current) mapRef.current.off('click', handleClick);
    };
  }, [isCreating, onCreateCoinAtLocation]);

  // Update Tile Layer when style changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current.removeLayer(layer);
      }
    });

    const tileLayer = mapStyle === 'DARK' 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    L.tileLayer(tileLayer, {
      maxZoom: 19,
    }).addTo(mapRef.current);
  }, [mapStyle]);

  // Update Markers based on Filter and Collection
  const updateMarkers = useCallback(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const filtered = collection.filter(coin => {
      const matchFilter = activeFilter === 'ALL' || 
        (activeFilter === 'ROMAN' && (coin.civilization.toLowerCase().includes('roman'))) ||
        (activeFilter === 'IBERIAN' && (coin.civilization.toLowerCase().includes('iber') || coin.civilization.toLowerCase().includes('ibér')));
      
      const matchSearch = coin.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          coin.period.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchFilter && matchSearch;
    });

    filtered.forEach(coin => {
      if (coin.location) {
        const isSelected = selectedCoin?.id === coin.id;
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div class="group relative flex items-center justify-center ${isSelected ? 'marker-active' : ''}">
                  <div class="absolute inset-0 bg-amber-400 blur-md opacity-0 group-hover:opacity-60 transition-opacity"></div>
                  <div class="w-12 h-12 rounded-full border-2 ${isSelected ? 'border-amber-400 scale-125' : 'border-white/20'} bg-black overflow-hidden shadow-gold relative z-10 transition-all hover:scale-125">
                    <img src="${coin.obverseImage}" class="w-full h-full object-cover" />
                  </div>
                  <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-amber-400/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    <span class="mono text-[7px] text-amber-400 font-black uppercase tracking-widest">${coin.name}</span>
                  </div>
                 </div>`,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });

        const marker = L.marker([coin.location.lat, coin.location.lng], { 
          icon: customIcon,
          draggable: true 
        }).addTo(mapRef.current);

        marker.on('click', (e: any) => {
          L.DomEvent.stopPropagation(e);
          mapRef.current.flyTo([coin.location!.lat, coin.location!.lng], 12, { duration: 1.5 });
          setSelectedCoin(coin);
        });

        marker.on('dragend', (e: any) => {
          const newPos = e.target.getLatLng();
          if (onUpdateCoinLocation) {
            onUpdateCoinLocation(coin.id, newPos.lat, newPos.lng);
          }
        });

        markersRef.current.push(marker);
      }
    });

    if (filtered.length > 0 && searchQuery) {
      const group = L.featureGroup(markersRef.current);
      mapRef.current.fitBounds(group.getBounds().pad(0.2));
    }
  }, [collection, activeFilter, searchQuery, onSelectCoin, onUpdateCoinLocation]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  const handleLocateUser = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setIsLocating(false);
        
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 13);
          
          if (userMarkerRef.current) userMarkerRef.current.remove();
          
          const userIcon = L.divIcon({
            className: 'user-marker',
            html: `<div class="relative flex items-center justify-center">
                    <div class="absolute w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
                    <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg relative z-10"></div>
                   </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          
          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon }).addTo(mapRef.current);
        }
      },
      () => {
        setIsLocating(false);
        alert("No se pudo obtener la ubicación imperial.");
      }
    );
  };

  const flyToCoin = (coin: CoinData) => {
    if (coin.location && mapRef.current) {
      triggerHaptic(15);
      setSelectedCoin(coin);
      mapRef.current.flyTo([coin.location.lat, coin.location.lng], 14, {
        animate: true,
        duration: 2
      });
    }
  };

  return (
    <div className="absolute inset-0 z-[1000] bg-black flex flex-col animate-fadeIn overflow-hidden">
      {/* Loading Overlay */}
      {!isMapReady && (
        <div className="absolute inset-0 z-[2000] bg-black flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <Compass size={64} className="text-amber-400 animate-spin-slow" />
            <div className="absolute inset-0 bg-amber-400/20 blur-2xl animate-pulse rounded-full"></div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="serif-neo text-xl text-amber-400 uppercase tracking-[0.3em] animate-pulse">Cargando Cartografía</h2>
            <p className="mono text-[10px] text-white/40 uppercase tracking-widest">Sincronizando con el Archivo Imperial...</p>
          </div>
          <Loader2 size={24} className="text-amber-400/40 animate-spin mt-4" />
        </div>
      )}

      {/* Bottom Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-[1001] pb-safe flex flex-col gap-4 pointer-events-none px-6">
        {/* Creation Hint */}
        {isCreating && (
          <div className="animate-bounce self-center mb-2">
            <div className="glass-island px-6 py-3 rounded-full border-amber-400 text-amber-400 flex items-center gap-3 shadow-gold">
              <MapPin size={16} className="animate-pulse" />
              <span className="mono text-[10px] font-black uppercase tracking-widest">Toca el mapa para situar hallazgo</span>
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex justify-between items-end gap-4 pointer-events-auto">
          <div className="flex gap-2">
            <button 
              onClick={onClose} 
              className="p-4 glass-island rounded-2xl text-white/40 border-white/10 shadow-gold active:scale-90 transition-transform"
            >
              <X size={20} />
            </button>
            <button 
              onClick={() => {
                setMapStyle(mapStyle === 'DARK' ? 'SATELLITE' : 'DARK');
                triggerHaptic(20);
              }}
              className="p-4 glass-island rounded-2xl text-amber-400 border-amber-400/20 shadow-gold active:scale-90 transition-transform"
            >
              <Layers size={20} />
            </button>
            <button 
              onClick={() => {
                handleLocateUser();
                triggerHaptic(15);
              }}
              className={`p-4 glass-island rounded-2xl text-amber-400 border-amber-400/20 shadow-gold active:scale-90 transition-transform ${isLocating ? 'animate-pulse' : ''}`}
            >
              <Crosshair size={20} />
            </button>
          </div>

          <button 
            onClick={() => setIsCreating(!isCreating)}
            className={`p-5 rounded-3xl shadow-gold active:scale-90 transition-all ${isCreating ? 'bg-amber-400 text-black' : 'premium-gold-btn text-black'}`}
          >
            {isCreating ? <X size={24} /> : <Plus size={24} />}
          </button>
        </div>

        {/* Search Bar */}
        <div className="glass-island w-full rounded-2xl flex items-center px-4 py-3 border-white/5 pointer-events-auto focus-within:border-amber-400/40 transition-colors">
          <Search size={18} className="text-white/20" />
          <input 
            type="text" 
            placeholder="Buscar por ceca o época..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none flex-grow ml-3 text-xs mono text-white placeholder:text-white/20"
          />
        </div>

        {/* Filters Bar */}
        <div className="flex gap-2 pointer-events-auto overflow-x-auto no-scrollbar pb-2">
          {(['ALL', 'ROMAN', 'IBERIAN'] as MapFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-5 py-2 rounded-full mono text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeFilter === f ? 'bg-amber-400 text-black border-amber-400' : 'glass-island text-white/40 border-white/10'}`}
            >
              {f === 'ALL' ? 'Todo el Imperio' : f === 'ROMAN' ? 'Roma' : 'Iberia'}
            </button>
          ))}
        </div>

        {/* Collection Carousel - Only show if no coin is selected */}
        {!selectedCoin && (
          <div className="w-full overflow-x-auto no-scrollbar pointer-events-auto pb-4">
            <div className="flex gap-4">
              {collection.length === 0 ? (
                <div className="glass-island p-6 rounded-[2rem] border-white/5 opacity-40 min-w-[200px]">
                  <p className="mono text-[9px] uppercase font-bold tracking-widest text-center">Sin registros en el mapa</p>
                </div>
              ) : collection.map(coin => (
                <div 
                  key={coin.id} 
                  onClick={() => flyToCoin(coin)}
                  className={`glass-island p-3 rounded-[2rem] border-amber-400/10 flex items-center gap-4 min-w-[240px] active:scale-95 transition-all cursor-pointer ${selectedCoin?.id === coin.id ? 'border-amber-400 bg-amber-400/10' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-amber-400/30 bg-black p-0.5">
                    <img src={coin.obverseImage} className="w-full h-full object-cover rounded-full" alt="" />
                  </div>
                  <div className="flex-grow">
                    <h4 className="serif-neo text-[9px] font-black text-white uppercase truncate tracking-widest">{coin.name}</h4>
                    <p className="mono text-[7px] text-amber-400 mt-0.5 uppercase tracking-tighter">{coin.period}</p>
                  </div>
                  <div className="p-2 bg-amber-400/10 rounded-full">
                    <Navigation size={12} className="text-amber-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top Header Overlay - Completely Cleared */}
      <div className="absolute top-0 left-6 right-6 z-[1001] pt-safe flex justify-center items-center pointer-events-none opacity-20">
        <div className="flex items-center gap-3">
          <Compass size={12} className="text-amber-400 animate-spin-slow" />
          <span className="serif-neo text-[7px] font-black uppercase text-amber-400 tracking-widest">Cartografía</span>
        </div>
      </div>

      <div ref={mapContainerRef} className="w-full h-full grayscale-[0.5] contrast-[1.1] brightness-[0.9]" />

      {/* Quick View Bottom Sheet */}
      {selectedCoin && (
        <div className="absolute bottom-0 left-0 right-0 z-[1002] p-6 animate-slide-up">
          <div className="glass-island rounded-[2.5rem] border-amber-400/30 p-6 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={() => setSelectedCoin(null)}
                className="p-2 glass-island rounded-full text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-amber-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="w-24 h-24 rounded-full border-2 border-amber-400 bg-black p-1 relative z-10 animate-float">
                  <img src={selectedCoin.obverseImage} className="w-full h-full object-cover rounded-full" alt="" />
                </div>
              </div>
              
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-amber-400/20 text-amber-400 mono text-[8px] font-black uppercase rounded tracking-widest">
                    {selectedCoin.civilization}
                  </span>
                </div>
                <h3 className="serif-neo text-xl text-white uppercase tracking-widest leading-tight">{selectedCoin.name}</h3>
                <p className="mono text-[10px] text-amber-400/60 uppercase tracking-widest mt-1">{selectedCoin.period}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-island p-4 rounded-3xl border-white/5 flex flex-col gap-1">
                <span className="mono text-[8px] text-white/20 uppercase font-black">Ceca</span>
                <span className="serif-neo text-xs text-white uppercase tracking-widest">{selectedCoin.mint || 'Desconocida'}</span>
              </div>
              <div className="glass-island p-4 rounded-3xl border-white/5 flex flex-col gap-1">
                <span className="mono text-[8px] text-white/20 uppercase font-black">Rareza</span>
                <span className="serif-neo text-xs text-amber-400 uppercase tracking-widest">{selectedCoin.rarity || 'Común'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => onSelectCoin(selectedCoin)}
                className="flex-grow py-4 bg-amber-400 text-black rounded-full serif-neo text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-gold"
              >
                <Eye size={16} />
                Ver Detalles
              </button>
              <button 
                className="p-4 glass-island rounded-full text-amber-400 border-amber-400/20 active:scale-95 transition-all"
                title="Compartir ubicación"
              >
                <Navigation size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .leaflet-container {
          background: #050505 !important;
        }
        .custom-marker {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};
