/**
 * 开放接口（用户中心）接入配置
 * @doc http://47.99.54.0:8080/docs/open-api.html
 *
 * 两条鉴权通道二选一：
 * - api_key：请求头 X-Api-Key 直传（内网 / 本地开发，走 dev 代理时无跨域问题）
 * - sign：HMAC-SHA256 签名，密钥不出网（外部系统）
 */
export const OPEN_API_ORIGIN = 'http://47.99.54.0:8080';

/**
 * 统一走同源 `/api/open`：
 * - 开发：umi dev 代理（config/proxy.ts）
 * - 生产：部署机 nginx 反代到网关 127.0.0.1:8080
 *
 * 不能在前端直连 OPEN_API_ORIGIN：网关有 Origin 白名单，
 * 从 http://47.99.54.0 跨域访问 :8080 会被 403 拒绝，同源反代可完全绕开。
 */
export const OPEN_API_BASE = '/api/open';

export type OpenAuthMode = 'api_key' | 'sign';

/** 当前使用的鉴权通道 */
export const OPEN_AUTH_MODE: OpenAuthMode = 'api_key';

/** 通道一：API-Key（clientId:clientSecret 直传） */
export const OPEN_API_KEY = {
  clientId: 'ocli_ea325308f28287e2e15f38c12a4589ff',
  clientSecret:
    '76d8864fc76f5b3be904cee4f98baa5cf3be7370aebeb9873a5ec8c7f0a44b24',
};

/** 通道二：HMAC 签名（密钥仅本地计算，不随请求出网） */
export const OPEN_SIGN_KEY = {
  clientId: 'ocli_092fc1cc29640045614dd395463130e4',
  clientSecret:
    '6aa31abd4495bd344e170b7495813df0447c13f9b622a0f1519f3592e68e0598',
};
