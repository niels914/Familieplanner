export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

/** Status 0 betekent: het verzoek kwam niet eens aan (geen verbinding). */
export const isOffline = (err: unknown): boolean => err instanceof ApiError && err.status === 0;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      credentials: 'same-origin',
      ...init,
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError('Geen verbinding. Dit is niet opgeslagen.', 0);
  }

  if (res.status === 401) {
    onUnauthorized?.();
    throw new ApiError('Je sessie is verlopen. Log opnieuw in.', 401);
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : {};

  if (!res.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Er ging iets mis (${res.status}).`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
