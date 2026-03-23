type TokenResponse = { access_token: string; token_type: string };

export type UserProfile = {
  id: string;
  phone: string;
  username: string;
  avatar: string;
  role?: number;
  is_admin?: boolean;
  user_status?: string;
};

export type Captcha = {
  captcha_id: string;
  image_data: string;
};

function httpBaseUrl() {
  return (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:8000';
}

const TOKEN_KEY = 'undercover_token';

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;

  let detail: unknown = null;
  try {
    const data = await res.json();
    detail = (data as any)?.detail;
  } catch {
    detail = null;
  }

  if (typeof detail === 'string' && detail) {
    throw new Error(detail);
  }

  throw new Error(`request_failed_${res.status}`);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function register(phone: string, password: string): Promise<UserProfile> {
  const res = await fetch(`${httpBaseUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function login(phone: string, password: string, captchaId: string, captchaCode: string): Promise<string> {
  const res = await fetch(`${httpBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password, captcha_id: captchaId, captcha_code: captchaCode }),
  });
  await throwIfNotOk(res);
  const data = (await res.json()) as TokenResponse;
  setToken(data.access_token);
  return data.access_token;
}

export async function getCaptcha(): Promise<Captcha> {
  const res = await fetch(`${httpBaseUrl()}/auth/captcha`, { method: 'GET' });
  await throwIfNotOk(res);
  return res.json();
}

export async function registerWithCaptcha(phone: string, password: string, captchaId: string, captchaCode: string): Promise<UserProfile> {
  const res = await fetch(`${httpBaseUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password, captcha_id: captchaId, captcha_code: captchaCode }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function me(): Promise<UserProfile> {
  const res = await fetch(`${httpBaseUrl()}/auth/me`, {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function updateProfile(input: { username?: string; avatar?: string }): Promise<UserProfile> {
  const res = await fetch(`${httpBaseUrl()}/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function uploadAvatar(file: File): Promise<UserProfile> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${httpBaseUrl()}/auth/avatar`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: form,
  });
  await throwIfNotOk(res);
  return res.json();
}
