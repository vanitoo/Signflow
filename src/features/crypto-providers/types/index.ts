export type ProviderStatus = "available" | "unavailable" | "checking" | "error";

export interface CryptoCapability {
  id: "webcrypto" | "cryptopro";
  name: string;
  status: ProviderStatus;
  description: string;
  details?: string;
}

type AsyncValue<T> = T | Promise<T>;
type AsyncMember<T> = AsyncValue<T> | (() => AsyncValue<T>);

export interface CadesAboutObject {
  PluginVersion?: AsyncMember<string>;
  CSPVersion?: AsyncMember<string>;
  CSPName?: AsyncMember<string>;
}

export interface CadesPluginApi extends PromiseLike<unknown> {
  CreateObjectAsync?: (name: string) => Promise<unknown>;
  getLastError?: (error: unknown) => string;
  LOG_LEVEL_ERROR?: number;
  set_log_level?: (level: number) => void;
}

declare global {
  interface Window {
    cadesplugin?: CadesPluginApi;
  }
}
