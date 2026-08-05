export type AppState = 'loading' | 'empty' | 'error' | 'forbidden';
export const appStateCopy: Record<AppState, string> = {
  loading: '正在加载…',
  empty: '暂时没有可展示的数据。',
  error: '加载失败，请稍后重试。',
  forbidden: '你没有访问此内容的权限。',
};
