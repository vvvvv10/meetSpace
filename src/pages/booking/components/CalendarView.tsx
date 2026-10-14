import type { CalendarProps } from 'antd';
import { Calendar, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React from 'react';
import type { Booking } from '@/store/meetStore';
import { getBookingsByDate, isMine, useMeetState } from '@/store/meetStore';

interface Props {
  date: string;
  userId?: number;
  onDateChange: (date: string) => void;
  onBookingClick: (booking: Booking) => void;
}

/** 日历版视图：按月查看会议室预订，点击日期回到时间轴 */
const CalendarView: React.FC<Props> = ({
  date,
  userId,
  onDateChange,
  onBookingClick,
}) => {
  const state = useMeetState();

  const cellRender: NonNullable<CalendarProps<Dayjs>['cellRender']> = (
    current,
    info,
  ) => {
    if (info.type !== 'date') return info.originNode;
    const ds = current.format('YYYY-MM-DD');
    const list = getBookingsByDate(state, ds).filter(
      (b) => b.status !== 'canceled',
    );
    if (list.length === 0) return null;
    const shown = list.slice(0, 2);
    const rest = list.length - shown.length;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {shown.map((b) => {
          const mine = isMine(b, userId);
          return (
            <Tag
              key={b.id}
              color={mine ? 'success' : 'orange'}
              style={{
                margin: 0,
                padding: '0 4px',
                fontSize: 11,
                lineHeight: '16px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onBookingClick(b);
              }}
            >
              {b.start} {b.title}
            </Tag>
          );
        })}
        {rest > 0 ? (
          <span style={{ fontSize: 11, color: '#8c8c8c' }}>+{rest} 个预订</span>
        ) : null}
      </div>
    );
  };

  return (
    <div style={{ background: '#fff', padding: '8px 16px 16px' }}>
      <Calendar
        fullscreen
        value={dayjs(date)}
        cellRender={cellRender}
        onChange={(d) => onDateChange(d.format('YYYY-MM-DD'))}
        headerRender={({ value, type: _type, onChange: onPanelChange }) => (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 4px',
            }}
          >
            <strong style={{ fontSize: 16 }}>
              {value.format('YYYY年M月')}
            </strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <Tag color="orange" style={{ margin: 0, cursor: 'default' }}>
                已占用
              </Tag>
              <Tag color="success" style={{ margin: 0, cursor: 'default' }}>
                我的预订
              </Tag>
              <Tag style={{ margin: 0, cursor: 'default' }}>今天</Tag>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Tag
                style={{ cursor: 'pointer' }}
                onClick={() => onPanelChange(value.subtract(1, 'month'))}
              >
                上一月
              </Tag>
              <Tag
                color="primary"
                style={{ cursor: 'pointer' }}
                onClick={() => onPanelChange(dayjs())}
              >
                本月
              </Tag>
              <Tag
                style={{ cursor: 'pointer' }}
                onClick={() => onPanelChange(value.add(1, 'month'))}
              >
                下一月
              </Tag>
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default CalendarView;
