import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    "https://www.tsekaluk.dev",
    "https://tsekaluk.dev",
  ].filter((v): v is string => Boolean(v)),
  database: prisma
    ? prismaAdapter(prisma, {
        provider: "postgresql",
      })
    : undefined!,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "linuxdo",
          discoveryUrl: undefined,
          authorizationUrl: "https://connect.linux.do/oauth2/authorize",
          tokenUrl: "https://connect.linux.do/oauth2/token",
          userInfoUrl: "https://connect.linux.do/api/user",
          clientId: process.env.LINUXDO_ID!,
          clientSecret: process.env.LINUXDO_SECRET!,
          scopes: [],
          mapProfileToUser: (profile) => ({
            name: (profile.name as string | null) ?? (profile.username as string) ?? "User",
            image: profile.avatar_url as string | undefined,
            // Linux DO does not expose email
          }),
        },
      ],
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
