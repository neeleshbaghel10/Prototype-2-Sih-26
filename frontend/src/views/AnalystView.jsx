import { useEffect, useState, useRef } from 'react'
import {
  Zap, RefreshCw, AlertTriangle, Loader2, FileText,
  CheckCircle, XCircle, ChevronRight, Terminal, Search, Eye
} from 'lucide-react'
import api from '../api/client'
import ExecutiveReport from '../components/ExecutiveReport'

const SCAN_PROFILES = [
  { value: 'full', label: 'Full OWASP API Top-10' },
  { value: 'quick', label: 'Quick Auth + BOLA Scan' },
  { value: 'injection', label: 'Injection Surface Scan' },
  { value: 'config', label: 'Configuration Audit' },
]

const SEV_BADGE = {
  CRITICAL: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  HIGH: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  MEDIUM: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  LOW: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
}

const STATUS_BADGE = {
  pending_review: 'bg-slate-700/60 text-slate-400',
  confirmed: 'bg-amber-500/20 text-amber-400',
  false_positive: 'bg-slate-700/60 text-slate-500 line-through',
  remediated: 'bg-emerald-500/20 text-emerald-400',
}

function getLineColor(line) {
  if (line.includes('CONFIRMED') || line.includes('QUEUED') || line.includes('⚠')) return 'text-amber-400'
  if (line.includes('Complete') || line.includes('persisted') || line.includes('✅')) return 'text-emerald-400'
  if (line.includes('[DONE]') || line.includes('[AI]')) return 'text-cyan-400'
  if (line.includes('[BOLA]') || line.includes('[AUTH]') || line.includes('[INJECT]') || line.includes('[DATA]') || line.includes('[CONFIG]')) return 'text-violet-400'
  if (line.includes('[DISCO]')) return 'text-blue-400'
  if (line.includes('──')) return 'text-slate-800'
  return 'text-slate-500'
}

export default function AnalystView() {
  const [targetUrl, setTargetUrl] = useState('http://localhost:8000')
  const [scanProfile, setScanProfile] = useState('full')
  const [currentScan, setCurrentScan] = useState(null)
  const [findings, setFindings] = useState([])
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [selected, setSelected] = useState(null)
  const [termLines, setTermLines] = useState([])
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const esRef = useRef(null)

  useEffect(() => {
    api.get('/findings').then((r) => setFindings(r.data)).catch(() => {})
  }, [])

  // Poll scan status
  useEffect(() => {
    if (!currentScan || ['completed', 'failed'].includes(currentScan.status)) return
    const iv = setInterval(async () => {
      try {
        const r = await api.get(`/scans/${currentScan.id}/status`)
        setCurrentScan(r.data)
        if (['completed', 'failed'].includes(r.data.status)) {
          clearInterval(iv)
          setStreaming(false)
          if (esRef.current) { esRef.current.close(); esRef.current = null }
          const fr = await api.get(`/scans/${r.data.id}/findings`)
          setFindings(fr.data)
        }
      } catch {}
    }, 1500)
    return () => clearInterval(iv)
  }, [currentScan?.id, currentScan?.status])

  // Auto-scroll terminal
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [termLines])

  const launchScan = async () => {
    setError('')
    setLaunching(true)
    setTermLines([])
    setSelected(null)
    if (esRef.current) { esRef.current.close(); esRef.current = null }

    try {
      const r = await api.post('/scans/launch', { target_url: targetUrl, scan_type: scanProfile })
      setCurrentScan(r.data)
      setStreaming(true)

      const token = localStorage.getItem('wmg_token')
      const es = new EventSource(`/api/scans/${r.data.id}/stream?token=${token}`)
      esRef.current = es

      es.onmessage = (e) => {
        if (e.data === '[STREAM_END]') {
          setStreaming(false)
          es.close()
          esRef.current = null
          return
        }
        setTermLines((prev) => [...prev, e.data])
      }
      es.onerror = () => { setStreaming(false); es.close(); esRef.current = null }
    } catch (e) {
      setError(e.message)
    } finally {
      setLaunching(false)
    }
  }

  const triage = async (id, decision) => {
    try {
      await api.post(`/findings/${id}/triage`, { decision })
      const update = (list) => list.map((f) =>
        f.id === id ? { ...f, status: decision === 'confirm' ? 'confirmed' : 'false_positive' } : f
      )
      setFindings(update)
      if (selected?.id === id) setSelected((s) => ({ ...s, status: decision === 'confirm' ? 'confirmed' : 'false_positive' }))
    } catch (e) { setError(e.message) }
  }

  const openReport = async (scanId) => {
    try {
      const r = await api.get(`/reports/${scanId}/export`)
      setReportData(r.data)
      setShowReport(true)
    } catch (e) { setError(e.message) }
  }

  const scanId = currentScan?.id || findings[0]?.scan_id
  const progress = currentScan?.progress_percentage ?? 0
  const isRunning = ['queued', 'running'].includes(currentScan?.status)

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Top error bar */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-2.5 text-rose-400 text-xs font-mono">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><XCircle className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Main 3-panel layout */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* ── LEFT PANEL: Target Control ─────────────────────────────────── */}
        <div className="w-64 shrink-0 border-r border-slate-800/80 bg-[#0B0F19] flex flex-col">
          {/* Panel header */}
          <div className="px-4 py-3 border-b border-slate-800/60 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">Target Control</span>
          </div>

          <div className="p-4 flex flex-col gap-3 flex-1">
            <div>
              <label className="text-slate-600 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Node URL</label>
              <input
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full bg-[#070A11] border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-xs font-mono placeholder-slate-700 focus:outline-none focus:border-cyan-500/40 transition-colors"
                placeholder="http://target:8000"
              />
            </div>

            <div>
              <label className="text-slate-600 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Scan Profile</label>
              <select
                value={scanProfile}
                onChange={(e) => setScanProfile(e.target.value)}
                className="w-full bg-[#070A11] border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-500/40 transition-colors"
              >
                {SCAN_PROFILES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={launchScan}
              disabled={launching || isRunning}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              {launching || isRunning
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running...</>
                : <><Zap className="w-3.5 h-3.5" />Launch Assessment</>
              }
            </button>

            {/* Progress */}
            {currentScan && (
              <div className="mt-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
                  <span>SCAN #{currentScan.id}</span>
                  <span className={
                    currentScan.status === 'completed' ? 'text-emerald-400' :
                    currentScan.status === 'failed' ? 'text-rose-400' : 'text-amber-400'
                  }>{currentScan.status.toUpperCase()}</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-right text-[10px] font-mono text-slate-700 mt-0.5">{progress.toFixed(0)}%</div>
              </div>
            )}

            <div className="mt-auto pt-3 border-t border-slate-800/60 space-y-2">
              {/* Stats */}
              {[
                { label: 'FINDINGS', val: findings.length, color: 'text-amber-400' },
                { label: 'CRITICAL', val: findings.filter(f => f.severity === 'CRITICAL').length, color: 'text-rose-400' },
                { label: 'CONFIRMED', val: findings.filter(f => f.status === 'confirmed').length, color: 'text-amber-400' },
                { label: 'REMEDIATED', val: findings.filter(f => f.status === 'remediated').length, color: 'text-emerald-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-700">{label}</span>
                  <span className={`font-bold ${color}`}>{val}</span>
                </div>
              ))}

              {scanId && (
                <button
                  onClick={() => openReport(scanId)}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 text-slate-500 hover:text-cyan-400 border border-slate-800 hover:border-cyan-500/30 rounded-lg py-2 text-[10px] font-mono uppercase tracking-wider transition-colors"
                >
                  <FileText className="w-3 h-3" /> Export Report
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── CENTER PANELS ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Center-Top: Terminal */}
          <div className="h-56 border-b border-slate-800/80 bg-[#070A11] flex flex-col">
            <div className="px-4 py-2 border-b border-slate-800/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400/60" />
                <span className="text-slate-600 text-[10px] font-mono uppercase tracking-wider">
                  Live Probe Terminal {currentScan ? `— scan #${currentScan.id}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex gap-1`}>
                  {['bg-rose-500/60', 'bg-amber-500/60', 'bg-emerald-500/60'].map((c, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${c}`} />
                  ))}
                </div>
                {streaming && <span className="text-emerald-400 text-[10px] font-mono animate-pulse">LIVE</span>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-0.5">
              {termLines.length === 0 && !streaming && (
                <span className="text-slate-800 italic">Awaiting scan launch...</span>
              )}
              {termLines.map((line, i) => (
                <div key={i} className={getLineColor(line)}>{line}</div>
              ))}
              {streaming && <div className="text-cyan-400 animate-pulse">█</div>}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Center-Bottom: Findings Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0B0F19] border-b border-slate-800/80">
                  {['#', 'SEV', 'CATEGORY', 'TITLE', 'ENDPOINT', 'CVSS', 'STATUS', 'ACTIONS'].map((h) => (
                    <th key={h} className="text-left text-slate-700 font-semibold uppercase tracking-wider px-3 py-2.5 text-[10px] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {findings.map((f, i) => (
                  <tr
                    key={f.id}
                    onClick={() => setSelected(f)}
                    className={`border-b border-slate-800/40 cursor-pointer transition-colors ${
                      selected?.id === f.id ? 'bg-cyan-500/5 border-l-2 border-l-cyan-500/40' : 'hover:bg-slate-900/40'
                    }`}
                  >
                    <td className="px-3 py-2 text-slate-700">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${SEV_BADGE[f.severity] || ''}`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-cyan-400/70 max-w-[120px]">
                      <span className="truncate block">{f.category.split(':')[0]}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-300 max-w-[200px]">
                      <span className="truncate block">{f.title}</span>
                    </td>
                    <td className="px-3 py-2 text-amber-400/70 max-w-[160px]">
                      <code className="truncate block">{f.endpoint}</code>
                    </td>
                    <td className="px-3 py-2 text-slate-300 font-bold">{f.cvss_score.toFixed(1)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${STATUS_BADGE[f.status] || 'text-slate-500'}`}>
                        {f.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {f.status === 'pending_review' && (
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => triage(f.id, 'confirm')}
                            className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded text-[10px] transition-colors"
                          >Verify</button>
                          <button
                            onClick={() => triage(f.id, 'false_positive')}
                            className="px-2 py-0.5 bg-slate-700/40 hover:bg-slate-700/70 border border-slate-700 text-slate-500 rounded text-[10px] transition-colors"
                          >Discard</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {findings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-700 italic">
                      No findings — launch a scan to populate telemetry
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT PANEL: Finding Inspector ───────────────────────────── */}
        <div className="w-72 shrink-0 border-l border-slate-800/80 bg-[#0B0F19] flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800/60 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider">Finding Inspector</span>
          </div>

          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <Search className="w-8 h-8 text-slate-800 mb-3" />
              <p className="text-slate-700 text-xs font-mono">Select a row to inspect</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
              {/* Severity + CVSS */}
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${SEV_BADGE[selected.severity] || ''}`}>
                  {selected.severity}
                </span>
                <div className="text-right">
                  <div className="text-cyan-400 text-2xl font-black leading-none">{selected.cvss_score.toFixed(1)}</div>
                  <div className="text-slate-700 text-[10px]">CVSS v3.1</div>
                </div>
              </div>

              <div>
                <p className="text-slate-200 font-semibold leading-snug text-[11px]">{selected.title}</p>
                <p className="text-cyan-400/60 mt-1">{selected.category}</p>
              </div>

              {/* CVSS Vector */}
              <div className="bg-[#070A11] border border-slate-800 rounded p-2">
                <p className="text-slate-700 text-[9px] uppercase mb-1">CVSS VECTOR</p>
                <code className="text-cyan-300/70 text-[10px] break-all">{selected.cvss_vector}</code>
              </div>

              {/* Endpoint */}
              <div className="bg-[#070A11] border border-slate-800 rounded p-2">
                <p className="text-slate-700 text-[9px] uppercase mb-1">ENDPOINT</p>
                <code className="text-amber-300/80 text-[10px] break-all">{selected.endpoint}</code>
              </div>

              {/* Raw trace */}
              <div className="bg-[#070A11] border border-slate-800 rounded p-2">
                <p className="text-slate-700 text-[9px] uppercase mb-1">RAW HTTP TRACE</p>
                <pre className="text-slate-500 text-[10px] whitespace-pre-wrap break-words">{selected.raw_trace}</pre>
              </div>

              {/* Root cause */}
              <div>
                <p className="text-slate-700 text-[9px] uppercase mb-1">ROOT CAUSE (AI)</p>
                <p className="text-slate-400 text-[10px] leading-relaxed">{selected.root_cause}</p>
              </div>

              {/* Safe PoC / patch steps */}
              <div>
                <p className="text-slate-700 text-[9px] uppercase mb-1">REMEDIATION STEPS</p>
                <div className="space-y-0.5">
                  {selected.suggested_patch.split('\n').filter(Boolean).map((l, i) => (
                    <p key={i} className="text-slate-500 text-[10px]">{l}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showReport && reportData && (
        <ExecutiveReport data={reportData} onClose={() => setShowReport(false)} />
      )}
    </div>
  )
}
