import React, { useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Loader2, Radio } from 'lucide-react';
import Hls from 'hls.js';
import { Station, PlayerState } from '../types';
import { useLanguage } from '../store/language';

interface PlayerProps {
  playerState: PlayerState;
  onTogglePlay: () => void;
  onVolumeChange: (vol: number) => void;
  onError: () => void;
  onLoadStart: () => void;
  onLoadedData: () => void;
}

const Player: React.FC<PlayerProps> = ({ 
  playerState, 
  onTogglePlay, 
  onVolumeChange,
  onError,
  onLoadStart,
  onLoadedData
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { station, isPlaying, volume, isLoading } = playerState;
  const { t } = useLanguage();

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Cleanup HLS on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!station || !audioRef.current) return;

    const url = station.url_resolved || station.url;

    // Destroy previous HLS instance if it exists
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Handle HLS streams
    if (Hls.isSupported() && (url.includes('.m3u8') || station.codec === 'hls')) {
      const hls = new Hls();
      hlsRef.current = hls;
      
      hls.loadSource(url);
      hls.attachMedia(audioRef.current);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isPlaying) {
          const playPromise = audioRef.current?.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.warn("HLS Playback prevented:", error);
              onError();
            });
          }
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              onError();
              hls.destroy();
              break;
          }
        }
      });
    } else {
      // Standard Playback (MP3/AAC or Native HLS on Safari)
      audioRef.current.src = url;
    audioRef.current.load();
    
    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("Playback prevented or failed:", error);
          // If autoplay is blocked, we simply call onError to reset the UI state to "Paused"
          // This allows the user to click the play button manually.
          onError();
        });
        }
      }
    }
  }, [station]);

  useEffect(() => {
    if (!audioRef.current || !station) return;
    
    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
           // Don't repeatedly trigger error here, handled in station change
           console.log("Play interrupted or blocked");
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  if (!station) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 flex justify-center pointer-events-none">
      <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-4 w-full max-w-2xl flex items-center justify-between pointer-events-auto">
        
        {/* Audio Element 
            - No crossOrigin (fixes CORS issues)
            - playsInline (fixes mobile issues)
        */}
        <audio 
          ref={audioRef}
          playsInline
          onLoadStart={onLoadStart}
          onLoadedData={onLoadedData}
          onError={(e) => {
            console.error("Audio tag error:", e.currentTarget.error);
            onError();
          }}
        />

        <div className="flex items-center space-x-4 flex-1 overflow-hidden">
          {/* Cover / Icon */}
          <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center shrink-0 border border-white/5 relative overflow-hidden">
             {station.favicon ? (
               <img src={station.favicon} alt="logo" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
             ) : (
               <Radio className="text-gray-400" />
             )}
             {/* Visualizer bars simulation */}
             {isPlaying && !isLoading && (
               <div className="absolute bottom-0 left-0 right-0 h-1 flex items-end justify-center space-x-[2px] opacity-70">
                 <div className="w-1 bg-green-400 animate-pulse h-2"></div>
                 <div className="w-1 bg-green-400 animate-pulse h-4" style={{animationDelay: '0.1s'}}></div>
                 <div className="w-1 bg-green-400 animate-pulse h-3" style={{animationDelay: '0.2s'}}></div>
               </div>
             )}
          </div>

          {/* Info */}
          <div className="flex flex-col overflow-hidden">
            <h3 className="text-white font-medium truncate text-lg leading-tight">
              {station.name}
            </h3>
            <div className="text-xs text-gray-400 truncate flex items-center">
               <span className="uppercase tracking-wider">{station.country}</span>
               {isLoading && <span className="ml-2 text-green-400 flex items-center"><Loader2 size={10} className="animate-spin mr-1"/> {t.tuningIn}</span>}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-6 pl-4">
          <div className="flex items-center space-x-2 group">
             <Volume2 size={16} className="text-gray-400 group-hover:text-white" />
             <input 
               type="range" 
               min="0" 
               max="1" 
               step="0.01" 
               value={volume} 
               onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
               className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
             />
          </div>

          <button 
            onClick={onTogglePlay}
            className="w-12 h-12 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center text-black transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-green-500/20"
          >
            {isLoading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-1" />
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Player;