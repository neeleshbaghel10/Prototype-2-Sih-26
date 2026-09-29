import { useEffect, useState } from 'react'
import NavBar from './components/NavBar'
import AdminView from './views/AdminView'
import AnalystView from './views/AnalystView'
import DeveloperView from './views/DeveloperView'
import LoginView from './views/LoginView'
import { useAuth } from './context/AuthContext'
import api from './api/client'

export default function App() {
  const { user } = useAuth()
  const [apiOnline, setApiOnline] = useState(null)

  // Check backend health on load
  useEffect(() => {
    api.get('/health')
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false))
  }, [])

  // Not authenticated — show gateway
  if (!user) {
    return <LoginView />
  }

  // Authenticated — render role-gated operational view
  return (
    <div className="min-h-screen bg-[#070A11]">
      <NavBar />

      {/* API Offline Banner */}
      {apiOnline === false && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 px-6 py-2 text-rose-400 text-sm text-center font-mono">
          ⚠️ Backend API is offline — start FastAPI on port 8000 to enable full functionality.
          <code className="ml-2 text-xs bg-rose-500/10 px-2 py-0.5 rounded">
            cd backend &amp;&amp; uvicorn main:app --reload
          </code>
        </div>
      )}

      {/* Role-Based View Routing — JWT-verified */}
      <main className="pb-10">
        {user.role === 'admin' && <AdminView />}
        {user.role === 'analyst' && <AnalystView />}
        {user.role === 'developer' && <DeveloperView />}

        {/* Fallback for unknown role */}
        {!['admin', 'analyst', 'developer'].includes(user.role) && (
          <div className="flex items-center justify-center h-[calc(100vh-8rem)] text-slate-600 font-mono text-sm">
            Unknown role: <span className="text-rose-400 ml-2">{user.role}</span>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 px-6 py-4 text-center">
        <p className="text-slate-700 text-xs font-mono">
          World Monitor Guard v2.4.1 · Mock Replay Engine · OWASP API Top-10 Assessment Platform ·{' '}
          <span className="text-cyan-800">For authorized security evaluation only</span>
        </p>
      </footer>
    </div>
  )
}
