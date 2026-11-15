import "server-only";
import { ZodError } from "zod";
import { InputError } from "./security";
export async function accountInput(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_URL ?? "").origin;
  if (!origin || origin !== expected)
    throw new InputError("Request origin is not allowed.", 403);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 8192) throw new InputError("Request too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("Invalid request.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > 8192) {
      await reader.cancel();
      throw new InputError("Request too large.", 413);
    }
    chunks.push(part.value);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    throw new InputError("Invalid request.");
  }
}
export function errorResponse(error: unknown) {
  if (error instanceof ZodError)
    return Response.json(
      { error: error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  if (error instanceof InputError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: error.status === 429 ? { "Retry-After": "900" } : {},
      },
    );
  console.error("[account] Operation failed");
  return Response.json(
    { error: "The service is temporarily unavailable. Please try again." },
    { status: 503 },
  );
}
