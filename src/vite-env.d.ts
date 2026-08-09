/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_REQUEST_MEDIA_URL?: string
  readonly VITE_MOVIES_HTTP_URL?: string
  readonly VITE_TV_HTTP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
