import { NextRequest, NextResponse } from "next/server";
import { setPlayerSession, signProfileToken } from "@/lib/auth";
import { PlayerProfile } from "@/types/game";

function renderAuthResponse({
  profile,
  token,
  error,
  baseUrl,
}: {
  profile?: PlayerProfile;
  token?: string;
  error?: string;
  baseUrl: string;
}) {
  if (error) {
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Erro de Autenticação</title></head>
<body style="background:#0b0d17;color:#fff;font-family:sans-serif;padding:24px;text-align:center;">
  <h3>Falha na autenticação</h3>
  <p style="color:#94a3b8;">${error}</p>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({ type: "DOBRA_AUTH_ERROR", error: "${error}" }, "*");
        setTimeout(function() { window.close(); }, 1200);
      } else {
        window.location.href = "${baseUrl}?auth=${error}";
      }
    } catch (e) {
      window.location.href = "${baseUrl}?auth=${error}";
    }
  </script>
</body>
</html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DOBRA 2048 - Autenticado</title>
  <style>
    body { font-family: sans-serif; background: #0b0d17; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { text-align: center; }
  </style>
</head>
<body>
  <div class="box">
    <h2>Login realizado com sucesso!</h2>
    <p style="color:#94a3b8;">Fechando janela e retornando ao jogo...</p>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: "DOBRA_AUTH_SUCCESS",
          profile: ${JSON.stringify(profile)},
          token: ${JSON.stringify(token)}
        }, "*");
        setTimeout(function() { window.close(); }, 300);
      } else {
        window.location.href = "${baseUrl}?auth=success";
      }
    } catch (e) {
      window.location.href = "${baseUrl}?auth=success";
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  if (error || !code) {
    return renderAuthResponse({ error: "failed", baseUrl });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return renderAuthResponse({ error: "error_config", baseUrl });
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
      return renderAuthResponse({ error: "token_error", baseUrl });
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
      return renderAuthResponse({ error: "user_error", baseUrl });
    }

    const userData = await userResponse.json();

    const profile: PlayerProfile = {
      githubId: String(userData.id),
      username: userData.login,
      displayName: userData.name || userData.login,
      avatarUrl: userData.avatar_url,
      githubProfileUrl: userData.html_url || `https://github.com/${userData.login}`,
    };

    // 3. Save player session cookie and sign token for iframe client
    await setPlayerSession(profile);
    const token = signProfileToken(profile);

    return renderAuthResponse({ profile, token, baseUrl });
  } catch (err) {
    console.error("Error in GitHub callback:", err);
    return renderAuthResponse({ error: "server_error", baseUrl });
  }
}

