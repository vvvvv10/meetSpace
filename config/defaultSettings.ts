import type { ProLayoutProps } from '@ant-design/pro-components';

/**
 * @name MeetSpace 布局默认配置
 */
const Settings: ProLayoutProps & {
  logo?: React.ReactNode;
} = {
  navTheme: 'light',
  colorPrimary: '#2563eb',
  layout: 'side',
  contentWidth: 'Fluid',
  fixedHeader: true,
  // 顶栏在 rootContainer 全宽渲染，侧边栏用 sticky 吸附在其下方（见 global.less）
  fixSiderbar: false,
  colorWeak: false,
  title: 'MeetSpace',
  logo: false,
  iconfontUrl: '',
  token: {
    // 参见ts声明，demo 见文档，通过token 修改样式
    // https://procomponents.ant.design/components/layout#通过-token-修改样式
  },
};

export default Settings;
