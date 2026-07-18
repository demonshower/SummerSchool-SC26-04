'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export default function WeatherCard({ city }: { city: string }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['weather', city],
    queryFn: () => apiClient.get(`/providers/weather?city=${encodeURIComponent(city)}`),
    enabled: !!city,
    staleTime: 5 * 60_000,
  });

  if (!city) return null;

  return (
    <div className="card shadow-sm mb-3">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h6 className="mb-0"><i className="bi bi-cloud-sun me-2"></i>天气 · {city}</h6>
        <button className="btn btn-link btn-sm p-0" onClick={() => refetch()} disabled={isFetching}>刷新</button>
      </div>
      <div className="card-body">
        {isLoading && <div className="text-muted small">加载中...</div>}
        {error && <div className="text-danger small">天气暂不可用</div>}
        {data && (
          <>
            <div className="mb-2">
              <span className="fs-5">{(data as any).weather}</span>
              <span className="ms-2">{(data as any).temperature}℃</span>
              {(data as any).wind && <span className="text-muted small ms-2">{(data as any).wind}</span>}
            </div>
            {(data as any).forecast?.length > 0 && (
              <div className="row g-1 small">
                {(data as any).forecast.slice(0, 4).map((f: any) => (
                  <div className="col-6" key={f.date}>
                    <div className="border rounded p-1">
                      <div className="text-muted">{f.date?.slice(5)}</div>
                      <div>{f.dayWeather} {f.dayTemp}℃</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {!isLoading && !data && !error && <div className="text-muted small">暂无数据</div>}
      </div>
    </div>
  );
}
