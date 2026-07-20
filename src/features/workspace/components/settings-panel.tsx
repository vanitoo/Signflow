import type { EncryptSettings, OperationMode, SignSettings } from "../types";
import type { CryptoProCertificate } from "@/features/crypto-providers/lib/cryptopro-signer";

interface SettingsPanelProps {
  operation: OperationMode;
  signSettings: SignSettings;
  encryptSettings: EncryptSettings;
  certificates: CryptoProCertificate[];
  certificatesLoading: boolean;
  certificateError: string;
  onSignSettingsChange: (settings: SignSettings) => void;
  onEncryptSettingsChange: (settings: EncryptSettings) => void;
}

export function SettingsPanel({
  operation,
  signSettings,
  encryptSettings,
  certificates,
  certificatesLoading,
  certificateError,
  onSignSettingsChange,
  onEncryptSettingsChange,
}: SettingsPanelProps) {
  if (operation === "verify") {
    return (
      <div className="settings-card">
        <h2>Проверка</h2>
        <p className="settings-description">
          SignFlow проверит целостность, подписи, сертификаты и доступные сведения о доверии. Сетевые CRL и OCSP не выполняются автоматически.
        </p>
        <div className="notice">Для отсоединённой подписи добавьте исходный файл и соответствующий файл <code>.sig</code>.</div>
      </div>
    );
  }

  if (operation === "encrypt") {
    return (
      <div className="settings-card">
        <h2>Шифрование</h2>
        <p className="settings-description">Выберите способ защиты результата.</p>
        <div className="segmented-control">
          <button
            type="button"
            className={encryptSettings.mode === "certificate" ? "selected" : ""}
            onClick={() => onEncryptSettingsChange({ mode: "certificate" })}
          >По сертификату</button>
          <button
            type="button"
            className={encryptSettings.mode === "password" ? "selected" : ""}
            onClick={() => onEncryptSettingsChange({ mode: "password" })}
          >По паролю</button>
        </div>
        <div className="notice">Формат контейнера будет зафиксирован на следующем этапе после реализации подписи.</div>
      </div>
    );
  }

  return (
    <div className="settings-card">
      <h2>Параметры подписи</h2>
      <label className="field-label" htmlFor="signature-source">Источник сертификата</label>
      <select
        id="signature-source"
        className="select"
        value={signSettings.source}
        onChange={(event) => onSignSettingsChange({ ...signSettings, source: event.target.value as SignSettings["source"] })}
      >
        <option value="cryptopro">Хранилище Windows / токен через КриптоПро</option>
        <option value="pfx">Файл PFX / P12</option>
      </select>

      {signSettings.source === "cryptopro" && (
        <>
          {Array.from({ length: signSettings.signatureCount }, (_, index) => (
            <div key={index}>
              <label className="field-label" htmlFor={`certificate-${index}`}>
                {signSettings.signatureCount === 1 ? "Сертификат" : `Сертификат подписи ${index + 1}`}
              </label>
              <select
                id={`certificate-${index}`}
                className="select"
                value={signSettings.certificateThumbprints[index] ?? ""}
                disabled={certificatesLoading}
                onChange={(event) => {
                  const selected = [...signSettings.certificateThumbprints];
                  selected[index] = event.target.value;
                  onSignSettingsChange({ ...signSettings, certificateThumbprints: selected });
                }}
              >
                <option value="">{certificatesLoading ? "Загрузка сертификатов…" : "Выберите сертификат"}</option>
                {certificates.map((certificate) => (
                  <option key={certificate.thumbprint} value={certificate.thumbprint}>
                    {certificate.subject} · до {certificate.validTo}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {certificateError && <div className="notice">Не удалось прочитать сертификаты: {certificateError}</div>}
          {!certificatesLoading && !certificateError && certificates.length === 0 && (
            <div className="notice">В личном хранилище не найдено сертификатов с закрытым ключом.</div>
          )}
        </>
      )}

      <label className="field-label">Количество подписей</label>
      <div className="segmented-control">
        <button
          type="button"
          className={signSettings.signatureCount === 1 ? "selected" : ""}
          onClick={() => onSignSettingsChange({ ...signSettings, signatureCount: 1 })}
        >Одна</button>
        <button
          type="button"
          className={signSettings.signatureCount === 2 ? "selected" : ""}
          onClick={() => onSignSettingsChange({ ...signSettings, signatureCount: 2 })}
        >Две независимые</button>
      </div>

      <label className="check-row">
        <input
          type="checkbox"
          checked={signSettings.timestamp}
          onChange={(event) => onSignSettingsChange({ ...signSettings, timestamp: event.target.checked })}
        />
        <span><strong>Добавить доверенную метку времени</strong><small>Потребуется явное сетевое обращение к TSA</small></span>
      </label>

      <div className="notice">Результат: отсоединённая подпись CAdES в файле <code>.sig</code>. Исходный документ не изменяется.</div>
    </div>
  );
}
