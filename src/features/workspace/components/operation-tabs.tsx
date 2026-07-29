import type { OperationMode } from "../types";

const operations: Array<{ id: OperationMode; label: string; description: string }> = [
  { id: "sign", label: "Подписать", description: "Создать отсоединённую CAdES-подпись .sig" },
  { id: "verify", label: "Проверить", description: "Проверить подпись, сертификат и целостность" },
  { id: "encrypt", label: "Зашифровать", description: "Защитить сертификатом или паролем" },
  { id: "decrypt", label: "Расшифровать", description: "Открыть контейнер .p7m или .sfenc" },
];

interface OperationTabsProps {
  value: OperationMode;
  onChange: (value: OperationMode) => void;
}

export function OperationTabs({ value, onChange }: OperationTabsProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <div className="operation-tabs" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }} role="tablist" aria-label="Операция">
      {operations.map((operation) => (
        <button
          key={operation.id}
          className={`operation-tab ${value === operation.id ? "operation-tab-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={value === operation.id}
          onClick={() => onChange(operation.id)}
        >
          <strong>{operation.label}</strong>
          <span>{operation.description}</span>
        </button>
      ))}
      <a className="operation-tab" href={`${basePath}/pdfa/`} role="tab" aria-selected="false">
        <strong>PDF/A</strong>
        <span>Преобразовать PDF в архивный формат PDF/A-2b</span>
      </a>
    </div>
  );
}