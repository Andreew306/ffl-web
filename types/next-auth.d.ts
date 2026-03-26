import type { IUserRole } from "@/lib/models/User"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      discordId: string
      playerId: string | null
      discordName?: string | null
      betballCoins: number
      fantasyCoins: number
      roles: IUserRole[]
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordId?: string
    playerId?: string | null
    discordName?: string | null
    betballCoins?: number
    fantasyCoins?: number
    roles?: IUserRole[]
  }
}
