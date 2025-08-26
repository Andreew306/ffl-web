'use client'
import { useEffect, useState } from 'react'
import SeasonDetailPage from './SeasonDetailPage'

export default function DynamicSeasonPage({ seasonId }: { seasonId: string }) {
  const [seasonData, setSeasonData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/seasons/${seasonId}/api`)
        const data = await res.json()
        setSeasonData(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [seasonId])

  if (loading) return <div className="text-white text-center py-20">Cargando...</div>
  if (!seasonData) return <div className="text-white text-center py-20">Error al cargar la temporada</div>

  return <SeasonDetailPage season={seasonData} />
}
