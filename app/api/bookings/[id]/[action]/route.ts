import { currentUser } from "@/lib/server/auth";
import {
  quoteBooking,
  holdBooking,
  cancelBooking,
} from "@/lib/server/bookings";
import { accountInput, errorResponse } from "@/lib/server/http";
import { InputError, rateLimit } from "@/lib/server/security";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) throw new InputError("Sign in to manage bookings.", 401);
    await rateLimit("booking-action", user.id, 120, 900);
    const { id, action } = await params;
    const data = await accountInput(request);
    if (action === "quote")
      return Response.json(await quoteBooking(user.id, id, data));
    if (action === "hold")
      return Response.json(await holdBooking(user.id, id, data));
    if (action === "cancel")
      return Response.json(await cancelBooking(user.id, id, data));
    throw new InputError("Action not found.", 404);
  } catch (error) {
    return errorResponse(error);
  }
}
