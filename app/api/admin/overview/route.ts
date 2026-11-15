import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
export async function GET() {
  const user = await currentUser();
  if (!user)
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  if (user.role !== "ADMIN")
    return Response.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  const [customers, vehicles, bookings] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.vehicle.count(),
    db.booking.count(),
  ]);
  return Response.json(
    { customers, vehicles, bookings },
    { headers: { "Cache-Control": "no-store" } },
  );
}
