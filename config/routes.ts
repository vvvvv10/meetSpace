/**
 * MeetSpace 会议邀约平台 · 路由配置
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        path: '/user/login',
        name: '登录',
        component: './user/login',
      },
      {
        path: '/user',
        redirect: '/user/login',
      },
      {
        component: './exception/404',
        path: '/user/*',
      },
    ],
  },
  {
    path: '/workspace',
    name: '工作台',
    icon: 'home',
    component: './workspace',
  },
  {
    path: '/booking',
    name: '会议室预订',
    icon: 'table',
    component: './booking',
  },
  {
    path: '/my',
    name: '我的预订',
    icon: 'clockCircle',
    component: './my',
  },
  {
    path: '/admin',
    name: '管理中心',
    icon: 'setting',
    access: 'canAdmin',
    component: './admin',
  },
  {
    path: '/',
    redirect: '/booking',
  },
  {
    component: './exception/404',
    path: '/*',
  },
];
