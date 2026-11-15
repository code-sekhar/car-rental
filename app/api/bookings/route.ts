import { currentUser } from "@/lib/server/auth";
import { createDraft } from "@/lib/server/bookings";
import { accountInput, errorResponse } from "@/lib/server/http";
import { InputError, rateLimit } from "@/lib/server/security";
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new InputError("Sign in to reserve a vehicle.", 401);
    await rateLimit("booking-create", user.id, 30, 900);
    return Response.json(
      await createDraft(user.id, await accountInput(request)),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
