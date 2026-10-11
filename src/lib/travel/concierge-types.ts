export type TripIntent = 'route-concierge' | 'travel-assistant' | 'out-of-scope';
export type TravelSource = { index?: number; title: string; url: string; site?: string };
export type TripMessage = {
  role: 'user' | 'assistant';
  text: string;
  intent?: TripIntent;
  agent?: 'route-concierge' | 'travel-assistant';
  sources?: TravelSource[];
};

export type DraftStop = {
  googlePlaceId?: string;
  name: string;
  search: string;
  nameChinese?: string;
  nameEnglish?: string;
  pinyin?: string;
  category?: 'sight' | 'culture' | 'nature' | 'food' | 'shopping' | 'neighborhood' | 'other';
  bestTime?: string;
  admission?: { text: string; sourceUrl: string };
  at?: string;
  durationMinutes: number;
  booked?: boolean;
  bookingNote?: string;
  why?: string;
  description?: string;
  visitTip?: string;
};

export type DraftDay = {
  kind?: 'visit' | 'transfer' | 'rest';
  hotelGooglePlaceId?: string;
  city: string;
  cityEnglish?: string;
  date?: string;
  title: string;
  hotel?: string;
  note?: string;
  intercityMode?: 'rail' | 'flight' | 'road' | 'transit';
  intercityNote?: string;
  stops: DraftStop[];
};

export type DraftTrip = {
  title: string;
  summary: string;
  startDate?: string;
  travelStyle?: string;
  days: DraftDay[];
  questions?: string[];
};

export type MapPoint = { lng: number; lat: number; system?: 'WGS84' | 'GCJ-02' };
export type PlacePhoto = { url: string; placeId?: string; screening?: 'visual-match'; title?: string; authors?: { name: string; uri?: string }[]; subject?: { name: string; nameEnglish: string; sourceUrl?: string } };

export type VerifiedStop = DraftStop & {
  id: string;
  scheduledAt?: string;
  place?: {
    id: string;
    name: string;
    address: string;
    point: MapPoint;
    adcode: string;
    citycode: string;
    provider?: 'Google' | 'Amap';
    sourceUrl?: string;
    region?: { city: string; district?: string };
    category?: string;
    openingHours?: string;
    photo?: PlacePhoto;
    checkedAt: string;
  };
  placeStatus: 'matched' | 'unresolved';
};

export type VerifiedLeg = {
  provider?: 'Google' | 'Amap';
  from: string;
  to: string;
  mode: 'walk' | 'transit' | 'taxi' | 'intercity' | 'unverified';
  minutes?: number;
  metres?: number;
  walkingMetres?: number;
  geometry?: { kind: 'route' | 'connection'; points: MapPoint[] }[];
  alternatives?: { mode: 'intercity' | 'taxi'; minutes: number; metres?: number; provider?: 'Google' | 'Amap' }[];
  checkedAt?: string;
  note?: string;
};

export type DayWeather = {
  status: 'forecast' | 'outside-range' | 'date-needed' | 'unavailable';
  day?: string;
  night?: string;
  high?: string;
  low?: string;
  reportedAt?: string;
};

export type VerifiedDay = Omit<DraftDay, 'stops'> & {
  id: string;
  stops: VerifiedStop[];
  legs: VerifiedLeg[];
  transfer?: { fromName: string; toName: string; leg: VerifiedLeg; assumedDepartAt: string };
  weather: DayWeather;
  checks: string[];
  hotelPlace?: VerifiedStop['place'];
  meals?: { kind: 'lunch' | 'dinner'; start: string; end: string; nearStopId: string; status: 'planning'; foodStopId?: string }[];
  dining?: {
    kind: 'lunch' | 'dinner'; nearStopId: string; status: 'map-listed' | 'unavailable';
    options: {
      id: string; name: string; address: string; type: string; cuisine: string;
      point: MapPoint; adcode: string; metres: number; sourceUrl: string; checkedAt: string;
      hoursStatus: 'unverified';
    }[];
  }[];
};

export type VerifiedTrip = Omit<DraftTrip, 'days'> & {
  days: VerifiedDay[];
  checks: string[];
  createdAt: string;
  provider: 'Amap' | 'Google + Amap';
  research?: {
    checkedAt: string;
    summary: string;
    sources: { index: number; title: string; url: string; site?: string }[];
    citationWarnings?: string[];
  };
};

export type ConciergeEvent =
  | { type: 'intent'; intent: TripIntent }
  | { type: 'phase'; phase: 'understanding' | 'research' | 'drafting' | 'places' | 'routes' | 'weather' | 'review' }
  | { type: 'result'; plan: VerifiedTrip; reply: string }
  | { type: 'answer'; reply: string; sources?: TravelSource[] }
  | { type: 'error'; message: string };
