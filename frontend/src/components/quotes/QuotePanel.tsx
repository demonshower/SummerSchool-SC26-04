'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quotesApi } from '@/lib/api/quotes';
import { formatMoney } from '@/lib/utils/money';

const productTypes = [
  { value: 'train', label: '火车/高铁', icon: 'bi-train-front' },
  { value: 'flight', label: '飞机', icon: 'bi-airplane' },
  { value: 'hotel', label: '酒店', icon: 'bi-building' },
  { value: 'ticket', label: '门票', icon: 'bi-ticket-perforated' },
];

const statusLabels: Record<string, { label: string; cls: string }> = {
  available: { label: '可预订', cls: 'success' },
  limited: { label: '库存紧张', cls: 'warning' },
  sold_out: { label: '已售罄', cls: 'danger' },
  unknown: { label: '未知', cls: 'secondary' },
};

export default function QuotePanel({ tripId }: { tripId: string }) {
  const [productType, setProductType] = useState<string>('train');
  const [showQuotes, setShowQuotes] = useState(false);
  const queryClient = useQueryClient();

  const { data: quotes, isLoading, error } = useQuery({
    queryKey: ['quotes', tripId, productType],
    queryFn: () => quotesApi.getTripQuotes(tripId, productType),
    enabled: showQuotes,
  });

  const searchMutation = useMutation({
    mutationFn: () => quotesApi.search(tripId, { productType: productType as any, criteria: {} }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotes', tripId, productType] }); setShowQuotes(true); },
  });

  const refreshMutation = useMutation({
    mutationFn: (quoteId: string) => quotesApi.refreshQuote(quoteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes', tripId, productType] }),
  });

  const clickoutMutation = useMutation({
    mutationFn: (quoteId: string) => quotesApi.generateClickout(quoteId),
    onSuccess: (data: any) => { if (data?.deepLink) window.open(data.deepLink, '_blank'); },
  });

  // Group by comparableKey
  const grouped = quotes ? Object.values(quotes.reduce((acc: any, q: any) => {
    const key = q.comparableKey || q.id;
    if (!acc[key]) acc[key] = { key, product: q.productName, quotes: [] };
    acc[key].quotes.push(q);
    return acc;
  }, {})) : [];

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0"><i className="bi bi-tags me-2"></i>报价比价</h5>
      </div>
      <div className="card-body">
        {/* Product type selector */}
        <div className="d-flex gap-2 mb-3 flex-wrap">
          {productTypes.map(pt => (
            <button key={pt.value} className={`btn btn-sm ${productType === pt.value ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => { setProductType(pt.value); setShowQuotes(false); }}>
              <i className={`bi ${pt.icon} me-1`}></i>{pt.label}
            </button>
          ))}
          <button className="btn btn-sm btn-success ms-auto" onClick={() => searchMutation.mutate()} disabled={searchMutation.isPending}>
            {searchMutation.isPending ? <><span className="spinner-border spinner-border-sm me-1"></span>搜索中</> : <><i className="bi bi-search me-1"></i>搜索报价</>}
          </button>
        </div>

        {/* Loading */}
        {isLoading && <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary"></div> 加载中...</div>}
        {error && <div className="alert alert-warning py-2 small">暂无报价数据，请先搜索</div>}

        {/* Quotes grouped */}
        {!isLoading && grouped.length > 0 && grouped.map((group: any) => (
          <div key={group.key} className="border rounded p-3 mb-3">
            <h6 className="mb-2"><i className="bi bi-box me-1"></i>{group.product}</h6>
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead><tr><th>平台</th><th>价格</th><th>状态</th><th>退改</th><th>更新时间</th><th>操作</th></tr></thead>
                <tbody>
                  {group.quotes.map((q: any) => {
                    const st = statusLabels[q.inventoryStatus] || statusLabels.unknown;
                    const expired = new Date(q.expiresAt) < new Date();
                    return (
                      <tr key={q.id} className={expired ? 'table-warning' : ''}>
                        <td><span className="badge bg-primary">{q.providerCode.replace('mock-', '')}</span></td>
                        <td><strong>{formatMoney(q.totalPriceMinor)}</strong><br /><small className="text-muted">{q.priceUnit === 'room-night' ? '/晚' : q.priceUnit === 'person' ? '/人' : ''}</small></td>
                        <td><span className={`badge bg-${st.cls}`}>{st.label}</span></td>
                        <td><small>{q.conditions?.refundable ? '可退' : q.conditions?.cancellation === 'free' ? '免费取消' : q.conditions?.cancellation === 'partial' ? '部分退' : q.conditions?.seatClass || '-'}</small></td>
                        <td><small className="text-muted">{new Date(q.observedAt).toLocaleTimeString()}</small>{expired && <><br /><small className="text-danger">已过期</small></>}</td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => clickoutMutation.mutate(q.id)} title="去预订"><i className="bi bi-box-arrow-up-right"></i></button>
                            <button className="btn btn-outline-secondary" onClick={() => refreshMutation.mutate(q.id)} title="刷新"><i className="bi bi-arrow-clockwise"></i></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {!isLoading && !error && grouped.length === 0 && showQuotes && (
          <div className="text-center text-muted py-3"><i className="bi bi-inbox me-1"></i>暂无 {productTypes.find(p => p.value === productType)?.label} 报价</div>
        )}
      </div>
    </div>
  );
}
