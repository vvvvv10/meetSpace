/**
 * MeetSpace 设计 token
 *
 * 从效果图提取的视觉系统：深海军蓝导航 + #2563eb 主色 + 白色圆角卡片，
 * 时间轴预订块使用语义色（已占用 / 我的预订 / 不可用）。
 * 组件样式统一从这里取值，改主题只需改这一处。
 */
export const palette = {
  /** 品牌主色 */
  brand: '#2563eb',
  brandHover: '#1d4fd8',
  /** 主色浅底（统计卡图标、提示块） */
  brandSoft: '#eff4ff',
  /** 导航深色（侧边栏 / 顶栏） */
  navy: '#0b1b33',
  navyElevated: '#12294a',
  /** 页面底色 */
  pageBg: '#f4f6f9',
  surface: '#ffffff',
  border: 'rgba(27, 42, 67, 0.08)',
  /** 次要文字 */
  textSecondary: '#8c8c8c',
  /** 圆角 */
  radiusCard: 12,
  radiusControl: 8,
  /** 时间轴网格线 */
  hourLine: '#eceff3',
  /** 预订块语义色 */
  booking: {
    occupiedBg: '#fbd5ae',
    occupiedBorder: '#f5bd8d',
    occupiedText: '#92400e',
    mineBg: '#b3e2c9',
    mineBorder: '#8fd0b0',
    mineText: '#166534',
    /** 维护中整行置灰（每小时格线略深） */
    unavailable: '#e6eaef',
    unavailableLine: '#d8dee6',
  },
} as const;

/** ProLayout 侧边栏（深色导航）token，与顶栏保持同一海军蓝 */
export const siderLayoutToken = {
  colorMenuBackground: palette.navy,
  colorBgMenuItemHover: 'rgba(255, 255, 255, 0.08)',
  colorBgMenuItemSelected: palette.brand,
  colorBgMenuItemActive: palette.brand,
  colorMenuItemDivider: 'rgba(255, 255, 255, 0.06)',
  colorTextMenu: 'rgba(255, 255, 255, 0.72)',
  colorTextMenuSelected: '#ffffff',
  colorTextMenuItemHover: '#ffffff',
  colorTextMenuActive: '#ffffff',
  colorTextMenuSecondary: 'rgba(255, 255, 255, 0.45)',
  colorTextMenuTitle: 'rgba(255, 255, 255, 0.45)',
} as const;
