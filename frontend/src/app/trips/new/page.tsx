'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { tripsApi } from '@/lib/api/trips';
import { yuanToFen } from '@/lib/utils/money';
import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const cities = ['上海', '杭州', '北京', '南京', '苏州', '昆明', '成都', '西安', '广州', '深圳', '重庆', '武汉', '长沙', '厦门', '青岛'];

interface FormData {
  originCity: string;
  destinationCity: string;
  earliestDeparture: string;
  latestReturn: string;
  budget: string;
  transportPreference: string;
  hotelMaxPrice: string;
  wantsSightseeing: boolean;
  attractionPreference: string;
  pace: string;
  meetings: { title: string; meetingDate: string; startTime: string; endTime: string; location: string }[];
}

export default function NewTripPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    defaultValues: { wantsSightseeing: true, transportPreference: 'any', attractionPreference: 'any', pace: 'balanced', meetings: [{ title: '会议', meetingDate: '', startTime: '', endTime: '', location: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'meetings' });

  const mutation = useMutation({
    mutationFn: (data: FormData) => tripsApi.create({
      originCity: data.originCity,
      destinationCity: data.destinationCity,
      startDate: data.earliestDeparture.slice(0, 10),
      endDate: data.latestReturn.slice(0, 10),
      earliestDeparture: data.earliestDeparture,
      latestReturn: data.latestReturn,
      budgetMinor: yuanToFen(Number(data.budget)),
      transportPreference: data.transportPreference,
      hotelMaxPriceMinor: yuanToFen(Number(data.hotelMaxPrice)),
      wantsSightseeing: data.wantsSightseeing,
      attractionPreference: data.attractionPreference,
      pace: data.pace,
      meetings: data.meetings.filter(m => m.meetingDate).map(m => ({ title: m.title || '会议', meetingDate: m.meetingDate, startTime: m.startTime, endTime: m.endTime, location: m.location })),
    }),
    onSuccess: (trip: any) => router.push(`/trips/${trip.id}`),
    onError: (e: any) => setError(e.message || '创建失败'),
  });

  return (
    <>
      <Navbar />
      <AuthGuard>
        <main className="container py-4">
          <div className="row justify-content-center"><div className="col-lg-10">
            <h2 className="mb-4"><i className="bi bi-plus-circle text-primary me-2"></i>新建出差行程</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
              {/* 基础信息 */}
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white"><h5 className="mb-0"><i className="bi bi-info-circle me-2"></i>基础信息</h5></div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">出发城市 <span className="text-danger">*</span></label>
                      <select {...register('originCity', { required: true })} className={`form-select ${errors.originCity ? 'is-invalid' : ''}`}>
                        <option value="">请选择</option>{cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">出差城市 <span className="text-danger">*</span></label>
                      <select {...register('destinationCity', { required: true })} className={`form-select ${errors.destinationCity ? 'is-invalid' : ''}`}>
                        <option value="">请选择</option>{cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">最早出发时间 <span className="text-danger">*</span></label>
                      <input type="datetime-local" {...register('earliestDeparture', { required: true })} className={`form-control ${errors.earliestDeparture ? 'is-invalid' : ''}`} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">最晚返程时间 <span className="text-danger">*</span></label>
                      <input type="datetime-local" {...register('latestReturn', { required: true })} className={`form-control ${errors.latestReturn ? 'is-invalid' : ''}`} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">总预算（元）<span className="text-danger">*</span></label>
                      <div className="input-group"><span className="input-group-text">¥</span><input type="number" {...register('budget', { required: true, min: 1 })} className={`form-control ${errors.budget ? 'is-invalid' : ''}`} /></div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">交通偏好</label>
                      <select {...register('transportPreference')} className="form-select"><option value="any">不限</option><option value="flight">飞机</option><option value="train">高铁</option></select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">酒店最高价（元/晚）<span className="text-danger">*</span></label>
                      <div className="input-group"><span className="input-group-text">¥</span><input type="number" {...register('hotelMaxPrice', { required: true, min: 1 })} className="form-control" /></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* 游玩偏好 */}
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
              {/* 会议安排 */}
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <h5 className="mb-0"><i className="bi bi-calendar-event me-2"></i>会议安排</h5>
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => append({ title: '会议', meetingDate: '', startTime: '', endTime: '', location: '' })}><i className="bi bi-plus-lg me-1"></i>添加</button>
                </div>
                <div className="card-body">
                  {fields.map((f, i) => (
                    <div key={f.id} className="border rounded p-3 mb-3">
                      <div className="d-flex justify-content-between mb-2"><span className="badge bg-primary">会议 #{i + 1}</span>{fields.length > 1 && <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => remove(i)}><i className="bi bi-trash"></i></button>}</div>
                      <div className="row g-2">
                        <div className="col-md-4"><label className="form-label small">日期</label><input type="date" {...register(`meetings.${i}.meetingDate` as const)} className="form-control form-control-sm" /></div>
                        <div className="col-md-3"><label className="form-label small">开始</label><input type="time" {...register(`meetings.${i}.startTime` as const)} className="form-control form-control-sm" /></div>
                        <div className="col-md-3"><label className="form-label small">结束</label><input type="time" {...register(`meetings.${i}.endTime` as const)} className="form-control form-control-sm" /></div>
                        <div className="col-md-2"><label className="form-label small">地点</label><input type="text" {...register(`meetings.${i}.location` as const)} className="form-control form-control-sm" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="d-flex justify-content-between mb-5">
                <a href="/trips" className="btn btn-outline-secondary"><i className="bi bi-arrow-left me-1"></i>返回</a>
                <button type="submit" className="btn btn-primary btn-lg px-5" disabled={mutation.isPending}>{mutation.isPending ? '规划中...' : <><i className="bi bi-magic me-2"></i>开始规划</>}</button>
              </div>
            </form>
          </div></div>
        </main>
      </AuthGuard>
      <Footer />
    </>
  );
}
