'use client';

export default function PlanProgress({
  stages,
  progress,
  status,
}: {
  stages?: Array<{ key: string; label: string; status: string; message?: string }>;
  progress?: number;
  status?: string;
}) {
  if (!stages?.length) return null;
  return (
    <div className="card shadow-sm mb-3">
      <div className="card-header bg-white d-flex justify-content-between">
        <h6 className="mb-0"><i className="bi bi-diagram-3 me-2"></i>规划进度</h6>
        <span className="small text-muted">{status} · {progress ?? 0}%</span>
      </div>
      <div className="card-body">
        <div className="progress mb-3" style={{ height: 8 }}>
          <div className="progress-bar" style={{ width: `${progress ?? 0}%` }} />
        </div>
        <ul className="list-unstyled mb-0 small">
          {stages.map((s) => (
            <li key={s.key} className="mb-1 d-flex align-items-start gap-2">
              <span>
                {s.status === 'completed' && <i className="bi bi-check-circle-fill text-success" />}
                {s.status === 'running' && <span className="spinner-border spinner-border-sm text-primary" />}
                {s.status === 'pending' && <i className="bi bi-circle text-muted" />}
                {s.status === 'failed' && <i className="bi bi-x-circle-fill text-danger" />}
                {s.status === 'skipped' && <i className="bi bi-dash-circle text-muted" />}
              </span>
              <span>
                <strong>{s.label}</strong>
                {s.message && <span className="text-muted ms-1">— {s.message}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
