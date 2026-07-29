"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";

const helperBaseUrl = "http://127.0.0.1:17891";

interface HelperStatus {
  service: string;
  version: string;
  capabilities: string[];
  tools: {
    ghostscript: boolean;
    veraPdf: boolean;
    cryptoProBridge: boolean;
  };
}

export default function PdfAPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [file, setFile] = useState<File>();
  const [helper, setHelper] = useState<HelperStatus>();
  const [statusText, setStatusText] = useState("Проверяем Native Helper…");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  async function checkHelper() {
    setStatusText("Проверяем Native Helper…");
    try {
      const response = await fetch(`${helperBaseUrl}/v1/status`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const value = await response.json() as HelperStatus;
      setHelper(value);
      setStatusText(`Подключён ${value.service} ${value.version}`);
    } catch {
      setHelper(undefined);
      setStatusText("Native Helper не найден. Запустите SignFlow.NativeHelper.exe.");
    }
  }

  useEffect(() => {
    void checkHelper();
  }, []);

  const ready = Boolean(helper?.capabilities.includes("pdfa-conversion"));

  async function convert() {
    if (!file) {
      setMessage("Выберите PDF-файл.");
      return;
    }
    if (!ready) {
      setMessage("Для конвертации нужны одновременно Ghostscript и veraPDF.");
      return;
    }

    setProcessing(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const response = await fetch(`${helperBaseUrl}/v1/pdf/convert-to-pdfa`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `HTTP ${response.status}`);
      }
      const result = await response.blob();
      const outputName = `${file.name.replace(/\.pdf$/i, "")}_PDFA.pdf`;
      downloadBlob(result, outputName);
      setMessage(`Готово: ${outputName}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="page-container">
        <AppHeader />
        <main id="main">
          <section className="hero">
            <div>
              <span className="eyebrow">Изолированный тест Native Helper</span>
              <h1>Преобразование файлов в <span>PDF/A-2b</span></h1>
              <p>Документ передаётся только локальному helper на 127.0.0.1. После Ghostscript результат обязательно проверяется через veraPDF.</p>
            </div>
          </section>

          <div className="operation-tabs" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }} role="tablist" aria-label="Операция">
            <a className="operation-tab" href={`${basePath}/`}><strong>Подписать</strong><span>Вернуться в основное рабочее окно</span></a>
            <a className="operation-tab" href={`${basePath}/`}><strong>Проверить</strong><span>Проверка подписи и сертификата</span></a>
            <a className="operation-tab" href={`${basePath}/`}><strong>Зашифровать</strong><span>Шифрование файлов</span></a>
            <a className="operation-tab" href={`${basePath}/`}><strong>Расшифровать</strong><span>Открытие контейнеров</span></a>
            <div className="operation-tab operation-tab-active" role="tab" aria-selected="true"><strong>PDF/A</strong><span>Преобразование в PDF/A-2b</span></div>
          </div>

          <div className="workspace-grid">
            <section className="workspace-card">
              <label className="dropzone" htmlFor="pdfa-file">
                <div className="drop-icon">PDF</div>
                <p className="drop-title">Выберите PDF для конвертации</p>
                <p className="drop-subtitle">Тестовый режим: один файл за операцию</p>
                <input
                  id="pdfa-file"
                  type="file"
                  accept="application/pdf,.pdf"
                  hidden
                  onChange={(event) => {
                    setFile(event.target.files?.[0]);
                    setMessage("");
                  }}
                />
              </label>

              {file && <div className="notice">Выбран файл: <strong>{file.name}</strong></div>}
              {message && <div className="message-stack" role="status"><p>{message}</p></div>}

              <Button className="main-action" disabled={!file || !ready || processing} onClick={() => void convert()}>
                {processing ? "Преобразование и проверка…" : "Преобразовать в PDF/A-2b"}
              </Button>
              <p className="action-hint">Результат скачивается как файл с окончанием _PDFA.pdf.</p>
            </section>

            <aside className="sidebar">
              <section className="provider-panel">
                <div className="section-heading">
                  <div><span className="eyebrow">Среда</span><h2>PDF/A инструменты</h2></div>
                  <button className="provider-retry" type="button" onClick={() => void checkHelper()}>Проверить снова</button>
                </div>
                <p className="settings-description">{statusText}</p>
                <div className="provider-list">
                  <ToolRow name="Ghostscript" available={Boolean(helper?.tools.ghostscript)} description="Создаёт PDF/A-2b." />
                  <ToolRow name="veraPDF" available={Boolean(helper?.tools.veraPdf)} description="Проверяет соответствие PDF/A-2b." />
                </div>
                <div className="notice">
                  {ready
                    ? "Среда готова к конвертации."
                    : "Конвертация заблокирована, пока не обнаружены оба инструмента. Текущий artifact содержит Ghostscript, но veraPDF пока отсутствует."}
                </div>
              </section>
            </aside>
          </div>
        </main>
        <footer>SignFlow · AGPL-3.0-only · Локальная обработка файлов.</footer>
      </div>
    </div>
  );
}

function ToolRow({ name, available, description }: { name: string; available: boolean; description: string }) {
  return (
    <div className="provider-item">
      <span className={`status-dot status-${available ? "available" : "unavailable"}`} aria-hidden />
      <div><strong>{name}</strong><p>{available ? `Обнаружен. ${description}` : `Не найден. ${description}`}</p></div>
    </div>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}