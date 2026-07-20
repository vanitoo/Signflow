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
  return (
    <div className="operation-tabs" role="tablist" aria-label="Операция">
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
    </div>
  );
}
