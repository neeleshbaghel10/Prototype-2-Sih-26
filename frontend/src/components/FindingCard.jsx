import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

const SEVERITY_CONFIG = {
  CRITICAL: { cls: 'severity-critical', icon: <XCircle className="w-3 h-3" /> },
  HIGH: { cls: 'severity-high', icon: <AlertTriangle className="w-3 h-3" /> },
  MEDIUM: { cls: 'severity-medium', icon: <AlertTriangle className="w-3 h-3" /> },
  LOW: { cls: 'severity-low', icon: <Info className="w-3 h-3" /> },
}

const STATUS_CONFIG = {
  pending_review: 'status-pending',
  confirmed: 'status-confirmed',
  false_positive: 'status-false-positive',
  remediated: 'status-remediated',
}

export default function FindingCard({ finding, onConfirm, onFalsePositive, showActions = true }) {
  const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.LOW
  const statusCls = STATUS_CONFIG[finding.status] || 'status-pending'

  const statusLabel = {
    pending_review: 'Pending Review',
    confirmed: 'Confirmed',
    false_positive: 'False Positive',
    remediated: 'Remediated ✓',
  }[finding.status] || finding.status

  return (
    <div className="card hover:border-slate-600/80 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={sev.cls}>{sev.icon} {finding.severity}</span>
            <span className={statusCls}>{statusLabel}</span>
          </div>
          <h3 className="text-slate-100 font-semibold text-sm leading-snug">{finding.title}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-cyan-400">{finding.cvss_score.toFixed(1)}</div>
          <div className="text-slate-500 text-xs">CVSS v3.1</div>
        </div>
      </div>

      {/* Category & Endpoint */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 w-16 shrink-0">Category</span>
          <span className="text-cyan-300 font-mono bg-cyan-500/10 px-2 py-0.5 rounded text-xs">
            {finding.category}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 w-16 shrink-0">Endpoint</span>
          <code className="text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded text-xs truncate max-w-xs">
            {finding.endpoint}
          </code>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 w-16 shrink-0">Vector</span>
          <code className="text-slate-400 font-mono text-xs truncate">
            {finding.cvss_vector}
          </code>
        </div>
      </div>

      {/* Root Cause (truncated) */}
      <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 mb-4 border-l-2 border-slate-700 pl-3">
        {finding.root_cause}
      </p>

      {/* Actions */}
      {showActions && finding.status === 'pending_review' && (
        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => onConfirm && onConfirm(finding.id)}
            className="btn-danger text-xs py-1.5 px-3 flex-1 justify-center"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Confirm Vulnerability
          </button>
          <button
            onClick={() => onFalsePositive && onFalsePositive(finding.id)}
            className="btn-ghost text-xs py-1.5 px-3 flex-1 justify-center"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            False Positive
          </button>
        </div>
      )}
    </div>
  )
}
