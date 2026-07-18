'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contentApi } from '@/lib/api/content';

interface ExtractedPlace {
  mention: string;
  suggestedDurationMinutes: number;
  suggestedPeriod: string;
  sentiment: string;
  confidence: number;
  tips: string[];
  evidence: string;
}

interface ImportResult {
  id: string;
  status: string;
  extractedCount: number;
  places: ExtractedPlace[];
}

export default function GuideImporter({ tripId }: { tripId: string }) {
  const [mode, setMode] = useState<'text' | 'link'>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const importTextMutation = useMutation({
    mutationFn: () => contentApi.importText({ rawText: text, title: title || undefined, tripId }),
    onSuccess: (data: any) => { setResult(data); setError(''); setText(''); setTitle(''); },
    onError: (e: any) => setError(e.message || '导入失败'),
  });

  const importLinkMutation = useMutation({
    mutationFn: () => contentApi.importLink({ sourceUrl: url, title: title || undefined, tripId }),
    onSuccess: (data: any) => { setResult(data); setError(''); setUrl(''); setTitle(''); },
    onError: (e: any) => setError(e.message || '导入失败'),
  });

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0"><i className="bi bi-journal-text me-2"></i>攻略导入</h5>
        <div className="btn-group btn-group-sm">
          <button className={`btn ${mode === 'text' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('text')}>文本</button>
          <button className={`btn ${mode === 'link' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('link')}>链接</button>
        </div>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {mode === 'text' ? (
          <>
            <div className="mb-3">
              <label className="form-label small">标题（可选）</label>
              <input className="form-control form-control-sm" value={title} onChange={e => setTitle(e.target.value)} placeholder="攻略标题" />
            </div>
            <div className="mb-3">
              <label className="form-label small">粘贴攻略文本 <span className="text-danger">*</span></label>
              <textarea className="form-control form-control-sm" rows={5} value={text} onChange={e => setText(e.target.value)} placeholder="粘贴小红书、马蜂窝等平台的攻略内容..." />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => importTextMutation.mutate()} disabled={!text.trim() || importTextMutation.isPending}>
              {importTextMutation.isPending ? <><span className="spinner-border spinner-border-sm me-1"></span>抽取中...</> : <><i className="bi bi-scissors me-1"></i>导入并抽取</>}
            </button>
          </>
        ) : (
          <>
            <div className="mb-3">
              <label className="form-label small">标题（可选）</label>
              <input className="form-control form-control-sm" value={title} onChange={e => setTitle(e.target.value)} placeholder="攻略标题" />
            </div>
            <div className="mb-3">
              <label className="form-label small">攻略链接 <span className="text-danger">*</span></label>
              <input className="form-control form-control-sm" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.xiaohongshu.com/explore/..." />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => importLinkMutation.mutate()} disabled={!url.trim() || importLinkMutation.isPending}>
              {importLinkMutation.isPending ? '导入中...' : <><i className="bi bi-link-45deg me-1"></i>导入链接</>}
            </button>
          </>
        )}

        {/* Extraction results */}
        {result && result.places && result.places.length > 0 && (
          <div className="mt-4">
            <h6><i className="bi bi-check-circle text-success me-1"></i>抽取到 {result.extractedCount} 个地点</h6>
            <div className="row g-2">
              {result.places.map((p, i) => (
                <div className="col-md-6" key={i}>
                  <div className={`border rounded p-2 ${p.sentiment === 'negative' ? 'border-danger' : 'border-success'}`}>
                    <div className="d-flex justify-content-between align-items-start">
                      <strong className="small">{p.mention}</strong>
                      <div className="text-end">
                        <span className={`badge bg-${p.sentiment === 'positive' ? 'success' : p.sentiment === 'negative' ? 'danger' : 'secondary'} badge-sm`}>{p.sentiment === 'positive' ? '推荐' : p.sentiment === 'negative' ? '避坑' : '中性'}</span>
                        <br /><small className="text-muted">置信度 {(p.confidence * 100).toFixed(0)}%</small>
                      </div>
                    </div>
                    <div className="mt-1">
                      <small className="text-muted">
                        <i className="bi bi-clock me-1"></i>{p.suggestedDurationMinutes}分钟
                        <span className="mx-1">|</span>
                        <i className="bi bi-sun me-1"></i>{p.suggestedPeriod === 'morning' ? '上午' : p.suggestedPeriod === 'afternoon' ? '下午' : p.suggestedPeriod === 'evening' ? '晚上' : p.suggestedPeriod}
                      </small>
                    </div>
                    {p.tips?.length > 0 && <div className="mt-1">{p.tips.map((t, j) => <span key={j} className="badge bg-info me-1 small">{t}</span>)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (!result.places || result.places.length === 0) && result.status === 'metadata_only' && (
          <div className="alert alert-info mt-3 py-2 small"><i className="bi bi-info-circle me-1"></i>{result.status === 'metadata_only' ? '链接已保存。由于平台限制，无法直接读取正文。请粘贴文本内容以进行抽取。' : '未提取到地点'}</div>
        )}
      </div>
    </div>
  );
}
