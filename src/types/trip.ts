export interface Trip {
  id: string;
  ownerId: string;
  title: string;
  originCity: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  earliestDeparture: string;
  latestReturn: string;
  budgetMinor: number;
  transportPreference: string;
  hotelMaxPriceMinor: number;
  wantsSightseeing: boolean;
  attractionPreference: string;
  pace: string;
  status: 'draft' | 'planning' | 'ready' | 'confirmed' | 'archived';
  version: number;
  timezone: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  meetings: Meeting[];
  days: TripDay[];
  quoteSearches?: any[];
  planVersions?: PlanVersion[];
  costSummary?: CostSummary;
}

export interface Meeting {
  id: string;
  tripId: string;
  title: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripDay {
  id: string;
  tripId: string;
  localDate: string;
  dayType: 'departure' | 'meeting_day' | 'return' | 'free';
  budgetMinor: number;
  totalCostMinor: number;
  startPlaceId: string | null;
  endPlaceId: string | null;
  weatherSummary: string | null;
  items: ItineraryItem[];
}

export interface ItineraryItem {
  id: string;
  tripDayId: string;
  kind: 'transport' | 'commute' | 'hotel' | 'meal' | 'attraction' | 'meeting' | 'fixed' | 'free_time';
  title: string;
  subtitle: string | null;
  position: number;
  startAt: string | null;
  endAt: string | null;
  placeId: string | null;
  locationText: string | null;
  costMinor: number;
  locked: boolean;
  isFixed: boolean;
  note: string | null;
  icon: string | null;
  status: string;
  sourceType: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  place: any | null;
  transportSegment: TransportSegment | null;
}

export interface TransportSegment {
  itemId: string;
  mode: string;
  fromPlaceId: string | null;
  toPlaceId: string | null;
  fromStation: string | null;
  toStation: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  costMinor: number;
  carrierName: string | null;
  carrierCode: string | null;
  providerCode: string | null;
  routeObservedAt: string | null;
}

export interface CostSummary {
  transportMinor: number;
  hotelMinor: number;
  mealMinor: number;
  commuteMinor: number;
  attractionMinor: number;
  totalMinor: number;
  budgetMinor: number;
  remainingMinor: number;
  status: 'within_budget' | 'close_to_budget' | 'slightly_over' | 'over_budget';
}

export interface PlanVersion {
  id: string;
  tripId: string;
  version: number;
  strategy: string;
  status: string;
  summary: string | null;
  evidence: any;
  createdAt: string;
}

export interface CreateTripDto {
  originCity: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  earliestDeparture: string;
  latestReturn: string;
  budgetMinor: number;
  transportPreference?: string;
  hotelMaxPriceMinor: number;
  wantsSightseeing?: boolean;
  attractionPreference?: string;
  pace?: string;
  title?: string;
  meetings?: CreateMeetingDto[];
}

export interface CreateMeetingDto {
  title: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface UpdateTripDto {
  title?: string;
  budgetMinor?: number;
  transportPreference?: string;
  hotelMaxPriceMinor?: number;
  wantsSightseeing?: boolean;
  attractionPreference?: string;
  pace?: string;
  version?: number;
}

export interface TripQueryDto {
  status?: string;
  page?: number;
  pageSize?: number;
}
