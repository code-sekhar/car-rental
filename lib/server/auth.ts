import "server-only";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "./db";
import { authAdapter } from "./auth-adapter";
import { authenticateCredentials } from "./accounts";
import { hashToken, newToken, secret, InputError } from "./security";
export const authOptions: NextAuthOptions = {
  secret: secret(),
  adapter: authAdapter,
  session: { strategy: "jwt", maxAge: 7 * 24 * 3600 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          return await authenticateCredentials(credentials);
        } catch (error) {
          if (error instanceof InputError) return null;
          console.error("[auth] Credential service unavailable");
          return null;
        }
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (
        account?.provider === "google" &&
        !(profile as { email_verified?: boolean })?.email_verified
      )
        return false;
      const existing = user.email
        ? await db.user.findUnique({
            where: { email: user.email.toLowerCase() },
            select: { disabledAt: true },
          })
        : null;
      return !existing?.disabledAt;
    },
    async jwt({ token, user, account, profile }) {
      if (
        user &&
        account?.provider === "google" &&
        (profile as { email_verified?: boolean })?.email_verified
      )
        await db.user.updateMany({
          where: { id: user.id, disabledAt: null, emailVerified: null },
          data: { emailVerified: new Date() },
        });
      if (user) {
        const current = await db.user.findUnique({
          where: { id: user.id },
          select: { id: true, disabledAt: true, emailVerified: true },
        });
        if (!current || current.disabledAt || !current.emailVerified)
          return { ...token, invalid: true };
        const sessionKey = newToken();
        await db.$transaction([
          db.session.create({
            data: {
              userId: current.id,
              sessionToken: hashToken(sessionKey),
              expires: new Date(Date.now() + 7 * 86400000),
            },
          }),
          db.auditLog.create({
            data: {
              userId: current.id,
              action: "SIGNED_IN",
              entityType: "Session",
            },
          }),
        ]);
        token.sessionKey = sessionKey;
      }
      const session = token.sessionKey
        ? await db.session.findUnique({
            where: { sessionToken: hashToken(token.sessionKey) },
            include: {
              user: {
                select: {
                  id: true,
                  role: true,
                  email: true,
                  name: true,
                  image: true,
                  disabledAt: true,
                  emailVerified: true,
                },
              },
            },
          })
        : null;
      if (
        !session ||
        session.expires.getTime() <= Date.now() ||
        session.user.disabledAt ||
        !session.user.emailVerified
      )
        return { ...token, invalid: true, userId: undefined, role: undefined };
      return {
        ...token,
        invalid: false,
        userId: session.user.id,
        role: session.user.role,
        email: session.user.email,
        name: session.user.name,
        picture: session.user.image,
      };
    },
    async session({ session, token }) {
      if (token.invalid || !token.userId || !token.role)
        return { expires: new Date(0).toISOString() };
      session.user = {
        ...session.user,
        id: token.userId,
        role: token.role,
        email: token.email,
        name: token.name,
        image: token.picture,
      };
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/") && !url.startsWith("//"))
        return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {}
      return `${baseUrl}/dashboard`;
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.sessionKey)
        await db.session.deleteMany({
          where: { sessionToken: hashToken(token.sessionKey) },
        });
    },
  },
  logger: {
    error(code) {
      console.error("[auth]", code);
    },
    warn(code) {
      console.warn("[auth]", code);
    },
    debug() {},
  },
};
export async function currentUser() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return db.user.findFirst({
    where: {
      id: session.user.id,
      disabledAt: null,
      emailVerified: { not: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      image: true,
      isDemo: true,
    },
  });
}
export async function requireUser(returnTo?: string) {
  const user = await currentUser();
  if (!user)
    redirect(
      returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login",
    );
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN")
    throw new InputError("Administrator access required.", 403);
  return user;
}
