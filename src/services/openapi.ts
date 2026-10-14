/**
 * 用户中心开放接口封装
 * @doc http://47.99.54.0:8080/docs/open-api.html
 *
 * 支持两条通道：
 * - api_key：X-Api-Key 直传
 * - sign：X-Open-* 四头 HMAC-SHA256 签名（canonical 五段拼接）
 */
import {
  OPEN_API_BASE,
  OPEN_API_KEY,
  OPEN_AUTH_MODE,
  OPEN_SIGN_KEY,
} from '@/config';

/** 用户查询返回结构 */
export interface OpenUser {
  id: number;
  account: string;
  nickname: string;
  realName: string;
  tenantId: string;
  tenantName: string;
  /** 1=在职 0=停用 */
  status: number;
  roles: string[];
  createdAt: string;
  lastLoginAt: string;
}

/** 登录 / 刷新返回的 TokenPair（与控制台 /api/auth/login 同结构） */
export interface TokenPair {
  userId: number;
  account: string;
  nickname: string;
  roles: string[];
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  /** access token 有效期（秒），默认 900 */
  expiresIn: number;
}

/** token 校验返回 */
export interface VerifyResult {
  valid: boolean;
  reason: 'ok' | 'expired' | 'revoked' | 'invalid';
  userId: number | null;
  roles: string[] | null;
  tenantId: string | null;
}

/** 开放接口错误（HTTP 4xx / 业务错误码） */
export class OpenApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message?: string) {
    super(message || code);
    this.name = 'OpenApiError';
    this.status = status;
    this.code = code;
  }
}

const EMPTY_BODY_SHA256 =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

const encoder = new TextEncoder();

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

type Query = Record<string, string | number | undefined | null>;

function buildQuery(query?: Query): string {
  if (!query) return '';
  const usp = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
}

/** 组装鉴权请求头（api_key / sign 二选一） */
async function buildAuthHeaders(
  method: string,
  pathWithQuery: string,
  bodyText: string,
): Promise<Record<string, string>> {
  if (OPEN_AUTH_MODE === 'api_key') {
    return {
      'X-Api-Key': `${OPEN_API_KEY.clientId}:${OPEN_API_KEY.clientSecret}`,
    };
  }
  // 通道二：HMAC 签名
  const timestamp = String(Date.now());
  const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  const bodySha = bodyText ? await sha256Hex(bodyText) : EMPTY_BODY_SHA256;
  const canonical = [
    timestamp,
    nonce,
    method.toUpperCase(),
    pathWithQuery,
    bodySha,
  ].join('\n');
  const signature = await hmacSha256Hex(
    OPEN_SIGN_KEY.clientSecret,
    canonical,
  );
  return {
    'X-Open-Client-Id': OPEN_SIGN_KEY.clientId,
    'X-Open-Timestamp': timestamp,
    'X-Open-Nonce': nonce,
    'X-Open-Signature': signature,
  };
}

/**
 * 开放接口统一请求
 * @param path 以 / 开头的路径，如 /users、/auth/login
 */
export async function openRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  options: { params?: Query; body?: unknown } = {},
): Promise<T> {
  const query = buildQuery(options.params);
  const pathWithQuery = `${path}${query}`;
  const bodyText =
    options.body === undefined ? '' : JSON.stringify(options.body);

  const authHeaders = await buildAuthHeaders(method, pathWithQuery, bodyText);
  const headers: Record<string, string> = {
    ...authHeaders,
    ...(bodyText ? { 'Content-Type': 'application/json' } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`${OPEN_API_BASE}${pathWithQuery}`, {
      method,
      headers,
      body: bodyText || undefined,
      // 防止网关不可用时页面长时间卡在加载态
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new OpenApiError(0, 'network_error', '无法连接用户中心服务');
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new OpenApiError(
      res.status,
      (json as { code?: string }).code || 'http_error',
      (json as { message?: string }).message,
    );
  }
  return json as T;
}

/** GET /api/open/users —— account / mobile / id 三选一 */
export async function getUser(params: {
  account?: string;
  mobile?: string;
  id?: number;
}): Promise<OpenUser> {
  return openRequest<OpenUser>('GET', '/users', { params: params as Query });
}

/** POST /api/open/auth/login —— 账号密码换双令牌 */
export async function login(
  account: string,
  password: string,
): Promise<TokenPair> {
  return openRequest<TokenPair>('POST', '/auth/login', {
    body: { account, password },
  });
}

/** POST /api/open/auth/verify —— 校验 access token（恒回 200） */
export async function verifyToken(accessToken: string): Promise<VerifyResult> {
  return openRequest<VerifyResult>('POST', '/auth/verify', {
    body: { accessToken },
  });
}

/** POST /api/open/auth/refresh —— refresh token 换新令牌（旧值用后即焚） */
export async function refreshToken(refreshToken: string): Promise<TokenPair> {
  return openRequest<TokenPair>('POST', '/auth/refresh', {
    body: { refreshToken },
  });
}
