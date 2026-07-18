'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { researchApi } from '@/lib/api/research';

export default function ResearchPanel({ tripId }: { tripId: string }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const sourcesQuery = useQuery({
    queryKey: ['research-sources', tripId],
    queryFn: () => researchApi.listSources(tripId),
  });
  const insightsQuery = useQuery({
    queryKey: ['research-insights', tripId],
    queryFn: () => researchApi.getInsights(tripId),
  });

  const researchMutation = useMutation({
    mutationFn: () =>
      researchApi.researchTrip(tripId, {
        maxQueries: 3,
        countPerQuery: 4,
        extractInsights: true,
        persist: true,
      }),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['research-sources', tripId] });
      qc.invalidateQueries({ queryKey: ['research-insights', tripId] });
    },
    onError: (e: any) => setError(e.message || '研究失败'),
  });

  const insights: any = insightsQuery.data || {};
  const places = insights.uniquePlaces || [];
  const sources: any[] = Array.isArray(sourcesQuery.data)
    ? sourcesQuery.data
    : ((sourcesQuery.data as any)?.data as any[]) || [];
  const result: any = researchMutation.data;

  return (
    <div className="card shadow-sm mb-4 border-success">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0"><i className="bi bi-search me-2"></i>攻略研究（博查 + AI）</h5>
        <button
          className="btn btn-success btn-sm"
          disabled={researchMutation.isPending}
          onClick={() => researchMutation.mutate()}
        >
          {researchMutation.isPending ? (
            <><span className="spinner-border spinner-border-sm me-1" />研究中...</>
          ) : (
            <><i className="bi bi-lightning me-1"></i>一键研究</>
          )}
        </button>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        {researchMutation.isPending && (
          <div className="alert alert-info py-2 small">正在并行搜索公开攻略并抽取地点，请稍候…</div>
        )}
        {result && (
          <div className="mb-3 small text-muted">
            最近一次：{result.totalSources || 0} 条来源 · 查询组 {(result.queries || []).length}
            {result.queries && <div className="mt-1">{result.queries.map((q: string, i: number) => <span key={i} className="badge bg-light text-dark me-1">{q}</span>)}</div>}
          </div>
        )}

        <h6 className="mb-2">地点洞察 ({places.length})</h6>
        {places.length === 0 ? (
          <p className="text-muted small">暂无洞察，请点击「一键研究」</p>
        ) : (
          <div className="row g-2 mb-3">
            {places.map((p: any) => (
              <div className="col-md-4" key={p.id || p.mentionText}>
                <div className="border rounded p-2 h-100">
                  <strong className="small">{p.mentionText || p.mention}</strong>
                  {p.confidence != null && (
                    <span className="badge bg-secondary ms-1">{Math.round((p.confidence || 0) * 100)}%</span>
                  )}
                  {p.place?.canonicalName && (
                    <div className="text-success small mt-1"><i className="bi bi-geo-alt"></i> {p.place.canonicalName}</div>
                  )}
                  {p.suggestedPeriod && <div className="text-muted small">建议时段：{p.suggestedPeriod}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <h6 className="mb-2">来源 ({sources.length})</h6>
        <ul className="list-group list-group-flush small">
          {sources.slice(0, 10).map((s: any) => (
            <li key={s.id} className="list-group-item px-0 d-flex justify-content-between">
              <span>
                <span className="badge bg-outline-secondary me-1">{s.sourceType}</span>
                {s.title}
              </span>
              <span className="text-muted">{s._count?.mentions ?? 0} 地点</span>
            </li>
          ))}
          {sources.length === 0 && <li className="list-group-item px-0 text-muted">暂无保存的研究来源</li>}
        </ul>
      </div>
    </div>
  );
}
