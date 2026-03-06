import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, fetchUserProfile } from "@/lib/whoop-client";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  // Verify state
  const savedState = request.cookies.get("whoop_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      new URL("/?error=state_mismatch", request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Create a temporary user context to fetch profile
    // First, store tokens, then fetch profile
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Fetch user profile using the new access token directly
    const profileRes = await fetch(
      "https://api.prod.whoop.com/developer/v2/user/profile/basic",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!profileRes.ok) {
      throw new Error(`Profile fetch failed: ${profileRes.status}`);
    }

    const profile = await profileRes.json();

    // Upsert user by WHOOP ID
    const user = await prisma.user.upsert({
      where: { whoopId: profile.user_id },
      update: {
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
      },
      create: {
        whoopId: profile.user_id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
      },
    });

    // Upsert WHOOP account (tokens)
    await prisma.whoopAccount.upsert({
      where: { userId: user.id },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope,
      },
      create: {
        userId: user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope,
      },
    });

    // Set session cookie
    await setSession(user.id);

    const response = NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
    response.cookies.delete("whoop_oauth_state");
    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/?error=auth_failed", request.url)
    );
  }
}
