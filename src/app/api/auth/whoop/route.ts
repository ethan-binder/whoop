import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/whoop-client";
import crypto from "crypto";

export async function GET() {
  // WHOOP requires state to be 8 characters
  const state = crypto.randomBytes(4).toString("hex"); // 8 hex chars
  const url = getAuthorizationUrl(state);

  const response = NextResponse.redirect(url);
  response.cookies.set("whoop_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
