/**
 * 管理中心 · 成员花名册
 *
 * 接入用户中心开放接口 GET /api/open/users（X-Api-Key 鉴权），
 * 通过 loadDemoProfiles 并发拉取真实用户；接口不可用时回退本地档案，
 * 并用 Alert + 「数据来源」列提示当前数据出处。
 */
import { ReloadOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { Alert, Button, Space, Spin, Table, Tag } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import type { DemoProfileEntry } from '@/services/auth';
import { loadDemoProfiles } from '@/services/auth';

const useStyles = createStyles(({ css, token }) => ({
  card: css`
    background: #fff;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 12px;
    padding: 16px 18px;
  `,
  header: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  `,
  headerTitle: css`
    font-size: 15px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  headerDesc: css`
    margin-top: 4px;
    font-size: 13px;
    color: ${token.colorTextSecondary};
  `,
  alertWrap: css`
    margin-bottom: 14px;
  `,
  loading: css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 56px 0;
  `,
}));

const ROLE_META: Record<string, { text: string; color: string }> = {
  ADMIN: { text: '管理员', color: 'gold' },
  USER: { text: '成员', color: 'blue' },
};

const renderRoles = (roles: string[]): React.ReactNode => {
  if (roles.length === 0) return '—';
  return (
    <Space size={4} wrap>
      {roles.map((role) => {
        const meta = ROLE_META[role];
        return meta ? (
          <Tag key={role} color={meta.color}>
            {meta.text}
          </Tag>
        ) : (
          <Tag key={role}>{role}</Tag>
        );
      })}
    </Space>
  );
};

const columns: TableColumnsType<DemoProfileEntry> = [
  { title: 'ID', dataIndex: ['user', 'id'], width: 70 },
  { title: '昵称', dataIndex: ['user', 'nickname'], width: 130 },
  { title: '账号', dataIndex: ['user', 'account'], width: 140 },
  {
    title: '租户 / 部门',
    key: 'tenant',
    width: 200,
    render: (_, entry) => entry.user.tenantName || entry.dept || '—',
  },
  {
    title: '角色',
    key: 'roles',
    width: 110,
    render: (_, entry) => renderRoles(entry.user.roles),
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (_, entry) =>
      entry.user.status === 1 ? (
        <Tag color="success">在职</Tag>
      ) : (
        <Tag color="default">停用</Tag>
      ),
  },
  {
    title: '最近登录',
    key: 'lastLoginAt',
    width: 170,
    render: (_, entry) => entry.user.lastLoginAt || '—',
  },
  {
    title: '数据来源',
    key: 'source',
    width: 110,
    render: (_, entry) =>
      entry.fallback ? (
        <Tag color="warning">本地档案</Tag>
      ) : (
        <Tag color="success">用户中心</Tag>
      ),
  },
];

/** 成员花名册 Tab（真实开放接口） */
const MembersTab: React.FC = () => {
  const { styles } = useStyles();
  const [profiles, setProfiles] = useState<DemoProfileEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadDemoProfiles().then((list) => {
      if (!alive) return;
      setProfiles(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const hasFallback = profiles?.some((entry) => entry.fallback) ?? false;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitle}>成员花名册</div>
          <div className={styles.headerDesc}>
            数据来自 GET /api/open/users（开放接口，X-Api-Key 鉴权）
          </div>
          <div className={styles.headerDesc}>
            基地址 http://47.99.54.0:8080/docs/open-api.html
          </div>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => setReloadKey((key) => key + 1)}
        >
          刷新
        </Button>
      </div>

      {hasFallback ? (
        <div className={styles.alertWrap}>
          <Alert
            type="warning"
            showIcon
            message="部分成员数据来自本地档案"
            description="用户中心接口暂不可用，已回退到本地演示档案。"
          />
        </div>
      ) : null}

      {loading && !profiles ? (
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={profiles ?? []}
          pagination={false}
          loading={loading}
          scroll={{ x: 1000 }}
        />
      )}
    </div>
  );
};

export default MembersTab;
