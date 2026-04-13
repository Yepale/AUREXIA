
import React from 'react';
import { 
  Camera, History, Map as MapIcon, User, 
  Search, Shield, Volume2, VolumeX, Moon, 
  Sun, ChevronLeft, Save, Share2, Info,
  Box, Maximize2, Layers, Compass, LogIn,
  Mail, Settings, ChevronRight, Palette,
  Zap, SunMedium, Sliders, Globe, Filter, ArrowDownWideNarrow,
  ExternalLink, Sparkles, Upload, RotateCw, Check,
  LogOut, LayoutDashboard, Crown, Star,
  Fingerprint, Weight, Diameter, MapPin,
  Trash2, Edit3, Award, Download, Image, RefreshCw, Key,
  Eye, EyeOff, Bell, Database, X, LayoutGrid, List, Music, ArrowRight, Lock,
  MousePointer2, Navigation, Crosshair, Plus, Loader2
} from 'lucide-react';

export {
  Camera, History, MapIcon, User, 
  Search, Shield, Volume2, VolumeX, Moon, 
  Sun, ChevronLeft, Save, Share2, Info,
  Box, Maximize2, Layers, Compass, LogIn,
  Mail, Settings, ChevronRight, Palette,
  Zap, SunMedium, Sliders, Globe, Filter, ArrowDownWideNarrow,
  ExternalLink, Sparkles, Upload, RotateCw, Check,
  LogOut, LayoutDashboard, Crown, Star,
  Fingerprint, Weight, Diameter, MapPin,
  Trash2, Edit3, Award, Download, Image, RefreshCw, Key,
  Eye, EyeOff, Bell, Database, X, LayoutGrid, List, Music, ArrowRight, Lock,
  MousePointer2, Navigation, Crosshair, Plus, Loader2
};

export const AurexiaLogo = ({ size = 24, className = "", onClick }: { size?: number, className?: string, onClick?: () => void }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
    style={{ pointerEvents: onClick ? 'auto' : 'none' }}
  >
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d4af37" />
        <stop offset="100%" stopColor="#ffb300" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" stroke="url(#goldGrad)" strokeWidth="0.5" opacity="0.3" />
    <circle cx="50" cy="50" r="40" stroke="url(#goldGrad)" strokeWidth="1.5" />
    <path d="M50 20L25 70H75L50 20Z" stroke="url(#goldGrad)" strokeWidth="4" strokeLinejoin="round" />
    <circle cx="50" cy="48" r="6" fill="url(#goldGrad)" />
  </svg>
);
