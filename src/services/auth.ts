/**
 * 登录态（会话）管理：
 * - 免密演示登录：从用户中心按 id 拉取真实用户信息，失败时回退本地演示档案
 * - 账号密码登录：POST /api/open/auth/login 换双令牌，access 15min 自动刷新
 */
import {
  getUser,
  login as apiLogin,
  OpenApiError,
  refreshToken as apiRefresh,
  verifyToken,
  type OpenUser,
} from './openapi';

export type LoginType = 'demo' | 'password';

export interface Session {
  loginType: LoginType;
  user: OpenUser;
  accessToken?: string;
  refreshToken?: string;
  /** access token 过期时间（毫秒时间戳） */
  expiresAt?: number;
  /** 本地兜底档案标记（用户中心不可用时） */
  fallback?: boolean;
}

const SESSION_KEY = 'meetspace.session.v1';

/** 演示登录可选的用户（id 对应用户中心真实账号，登录时实时拉取） */
export const DEMO_PROFILES: {
  id: number;
  /** 本地兜底展示信息 */
  title: string;
  dept: string;
}[] = [
  { id: 1, title: '平台管理员', dept: '产品设计部' },
  { id: 2, title: '普通成员', dept: '用户增长部' },
  { id: 3, title: '验收成员', dept: '质量保障部' },
  { id: 7, title: '淘天成员', dept: '淘天集团·用户体验' },
  { id: 8, title: '菜鸟成员', dept: '菜鸟集团·供应链' },
];

/** 本地兜底档案（用户中心不可达时保证演示可用） */
const FALLBACK_USERS: Record<number, OpenUser> = Object.fromEntries(
  DEMO_PROFILES.map((p, index) => [
    p.id,
    {
      id: p.id,
      account: `1390000000${index}`,
      nickname: ['钱家杰', '新用户', '验收花名', '淘天同学', '菜鸟同学'][index],
      realName: '',
      tenantId: 'alibaba',
      tenantName: '阿里巴巴控股集团',
      status: 1,
      roles: p.id === 1 ? ['ADMIN'] : ['USER'],
      createdAt: '2026-09-28 10:00:00',
      lastLoginAt: '',
    },
  ]),
);

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/** 演示用户头像用的部门信息 */
export function deptOf(user: OpenUser): string {
  const profile = DEMO_PROFILES.find((p) => p.id === user.id);
  if (profile && !user.tenantName) return profile.dept;
  return profile?.dept || user.tenantName || ' MeetSpace';
}

/**
 * 免密演示登录：按 id 查询用户中心，拿真实昵称 / 租户 / 角色
 */
export async function demoLogin(id: number): Promise<Session> {
  try {
    const user = await getUser({ id });
    return { loginType: 'demo', user };
  } catch (e) {
    // 用户中心查不到 / 不可达时回退本地档案
    const fallback = FALLBACK_USERS[id];
    if (!fallback) throw e;
    return { loginType: 'demo', user: fallback, fallback: true };
  }
}

/** 账号密码登录（真实换发 access/refresh 双令牌） */
export async function passwordLogin(
  account: string,
  password: string,
): Promise<Session> {
  const pair = await apiLogin(account, password);
  const session: Session = {
    loginType: 'password',
    user: {
      id: pair.userId,
      account: pair.account,
      nickname: pair.nickname,
      realName: '',
      tenantId: pair.tenantId,
      tenantName: '',
      status: 1,
      roles: pair.roles,
      createdAt: '',
      lastLoginAt: '',
    },
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    expiresAt: Date.now() + pair.expiresIn * 1000,
  };
  // 补全租户 / 状态等字段
  try {
    const full = await getUser({ id: pair.userId });
    session.user = full;
  } catch {
    /* 用户查询失败不影响登录 */
  }
  return session;
}

/**
 * 会话保鲜：校验 access token，过期则用 refresh token 轮换新令牌
 * 返回 false 表示登录态已失效
 */
export async function ensureToken(session: Session): Promise<boolean> {
  if (!session.accessToken) return true;
  if (!session.expiresAt || Date.now() < session.expiresAt - 30_000) {
    return true;
  }
  if (!session.refreshToken) return false;
  try {
    const check = await verifyToken(session.accessToken);
    if (check.valid) {
      session.expiresAt = Date.now() + 15 * 60 * 1000;
      setSession(session);
      return true;
    }
    const pair = await apiRefresh(session.refreshToken);
    session.accessToken = pair.accessToken;
    session.refreshToken = pair.refreshToken; // 旧值用后即焚，必须覆盖
    session.expiresAt = Date.now() + pair.expiresIn * 1000;
    setSession(session);
    return true;
  } catch (e) {
    if (e instanceof OpenApiError && e.code === 'refresh_invalid') {
      return false;
    }
    // 网络抖动时不打断演示
    return true;
  }
}

/** 重新拉取当前用户（保持与用户中心一致） */
export async function refreshProfile(session: Session): Promise<Session> {
  try {
    const user = await getUser({ id: session.user.id });
    const next = { ...session, user, fallback: false };
    setSession(next);
    return next;
  } catch {
    return session;
  }
}

export interface DemoProfileEntry {
  id: number;
  title: string;
  dept: string;
  /** 用户中心实时返回的用户（失败时为本地兜底档案） */
  user: OpenUser;
  fallback: boolean;
}

/** 演示登录可选用户（实时查用户中心，失败回退本地档案） */
export async function loadDemoProfiles(): Promise<DemoProfileEntry[]> {
  return Promise.all(
    DEMO_PROFILES.map(async (p): Promise<DemoProfileEntry> => {
      try {
        const user = await getUser({ id: p.id });
        return { ...p, user, fallback: false };
      } catch {
        return { ...p, user: FALLBACK_USERS[p.id], fallback: true };
      }
    }),
  );
}
