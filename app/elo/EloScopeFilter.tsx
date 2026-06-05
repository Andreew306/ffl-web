"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ListFilter } from "lucide-react"

type EloScopeOption = {
  value: string
  label: string
}

type EloScopeFilterProps = {
  selectedScope: string
  options: EloScopeOption[]
}

export function EloScopeFilter({ selectedScope, options }: EloScopeFilterProps) {
  const router = useRouter()
  const [scope, setScope] = useState(selectedScope)

  function applyFilter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    router.push(`/elo?scope=${encodeURIComponent(scope)}`, { scroll: false })
  }

  return (
    <form onSubmit={applyFilter} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <label htmlFor="elo-scope" className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400">
        <ListFilter className="h-4 w-4 text-teal-300" />
        Filter
      </label>
      <select
        id="elo-scope"
        name="scope"
        value={scope}
        onChange={(event) => setScope(event.target.value)}
        className="h-10 min-w-48 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-teal-300"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="h-10 rounded-xl bg-teal-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
      >
        Apply
      </button>
    </form>
  )
}
