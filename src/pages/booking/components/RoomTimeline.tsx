import { Tag, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';
import type { Booking, Room } from '@/store/meetStore';
import { DAY_END, DAY_START, isMine, toMin } from '@/store/meetStore';
import { palette } from '@/styles/theme';

const HOURS = Array.from(
  { length: (DAY_END - DAY_START) / 60 },
  (_, i) => i + 8,
);
const TOTAL = DAY_END - DAY_START;

const useStyles = createStyles(({ css, token }) => ({
  wrap: css`
    border: 1px solid ${palette.border};
    border-radius: ${palette.radiusCard}px;
    overflow: hidden;
    background: ${palette.surface};
    box-shadow: ${palette.shadowCard};
  `,
  head: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  legend: css`
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 12px;
    color: ${token.colorTextSecondary};

    i {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 3px;
      margin-right: 6px;
      vertical-align: -1px;
    }
  `,
  scroll: css`
    overflow-x: auto;
  `,
  inner: css`
    min-width: 720px;
  `,
  hourRow: css`
    display: flex;
    background: #fafbfc;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  roomColHead: css`
    flex: 0 0 220px;
    padding: 10px 18px;
    font-size: 13px;
    color: ${token.colorTextSecondary};
    border-right: 1px solid ${token.colorBorderSecondary};
  `,
  hourCell: css`
    flex: 1;
    padding: 10px 0 10px 8px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
    border-right: 1px solid ${palette.hourLine};
    white-space: nowrap;
  `,
  row: css`
    display: flex;
    border-bottom: 1px solid ${token.colorBorderSecondary};

    &:last-child {
      border-bottom: none;
    }

    &:hover .roomMeta {
      color: ${palette.brand};
    }
  `,
  roomInfo: css`
    flex: 0 0 220px;
    padding: 14px 18px;
    border-right: 1px solid ${token.colorBorderSecondary};
    background: ${palette.surface};
  `,
  roomName: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  roomMeta: css`
    margin-top: 4px;
    font-size: 12.5px;
    color: ${token.colorTextSecondary};
    transition: color 0.2s;
  `,
  equip: css`
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    span {
      font-size: 11.5px;
      line-height: 1;
      padding: 4px 7px;
      border-radius: 5px;
      background: #f2f4f7;
      color: #595959;
    }
  `,
  track: css`
    position: relative;
    flex: 1;
    min-height: 84px;
    background: ${palette.surface};
  `,
  cells: css`
    position: absolute;
    inset: 0;
    display: flex;
  `,
  cell: css`
    flex: 1;
    border-right: 1px solid ${palette.hourLine};
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: rgba(37, 99, 235, 0.05);
    }
  `,
  block: css`
    position: absolute;
    top: 8px;
    bottom: 8px;
    border-radius: 7px;
    padding: 5px 8px;
    font-size: 11.5px;
    line-height: 1.35;
    overflow: hidden;
    cursor: pointer;
    transition:
      transform 0.15s,
      box-shadow 0.15s;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.16);
    }
  `,
  occupied: css`
    background: ${palette.booking.occupiedBg};
    border: 1px solid ${palette.booking.occupiedBorder};
    color: ${palette.booking.occupiedText};
  `,
  mine: css`
    background: ${palette.booking.mineBg};
    border: 1px solid ${palette.booking.mineBorder};
    color: ${palette.booking.mineText};
  `,
  maintenance: css`
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to right,
      ${palette.booking.unavailable},
      ${palette.booking.unavailable} calc(100% / 12 - 1px),
      ${palette.booking.unavailableLine} calc(100% / 12 - 1px),
      ${palette.booking.unavailableLine} calc(100% / 12)
    );
  `,
  empty: css`
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorTextQuaternary};
    font-size: 12.5px;
  `,
}));

interface Props {
  date: string;
  rooms: Room[];
  bookings: Booking[];
  userId?: number;
  onSlotClick: (room: Room, startMin: number, date: string) => void;
  onBookingClick: (booking: Booking) => void;
}

/** 现代版视图：横向时间轴（8:00 - 20:00） */
const RoomTimeline: React.FC<Props> = ({
  date,
  rooms,
  bookings,
  userId,
  onSlotClick,
  onBookingClick,
}) => {
  const { styles } = useStyles();

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <strong style={{ fontSize: 15 }}>
          {date} · {rooms.length} 间会议室
        </strong>
        <div className={styles.legend}>
          <span>
            <i style={{ background: '#fff', border: '1px solid #d9d9d9' }} />
            空闲
          </span>
          <span>
            <i
              style={{
                background: palette.booking.occupiedBg,
                border: `1px solid ${palette.booking.occupiedBorder}`,
              }}
            />
            已占用
          </span>
          <span>
            <i
              style={{
                background: palette.booking.mineBg,
                border: `1px solid ${palette.booking.mineBorder}`,
              }}
            />
            我的预订
          </span>
          <span>
            <i style={{ background: palette.booking.unavailable }} />
            不可用
          </span>
        </div>
      </div>

      <div className={styles.scroll}>
        <div className={styles.inner}>
          <div className={styles.hourRow}>
            <div className={styles.roomColHead}>会议室</div>
            {HOURS.map((h) => (
              <div key={h} className={styles.hourCell}>
                {h}:00
              </div>
            ))}
          </div>

          {rooms.length === 0 ? (
            <div className={styles.empty} style={{ padding: '46px 0' }}>
              没有符合筛选条件的会议室，试试调整筛选
            </div>
          ) : (
            rooms.map((room) => {
              const roomBookings = bookings.filter(
                (b) => b.roomId === room.id && b.status !== 'canceled',
              );
              return (
                <div className={styles.row} key={room.id}>
                  <div className={styles.roomInfo}>
                    <div className={styles.roomName}>
                      {room.name}
                      {room.status === 'maintenance' ? (
                        <Tag
                          style={{ margin: 0 }}
                          color="default"
                          className="maintain-tag"
                        >
                          维护中
                        </Tag>
                      ) : null}
                    </div>
                    <div className={styles.roomMeta}>
                      {room.building} · {room.floor} · {room.capacity} 人
                    </div>
                    <div className={styles.equip}>
                      {room.equipment.map((e) => (
                        <span key={e}>{e}</span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.track}>
                    <div className={styles.cells}>
                      {HOURS.map((h, i) => (
                        <div
                          key={h}
                          className={styles.cell}
                          onClick={() =>
                            room.status !== 'maintenance' &&
                            onSlotClick(room, DAY_START + i * 60, date)
                          }
                          title={
                            room.status === 'maintenance'
                              ? '维护中，暂不可预订'
                              : `${room.name} ${String(i + 8).padStart(2, '0')}:00 可预订`
                          }
                        />
                      ))}
                    </div>

                    {roomBookings.map((b) => {
                      const start = Math.max(toMin(b.start), DAY_START);
                      const end = Math.min(toMin(b.end), DAY_END);
                      const mine = isMine(b, userId);
                      return (
                        <Tooltip
                          key={b.id}
                          title={
                            <>
                              {b.title} · {b.start}-{b.end}
                              <br />
                              组织者：{b.ownerName}
                              {b.ownerDept ? `（${b.ownerDept}）` : ''} ·{' '}
                              {b.attendees} 人{mine ? ' · 我的预订' : ''}
                            </>
                          }
                        >
                          <div
                            className={`${styles.block} ${mine ? styles.mine : styles.occupied}`}
                            style={{
                              left: `${((start - DAY_START) / TOTAL) * 100}%`,
                              width: `${((end - start) / TOTAL) * 100}%`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onBookingClick(b);
                            }}
                          >
                            {b.title}
                          </div>
                        </Tooltip>
                      );
                    })}

                    {room.status === 'maintenance' ? (
                      <div className={styles.maintenance} />
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomTimeline;
