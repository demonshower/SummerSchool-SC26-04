export interface Place {
  id: string;
  canonicalName: string;
  category: 'attraction' | 'restaurant' | 'hotel' | 'station' | 'shopping';
  cityCode: string;
  cityName: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string;
  attributes: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface City {
  id: string;
  code: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  timezone: string;
  isActive: boolean;
}
