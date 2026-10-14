/**
 * 工作台首页（路由 /workspace）
 *
 * MeetSpace 会议邀约平台的落地页，聚合展示：
 * - 顶部问候卡：按时段问候 + 今天日期 / 租户部门 +「快速预订」「我的预订」快捷按钮
 * - 统计行：今日我的会议 / 待签到 / 当前可用会议室 / 本周我的预订
 * - 今日日程：今天属于我的会议列表，点击打开预订详情
 * - 会议室速览：当前空闲会议室及设备，可跳转全部预订页
 * - 快捷入口：会议室预订 / 我的预订 / 管理中心（仅管理员可见）
 *
 * 数据全部来自本地演示数据仓库 useMeetState()，不发起任何请求。
 */
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  RightOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import { App, Button, Col, Empty, Flex, Row, Tag } from 'antd';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import BookingDetail from '@/pages/booking/components/BookingDetail';
import { deptOf, getSession } from '@/services/auth';
import type { Booking } from '@/store/meetStore';
import {
  freeRoomsNow,
  getBookingsByDate,
  getDayStats,
  getMyBookings,
  isMine,
  todayStr,
  useMeetState,
} from '@/store/meetStore';
import { palette } from '@/styles/theme';

const WEEKDAYS = [
  '星期日',
  '星期一',
  '星期二',
  '星期三',
  '星期四',
  '星期五',
  '星期六',
];

/** 按时段返回问候语 */
const greetingOf = (hour: number): string => {
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
};

/** 本周（周一 ~ 周日）的起止日期（YYYY-MM-DD） */
const weekRange = (): [string, string] => {
  const today = dayjs();
  const offset = (today.day() + 6) % 7; // 周一为 0
  return [
    today.subtract(offset, 'day').format('YYYY-MM-DD'),
    today.add(6 - offset, 'day').format('YYYY-MM-DD'),
  ];
};

const STATUS_TAG: Record<Booking['status'], React.ReactNode> = {
  confirmed: <Tag color="processing">待进行</Tag>,
  'checked-in': <Tag color="success">已签到</Tag>,
  canceled: <Tag color="default">已取消</Tag>,
};

interface Entry {
  title: string;
  desc: string;
  icon: React.ReactNode;
  path: string;
}

const useStyles = createStyles(({ css, token }) => ({
  page: css`
    padding: 20px 24px 32px;
  `,
  hero: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 16px;
    padding: 26px 28px;
    border-radius: ${palette.radiusCard}px;
    background: linear-gradient(135deg, #1e56e0 0%, #4f46e5 100%);
    color: #fff;

    @media (max-width: 560px) {
      padding: 20px;
    }
  `,
  heroTitle: css`
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    line-height: 1.3;
    color: #fff;

    @media (max-width: 560px) {
      font-size: 22px;
    }
  `,
  heroSub: css`
    margin: 8px 0 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.78);
  `,
  heroPrimary: css`
    && {
      background: #fff;
      border-color: #fff;
      color: #1d4ed8;
      font-weight: 600;
    }
    &&:hover,
    &&:focus {
      background: #eff6ff;
      border-color: #eff6ff;
      color: #1d4ed8;
    }
    &&:active {
      background: #dbeafe;
      border-color: #dbeafe;
      color: #1d4ed8;
    }
  `,
  heroGhost: css`
    && {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.55);
      color: #fff;
      font-weight: 500;
    }
    &&:hover,
    &&:focus {
      background: rgba(255, 255, 255, 0.24);
      border-color: #fff;
      color: #fff;
    }
    &&:active {
      background: rgba(255, 255, 255, 0.32);
      border-color: #fff;
      color: #fff;
    }
  `,
  stats: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 16px;

    @media (max-width: 1100px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  `,
  statCard: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 20px;
    background: ${palette.surface};
    border: 1px solid ${palette.border};
    border-radius: ${palette.radiusCard}px;
    box-shadow: ${palette.shadowCard};
  `,
  statLabel: css`
    font-size: 14px;
    color: ${token.colorTextSecondary};
  `,
  statValue: css`
    margin-top: 8px;
    font-size: 30px;
    font-weight: 700;
    line-height: 1;
    color: ${token.colorText};
  `,
  statIcon: css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: ${palette.gradientBrand};
    color: #fff;
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
    font-size: 19px;
  `,
  mainRow: css`
    margin-bottom: 16px;
  `,
  sectionCard: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 18px 20px;
    background: ${palette.surface};
    border: 1px solid ${palette.border};
    border-radius: ${palette.radiusCard}px;
    box-shadow: ${palette.shadowCard};
  `,
  sectionHead: css`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  `,
  sectionTitle: css`
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  sectionExtra: css`
    font-size: 13px;
    color: ${token.colorTextSecondary};
  `,
  scheduleItem: css`
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 0 -8px;
    padding: 12px 8px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    border-radius: 10px;
    cursor: pointer;
    transition:
      background 0.2s,
      box-shadow 0.2s;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  timeRange: css`
    flex: none;
    width: 108px;
    font-size: 14px;
    font-weight: 600;
    color: #2563eb;
    font-variant-numeric: tabular-nums;
  `,
  itemBody: css`
    flex: 1;
    min-width: 0;
  `,
  itemTitle: css`
    overflow: hidden;
    font-size: 15px;
    font-weight: 600;
    color: ${token.colorText};
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  itemMeta: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    margin-top: 4px;
    font-size: 13px;
    color: ${token.colorTextSecondary};
  `,
  roomItem: css`
    padding: 12px 0;
    border-bottom: 1px solid ${token.colorBorderSecondary};

    &:last-of-type {
      border-bottom: none;
    }
  `,
  roomName: css`
    font-size: 15px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  roomMeta: css`
    margin-top: 4px;
    font-size: 13px;
    color: ${token.colorTextSecondary};
  `,
  equipRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  `,
  sectionFooter: css`
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid ${token.colorBorderSecondary};
  `,
  entryCard: css`
    display: flex;
    align-items: center;
    gap: 14px;
    height: 100%;
    padding: 18px 20px;
    background: ${palette.surface};
    border: 1px solid ${palette.border};
    border-radius: ${palette.radiusCard}px;
    box-shadow: ${palette.shadowCard};
    cursor: pointer;
    transition:
      transform 0.2s,
      border-color 0.2s,
      box-shadow 0.2s;

    &:hover {
      border-color: ${palette.brand};
      transform: translateY(-2px);
      box-shadow: ${palette.shadowCardHover};
    }
  `,
  entryIcon: css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: ${palette.gradientBrand};
    color: #fff;
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
    font-size: 20px;
  `,
  entryTitle: css`
    font-size: 15px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  entryDesc: css`
    margin-top: 4px;
    font-size: 13px;
    color: ${token.colorTextSecondary};
  `,
  entryArrow: css`
    margin-left: auto;
    color: ${token.colorTextTertiary};
  `,
}));

/** 工作台首页：问候卡 / 统计 / 今日日程 / 会议室速览 / 快捷入口 */
const WorkspacePage: React.FC = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const state = useMeetState();
  const session = getSession();
  const userId = session?.user.id;
  const isAdmin = initialState?.currentUser?.access === 'admin';

  const [detail, setDetail] = useState<Booking | null>(null);

  const today = todayStr();
  const now = dayjs();

  const stats = useMemo(
    () => getDayStats(state, today, userId),
    [state, today, userId],
  );
  const myToday = useMemo(
    () => getBookingsByDate(state, today).filter((b) => isMine(b, userId)),
    [state, today, userId],
  );
  const freeRooms = useMemo(() => freeRoomsNow(state), [state]);
  const weekBookings = useMemo(() => {
    const [start, end] = weekRange();
    return getMyBookings(state, userId).filter(
      (b) => b.date >= start && b.date <= end,
    );
  }, [state, userId]);

  const greeting = greetingOf(now.hour());
  const nickname = session?.user.nickname || '';
  const dateText = `${now.format('YYYY年M月D日')} ${WEEKDAYS[now.day()]}`;
  const org = session ? deptOf(session.user) : '';

  const quickBook = () => {
    if (freeRooms.length === 0) {
      message.warning('当前时段暂无空闲会议室，先去看看全部会议室吧');
    }
    history.push('/booking');
  };

  const statItems = [
    {
      label: '今日我的会议',
      value: stats.myToday,
      icon: <ClockCircleOutlined />,
    },
    {
      label: '待签到',
      value: stats.pendingCheckIn,
      icon: <CheckSquareOutlined />,
    },
    {
      label: '当前可用会议室',
      value: stats.availableRooms,
      icon: <CheckCircleOutlined />,
    },
    {
      label: '本周我的预订',
      value: weekBookings.length,
      icon: <CalendarOutlined />,
    },
  ];

  const entries: Entry[] = [
    {
      title: '会议室预订',
      desc: '浏览空闲时段，快速安排会议',
      icon: <CalendarOutlined />,
      path: '/booking',
    },
    {
      title: '我的预订',
      desc: '查看与管理你的会议安排',
      icon: <ClockCircleOutlined />,
      path: '/my',
    },
  ];
  if (isAdmin) {
    entries.push({
      title: '管理中心',
      desc: '会议室与预订的后台管理',
      icon: <SettingOutlined />,
      path: '/admin',
    });
  }

  return (
    <div className={styles.page}>
      {/* 问候卡：时段问候 + 日期 / 租户部门 + 快捷按钮 */}
      <div className={styles.hero}>
        <div>
          <h2 className={styles.heroTitle}>
            {greeting}
            {nickname ? `，${nickname}` : ''}
          </h2>
          <p className={styles.heroSub}>
            {dateText}
            {org ? ` · ${org}` : ''}
          </p>
        </div>
        <Flex gap={10} wrap>
          <Button
            type="primary"
            className={styles.heroPrimary}
            onClick={quickBook}
          >
            快速预订
          </Button>
          <Button
            className={styles.heroGhost}
            onClick={() => history.push('/my')}
          >
            我的预订
          </Button>
        </Flex>
      </div>

      {/* 统计行 */}
      <div className={styles.stats}>
        {statItems.map((s) => (
          <div key={s.label} className={styles.statCard}>
            <div>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statValue}>{s.value}</div>
            </div>
            <div className={styles.statIcon}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* 今日日程（左 2/3）+ 会议室速览（右 1/3） */}
      <Row gutter={[16, 16]} align="stretch" className={styles.mainRow}>
        <Col xs={24} lg={16}>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>今日日程</h3>
              <span className={styles.sectionExtra}>
                共 {myToday.length} 场
              </span>
            </div>
            {myToday.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="今天暂无会议安排"
                style={{ margin: '36px 0' }}
              />
            ) : (
              <div>
                {myToday.map((b) => {
                  const room = state.rooms.find((r) => r.id === b.roomId);
                  return (
                    <div
                      key={b.id}
                      className={styles.scheduleItem}
                      onClick={() => setDetail(b)}
                    >
                      <div className={styles.timeRange}>
                        {`${b.start} - ${b.end}`}
                      </div>
                      <div className={styles.itemBody}>
                        <div className={styles.itemTitle}>{b.title}</div>
                        <div className={styles.itemMeta}>
                          <span>
                            {room
                              ? `${room.name} · ${room.building} ${room.floor}`
                              : '会议室已删除'}
                          </span>
                          <span>
                            <TeamOutlined /> {b.attendees} 人
                          </span>
                        </div>
                      </div>
                      {STATUS_TAG[b.status]}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </Col>

        <Col xs={24} lg={8}>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>会议室速览</h3>
              <span className={styles.sectionExtra}>
                空闲 {freeRooms.length} 间
              </span>
            </div>
            {freeRooms.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="当前时段暂无空闲会议室"
                style={{ margin: '36px 0' }}
              />
            ) : (
              <div>
                {freeRooms.map((r) => (
                  <div key={r.id} className={styles.roomItem}>
                    <div className={styles.roomName}>{r.name}</div>
                    <div className={styles.roomMeta}>
                      {`${r.building} ${r.floor} · 可容纳 ${r.capacity} 人`}
                    </div>
                    <div className={styles.equipRow}>
                      {r.equipment.map((e) => (
                        <Tag key={e}>{e}</Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.sectionFooter}>
              <Button block onClick={() => history.push('/booking')}>
                查看全部 <RightOutlined />
              </Button>
            </div>
          </section>
        </Col>
      </Row>

      {/* 快捷入口 */}
      <Row gutter={[16, 16]}>
        {entries.map((e) => (
          <Col key={e.path} xs={24} sm={entries.length > 2 ? 8 : 12}>
            <div
              className={styles.entryCard}
              onClick={() => history.push(e.path)}
            >
              <div className={styles.entryIcon}>{e.icon}</div>
              <div>
                <div className={styles.entryTitle}>{e.title}</div>
                <div className={styles.entryDesc}>{e.desc}</div>
              </div>
              <RightOutlined className={styles.entryArrow} />
            </div>
          </Col>
        ))}
      </Row>

      {/* 预订详情弹窗 */}
      <BookingDetail
        booking={detail}
        userId={userId}
        onClose={() => setDetail(null)}
      />
    </div>
  );
};

export default WorkspacePage;
