import { formatBytes } from "@/lib/utils";
import type { QueueItem } from "../types";

interface FileQueueProps {
  items: QueueItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function FileQueue({ items, onRemove, onClear }: FileQueueProps) {
  if (!items.length) return null;

  const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);

  return (
    <section className="queue-panel" aria-label="Очередь файлов">
      <div className="queue-header">
        <div>
          <h2>Файлы</h2>
          <p>{items.length} шт. · {formatBytes(totalBytes)}</p>
        </div>
        <button className="text-button" type="button" onClick={onClear}>Очистить</button>
      </div>
      <div className="queue-list">
        {items.map((item) => (
          <div className="queue-item" key={item.id}>
            <div className="file-mark" aria-hidden>{fileExtension(item.file.name)}</div>
            <div className="queue-file-info">
              <strong title={item.file.name}>{item.file.name}</strong>
              <span>{formatBytes(item.file.size)} · {statusLabel(item)}</span>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label={`Удалить ${item.file.name}`}
              onClick={() => onRemove(item.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function fileExtension(name: string): string {
  const extension = name.split(".").pop();
  return extension && extension !== name ? extension.slice(0, 4).toUpperCase() : "FILE";
}

function statusLabel(item: QueueItem): string {
  if (item.status === "processing") return "Подписание…";
  if (item.status === "completed") return "Подпись сохранена";
  if (item.status === "error") return item.error || "Ошибка подписания";
  return "Готов к обработке";
}
