const FORMAT = "SignFlow-AES-256-GCM";
const ITERATIONS = 250_000;

interface PasswordContainer {
  format: typeof FORMAT;
  iterations: number;
  salt: string;
  iv: string;
  data: string;
}

export async function encryptFileWithPassword(file: File, password: string): Promise<Blob> {
  const container = await encryptBytesWithPassword(new Uint8Array(await file.arrayBuffer()), password);
  return new Blob([JSON.stringify(container)], { type: "application/vnd.signflow.encrypted+json" });
}

export async function decryptFileWithPassword(file: File, password: string): Promise<Blob> {
  let container: PasswordContainer;
  try {
    container = JSON.parse(await file.text()) as PasswordContainer;
  } catch {
    throw new Error("Файл не является контейнером SignFlow .sfenc.");
  }
  try {
    const decrypted = await decryptBytesWithPassword(container, password);
    return new Blob([decrypted], { type: "application/octet-stream" });
  } catch (error) {
    if (error instanceof Error && error.message === "Неизвестный формат контейнера.") throw error;
    throw new Error("Неверный пароль или контейнер повреждён.");
  }
}

export async function encryptBytesWithPassword(
  bytes: Uint8Array<ArrayBuffer>,
  password: string,
): Promise<PasswordContainer> {
  if (password.length < 8) throw new Error("Пароль должен содержать не менее 8 символов.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes);
  return {
    format: FORMAT,
    iterations: ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptBytesWithPassword(container: PasswordContainer, password: string): Promise<Uint8Array<ArrayBuffer>> {
  if (container.format !== FORMAT || container.iterations !== ITERATIONS) throw new Error("Неизвестный формат контейнера.");
  const salt = base64ToBytes(container.salt);
  const iv = base64ToBytes(container.iv);
  const key = await deriveKey(password, salt, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, base64ToBytes(container.data));
  return new Uint8Array(decrypted);
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, usages: KeyUsage[]): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
