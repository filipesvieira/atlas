type AtlasImportMeta = ImportMeta & {
  env?: Record<string, string | undefined>;
};

const env = (import.meta as AtlasImportMeta).env;
const protocol = window.location.protocol;
const host = window.location.hostname;
const isHttpPage = protocol === 'http:' || protocol === 'https:';
const isDesktopRuntime = protocol === 'tauri:' || host === 'tauri.localhost' || Boolean((window as any).__TAURI_INTERNALS__);

const configuredApiUrl = (env?.VITE_API_BASE_URL || '').trim();
const configuredWsUrl = (env?.VITE_WS_BASE_URL || '').trim();
const browserFallback = isHttpPage && !isDesktopRuntime ? `${protocol}//${host}:8080` : '';
const localApiFallback = 'http://localhost:8080';
const localWsFallback = 'ws://localhost:8080';

// Os testes locais usam o backend em localhost. Em homologação/produção, as
// variáveis VITE_* sobrescrevem estes fallbacks sem exigir alteração no código.
export const CLIENT_CONFIG_ERROR = null;

export const API_BASE_URL = (configuredApiUrl || browserFallback || localApiFallback).replace(/\/$/, '');
export const WS_BASE_URL = (
  configuredWsUrl || (configuredApiUrl || browserFallback
    ? API_BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
    : localWsFallback)
).replace(/\/$/, '');

export const IS_TAURI_CLIENT = isDesktopRuntime;