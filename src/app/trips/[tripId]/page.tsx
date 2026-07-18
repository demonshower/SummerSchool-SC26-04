'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { tripsApi } from '@/lib/api/trips';
import { planningApi } from '@/lib/api/planning';
import { itineraryApi } from '@/lib/api/itinerary';
import { formatMoney } from '@/lib/utils/money';
import { formatDate, formatTime } from '@/lib/utils/date';
import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import QuotePanel from '@/components/quotes/QuotePanel';
import GuideImporter from '@/components/content/GuideImporter';
import ItemEditor from '@/components/itinerary/ItemEditor';
import ResearchPanel from '@/components/research/ResearchPanel';
import WeatherCard from '@/components/weather/WeatherCard';
import PlanProgress from '@/components/planning/PlanProgress';

const dayTypeLabels: Record<string, string> = {
  departure: '出发日',
  meeting_day: '会议加游玩',
  return: '返程日',
  free: '自由日',
};
const dayTypeColors: Record<string, string> = {
  departure: 'success',
  meeting_day: 'primary',
  return: 'info',
  free: 'secondary',
};
const kindIcons: Record<string, string> = {
  transport: 'bi-train-front',
  commute: 'bi-bus-front',
  hotel: 'bi-building',
  meal: 'bi-cup-hot',
  attraction: 'bi-tree',
  meeting: 'bi-people',
  fixed: 'bi-pin-fill',
  free_time: 'bi-clock',
};
const kindColors: Record<string, string> = {
  transport: 'success',
  hotel: 'warning',
  meal: 'secondary',
  attraction: 'info',
  meeting: 'danger',
  commute: 'secondary',
  fixed: 'danger',
};
const budgetLabels: Record<string, { label: string; cls: string }> = {
  within_budget: { label: '预算充足', cls: 'success' },
  close_to_budget: { label: '接近预算', cls: 'warning' },
  slightly_over: { label: '略超预算', cls: 'warning' },
  over_budget: { label: '超预算', cls: 'danger' },
};

export default function TripDetailPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [planning, setPlanning] = useState(false);
  const [planStages, setPlanStages] = useState<any[]>([]);
  const [planProgress, setPlanProgress] = useState(0);
  const [planStatus, setPlanStatus] = useState('');
  const [showAddItem, setShowAddItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showQuotes, setShowQuotes] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const autoPlanTried = useRef(false);

  const { data: trip, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsApi.getOne(tripId),
    enabled: !!tripId,
  });

  const runPlanWithPolling = async () => {
    setPlanning(true);
    setPlanStatus('queued');
    setPlanProgress(0);
    try {
      const accepted: any = await planningApi.createPlan(tripId, { strategy: 'balanced' });
      const jobId = accepted?.jobId;
      const start = Date.now();
      while (Date.now() - start < 180000) {
        const st: any = await planningApi.getStatus(tripId);
        const job = st?.job;
        if (job) {
          setPlanStages(job.stages || []);
          setPlanProgress(job.progress || 0);
          setPlanStatus(job.status || st.tripStatus);
          if (job.status === 'completed' || st.tripStatus === 'ready') break;
          if (job.status === 'failed') throw new Error(job.error || '规划失败');
        } else if (st?.tripStatus === 'ready') {
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      await queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      await refetch();
    } catch (e: any) {
      alert(e?.message || '规划失败');
    } finally {
      setPlanning(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: () => tripsApi.delete(tripId),
    onSuccess: () => router.push('/trips'),
  });
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => itineraryApi.deleteItem(tripId, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip', tripId] }),
  });
  const lockItemMutation = useMutation({
    mutationFn: ({ itemId, locked }: { itemId: string; locked: boolean }) =>
      itineraryApi.lockItem(tripId, itemId, locked),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip', tripId] }),
  });

  useEffect(() => {
    if (!trip || autoPlanTried.current || planning) return;
    const empty = !(trip.days || []).some((d: any) => (d.items?.length || 0) > 0);
    if (empty && trip.status !== 'planning') {
      autoPlanTried.current = true;
      void runPlanWithPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id, trip?.status, trip?.days?.length]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
          <div className="text-muted mt-2">加载行程...</div>
        </div>
      </>
    );
  }
  if (error) {
    return (
      <>
        <Navbar />
        <div className="alert alert-danger m-4">加载失败: {(error as any).message}</div>
      </>
    );
  }
  if (!trip) {
    return (
      <>
        <Navbar />
        <div className="alert alert-warning m-4">行程不存在</div>
      </>
    );
  }

  const cs = trip.costSummary;
  const budget = budgetLabels[cs?.status || 'within_budget'];
  const hasItems = (trip.days || []).some((d: any) => (d.items?.length || 0) > 0);
  const needsPlan = !hasItems;
  const routeHints = trip.planVersions?.[0]?.evidence?.routeHints || [];
  const dataSources = trip.planVersions?.[0]?.evidence?.dataSources;

  return (
    <>
      <Navbar />
      <AuthGuard>
        <main className="container py-4">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
            <div>
              <h2>
                <i className="bi bi-map text-primary me-2"></i>
                {trip.originCity} → {trip.destinationCity}
              </h2>
              <p className="text-muted mb-0">
                <i className="bi bi-calendar3 me-1"></i>
                {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)}
                <span className="mx-2">|</span>
                <span className={`badge bg-${budget.cls}`}>{budget.label}</span>
                {trip.meetings?.length > 0 && (
                  <>
                    <span className="mx-2">|</span>
                    <i className="bi bi-people me-1"></i>
                    {trip.meetings.length}场会议
                  </>
                )}
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Link href={`/trips/${tripId}/edit`} className="btn btn-outline-primary btn-sm">
                <i className="bi bi-pencil me-1"></i>编辑
              </Link>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => void runPlanWithPolling()}
                disabled={planning}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                {planning ? '规划中...' : '重新规划'}
              </button>
              <button
                className={`btn btn-sm ${showQuotes ? 'btn-info' : 'btn-outline-info'}`}
                onClick={() => setShowQuotes(!showQuotes)}
              >
                <i className="bi bi-tags me-1"></i>比价
              </button>
              <button
                className={`btn btn-sm ${showGuide ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => setShowGuide(!showGuide)}
              >
                <i className="bi bi-journal-text me-1"></i>导入
              </button>
              <button
                className={`btn btn-sm ${showResearch ? 'btn-warning' : 'btn-outline-warning'}`}
                onClick={() => setShowResearch(!showResearch)}
              >
                <i className="bi bi-search me-1"></i>研究
              </button>
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => {
                  if (confirm('确定删除此行程？')) deleteMutation.mutate();
                }}
              >
                <i className="bi bi-trash me-1"></i>删除
              </button>
            </div>
          </div>
          <hr />

          {(planning || planStages.length > 0) && (
            <PlanProgress stages={planStages} progress={planProgress} status={planStatus || (planning ? 'running' : '')} />
          )}

          {needsPlan && !planning && (
            <div className="alert alert-warning d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <i className="bi bi-exclamation-triangle me-2"></i>
                当前行程还没有每日安排。将使用分段并行 LLM + 高德数据生成。
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => void runPlanWithPolling()}>
                <i className="bi bi-magic me-1"></i>立即规划
              </button>
            </div>
          )}

          {isFetching && !planning && (
            <div className="alert alert-info py-2">
              <span className="spinner-border spinner-border-sm me-2" />
              刷新行程...
            </div>
          )}

          {trip.planVersions?.[0]?.evidence?.explanation && (
            <div className="card shadow-sm mb-3 border-success">
              <div className="card-header bg-white">
                <h6 className="mb-0">
                  <i className="bi bi-robot me-2"></i>方案说明（分段 LLM）
                </h6>
              </div>
              <div className="card-body">
                <p className="mb-2">{trip.planVersions[0].evidence.explanation.summary}</p>
                {!!trip.planVersions[0].evidence.explanation.advantages?.length && (
                  <div className="small mb-1">
                    <strong>优点：</strong>
                    {trip.planVersions[0].evidence.explanation.advantages.join('；')}
                  </div>
                )}
                {!!trip.planVersions[0].evidence.explanation.risks?.length && (
                  <div className="small text-muted">
                    <strong>风险：</strong>
                    {trip.planVersions[0].evidence.explanation.risks.join('；')}
                  </div>
                )}
                {dataSources && (
                  <div className="mt-2 small text-muted">
                    数据源：{Object.entries(dataSources).map(([k, v]) => (
                      <span key={k} className="badge bg-light text-dark me-1">
                        {k}:{String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {showQuotes && <QuotePanel tripId={tripId} />}
          {showGuide && <GuideImporter tripId={tripId} />}
          {showResearch && <ResearchPanel tripId={tripId} />}

          <div className="row g-4">
            <div className="col-lg-4">
              <WeatherCard city={trip.destinationCity} />

              {trip.days?.[0]?.items
                ?.filter((i: any) => i.kind === 'transport')
                .slice(0, 1)
                .map((item: any) => (
                  <div key={item.id} className="card shadow-sm mb-3">
                    <div className="card-header bg-white">
                      <h6 className="mb-0">
                        <i className="bi bi-arrow-right-circle text-success me-2"></i>去程
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="badge bg-success">
                          {item.transportSegment?.mode === 'train' ? '高铁' : '飞机/交通'}
                        </span>
                        <small className="text-muted">{item.subtitle}</small>
                      </div>
                      <p className="mb-1">
                        <strong>{formatTime(item.startAt)}</strong>
                        <i className="bi bi-arrow-right mx-1"></i>
                        <strong>{formatTime(item.endAt)}</strong>
                      </p>
                      <small className="text-muted">{item.locationText}</small>
                      <br />
                      <small className="fw-bold">{formatMoney(item.costMinor)}</small>
                      <div className="text-muted small">价格可能为估算</div>
                    </div>
                  </div>
                ))}

              {trip.days?.[trip.days.length - 1]?.items
                ?.filter((i: any) => i.kind === 'transport')
                .slice(0, 1)
                .map((item: any) => (
                  <div key={item.id} className="card shadow-sm mb-3">
                    <div className="card-header bg-white">
                      <h6 className="mb-0">
                        <i className="bi bi-arrow-left-circle text-info me-2"></i>返程
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="badge bg-info">
                          {item.transportSegment?.mode === 'train' ? '高铁' : '飞机/交通'}
                        </span>
                        <small className="text-muted">{item.subtitle}</small>
                      </div>
                      <p className="mb-1">
                        <strong>{formatTime(item.startAt)}</strong>
                        <i className="bi bi-arrow-right mx-1"></i>
                        <strong>{formatTime(item.endAt)}</strong>
                      </p>
                      <small className="fw-bold">{formatMoney(item.costMinor)}</small>
                    </div>
                  </div>
                ))}

              {trip.days?.[0]?.items
                ?.filter((i: any) => i.kind === 'hotel')
                .slice(0, 1)
                .map((item: any) => (
                  <div key={item.id} className="card shadow-sm mb-3">
                    <div className="card-header bg-white">
                      <h6 className="mb-0">
                        <i className="bi bi-building text-warning me-2"></i>推荐酒店
                      </h6>
                    </div>
                    <div className="card-body">
                      <h6 className="mb-1">{item.title.replace('入住 ', '')}</h6>
                      <p className="mb-1">
                        <strong>{formatMoney(item.costMinor)}</strong>
                        <small className="text-muted"> / 晚</small>
                      </p>
                      <small className="text-muted">{item.locationText}</small>
                    </div>
                  </div>
                ))}

              {routeHints.length > 0 && (
                <div className="card shadow-sm mb-3">
                  <div className="card-header bg-white">
                    <h6 className="mb-0">
                      <i className="bi bi-signpost-split me-2"></i>通勤提示（高德）
                    </h6>
                  </div>
                  <div className="card-body small">
                    {routeHints.slice(0, 8).map((h: any, i: number) => (
                      <div key={i} className="mb-2 border-bottom pb-1">
                        <div>
                          {h.from} → {h.to}
                        </div>
                        <div className="text-muted">
                          {h.mode} · {Math.round((h.distanceMeters || 0) / 1000 * 10) / 10}km ·{' '}
                          {Math.round((h.durationSeconds || 0) / 60)}分钟
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cs && (
                <div className="card shadow-sm mb-3">
                  <div className="card-header bg-white">
                    <h6 className="mb-0">
                      <i className="bi bi-calculator me-2"></i>费用明细
                    </h6>
                  </div>
                  <div className="card-body">
                    {cs.transportMinor > 0 && (
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">交通</small>
                        <small>{formatMoney(cs.transportMinor)}</small>
                      </div>
                    )}
                    {cs.hotelMinor > 0 && (
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">酒店</small>
                        <small>{formatMoney(cs.hotelMinor)}</small>
                      </div>
                    )}
                    {cs.mealMinor > 0 && (
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">餐饮</small>
                        <small>{formatMoney(cs.mealMinor)}</small>
                      </div>
                    )}
                    {cs.attractionMinor > 0 && (
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">门票</small>
                        <small>{formatMoney(cs.attractionMinor)}</small>
                      </div>
                    )}
                    <hr className="my-2" />
                    <div className="d-flex justify-content-between">
                      <strong>总计</strong>
                      <strong>{formatMoney(cs.totalMinor)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <small className="text-muted">预算</small>
                      <small>{formatMoney(cs.budgetMinor)}</small>
                    </div>
                    <div className="mt-2">
                      <span className={`badge bg-${budget.cls} w-100 text-center`}>
                        {budget.label} 剩余 {formatMoney(cs.remainingMinor)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="col-lg-8">
              {trip.days?.map((day: any) => (
                <div key={day.id} className="card shadow-sm mb-4">
                  <div
                    className={`card-header d-flex justify-content-between align-items-center bg-${dayTypeColors[day.dayType] || 'secondary'} text-white`}
                  >
                    <h5 className="mb-0">
                      <i className="bi bi-calendar-day me-2"></i>
                      {formatDate(day.localDate)}
                    </h5>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-light text-dark">
                        {dayTypeLabels[day.dayType] || day.dayType}
                      </span>
                      {day.weatherSummary && (
                        <span className="badge bg-info text-dark">{day.weatherSummary}</span>
                      )}
                      <button
                        className="btn btn-light btn-sm py-0"
                        onClick={() => setShowAddItem(showAddItem === day.id ? null : day.id)}
                        title="添加活动"
                      >
                        <i className="bi bi-plus-lg"></i>
                      </button>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    {showAddItem === day.id && (
                      <div className="p-3 border-bottom bg-light">
                        <ItemEditor
                          tripId={tripId}
                          dayId={day.id}
                          onSuccess={() => setShowAddItem(null)}
                          onCancel={() => setShowAddItem(null)}
                        />
                      </div>
                    )}

                    {day.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className={`border-bottom p-3 ${item.isFixed ? 'bg-light' : ''} ${editingItem?.id === item.id ? 'bg-info bg-opacity-10' : ''}`}
                      >
                        {editingItem?.id === item.id ? (
                          <ItemEditor
                            tripId={tripId}
                            dayId={day.id}
                            existingItem={item}
                            onSuccess={() => setEditingItem(null)}
                            onCancel={() => setEditingItem(null)}
                          />
                        ) : (
                          <div className="row align-items-start">
                            <div className="col-auto text-center" style={{ minWidth: 80 }}>
                              <small className="text-muted d-block">
                                {item.startAt
                                  ? formatTime(item.startAt) +
                                    (item.endAt ? '-' + formatTime(item.endAt) : '')
                                  : ''}
                              </small>
                            </div>
                            <div className="col-auto text-center">
                              <span
                                className={`badge rounded-circle p-2 bg-${kindColors[item.kind] || 'secondary'}`}
                              >
                                <i className={`bi ${kindIcons[item.kind] || 'bi-circle'}`}></i>
                              </span>
                            </div>
                            <div className="col">
                              <div className="d-flex justify-content-between">
                                <div>
                                  <strong>{item.title}</strong>
                                  {item.isFixed && (
                                    <span className="badge bg-danger ms-1">固定</span>
                                  )}
                                  {item.locked && (
                                    <span className="badge bg-warning ms-1">
                                      <i className="bi bi-lock-fill"></i>
                                    </span>
                                  )}
                                  {item.sourceType === 'llm_segment' && (
                                    <span className="badge bg-success ms-1">AI</span>
                                  )}
                                  <br />
                                  <small className="text-muted">{item.subtitle}</small>
                                  {item.locationText && (
                                    <>
                                      <br />
                                      <small className="text-muted">
                                        <i className="bi bi-geo-alt me-1"></i>
                                        {item.locationText}
                                      </small>
                                    </>
                                  )}
                                </div>
                                <div className="text-end" style={{ minWidth: 100 }}>
                                  {item.costMinor > 0 && (
                                    <span className="badge bg-light text-dark d-block mb-1">
                                      {formatMoney(item.costMinor)}
                                    </span>
                                  )}
                                  {!(item.isFixed || item.locked) && (
                                    <div className="btn-group btn-group-sm">
                                      <button
                                        className="btn btn-outline-primary py-0 px-1"
                                        onClick={() => setEditingItem(item)}
                                      >
                                        <i className="bi bi-pencil"></i>
                                      </button>
                                      <button
                                        className="btn btn-outline-warning py-0 px-1"
                                        onClick={() =>
                                          lockItemMutation.mutate({
                                            itemId: item.id,
                                            locked: true,
                                          })
                                        }
                                      >
                                        <i className="bi bi-lock"></i>
                                      </button>
                                      <button
                                        className="btn btn-outline-danger py-0 px-1"
                                        onClick={() => {
                                          if (confirm('确定删除？'))
                                            deleteItemMutation.mutate(item.id);
                                        }}
                                      >
                                        <i className="bi bi-x"></i>
                                      </button>
                                    </div>
                                  )}
                                  {item.locked && !item.isFixed && (
                                    <button
                                      className="btn btn-outline-success btn-sm py-0 px-1"
                                      onClick={() =>
                                        lockItemMutation.mutate({
                                          itemId: item.id,
                                          locked: false,
                                        })
                                      }
                                    >
                                      <i className="bi bi-unlock"></i>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {(!day.items || day.items.length === 0) && !showAddItem && (
                      <div className="p-3 text-muted text-center">
                        <i className="bi bi-inbox me-1"></i>暂无安排
                        <button
                          className="btn btn-link btn-sm p-0 ms-1"
                          onClick={() => setShowAddItem(day.id)}
                        >
                          添加
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </AuthGuard>
      <Footer />
    </>
  );
}
