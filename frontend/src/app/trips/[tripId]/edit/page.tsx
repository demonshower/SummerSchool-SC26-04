'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsApi } from '@/lib/api/trips';
import { planningApi } from '@/lib/api/planning';
import { fenToYuan, yuanToFen } from '@/lib/utils/money';
import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const cities = ['上海', '杭州', '北京', '南京', '苏州', '昆明', '成都', '西安', '广州', '深圳', '重庆', '武汉', '长沙', '厦门', '青岛'];

export default function EditTripPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data: trip, isLoading } = useQuery({ queryKey: ['trip', tripId], queryFn: () => tripsApi.getOne(tripId) });

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: trip ? {
      originCity: trip.originCity, destinationCity: trip.destinationCity,
      earliestDeparture: trip.earliestDeparture?.slice(0, 16), latestReturn: trip.latestReturn?.slice(0, 16),
      budget: fenToYuan(trip.budgetMinor), transportPreference: trip.transportPreference,
      hotelMaxPrice: fenToYuan(trip.hotelMaxPriceMinor), wantsSightseeing: trip.wantsSightseeing,
      attractionPreference: trip.attractionPreference, pace: trip.pace,
      meetings: trip.meetings?.map((m: any) => ({ title: m.title, meetingDate: m.meetingDate?.slice(0, 10), startTime: m.startTime, endTime: m.endTime, location: m.location })) || [],
    } : undefined,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'meetings' });

  const updateMutation = useMutation({
    mutationFn: (data: any) => tripsApi.update(tripId, {
      budgetMinor: yuanToFen(Number(data.budget)),
      transportPreference: data.transportPreference,
      hotelMaxPriceMinor: yuanToFen(Number(data.hotelMaxPrice)),
      wantsSightseeing: data.wantsSightseeing,
      attractionPreference: data.attractionPreference,
      pace: data.pace,
      version: trip?.version,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trip', tripId] }); router.push(`/trips/${tripId}`); },
    onError: (e: any) => setError(e.message || '更新失败'),
  });

  const planMutation = useMutation({
    mutationFn: () => planningApi.createPlan(tripId),
    onSuccess: () => router.push(`/trips/${tripId}`),
  });

  if (isLoading) return <><Navbar /><div className="text-center py-5"><div className="spinner-border text-primary"></div></div></>;

  return (
    <>
      <Navbar />
      <AuthGuard>
        <main className="container py-4">
          <div className="row justify-content-center"><div className="col-lg-10">
            <h2 className="mb-4"><i className="bi bi-pencil text-primary me-2"></i>编辑出差行程</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))}>
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white"><h5 className="mb-0"><i className="bi bi-info-circle me-2"></i>基础信息</h5></div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label">出发城市</label><select {...register('originCity')} className="form-select" disabled>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div className="col-md-6"><label className="form-label">出差城市</label><select {...register('destinationCity')} className="form-select" disabled>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div className="col-md-6"><label className="form-label">最早出发时间</label><input type="datetime-local" {...register('earliestDeparture')} className="form-control" /></div>
                    <div className="col-md-6"><label className="form-label">最晚返程时间</label><input type="datetime-local" {...register('latestReturn')} className="form-control" /></div>
                    <div className="col-md-4"><label className="form-label">总预算（元）</label><div className="input-group"><span className="input-group-text">¥</span><input type="number" {...register('budget')} className="form-control" /></div></div>
                    <div className="col-md-4"><label className="form-label">交通偏好</label><select {...register('transportPreference')} className="form-select"><option value="any">不限</option><option value="flight">飞机</option><option value="train">高铁</option></select></div>
                    <div className="col-md-4"><label className="form-label">酒店最高价（元/晚）</label><div className="input-group"><span className="input-group-text">¥</span><input type="number" {...register('hotelMaxPrice')} className="form-control" /></div></div>
                  </div>
                </div>
              </div>
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white"><h5 className="mb-0"><i className="bi bi-heart me-2"></i>游玩偏好</h5></div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-4"><div className="form-check form-switch"><input className="form-check-input" type="checkbox" {...register('wantsSightseeing')} /><label className="form-check-label">安排游玩活动</label></div></div>
                    <div className="col-md-4"><label className="form-label">景点偏好</label><select {...register('attractionPreference')} className="form-select"><option value="any">不限</option><option value="自然">自然风光</option><option value="人文">人文历史</option><option value="商业">商业购物</option><option value="美食">美食体验</option></select></div>
                    <div className="col-md-4"><label className="form-label">行程强度</label><select {...register('pace')} className="form-select"><option value="relaxed">轻松</option><option value="balanced">均衡</option><option value="intense">紧凑</option></select></div>
                  </div>
                </div>
              </div>
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <h5 className="mb-0"><i className="bi bi-calendar-event me-2"></i>会议安排</h5>
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => append({ title: '会议', meetingDate: '', startTime: '', endTime: '', location: '' })}><i className="bi bi-plus-lg me-1"></i>添加</button>
                </div>
                <div className="card-body">
                  {fields.map((f, i) => (
                    <div key={f.id} className="border rounded p-3 mb-2">
                      <div className="d-flex justify-content-between mb-2"><span className="badge bg-primary">会议 #{i + 1}</span>{fields.length > 1 && <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => remove(i)}><i className="bi bi-trash"></i></button>}</div>
                      <div className="row g-2">
                        <div className="col-md-3"><input type="date" {...register(`meetings.${i}.meetingDate` as const)} className="form-control form-control-sm" /></div>
                        <div className="col-md-3"><input type="time" {...register(`meetings.${i}.startTime` as const)} className="form-control form-control-sm" /></div>
                        <div className="col-md-3"><input type="time" {...register(`meetings.${i}.endTime` as const)} className="form-control form-control-sm" /></div>
                        <div className="col-md-3"><input type="text" {...register(`meetings.${i}.location` as const)} className="form-control form-control-sm" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="d-flex justify-content-between mb-5">
                <a href={`/trips/${tripId}`} className="btn btn-outline-secondary"><i className="bi bi-arrow-left me-1"></i>返回</a>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>{updateMutation.isPending ? '保存中...' : <><i className="bi bi-check-lg me-1"></i>保存修改</>}</button>
                  <button type="button" className="btn btn-warning" onClick={() => planMutation.mutate()} disabled={planMutation.isPending}><i className="bi bi-arrow-clockwise me-1"></i>重新生成推荐</button>
                </div>
              </div>
            </form>
          </div></div>
        </main>
      </AuthGuard>
      <Footer />
    </>
  );
}
