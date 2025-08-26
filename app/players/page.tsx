import dbConnect from "@/lib/db/mongoose";
import Player from "@/lib/models/Player";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Función para obtener la URL de Twemoji a partir de un emoji
function getTwemojiUrl(emoji: string) {
  const codePoints = Array.from(emoji).map(c => c.codePointAt(0)?.toString(16)).join("-");
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`;
}

export default async function PlayersPage() {
  await dbConnect();

  const players = await Player.find().lean();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <section className="py-16 bg-black/20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-8">
            Jugadores
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((player) => (
              <Card key={player.player_id} className="bg-gradient-to-br from-slate-800 to-slate-900 border-teal-500/20 hover:border-teal-500/40 transition-all">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center justify-center gap-2">
                    {player.country && (
                      <img
                        src={getTwemojiUrl(player.country)}
                        alt={player.country}
                        width={24}
                        height={24}
                        className="rounded-sm"
                      />
                    )}
                    {player.playerName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-2">
                  {player.avatar ? (
                    <img
                      src={player.avatar}
                      alt={player.playerName}
                      className="mx-auto h-24 w-24 object-cover rounded-full border-2 border-teal-500 mb-4"
                    />
                  ) : (
                    <div className="mx-auto h-24 w-24 bg-slate-700 rounded-full flex items-center justify-center text-white border-2 border-teal-500 mb-4">
                      No Avatar
                    </div>
                  )}
                  <Link href={`/players/${player.player_id}`}>
                    <Button className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
                      Ver Detalles
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
