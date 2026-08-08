type AtlasImportMeta = ImportMeta & {
  env?: Record<string, string | undefined>;
};

const env = (import.meta as AtlasImportMeta).env;
const defaultHttpProtocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
const defaultApiUrl = `${defaultHttpProtocol}//${window.location.hostname}:8080`;

export const API_BASE_URL = (env?.VITE_API_BASE_URL || defaultApiUrl).replace(/\/$/, '');
export const WS_BASE_URL = (
  env?.VITE_WS_BASE_URL || API_BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
).replace(/\/$/, '');
