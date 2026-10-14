import {
  ApiOutlined,
  CheckCircleFilled,
  LockOutlined,
  MobileOutlined,
  SafetyCertificateFilled,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { ProForm, ProFormText } from '@ant-design/pro-components';
import { Helmet, history, useModel } from '@umijs/max';
import { Alert, App, Button, Spin, Tabs, Tag, Typography } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useMemo, useState } from 'react';
import {
  type DemoProfileEntry,
  demoLogin,
  loadDemoProfiles,
  passwordLogin,
  setSession,
} from '@/services/auth';
import { OpenApiError } from '@/services/openapi';

const { Paragraph, Text } = Typography;

const getSafeRedirect = (redirect: string | null): string => {
  if (!redirect?.startsWith('/') || redirect.startsWith('//'))
    return '/booking';
  try {
    const parsed = new URL(redirect, window.location.origin);
    if (parsed.origin !== window.location.origin) return '/booking';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/booking';
  }
};

const useStyles = createStyles(({ css, token }) => ({
  page: css`
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    background:
      radial-gradient(1200px 600px at 15% -10%, rgba(37, 99, 235, 0.35), transparent 60%),
      radial-gradient(900px 500px at 110% 110%, rgba(56, 189, 248, 0.18), transparent 55%),
      linear-gradient(160deg, #0a1730 0%, #102544 55%, #0b1c33 100%);
  `,
  panel: css`
    width: 100%;
    max-width: 960px;
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    overflow: hidden;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 24px 70px rgba(2, 12, 35, 0.45);

    @media (max-width: 860px) {
      grid-template-columns: 1fr;
    }
  `,
  intro: css`
    padding: 44px 40px;
    color: #fff;
    background:
      linear-gradient(150deg, rgba(37, 99, 235, 0.92), rgba(14, 45, 105, 0.95)),
      #0f2f6b;
    display: flex;
    flex-direction: column;
    gap: 22px;
  `,
  logoRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  logo: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #fff;
    color: #2563eb;
    font-size: 26px;
    font-weight: 800;
  `,
  brand: css`
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.5px;
  `,
  slogan: css`
    font-size: 30px;
    font-weight: 700;
    line-height: 1.35;
    margin: 6px 0 0;
  `,
  features: css`
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 4px;

    li {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.88);
      list-style: none;
    }

    .icon {
      color: #93c5fd;
      font-size: 16px;
    }
  `,
  meta: css`
    margin-top: auto;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.8;
  `,
  form: css`
    padding: 40px 38px 32px;
  `,
  userGrid: css`
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 4px 0 14px;
    max-height: 328px;
    overflow-y: auto;
    padding-right: 4px;
  `,
  userCard: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 14px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 12px;
    cursor: pointer;
    transition:
      border-color 0.2s,
      box-shadow 0.2s,
      transform 0.15s;

    &:hover {
      border-color: ${token.colorPrimary};
      box-shadow: 0 6px 18px rgba(37, 99, 235, 0.12);
      transform: translateY(-1px);
    }
  `,
  hint: css`
    font-size: 12px;
    color: ${token.colorTextTertiary};
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
    word-break: break-all;
  `,
}));

const FEATURES = [
  {
    icon: <ApiOutlined className="icon" />,
    text: '接入用户中心开放接口，真实用户 / 租户 / 角色',
  },
  {
    icon: <CheckCircleFilled className="icon" />,
    text: '时间轴快速选位，冲突检测与一键签到',
  },
  {
    icon: <SafetyCertificateFilled className="icon" />,
    text: '双通道鉴权：API-Key 直传 / HMAC 签名',
  },
];

const LoginPage: React.FC = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const [tab, setTab] = useState('demo');
  const [submitting, setSubmitting] = useState(false);
  const { initialState, setInitialState } = useModel('@@initialState');

  const redirect = useMemo(() => {
    const search = new URLSearchParams(history.location.search);
    return getSafeRedirect(search.get('redirect'));
  }, []);

  // 演示用户列表：实时从用户中心 GET /api/open/users 拉取
  const [profiles, setProfiles] = useState<DemoProfileEntry[] | null>(null);
  useEffect(() => {
    let mounted = true;
    loadDemoProfiles()
      .then((list) => {
        if (mounted) setProfiles(list);
      })
      .catch(() => {
        if (mounted) setProfiles([]);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const loading = profiles === null;

  const finishLogin = async (
    session: Awaited<ReturnType<typeof demoLogin>>,
  ) => {
    setSession(session);
    const user = await initialState?.fetchUserInfo?.();
    setInitialState((s) => ({ ...s, currentUser: user }));
    history.replace(redirect);
  };

  const onPick = async (entry: DemoProfileEntry) => {
    setSubmitting(true);
    try {
      const session = await demoLogin(entry.id);
      await finishLogin(session);
      message.success(`欢迎回来，${session.user.nickname}`);
    } catch {
      message.error('登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const onPasswordLogin = async (values: {
    account?: string;
    password?: string;
  }) => {
    if (!values.account || !values.password) return;
    setSubmitting(true);
    try {
      const session = await passwordLogin(values.account, values.password);
      await finishLogin(session);
      message.success(`登录成功，${session.user.nickname}`);
    } catch (e) {
      if (e instanceof OpenApiError) {
        message.error(
          e.code === 'invalid_credential'
            ? '账号或密码错误'
            : e.message || '登录失败',
        );
      } else {
        message.error('无法连接用户中心服务');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const anyFallback = profiles?.some((p) => p.fallback);

  const demoContent = (
    <>
      {anyFallback ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="用户中心暂不可达，以下为本地演示档案"
        />
      ) : null}
      <div className={styles.userGrid}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <Spin />
            <div style={{ marginTop: 10, fontSize: 12, color: '#999' }}>
              正在从用户中心加载演示用户…
            </div>
          </div>
        ) : (
          profiles?.map((p) => (
            <div
              key={p.id}
              className={styles.userCard}
              onClick={() => onPick(p)}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: p.fallback ? '#94a3b8' : '#2563eb',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {p.user.nickname.slice(0, 1)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {p.user.nickname}
                  <Tag
                    color={p.user.roles?.includes('ADMIN') ? 'gold' : 'blue'}
                    style={{ margin: 0 }}
                  >
                    {p.user.roles?.includes('ADMIN') ? '管理员' : '成员'}
                  </Tag>
                </div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  {p.user.tenantName || p.dept} · ID {p.id}
                </div>
              </div>
              <UserOutlined style={{ color: '#bfbfbf' }} />
            </div>
          ))
        )}
      </div>
      <div className={styles.hint}>
        <ApiOutlined />
        免密进入 · 用户信息实时来自用户中心开放接口
      </div>
    </>
  );

  return (
    <div className={styles.page}>
      <Helmet titleTemplate="%s · MeetSpace">
        <title>登录 MeetSpace</title>
      </Helmet>
      <div className={styles.panel}>
        <div className={styles.intro}>
          <div className={styles.logoRow}>
            <div className={styles.logo}>M</div>
            <span className={styles.brand}>MeetSpace</span>
          </div>
          <div>
            <div className={styles.slogan}>
              会议邀约，
              <br />
              从找到一间空会议室开始
            </div>
            <Paragraph
              style={{ color: 'rgba(255,255,255,0.75)', marginTop: 12 }}
            >
              时间轴视图一眼看清占用情况，快速预订、日程管理、
              签到核销一站完成。
            </Paragraph>
          </div>
          <ul className={styles.features}>
            {FEATURES.map((f) => (
              <li key={f.text}>
                {f.icon}
                {f.text}
              </li>
            ))}
          </ul>
          <div className={styles.meta}>
            用户中心开放接口 v1.0.0 · http://47.99.54.0:8080
            <br />
            access token 15 分钟 · refresh token 15 天自动轮换
          </div>
        </div>

        <div className={styles.form}>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            centered
            items={[
              { key: 'demo', label: '演示登录' },
              { key: 'password', label: '账号密码' },
            ]}
          />
          {tab === 'demo' ? (
            demoContent
          ) : (
            <ProForm
              onFinish={onPasswordLogin}
              submitter={{
                searchConfig: { submitText: '登录' },
                render: (props, dom) => (
                  <Button
                    type="primary"
                    size="large"
                    block
                    loading={submitting}
                    onClick={() => props.form?.submit()}
                  >
                    {dom[3]}
                  </Button>
                ),
              }}
            >
              <ProFormText
                name="account"
                label="手机号 / 账号"
                placeholder="请输入注册手机号"
                fieldProps={{
                  size: 'large',
                  prefix: <MobileOutlined style={{ color: '#bfbfbf' }} />,
                }}
                rules={[{ required: true, message: '请输入账号' }]}
              />
              <ProFormText.Password
                name="password"
                label="密码"
                placeholder="请输入密码"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined style={{ color: '#bfbfbf' }} />,
                }}
                rules={[{ required: true, message: '请输入密码' }]}
              />
            </ProForm>
          )}
          {tab === 'password' ? (
            <div className={styles.hint}>
              <SafetyCertificateOutlined />
              <Text type="secondary" style={{ fontSize: 12 }}>
                POST /api/open/auth/login · 演示环境请使用「演示登录」
              </Text>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
