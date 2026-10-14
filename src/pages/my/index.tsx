/**
 * 「我的预订」页面
 *
 * 统计我发起的会议（待进行 / 待签到 / 已签到 / 已取消），
 * 支持按状态、关键词、日期范围筛选，并可查看详情、当日签到、取消预订。
 * 数据全部来自本地 meetStore（useMeetState），实时响应变化。
 */
import {
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  DatePicker,
  Empty,
  Flex,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { createStyles } from 'antd-style';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import React, { useMemo, useState } from 'react';
import BookingDetail from '@/pages/booking/components/BookingDetail';
import { getSession } from '@/services/auth';
import type { Booking } from '@/store/meetStore';
import {
  cancelAnyBooking,
  checkInAnyBooking,
  getMyBookings,
  isMine,
  todayStr,
  toMin,
  useMeetState,
} from '@/store/meetStore';
import { palette } from '@/styles/theme';

const useStyles = createStyles(({ css, token }) => ({
  page: css`
    padding: 20px 24px 32px;
  `,
  titleRow: css`
    margin-bottom: 18px;
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
  stats: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 16px;

    @media (max-width: 1100px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 700px) {
      grid-template-columns: 1fr;
    }
  `,
  statCard: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
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
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: ${palette.gradientBrand};
    color: #fff;
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
    font-size: 19px;
  `,
  filterCard: css`
    padding: 16px 18px;
    background: ${palette.surface};
    border: 1px solid ${palette.border};
    border-radius: ${palette.radiusCard}px;
    box-shadow: ${palette.shadowCard};
    margin-bottom: 16px;
  `,
  filterLabel: css`
    display: block;
    font-size: 13px;
    color: ${token.colorTextSecondary};
    margin-bottom: 6px;
  `,
  listCard: css`
    background: ${palette.surface};
    border: 1px solid ${palette.border};
    border-radius: ${palette.radiusCard}px;
    box-shadow: ${palette.shadowCard};
    overflow: hidden;
  `,
  note: css`
    max-width: 260px;
    margin-top: 2px;
    font-size: 12.5px;
    color: ${token.colorTextTertiary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  subText: css`
    font-size: 12.5px;
    color: ${token.colorTextSecondary};
  `,
}));

const STATUS_TAG: Record<Booking['status'], React.ReactNode> = {
  confirmed: <Tag color="processing">待进行</Tag>,
  'checked-in': <Tag color="success">已签到</Tag>,
  canceled: <Tag color="default">已取消</Tag>,
};

/** 我的预订：查看我发起的会议，支持筛选、签到与取消 */
const MyBookingsPage: React.FC = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const state = useMeetState();
  const session = getSession();
  const userId = session?.user.id;

  const [status, setStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);

  const today = todayStr();

  /**
   * 我的预订（按 date + start 升序）。
   * getMyBookings 会排除已取消，这里从 store 补回，保证「已取消」统计与筛选可用。
   */
  const myBookings = useMemo(() => {
    const active = getMyBookings(state, userId);
    const canceled = state.bookings.filter(
      (b) => b.status === 'canceled' && isMine(b, userId),
    );
    return [...active, ...canceled].sort(
      (a, b) => a.date.localeCompare(b.date) || toMin(a.start) - toMin(b.start),
    );
  }, [state, userId]);

  const stats = useMemo(() => {
    const upcoming = myBookings.filter(
      (b) => b.status === 'confirmed' && b.date >= today,
    );
    return {
      upcoming: upcoming.length,
      toCheckIn: upcoming.filter((b) => b.date === today).length,
      checkedIn: myBookings.filter((b) => b.status === 'checked-in').length,
      canceled: myBookings.filter((b) => b.status === 'canceled').length,
    };
  }, [myBookings, today]);

  const filtered = useMemo(() => {
    const kw = keyword.trim();
    return myBookings.filter((b) => {
      if (status !== 'all' && b.status !== status) return false;
      if (range) {
        const start = range[0].format('YYYY-MM-DD');
        const end = range[1].format('YYYY-MM-DD');
        if (b.date < start || b.date > end) return false;
      }
      if (kw) {
        const room = state.rooms.find((r) => r.id === b.roomId);
        if (!`${b.title}${room?.name ?? ''}`.includes(kw)) return false;
      }
      return true;
    });
  }, [myBookings, status, range, keyword, state.rooms]);

  const resetFilters = () => {
    setStatus('all');
    setKeyword('');
    setRange(null);
  };

  const columns: ColumnsType<Booking> = [
    {
      title: '会议主题',
      key: 'title',
      render: (_, b) => (
        <div>
          <div style={{ fontWeight: 600 }}>{b.title}</div>
          {b.note ? (
            <Tooltip title={b.note}>
              <div className={styles.note}>{b.note}</div>
            </Tooltip>
          ) : null}
        </div>
      ),
    },
    {
      title: '会议室',
      key: 'room',
      render: (_, b) => {
        const room = state.rooms.find((r) => r.id === b.roomId);
        if (!room) return '已删除';
        return (
          <span>
            {room.name} · {room.building} {room.floor}
            {room.status === 'maintenance' ? (
              <Tag style={{ marginLeft: 6 }} color="default">
                维护中
              </Tag>
            ) : null}
          </span>
        );
      },
    },
    {
      title: '时间',
      key: 'time',
      render: (_, b) =>
        `${dayjs(`${b.date} ${b.start}`)
          .locale('zh-cn')
          .format('M月D日 ddd HH:mm')}-${b.end}`,
    },
    {
      title: '参会人数',
      key: 'attendees',
      width: 96,
      render: (_, b) => `${b.attendees} 人`,
    },
    {
      title: '组织者',
      key: 'owner',
      render: (_, b) => (
        <div>
          <div>{b.ownerName}</div>
          {b.ownerDept ? (
            <div className={styles.subText}>{b.ownerDept}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 96,
      render: (_, b) => STATUS_TAG[b.status],
    },
    {
      title: '操作',
      key: 'action',
      width: 190,
      render: (_, b) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => setDetail(b)}>
            详情
          </Button>
          {b.date === today && b.status === 'confirmed' ? (
            <Button
              type="link"
              size="small"
              onClick={() => {
                checkInAnyBooking(b.id);
                message.success('签到成功');
              }}
            >
              签到
            </Button>
          ) : null}
          {b.status === 'confirmed' ? (
            <Popconfirm
              title="确定取消这个预订吗？"
              okText="取消预订"
              cancelText="再想想"
              onConfirm={() => {
                cancelAnyBooking(b.id);
                message.success('预订已取消');
              }}
            >
              <Button type="link" size="small" danger>
                取消
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  const statCards: { label: string; value: number; icon: React.ReactNode }[] = [
    { label: '待进行', value: stats.upcoming, icon: <ClockCircleOutlined /> },
    {
      label: '待签到',
      value: stats.toCheckIn,
      icon: <CheckSquareOutlined />,
    },
    {
      label: '已签到',
      value: stats.checkedIn,
      icon: <CheckCircleOutlined />,
    },
    {
      label: '已取消',
      value: stats.canceled,
      icon: <CloseCircleOutlined />,
    },
  ];

  return (
    <div className={styles.page}>
      {/* 标题 */}
      <div className={styles.titleRow}>
        <h1 className={styles.h1}>我的预订</h1>
        <p className={styles.sub}>管理你发起的会议，随时签到或取消</p>
      </div>

      {/* 统计卡片 */}
      <div className={styles.stats}>
        {statCards.map((c) => (
          <div className={styles.statCard} key={c.label}>
            <div>
              <div className={styles.statLabel}>{c.label}</div>
              <div className={styles.statValue}>{c.value}</div>
            </div>
            <div className={styles.statIcon}>{c.icon}</div>
          </div>
        ))}
      </div>

      {/* 筛选 */}
      <div className={styles.filterCard}>
        <Flex gap={16} align="flex-end" wrap>
          <div style={{ width: 150 }}>
            <span className={styles.filterLabel}>状态</span>
            <Select
              value={status}
              onChange={setStatus}
              style={{ width: '100%' }}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'confirmed', label: '待进行' },
                { value: 'checked-in', label: '已签到' },
                { value: 'canceled', label: '已取消' },
              ]}
            />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <span className={styles.filterLabel}>搜索预订</span>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="输入会议主题或会议室名"
              allowClear
            />
          </div>
          <div>
            <span className={styles.filterLabel}>日期范围</span>
            <DatePicker.RangePicker
              value={range}
              onChange={(dates) => {
                const [start, end] = dates ?? [];
                setRange(start && end ? [start, end] : null);
              }}
            />
          </div>
          <Button onClick={resetFilters}>清除筛选</Button>
        </Flex>
      </div>

      {/* 预订列表 */}
      <div className={styles.listCard}>
        <Table<Booking>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 960 }}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{
            emptyText: (
              <Empty description="还没有预订记录，去会议室预订页看看" />
            ),
          }}
        />
      </div>

      <BookingDetail
        booking={detail}
        userId={userId}
        onClose={() => setDetail(null)}
      />
    </div>
  );
};

export default MyBookingsPage;
