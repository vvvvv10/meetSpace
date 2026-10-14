import {
  HistoryOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useLocation, useModel } from '@umijs/max';
import { App, Avatar, Dropdown, Segmented } from 'antd';
import { createStyles } from 'antd-style';
import React, { startTransition } from 'react';
import { clearSession, deptOf, getSession } from '@/services/auth';
import { resetDemoData } from '@/store/meetStore';
import { setViewMode, useViewMode, type ViewMode } from '@/store/viewStore';
import { palette } from '@/styles/theme';

const useStyles = createStyles(({ css }) => ({
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    padding: 0 24px;
    background: ${palette.navy};
    color: #fff;

    @media (max-width: 640px) {
      padding: 0 12px;
    }
  `,
  brand: css`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 220px;
  `,
  logo: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: linear-gradient(135deg, #3b82f6, ${palette.brand});
    color: #fff;
    font-size: 19px;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);
  `,
  brandName: css`
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 0.3px;

    @media (max-width: 560px) {
      display: none;
    }
  `,
  center: css`
    flex: 1;
    display: flex;
    justify-content: center;
  `,
  segmented: css`
    padding: 3px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.08);

    .ant-segmented-item {
      color: rgba(255, 255, 255, 0.65);
      border-radius: 7px;
    }

    .ant-segmented-item:hover:not(.ant-segmented-item-selected) {
      color: rgba(255, 255, 255, 0.9);
    }

    .ant-segmented-item-selected {
      background: #fff !important;
      color: #111827 !important;
      font-weight: 600;
    }
  `,
  right: css`
    display: flex;
    align-items: center;
    gap: 18px;
    min-width: 220px;
    justify-content: flex-end;
  `,
  resetBtn: css`
    color: rgba(255, 255, 255, 0.85);
    font-size: 14px;
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  `,
  user: css`
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 8px;
    transition: background 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
  `,
  userText: css`
    line-height: 1.25;
    text-align: right;

    .name {
      font-size: 14px;
      color: #fff;
    }

    .dept {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.55);
    }
  `,
  menuIcon: css`
    color: rgba(255, 255, 255, 0.75);
    font-size: 15px;
  `,
}));

const VIEW_OPTIONS: { label: string; value: ViewMode }[] = [
  { label: '现代版', value: 'modern' },
  { label: '经典版', value: 'classic' },
  { label: '日历版', value: 'calendar' },
];

/** 顶栏：品牌 / 视图切换（仅预订页） / 重置演示数据 / 当前用户 */
const HeaderBar: React.FC = () => {
  const { styles } = useStyles();
  const location = useLocation();
  const viewMode = useViewMode();
  const { message } = App.useApp();
  const { initialState, setInitialState } = useModel('@@initialState');
  const session = getSession();
  const user = session?.user;

  const isBooking = location.pathname.startsWith('/booking');

  const handleReset = () => {
    resetDemoData();
    message.success('演示数据已重置');
  };

  const handleLogout = () => {
    clearSession();
    startTransition(() => {
      setInitialState((s) => ({ ...s, currentUser: undefined }));
    });
    history.replace('/user/login');
  };

  const menuItems = [
    {
      key: 'reset',
      icon: <HistoryOutlined />,
      label: '重置演示数据',
    },
    {
      key: 'openapi',
      icon: <UserOutlined />,
      label: '用户中心接入状态',
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  const onMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') handleLogout();
    if (key === 'reset') handleReset();
  };

  return (
    <div className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logo}>M</div>
        <span className={styles.brandName}>MeetSpace</span>
      </div>

      <div className={styles.center}>
        {isBooking ? (
          <Segmented
            className={styles.segmented}
            options={VIEW_OPTIONS}
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
          />
        ) : null}
      </div>

      <div className={styles.right}>
        <span className={styles.resetBtn} onClick={handleReset}>
          重置演示数据
        </span>
        <Dropdown
          placement="bottomRight"
          trigger={['click']}
          menu={{ items: menuItems, onClick: onMenuClick }}
        >
          <div className={styles.user}>
            <Avatar
              size={34}
              style={{ background: '#2563eb', fontSize: 15 }}
              icon={!user ? <UserOutlined /> : undefined}
            >
              {user ? user.nickname.slice(0, 1) : undefined}
            </Avatar>
            <div className={styles.userText}>
              <div className="name">{user?.nickname || '未登录'}</div>
              <div className="dept">
                {user ? deptOf(user) : '点击头像菜单退出'}
              </div>
            </div>
          </div>
        </Dropdown>
      </div>
      {/* 保留 initialState 引用，切换用户时触发重渲染 */}
      <span style={{ display: 'none' }}>{initialState?.currentUser?.name}</span>
    </div>
  );
};

export default HeaderBar;
