import { Printer, X, Shield, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'

const SEV_COLOR = {
  CRITICAL: 'text-rose-500',
  HIGH: 'text-amber-500',
  MEDIUM: 'text-yellow-500',
  LOW: 'text-cyan-500',
}

const SEV_BG = {
  CRITICAL: 'bg-rose-500/20 border-rose-500/40',
  HIGH: 'bg-amber-500/20 border-amber-500/40',
  MEDIUM: 'bg-yellow-500/20 border-yellow-500/40',
  LOW: 'bg-cyan-500/20 border-cyan-500/40',
}

export default function ExecutiveReport({ data, onClose }) {
  if (!data) return null

  const { scan, executive_summary: summary, findings, owasp_mapping } = data
  const riskColor =
    summary.risk_level === 'CRITICAL' ? 'text-rose-400 border-rose-500/40 bg-rose-500/10' :
    summary.risk_level === 'HIGH' ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' :
    'text-yellow-400 border-yellow-500/40 bg-yellow-500/10'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/90 backdrop-blur-md overflow-y-auto p-4 md:p-10 no-print">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl print:shadow-none print:border-none print:bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-700 no-print">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-slate-100 font-bold text-lg">Executive Compliance Report</h2>
              <p className="text-slate-500 text-xs">World Monitor Guard | DevSecOps Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="btn-primary text-sm"
            >
              <Printer className="w-4 h-4" /> Print / Export PDF
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8 print:text-black">
          {/* Print Header (only in print) */}
          <div className="hidden print:block mb-8">
            <h1 className="text-3xl font-bold text-black mb-1">Executive Security Report</h1>
            <p className="text-gray-600">World Monitor Guard — DevSecOps Assessment Platform</p>
            <p className="text-gray-500 text-sm">Generated: {new Date(data.report_generated_at).toLocaleString()}</p>
            <hr className="my-4" />
          </div>

          {/* Scan Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Target', value: scan.target_url },
              { label: 'Scan Type', value: scan.scan_type.toUpperCase() },
              { label: 'Status', value: scan.status.toUpperCase() },
              { label: 'Completed', value: scan.completed_at ? new Date(scan.completed_at).toLocaleString() : 'N/A' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/40 print:border-gray-200 print:bg-white">
                <p className="text-slate-500 text-xs print:text-gray-500 mb-1">{label}</p>
                <p className="text-slate-100 font-semibold print:text-black truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Risk Score + Severity Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Risk */}
            <div className={`card flex flex-col items-center justify-center py-8 border ${riskColor}`}>
              <div className="text-5xl font-black mb-2 print:text-black">
                {summary.max_cvss_score.toFixed(1)}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Max CVSS Score</div>
              <div className={`mt-3 px-4 py-1 rounded-full border text-sm font-bold ${riskColor}`}>
                {summary.risk_level} RISK
              </div>
            </div>

            {/* Severity Breakdown */}
            <div className="md:col-span-2 card">
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4 print:text-gray-600">
                Severity Breakdown
              </h3>
              <div className="space-y-3">
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => {
                  const count = summary.severity_breakdown[sev] || 0
                  const pct = summary.total_findings > 0 ? (count / summary.total_findings) * 100 : 0
                  return (
                    <div key={sev}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={`font-semibold ${SEV_COLOR[sev]}`}>{sev}</span>
                        <span className="text-slate-400">{count} finding{count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden print:bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            sev === 'CRITICAL' ? 'bg-rose-500' :
                            sev === 'HIGH' ? 'bg-amber-500' :
                            sev === 'MEDIUM' ? 'bg-yellow-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 text-xs">Avg CVSS</span>
                  <p className="text-cyan-400 font-bold text-xl">{summary.average_cvss_score.toFixed(1)}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Total Findings</span>
                  <p className="text-slate-100 font-bold text-xl">{summary.total_findings}</p>
                </div>
              </div>
            </div>
          </div>

          {/* OWASP Compliance Mapping */}
          <div className="card">
            <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              OWASP API Top-10 Compliance Mapping
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(owasp_mapping).map(([category, titles]) => (
                <div key={category} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 print:border-gray-200">
                  <p className="text-cyan-400 text-xs font-semibold font-mono mb-2 print:text-blue-700">{category}</p>
                  <ul className="space-y-1">
                    {titles.map((t, i) => (
                      <li key={i} className="text-slate-400 text-xs flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Findings Table */}
          <div className="card">
            <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Itemized Findings & Remediation Table
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm print:text-xs">
                <thead>
                  <tr className="border-b border-slate-700/60 print:border-gray-200">
                    {['#', 'Title', 'Category', 'Severity', 'CVSS', 'Endpoint', 'Status'].map((h) => (
                      <th key={h} className="text-left text-slate-500 font-medium pb-2 pr-3 text-xs print:text-gray-600">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {findings.map((f, i) => (
                    <tr key={f.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 print:border-gray-100">
                      <td className="py-2.5 pr-3 text-slate-500 text-xs">{i + 1}</td>
                      <td className="py-2.5 pr-3 text-slate-200 font-medium max-w-xs">
                        <div className="truncate">{f.title}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <code className="text-cyan-300 text-xs">{f.category.split(':')[0]}</code>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`text-xs font-bold ${SEV_COLOR[f.severity]}`}>{f.severity}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-200 font-mono text-xs">{f.cvss_score.toFixed(1)}</td>
                      <td className="py-2.5 pr-3">
                        <code className="text-amber-300/80 text-xs truncate max-w-[140px] block">{f.endpoint}</code>
                      </td>
                      <td className="py-2.5">
                        <span className={
                          f.status === 'remediated' ? 'status-remediated' :
                          f.status === 'confirmed' ? 'status-confirmed' :
                          f.status === 'false_positive' ? 'status-false-positive' : 'status-pending'
                        }>
                          {f.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-slate-600 text-xs pt-4 border-t border-slate-800 print:border-gray-200 print:text-gray-400">
            <p>World Monitor Guard v2.4.1 — Confidential Security Assessment Report</p>
            <p>Generated: {new Date(data.report_generated_at).toLocaleString()} UTC · For authorized personnel only</p>
          </div>
        </div>
      </div>
    </div>
  )
}
