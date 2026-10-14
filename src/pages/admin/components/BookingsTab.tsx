/**
 * 管理中心 · 预订管理
 *
 * 按日期查看当天全部预订（种子 + 演示生成 + 手工创建，均可管理），
 * 支持查看详情（复用 BookingDetail）、签到与取消。
 */

import type { TableColumnsType } from 'antd';
import {
  App,
  Button,
  DatePicker,
  Flex,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { createStyles } from 'antd-style';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useMemo, useState } from 'react';
import BookingDetail from '@/pages/booking/components/BookingDetail';
import { getSession } from '@/services/auth';
import type { Booking, BookingStatus } from '@/store/meetStore';
import {
  cancelAnyBooking,
  checkInAnyBooking,
  getBookingsByDate,
  useMeetState,
} from '@/store/meetStore';
import { palette } from '@/styles/theme';

const useStyles = createStyles(({ css, token }) => ({
  card: css`
    background: ${palette.surface};
    border: 1px solid ${palette.border};
    border-radius: ${palette.radiusCard}px;
    box-shadow: ${palette.shadowCard};
    padding: 16px 18px;
  `,
  toolbar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px 20px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  `,
  toolbarLabel: css`
    font-size: 13px;
    color: ${token.colorTextSecondary};
  `,
  stat: css`
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
  `,
  statLabel: css`
    font-size: 13px;
    color: ${token.colorTextSecondary};
  `,
  statValue: css`
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: ${token.colorText};
  `,
}));

const BOOKING_STATUS_TAG: Record<BookingStatus, React.ReactNode> = {
  confirmed: <Tag color="processing">待进行</Tag>,
  'checked-in': <Tag color="success">已签到</Tag>,
  canceled: <Tag color="default">已取消</Tag>,
};

/** 预订管理 Tab */
const BookingsTab: React.FC = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const state = useMeetState();
  const session = getSession();
  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [detail, setDetail] = useState<Booking | null>(null);

  const dateStr = date.format('YYYY-MM-DD');
  const bookings = useMemo(
    () => getBookingsByDate(state, dateStr),
    [state, dateStr],
  );

  const stats = [
    { label: '当日预订总数', value: bookings.length },
    {
      label: '已签到',
      value: bookings.filter((b) => b.status === 'checked-in').length,
    },
    {
      label: '待进行',
      value: bookings.filter((b) => b.status === 'confirmed').length,
    },
    {
      label: '已取消',
      value: bookings.filter((b) => b.status === 'canceled').length,
    },
  ];

  const roomName = (roomId: string) =>
    state.rooms.find((r) => r.id === roomId)?.name ?? '已删除';

  const columns: TableColumnsType<Booking> = [
    { title: '会议主题', dataIndex: 'title', width: 200 },
    {
      title: '会议室',
      key: 'room',
      width: 130,
      render: (_, booking) => roomName(booking.roomId),
    },
    {
      title: '时间',
      key: 'time',
      width: 130,
      render: (_, booking) => `${booking.start} - ${booking.end}`,
    },
    {
      title: '组织者',
      key: 'owner',
      width: 210,
      render: (_, booking) => (
        <Space size={4}>
          <span>{booking.ownerName}</span>
          {booking.ownerDept ? (
            <Typography.Text type="secondary">
              （{booking.ownerDept}）
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    { title: '参会人数', dataIndex: 'attendees', width: 90 },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, booking) => BOOKING_STATUS_TAG[booking.status],
    },
    {
      title: '操作',
      key: 'action',
      width: 210,
      render: (_, booking) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => setDetail(booking)}>
            详情
          </Button>
          <Button
            type="link"
            size="small"
            disabled={booking.status !== 'confirmed'}
            onClick={() => {
              checkInAnyBooking(booking.id);
              message.success(`「${booking.title}」已签到`);
            }}
          >
            签到
          </Button>
          <Popconfirm
            title="确定取消该预订吗？"
            okText="取消预订"
            cancelText="再想想"
            onConfirm={() => {
              cancelAnyBooking(booking.id);
              message.success(`「${booking.title}」已取消`);
            }}
          >
            <Button
              type="link"
              size="small"
              danger
              disabled={booking.status === 'canceled'}
            >
              取消
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.card}>
      <Flex
        className={styles.toolbar}
        justify="space-between"
        align="center"
        gap={12}
        wrap
      >
        <Space size={8}>
          <span className={styles.toolbarLabel}>选择日期</span>
          <DatePicker
            value={date}
            allowClear={false}
            onChange={(d) => d && setDate(d)}
          />
        </Space>
        <Flex gap={20} wrap>
          {stats.map((s) => (
            <span key={s.label} className={styles.stat}>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statValue}>{s.value}</span>
            </span>
          ))}
        </Flex>
      </Flex>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={bookings}
        pagination={false}
      />

      <BookingDetail
        booking={detail}
        userId={session?.user.id}
        onClose={() => setDetail(null)}
      />
    </div>
  );
};

export default BookingsTab;
