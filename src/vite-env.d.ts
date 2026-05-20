/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_WOVITH_E2E_MOCK_GOOGLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
