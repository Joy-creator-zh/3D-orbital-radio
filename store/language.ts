import { create } from 'zustand';

type Language = 'en' | 'zh';

interface Translation {
  title: string;
  subtitle: string;
  initializing: string;
  stationsActive: string;
  dragToRotate: string;
  clickToTune: string;
  nearby: string;
  favorites: string;
  history: string;
  searchPlaceholder: string;
  detectedLocation: string;
  noStationsFound: string;
  aiIntelligence: string;
  analyzing: string;
  uplinkUnavailable: string;
  mood: string;
  tuningIn: string;
}

const translations: Record<Language, Translation> = {
  en: {
    title: 'ORBITAL',
    subtitle: 'GLOBAL RADIO TUNER',
    initializing: 'INITIALIZING UPLINK...',
    stationsActive: 'STATIONS ACTIVE',
    dragToRotate: 'DRAG TO ROTATE',
    clickToTune: 'CLICK GREEN DOTS TO TUNE IN',
    nearby: 'Nearby',
    favorites: 'Favorites',
    history: 'History',
    searchPlaceholder: 'Filter list...',
    detectedLocation: 'DETECTED LOCATION',
    noStationsFound: 'No stations found.',
    aiIntelligence: 'AI Intelligence',
    analyzing: 'Analyzing signal...',
    uplinkUnavailable: 'Uplink to AI unavailable.',
    mood: 'Mood',
    tuningIn: 'Tuning in...'
  },
  zh: {
    title: 'ORBITAL',
    subtitle: '全球广播调谐器',
    initializing: '正在建立连接...',
    stationsActive: '个活跃电台',
    dragToRotate: '拖动旋转地球',
    clickToTune: '点击绿点收听',
    nearby: '附近',
    favorites: '收藏',
    history: '历史',
    searchPlaceholder: '搜索电台...',
    detectedLocation: '当前定位',
    noStationsFound: '未找到电台',
    aiIntelligence: 'AI 智能分析',
    analyzing: '正在分析信号...',
    uplinkUnavailable: 'AI 连接不可用',
    mood: '氛围',
    tuningIn: '正在调频...'
  }
};

interface LanguageState {
  language: Language;
  t: Translation;
  setLanguage: (lang: Language) => void;
}

export const useLanguage = create<LanguageState>((set) => ({
  language: 'en', // Default to English
  t: translations.en,
  setLanguage: (lang) => set({ language: lang, t: translations[lang] }),
}));

