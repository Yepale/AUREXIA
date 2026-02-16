
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CoinData } from '../types';
import { X, MapPin, Search, Navigation, Filter, Layers, Compass, Crosshair, ChevronRight } from './Icons';

declare const L: any;

interface MapViewProps {
  collection: CoinData[];
  onClose: () => void;
  onSelectCoin: (coin: CoinData) => void;
}

type MapFilter = 'ALL' | 'ROMAN' | 'IBERIAN';

export const MapView: React.FC<MapViewProps> = ({ collection, onClose, onSelectCoin }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  
  const [activeFilter, setActiveFilter] = useState<MapFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Premium Dark Theme for Maps
    const tileLayer = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    
    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true
    }).setView([40.4168, -3.7038], 5);

    L.tileLayer(tileLayer, {
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Custom Zoom Control Position
    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

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
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div class="group relative flex items-center justify-center">
                  <div class="absolute inset-0 bg-amber-400 blur-md opacity-0 group-hover:opacity-60 transition-opacity"></div>
                  <div class="w-12 h-12 rounded-full border-2 border-amber-400 bg-black overflow-hidden shadow-gold relative z-10 transition-transform hover:scale-125">
                    <img src="${coin.obverseImage}" class="w-full h-full object-cover" />
                  </div>
                  <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-amber-400/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    <span class="mono text-[7px] text-amber-400 font-black uppercase tracking-widest">${coin.name}</span>
                  </div>
                 </div>`,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });

        const marker = L.marker([coin.location.lat, coin.location.lng], { icon: customIcon }).addTo(mapRef.current);
        marker.on('click', () => {
          mapRef.current.flyTo([coin.location!.lat, coin.location!.lng], 12, { duration: 1.5 });
          onSelectCoin(coin);
        });
        markersRef.current.push(marker);
      }
    });

    // Auto-bounds if there are filtered markers
    if (filtered.length > 0 && searchQuery) {
      const group = L.featureGroup(markersRef.current);
      mapRef.current.fitBounds(group.getBounds().pad(0.2));
    }
  }, [collection, activeFilter, searchQuery, onSelectCoin]);

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
      mapRef.current.flyTo([coin.location.lat, coin.location.lng], 14, {
        animate: true,
        duration: 2
      });
    }
  };

  return (
    <div className="absolute inset-0 z-[1000] bg-black flex flex-col animate-fadeIn">
      {/* Top Controls Overlay */}
      <div className="absolute top-12 left-6 right-6 z-[1001] flex flex-col gap-4 pointer-events-none">
        <div className="flex justify-between items-center">
          <button 
            onClick={onClose} 
            className="p-3 glass-island rounded-full text-amber-400 border-amber-400/30 shadow-gold pointer-events-auto active:scale-90"
          >
            <X size={24} />
          </button>
          
          <div className="glass-island px-6 py-3 rounded-full border-amber-400/20 pointer-events-auto flex items-center gap-3">
            <Compass size={16} className="text-amber-400 animate-spin-slow" />
            <span className="serif-neo text-[10px] font-black uppercase text-amber-400 tracking-widest">Cartografía Imperial</span>
          </div>

          <button 
            onClick={handleLocateUser}
            className={`p-3 glass-island rounded-full text-amber-400 border-amber-400/30 shadow-gold pointer-events-auto active:scale-90 ${isLocating ? 'animate-pulse' : ''}`}
          >
            <Crosshair size={24} />
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
      </div>

      {/* Main Map Container */}
      <div ref={mapContainerRef} className="w-full h-full grayscale-[0.5] contrast-[1.1] brightness-[0.9]" />

      {/* Bottom Collection Carousel */}
      <div className="absolute bottom-10 left-0 right-0 z-[1001] pointer-events-none px-6">
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
                className="glass-island p-3 rounded-[2rem] border-amber-400/10 flex items-center gap-4 min-w-[240px] active:scale-95 transition-transform cursor-pointer"
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
      </div>

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
