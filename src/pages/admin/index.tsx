/**
 * 管理中心（/admin，路由与菜单仅 canAdmin 可见）
 *
 * 三个子页面：
 * - 会议室管理：本地演示仓库的会议室增删改
 * - 预订管理：按日期查看全部预订，支持签到 / 取消
 * - 成员花名册：走用户中心开放接口 GET /api/open/users
 */
import { Tabs } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import BookingsTab from './components/BookingsTab';
import MembersTab from './components/MembersTab';
import RoomsTab from './components/RoomsTab';

const useStyles = createStyles(({ css, token }) => ({
  page: css`
    padding: 20px 24px 32px;
  `,
  titleRow: css`
    margin-bottom: 16px;
  `,
  h1: css`
    font-size: 26px;
    font-weight: 700;
    color: ${token.colorText};
    margin: 0;
    line-height: 1.3;
  `,
  sub: css`
    margin: 6px 0 0;
    font-size: 14px;
    color: ${token.colorTextSecondary};
  `,
}));

/** 管理中心入口页 */
const AdminPage: React.FC = () => {
  const { styles } = useStyles();
  const [tab, setTab] = useState('rooms');

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.h1}>管理中心</h1>
        <p className={styles.sub}>会议室资源、预订审核与成员花名册</p>
      </div>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'rooms', label: '会议室管理', children: <RoomsTab /> },
          { key: 'bookings', label: '预订管理', children: <BookingsTab /> },
          { key: 'members', label: '成员花名册', children: <MembersTab /> },
        ]}
      />
    </div>
  );
};

export default AdminPage;
