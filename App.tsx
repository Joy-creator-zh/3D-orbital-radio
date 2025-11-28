import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Station, PlayerState } from './types';
import { fetchStations } from './services/api';
import GlobeScene from './components/Globe';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import AICmdBar from './components/AICmdBar';
import ProDashboard from './components/ProDashboard';
import { Menu, Globe2, Radio } from 'lucide-react';
import { useLanguage } from './store/language';

const App: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [nearbyStations, setNearbyStations] = useState<Station[]>([]);
  const [favorites, setFavorites] = useState<Station[]>([]);
  const [history, setHistory] = useState<Station[]>([]);
  
  const { t, language, setLanguage } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [proMode, setProMode] = useState(false);
  
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    station: null,
    volume: 0.8,
    isLoading: false,
  });

  const [focusedLocation, setFocusedLocation] = useState<{lat: number, lng: number} | null>(null);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      const data = await fetchStations();
      setStations(data);
    };
    loadData();

    // Load persisted data
    const savedFavs = localStorage.getItem('orbital_favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    
    const savedHist = localStorage.getItem('orbital_history');
    if (savedHist) setHistory(JSON.parse(savedHist));
  }, []);

  // Persist Data
  useEffect(() => {
    localStorage.setItem('orbital_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('orbital_history', JSON.stringify(history));
  }, [history]);

  // Handlers
  const handleStationClick = (clickedStation: Station, nearby: Station[]) => {
    setNearbyStations(nearby.length > 0 ? nearby : [clickedStation]);
    setFocusedLocation({ lat: clickedStation.geo_lat!, lng: clickedStation.geo_long! });
    setSidebarOpen(true);
  };

  const playStation = (station: Station) => {
    // Add to history (avoid duplicates at top)
    setHistory(prev => {
      const filtered = prev.filter(s => s.stationuuid !== station.stationuuid);
      return [station, ...filtered].slice(0, 50);
    });

    setPlayerState(prev => ({
      ...prev,
      station,
      isPlaying: true,
      isLoading: true
    }));
    
    // Focus on the played station
    if (station.geo_lat && station.geo_long) {
        setFocusedLocation({ lat: station.geo_lat, lng: station.geo_long });
    }
  };

  const toggleFavorite = (station: Station) => {
    setFavorites(prev => {
      if (prev.some(s => s.stationuuid === station.stationuuid)) {
        return prev.filter(s => s.stationuuid !== station.stationuuid);
      }
      return [station, ...prev];
    });
  };

  // Time Utility
  const getLocalTime = (longitude: number) => {
    const date = new Date();
    // Approximate time zone offset based on longitude (15 degrees per hour)
    const offsetHours = Math.round(longitude / 15);
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const localDate = new Date(utc + (3600000 * offsetHours));
    
    return localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative font-sans text-white">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
          <Suspense fallback={null}>
             <GlobeScene 
                stations={stations} 
                onStationClick={handleStationClick}
                focusedLocation={focusedLocation}
             />
          </Suspense>
        </Canvas>
        <Loader 
          dataInterpolation={(p) => `Loading Globe... ${p.toFixed(0)}%`}
          containerStyles={{ background: 'black' }}
          innerStyles={{ width: '200px', height: '4px', background: '#333' }}
          barStyles={{ height: '4px', background: '#22c55e' }}
          dataStyles={{ fontSize: '12px', fontFamily: 'monospace', color: '#666' }}
        />
      </div>

      {/* Top Bar / Branding */}
      <div className="absolute top-0 left-0 p-6 z-10 pointer-events-none flex flex-col items-start">
        <h1 className="text-4xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
          {t.title}
        </h1>
        <p className="text-xs text-gray-400 tracking-widest mt-1">{t.subtitle}</p>
        <div className="mt-2 flex items-center text-[10px] text-gray-500 bg-black/40 backdrop-blur rounded px-2 py-1 inline-block border border-white/5">
           <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
           {stations.length > 0 ? `${stations.length.toLocaleString()} ${t.stationsActive}` : t.initializing}
        </div>

        {/* Language Switcher (Pointer events enabled for interaction) */}
        <button 
          className="mt-4 pointer-events-auto flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-xs text-gray-300 transition-colors border border-white/10"
          onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
        >
          <Globe2 size={12} />
          <span>{language === 'en' ? '中文' : 'English'}</span>
        </button>
        
        {/* Pro Mode Toggle */}
        <button 
          className={`mt-2 pointer-events-auto flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs transition-colors border border-white/10
            ${proMode ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-white/10 hover:bg-white/20 text-gray-300'}
          `}
          onClick={() => setProMode(!proMode)}
        >
          <Radio size={12} />
          <span>PRO MODE</span>
        </button>
      </div>

      {/* Sidebar Toggle (Mobile/Closed state) */}
      {!sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full transition-all z-10 border border-white/10"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Sidebar Backdrop - Click to close */}
      {sidebarOpen && (
        <div 
          className="absolute inset-0 z-10 bg-black/10 backdrop-blur-[1px] transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        nearbyStations={nearbyStations}
        currentStation={playerState.station}
        onSelectStation={playStation}
        favorites={favorites}
        history={history}
        toggleFavorite={toggleFavorite}
        getLocalTime={getLocalTime}
      />

      {/* Player */}
      <Player 
        playerState={playerState}
        onTogglePlay={() => setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
        onVolumeChange={(vol) => setPlayerState(prev => ({ ...prev, volume: vol }))}
        onError={() => {
           console.log("Stream error or interrupted");
           setPlayerState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
        }}
        onLoadStart={() => setPlayerState(prev => ({ ...prev, isLoading: true }))}
        onLoadedData={() => setPlayerState(prev => ({ ...prev, isLoading: false }))}
      />
      
      {/* Help / Tip */}
      {stations.length > 0 && !playerState.station && !sidebarOpen && (
         <div className="absolute bottom-36 left-1/2 transform -translate-x-1/2 text-center pointer-events-none opacity-50 animate-pulse">
           <p className="text-sm font-light tracking-wide text-green-200">{t.dragToRotate} • SHIFT+CLICK TO MESSAGE</p>
         </div>
      )}

      {/* AI Command Bar */}
      <AICmdBar stations={stations} onStationSelect={playStation} />

      {/* Pro Mode Dashboard */}
      {proMode && (
        <ProDashboard 
           station={playerState.station} 
           isPlaying={playerState.isPlaying} 
           volume={playerState.volume} 
        />
      )}
    </div>
  );
};

export default App;