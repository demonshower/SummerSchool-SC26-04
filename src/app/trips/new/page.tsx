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
import NaturalLanguageInput, { NlParsed } from '@/components/trips/NaturalLanguageInput';
import PlacePicker from '@/components/places/PlacePicker';

const cities = ['上海', '杭州', '北京', '南京', '苏州', '昆明', '成都', '西安', '广州', '深圳', '重庆', '武汉', '长沙', '厦门', '青岛'];

interface MeetingForm {
  title: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location: string;
}

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
  meetings: MeetingForm[];
}

/** datetime-local -> ISO 8601 with +08:00 */
function toIsoLocal(value: string): string {
  if (!value) return value;
  // already has zone
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) return value;
  // "YYYY-MM-DDTHH:mm" or with seconds
  if (value.length === 16) return `${value}:00+08:00`;
  if (value.length === 19) return `${value}+08:00`;
  return value;
}

function isCompleteMeeting(m: MeetingForm): boolean {
  return !!(
    m.meetingDate?.trim() &&
    m.startTime?.trim() &&
    m.endTime?.trim() &&
    m.location?.trim()
  );
}

export default function NewTripPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm<FormData>({
    defaultValues: {
      wantsSightseeing: true,
      transportPreference: 'train',
      attractionPreference: 'any',
      pace: 'balanced',
      meetings: [{ title: '会议', meetingDate: '', startTime: '09:00', endTime: '12:00', location: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'meetings' });
  const destCity = watch('destinationCity');

  const applyNl = (parsed: NlParsed) => {
    if (parsed.originCity) setValue('originCity', parsed.originCity);
    if (parsed.destinationCity) setValue('destinationCity', parsed.destinationCity);
    if (parsed.budgetYuan) setValue('budget', String(parsed.budgetYuan));
    if (parsed.hotelMaxPriceYuan) setValue('hotelMaxPrice', String(parsed.hotelMaxPriceYuan));
    if (parsed.transportPreference) setValue('transportPreference', parsed.transportPreference);
    if (parsed.pace) setValue('pace', parsed.pace);
    if (parsed.attractionPreference) setValue('attractionPreference', parsed.attractionPreference);
    if (typeof parsed.wantsSightseeing === 'boolean') setValue('wantsSightseeing', parsed.wantsSightseeing);
    if (parsed.startDate) setValue('earliestDeparture', `${parsed.startDate}T09:00`);
    if (parsed.endDate) setValue('latestReturn', `${parsed.endDate}T18:00`);
    if (parsed.meetings?.length) {
      setValue(
        'meetings',
        parsed.meetings.map((m) => ({
          title: m.title || '会议',
          meetingDate: m.meetingDate || '',
          startTime: m.startTime || '09:00',
          endTime: m.endTime || '12:00',
          location: m.location || '',
        })),
      );
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      // 前端再校验会议完整性（只提交完整会议）
      const rawMeetings = data.meetings || [];
      const partial = rawMeetings.filter(
        (m) =>
          (m.meetingDate || m.startTime || m.endTime || m.location) &&
          !isCompleteMeeting(m),
      );
      if (partial.length) {
        throw {
          code: 'INVALID_INPUT',
          message: '请补全会议的日期、开始时间、结束时间和地点，或清空未使用的会议行',
        };
      }

      if (data.originCity === data.destinationCity) {
        throw { code: 'INVALID_INPUT', message: '出发城市和出差城市不能相同' };
      }

      const meetings = rawMeetings.filter(isCompleteMeeting).map((m) => ({
        title: m.title?.trim() || '会议',
        meetingDate: m.meetingDate,
        startTime: m.startTime.slice(0, 5),
        endTime: m.endTime.slice(0, 5),
        location: m.location.trim(),
      }));

      for (const m of meetings) {
        if (m.startTime >= m.endTime) {
          throw { code: 'INVALID_INPUT', message: `会议「${m.title}」结束时间必须晚于开始时间` };
        }
      }

      setStatusText('正在创建行程并自动规划（含地图/天气/AI，可能需要十几秒）...');

      return tripsApi.create({
        originCity: data.originCity,
        destinationCity: data.destinationCity,
        startDate: data.earliestDeparture.slice(0, 10),
        endDate: data.latestReturn.slice(0, 10),
        earliestDeparture: toIsoLocal(data.earliestDeparture),
        latestReturn: toIsoLocal(data.latestReturn),
        budgetMinor: yuanToFen(Number(data.budget)),
        transportPreference: data.transportPreference,
        hotelMaxPriceMinor: yuanToFen(Number(data.hotelMaxPrice)),
        wantsSightseeing: !!data.wantsSightseeing,
        attractionPreference: data.attractionPreference,
        pace: data.pace,
        meetings,
        autoPlan: true,
        planStrategy: 'balanced',
      } as any);
    },
    onSuccess: (trip: any) => {
      setStatusText('');
      if (!trip?.id) {
        setError('创建成功但未返回行程 ID');
        return;
      }
      // 详情页已包含规划结果（autoPlan）
      router.push(`/trips/${trip.id}`);
    },
    onError: (e: any) => {
      setStatusText('');
      const msg = e?.message || '创建失败';
      const details = e?.details?.validation;
      setError(Array.isArray(details) ? `${msg}：${details.join('；')}` : msg);
    },
  });

  const onSubmit = (data: FormData) => mutation.mutate(data);

  return (
    <>
      <Navbar />
      <AuthGuard>
        <main className="container py-4">
          <div className="row justify-content-center"><div className="col-lg-10">
            <h2 className="mb-4"><i className="bi bi-plus-circle text-primary me-2"></i>新建出差行程</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            {statusText && <div className="alert alert-info">{statusText}</div>}
            <NaturalLanguageInput onParsed={applyNl} />
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white"><h5 className="mb-0"><i className="bi bi-info-circle me-2"></i>基础信息</h5></div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">出发城市 <span className="text-danger">*</span></label>
                      <select {...register('originCity', { required: '请选择出发城市' })} className={`form-select ${errors.originCity ? 'is-invalid' : ''}`}>
                        <option value="">请选择</option>{cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {errors.originCity && <div className="invalid-feedback">{errors.originCity.message as string}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">出差城市 <span className="text-danger">*</span></label>
                      <select {...register('destinationCity', { required: '请选择出差城市' })} className={`form-select ${errors.destinationCity ? 'is-invalid' : ''}`}>
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
                  <h5 className="mb-0"><i className="bi bi-calendar-event me-2"></i>会议安排 <small className="text-muted fw-normal">（选填；填写则日期/时间/地点均必填）</small></h5>
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => append({ title: '会议', meetingDate: '', startTime: '09:00', endTime: '12:00', location: '' })}><i className="bi bi-plus-lg me-1"></i>添加</button>
                </div>
                <div className="card-body">
                  {fields.map((f, i) => (
                    <div key={f.id} className="border rounded p-3 mb-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="badge bg-primary">会议 #{i + 1}</span>
                        {fields.length > 1 && (
                          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => remove(i)}><i className="bi bi-trash"></i></button>
                        )}
                      </div>
                      <div className="row g-2">
                        <div className="col-md-3">
                          <label className="form-label small">标题</label>
                          <input type="text" {...register(`meetings.${i}.title` as const)} className="form-control form-control-sm" placeholder="会议" />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small">日期</label>
                          <input type="date" {...register(`meetings.${i}.meetingDate` as const)} className="form-control form-control-sm" />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small">开始</label>
                          <input type="time" {...register(`meetings.${i}.startTime` as const)} className="form-control form-control-sm" />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small">结束</label>
                          <input type="time" {...register(`meetings.${i}.endTime` as const)} className="form-control form-control-sm" />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small">地点</label>
                          <input type="text" {...register(`meetings.${i}.location` as const)} className="form-control form-control-sm" placeholder="西湖区" />
                        </div>
                        <div className="col-12">
                          <PlacePicker
                            city={destCity}
                            placeholder="搜索会议地点（高德）"
                            onPick={(p) => setValue(`meetings.${i}.location`, p.address || p.name)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="form-text">不需要会议时可删除所有会议行，或保留空行（空行不会提交）。地点可用高德搜索。</div>
                </div>
              </div>

              <div className="d-flex justify-content-between mb-5">
                <a href="/trips" className="btn btn-outline-secondary"><i className="bi bi-arrow-left me-1"></i>返回</a>
                <button type="submit" className="btn btn-primary btn-lg px-5" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <><span className="spinner-border spinner-border-sm me-2" />规划中...</>
                  ) : (
                    <><i className="bi bi-magic me-2"></i>开始规划</>
                  )}
                </button>
              </div>
            </form>
          </div></div>
        </main>
      </AuthGuard>
      <Footer />
    </>
  );
}
