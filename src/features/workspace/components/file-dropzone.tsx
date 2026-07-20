"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";

interface FileDropzoneProps {
  onSelect: (files: File[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ onSelect, disabled = false }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function accept(files: FileList | null) {
    if (files?.length) onSelect(Array.from(files));
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) accept(event.dataTransfer.files);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.key === "Enter" || event.key === " ") && !disabled) {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <div
      className={`dropzone ${dragging ? "dropzone-active" : ""} ${disabled ? "dropzone-disabled" : ""}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        hidden
        multiple
        type="file"
        onChange={(event) => accept(event.target.files)}
        disabled={disabled}
      />
      <div className="drop-icon" aria-hidden>＋</div>
      <p className="drop-title">Перетащите файлы сюда</p>
      <p className="drop-subtitle">или нажмите, чтобы выбрать до 100 файлов</p>
      <p className="privacy-note">Файлы остаются на этом устройстве</p>
    </div>
  );
}
