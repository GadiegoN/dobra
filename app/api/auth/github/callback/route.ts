import { NextRequest, NextResponse } from "next/server";
import { setPlayerSession } from "@/lib/auth";
import { PlayerProfile } from "@/types/game";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}?auth=failed`);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}?auth=error_config`);
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.error("GitHub OAuth error:", tokenData);
      return NextResponse.redirect(`${baseUrl}?auth=token_error`);
    }

    // 2. Fetch user profile from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "Dobra-2048-Game",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(`${baseUrl}?auth=user_error`);
    }

    const userData = await userResponse.json();

    const profile: PlayerProfile = {
      githubId: String(userData.id),
      username: userData.login,
      displayName: userData.name || userData.login,
      avatarUrl: userData.avatar_url,
      githubProfileUrl: userData.html_url || `https://github.com/${userData.login}`,
    };

    // 3. Save player session cookie
    await setPlayerSession(profile);

    return NextResponse.redirect(`${baseUrl}?auth=success`);
  } catch (err) {
    console.error("Error in GitHub callback:", err);
    return NextResponse.redirect(`${baseUrl}?auth=server_error`);
  }
}

