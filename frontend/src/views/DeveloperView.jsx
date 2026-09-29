import { useEffect, useState } from 'react'
import {
  Code2, RefreshCw, Play, CheckCircle, AlertTriangle,
  Loader2, X, ListChecks, ChevronRight
} from 'lucide-react'
import api from '../api/client'

const SEV_BADGE = {
  CRITICAL: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  HIGH: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  MEDIUM: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  LOW: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
}

function DiffBlock({ label, code, variant }) {
  const borderCls = variant === 'bad' ? 'border-rose-500/30' : 'border-emerald-500/30'
  const headerCls = variant === 'bad' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'

  const colorLine = (line) => {
    if (variant === 'bad' && (line.includes('❌') || line.includes('VULNERABLE'))) return 'text-rose-300 bg-rose-500/5'
    if (variant === 'good' && (line.includes('✅') || line.includes('PATCHED'))) return 'text-emerald-300 bg-emerald-500/5'
    if (line.trim().startsWith('#') || line.trim().startsWith('//')) return 'text-slate-600'
    return 'text-slate-400'
  }

  return (
    <div className={`border ${borderCls} rounded-xl overflow-hidden bg-[#070A11]`}>
      <div className={`px-3 py-2 border-b ${headerCls} text-[10px] font-mono uppercase tracking-wider font-bold`}>
        {label}
      </div>
      <div className="p-3 max-h-56 overflow-y-auto">
        {code ? code.split('\n').map((line, i) => (
          <div key={i} className={`flex text-[10px] font-mono leading-5 px-1 rounded ${colorLine(line)}`}>
            <span className="select-none text-slate-800 w-6 shrink-0 text-right mr-3 text-[9px]">{i + 1}</span>
            <pre className="whitespace-pre-wrap break-words flex-1">{line}</pre>
          </div>
        )) : <p className="text-slate-800 text-[10px] italic">No code snippet available.</p>}
      </div>
    </div>
  )
}

export default function DeveloperView() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [retesting, setRetesting] = useState({})
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [retestResult, setRetestResult] = useState(null)

  const fetch = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await api.get('/dev/tickets')
      setTickets(r.data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const triggerRetest = async (id) => {
    setRetesting((p) => ({ ...p, [id]: true }))
    setRetestResult(null)
    try {
      const r = await api.post(`/dev/tickets/${id}/retest`)
      setRetestResult(r.data)
      setTickets((p) => p.map((t) => t.id === id ? { ...t, status: 'remediated' } : t))
      if (selected?.id === id) setSelected((s) => ({ ...s, status: 'remediated' }))
    } catch (e) { setError(e.message) }
    finally { setRetesting((p) => ({ ...p, [id]: false })) }
  }

  const sevCounts = tickets.reduce((acc, t) => {
    acc[t.severity] = (acc[t.severity] || 0) + 1
    return acc
  }, {})

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="px-6 py-3 border-b border-slate-800/80 flex items-center justify-between bg-[#0B0F19] shrink-0">
        <div className="flex items-center gap-3">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 text-sm font-semibold">Remediation &amp; Patch Deck</span>
          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono rounded uppercase">Developer</span>
        </div>
        <button onClick={fetch} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-400 text-xs font-mono transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> REFRESH
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-3 flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-2 text-rose-400 text-xs font-mono">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {retestResult && (
        <div className="mx-6 mt-3 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5 text-emerald-400 text-xs font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{retestResult.message}</span>
          </div>
          <button onClick={() => setRetestResult(null)}><X className="w-3.5 h-3.5 opacity-60" /></button>
        </div>
      )}

      {/* Severity strip */}
      <div className="flex shrink-0 border-b border-slate-800/60 bg-[#070A11]">
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
          <div key={sev} className="flex-1 flex items-center justify-between px-4 py-2.5 border-r border-slate-800/60 last:border-r-0">
            <span className="text-slate-700 text-[10px] font-mono">{sev}</span>
            <span className={`text-xl font-black font-mono ${
              sev === 'CRITICAL' ? 'text-rose-400' : sev === 'HIGH' ? 'text-amber-400' : sev === 'MEDIUM' ? 'text-yellow-400' : 'text-cyan-400'
            }`}>{sevCounts[sev] || 0}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* LEFT: Ticket queue */}
        <div className="w-72 shrink-0 border-r border-slate-800/80 flex flex-col bg-[#0B0F19]">
          <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center gap-2">
            <ListChecks className="w-3.5 h-3.5 text-emerald-400/60" />
            <span className="text-slate-600 text-[10px] font-mono uppercase tracking-wider">
              Vulnerability Queue ({tickets.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-700 text-xs font-mono gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 text-slate-800 text-xs font-mono italic px-4">
                No confirmed tickets — triage findings in the Analyst view first.
              </div>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelected(selected?.id === ticket.id ? null : ticket)}
                  className={`w-full text-left p-3.5 border-b border-slate-800/40 transition-all ${
                    selected?.id === ticket.id
                      ? 'bg-cyan-500/5 border-l-2 border-l-cyan-500/50'
                      : 'hover:bg-slate-900/40 border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${SEV_BADGE[ticket.severity] || ''}`}>
                      {ticket.severity}
                    </span>
                    <span className={`text-[10px] font-mono ${ticket.status === 'remediated' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {ticket.status === 'remediated' ? 'REMEDIATED' : 'OPEN'}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs font-medium leading-snug mb-1">{ticket.title}</p>
                  <code className="text-amber-400/50 text-[10px] truncate block">{ticket.endpoint}</code>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Detail drawer */}
        <div className="flex-1 overflow-y-auto bg-[#070A11]">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <Code2 className="w-12 h-12 text-slate-800 mb-4" />
              <p className="text-slate-700 text-sm font-mono">Select a vulnerability ticket to view the patch deck</p>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {/* Title + status */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${SEV_BADGE[selected.severity] || ''}`}>
                      {selected.severity}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      selected.status === 'remediated'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {selected.status === 'remediated' ? 'REMEDIATED (VERIFIED)' : 'OPEN — AWAITING PATCH'}
                    </span>
                  </div>
                  <h3 className="text-slate-100 font-bold text-lg leading-snug">{selected.title}</h3>
                  <p className="text-slate-600 text-xs font-mono mt-1">
                    {selected.category} · CVSS {selected.cvss_score.toFixed(1)} ·{' '}
                    <code className="text-amber-400/60">{selected.endpoint}</code>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-3xl font-black text-cyan-400 leading-none">{selected.cvss_score.toFixed(1)}</div>
                  <div className="text-slate-700 text-[10px] font-mono">CVSS v3.1</div>
                </div>
              </div>

              {/* Root cause */}
              <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-4">
                <p className="text-slate-600 text-[10px] font-mono uppercase tracking-wider mb-2">Root Cause Analysis (AI)</p>
                <p className="text-slate-400 text-sm leading-relaxed border-l-2 border-cyan-500/30 pl-3">{selected.root_cause}</p>
              </div>

              {/* Code diff */}
              <div>
                <p className="text-slate-600 text-[10px] font-mono uppercase tracking-wider mb-2">Patch Comparison — Interactive Code Diff Inspector</p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <DiffBlock label="❌  Vulnerable Source" code={selected.vulnerable_code} variant="bad" />
                  <DiffBlock label="✅  Synthesized Secure Patch" code={selected.patched_code} variant="good" />
                </div>
              </div>

              {/* Remediation steps */}
              <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-4">
                <p className="text-slate-600 text-[10px] font-mono uppercase tracking-wider mb-3">Remediation Procedure</p>
                <div className="space-y-1">
                  {selected.suggested_patch.split('\n').filter(Boolean).map((line, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-mono text-slate-400">
                      <ChevronRight className="w-3 h-3 text-cyan-400/40 shrink-0 mt-0.5" />
                      <span>{line.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Retest action */}
              {selected.status !== 'remediated' ? (
                <button
                  onClick={() => triggerRetest(selected.id)}
                  disabled={retesting[selected.id]}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold py-3 rounded-xl text-sm font-mono transition-all flex items-center justify-center gap-2"
                >
                  {retesting[selected.id] ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Running Targeted Verification Retest...</>
                  ) : (
                    <><Play className="w-4 h-4" />Trigger Targeted Verification Retest</>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-4">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-emerald-400 font-bold text-sm font-mono">REMEDIATED · VERIFIED</p>
                    <p className="text-emerald-300/50 text-xs font-mono mt-0.5">Endpoint re-tested — vulnerability is no longer exploitable.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
