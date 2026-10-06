const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = (await response.json().catch(() => null)) as
    (T & { error?: { message?: string } }) | null;
  if (!response.ok)
    throw new Error(body?.error?.message || 'Não foi possível concluir a operação.');
  return body as T;
}
