import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { analyzeMoodRequest, MoodAnalysisResult } from '../services/ai';
import { Station } from '../types';
import { useLanguage } from '../store/language';

interface AICmdBarProps {
  stations: Station[];
  onStationSelect: (station: Station) => void;
}

const AICmdBar: React.FC<AICmdBarProps> = ({ stations, onStationSelect }) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const { t, language } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    setIsThinking(true);
    
    // Analyze mood
    const result = await analyzeMoodRequest(input, language);
    
    if (result) {
      // Find best matching station locally
      // We score stations based on tags/country match
      const scored = stations.map(s => {
        let score = 0;
        const sTags = (s.tags || '').toLowerCase();
        const sCountry = (s.country || '').toLowerCase();
        
        // Check tags match
        result.keywords.forEach(k => {
          if (sTags.includes(k.toLowerCase())) score += 2;
        });
        
        // Check country match if specified
        if (result.location && sCountry.includes(result.location.toLowerCase())) {
          score += 3;
        }

        // Boost reliability/clickcount
        if (s.clickcount > 100) score += 0.5;

        return { station: s, score };
      });

      // Sort by score
      scored.sort((a, b) => b.score - a.score);

      if (scored.length > 0 && scored[0].score > 0) {
        const best = scored[0].station;
        console.log("AI Found Station:", best.name, "Score:", scored[0].score);
        onStationSelect(best);
        setInput(''); // Clear input on success
      } else {
        console.log("No matching station found for mood");
        // Optional: Show error feedback
      }
    }
    
    setIsThinking(false);
  };

  return (
    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-full max-w-lg px-4 z-40">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex items-center bg-black/80 backdrop-blur-xl border border-white/10 rounded-full p-1 pl-4 shadow-2xl">
          <Sparkles className={`text-green-400 mr-2 ${isThinking ? 'animate-pulse' : ''}`} size={18} />
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={language === 'zh' ? "输入心情... (例如: 雨天编程, 东京夜晚)" : "Type a mood... (e.g. rainy coding, tokyo night)"}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 text-sm h-10"
            disabled={isThinking}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isThinking}
            className="bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isThinking ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AICmdBar;

