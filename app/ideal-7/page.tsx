import { getServerSession } from "next-auth"
import { Ideal7Home } from "@/components/ideal7/ideal7-home"
import { authOptions, syncDiscordUser } from "@/lib/auth"
import { getIdeal7Data } from "@/lib/services/ideal7.service"

export default async function Ideal7Page() {
  const session = await getServerSession(authOptions)

  if (session?.user?.discordId) {
    await syncDiscordUser(session.user.discordId, session.user.image ?? null)
  }

  const data = await getIdeal7Data()

  return <Ideal7Home players={data.players} />
}
