import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React from 'react';

// Initialize dayjs plugins globally
dayjs.extend(relativeTime);

import { ErrorBoundary, OfflineBanner } from '@/components';
import HeaderBar from '@/components/HeaderBar';
import { ensureToken, getSession, refreshProfile } from '@/services/auth';
import type { OpenUser } from '@/services/openapi';
import { palette, siderLayoutToken } from '@/styles/theme';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';

const loginPath = '/user/login';

/** 用户中心用户 -> ProLayout 当前用户 */
const toCurrentUser = (user: OpenUser): API.CurrentUser => ({
  name: user.nickname || user.account,
  userid: String(user.id),
  title: user.roles?.includes('ADMIN') ? '管理员' : '成员',
  group: user.tenantName || undefined,
  access: user.roles?.includes('ADMIN') ? 'admin' : 'user',
  phone: user.account,
});

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
  settingDrawerOpen?: boolean;
}> {
  const fetchUserInfo = async () => {
    let session = getSession();
    if (!session) {
      const { pathname, search, hash } = history.location;
      if (pathname !== loginPath) {
        history.replace(
          `${loginPath}?redirect=${encodeURIComponent(pathname + search + hash)}`,
        );
      }
      return undefined;
    }
    try {
      // access token 15 分钟过期，先校验再按需用 refresh token 轮换
      const alive = await ensureToken(session);
      if (!alive) {
        session = getSession();
        if (!session) return undefined;
      }
      // 与用户中心保持同步（网络异常时使用本地会话兜底）
      session = await refreshProfile(getSession() ?? session);
      return toCurrentUser(session.user);
    } catch {
      return undefined;
    }
  };

  const { location } = history;
  const onLoginPages = [loginPath].includes(location.pathname);
  if (!onLoginPages) {
    const currentUser = await fetchUserInfo();
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
      settingDrawerOpen: false,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
    settingDrawerOpen: false,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({ initialState }) => {
  return {
    // navTheme 用 light：realDark 会把整个内容区也套上暗色算法（白字+白底卡片看不清），
    // 侧边栏深色完全由下方 token.sider 显式控制
    navTheme: 'light',
    layout: 'side',
    // 顶栏由 rootContainer 全宽渲染（见下方 GlobalHeaderShell），
    // v3 side 布局的 fixSiderbar 会让侧边栏 fixed 到 top:0 与顶栏重叠，
    // 这里关闭，改用 global.less 里的 sticky 规则把侧边栏吸附在顶栏下方
    fixSiderbar: false,
    // 侧边栏菜单分组标题
    menuHeaderRender: () => (
      <div
        style={{
          color: 'rgba(255, 255, 255, 0.45)',
          fontSize: 12,
          padding: '18px 16px 10px',
          letterSpacing: 1,
        }}
      >
        工作空间
      </div>
    ),
    menuItemRender: (item, dom) => {
      if (item.path) {
        return (
          <Link to={item.path} prefetch>
            {dom}
          </Link>
        );
      }
      return dom;
    },
    actionsRender: () => [],
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.replace(
          `${loginPath}?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`,
        );
      }
    },
    // 顶栏高 64px（rootContainer 全宽渲染），内容区最小高度扣掉它，
    // 同时会归零 ProLayout 行容器内联的 min-height:100vh，避免页面出现 64px 冗余滚动
    contentStyle: {
      minHeight: 'calc(100vh - 64px)',
    },
    childrenRender: (children) => {
      return (
        <>
          {/* v3 side 布局无顶栏，自渲染 HeaderBar；fixed 定位使其横跨整个
              窗口宽度（不受内容列约束），布局用 global.less 的 padding-top 让位 */}
          <HeaderBar />
          {children}
        </>
      );
    },
    ...initialState?.settings,
    // 深色导航 token：侧边栏与顶栏同色，选中项为主色块（对齐效果图）
    // 注意：ProLayout 的 token 是扁平结构（sider/header/bgLayout），
    // 内部才会合并进 ProConfigProvider 的 layout token
    token: {
      sider: siderLayoutToken,
      bgLayout: palette.pageBg,
    },
    // 登录页不使用默认头像逻辑
    avatarProps: undefined,
    title: 'MeetSpace',
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  baseURL: '',
  ...errorConfig,
};

export function rootContainer(container: React.ReactNode) {
  return (
    <>
      <OfflineBanner />
      <ErrorBoundary>{container}</ErrorBoundary>
    </>
  );
}
