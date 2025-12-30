import Link from "next/link"
import Image from "next/image"
import { Youtube, Twitch } from "lucide-react"

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
              The most competitive Haxball 7v7 esports league - FFL. Join the community and show your skill.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/competitions" className="text-gray-400 hover:text-teal-400 transition-colors block">
                Competitions
              </Link>
              <Link href="/elo" className="text-gray-400 hover:text-teal-400 transition-colors block">
                Elo
              </Link>
              <Link href="/teams" className="text-gray-400 hover:text-teal-400 transition-colors block">
                Teams
              </Link>
              <Link href="/players" className="text-gray-400 hover:text-teal-400 transition-colors block">
                Players
              </Link>
            </div>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-white font-semibold mb-4">Community</h3>
            <Link
              href="https://discord.gg/n26a4FsAtT"
              className="mt-2 inline-flex items-center gap-2 text-gray-400 hover:text-teal-400 transition-colors"
              aria-label="Discord"
            >
              <svg
                viewBox="0 0 24 24"
                role="img"
                aria-hidden="true"
                className="h-8 w-8 fill-current"
              >
                <path d="M19.54 4.27a17.77 17.77 0 0 0-4.29-1.33c-.18.33-.39.76-.54 1.1a16.9 16.9 0 0 0-4.42 0c-.15-.35-.36-.78-.54-1.1-1.49.26-2.92.72-4.29 1.33C2.9 7.6 2.23 10.85 2.5 14.05c1.64 1.21 3.22 1.95 4.77 2.44.39-.53.74-1.1 1.03-1.7-.56-.21-1.1-.46-1.62-.76.13-.1.26-.2.38-.3 3.12 1.46 6.51 1.46 9.59 0 .13.11.26.21.39.3-.52.3-1.06.55-1.62.76.29.6.63 1.17 1.03 1.7 1.55-.49 3.13-1.23 4.77-2.44.33-3.71-.57-6.93-2.39-9.78ZM8.95 13.6c-.68 0-1.23-.62-1.23-1.38s.54-1.38 1.23-1.38c.69 0 1.25.62 1.23 1.38 0 .76-.54 1.38-1.23 1.38Zm6.1 0c-.68 0-1.23-.62-1.23-1.38s.54-1.38 1.23-1.38c.69 0 1.25.62 1.23 1.38 0 .76-.54 1.38-1.23 1.38Z" />
              </svg>
              <span className="text-sm">Discord</span>
            </Link>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-white font-semibold mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <Link href="#" className="text-gray-400 hover:text-teal-400 transition-colors" aria-label="TikTok">
                <svg
                  viewBox="0 0 24 24"
                  role="img"
                  aria-hidden="true"
                  className="h-6 w-6 fill-current"
                >
                  <path d="M21 8.1c-1.7.1-3.3-.4-4.6-1.5-1.3-1.1-2.1-2.6-2.3-4.3h-3.7v11.3c0 1.4-1.1 2.5-2.5 2.5S5.4 15 5.4 13.6s1.1-2.5 2.5-2.5c.3 0 .7.1 1 .2V7.5c-.3-.1-.6-.1-1-.1-3.1 0-5.7 2.5-5.7 5.7s2.5 5.7 5.7 5.7 5.7-2.5 5.7-5.7V9.2c1.6 1.1 3.5 1.7 5.4 1.7V8.1z" />
                </svg>
              </Link>
              <Link
                href="https://www.youtube.com/@FFLHax"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-6 w-6" />
              </Link>
              <Link
                href="https://m.twitch.tv/futsalfusionleaguehax/home"
                className="text-gray-400 hover:text-teal-400 transition-colors"
                aria-label="Twitch"
              >
                <Twitch className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">© 2024 Futsal Fusion League. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
