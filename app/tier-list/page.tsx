import { getServerSession } from "next-auth"
import { authOptions, syncDiscordUser } from "@/lib/auth"
import { TierListHome } from "@/components/tierlist/tierlist-home"
import { getTierListPageData } from "@/lib/services/tierlist.service"

export default async function TierListPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.discordId) {
    await syncDiscordUser(session.user.discordId, session.user.image ?? null)
  }

  const data = await getTierListPageData(session?.user?.discordId)

  return <TierListHome {...data} />
}
