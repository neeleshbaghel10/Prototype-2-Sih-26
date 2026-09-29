import { useEffect, useState } from 'react'
import { Shield, Plus, Trash2, RefreshCw, Activity, Clock, ToggleLeft, ToggleRight, AlertTriangle, CheckCircle, Server } from 'lucide-react'
import api from '../api/client'

export default function AdminView() {
  const [targets, setTargets] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [health, setHealth] = useState(null)
  const [newTarget, setNewTarget] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rateLimitOn, setRateLimitOn] = useState(true)
  const [readOnly, setReadOnly] = useState(false)

  const fetchAll = async () => {
    try {
      const [t, a, h] = await Promise.all([
        api.get('/admin/targets'),
        api.get('/admin/audit-logs'),
        api.get('/admin/health'),
      ])
      setTargets(t.data)
      setAuditLogs(a.data)
      setHealth(h.data)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const addTarget = async () => {
    if (!newTarget.trim()) return
    setLoading(true)
    setError('')
    try {
      await api.post('/admin/targets', { target_url: newTarget.trim(), is_whitelisted: true })
      setNewTarget('')
      await fetchAll()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteTarget = async (id) => {
    try {
      await api.delete(`/admin/targets/${id}`)
      await fetchAll()
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="px-6 py-3 border-b border-slate-800/80 flex items-center justify-between bg-[#0B0F19] shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-rose-400" />
          <span className="text-slate-300 text-sm font-semibold">System Telemetry &amp; Access Governance</span>
          <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-mono rounded uppercase">Admin Only</span>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-400 text-xs font-mono transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> REFRESH
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-3 flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-2 text-rose-400 text-xs font-mono">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}

      <div className="flex flex-1 min-h-0">

        {/* LEFT: Whitelist + Guardrails + Health */}
        <div className="flex-1 border-r border-slate-800/80 flex flex-col overflow-hidden">

          {/* Whitelist Controller */}
          <div className="border-b border-slate-800/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-3.5 h-3.5 text-cyan-400/60" />
              <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider">Global Whitelist Controller — Authorized Domain Nodes</span>
            </div>

            {/* Add form */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTarget()}
                placeholder="Add authorized node (e.g. staging.worldmonitor.io)"
                className="flex-1 bg-[#070A11] border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-xs font-mono placeholder-slate-800 focus:outline-none focus:border-cyan-500/40 transition-colors"
              />
              <button
                onClick={addTarget}
                disabled={loading}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-900 font-bold px-4 py-2 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> ADD NODE
              </button>
            </div>

            {/* Table */}
            <div className="overflow-auto max-h-48">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    {['NODE URL', 'CERT STATUS', 'AUTHORIZED BY', ''].map((h) => (
                      <th key={h} className="text-left text-slate-700 text-[10px] uppercase pb-2 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {targets.map((t) => (
                    <tr key={t.id} className="border-b border-slate-800/30 hover:bg-slate-900/30">
                      <td className="py-2 pr-4 text-cyan-300/80">{t.target_url}</td>
                      <td className="py-2 pr-4">
                        {t.is_whitelisted
                          ? <span className="text-emerald-400">AUTHORIZED</span>
                          : <span className="text-rose-400">BLOCKED</span>}
                      </td>
                      <td className="py-2 pr-4 text-slate-600">{t.created_by}</td>
                      <td className="py-2 text-right">
                        <button onClick={() => deleteTarget(t.id)} className="text-slate-700 hover:text-rose-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {targets.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-800 italic">No nodes registered</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Guardrail Sliders */}
          <div className="border-b border-slate-800/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-3.5 h-3.5 text-amber-400/60" />
              <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider">Guardrail Policy Controls</span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'RATE LIMITING', sub: 'Max 10 scan requests per hour per operator', on: rateLimitOn, toggle: () => setRateLimitOn(!rateLimitOn) },
                { label: 'READ-ONLY TESTING', sub: 'Prevent write operations during active scans', on: readOnly, toggle: () => setReadOnly(!readOnly) },
                { label: 'MOCK REPLAY ENGINE', sub: 'Use pre-loaded OWASP Top-10 telemetry dataset', on: true, toggle: () => {} },
              ].map(({ label, sub, on, toggle }) => (
                <div key={label} className="flex items-center justify-between p-3 bg-[#070A11] border border-slate-800/60 rounded-lg">
                  <div>
                    <p className="text-slate-400 text-xs font-mono font-semibold">{label}</p>
                    <p className="text-slate-700 text-[10px] mt-0.5">{sub}</p>
                  </div>
                  <button onClick={toggle} className="transition-colors ml-4 shrink-0">
                    {on
                      ? <ToggleRight className="w-7 h-7 text-cyan-400" />
                      : <ToggleLeft className="w-7 h-7 text-slate-700" />
                    }
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* System Health */}
          {health && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-3.5 h-3.5 text-emerald-400/60" />
                <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider">System Health Metrics</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'TOTAL SCANS', val: health.scan_jobs_total, color: 'text-cyan-400' },
                  { label: 'TOTAL FINDINGS', val: health.findings_total, color: 'text-amber-400' },
                  { label: 'AUTH NODES', val: health.whitelisted_targets, color: 'text-emerald-400' },
                  { label: 'ENGINE VER', val: `v${health.engine_version}`, color: 'text-slate-300' },
                  { label: 'RATE LIMIT', val: `${health.rate_limit_max_per_hour}/hr`, color: 'text-slate-300' },
                  { label: 'STATUS', val: health.status.toUpperCase(), color: 'text-emerald-400' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-[#070A11] border border-slate-800/60 rounded-lg p-3 text-center">
                    <div className={`text-lg font-black font-mono ${color}`}>{val}</div>
                    <div className="text-slate-700 text-[9px] uppercase mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Audit Log Feed */}
        <div className="w-80 shrink-0 flex flex-col bg-[#070A11]">
          <div className="px-4 py-3 border-b border-slate-800/60 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-slate-600 text-[10px] font-mono uppercase tracking-wider">Live Audit Log Feed</span>
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-2.5 bg-[#0B0F19] border border-slate-800/50 rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-cyan-400/70 text-[10px] font-mono font-semibold">{log.action}</span>
                  <span className="text-slate-700 text-[9px] font-mono shrink-0">{log.actor.split('@')[0]}</span>
                </div>
                {log.details && (
                  <p className="text-slate-600 text-[10px] font-mono leading-snug">{log.details}</p>
                )}
              </div>
            ))}
            {auditLogs.length === 0 && (
              <p className="text-slate-800 text-xs font-mono text-center py-8 italic">No audit events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
