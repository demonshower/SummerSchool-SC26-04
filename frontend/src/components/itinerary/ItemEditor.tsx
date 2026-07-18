'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { itineraryApi } from '@/lib/api/itinerary';

interface ItemEditorProps {
  tripId: string;
  dayId: string;
  existingItem?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const kinds = [
  { value: 'attraction', label: '景点', icon: 'bi-tree' },
  { value: 'meal', label: '餐饮', icon: 'bi-cup-hot' },
  { value: 'commute', label: '市内交通', icon: 'bi-bus-front' },
  { value: 'transport', label: '城际交通', icon: 'bi-train-front' },
  { value: 'hotel', label: '住宿', icon: 'bi-building' },
  { value: 'meeting', label: '会议', icon: 'bi-people' },
  { value: 'fixed', label: '固定事项', icon: 'bi-pin-fill' },
  { value: 'free_time', label: '空闲', icon: 'bi-clock' },
];

export default function ItemEditor({ tripId, dayId, existingItem, onSuccess, onCancel }: ItemEditorProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    kind: existingItem?.kind || 'attraction',
    title: existingItem?.title || '',
    subtitle: existingItem?.subtitle || '',
    startAt: existingItem?.startAt?.slice(0, 16) || '',
    endAt: existingItem?.endAt?.slice(0, 16) || '',
    locationText: existingItem?.locationText || '',
    costMinor: existingItem ? String(existingItem.costMinor / 100) : '',
    note: existingItem?.note || '',
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
  };

  const createMutation = useMutation({
    mutationFn: () => itineraryApi.createItem(tripId, {
      dayId,
      kind: form.kind,
      title: form.title,
      subtitle: form.subtitle || undefined,
      startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
      endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
      locationText: form.locationText || undefined,
      costMinor: form.costMinor ? Math.round(Number(form.costMinor) * 100) : 0,
      note: form.note || undefined,
      isFixed: form.kind === 'fixed' || form.kind === 'meeting',
    }),
    onSuccess: () => { invalidate(); onSuccess?.(); },
  });

  const updateMutation = useMutation({
    mutationFn: () => itineraryApi.updateItem(tripId, existingItem.id, {
      title: form.title,
      subtitle: form.subtitle || undefined,
      startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
      endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
      locationText: form.locationText || undefined,
      costMinor: form.costMinor ? Math.round(Number(form.costMinor) * 100) : undefined,
      note: form.note || undefined,
      version: existingItem.version,
    }),
    onSuccess: () => { invalidate(); onSuccess?.(); },
  });

  const isEdit = !!existingItem;
  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="card border-primary mb-3">
      <div className="card-body">
        <h6 className="mb-3"><i className={`bi ${isEdit ? 'bi-pencil' : 'bi-plus-circle'} me-1`}></i>{isEdit ? '编辑活动项' : '新增活动项'}</h6>
        <div className="row g-2">
          <div className="col-md-3">
            <label className="form-label small">类型</label>
            <select className="form-select form-select-sm" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>
              {kinds.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          <div className="col-md-5">
            <label className="form-label small">标题 <span className="text-danger">*</span></label>
            <input className="form-control form-control-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="如：西湖风景区" />
          </div>
          <div className="col-md-4">
            <label className="form-label small">费用（元）</label>
            <input type="number" className="form-control form-control-sm" value={form.costMinor} onChange={e => setForm({ ...form, costMinor: e.target.value })} placeholder="0" />
          </div>
          <div className="col-md-4">
            <label className="form-label small">开始时间</label>
            <input type="datetime-local" className="form-control form-control-sm" value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })} />
          </div>
          <div className="col-md-4">
            <label className="form-label small">结束时间</label>
            <input type="datetime-local" className="form-control form-control-sm" value={form.endAt} onChange={e => setForm({ ...form, endAt: e.target.value })} />
          </div>
          <div className="col-md-4">
            <label className="form-label small">地点</label>
            <input className="form-control form-control-sm" value={form.locationText} onChange={e => setForm({ ...form, locationText: e.target.value })} placeholder="地点描述" />
          </div>
          <div className="col-md-6">
            <label className="form-label small">副标题/备注</label>
            <input className="form-control form-control-sm" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="如：G7311" />
          </div>
          <div className="col-md-6">
            <label className="form-label small">详细备注</label>
            <input className="form-control form-control-sm" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="可选备注" />
          </div>
        </div>
        <div className="d-flex gap-2 mt-3">
          <button className="btn btn-primary btn-sm" disabled={!form.title.trim() || submitting}
            onClick={() => isEdit ? updateMutation.mutate() : createMutation.mutate()}>
            {submitting ? '保存中...' : <><i className="bi bi-check-lg me-1"></i>{isEdit ? '保存修改' : '添加'}</>}
          </button>
          {onCancel && <button className="btn btn-outline-secondary btn-sm" onClick={onCancel}>取消</button>}
        </div>
      </div>
    </div>
  );
}
