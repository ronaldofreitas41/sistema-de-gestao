import { NextRequest } from "next/server";
import { verifyToken, AuthPayload } from "./auth";

export async function requireAuth(
  request: NextRequest
): Promise<AuthPayload | null> {
  const token = request.cookies.get("mh3_token")?.value;

  if (!token) {
    return null;
  }

  return await verifyToken(token);
}