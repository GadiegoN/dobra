import { safeStorage } from "./safe-storage";

const AUTH_TOKEN_KEY = "dobra_client_auth_token_v1";
let inMemoryToken: string | null = null;
let fetchIntercepted = false;

export function getClientAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  const stored = safeStorage.getItem(AUTH_TOKEN_KEY);
  if (stored) {
    inMemoryToken = stored;
  }
  return inMemoryToken;
}

export function setClientAuthToken(token: string | null): void {
  inMemoryToken = token;
  if (token) {
    safeStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    safeStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

/**
 * Initializes client-side fetch interception so that all internal /api/* requests
 * include the Bearer token in the Authorization header. This guarantees authentication
 * works seamlessly inside cross-origin sandboxed iframes without relying on 3rd-party cookies.
 */
export function initClientAuthFetch(): void {
  if (typeof window === "undefined" || fetchIntercepted) return;
  fetchIntercepted = true;

  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = getClientAuthToken();
    if (!token) {
      return originalFetch(input, init);
    }

    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // Only attach Authorization header to local API requests
    const isLocalApi = urlStr.startsWith("/api/") || (urlStr.startsWith(window.location.origin) && urlStr.includes("/api/"));

    if (isLocalApi) {
      const headers = new Headers(init?.headers);
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return originalFetch(input, { ...init, headers });
    }

    return originalFetch(input, init);
  };
}
