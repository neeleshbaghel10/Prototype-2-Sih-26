import { useEffect, useRef, useState } from 'react'
import { Terminal, Wifi, WifiOff } from 'lucide-react'

export default function TerminalViewer({ scanId, active }) {
  const [lines, setLines] = useState([])
  const [connected, setConnected] = useState(false)
  const [done, setDone] = useState(false)
  const bottomRef = useRef(null)
  const esRef = useRef(null)

  useEffect(() => {
    if (!active || !scanId) return

    setLines([])
    setDone(false)
    setConnected(true)

    const es = new EventSource(`/api/scans/${scanId}/stream`)
    esRef.current = es

    es.onmessage = (e) => {
      const text = e.data
      if (text === '[STREAM_END]') {
        setDone(true)
        setConnected(false)
        es.close()
        return
      }
      setLines((prev) => [...prev, text])
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
    }

    return () => {
      es.close()
      setConnected(false)
    }
  }, [scanId, active])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const getLineColor = (line) => {
    if (line.includes('⚠️') || line.includes('CONFIRMED') || line.includes('QUEUED')) return 'text-amber-400'
    if (line.includes('✅') || line.includes('Complete') || line.includes('persisted')) return 'text-emerald-400'
    if (line.includes('[DONE]') || line.includes('[AI]')) return 'text-cyan-400'
    if (line.includes('[BOLA]') || line.includes('[AUTH]') || line.includes('[INJECT]') || line.includes('[DATA]') || line.includes('[CONFIG]')) return 'text-purple-400'
    if (line.includes('[DISCO]')) return 'text-blue-400'
    if (line.includes('[INIT]')) return 'text-slate-300'
    if (line.includes('──')) return 'text-slate-600'
    return 'text-slate-400'
  }

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-300 text-xs font-mono font-medium">
            wmg-scanner — scan #{scanId || '—'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500 opacity-70" />
            <div className="w-3 h-3 rounded-full bg-amber-500 opacity-70" />
            <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-70" />
          </div>
          {connected ? (
            <span className="flex items-center gap-1 text-emerald-400 text-xs">
              <Wifi className="w-3 h-3" /> Live
            </span>
          ) : done ? (
            <span className="flex items-center gap-1 text-slate-400 text-xs">
              <WifiOff className="w-3 h-3" /> Done
            </span>
          ) : (
            <span className="text-slate-600 text-xs">Idle</span>
          )}
        </div>
      </div>

      {/* Terminal Body */}
      <div className="h-72 overflow-y-auto p-4 font-mono text-xs space-y-0.5 scrollbar-thin">
        {lines.length === 0 && !connected && (
          <p className="text-slate-600 italic">Launch a scan to see live output here...</p>
        )}
        {lines.map((line, i) => (
          <div key={i} className={`terminal-line ${getLineColor(line)}`}>
            {line}
          </div>
        ))}
        {connected && (
          <div className="terminal-line text-cyan-400">
            <span className="animate-blink">█</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
