// Extend ImportMeta for Vite env compatibility (shared package uses import.meta.env)
interface ImportMetaEnv {
  readonly DEV?: boolean;
  readonly VITE_PROXY_WORKER_URL?: string;
  [key: string]: unknown;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}
