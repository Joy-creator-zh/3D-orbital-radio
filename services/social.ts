import { Station } from '../types';

export interface Listener {
  id: string;
  lat: number;
  lng: number;
  listeningTo?: string; // station uuid
}

export interface MessageCapsule {
  id: string;
  lat: number;
  lng: number;
  message: string;
  timestamp: number;
  author?: string;
}

// Mock Service to simulate socket/real-time behavior
class SocialService {
  private listeners: Listener[] = [];
  private capsules: MessageCapsule[] = [];
  private listenersSubscribers: ((listeners: Listener[]) => void)[] = [];
  private capsulesSubscribers: ((capsules: MessageCapsule[]) => void)[] = [];

  constructor() {
    // Load persisted capsules
    const saved = localStorage.getItem('orbital_capsules');
    if (saved) {
      this.capsules = JSON.parse(saved);
    } else {
      // Add some fake initial capsules
      this.capsules = [
        { id: '1', lat: 48.8566, lng: 2.3522, message: '2025年在这里听这首歌很感动', timestamp: Date.now(), author: 'Traveler' },
        { id: '2', lat: 35.6762, lng: 139.6503, message: 'Midnight Tokyo vibes forever.', timestamp: Date.now(), author: 'CyberPunk' },
        { id: '3', lat: 40.7128, lng: -74.0060, message: 'Hello from NYC!', timestamp: Date.now(), author: 'User123' },
      ];
    }

    // Start simulation loop for listeners
    setInterval(() => {
      this.updateMockListeners();
    }, 3000);
    
    this.updateMockListeners(); // Initial call
  }

  private updateMockListeners() {
    // Generate random listeners around the world
    // In a real app, this would come from a WebSocket
    const count = 15 + Math.floor(Math.random() * 10);
    const newListeners: Listener[] = [];
    
    for(let i=0; i<count; i++) {
      newListeners.push({
        id: `l-${i}`,
        lat: (Math.random() * 160) - 80,
        lng: (Math.random() * 360) - 180,
        listeningTo: Math.random() > 0.5 ? 'some-station-uuid' : undefined
      });
    }
    
    this.listeners = newListeners;
    this.notifyListeners();
  }

  public subscribeListeners(callback: (listeners: Listener[]) => void) {
    this.listenersSubscribers.push(callback);
    callback(this.listeners);
    return () => {
      this.listenersSubscribers = this.listenersSubscribers.filter(cb => cb !== callback);
    };
  }

  public subscribeCapsules(callback: (capsules: MessageCapsule[]) => void) {
    this.capsulesSubscribers.push(callback);
    callback(this.capsules);
    return () => {
      this.capsulesSubscribers = this.capsulesSubscribers.filter(cb => cb !== callback);
    };
  }

  public addCapsule(lat: number, lng: number, message: string, author: string = 'Anonymous') {
    const newCapsule: MessageCapsule = {
      id: Date.now().toString(),
      lat,
      lng,
      message,
      timestamp: Date.now(),
      author
    };
    
    this.capsules.push(newCapsule);
    localStorage.setItem('orbital_capsules', JSON.stringify(this.capsules));
    this.notifyCapsules();
  }

  private notifyListeners() {
    this.listenersSubscribers.forEach(cb => cb(this.listeners));
  }

  private notifyCapsules() {
    this.capsulesSubscribers.forEach(cb => cb(this.capsules));
  }
}

export const socialService = new SocialService();

