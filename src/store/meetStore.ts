/**
 * MeetSpace 数据仓库（纯服务端模式）
 *
 * 会议室与预订数据全部来自数据服务 `/api/meet/*`（服务器 MySQL 的 meetspace 库），
 * 前端不再维护任何本地演示数据：
 * - 首帧拉取 + 每 30s 轮询，多端数据共享
 * - 写操作乐观更新后异步落库，失败时以服务端数据刷新校正
 * - 冲突检测除本地即时校验外，服务端还会做 SQL 级二次校验（重叠返回 409）
 */
import { message } from 'antd';
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
  /** 用户在管理中心创建的会议室 */
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
  ownerId: number;
  ownerName: string;
  ownerDept?: string;
  attendees: number;
  note?: string;
  status: BookingStatus;
  /** 用户手工创建的预订 */
  custom?: boolean;
}

export interface MeetState {
  rooms: Room[];
  /** 全部预订（服务端数据，hydration 窗口内） */
  bookings: Booking[];
  /** 数据基准日 */
  seedDate: string;
}

/** 时间轴范围 8:00 - 20:00（展示 8:00 ~ 19:00 共 12 格） */
export const DAY_START = 8 * 60;
export const DAY_END = 20 * 60;

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
  userId !== undefined && b.ownerId === userId;

export const overlap = (a1: number, a2: number, b1: number, b2: number) =>
  a1 < b2 && b1 < a2;

/* ------------------------------------------------------------------ */
/* 数据服务访问                                                         */
/* ------------------------------------------------------------------ */

const MEET_API = '/api/meet';

/** 是否已完成过一次拉取（用于区分首次失败提示与轮询偶发失败） */
let hydratedOnce = false;

const dateAdd = (base: string, delta: number) =>
  dayjs(base).add(delta, 'day').format('YYYY-MM-DD');

async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${MEET_API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `请求失败 (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) msg = data.message;
    } catch {
      /* 保底文案 */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

/** 拉取服务端全量数据（前 30 天 ~ 后 90 天）并刷新状态 */
export async function hydrateFromServer(): Promise<boolean> {
  try {
    const from = dateAdd(todayStr(), -30);
    const to = dateAdd(todayStr(), 90);
    const [rooms, bookings] = await Promise.all([
      api<Room[]>('/rooms'),
      api<(Booking & { source?: string })[]>(`/bookings?from=${from}&to=${to}`),
    ]);
    hydratedOnce = true;
    setState({
      rooms,
      bookings: bookings.map((b) => ({
        ...b,
        custom: b.source === 'user',
      })),
      seedDate: todayStr(),
    });
    return true;
  } catch (e) {
    if (!hydratedOnce) {
      hydratedOnce = true;
      message.error('数据服务连接失败，请刷新重试');
    } else {
      console.warn('[meetspace] 数据同步失败：', e);
    }
    return false;
  }
}

/** 本地状态变更后，用服务端数据刷新校正（服务端是唯一事实源） */
function syncToServer(label: string) {
  void hydrateFromServer().then((ok) => {
    if (!ok) message.error(`${label}同步失败，请检查数据服务`);
  });
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

let state: MeetState = { rooms: [], bookings: [], seedDate: todayStr() };
const listeners = new Set<() => void>();

function emit() {
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

/** React 订阅数据 */
export function useMeetState(): MeetState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const getState = () => state;

/* ------------------------------------------------------------------ */
/* 选择器                                                              */
/* ------------------------------------------------------------------ */

/** 某一天的全部预订（升序） */
export function getBookingsByDate(s: MeetState, date: string): Booking[] {
  return s.bookings
    .filter((b) => b.date === date)
    .sort((a, b) => toMin(a.start) - toMin(b.start));
}

/** 我的全部预订（升序，排除已取消） */
export function getMyBookings(s: MeetState, userId?: number): Booking[] {
  return s.bookings
    .filter((b) => isMine(b, userId) && b.status !== 'canceled')
    .sort(
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

/* ------------------------------------------------------------------ */
/* 写操作（乐观更新 + 异步落库）                                         */
/* ------------------------------------------------------------------ */

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
    bookings: [...s.bookings, booking],
  });
  // 服务端会二次做 SQL 冲突检测，冲突时回滚本地乐观写入
  api('/bookings', 'POST', { ...input, status: booking.status })
    .then(() => {
      syncToServer('预订');
    })
    .catch((e: Error) => {
      setState({
        ...state,
        bookings: state.bookings.filter((b) => b.id !== booking.id),
      });
      message.error(`预订失败：${e.message}`);
    });
  return booking;
}

/** 可同步到服务端的预订字段 */
const PATCHABLE: (keyof Booking)[] = [
  'title',
  'start',
  'end',
  'roomId',
  'attendees',
  'note',
  'status',
];

export function updateBooking(id: string, patch: Partial<Booking>) {
  setState({
    ...state,
    bookings: state.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)),
  });
  const body = Object.fromEntries(
    PATCHABLE.filter((k) => patch[k] !== undefined).map((k) => [k, patch[k]]),
  );
  api(`/bookings/${id}`, 'PATCH', body)
    .then(() => {
      syncToServer('预订');
    })
    .catch((e: Error) => {
      void hydrateFromServer();
      message.error(`更新失败：${e.message}`);
    });
}

export function cancelBooking(id: string) {
  updateBooking(id, { status: 'canceled' });
}

export function checkInBooking(id: string) {
  updateBooking(id, { status: 'checked-in' });
}

export function cancelAnyBooking(id: string) {
  updateBooking(id, { status: 'canceled' });
}

export function checkInAnyBooking(id: string) {
  updateBooking(id, { status: 'checked-in' });
}

export function deleteBooking(id: string) {
  setState({
    ...state,
    bookings: state.bookings.filter((b) => b.id !== id),
  });
  api(`/bookings/${id}`, 'DELETE')
    .then(() => {
      syncToServer('预订');
    })
    .catch((e: Error) => {
      void hydrateFromServer();
      message.error(`删除失败：${e.message}`);
    });
}

export function addRoom(room: Omit<Room, 'id' | 'custom'>): Room {
  const newRoom: Room = { ...room, id: uid('r'), custom: true };
  setState({ ...state, rooms: [...state.rooms, newRoom] });
  api<Room>('/rooms', 'POST', room)
    .then(() => {
      syncToServer('会议室');
    })
    .catch((e: Error) => {
      setState({
        ...state,
        rooms: state.rooms.filter((r) => r.id !== newRoom.id),
      });
      message.error(`新增失败：${e.message}`);
    });
  return newRoom;
}

export function updateRoom(id: string, patch: Partial<Room>) {
  setState({
    ...state,
    rooms: state.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  });
  api(`/rooms/${id}`, 'PATCH', patch)
    .then(() => {
      syncToServer('会议室');
    })
    .catch((e: Error) => {
      void hydrateFromServer();
      message.error(`更新失败：${e.message}`);
    });
}

export function deleteRoom(id: string) {
  setState({
    ...state,
    rooms: state.rooms.filter((r) => r.id !== id),
    bookings: state.bookings.filter((b) => b.roomId !== id),
  });
  api(`/rooms/${id}`, 'DELETE')
    .then(() => {
      syncToServer('会议室');
    })
    .catch((e: Error) => {
      void hydrateFromServer();
      message.error(`删除失败：${e.message}`);
    });
}

/** 重置演示数据 = 服务端重新播种（保留登录态） */
export function resetDemoData() {
  api('/reset', 'POST')
    .then(() => hydrateFromServer())
    .catch((e: Error) => {
      message.error(`重置失败：${e.message}`);
    });
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

/* ------------------------------------------------------------------ */
/* 启动同步（仅浏览器）：首次拉取服务端数据，之后每 30s 轮询刷新           */
/* ------------------------------------------------------------------ */
if (typeof window !== 'undefined') {
  void hydrateFromServer();
  window.setInterval(() => {
    void hydrateFromServer();
  }, 30_000);
}
