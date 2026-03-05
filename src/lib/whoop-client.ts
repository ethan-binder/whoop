import { prisma } from "./prisma";

const WHOOP_API_BASE = "https://api.prod.whoop.com/developer/v1";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";

const CLIENT_ID = process.env.WHOOP_CLIENT_ID!;
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET!;
const REDIRECT_URI = process.env.WHOOP_REDIRECT_URI!;

const SCOPES = [
  "read:profile",
  "read:recovery",
  "read:sleep",
  "read:cycles",
  "read:workout",
  "offline",
].join(" ");

// --- OAuth helpers ---

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `${WHOOP_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
  });

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }>;
}

// --- Token refresh ---

async function refreshAccessToken(userId: string): Promise<string> {
  const account = await prisma.whoopAccount.findUnique({
    where: { userId },
  });
  if (!account) throw new Error("No WHOOP account linked");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "offline",
  });

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  await prisma.whoopAccount.update({
    where: { userId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    },
  });

  return data.access_token;
}

async function getValidToken(userId: string): Promise<string> {
  const account = await prisma.whoopAccount.findUnique({
    where: { userId },
  });
  if (!account) throw new Error("No WHOOP account linked");

  // Refresh if token expires within 60 seconds
  if (account.expiresAt.getTime() < Date.now() + 60_000) {
    return refreshAccessToken(userId);
  }

  return account.accessToken;
}

// --- API call with retry ---

async function whoopFetch(
  userId: string,
  path: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const token = await getValidToken(userId);
    const res = await fetch(`${WHOOP_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (res.status === 401 && attempt < retries - 1) {
      // Token might be stale, force refresh
      await refreshAccessToken(userId);
      continue;
    }

    if (res.status === 429 && attempt < retries - 1) {
      // Rate limited - wait and retry
      const resetHeader = res.headers.get("X-RateLimit-Reset");
      const waitSec = resetHeader ? parseInt(resetHeader, 10) : 5;
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }

    return res;
  }

  throw new Error(`WHOOP API call failed after ${retries} retries`);
}

// --- High-level data fetchers ---

export async function fetchUserProfile(userId: string) {
  const res = await whoopFetch(userId, "/user/profile/basic");
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
  return res.json() as Promise<{
    user_id: number;
    email: string;
    first_name: string;
    last_name: string;
  }>;
}

interface PaginatedResponse<T> {
  records: T[];
  next_token: string | null;
}

async function fetchAllPaginated<T>(
  userId: string,
  path: string,
  startDate: string,
  endDate: string
): Promise<T[]> {
  const all: T[] = [];
  let nextToken: string | null = null;

  do {
    const params = new URLSearchParams({
      start: startDate,
      end: endDate,
      limit: "25",
    });
    if (nextToken) params.set("nextToken", nextToken);

    const res = await whoopFetch(userId, `${path}?${params.toString()}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fetch ${path} failed: ${res.status} ${text}`);
    }

    const data: PaginatedResponse<T> = await res.json();
    all.push(...data.records);
    nextToken = data.next_token;
  } while (nextToken);

  return all;
}

export interface WhoopCycle {
  id: number;
  user_id: number;
  start: string;
  end?: string;
  score_state: string;
  score?: {
    strain: number;
    kilojoule: number;
    average_heart_rate: number;
    max_heart_rate: number;
  };
}

export interface WhoopRecovery {
  cycle_id: number;
  sleep_id: number;
  user_id: number;
  created_at: string;
  score_state: string;
  score?: {
    user_calibrating: boolean;
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  };
}

export interface WhoopSleep {
  id: number;
  user_id: number;
  start: string;
  end: string;
  nap: boolean;
  score_state: string;
  score?: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
    };
    sleep_performance_percentage: number;
    sleep_consistency_percentage: number;
    sleep_efficiency_percentage: number;
    respiratory_rate: number;
  };
}

export async function fetchCycles(
  userId: string,
  startDate: string,
  endDate: string
): Promise<WhoopCycle[]> {
  return fetchAllPaginated(userId, "/cycle", startDate, endDate);
}

export async function fetchRecoveries(
  userId: string,
  startDate: string,
  endDate: string
): Promise<WhoopRecovery[]> {
  return fetchAllPaginated(userId, "/recovery", startDate, endDate);
}

export async function fetchSleepRecords(
  userId: string,
  startDate: string,
  endDate: string
): Promise<WhoopSleep[]> {
  return fetchAllPaginated(userId, "/activity/sleep", startDate, endDate);
}
