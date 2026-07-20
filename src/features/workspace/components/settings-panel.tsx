import type { EncryptSettings, OperationMode, SignSettings } from "../types";
import type { CryptoProCertificate } from "@/features/crypto-providers/lib/cryptopro-signer";

interface SettingsPanelProps {
  operation: OperationMode;
  signSettings: SignSettings;
  encryptSettings: EncryptSettings;
  certificates: CryptoProCertificate[];
  certificatesLoading: boolean;
  certificateError: string;
  onlineValidation: boolean;
  onSignSettingsChange: (settings: SignSettings) => void;
  onEncryptSettingsChange: (settings: EncryptSettings) => void;
  onOnlineValidationChange: (value: boolean) => void;
}

export function SettingsPanel({
  operation,
  signSettings,
  encryptSettings,
  certificates,
  certificatesLoading,
  certificateError,
  onlineValidation,
  onSignSettingsChange,
  onEncryptSettingsChange,
  onOnlineValidationChange,
}: SettingsPanelProps) {
  if (operation === "verify") {
    return (
      <div className="settings-card">
        <h2>Проверка</h2>
        <p className="settings-description">
          SignFlow проверит целостность, подписи, сертификаты и доступные сведения о доверии. Сетевые CRL и OCSP не выполняются автоматически.
        </p>
        <div className="notice">Для отсоединённой подписи добавьте исходный файл и соответствующий файл <code>.sig</code>.</div>
        <label className="check-row">
          <input
            type="checkbox"
            checked={onlineValidation}
            onChange={(event) => onOnlineValidationChange(event.target.checked)}
          />
          <span>
            <strong>Проверить цепочку и отзыв сертификата</strong>
            <small>КриптоПро может обратиться к CRL/OCSP-адресам из сертификата. Требуется сеть.</small>
          </span>
        </label>
      </div>
    );
  }

  if (operation === "decrypt") {
    return (
      <div className="settings-card">
        <h2>Расшифрование</h2>
        <p className="settings-description">Выберите тип добавленного контейнера.</p>
        <div className="segmented-control">
          <button
            type="button"
            className={encryptSettings.mode === "certificate" ? "selected" : ""}
            onClick={() => onEncryptSettingsChange({ ...encryptSettings, mode: "certificate" })}
          >Сертификат (.p7m)</button>
          <button
            type="button"
            className={encryptSettings.mode === "password" ? "selected" : ""}
            onClick={() => onEncryptSettingsChange({ ...encryptSettings, mode: "password" })}
          >Пароль (.sfenc)</button>
        </div>
        {encryptSettings.mode === "certificate" ? (
          <div className="notice">КриптоПро автоматически найдёт сертификат и закрытый ключ получателя в хранилище Windows или на токене.</div>
        ) : (
          <>
            <label className="field-label" htmlFor="decryption-password">Пароль</label>
            <input
              id="decryption-password"
              className="select"
              type="password"
              autoComplete="current-password"
              value={encryptSettings.password}
              onChange={(event) => onEncryptSettingsChange({ ...encryptSettings, password: event.target.value })}
              placeholder="Пароль контейнера"
            />
          </>
        )}
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
            onClick={() => onEncryptSettingsChange({ ...encryptSettings, mode: "certificate" })}
          >По сертификату</button>
          <button
            type="button"
            className={encryptSettings.mode === "password" ? "selected" : ""}
            onClick={() => onEncryptSettingsChange({ ...encryptSettings, mode: "password" })}
          >По паролю</button>
        </div>
        {encryptSettings.mode === "certificate" ? (
          <>
            <label className="field-label" htmlFor="encryption-certificate">Сертификат получателя</label>
            <select
              id="encryption-certificate"
              className="select"
              value={encryptSettings.recipientThumbprint}
              disabled={certificatesLoading}
              onChange={(event) => onEncryptSettingsChange({ ...encryptSettings, recipientThumbprint: event.target.value })}
            >
              <option value="">{certificatesLoading ? "Загрузка сертификатов…" : "Выберите сертификат"}</option>
              {certificates.map((certificate) => (
                <option key={certificate.thumbprint} value={certificate.thumbprint}>
                  {certificate.subject} · до {certificate.validTo}
                </option>
              ))}
            </select>
            {certificateError && <div className="notice">Не удалось прочитать сертификаты: {certificateError}</div>}
            <div className="notice">Результат: стандартный CMS EnvelopedData в файле <code>.p7m</code>.</div>
          </>
        ) : (
          <>
            <label className="field-label" htmlFor="encryption-password">Пароль</label>
            <input
              id="encryption-password"
              className="select"
              type="password"
              autoComplete="new-password"
              value={encryptSettings.password}
              onChange={(event) => onEncryptSettingsChange({ ...encryptSettings, password: event.target.value })}
              placeholder="Не менее 8 символов"
            />
            <div className="notice">Локальное AES-256-GCM шифрование. Результат сохраняется как <code>.sfenc</code>.</div>
          </>
        )}
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
        onChange={(event) => {
          const source = event.target.value as SignSettings["source"];
          onSignSettingsChange({ ...signSettings, source, signatureCount: source === "pfx" ? 1 : signSettings.signatureCount });
        }}
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
      {signSettings.source === "pfx" && (
        <>
          <label className="field-label" htmlFor="pfx-file">Контейнер PFX/P12</label>
          <input
            id="pfx-file"
            className="select"
            type="file"
            accept=".pfx,.p12,application/x-pkcs12"
            onChange={(event) => onSignSettingsChange({ ...signSettings, pfxFile: event.target.files?.[0] })}
          />
          {signSettings.pfxFile && <div className="notice">Выбран файл: {signSettings.pfxFile.name}</div>}
          <label className="field-label" htmlFor="pfx-password">Пароль контейнера</label>
          <input
            id="pfx-password"
            className="select"
            type="password"
            autoComplete="current-password"
            value={signSettings.pfxPassword}
            onChange={(event) => onSignSettingsChange({ ...signSettings, pfxPassword: event.target.value })}
            placeholder="Пароль PFX/P12"
          />
          <div className="notice">Поддерживаются RSA-контейнеры. ГОСТ PFX/P12 необходимо импортировать в КриптоПро.</div>
        </>
      )}

      {signSettings.source === "cryptopro" && <><label className="field-label">Количество подписей</label>
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
      </div></>}

      <label className="check-row">
        <input
          type="checkbox"
          checked={signSettings.timestamp}
          onChange={(event) => onSignSettingsChange({ ...signSettings, timestamp: event.target.checked })}
        />
        <span><strong>Добавить доверенную метку времени</strong><small>Потребуется явное сетевое обращение к TSA</small></span>
      </label>
      {signSettings.timestamp && (
        <>
          <label className="field-label" htmlFor="tsa-address">Адрес службы TSA</label>
          <input
            id="tsa-address"
            className="select"
            type="url"
            value={signSettings.tsaAddress}
            onChange={(event) => onSignSettingsChange({ ...signSettings, tsaAddress: event.target.value })}
            placeholder="https://tsa.example.ru/tsp/"
          />
          <div className="notice">Будет создана CAdES-T. Хэш подписи отправляется указанной службе времени; документ не отправляется.</div>
        </>
      )}

      <div className="notice">Результат: отсоединённая подпись CAdES в файле <code>.sig</code>. Исходный документ не изменяется.</div>
    </div>
  );
}
