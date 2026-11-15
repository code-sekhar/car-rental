import {
  registerAccount,
  requestAccountEmail,
  resetPassword,
  verifyEmail,
} from "@/lib/server/accounts";
import { accountInput, errorResponse } from "@/lib/server/http";
import { InputError } from "@/lib/server/security";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    const input = await accountInput(request);
    if (action === "register") await registerAccount(input);
    else if (action === "forgot-password")
      await requestAccountEmail(input, "RESET_PASSWORD");
    else if (action === "resend-verification")
      await requestAccountEmail(input, "VERIFY_EMAIL");
    else if (action === "reset-password") await resetPassword(input);
    else if (action === "verify-email") await verifyEmail(input);
    else throw new InputError("Endpoint not found.", 404);
    const queued = [
      "register",
      "forgot-password",
      "resend-verification",
    ].includes(action);
    return Response.json(
      {
        ok: true,
        message: queued
          ? "If this email is eligible, instructions have been queued. Check your inbox."
          : action === "verify-email"
            ? "Email verified. You can now sign in."
            : "Your password has been reset. Please sign in again.",
        ...(queued && process.env.MAIL_TRANSPORT === "file"
          ? {
              delivery:
                "Local development: email is saved to the private mailbox on this computer.",
            }
          : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (!["me", "bookings"].includes(action))
    return Response.json({ error: "Endpoint not found." }, { status: 404 });
  const { currentUser } = await import("@/lib/server/auth");
  const user = await currentUser();
  if (!user)
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  if (action === "me")
    return Response.json(
      { user },
      { headers: { "Cache-Control": "no-store" } },
    );
  const { db } = await import("@/lib/server/db");
  const bookings = await db.booking.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      reference: true,
      status: true,
      pickupAt: true,
      returnAt: true,
      vehicle: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return Response.json(
    { bookings },
    { headers: { "Cache-Control": "no-store" } },
  );
}
