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

export type MapPoint = { lng: number; lat: number };

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
    category?: string;
    openingHours?: string;
    photo?: { url: string; title?: string };
    checkedAt: string;
  };
  placeStatus: 'matched' | 'unresolved';
};

export type VerifiedLeg = {
  from: string;
  to: string;
  mode: 'walk' | 'transit' | 'taxi' | 'intercity' | 'unverified';
  minutes?: number;
  metres?: number;
  walkingMetres?: number;
  geometry?: { kind: 'route' | 'connection'; points: MapPoint[] }[];
  alternatives?: { mode: 'intercity' | 'taxi'; minutes: number; metres?: number }[];
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
};

export type VerifiedTrip = Omit<DraftTrip, 'days'> & {
  days: VerifiedDay[];
  checks: string[];
  createdAt: string;
  provider: 'Amap';
  research?: {
    checkedAt: string;
    summary: string;
    sources: { index: number; title: string; url: string; site?: string }[];
  };
};

export type ConciergeEvent =
  | { type: 'intent'; intent: TripIntent }
  | { type: 'phase'; phase: 'understanding' | 'research' | 'drafting' | 'places' | 'routes' | 'weather' | 'review' }
  | { type: 'result'; plan: VerifiedTrip; reply: string }
  | { type: 'answer'; reply: string; sources?: TravelSource[] }
  | { type: 'error'; message: string };
