import { CalendarOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import React from 'react';
import type { Booking, Room } from '@/store/meetStore';
import { isMine, toMin } from '@/store/meetStore';

interface Props {
  date: string;
  rooms: Room[];
  bookings: Booking[];
  userId?: number;
  onBookingClick: (booking: Booking) => void;
  onSlotClick: (room: Room, startMin: number, date: string) => void;
}

interface Row {
  key: string;
  room: Room;
  list: Booking[];
}

/** 经典版视图：会议室列表 + 当日日程条 */
const ClassicView: React.FC<Props> = ({
  date,
  rooms,
  bookings,
  userId,
  onBookingClick,
  onSlotClick,
}) => {
  const columns: ColumnsType<Row> = [
    {
      title: '会议室',
      dataIndex: 'room',
      width: 240,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {row.room.name}
            {row.room.status === 'maintenance' ? (
              <Tag style={{ marginLeft: 8 }} color="default">
                维护中
              </Tag>
            ) : null}
          </div>
          <div style={{ fontSize: 12.5, color: '#8c8c8c', marginTop: 4 }}>
            {row.room.building} · {row.room.floor} · {row.room.capacity} 人
          </div>
          <div
            style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {row.room.equipment.map((e) => (
              <Tag key={e} style={{ marginRight: 0 }}>
                {e}
              </Tag>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: '当日安排',
      key: 'list',
      render: (_, row) =>
        row.list.length === 0 ? (
          <span style={{ color: '#8c8c8c' }}>
            全天空闲 · 08:00 - 20:00 可预订
          </span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {row.list.map((b) => {
              const mine = isMine(b, userId);
              return (
                <Tag
                  key={b.id}
                  color={mine ? 'success' : 'orange'}
                  style={{ cursor: 'pointer', marginRight: 0 }}
                  onClick={() => onBookingClick(b)}
                >
                  {b.start}-{b.end} {b.title}
                  {b.status === 'checked-in' ? '（已签到）' : ''}
                </Tag>
              );
            })}
          </div>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      render: (_, row) => (
        <Button
          size="small"
          type="link"
          icon={<PlusOutlined />}
          disabled={row.room.status === 'maintenance'}
          onClick={() => onSlotClick(row.room, 9 * 60, date)}
        >
          预订
        </Button>
      ),
    },
  ];

  const data: Row[] = rooms.map((room) => ({
    key: room.id,
    room,
    list: bookings
      .filter((b) => b.roomId === room.id && b.status !== 'canceled')
      .sort((a, b) => toMin(a.start) - toMin(b.start)),
  }));

  return (
    <div style={{ background: '#fff', padding: '4px 4px 8px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 14px 4px',
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        <CalendarOutlined style={{ color: '#2563eb' }} />
        {dayjs(date).format('YYYY年M月D日')} · {rooms.length} 间会议室
      </div>
      <Table<Row>
        rowKey="key"
        columns={columns}
        dataSource={data}
        pagination={false}
        size="middle"
      />
    </div>
  );
};

export default ClassicView;
