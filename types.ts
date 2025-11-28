export interface Station {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  state: string;
  language: string;
  votes: number;
  codec: string;
  bitrate: number;
  hls: number;
  lastcheckok: number;
  clickcount: number;
  geo_lat: number | null;
  geo_long: number | null;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PlayerState {
  isPlaying: boolean;
  station: Station | null;
  volume: number;
  isLoading: boolean;
}
