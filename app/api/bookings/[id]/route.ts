import { currentUser } from "@/lib/server/auth";
import { getBooking, updateBooking } from "@/lib/server/bookings";
import { accountInput, errorResponse } from "@/lib/server/http";
import { InputError, rateLimit } from "@/lib/server/security";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const user = await currentUser();
    if (!user) throw new InputError("Sign in to access bookings.", 401);
    return Response.json(await getBooking(user.id, (await context.params).id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await currentUser();
    if (!user) throw new InputError("Sign in to edit bookings.", 401);
    await rateLimit("booking-edit", user.id, 120, 900);
    return Response.json(
      await updateBooking(
        user.id,
        (await context.params).id,
        await accountInput(request),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
