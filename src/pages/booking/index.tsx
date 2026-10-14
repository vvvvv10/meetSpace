import {
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, DatePicker, Flex, Input, Select, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useMemo, useState } from 'react';
import { useReveal } from '@/hooks/useReveal';
import { getSession } from '@/services/auth';
import type { Booking, Equipment } from '@/store/meetStore';
import {
  ALL_EQUIPMENTS,
  getBookingsByDate,
  getDayStats,
  useMeetState,
} from '@/store/meetStore';
import { useViewMode } from '@/store/viewStore';
import { palette } from '@/styles/theme';
import BookingDetail from './components/BookingDetail';
import BookModal, { type BookPreset } from './components/BookModal';
import CalendarView from './components/CalendarView';
import ClassicView from './components/ClassicView';
import RoomTimeline from './components/RoomTimeline';

const useStyles = createStyles(({ css, token }) => ({
  page: css`
    padding: 20px 24px 32px;
    overflow-x: clip;

    @media (max-width: 576px) {
      padding: 16px 12px 24px;
    }
  `,
  titleRow: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
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
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 16px;

    /* 入场动画错峰（配合 .reveal，见 global.less） */
    > *:nth-child(2) {
      transition-delay: 80ms;
    }

    > *:nth-child(3) {
      transition-delay: 160ms;
    }

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  `,
  statCard: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    background: ${palette.surface};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${palette.radiusCard}px;
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
    background: ${palette.brandSoft};
    color: ${palette.brand};
    font-size: 19px;
  `,
  filterCard: css`
    padding: 16px 18px;
    background: #fff;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${palette.radiusCard}px;
    margin-bottom: 16px;
  `,
  filterLabel: css`
    display: block;
    font-size: 13px;
    color: ${token.colorTextSecondary};
    margin-bottom: 6px;
  `,
  listCard: css`
    background: #fff;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${palette.radiusCard}px;
    overflow: hidden;
  `,
}));

/** 会议室预订主页面（现代版 / 经典版 / 日历版共用顶栏切换） */
const BookingPage: React.FC = () => {
  const { styles } = useStyles();
  const rootRef = useReveal<HTMLDivElement>();
  const state = useMeetState();
  const viewMode = useViewMode();
  const session = getSession();
  const userId = session?.user.id;

  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [floor, setFloor] = useState('all');
  const [capacity, setCapacity] = useState('0');
  const [equipment, setEquipment] = useState('all');
  const [keyword, setKeyword] = useState('');

  const [bookOpen, setBookOpen] = useState(false);
  const [preset, setPreset] = useState<BookPreset | undefined>();
  const [detail, setDetail] = useState<Booking | null>(null);

  const dateStr = date.format('YYYY-MM-DD');
  const bookings = useMemo(
    () => getBookingsByDate(state, dateStr),
    [state, dateStr],
  );
  const stats = useMemo(
    () => getDayStats(state, dateStr, userId),
    [state, dateStr, userId],
  );

  const floorOptions = useMemo(() => {
    const set = new Set(state.rooms.map((r) => `${r.building} ${r.floor}`));
    return [
      { value: 'all', label: '全部楼层' },
      ...[...set].map((f) => ({ value: f, label: f })),
    ];
  }, [state.rooms]);

  const rooms = useMemo(() => {
    const kw = keyword.trim();
    return state.rooms.filter((r) => {
      if (floor !== 'all' && `${r.building} ${r.floor}` !== floor) return false;
      if (capacity !== '0' && r.capacity < Number(capacity)) return false;
      if (equipment !== 'all' && !r.equipment.includes(equipment as Equipment))
        return false;
      if (kw && !`${r.name}${r.building}${r.floor}`.includes(kw)) return false;
      return true;
    });
  }, [state.rooms, floor, capacity, equipment, keyword]);

  const openBook = (p?: BookPreset) => {
    setPreset(p);
    setBookOpen(true);
  };

  const resetFilters = () => {
    setFloor('all');
    setCapacity('0');
    setEquipment('all');
    setKeyword('');
  };

  return (
    <div className={styles.page} ref={rootRef}>
      {/* 标题 + 快捷操作 */}
      <div className={styles.titleRow}>
        <div>
          <h1 className={styles.h1}>会议室预订</h1>
          <p className={styles.sub}>快速找到合适空间，安排高效会议</p>
        </div>
        <Flex gap={10} align="center" wrap>
          <Button
            onClick={() => {
              setDate(dayjs());
            }}
          >
            今天
          </Button>
          <DatePicker
            value={date}
            allowClear={false}
            onChange={(d) => d && setDate(d)}
            disabledDate={(d) => d.isAfter(dayjs().add(1, 'year'))}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openBook({ date: dateStr })}
          >
            快速预订
          </Button>
        </Flex>
      </div>

      {/* 统计卡片 */}
      <div className={styles.stats}>
        <div className={`${styles.statCard} reveal`}>
          <div>
            <div className={styles.statLabel}>今日我的会议</div>
            <div className={styles.statValue}>{stats.myToday}</div>
          </div>
          <div className={styles.statIcon}>
            <ClockCircleOutlined />
          </div>
        </div>
        <div className={`${styles.statCard} reveal`}>
          <div>
            <div className={styles.statLabel}>当前可用会议室</div>
            <div className={styles.statValue}>{stats.availableRooms}</div>
          </div>
          <div className={styles.statIcon}>
            <CheckCircleOutlined />
          </div>
        </div>
        <div className={`${styles.statCard} reveal`}>
          <div>
            <Tooltip title="我发起的、尚未签到的会议">
              <div className={styles.statLabel} style={{ cursor: 'help' }}>
                待签到
              </div>
            </Tooltip>
            <div className={styles.statValue}>{stats.pendingCheckIn}</div>
          </div>
          <div className={styles.statIcon}>
            <CheckSquareOutlined />
          </div>
        </div>
      </div>

      {/* 筛选 */}
      <div className={`${styles.filterCard} reveal`}>
        <Flex gap={16} align="flex-end" wrap>
          <div style={{ width: 160 }}>
            <span className={styles.filterLabel}>楼层</span>
            <Select
              value={floor}
              options={floorOptions}
              onChange={setFloor}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ width: 150 }}>
            <span className={styles.filterLabel}>容纳人数</span>
            <Select
              value={capacity}
              onChange={setCapacity}
              style={{ width: '100%' }}
              options={[
                { value: '0', label: '不限人数' },
                { value: '6', label: '6 人及以上' },
                { value: '12', label: '12 人及以上' },
                { value: '20', label: '20 人及以上' },
              ]}
            />
          </div>
          <div style={{ width: 150 }}>
            <span className={styles.filterLabel}>设备</span>
            <Select
              value={equipment}
              onChange={setEquipment}
              style={{ width: '100%' }}
              options={[
                { value: 'all', label: '全部设备' },
                ...ALL_EQUIPMENTS.map((e) => ({ value: e, label: e })),
              ]}
            />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <span className={styles.filterLabel}>搜索会议室</span>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="输入名称、楼盘或楼层"
              allowClear
            />
          </div>
          <Button onClick={resetFilters}>清除筛选</Button>
        </Flex>
      </div>

      {/* 视图切换渲染 */}
      <div className={`${styles.listCard} reveal`}>
        {viewMode === 'modern' ? (
          <div style={{ padding: 0 }}>
            <RoomTimeline
              date={dateStr}
              rooms={rooms}
              bookings={bookings}
              userId={userId}
              onSlotClick={(room, startMin, d) =>
                openBook({ roomId: room.id, date: d, startMin })
              }
              onBookingClick={setDetail}
            />
          </div>
        ) : null}
        {viewMode === 'classic' ? (
          <ClassicView
            date={dateStr}
            rooms={rooms}
            bookings={bookings}
            userId={userId}
            onBookingClick={setDetail}
            onSlotClick={(room, startMin, d) =>
              openBook({ roomId: room.id, date: d, startMin })
            }
          />
        ) : null}
        {viewMode === 'calendar' ? (
          <CalendarView
            date={dateStr}
            userId={userId}
            onDateChange={(d) => setDate(dayjs(d))}
            onBookingClick={setDetail}
          />
        ) : null}
      </div>

      <BookModal
        open={bookOpen}
        preset={preset}
        onClose={() => setBookOpen(false)}
      />
      <BookingDetail
        booking={detail}
        userId={userId}
        onClose={() => setDetail(null)}
      />
    </div>
  );
};

export default BookingPage;
