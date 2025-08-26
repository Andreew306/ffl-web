import Link from "next/link"
import Image from "next/image"
import { Twitter, Youtube, Twitch } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-teal-500/20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Image
                src="/ffl-logo.png"
                alt="FFL Logo"
                width={40}
                height={40}
                className="rounded-full border-2 border-teal-400"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-teal-400 to-white bg-clip-text text-transparent">
                Futsal Fusion League
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              La liga de eSports más competitiva de Haxball 7v7 - FFL. Únete a la comunidad y demuestra tu habilidad.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Enlaces Rápidos</h3>
            <div className="space-y-2">
              <Link href="/seasons" className="text-gray-400 hover:text-teal-400 transition-colors block">
                Temporadas
              </Link>
              <Link href="/teams" className="text-gray-400 hover:text-teal-400 transition-colors block">
                Equipos
              </Link>
              <Link href="/leaderboard" className="text-gray-400 hover:text-teal-400 transition-colors block">
                Clasificación
              </Link>
              <Link href="/players" className="text-gray-400 hover:text-teal-400 transition-colors block">
                Jugadores
              </Link>
            </div>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-white font-semibold mb-4">Comunidad</h3>
            <div className="space-y-2">
              <Link href="/news" className="text-gray-400 hover:text-teal-400 transition-colors block">
                Noticias
              </Link>
              <Link href="/gallery" className="text-gray-400 hover:text-teal-400 transition-colors block">
                Galería
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-teal-400 transition-colors block">
                Contacto
              </Link>
              <Link href="/rules" className="text-gray-400 hover:text-teal-400 transition-colors block">
                Reglamento
              </Link>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-white font-semibold mb-4">Síguenos</h3>
            <div className="flex space-x-4">
              <Link href="#" className="text-gray-400 hover:text-teal-400 transition-colors">
                <Twitter className="h-6 w-6" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                <Youtube className="h-6 w-6" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-teal-400 transition-colors">
                <Twitch className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">© 2024 Futsal Fusion League. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
