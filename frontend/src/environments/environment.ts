/** Runtime config. apiBase/hubUrl are rewritten at build time for production deploys (F7). */
export const environment = {
  production: false,
  apiBase: 'http://localhost:5192',
  hubUrl: 'http://localhost:5192/hubs/monitor',
};
