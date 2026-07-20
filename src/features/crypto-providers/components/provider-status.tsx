import type { CryptoCapability } from "../types";

interface ProviderStatusProps {
  capabilities: CryptoCapability[];
  onRetry: () => void;
}

export function ProviderStatus({ capabilities, onRetry }: ProviderStatusProps) {
  return (
    <section className="provider-panel" aria-label="Криптографические возможности">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Среда</span>
          <h2>Криптопровайдеры</h2>
        </div>
        <button className="provider-retry" type="button" onClick={onRetry}>
          Проверить снова
        </button>
      </div>
      <div className="provider-list">
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
