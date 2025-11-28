import React, { useState, useEffect } from 'react';
import { Station } from '../types';
import { Radio, MapPin, Star, History, X, Search, Sparkles, Loader2 } from 'lucide-react';
import { generateStationGuide, AIStationGuide } from '../services/ai';
import { useLanguage } from '../store/language';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  nearbyStations: Station[];
  currentStation: Station | null;
  onSelectStation: (station: Station) => void;
  history: Station[];
  favorites: Station[];
  toggleFavorite: (station: Station) => void;
  getLocalTime: (offset: number) => string;
}

const Sidebar: React.FC<SidebarProps> = ({
  visible,
  onClose,
  nearbyStations,
  currentStation,
  onSelectStation,
  history,
  favorites,
  toggleFavorite,
  getLocalTime
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'nearby' | 'favorites' | 'history'>('nearby');
  const [filterText, setFilterText] = useState('');
  const [aiGuide, setAiGuide] = useState<AIStationGuide | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Auto-switch to nearby tab when new stations are loaded
  useEffect(() => {
    if (nearbyStations.length > 0) {
      setActiveTab('nearby');
    }
  }, [nearbyStations]);

  // Reset AI guide when station changes
  useEffect(() => {
    setAiGuide(null);
    if (currentStation && visible) {
      loadAiGuide(currentStation);
    }
  }, [currentStation?.stationuuid, visible, language]);

  const loadAiGuide = async (station: Station) => {
    setIsAiLoading(true);
    const guide = await generateStationGuide(station, language);
    setAiGuide(guide);
    setIsAiLoading(false);
  };

  const renderStationList = (stations: Station[]) => {
    const filtered = stations.filter(s => {
      const search = filterText.toLowerCase();
      return (
        s.name.toLowerCase().includes(search) ||
        (s.country && s.country.toLowerCase().includes(search)) ||
        (s.state && s.state.toLowerCase().includes(search)) ||
        (s.tags && s.tags.toLowerCase().includes(search))
      );
    });
    
    if (filtered.length === 0) {
      return <div className="p-4 text-gray-400 text-sm text-center">{t.noStationsFound}</div>;
    }

    return (
      <ul className="space-y-2">
        {filtered.map((s) => (
          <li 
            key={s.stationuuid}
            onClick={() => onSelectStation(s)}
            className={`
              p-3 rounded-lg cursor-pointer transition-all duration-200 border border-transparent
              ${currentStation?.stationuuid === s.stationuuid 
                ? 'bg-green-500/20 border-green-500/50 text-green-300' 
                : 'hover:bg-white/10 text-gray-300 hover:text-white'}
            `}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 overflow-hidden">
                <h4 className="font-semibold truncate">{s.name}</h4>
                <div className="flex items-center text-xs text-gray-400 mt-1 space-x-2">
                  <span className="flex items-center"><MapPin size={10} className="mr-1"/> {s.state || s.country}</span>
                  {s.bitrate > 0 && <span>{s.bitrate}k</span>}
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleFavorite(s); }}
                className={`p-1 hover:text-yellow-400 ${favorites.some(f => f.stationuuid === s.stationuuid) ? 'text-yellow-400' : 'text-gray-600'}`}
              >
                <Star size={14} fill={favorites.some(f => f.stationuuid === s.stationuuid) ? "currentColor" : "none"} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  if (!visible && nearbyStations.length === 0) return null;

  return (
    <div className={`
      absolute top-0 right-0 h-full w-80 md:w-96 bg-black/80 backdrop-blur-xl border-l border-white/10 shadow-2xl z-20
      transform transition-transform duration-300 ease-in-out flex flex-col
      ${visible ? 'translate-x-0' : 'translate-x-full'}
    `}>
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white tracking-wider flex items-center">
          <Radio className="mr-2 text-green-400" /> ORBITAL
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 text-sm">
        <button 
          onClick={() => setActiveTab('nearby')}
          className={`flex-1 p-3 text-center transition-colors ${activeTab === 'nearby' ? 'text-green-400 border-b-2 border-green-400 bg-white/5' : 'text-gray-400 hover:text-white'}`}
        >
          {t.nearby} ({nearbyStations.length})
        </button>
        <button 
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 p-3 text-center transition-colors ${activeTab === 'favorites' ? 'text-green-400 border-b-2 border-green-400 bg-white/5' : 'text-gray-400 hover:text-white'}`}
        >
          {t.favorites}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 p-3 text-center transition-colors ${activeTab === 'history' ? 'text-green-400 border-b-2 border-green-400 bg-white/5' : 'text-gray-400 hover:text-white'}`}
        >
          {t.history}
        </button>
      </div>

      {/* Search */}
      <div className="p-4 pb-2">
        <div className="relative">
          <input 
            type="text" 
            placeholder={t.searchPlaceholder} 
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-green-500/50"
          />
          <Search size={14} className="absolute left-3 top-3 text-gray-500" />
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* AI Guide Section (Only shows when a station is active) */}
        {currentStation && (
          <div className="mb-6 bg-gradient-to-br from-green-900/20 to-black border border-green-500/20 rounded-xl p-4 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-50 transition-opacity">
                <Sparkles className="text-green-400" size={40} />
             </div>
             
             <h3 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-2 flex items-center">
               <Sparkles size={12} className="mr-1" /> {t.aiIntelligence}
             </h3>

             {isAiLoading ? (
               <div className="flex items-center text-gray-400 text-sm py-2">
                 <Loader2 size={16} className="animate-spin mr-2" />
                 {t.analyzing}
               </div>
             ) : aiGuide ? (
               <div className="space-y-3">
                 <p className="text-sm text-gray-200 leading-relaxed font-light">
                   "{aiGuide.summary}"
                 </p>
                 
                 <div className="flex flex-wrap gap-2">
                   <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">
                     {t.mood}: <span className="text-white">{aiGuide.mood}</span>
                   </span>
                   {aiGuide.topics.map(t => (
                     <span key={t} className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-400">
                       #{t}
                     </span>
                   ))}
                 </div>

                 <div className="pt-2 border-t border-white/5">
                    <p className="text-xs text-gray-400 italic">
                      <MapPin size={10} className="inline mr-1"/>
                      {aiGuide.locationInfo}
                    </p>
                 </div>
               </div>
             ) : (
               <div className="text-xs text-gray-500 italic">
                 {t.uplinkUnavailable}
               </div>
             )}
          </div>
        )}

        {activeTab === 'nearby' && (
          <>
            <div className="mb-4 text-xs text-gray-500 uppercase tracking-widest font-bold">
              {t.detectedLocation}
            </div>
            {nearbyStations.length > 0 && nearbyStations[0].geo_lat && (
               <div className="mb-6 p-4 rounded bg-white/5 border border-white/10">
                 <div className="text-2xl text-white font-light">{getLocalTime(nearbyStations[0].geo_long || 0)}</div>
                 <div className="text-sm text-gray-400 mt-1">{nearbyStations[0].state}, {nearbyStations[0].country}</div>
                 <div className="text-xs text-gray-600 mt-2 font-mono">
                   LAT: {nearbyStations[0].geo_lat?.toFixed(2)} | LNG: {nearbyStations[0].geo_long?.toFixed(2)}
                 </div>
               </div>
            )}
            {renderStationList(nearbyStations)}
          </>
        )}

        {activeTab === 'favorites' && renderStationList(favorites)}
        {activeTab === 'history' && renderStationList(history)}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
