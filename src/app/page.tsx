"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { ProviderStatus } from "@/features/crypto-providers/components/provider-status";
import { detectCryptoCapabilities, getCheckingCapabilities } from "@/features/crypto-providers/lib/detect-capabilities";
import {
  listCryptoProCertificates,
  encryptFileWithCryptoPro,
  decryptFileWithCryptoPro,
  signFileWithCryptoPro,
  verifyFileWithCryptoPro,
  type CryptoProCertificate,
  type CryptoProVerificationResult,
} from "@/features/crypto-providers/lib/cryptopro-signer";
import { decryptFileWithPassword, encryptFileWithPassword } from "@/features/crypto-providers/lib/password-encryption";
import { signFileWithPfx } from "@/features/crypto-providers/lib/pfx-signer";
import type { CryptoCapability } from "@/features/crypto-providers/types";
import { FileDropzone } from "@/features/workspace/components/file-dropzone";
import { FileQueue } from "@/features/workspace/components/file-queue";
import { OperationTabs } from "@/features/workspace/components/operation-tabs";
import { SettingsPanel } from "@/features/workspace/components/settings-panel";
import { validateFiles } from "@/features/workspace/model/file-validation";
import type { EncryptSettings, OperationMode, QueueItem, SignSettings } from "@/features/workspace/types";

const initialSignSettings: SignSettings = {
  source: "cryptopro",
  signatureCount: 1,
  certificateThumbprints: [],
  pfxPassword: "",
  detached: true,
  timestamp: false,
  tsaAddress: "",
};

interface VerificationReport {
  id: string;
  sourceName: string;
  signatureName: string;
  valid: boolean;
  integrityValid: boolean;
  signers: CryptoProVerificationResult[];
  error?: string;
}

export default function Home() {
  const [operation, setOperation] = useState<OperationMode>("sign");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<CryptoCapability[]>(getCheckingCapabilities);
  const [signSettings, setSignSettings] = useState<SignSettings>(initialSignSettings);
  const [encryptSettings, setEncryptSettings] = useState<EncryptSettings>({
    mode: "certificate",
    recipientThumbprint: "",
    password: "",
  });
  const [certificates, setCertificates] = useState<CryptoProCertificate[]>([]);
  const [certificateError, setCertificateError] = useState("");
  const [certificatesLoading, setCertificatesLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [verificationReports, setVerificationReports] = useState<VerificationReport[]>([]);
  const [onlineValidation, setOnlineValidation] = useState(false);

  async function refreshCapabilities() {
    setCapabilities(getCheckingCapabilities());
    const detected = await detectCryptoCapabilities();
    setCapabilities(detected);
    await refreshCertificates();
  }

  async function refreshCertificates() {
    setCertificatesLoading(true);
    setCertificateError("");
    try {
      const found = await listCryptoProCertificates();
      setCertificates(found);
      setSignSettings((current) => ({
        ...current,
        certificateThumbprints: current.certificateThumbprints.length
          ? current.certificateThumbprints
          : found.slice(0, current.signatureCount).map((certificate) => certificate.thumbprint),
      }));
    } catch (error) {
      setCertificateError(errorMessage(error));
    } finally {
      setCertificatesLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void detectCryptoCapabilities().then((detected) => {
      if (active) setCapabilities(detected);
    });
    void refreshCertificates();
    return () => {
      active = false;
    };
  }, []);

  const actionLabel = useMemo(() => {
    const count = items.length;
    if (operation === "verify") return `Проверить ${count || ""} ${pluralize(count, "файл", "файла", "файлов")}`.trim();
    if (operation === "encrypt") return `Зашифровать ${count || ""} ${pluralize(count, "файл", "файла", "файлов")}`.trim();
    if (operation === "decrypt") return `Расшифровать ${count || ""} ${pluralize(count, "файл", "файла", "файлов")}`.trim();
    return `Подписать ${count || ""} ${pluralize(count, "файл", "файла", "файлов")}`.trim();
  }, [items.length, operation]);

  function addFiles(files: File[]) {
    const validation = validateFiles(files, items.map((item) => item.file));
    const nextItems = validation.accepted.map<QueueItem>((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "ready",
      progress: 0,
    }));
    setItems((current) => [...current, ...nextItems]);
    setMessages(validation.rejected.map(({ file, reason }) => `${file.name}: ${reason}`));
  }

  function removeFile(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function handleStart() {
    if (operation === "verify") {
      await handleVerify();
      return;
    }
    if (operation === "encrypt") {
      await handleEncrypt();
      return;
    }
    if (operation === "decrypt") {
      await handleDecrypt();
      return;
    }
    if (operation !== "sign") {
      setMessages(["Для этого режима криптографическая операция пока не подключена."]);
      return;
    }
    if (signSettings.timestamp && signSettings.source !== "cryptopro") {
      setMessages(["CAdES-T поддерживается через КриптоПро. Для PFX/P12 отключите метку времени."]);
      return;
    }
    if (signSettings.timestamp && !isHttpUrl(signSettings.tsaAddress)) {
      setMessages(["Укажите корректный HTTP(S)-адрес службы TSA."]);
      return;
    }
    const thumbprints = signSettings.certificateThumbprints.slice(0, signSettings.signatureCount);
    if (signSettings.source === "cryptopro") {
      if (thumbprints.length !== signSettings.signatureCount || thumbprints.some((value) => !value)) {
        setMessages(["Выберите сертификат для каждой подписи."]);
        return;
      }
      if (new Set(thumbprints).size !== thumbprints.length) {
        setMessages(["Для двух независимых подписей выберите два разных сертификата."]);
        return;
      }
    } else if (!signSettings.pfxFile) {
      setMessages(["Выберите файл PFX/P12."]);
      return;
    }

    setProcessing(true);
    setMessages([]);
    setVerificationReports([]);
    for (const item of items) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "processing", progress: 20 } : entry));
      try {
        if (signSettings.source === "pfx" && signSettings.pfxFile) {
          const signature = await signFileWithPfx(item.file, signSettings.pfxFile, signSettings.pfxPassword);
          downloadBlob(signature, `${item.file.name}.sig`);
        } else {
          for (let index = 0; index < thumbprints.length; index += 1) {
            const signature = await signFileWithCryptoPro(item.file, thumbprints[index], {
              timestamp: signSettings.timestamp,
              tsaAddress: signSettings.tsaAddress,
            });
            downloadBlob(signature, signatureName(item.file.name, index, thumbprints.length));
          }
        }
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "completed", progress: 100, error: undefined } : entry));
      } catch (error) {
        const message = errorMessage(error);
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "error", progress: 0, error: message } : entry));
        setMessages((current) => [...current, `${item.file.name}: ${message}`]);
      }
    }
    setProcessing(false);
  }

  async function handleVerify() {
    setVerificationReports([]);
    const pairs = pairDetachedSignatures(items);
    if (pairs.errors.length) {
      setMessages(pairs.errors);
      return;
    }
    setProcessing(true);
    setMessages([]);
    for (const { source, signature } of pairs.pairs) {
      setItems((current) => current.map((entry) =>
        entry.id === source.id || entry.id === signature.id
          ? { ...entry, status: "processing", progress: 30 }
          : entry,
      ));
      try {
        const signers = await verifyFileWithCryptoPro(source.file, signature.file, { onlineValidation });
        setVerificationReports((current) => [...current, {
          id: signature.id,
          sourceName: source.file.name,
          signatureName: signature.file.name,
          valid: signers.every((signer) => signer.chainValid !== false),
          integrityValid: true,
          signers,
        }]);
        setItems((current) => current.map((entry) =>
          entry.id === source.id || entry.id === signature.id
            ? { ...entry, status: "completed", progress: 100, error: undefined }
            : entry,
        ));
      } catch (error) {
        const message = errorMessage(error);
        setVerificationReports((current) => [...current, {
          id: signature.id,
          sourceName: source.file.name,
          signatureName: signature.file.name,
          valid: false,
          integrityValid: false,
          signers: [],
          error: message,
        }]);
        setItems((current) => current.map((entry) =>
          entry.id === signature.id
            ? { ...entry, status: "error", progress: 0, error: message }
            : entry,
        ));
      }
    }
    setProcessing(false);
  }

  async function handleEncrypt() {
    if (encryptSettings.mode === "certificate" && !encryptSettings.recipientThumbprint) {
      setMessages(["Выберите сертификат получателя."]);
      return;
    }
    if (encryptSettings.mode === "password" && encryptSettings.password.length < 8) {
      setMessages(["Пароль должен содержать не менее 8 символов."]);
      return;
    }
    setProcessing(true);
    setMessages([]);
    for (const item of items) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "processing", progress: 30 } : entry));
      try {
        const encrypted = encryptSettings.mode === "certificate"
          ? await encryptFileWithCryptoPro(item.file, encryptSettings.recipientThumbprint)
          : await encryptFileWithPassword(item.file, encryptSettings.password);
        const extension = encryptSettings.mode === "certificate" ? ".p7m" : ".sfenc";
        downloadBlob(encrypted, `${item.file.name}${extension}`);
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "completed", progress: 100, error: undefined } : entry));
      } catch (error) {
        const message = errorMessage(error);
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "error", progress: 0, error: message } : entry));
        setMessages((current) => [...current, `${item.file.name}: ${message}`]);
      }
    }
    setProcessing(false);
  }

  async function handleDecrypt() {
    const expectedExtension = encryptSettings.mode === "certificate" ? ".p7m" : ".sfenc";
    const invalid = items.filter((item) => !item.file.name.toLowerCase().endsWith(expectedExtension));
    if (invalid.length) {
      setMessages(invalid.map((item) => `${item.file.name}: ожидается контейнер ${expectedExtension}.`));
      return;
    }
    if (encryptSettings.mode === "password" && !encryptSettings.password) {
      setMessages(["Введите пароль контейнера."]);
      return;
    }
    setProcessing(true);
    setMessages([]);
    for (const item of items) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "processing", progress: 30 } : entry));
      try {
        const decrypted = encryptSettings.mode === "certificate"
          ? await decryptFileWithCryptoPro(item.file)
          : await decryptFileWithPassword(item.file, encryptSettings.password);
        downloadBlob(decrypted, item.file.name.slice(0, -expectedExtension.length));
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "completed", progress: 100, error: undefined } : entry));
      } catch (error) {
        const message = errorMessage(error);
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "error", progress: 0, error: message } : entry));
        setMessages((current) => [...current, `${item.file.name}: ${message}`]);
      }
    }
    setProcessing(false);
  }

  return (
    <div className="app-shell">
      <div className="page-container">
        <AppHeader />
        <main id="main">
          <section className="hero">
            <div>
              <span className="eyebrow">Электронная подпись без загрузки документов</span>
              <h1>Подпись, проверка и защита файлов <span>на вашем компьютере</span></h1>
              <p>Российская КЭП через КриптоПро, сертификаты PFX/P12, несколько подписей и пакетная обработка в одном рабочем окне.</p>
            </div>
            <div className="hero-trust">
              <span>Без регистрации</span>
              <span>Без аналитики</span>
              <span>Windows-first</span>
            </div>
          </section>

          <OperationTabs value={operation} onChange={setOperation} />

          <div className="workspace-grid">
            <section className="workspace-card">
              <FileDropzone onSelect={addFiles} />
              {messages.length > 0 && (
                <div className="message-stack" role="status">
                  {messages.map((message) => <p key={message}>{message}</p>)}
                </div>
              )}
              {operation === "verify" && verificationReports.length > 0 && (
                <VerificationReports reports={verificationReports} />
              )}
              <FileQueue items={items} onRemove={removeFile} onClear={() => setItems([])} />
              <Button className="main-action" disabled={!items.length || processing} onClick={() => void handleStart()}>
                {processing
                  ? operation === "verify" ? "Проверка…" : operation === "encrypt" ? "Шифрование…" : operation === "decrypt" ? "Расшифрование…" : "Подписание…"
                  : actionLabel}
              </Button>
              <p className="action-hint">На первом этапе поддерживается пакет до 100 файлов и до 2 ГБ на файл.</p>
            </section>

            <aside className="sidebar">
              <SettingsPanel
                operation={operation}
                signSettings={signSettings}
                encryptSettings={encryptSettings}
                certificates={certificates}
                certificatesLoading={certificatesLoading}
                certificateError={certificateError}
                onlineValidation={onlineValidation}
                onSignSettingsChange={setSignSettings}
                onEncryptSettingsChange={setEncryptSettings}
                onOnlineValidationChange={setOnlineValidation}
              />
              <ProviderStatus capabilities={capabilities} onRetry={() => void refreshCapabilities()} />
            </aside>
          </div>
        </main>
        <footer>SignFlow · MIT License · Локальная обработка без скрытых сетевых запросов.</footer>
      </div>
    </div>
  );
}

function pluralize(value: number, one: string, few: string, many: string): string {
  const absolute = Math.abs(value) % 100;
  const last = absolute % 10;
  if (absolute > 10 && absolute < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

function VerificationReports({ reports }: { reports: VerificationReport[] }) {
  return (
    <section className="verification-reports" aria-label="Результаты проверки">
      <h2>Результаты проверки</h2>
      {reports.map((report) => (
        <details className={`verification-card ${report.valid ? "valid" : "invalid"}`} key={report.id}>
          <summary>
            <span className="verification-icon" aria-hidden>{report.valid ? "✓" : "×"}</span>
            <span>
              <strong>
                {report.valid
                  ? "Подпись действительна"
                  : report.integrityValid ? "Сертификат не прошёл проверку" : "Подпись недействительна"}
              </strong>
              <small>{report.signatureName}</small>
            </span>
            <span className="verification-expand">Подробнее</span>
          </summary>
          <div className="verification-details">
            <DetailRow label="Исходный файл" value={report.sourceName} />
            <DetailRow label="Файл подписи" value={report.signatureName} />
            <DetailRow label="Целостность" value={report.integrityValid ? "Документ не изменён после подписания" : "Проверка не пройдена"} />
            {report.error && <DetailRow label="Ошибка" value={report.error} />}
            {report.signers.map((signer, index) => (
              <div className="signer-details" key={`${signer.thumbprint}-${index}`}>
                <h3>{report.signers.length > 1 ? `Подписант ${index + 1}` : "Подписант"}</h3>
                <DetailRow label="Владелец" value={signer.signer} />
                <DetailRow label="Издатель" value={signer.issuer} />
                <DetailRow label="Время подписания" value={signer.signingTime} />
                <DetailRow label="Формат подписи" value={signer.signatureType} />
                <DetailRow label="Срок сертификата" value={`${signer.validFrom} — ${signer.validTo}`} />
                {signer.chainValid !== undefined && (
                  <DetailRow
                    label="Цепочка и отзыв CRL/OCSP"
                    value={signer.chainValid ? "Проверка пройдена" : signer.chainError || "Проверка не пройдена"}
                  />
                )}
                <DetailRow label="Серийный номер" value={signer.serialNumber} mono />
                <DetailRow label="Отпечаток SHA-1" value={signer.thumbprint} mono />
              </div>
            ))}
            <p className="verification-note">
              CRL/OCSP выполняются только при включённой сетевой проверке и используют адреса из сертификата и настройки КриптоПро/Windows.
            </p>
          </div>
        </details>
      ))}
    </section>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="verification-row">
      <span>{label}</span>
      <strong className={mono ? "mono" : undefined}>{value || "—"}</strong>
    </div>
  );
}

function signatureName(fileName: string, index: number, count: number): string {
  return count === 1 ? `${fileName}.sig` : `${fileName}.${index + 1}.sig`;
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function errorMessage(error: unknown): string {
  try {
    return window.cadesplugin?.getLastError?.(error) || (error instanceof Error ? error.message : String(error));
  } catch {
    return error instanceof Error ? error.message : String(error);
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function pairDetachedSignatures(items: QueueItem[]): {
  pairs: Array<{ source: QueueItem; signature: QueueItem }>;
  errors: string[];
} {
  const signatures = items.filter((item) => item.file.name.toLowerCase().endsWith(".sig"));
  const sources = new Map(
    items
      .filter((item) => !item.file.name.toLowerCase().endsWith(".sig"))
      .map((item) => [item.file.name.toLowerCase(), item]),
  );
  const errors: string[] = [];
  const pairs: Array<{ source: QueueItem; signature: QueueItem }> = [];

  if (!signatures.length) errors.push("Добавьте файл подписи с расширением .sig.");
  for (const signature of signatures) {
    const expectedName = sourceNameForSignature(signature.file.name).toLowerCase();
    const source = sources.get(expectedName);
    if (source) pairs.push({ source, signature });
    else errors.push(`${signature.file.name}: не найден исходный файл ${expectedName}.`);
  }
  for (const source of sources.values()) {
    if (!pairs.some((pair) => pair.source.id === source.id)) {
      errors.push(`${source.file.name}: не найден соответствующий файл .sig.`);
    }
  }
  return { pairs, errors };
}

function sourceNameForSignature(signatureName: string): string {
  const withoutSig = signatureName.slice(0, -4);
  return withoutSig.replace(/\.[12]$/, "");
}
