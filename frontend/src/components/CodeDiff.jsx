import { Code2 } from 'lucide-react'

export default function CodeDiff({ vulnerableCode, patchedCode }) {
  const renderLines = (code, type) => {
    if (!code) return null
    return code.split('\n').map((line, i) => {
      const isComment = line.trim().startsWith('#') || line.trim().startsWith('//')
      let cls = 'text-slate-300'
      if (type === 'vulnerable') {
        if (line.includes('❌') || line.includes('VULNERABLE')) cls = 'text-rose-300 bg-rose-500/10'
        else if (isComment) cls = 'text-slate-500 italic'
      } else {
        if (line.includes('✅') || line.includes('PATCHED')) cls = 'text-emerald-300 bg-emerald-500/10'
        else if (isComment) cls = 'text-slate-500 italic'
      }
      return (
        <div key={i} className={`flex text-xs font-mono leading-5 px-1 rounded ${cls}`}>
          <span className="select-none text-slate-600 w-7 shrink-0 text-right mr-3">{i + 1}</span>
          <pre className="whitespace-pre-wrap break-words">{line}</pre>
        </div>
      )
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Vulnerable */}
      <div className="bg-slate-950 border border-rose-500/30 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/30">
          <Code2 className="w-4 h-4 text-rose-400" />
          <span className="text-rose-400 text-xs font-semibold font-mono uppercase tracking-wider">
            ❌ Vulnerable Code
          </span>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto">
          {vulnerableCode ? renderLines(vulnerableCode, 'vulnerable') : (
            <p className="text-slate-600 text-xs italic">No vulnerable code snippet available.</p>
          )}
        </div>
      </div>

      {/* Patched */}
      <div className="bg-slate-950 border border-emerald-500/30 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/30">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 text-xs font-semibold font-mono uppercase tracking-wider">
            ✅ Remediated Code
          </span>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto">
          {patchedCode ? renderLines(patchedCode, 'patched') : (
            <p className="text-slate-600 text-xs italic">No patch snippet available.</p>
          )}
        </div>
      </div>
    </div>
  )
}
