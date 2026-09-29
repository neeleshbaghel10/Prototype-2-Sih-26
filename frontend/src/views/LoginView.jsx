import { useState } from 'react'
import { Shield, Globe, Lock, ChevronRight, Loader2, AlertTriangle, Wifi } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const DEMO_ACCOUNTS = [
  {
    role: 'admin',
    label: 'Admin',
    email: 'admin@worldmonitor.io',
    password: 'Admin@WM2026!',
    color: 'border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300',
    dot: 'bg-rose-400',
    desc: 'Governance & Telemetry Control',
  },
  {
    role: 'analyst',
    label: 'Security Analyst',
    email: 'analyst@worldmonitor.io',
    password: 'Analyst@WM2026!',
    color: 'border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300',
    dot: 'bg-cyan-400',
    desc: 'Operations Room & Threat Triage',
  },
  {
    role: 'developer',
    label: 'Developer',
    email: 'developer@worldmonitor.io',
    password: 'Dev@WM2026!',
    color: 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300',
    dot: 'bg-emerald-400',
    desc: 'Remediation & Patch Deck',
  },
]

export default function LoginView() {
  const { login, loading, authError, setAuthError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [quickLogging, setQuickLogging] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')
    await login(email, password)
  }

  const quickLogin = async (account) => {
    setQuickLogging(account.role)
    setAuthError('')
    try {
      await login(account.email, account.password)
    } catch {}
    setQuickLogging(null)
  }

  return (
    <div className="min-h-screen bg-[#070A11] flex flex-col items-center justify-center relative overflow-hidden">

      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#06B6D4 1px, transparent 1px), linear-gradient(90deg, #06B6D4 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header strip */}
      <div className="absolute top-0 left-0 right-0 h-10 flex items-center px-6 border-b border-slate-800/80 bg-[#0B0F19]/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>WORLD MONITOR SECURITY TELEMETRY SYSTEM</span>
          <span className="mx-3 text-slate-800">|</span>
          <Wifi className="w-3 h-3" />
          <span>4/4 NODES CONNECTED</span>
          <span className="mx-3 text-slate-800">|</span>
          <span>LATENCY: 18ms</span>
        </div>
      </div>

      {/* Main login card */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-4">
            <Globe className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">WORLD MONITOR</h1>
          <p className="text-cyan-400/80 text-xs font-mono tracking-widest uppercase mt-1">
            Security Telemetry System — Gateway
          </p>
        </div>

        {/* Auth error */}
        {authError && (
          <div className="mb-4 flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-rose-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Manual Login form */}
        <div className="bg-[#111827]/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm mb-4">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">Operator Authentication</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-slate-500 text-xs font-mono mb-1.5 block">ACCESS EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@worldmonitor.io"
                className="w-full bg-[#0B0F19] border border-slate-700/60 rounded-lg px-3 py-2.5 text-slate-100 text-sm font-mono placeholder-slate-700 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs font-mono mb-1.5 block">PASSPHRASE</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0B0F19] border border-slate-700/60 rounded-lg px-3 py-2.5 text-slate-100 text-sm font-mono placeholder-slate-700 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              {loading ? 'Authenticating...' : 'Authenticate'}
            </button>
          </form>
        </div>

        {/* Quick-access demo buttons */}
        <div className="bg-[#111827]/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-amber-500/70" />
            <span className="text-slate-500 text-xs font-mono uppercase tracking-wider">Demo Quick Access — RBAC Test</span>
          </div>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((acct) => (
              <button
                key={acct.role}
                onClick={() => quickLogin(acct)}
                disabled={loading || !!quickLogging}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${acct.color}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${acct.dot} ${quickLogging === acct.role ? 'animate-pulse' : ''}`} />
                  <div className="text-left">
                    <div className="font-semibold text-sm">{acct.label}</div>
                    <div className="text-xs opacity-60 font-mono">{acct.desc}</div>
                  </div>
                </div>
                {quickLogging === acct.role ? (
                  <Loader2 className="w-4 h-4 animate-spin opacity-70" />
                ) : (
                  <ChevronRight className="w-4 h-4 opacity-50" />
                )}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-slate-700 text-xs font-mono mt-6">
          WMG v2.4.1 · CLASSIFIED SYSTEM · AUTHORIZED ACCESS ONLY
        </p>
      </div>
    </div>
  )
}
