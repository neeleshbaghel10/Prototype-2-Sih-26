import { Globe, Wifi, LogOut, Shield, Activity, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ROLE_CONFIG = {
  admin: { label: 'ADMIN', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40', dot: 'bg-rose-400' },
  analyst: { label: 'ANALYST', cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', dot: 'bg-cyan-400' },
  developer: { label: 'DEVELOPER', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400' },
}

export default function NavBar() {
  const { user, logout } = useAuth()
  const rc = ROLE_CONFIG[user?.role] || ROLE_CONFIG.analyst
  const now = new Date().toLocaleTimeString('en-US', { hour12: false })

  return (
    <header className="bg-[#0B0F19] border-b border-slate-800/80">
      {/* Top strip — live metric ribbon */}
      <div className="border-b border-slate-800/60 px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-6 text-xs font-mono text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400/80">SYSTEM STATUS: NORMAL / SECURE</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-slate-700">|</span>
            <span>NODE:</span>
            <span className="text-cyan-400/70 font-semibold">worldmonitor-core-prod</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5">
            <span className="text-slate-700">|</span>
            <Wifi className="w-3 h-3 text-emerald-400/60" />
            <span>TELEMETRY: <span className="text-emerald-400/70">4/4 CONNECTED</span></span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5">
            <span className="text-slate-700">|</span>
            <span>LATENCY: <span className="text-cyan-400/70">18ms</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-700">
          <Clock className="w-3 h-3" />
          <span>{now}</span>
        </div>
      </div>

      {/* Main nav bar */}
      <div className="px-4 md:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="leading-none">
            <span className="font-bold text-slate-100 text-sm tracking-widest uppercase">
              World Monitor
            </span>
            <p className="text-slate-600 text-[10px] font-mono tracking-wider mt-0.5 uppercase">
              Security Telemetry System
            </p>
          </div>

          {/* Demo mode badge */}
          <div className="hidden md:flex items-center gap-1.5 ml-4 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400/80 text-[10px] font-mono tracking-wider uppercase">Mock Replay</span>
          </div>
        </div>

        {/* Right: user session widget */}
        {user && (
          <div className="flex items-center gap-3">
            {/* Active scans indicator */}
            <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-600">
              <Activity className="w-3 h-3 text-emerald-400/60" />
              <span className="text-emerald-400/60">API ONLINE</span>
            </div>

            {/* Role badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-bold ${rc.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
              {rc.label}
            </div>

            {/* User info */}
            <div className="hidden sm:block text-right leading-none">
              <div className="text-slate-300 text-xs font-medium">{user.display_name}</div>
              <div className="text-slate-600 text-[10px] font-mono">{user.email}</div>
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 border border-slate-700 flex items-center justify-center">
              <span className="text-slate-300 text-xs font-bold">
                {user.display_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Sign Out */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-slate-500 hover:text-rose-400 transition-colors text-xs font-mono px-2 py-1 rounded border border-transparent hover:border-rose-500/30"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SIGN OUT</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
