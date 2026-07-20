import type { CadesAboutObject, CryptoCapability } from "../types";

const PLUGIN_TIMEOUT_MS = 12_000;
const SCRIPT_LOAD_TIMEOUT_MS = 8_000;

export function getCheckingCapabilities(): CryptoCapability[] {
  return [
    {
      id: "cryptopro",
      name: "КриптоПро ЭЦП Browser plug-in",
      status: "checking",
      description: "Проверяем расширение и связь с установленным КриптоПро CSP…",
    },
    {
      id: "webcrypto",
      name: "Web Crypto API",
      status: "checking",
      description: "Проверяем криптографические возможности браузера…",
    },
  ];
}

export async function detectCryptoCapabilities(): Promise<CryptoCapability[]> {
  const webCrypto = detectWebCrypto();
  const cryptoPro = await detectCryptoPro();
  return [cryptoPro, webCrypto];
}

function detectWebCrypto(): CryptoCapability {
  const available = Boolean(window.crypto?.subtle);
  return {
    id: "webcrypto",
    name: "Web Crypto API",
    status: available ? "available" : "unavailable",
    description: available
      ? "Доступны браузерные операции RSA/ECDSA и шифрование импортированными ключами."
      : "Браузер не предоставляет Web Crypto API.",
  };
}

async function detectCryptoPro(): Promise<CryptoCapability> {
  try {
    await loadCadesPluginApi();
    const plugin = window.cadesplugin;

    if (!plugin) {
      return unavailable("API КриптоПро не появилось после загрузки библиотеки.");
    }

    await withTimeout(Promise.resolve(plugin), PLUGIN_TIMEOUT_MS, "Истекло время ожидания ответа расширения.");

    if (typeof plugin.CreateObjectAsync !== "function") {
      return unavailable("Расширение найдено, но асинхронный API КриптоПро недоступен.");
    }

    const about = await withTimeout(
      plugin.CreateObjectAsync("CAdESCOM.About"),
      PLUGIN_TIMEOUT_MS,
      "Не удалось связаться с КриптоПро CSP.",
    ) as CadesAboutObject;

    const [pluginVersion, cspVersion, cspName] = await Promise.all([
      readAsyncMember(about, "PluginVersion"),
      readAsyncMember(about, "CSPVersion"),
      readAsyncMember(about, "CSPName"),
    ]);

    const versions = [
      pluginVersion ? `плагин ${pluginVersion}` : null,
      cspName || null,
      cspVersion ? `CSP ${cspVersion}` : null,
    ].filter(Boolean).join(" · ");

    return {
      id: "cryptopro",
      name: "КриптоПро ЭЦП Browser plug-in",
      status: "available",
      description: "Доступна работа с сертификатами Windows и аппаратными токенами.",
      details: versions || "Плагин и КриптоПро CSP ответили успешно.",
    };
  } catch (error) {
    const message = getErrorMessage(error);
    return {
      id: "cryptopro",
      name: "КриптоПро ЭЦП Browser plug-in",
      status: "error",
      description: "Плагин не отвечает. Проверьте расширение, КриптоПро CSP и разрешение доступа для сайта.",
      details: message,
    };
  }
}

const CADES_PLUGIN_SCRIPT_URLS = [
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/cadesplugin_api.js`,
  "https://www.cryptopro.ru/sites/default/files/products/cades/cadesplugin_api.js",
  "https://cdn.jsdelivr.net/npm/crypto-pro-actual-cades-plugin@2.4.1/dist/crypto-pro-actual-cades-plugin.min.js",
  "https://unpkg.com/crypto-pro-actual-cades-plugin@2.4.1/dist/crypto-pro-actual-cades-plugin.min.js",
] as const;

export async function loadCadesPluginApi(): Promise<void> {
  if (window.cadesplugin) return;

  let lastError: unknown;
  for (const url of CADES_PLUGIN_SCRIPT_URLS) {
    try {
      await loadExternalScript(url);
      if (window.cadesplugin) return;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Не удалось загрузить cadesplugin_api.js. ${getErrorMessage(lastError ?? "Нет ответа от CDN")}`,
  );
}

function loadExternalScript(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-cadesplugin-src="${src}"]`);
  if (existing?.dataset.loaded === "true") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement("script");
    const timer = window.setTimeout(
      () => reject(new Error(`Истекло время загрузки ${src}`)),
      SCRIPT_LOAD_TIMEOUT_MS,
    );
    script.src = src;
    script.async = true;
    script.dataset.cadespluginSrc = src;
    script.onload = () => {
      window.clearTimeout(timer);
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error(`Не загружен ${src}`));
    };
    if (!existing) document.head.appendChild(script);
  });
}

function unavailable(details: string): CryptoCapability {
  return {
    id: "cryptopro",
    name: "КриптоПро ЭЦП Browser plug-in",
    status: "unavailable",
    description: "Плагин не обнаружен. Подпись российской КЭП через системное хранилище недоступна.",
    details,
  };
}

async function readAsyncMember(
  owner: CadesAboutObject,
  key: keyof CadesAboutObject,
): Promise<string> {
  const value = owner[key];
  if (value == null) return "";
  try {
    const result = typeof value === "function" ? value.call(owner) : value;
    const resolved = await Promise.resolve(result);
    return typeof resolved === "string" ? resolved : String(resolved ?? "");
  } catch {
    return "";
  }
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function getErrorMessage(error: unknown): string {
  const plugin = window.cadesplugin;
  if (plugin?.getLastError) {
    try {
      const pluginError = plugin.getLastError(error);
      if (pluginError) return pluginError;
    } catch {
      // Fall back to the normal Error message below.
    }
  }
  return error instanceof Error ? error.message : String(error);
}
