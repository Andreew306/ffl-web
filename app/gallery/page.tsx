import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Eye, Heart, Share2, Calendar } from "lucide-react"
import Image from "next/image"

export default function GalleryPage() {
  const videos = [
    {
      id: 1,
      title: "Digital Kings vs Thunder Bolts - Final Épica",
      thumbnail: "/placeholder.svg?height=200&width=350",
      duration: "15:32",
      views: "2.1K",
      likes: "89",
      date: "2024-01-15",
      type: "Full Match",
      platform: "YouTube",
    },
    {
      id: 2,
      title: "Top 10 Goals of Season 5",
      thumbnail: "/placeholder.svg?height=200&width=350",
      duration: "8:45",
      views: "3.5K",
      likes: "156",
      date: "2024-01-10",
      type: "Highlights",
      platform: "YouTube",
    },
    {
      id: 3,
      title: "Live Stream - Matchday 8",
      thumbnail: "/placeholder.svg?height=200&width=350",
      duration: "2:15:20",
      views: "892",
      likes: "45",
      date: "2024-01-08",
      type: "Stream",
      platform: "Twitch",
    },
    {
      id: 4,
      title: "Interview with xXProGamerXx",
      thumbnail: "/placeholder.svg?height=200&width=350",
      duration: "12:18",
      views: "1.8K",
      likes: "72",
      date: "2024-01-05",
      type: "Interview",
      platform: "YouTube",
    },
    {
      id: 5,
      title: "Best Plays - Week 7",
      thumbnail: "/placeholder.svg?height=200&width=350",
      duration: "6:33",
      views: "2.7K",
      likes: "98",
      date: "2024-01-03",
      type: "Highlights",
      platform: "YouTube",
    },
    {
      id: 6,
      title: "Análisis Táctico - Neon Strikers",
      thumbnail: "/placeholder.svg?height=200&width=350",
      duration: "18:42",
      views: "1.2K",
      likes: "67",
      date: "2023-12-28",
      type: "Análisis",
      platform: "YouTube",
    },
  ]

  const memes = [
    {
      id: 1,
      title: "When your team is losing 3-0",
      image: "/placeholder.svg?height=300&width=300",
      likes: "234",
      comments: "45",
    },
    {
      id: 2,
      title: "El portero después de recibir 5 goles",
      image: "/placeholder.svg?height=300&width=300",
      likes: "189",
      comments: "32",
    },
    {
      id: 3,
      title: "Cuando marcas un golazo en el último minuto",
      image: "/placeholder.svg?height=300&width=300",
      likes: "312",
      comments: "67",
    },
    {
      id: 4,
      title: "Your opponent's face when you score a hat-trick",
      image: "/placeholder.svg?height=300&width=300",
      likes: "156",
      comments: "28",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <section className="py-16 bg-black/20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Explore all regular seasons, Summer Cups, and Nations Cups of the Futsal Fusion League
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Relive the best moments, highlights, and community content from FFL.
          </p>
        </div>
      </section>

      {/* Videos Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
            <Play className="mr-3 h-8 w-8 text-red-400" />
            Videos and Streams
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {videos.map((video) => (
              <Card
                key={video.id}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-500/20 hover:border-cyan-500/40 transition-all group overflow-hidden"
              >
                <div className="relative">
                  <Image
                    src={video.thumbnail || "/placeholder.svg"}
                    alt={video.title}
                    width={350}
                    height={200}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="lg" className="bg-red-600 hover:bg-red-700">
                      <Play className="mr-2 h-5 w-5" />
                      Play
                    </Button>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge variant={video.platform === "YouTube" ? "destructive" : "secondary"}>{video.platform}</Badge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="text-white font-bold mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
                    {video.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                    <Badge variant="outline">{video.type}</Badge>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-3 w-3" />
                      <span>{video.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{video.views}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4" />
                        <span>{video.likes}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Memes Section */}
      <section className="py-16 bg-black/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
            <span className="mr-3 text-3xl">😂</span>
            Community Memes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {memes.map((meme) => (
              <Card
                key={meme.id}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border-purple-500/20 hover:border-purple-500/40 transition-all group"
              >
                <div className="relative overflow-hidden">
                  <Image
                    src={meme.image || "/placeholder.svg"}
                    alt={meme.title}
                    width={300}
                    height={300}
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="text-white font-medium mb-3 text-sm line-clamp-2">{meme.title}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4 text-red-400" />
                        <span>{meme.likes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>💬</span>
                        <span>{meme.comments}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Featured Content</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Featured Video */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-xl text-cyan-400">🔥 Featured video</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Image
                    src="/placeholder.svg?height=250&width=400"
                    alt="Featured video"
                    width={400}
                    height={250}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                    <Button size="lg" className="bg-red-600 hover:bg-red-700">
                      <Play className="mr-2 h-6 w-6" />
                      Watch now
                    </Button>
                  </div>
                </div>
                <h3 className="text-white font-bold mb-2">Season 4 Final - Legendary Match</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Revive el emocionante partido final entre Digital Kings y Thunder Bolts que decidió el campeón de la
                  temporada anterior.
                </p>
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>45:23 min</span>
                  <span>15.2K views</span>
                </div>
              </CardContent>
            </Card>

            {/* Community Highlights */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-xl text-purple-400">⭐ Lo Más Popular</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
                  <div className="w-16 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded flex items-center justify-center">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium text-sm">Gol del Año - NeonMaster</h4>
                    <p className="text-gray-400 text-xs">8.9K views • hace 3 días</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
                  <div className="w-16 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded flex items-center justify-center">
                    <span className="text-white text-xs">LIVE</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium text-sm">Stream Highlights - Matchday 9</h4>
                    <p className="text-gray-400 text-xs">5.2K views • hace 1 día</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
                  <div className="w-16 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded flex items-center justify-center">
                    <span className="text-white text-lg">😂</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium text-sm">Fails Épicos - Compilación</h4>
                    <p className="text-gray-400 text-xs">12.1K views • hace 5 días</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
