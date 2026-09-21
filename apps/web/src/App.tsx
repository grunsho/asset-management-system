export function App() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-slate-900 text-white'>
      <div className='p-8 max-w-md bg-slate-800 rounded-xl shadow-2xl border border-slate-700 text-center'>
        <div className='inline-block p-3 bg-sky-500/10 text-sky-400 rounded-lg mb-4'>
          ⚙️
        </div>
        <h1 className='text-2xl font-bold tracking-tight mb-2'>
          Physical Asset Management
        </h1>
        <p className='text-slate-400 text-sm mb-6'>
          Plataforma de gestión de activos y monitoreo en tiempo real.
        </p>
        <div className='inline-flex items-center gap-2 text-xs font-mono bg-slate-900 px-3 py-1.5 rounded-md border border-slate-700 text-emerald-400'>
          <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse'></span>
          Frontend Inicializado (React 19 + Tailwind)
        </div>
      </div>
    </div>
  )
}
