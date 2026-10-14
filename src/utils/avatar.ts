/**
 * Mock 头像
 *
 * 用户中心开放接口不返回头像字段，先用本地占位图：
 * `public/avatars/u1~u8.svg`（DiceBear avataaars，按用户 id 取模分配）。
 * 未登录或拿不到 id 时返回 undefined，由调用方回退首字渐变头像。
 *
 * 路径为根绝对路径（config 中 publicPath 固定为 '/'）。
 */
const MOCK_AVATAR_COUNT = 8;

export const mockAvatarOf = (userId?: number): string | undefined => {
  if (userId === undefined || Number.isNaN(userId)) return undefined;
  const idx =
    (((userId - 1) % MOCK_AVATAR_COUNT) + MOCK_AVATAR_COUNT) %
    MOCK_AVATAR_COUNT;
  return `/avatars/u${idx + 1}.svg`;
};
