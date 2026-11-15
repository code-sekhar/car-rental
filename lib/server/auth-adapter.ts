import "server-only";
import type { Adapter, AdapterUser, AdapterAccount } from "next-auth/adapters";
import { db } from "./db";
import { hashToken } from "./security";
const userSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
} as const;
/** Typed adapter for the Prisma 7 generated client. Session tokens are hashed at rest. */
export const authAdapter: Adapter = {
  createUser: async (data: Omit<AdapterUser, "id">) =>
    db.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        emailVerified: data.emailVerified,
        image: data.image,
      },
      select: userSelect,
    }),
  getUser: (id) => db.user.findUnique({ where: { id }, select: userSelect }),
  getUserByEmail: (email) =>
    db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: userSelect,
    }),
  getUserByAccount: async (key) =>
    (
      await db.account.findUnique({
        where: { provider_providerAccountId: key },
        select: { user: { select: userSelect } },
      })
    )?.user ?? null,
  updateUser: (data) =>
    db.user.update({
      where: { id: data.id },
      data: {
        name: data.name,
        email: data.email?.toLowerCase(),
        emailVerified: data.emailVerified,
        image: data.image,
      },
      select: userSelect,
    }),
  deleteUser: async (id) => {
    await db.user.delete({ where: { id } });
  },
  linkAccount: async (data: AdapterAccount) => {
    await db.account.create({
      data: {
        userId: data.userId,
        type: data.type,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        token_type: data.token_type,
        scope: data.scope,
        id_token: data.id_token,
        session_state:
          typeof data.session_state === "string"
            ? data.session_state
            : undefined,
      },
    });
  },
  unlinkAccount: async (
    key: Pick<AdapterAccount, "provider" | "providerAccountId">,
  ) => {
    await db.account.delete({ where: { provider_providerAccountId: key } });
  },
  createSession: async (data) => {
    await db.session.create({
      data: { ...data, sessionToken: hashToken(data.sessionToken) },
    });
    return data;
  },
  getSessionAndUser: async (token) => {
    const value = await db.session.findUnique({
      where: { sessionToken: hashToken(token) },
      include: { user: { select: userSelect } },
    });
    return value
      ? { session: { ...value, sessionToken: token }, user: value.user }
      : null;
  },
  updateSession: async (data) => {
    const value = await db.session.update({
      where: { sessionToken: hashToken(data.sessionToken) },
      data: { expires: data.expires },
    });
    return { ...value, sessionToken: data.sessionToken };
  },
  deleteSession: async (token) => {
    await db.session.deleteMany({ where: { sessionToken: hashToken(token) } });
  },
};
