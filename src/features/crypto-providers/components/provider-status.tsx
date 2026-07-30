"use client";

import { useCallback, useEffect, useState } from "react";
import type { CryptoCapability } from "../types";

const NATIVE_HELPER_STATUS_URL = "http://127.0.0.1:17891/v1/status";
const NATIVE_HELPER_DOWNLOAD_URL = "https://github.com/vanitoo/Signflow/releases/download/native-helper-preview/SignFlow-NativeHelper-win-x64.zip";

interface NativeHelperStatus {
  service: string;
  version: string;
  capabilities: string[];
  platform: string;
  tools: {
    ghostscript: boolean;
    veraPdf: boolean;
    cryptoProBridge: boolean;
  };
}

interface ProviderStatusProps {
  capabilities: CryptoCapability[];
  onRetry: () => void;
}

export function ProviderStatus({ capabilities, onRetry }: ProviderStatusProps) {
  const [helper, setHelper] = useState<NativeHelperStatus | null>(null);
  const [helperChecking, setHelperChecking] = useState(true);

  const refreshHelper = useCallback(async () => {
    setHelperChecking(true);
    try {
      const response = await fetch(NATIVE_HELPER_STATUS_URL, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setHelper(await response.json() as NativeHelperStatus);
    } catch {
      setHelper(null);
    } finally {
      setHelperChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshHelper();
    const timer = window.setInterval(() => void refreshHelper(), 15_000);
    return () => window.clearInterval(timer);
  }, [refreshHelper]);

  function retryAll() {
    onRetry();
    void refreshHelper();
  }

  const helperDescription = helperChecking
    ? "Проверяем локальное приложение…"
    : helper
      ? `Подключён ${helper.service} ${helper.version}. ${describeTools(helper)}`
      : "Не найден. Скачайте архив, распакуйте его и запустите SignFlow.NativeHelper.exe.";

  return (
    <section className="provider-panel" aria-label="Криптографические возможности">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Среда</span>
          <h2>Криптопровайдеры</h2>
        </div>
        <button className="provider-retry" type="button" onClick={retryAll}>
          Проверить снова
        </button>
      </div>
      <div className="provider-list">
        <div className="provider-item">
          <span className={`status-dot status-${helperChecking ? "checking" : helper ? "available" : "unavailable"}`} aria-hidden />
          <div>
            <strong>SignFlow Native Helper</strong>
            <p>{helperDescription}</p>
            {!helperChecking && !helper && (
              <p>
                <a className="provider-retry" href={NATIVE_HELPER_DOWNLOAD_URL}>
                  Скачать Helper для Windows x64
                </a>
              </p>
            )}
            {helper && (
              <small>
                PDF/A: {helper.capabilities.includes("pdfa-conversion") ? "готово" : "неполная установка"}; контрподпись: {helper.capabilities.includes("cades-counter-signature") ? "готово" : "bridge не найден"}
              </small>
            )}
          </div>
        </div>
        {capabilities.map((capability) => (
          <div className="provider-item" key={capability.id}>
            <span className={`status-dot status-${capability.status}`} aria-hidden />
            <div>
              <strong>{capability.name}</strong>
              <p>{capability.description}</p>
              {capability.details && <small>{capability.details}</small>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function describeTools(status: NativeHelperStatus): string {
  const installed = [
    status.tools.ghostscript && "Ghostscript",
    status.tools.veraPdf && "veraPDF",
    status.tools.cryptoProBridge && "CryptoPro bridge",
  ].filter(Boolean);

  return installed.length ? `Обнаружено: ${installed.join(", ")}.` : "Внешние движки не обнаружены.";
}
