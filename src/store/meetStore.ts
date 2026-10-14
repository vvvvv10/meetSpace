/**
 * MeetSpace 演示数据仓库
 *
 * 会议室 / 预订数据为本地演示数据（后端仅开放用户中心），
 * 持久化在 localStorage，支持「重置演示数据」。
 * 预订是否“我的”由 ownerId === 当前登录用户判断（种子数据 ownerId=0 表示“我”）。
 */
import dayjs from 'dayjs';
import { useSyncExternalStore } from 'react';

export type Equipment = '视频会议' | '投影' | '电视' | '白板' | '电话';

export const ALL_EQUIPMENTS: Equipment[] = [
  '视频会议',
  '投影',
  '电视',
  '白板',
  '电话',
];

export type RoomStatus = 'available' | 'maintenance';

export interface Room {
  id: string;
  name: string;
  building: string;
  floor: string;
  floorNum: number;
  capacity: number;
  equipment: Equipment[];
  status: RoomStatus;
  /** 管理中心新增/编辑标记 */
  custom?: boolean;
}

export type BookingStatus = 'confirmed' | 'checked-in' | 'canceled';

export interface Booking {
  id: string;
  roomId: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  /** ownerId=0 表示演示数据里的“我” */
  ownerId: number;
  ownerName: string;
  ownerDept?: string;
  attendees: number;
  note?: string;
  status: BookingStatus;
  /** 用户手工创建的预订（重置演示数据时保留） */
  custom?: boolean;
}

export interface MeetState {
  rooms: Room[];
  /** 手工创建 / 管理的预订 */
  customBookings: Booking[];
  /** 种子数据基准日（跨天后自动按今天重新播种） */
  seedDate: string;
}

/** 时间轴范围 8:00 - 20:00（展示 8:00 ~ 19:00 共 12 格） */
export const DAY_START = 8 * 60;
export const DAY_END = 20 * 60;

const STORAGE_KEY = 'meetspace.data.v2';

export const todayStr = () => dayjs().format('YYYY-MM-DD');

export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const toTime = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const uid = (prefix = 'bk') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** 是否“我的”预订 */
export const isMine = (b: Booking, userId?: number) =>
  b.ownerId === 0 || (userId !== undefined && b.ownerId === userId);

export const overlap = (a1: number, a2: number, b1: number, b2: number) =>
  a1 < b2 && b1 < a2;

/* ------------------------------------------------------------------ */
/* 种子数据                                                            */
/* ------------------------------------------------------------------ */

const SEED_ROOMS: Room[] = [
  {
    id: 'r_aurora',
    name: '极光',
    building: 'A座',
    floor: '6F',
    floorNum: 6,
    capacity: 12,
    equipment: ['视频会议', '电视', '白板'],
    status: 'available',
  },
  {
    id: 'r_halo',
    name: '星环',
    building: 'A座',
    floor: '6F',
    floorNum: 6,
    capacity: 8,
    equipment: ['电视', '白板'],
    status: 'available',
  },
  {
    id: 'r_bay',
    name: '海湾',
    building: 'B座',
    floor: '3F',
    floorNum: 3,
    capacity: 20,
    equipment: ['视频会议', '投影', '白板'],
    status: 'available',
  },
  {
    id: 'r_bamboo',
    name: '竹影',
    building: 'B座',
    floor: '3F',
    floorNum: 3,
    capacity: 6,
    equipment: ['电视'],
    status: 'available',
  },
  {
    id: 'r_cloud',
    name: '云巅',
    building: 'A座',
    floor: '8F',
    floorNum: 8,
    capacity: 30,
    equipment: ['视频会议', '投影', '电话'],
    status: 'maintenance',
  },
];

type SeedBooking = Omit<Booking, 'id' | 'status'> & {
  dayOffset: number;
  status?: BookingStatus;
};

const SEED_BOOKINGS: SeedBooking[] = [
  // 今天（与效果图一致）
  {
    dayOffset: 0,
    roomId: 'r_aurora',
    title: '产品迭代周会',
    date: '',
    start: '09:00',
    end: '11:00',
    ownerId: 1001,
    ownerName: '周琳',
    ownerDept: '产品设计部',
    attendees: 9,
    status: 'confirmed',
  },
  {
    dayOffset: 0,
    roomId: 'r_halo',
    title: '视觉设计评审',
    date: '',
    start: '11:00',
    end: '13:00',
    ownerId: 1002,
    ownerName: '苏晚',
    ownerDept: '体验设计部',
    attendees: 6,
    status: 'confirmed',
  },
  {
    dayOffset: 0,
    roomId: 'r_aurora',
    title: 'MeetSpace 需求对齐',
    date: '',
    start: '14:00',
    end: '16:00',
    ownerId: 0,
    ownerName: '我',
    ownerDept: '产品设计部',
    attendees: 8,
    note: '对齐会议邀约一期范围与排期',
    status: 'confirmed',
  },
  // 昨天
  {
    dayOffset: -1,
    roomId: 'r_bay',
    title: '跨部门项目对齐',
    date: '',
    start: '10:00',
    end: '11:30',
    ownerId: 1003,
    ownerName: '李鸣',
    ownerDept: '技术中台',
    attendees: 16,
    status: 'confirmed',
  },
  {
    dayOffset: -1,
    roomId: 'r_aurora',
    title: '方案二次评审',
    date: '',
    start: '15:00',
    end: '16:00',
    ownerId: 0,
    ownerName: '我',
    ownerDept: '产品设计部',
    attendees: 5,
    status: 'checked-in',
  },
  // 明天
  {
    dayOffset: 1,
    roomId: 'r_halo',
    title: '候选人面试',
    date: '',
    start: '10:00',
    end: '11:00',
    ownerId: 1004,
    ownerName: '陈可',
    ownerDept: '人力资源部',
    attendees: 3,
    status: 'confirmed',
  },
  {
    dayOffset: 1,
    roomId: 'r_bamboo',
    title: '一对一沟通',
    date: '',
    start: '14:00',
    end: '15:00',
    ownerId: 0,
    ownerName: '我',
    ownerDept: '产品设计部',
    attendees: 2,
    status: 'confirmed',
  },
  // 后天
  {
    dayOffset: 2,
    roomId: 'r_bay',
    title: '季度规划共创',
    date: '',
    start: '09:30',
    end: '11:30',
    ownerId: 0,
    ownerName: '我',
    ownerDept: '产品设计部',
    attendees: 18,
    status: 'confirmed',
  },
  {
    dayOffset: 2,
    roomId: 'r_aurora',
    title: '版本发布同步',
    date: '',
    start: '13:00',
    end: '14:00',
    ownerId: 1005,
    ownerName: '郑一',
    ownerDept: '研发效能组',
    attendees: 7,
    status: 'confirmed',
  },
  // 大后天
  {
    dayOffset: 3,
    roomId: 'r_bamboo',
    title: '新人入职面谈',
    date: '',
    start: '16:00',
    end: '17:00',
    ownerId: 1006,
    ownerName: '方可',
    ownerDept: '人力资源部',
    attendees: 2,
    status: 'confirmed',
  },
];

/** 生成演示“他人占用”的模板（用于种子覆盖之外的日期） */
const GUEST_TEMPLATES: {
  roomIds: string[];
  start: string;
  end: string;
  title: string;
  ownerName: string;
  ownerDept: string;
  attendees: number;
}[] = [
  {
    roomIds: ['r_aurora', 'r_bay'],
    start: '09:00',
    end: '10:30',
    title: '项目进度同步',
    ownerName: '周琳',
    ownerDept: '产品设计部',
    attendees: 8,
  },
  {
    roomIds: ['r_halo', 'r_bamboo'],
    start: '11:00',
    end: '12:00',
    title: '招聘面试',
    ownerName: '陈可',
    ownerDept: '人力资源部',
    attendees: 3,
  },
  {
    roomIds: ['r_bay', 'r_aurora'],
    start: '14:00',
    end: '15:30',
    title: '客户方案演示',
    ownerName: '李鸣',
    ownerDept: '技术中台',
    attendees: 12,
  },
  {
    roomIds: ['r_halo', 'r_bamboo'],
    start: '16:00',
    end: '17:00',
    title: '设计走查',
    ownerName: '苏晚',
    ownerDept: '体验设计部',
    attendees: 5,
  },
  {
    roomIds: ['r_bay'],
    start: '13:00',
    end: '14:30',
    title: '事业部月度复盘',
    ownerName: '郑一',
    ownerDept: '研发效能组',
    attendees: 18,
  },
];

/** 简单字符串哈希（保证同一天生成结果稳定） */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(h);
}

function seedBookingsFor(seedDate: string): Booking[] {
  const base = dayjs(seedDate);
  return SEED_BOOKINGS.map((s) => ({
    ...s,
    id: `seed_${s.dayOffset}_${s.roomId}_${s.start}`,
    date: base.add(s.dayOffset, 'day').format('YYYY-MM-DD'),
    status: s.status ?? 'confirmed',
  }));
}

/** 生成某一天的“他人占用”演示预订（确定性，避免与已有预订冲突） */
function guestBookingsFor(
  date: string,
  rooms: Room[],
  existing: Booking[],
): Booking[] {
  if (date === todayStr()) return []; // 今天保持与效果图一致
  const h = hash(date);
  const count = (h % 3) + 1; // 1~3 条
  const result: Booking[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = GUEST_TEMPLATES[(h >> (i * 3)) % GUEST_TEMPLATES.length];
    const roomId = t.roomIds[(h >> (i * 2)) % t.roomIds.length];
    const room = rooms.find((r) => r.id === roomId);
    if (!room || room.status === 'maintenance') continue;
    const all = [...existing, ...result];
    const conflict = all.some(
      (b) =>
        b.roomId === roomId &&
        b.date === date &&
        b.status !== 'canceled' &&
        overlap(toMin(b.start), toMin(b.end), toMin(t.start), toMin(t.end)),
    );
    if (conflict) continue;
    result.push({
      id: `gen_${date}_${i}`,
      roomId,
      title: t.title,
      date,
      start: t.start,
      end: t.end,
      ownerId: 2000 + i,
      ownerName: t.ownerName,
      ownerDept: t.ownerDept,
      attendees: t.attendees,
      status: 'confirmed',
    });
  }
  return result;
}

function seedState(): MeetState {
  const today = todayStr();
  return {
    rooms: SEED_ROOMS.map((r) => ({ ...r })),
    customBookings: [],
    seedDate: today,
  };
}

function loadState(): MeetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as MeetState;
    if (!parsed?.rooms?.length) return seedState();
    if (parsed.seedDate !== todayStr()) {
      // 跨天：保留用户手工创建的预订，重新播种演示数据
      return {
        rooms: parsed.rooms,
        customBookings: (parsed.customBookings || []).filter(
          (b) => b.custom && b.date >= todayStr(),
        ),
        seedDate: todayStr(),
      };
    }
    return parsed;
  } catch {
    return seedState();
  }
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

let state: MeetState = loadState();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 忽略存储异常 */
  }
}

function emit() {
  persist();
  listeners.forEach((fn) => {
    fn();
  });
}

function setState(next: MeetState) {
  state = next;
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const getSnapshot = () => state;

/** React 订阅演示数据 */
export function useMeetState(): MeetState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const getState = () => state;

/** 某一天的全部预订（种子 + 演示生成 + 手工创建） */
export function getBookingsByDate(s: MeetState, date: string): Booking[] {
  const seeded =
    s.seedDate === date
      ? seedBookingsFor(s.seedDate)
      : SEED_BOOKINGS.filter((x) => x.dayOffset !== 0)
          .map((x) => ({
            ...x,
            id: `seed_${x.dayOffset}_${x.roomId}_${x.start}`,
            date: dayjs(s.seedDate)
              .add(x.dayOffset, 'day')
              .format('YYYY-MM-DD'),
            status: x.status ?? 'confirmed',
          }))
          .filter((b) => b.date === date);
  const custom = s.customBookings.filter((b) => b.date === date);
  const all = [...seeded, ...custom];
  const guests = guestBookingsFor(date, s.rooms, all);
  return [...all, ...guests].sort((a, b) => toMin(a.start) - toMin(b.start));
}

/** 我的全部预订（升序） */
export function getMyBookings(s: MeetState, userId?: number): Booking[] {
  const dates = new Set<string>();
  seedBookingsFor(s.seedDate).forEach((b) => {
    dates.add(b.date);
  });
  s.customBookings.forEach((b) => {
    dates.add(b.date);
  });
  // 覆盖未来 30 天的演示生成数据
  for (let i = -1; i <= 30; i += 1) {
    dates.add(dayjs(s.seedDate).add(i, 'day').format('YYYY-MM-DD'));
  }
  const mine: Booking[] = [];
  dates.forEach((date) => {
    getBookingsByDate(s, date)
      .filter((b) => isMine(b, userId) && b.status !== 'canceled')
      .forEach((b) => {
        mine.push(b);
      });
  });
  return mine.sort(
    (a, b) => a.date.localeCompare(b.date) || toMin(a.start) - toMin(b.start),
  );
}

/** 冲突检测：同会议室同日期时间段重叠（或维护中） */
export function findConflict(
  s: MeetState,
  input: {
    roomId: string;
    date: string;
    start: string;
    end: string;
    excludeId?: string;
  },
): string | null {
  const room = s.rooms.find((r) => r.id === input.roomId);
  if (!room) return '会议室不存在';
  if (room.status === 'maintenance')
    return `「${room.name}」维护中，暂不可预订`;
  const start = toMin(input.start);
  const end = toMin(input.end);
  if (end <= start) return '结束时间需晚于开始时间';
  if (start < DAY_START || end > DAY_END) {
    return `预订时间需在 ${toTime(DAY_START)} - ${toTime(DAY_END)} 之间`;
  }
  const conflict = getBookingsByDate(s, input.date).find(
    (b) =>
      b.id !== input.excludeId &&
      b.roomId === input.roomId &&
      b.status !== 'canceled' &&
      overlap(toMin(b.start), toMin(b.end), start, end),
  );
  if (conflict) {
    return `「${room.name}」在 ${conflict.start}-${conflict.end} 已被占用（${conflict.title}）`;
  }
  return null;
}

export function createBooking(
  input: Omit<Booking, 'id' | 'status' | 'custom'> & { status?: BookingStatus },
): Booking {
  const s = state;
  const err = findConflict(s, input);
  if (err) throw new Error(err);
  const booking: Booking = {
    ...input,
    id: uid(),
    status: input.status ?? 'confirmed',
    custom: true,
  };
  setState({
    ...s,
    customBookings: [...s.customBookings, booking],
  });
  return booking;
}

export function updateBooking(id: string, patch: Partial<Booking>) {
  setState({
    ...state,
    customBookings: state.customBookings.map((b) =>
      b.id === id ? { ...b, ...patch } : b,
    ),
  });
}

export function cancelBooking(id: string) {
  setState({
    ...state,
    customBookings: state.customBookings.map((b) =>
      b.id === id ? { ...b, status: 'canceled' as const } : b,
    ),
  });
}

export function checkInBooking(id: string) {
  setState({
    ...state,
    customBookings: state.customBookings.map((b) =>
      b.id === id ? { ...b, status: 'checked-in' as const } : b,
    ),
  });
}

/** 种子数据（非 custom）的签到/取消：转成 custom 覆盖 */
function promote(id: string, patch: Partial<Booking>) {
  const existing = state.customBookings.find((b) => b.id === id);
  if (existing) {
    setState({
      ...state,
      customBookings: state.customBookings.map((b) =>
        b.id === id ? { ...b, ...patch } : b,
      ),
    });
    return;
  }
  const original = allDatesLookup(id);
  if (!original) return;
  setState({
    ...state,
    customBookings: [
      ...state.customBookings,
      { ...original, ...patch, custom: true },
    ],
  });
}

function allDatesLookup(id: string): Booking | undefined {
  const s = state;
  const dates = new Set<string>();
  seedBookingsFor(s.seedDate).forEach((b) => {
    dates.add(b.date);
  });
  s.customBookings.forEach((b) => {
    dates.add(b.date);
  });
  for (let i = -1; i <= 7; i += 1) {
    dates.add(dayjs(s.seedDate).add(i, 'day').format('YYYY-MM-DD'));
  }
  for (const date of dates) {
    const hit = getBookingsByDate(s, date).find((b) => b.id === id);
    if (hit) return hit;
  }
  return undefined;
}

export function cancelAnyBooking(id: string) {
  promote(id, { status: 'canceled' });
}

export function checkInAnyBooking(id: string) {
  promote(id, { status: 'checked-in' });
}

export function deleteBooking(id: string) {
  setState({
    ...state,
    customBookings: state.customBookings.filter((b) => b.id !== id),
  });
}

export function addRoom(room: Omit<Room, 'id' | 'custom'>): Room {
  const newRoom: Room = { ...room, id: uid('r'), custom: true };
  setState({ ...state, rooms: [...state.rooms, newRoom] });
  return newRoom;
}

export function updateRoom(id: string, patch: Partial<Room>) {
  setState({
    ...state,
    rooms: state.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  });
}

export function deleteRoom(id: string) {
  setState({
    ...state,
    rooms: state.rooms.filter((r) => r.id !== id),
    customBookings: state.customBookings.filter((b) => b.roomId !== id),
  });
}

/** 重置演示数据（保留登录态） */
export function resetDemoData() {
  localStorage.removeItem(STORAGE_KEY);
  setState(seedState());
}

/* ------------------------------------------------------------------ */
/* 统计                                                                */
/* ------------------------------------------------------------------ */

export interface DayStats {
  myToday: number;
  pendingCheckIn: number;
  availableRooms: number;
  todayTotal: number;
}

export function getDayStats(
  s: MeetState,
  date: string,
  userId?: number,
): DayStats {
  const bookings = getBookingsByDate(s, date).filter(
    (b) => b.status !== 'canceled',
  );
  const mine = bookings.filter((b) => isMine(b, userId));
  const availableRooms = s.rooms.filter((r) => r.status === 'available');
  return {
    myToday: mine.length,
    pendingCheckIn: mine.filter((b) => b.status === 'confirmed').length,
    availableRooms: availableRooms.length,
    todayTotal: bookings.length,
  };
}

/** 某时刻可用的会议室 */
export function freeRoomsNow(s: MeetState, date = todayStr()): Room[] {
  const now = dayjs();
  const nowMin = now.hour() * 60 + now.minute();
  const isToday = date === todayStr();
  return s.rooms.filter((r) => {
    if (r.status === 'maintenance') return false;
    if (!isToday) return true;
    return !getBookingsByDate(s, date).some(
      (b) =>
        b.roomId === r.id &&
        b.status !== 'canceled' &&
        overlap(toMin(b.start), toMin(b.end), nowMin, nowMin + 1),
    );
  });
}
