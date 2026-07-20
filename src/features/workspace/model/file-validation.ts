import { MAX_BATCH_FILES, MAX_FILE_SIZE_BYTES } from "./constants";

export interface FileValidationResult {
  accepted: File[];
  rejected: Array<{ file: File; reason: string }>;
}

export function validateFiles(incoming: File[], existing: File[]): FileValidationResult {
  const accepted: File[] = [];
  const rejected: Array<{ file: File; reason: string }> = [];
  const known = new Set(existing.map(fileKey));

  for (const file of incoming) {
    if (existing.length + accepted.length >= MAX_BATCH_FILES) {
      rejected.push({ file, reason: `В одном пакете допускается не более ${MAX_BATCH_FILES} файлов` });
      continue;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      rejected.push({ file, reason: "Файл превышает лимит 2 ГБ" });
      continue;
    }

    const key = fileKey(file);
    if (known.has(key)) {
      rejected.push({ file, reason: "Такой файл уже добавлен" });
      continue;
    }

    known.add(key);
    accepted.push(file);
  }

  return { accepted, rejected };
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}
