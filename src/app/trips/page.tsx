'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { tripsApi } from '@/lib/api/trips';
import { formatMoney } from '@/lib/utils/money';
import { formatDate } from '@/lib/utils/date';
import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function TripListPage() {
  const { data: result, isLoading, error } = useQuery({ queryKey: ['trips'], queryFn: () => tripsApi.list() });

  return (
    <>
      <Navbar />
      <AuthGuard>
        <main className="container py-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2><i className="bi bi-clock-history text-primary me-2"></i>历史行程</h2>
            <Link href="/trips/new" className="btn btn-primary"><i className="bi bi-plus-circle me-1"></i>新建行程</Link>
          </div>
          {isLoading && <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>}
          {error && <div className="alert alert-danger">加载失败: {(error as any).message}</div>}
          {result && result.items.length === 0 && (
            <div className="text-center py-5">
              <div className="display-1 text-muted mb-3"><i className="bi bi-inbox"></i></div>
              <h5 className="text-muted">暂无历史行程</h5>
              <Link href="/trips/new" className="btn btn-primary btn-lg mt-3"><i className="bi bi-plus-circle me-2"></i>开始规划</Link>
            </div>
          )}
          {result && result.items.length > 0 && (
            <div className="row g-3">
              {result.items.map((t: any) => (
                <div className="col-md-6 col-lg-4" key={t.id}>
                  <div className="card shadow-sm h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h5 className="card-title mb-0">
                          <span className="badge bg-primary me-1">{t.originCity}</span>
                          <i className="bi bi-arrow-right"></i>
                          <span className="badge bg-primary ms-1">{t.destinationCity}</span>
                        </h5>
                        <span className={`badge ${t.status === 'ready' ? 'bg-success' : t.status === 'draft' ? 'bg-secondary' : 'bg-info'}`}>
                          {{ draft: '草稿', planning: '规划中', ready: '已规划', confirmed: '已确认', archived: '已归档' }[t.status as string] || t.status}
                        </span>
                      </div>
                      <p className="text-muted small mb-2">
                        <i className="bi bi-calendar3 me-1"></i>{formatDate(t.startDate)} ~ {formatDate(t.endDate)}
                        {t.meetings?.length > 0 && <><br/><i className="bi bi-people me-1"></i>{t.meetings.length} 场会议</>}
                      </p>
                      <div className="d-flex justify-content-between align-items-center">
                        <div><small className="text-muted">预算</small> <strong>{formatMoney(t.budgetMinor)}</strong></div>
                        <Link href={`/trips/${t.id}`} className="btn btn-outline-primary btn-sm"><i className="bi bi-eye me-1"></i>查看</Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </AuthGuard>
      <Footer />
    </>
  );
}
