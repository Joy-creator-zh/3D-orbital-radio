import React, { useEffect, useRef, useState } from 'react';
import { Activity, Wifi, Zap, Radio, Move } from 'lucide-react';
import { useLanguage } from '../store/language';
import { Station } from '../types';

interface ProDashboardProps {
  station: Station | null;
  isPlaying: boolean;
  volume: number;
}

// Audio Context for Noise Generation
let audioCtx: AudioContext | null = null;
let noiseNode: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;

const ProDashboard: React.FC<ProDashboardProps> = ({ station, isPlaying, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snr, setSnr] = useState(0);
  const [frequency, setFrequency] = useState(88.0);
  const animationRef = useRef<number>();
  
  // Dragging State
  const [position, setPosition] = useState({ x: window.innerWidth - 280, y: 100 }); // Default initial position
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Initialize position on mount based on screen size
  useEffect(() => {
    if (window.innerWidth >= 768) {
       setPosition({ x: window.innerWidth - 450, y: 100 }); // Default next to sidebar on desktop
    }
  }, []);

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (dashboardRef.current) {
      setIsDragging(true);
      const rect = dashboardRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);
  
  // ... (Audio logic remains same) ...

  useEffect(() => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.connect(audioCtx.destination);
      gainNode.gain.value = 0; // Start silent
    }
  }, []);

  // Simulate Tuning Noise when no station is playing or loading
  useEffect(() => {
    if (!audioCtx || !gainNode) return;

    if (!isPlaying || !station) {
      // Play static noise
      if (!noiseNode) {
        const bufferSize = audioCtx.sampleRate * 2; // 2 seconds buffer
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buffer;
        noiseNode.loop = true;
        
        // Bandpass filter to make it sound like radio static
        const bandpass = audioCtx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 1000;
        
        noiseNode.connect(bandpass);
        bandpass.connect(gainNode);
        noiseNode.start();
      }
      
      // Fade in noise
      gainNode.gain.setTargetAtTime(0.05 * volume, audioCtx.currentTime, 0.1);
    } else {
      // Fade out noise
      gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
    }
  }, [isPlaying, station, volume]);

  // Waterfall / Spectrum Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Simulate waterfall data
      const w = canvas.width;
      const h = canvas.height;
      
      // Shift image up
      const imageData = ctx.getImageData(0, 0, w, h - 1);
      ctx.putImageData(imageData, 0, 1);
      
      // Draw new line at top
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, 1);
      
      for(let i = 0; i < w; i+=2) {
        const signalStrength = Math.random();
        // Green/Yellow phosphorescent look
        const g = Math.floor(signalStrength * 255);
        ctx.fillStyle = `rgba(0, ${g}, 0, ${signalStrength})`;
        ctx.fillRect(i, 0, 2, 1);
      }
      
      // Random SNR fluctuation
      if (Math.random() > 0.9) {
        setSnr(Math.floor(Math.random() * 30) + 10);
        setFrequency(prev => prev + (Math.random() - 0.5) * 0.1);
      }

      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    return () => {
        if(animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div 
      ref={dashboardRef}
      style={{ left: position.x, top: position.y }}
      className="fixed w-64 bg-black/90 border-2 border-green-900/50 rounded-lg p-2 font-mono text-green-500 shadow-[0_0_20px_rgba(0,255,0,0.1)] z-50 transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(0,255,0,0.2)] cursor-move"
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b border-green-900/50 pb-1 mb-2 select-none">
        <span className="text-xs font-bold flex items-center">
          <Move size={12} className="mr-1 opacity-50" />
          <Radio size={12} className="mr-1" /> SHORTWAVE RCVR
        </span>
        <span className="text-[10px] text-green-700">MODEL-X1</span>
      </div>

      {/* Waterfall Plot */}
      <div className="relative h-24 bg-green-900/10 border border-green-900/30 mb-2 overflow-hidden">
         <canvas ref={canvasRef} width={240} height={96} className="w-full h-full opacity-80" />
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[1px] h-full bg-red-500/50"></div>
         </div>
      </div>

      {/* Meters */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-green-900/10 p-1 border border-green-900/30">
           <div className="text-[10px] text-green-600 mb-1 flex items-center">
             <Wifi size={10} className="mr-1" /> SIGNAL (SNR)
           </div>
           <div className="text-lg font-bold">{isPlaying ? snr : '---'} dB</div>
           <div className="w-full h-1 bg-green-900/30 mt-1">
             <div className="h-full bg-green-500 transition-all duration-300" style={{width: `${(snr/50)*100}%`}}></div>
           </div>
        </div>

        <div className="bg-green-900/10 p-1 border border-green-900/30">
           <div className="text-[10px] text-green-600 mb-1 flex items-center">
             <Zap size={10} className="mr-1" /> FREQ (kHz)
           </div>
           <div className="text-lg font-bold">{station ? (frequency + 100).toFixed(2) : 'SEARCH'}</div>
           <div className="w-full h-1 bg-green-900/30 mt-1">
              <div className="h-full bg-red-500 w-1 absolute left-1/2 transform -translate-x-1/2 animate-pulse"></div>
           </div>
        </div>
      </div>

      {/* Technical Data */}
      <div className="mt-2 text-[10px] text-green-700 space-y-1">
         <div className="flex justify-between">
           <span>CODEC:</span>
           <span className="text-green-500">{station?.codec || 'N/A'}</span>
         </div>
         <div className="flex justify-between">
           <span>BITRATE:</span>
           <span className="text-green-500">{station?.bitrate || 0} kbps</span>
         </div>
         <div className="flex justify-between">
           <span>UUID:</span>
           <span className="truncate w-20 text-green-500">{station?.stationuuid || '---'}</span>
         </div>
      </div>
    </div>
  );
};

export default ProDashboard;

