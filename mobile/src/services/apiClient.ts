const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_URL = (configuredUrl || 'http://10.0.2.2:3333/api').replace(/\/$/, '');

let accessToken: string | undefined;
let unauthorizedHandler: (() => void) | undefined;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code = 'API_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function setApiAccessToken(token?: string): void {
  accessToken = token;
}

export function setUnauthorizedHandler(handler?: () => void): void {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  authenticated?: boolean;
}

export async function apiRequest<T = void>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const authenticated = options.authenticated !== false;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(authenticated && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = await readResponse(response);
      const apiError = isApiErrorPayload(payload) ? payload.error : undefined;
      if (
        response.status === 401 && authenticated && accessToken
        && (apiError?.code === 'UNAUTHENTICATED' || apiError?.code === 'ACCOUNT_INACTIVE')
      ) unauthorizedHandler?.();
      throw new ApiError(
        apiError?.message ?? `A API respondeu com o status ${response.status}.`,
        response.status,
        apiError?.code,
        apiError?.details,
      );
    }

    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('A API demorou muito para responder. Tente novamente.', undefined, 'API_TIMEOUT');
    }
    throw new ApiError(
      `Não foi possível conectar à API em ${API_URL}. Confira o endereço e se o backend está ligado.`,
      undefined,
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isApiErrorPayload(value: unknown): value is { error: { message: string; code?: string; details?: unknown } } {
  if (!value || typeof value !== 'object' || !('error' in value)) return false;
  const error = (value as { error?: unknown }).error;
  return Boolean(error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string');
}
