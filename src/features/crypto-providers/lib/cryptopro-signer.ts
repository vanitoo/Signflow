import { loadCadesPluginApi } from "./detect-capabilities";

const CAPICOM_CURRENT_USER_STORE = 2;
const CAPICOM_MY_STORE = "My";
const CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED = 2;
const CAPICOM_CERTIFICATE_FIND_SHA1_HASH = 0;
const CAPICOM_CERTIFICATE_INCLUDE_END_ENTITY_ONLY = 2;
const CADESCOM_BASE64_TO_BINARY = 1;
const CADESCOM_CADES_BES = 1;
const CADESCOM_CADES_T = 0x5;
const CADESCOM_ENCODE_BASE64 = 0;

type AsyncValue<T> = T | Promise<T>;

interface Store {
  Open(location: number, name: string, mode: number): Promise<void>;
  Close(): Promise<void>;
  Certificates: AsyncValue<Certificates>;
}

interface Certificates {
  Count: AsyncValue<number>;
  Item(index: number): Promise<Certificate>;
  Find(type: number, value: string): Promise<Certificates>;
}

interface Certificate {
  SubjectName: AsyncValue<string>;
  IssuerName: AsyncValue<string>;
  Thumbprint: AsyncValue<string>;
  ValidToDate: AsyncValue<string | Date>;
  ValidFromDate: AsyncValue<string | Date>;
  SerialNumber: AsyncValue<string>;
  HasPrivateKey(): Promise<boolean>;
  IsValid(): Promise<CertificateStatus>;
}

interface CertificateStatus {
  Result: AsyncValue<boolean>;
}

interface Signer {
  propset_Certificate(certificate: Certificate): Promise<void>;
  propset_Options(value: number): Promise<void>;
  propset_TSAAddress(value: string): Promise<void>;
  propset_CheckCertificate(value: boolean): Promise<void>;
}

interface SignedData {
  propset_ContentEncoding(value: number): Promise<void>;
  propset_Content(value: string): Promise<void>;
  SignCades(signer: Signer, type: number, detached: boolean): Promise<string>;
  VerifyCades(signature: string, type: number, detached: boolean): Promise<void>;
  Signers: AsyncValue<Signers>;
  GetMsgType(signature: string): Promise<number>;
}

interface EnvelopedRecipients {
  Add(certificate: Certificate): Promise<void>;
}

interface EnvelopedData {
  propset_ContentEncoding(value: number): Promise<void>;
  propset_Content(value: string): Promise<void>;
  Recipients: AsyncValue<EnvelopedRecipients>;
  Content: AsyncValue<string>;
  Encrypt(encoding: number): Promise<string>;
  Decrypt(message: string): Promise<void>;
}

interface Signers {
  Count: AsyncValue<number>;
  Item(index: number): Promise<VerifiedSigner>;
}

interface VerifiedSigner {
  Certificate: AsyncValue<Certificate>;
  SigningTime: AsyncValue<string | Date>;
}

export interface CryptoProCertificate {
  thumbprint: string;
  subject: string;
  issuer: string;
  validTo: string;
}

export async function listCryptoProCertificates(): Promise<CryptoProCertificate[]> {
  const store = await createObject<Store>("CAdESCOM.Store");
  await store.Open(CAPICOM_CURRENT_USER_STORE, CAPICOM_MY_STORE, CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED);
  try {
    const certificates = await store.Certificates;
    const count = await certificates.Count;
    const result: CryptoProCertificate[] = [];
    for (let index = 1; index <= count; index += 1) {
      const certificate = await certificates.Item(index);
      if (!(await certificate.HasPrivateKey())) continue;
      const [thumbprint, subject, issuer, validTo] = await Promise.all([
        certificate.Thumbprint,
        certificate.SubjectName,
        certificate.IssuerName,
        certificate.ValidToDate,
      ]);
      result.push({
        thumbprint,
        subject: readableName(subject),
        issuer: readableName(issuer),
        validTo: new Date(validTo).toLocaleDateString("ru-RU"),
      });
    }
    return result;
  } finally {
    await store.Close();
  }
}

export async function signFileWithCryptoPro(
  file: File,
  thumbprint: string,
  options: { timestamp: boolean; tsaAddress: string } = { timestamp: false, tsaAddress: "" },
): Promise<Blob> {
  const store = await createObject<Store>("CAdESCOM.Store");
  await store.Open(CAPICOM_CURRENT_USER_STORE, CAPICOM_MY_STORE, CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED);
  try {
    const certificates = await store.Certificates;
    const matches = await certificates.Find(CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);
    if ((await matches.Count) < 1) throw new Error("Выбранный сертификат не найден в хранилище.");

    const certificate = await matches.Item(1);
    const signer = await createObject<Signer>("CAdESCOM.CPSigner");
    await signer.propset_Certificate(certificate);
    await signer.propset_Options(CAPICOM_CERTIFICATE_INCLUDE_END_ENTITY_ONLY);
    if (options.timestamp) {
      await signer.propset_CheckCertificate(true);
      await signer.propset_TSAAddress(options.tsaAddress);
    }

    const signedData = await createObject<SignedData>("CAdESCOM.CadesSignedData");
    await signedData.propset_ContentEncoding(CADESCOM_BASE64_TO_BINARY);
    await signedData.propset_Content(await fileToBase64(file));
    const signature = await signedData.SignCades(
      signer,
      options.timestamp ? CADESCOM_CADES_T : CADESCOM_CADES_BES,
      true,
    );
    return new Blob([base64ToArrayBuffer(signature)], { type: "application/pkcs7-signature" });
  } finally {
    await store.Close();
  }
}

export interface CryptoProVerificationResult {
  signer: string;
  issuer: string;
  signingTime: string;
  thumbprint: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  signatureType: "CAdES-BES" | "CAdES-T" | "CAdES-X Long Type 1" | "CAdES";
  chainValid?: boolean;
  chainError?: string;
}

export async function verifyFileWithCryptoPro(
  file: File,
  signatureFile: File,
  options: { onlineValidation: boolean } = { onlineValidation: false },
): Promise<CryptoProVerificationResult[]> {
  const signedData = await createObject<SignedData>("CAdESCOM.CadesSignedData");
  await signedData.propset_ContentEncoding(CADESCOM_BASE64_TO_BINARY);
  await signedData.propset_Content(await fileToBase64(file));
  const signature = await signatureFileToBase64(signatureFile);
  await signedData.VerifyCades(signature, CADESCOM_CADES_BES, true);
  const signatureType = cadesTypeName(await readCadesType(signedData, signature));

  const signers = await signedData.Signers;
  const count = await signers.Count;
  const result: CryptoProVerificationResult[] = [];
  for (let index = 1; index <= count; index += 1) {
    const signer = await signers.Item(index);
    const certificate = await signer.Certificate;
    const [subject, issuer, signingTime, thumbprint, serialNumber, validFrom, validTo] = await Promise.all([
      certificate.SubjectName,
      certificate.IssuerName,
      signer.SigningTime,
      certificate.Thumbprint,
      certificate.SerialNumber,
      certificate.ValidFromDate,
      certificate.ValidToDate,
    ]);
    let chainValid: boolean | undefined;
    let chainError: string | undefined;
    if (options.onlineValidation) {
      try {
        const status = await certificate.IsValid();
        chainValid = await status.Result;
        if (!chainValid) chainError = "Цепочка не построена, сертификат недействителен или отозван.";
      } catch (error) {
        chainValid = false;
        chainError = cryptoProError(error);
      }
    }
    result.push({
      signer: readableName(subject),
      issuer: readableName(issuer),
      signingTime: new Date(signingTime).toLocaleString("ru-RU"),
      thumbprint,
      serialNumber,
      validFrom: new Date(validFrom).toLocaleDateString("ru-RU"),
      validTo: new Date(validTo).toLocaleDateString("ru-RU"),
      signatureType,
      chainValid,
      chainError,
    });
  }
  return result;
}

async function readCadesType(signedData: SignedData, signature: string): Promise<number> {
  try {
    return await signedData.GetMsgType(signature);
  } catch {
    return CADESCOM_CADES_BES;
  }
}

function cadesTypeName(type: number): CryptoProVerificationResult["signatureType"] {
  if (type === CADESCOM_CADES_T) return "CAdES-T";
  if (type === 0x5d) return "CAdES-X Long Type 1";
  if (type === CADESCOM_CADES_BES) return "CAdES-BES";
  return "CAdES";
}

function cryptoProError(error: unknown): string {
  try {
    return window.cadesplugin?.getLastError?.(error) || (error instanceof Error ? error.message : String(error));
  } catch {
    return error instanceof Error ? error.message : String(error);
  }
}

export async function encryptFileWithCryptoPro(file: File, thumbprint: string): Promise<Blob> {
  const store = await createObject<Store>("CAdESCOM.Store");
  await store.Open(CAPICOM_CURRENT_USER_STORE, CAPICOM_MY_STORE, CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED);
  try {
    const certificates = await store.Certificates;
    const matches = await certificates.Find(CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);
    if ((await matches.Count) < 1) throw new Error("Сертификат получателя не найден в хранилище.");
    const certificate = await matches.Item(1);
    const envelopedData = await createObject<EnvelopedData>("CAdESCOM.CPEnvelopedData");
    await envelopedData.propset_ContentEncoding(CADESCOM_BASE64_TO_BINARY);
    await envelopedData.propset_Content(await fileToBase64(file));
    const recipients = await envelopedData.Recipients;
    await recipients.Add(certificate);
    const encrypted = await envelopedData.Encrypt(CADESCOM_ENCODE_BASE64);
    return new Blob([base64ToArrayBuffer(encrypted)], { type: "application/pkcs7-mime" });
  } finally {
    await store.Close();
  }
}

export async function decryptFileWithCryptoPro(file: File): Promise<Blob> {
  const envelopedData = await createObject<EnvelopedData>("CAdESCOM.CPEnvelopedData");
  await envelopedData.propset_ContentEncoding(CADESCOM_BASE64_TO_BINARY);
  await envelopedData.Decrypt(await signatureFileToBase64(file));
  const content = await envelopedData.Content;
  return new Blob([base64ToArrayBuffer(content)], { type: "application/octet-stream" });
}

async function createObject<T>(name: string): Promise<T> {
  await loadCadesPluginApi();
  const plugin = window.cadesplugin;
  if (!plugin) throw new Error("API КриптоПро не загружен.");
  await Promise.resolve(plugin);
  if (typeof plugin.CreateObjectAsync !== "function") {
    throw new Error("Асинхронный API КриптоПро недоступен.");
  }
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await plugin.CreateObjectAsync.call(plugin, name) as T;
    } catch (error) {
      lastError = error;
      if (!String(error).includes("CreateObjectAsync")) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }
  }
  throw lastError;
}

async function fileToBase64(file: File): Promise<string> {
  return arrayBufferToBase64(await file.arrayBuffer());
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function signatureFileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const asText = new TextDecoder("ascii").decode(bytes).replace(/\s/g, "");
  if (asText.length > 0 && asText.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(asText)) {
    return asText;
  }
  return arrayBufferToBase64(buffer);
}

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const normalized = value.replace(/\s/g, "");
  const binary = atob(normalized);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return buffer;
}

function readableName(distinguishedName: string): string {
  const commonName = distinguishedName.match(/(?:^|,\s*)CN=([^,]+)/i)?.[1];
  return commonName ?? distinguishedName;
}
