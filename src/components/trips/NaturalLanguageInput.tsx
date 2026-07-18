'use client';
import { useState } from 'react';
import { apiClient } from '@/lib/api/client';

export type NlParsed = {
  originCity?: string | null;
  destinationCity?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budgetYuan?: number | null;
  transportPreference?: string | null;
  pace?: string | null;
  wantsSightseeing?: boolean | null;
  attractionPreference?: string | null;
  hotelMaxPriceYuan?: number | null;
  meetings?: Array<{
    title?: string;
    meetingDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
  }>;
  notes?: string[];
  missingFields?: string[];
  ambiguities?: string[];
};

export default function NaturalLanguageInput({
  onParsed,
}: {
  onParsed: (parsed: NlParsed) => void;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  const parse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    setHint('');
    try {
      const res: any = await apiClient.post('/providers/ai/parse-request', { text });
      const parsed = res?.parsed || res;
      if (parsed?.error) {
        setError(parsed.error);
        return;
      }
      onParsed(parsed);
      const missing = parsed.missingFields || [];
      const amb = parsed.ambiguities || [];
      setHint(
        [
          missing.length ? `待补全：${missing.join('、')}` : '',
          amb.length ? `歧义：${amb.join('；')}` : '已填入可识别字段，请确认后提交',
        ]
          .filter(Boolean)
          .join(' | '),
      );
    } catch (e: any) {
      setError(e.message || '解析失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm mb-4 border-primary">
      <div className="card-header bg-white">
        <h5 className="mb-0"><i className="bi bi-chat-dots me-2"></i>智能填写（自然语言）</h5>
      </div>
      <div className="card-body">
        <textarea
          className="form-control mb-2"
          rows={3}
          placeholder="例：8月10到12日从上海去杭州，预算3000，坐高铁，11号上午西湖区开会，想轻松逛逛"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" disabled={loading || !text.trim()} onClick={parse}>
          {loading ? <><span className="spinner-border spinner-border-sm me-1" />解析中...</> : <><i className="bi bi-magic me-1"></i>解析并填表</>}
        </button>
        {error && <div className="text-danger small mt-2">{error}</div>}
        {hint && <div className="text-muted small mt-2">{hint}</div>}
      </div>
    </div>
  );
}
