'use client';
import { useState } from 'react';
import { placesApi } from '@/lib/api/places';

export type PickedPlace = {
  name: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  source?: string;
  id?: string;
};

export default function PlacePicker({
  city,
  placeholder = '搜索地点（高德）',
  onPick,
}: {
  city?: string;
  placeholder?: string;
  onPick: (p: PickedPlace) => void;
}) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PickedPlace[]>([]);
  const [error, setError] = useState('');

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data: any = await placesApi.search({ q, city, limit: 8 });
      const live = (data.live || []).map((p: any) => ({
        id: p.id,
        name: p.canonicalName,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        source: 'amap',
      }));
      const local = (data.local || []).map((p: any) => ({
        id: p.id,
        name: p.canonicalName,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        source: 'local',
      }));
      setResults([...live, ...local].slice(0, 12));
    } catch (e: any) {
      setError(e.message || '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="input-group input-group-sm mb-2">
        <input
          className="form-control"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())}
          placeholder={placeholder}
        />
        <button type="button" className="btn btn-outline-primary" onClick={search} disabled={loading}>
          {loading ? '...' : '搜索'}
        </button>
      </div>
      {error && <div className="text-danger small">{error}</div>}
      {results.length > 0 && (
        <div className="list-group list-group-flush small border rounded mb-2" style={{ maxHeight: 180, overflow: 'auto' }}>
          {results.map((r, i) => (
            <button
              type="button"
              key={`${r.id}-${i}`}
              className="list-group-item list-group-item-action py-2"
              onClick={() => {
                onPick(r);
                setResults([]);
                setQ(r.name);
              }}
            >
              <strong>{r.name}</strong>
              <span className="badge bg-light text-dark ms-1">{r.source}</span>
              {r.address && <div className="text-muted">{r.address}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
