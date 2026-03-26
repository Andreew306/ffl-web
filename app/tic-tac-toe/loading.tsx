export default function TicTacToeLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-[34px] border border-white/10 bg-slate-900/60 p-7">
          <div className="h-6 w-28 animate-pulse rounded-full bg-slate-800" />
          <div className="mt-5 h-12 w-72 animate-pulse rounded-2xl bg-slate-800" />
          <div className="mt-3 h-5 w-full max-w-3xl animate-pulse rounded-xl bg-slate-800" />
        </div>
      </div>
    </div>
  )
}
