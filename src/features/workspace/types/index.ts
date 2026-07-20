export type OperationMode = "sign" | "verify" | "encrypt" | "decrypt";

export type QueueItemStatus = "ready" | "processing" | "completed" | "error";

export interface QueueItem {
  id: string;
  file: File;
  status: QueueItemStatus;
  progress: number;
  error?: string;
}

export type SignatureSource = "cryptopro" | "pfx";
export type EncryptionMode = "certificate" | "password";

export interface SignSettings {
  source: SignatureSource;
  signatureCount: 1 | 2;
  certificateThumbprints: string[];
  pfxFile?: File;
  pfxPassword: string;
  detached: true;
  timestamp: boolean;
  tsaAddress: string;
}

export interface EncryptSettings {
  mode: EncryptionMode;
  recipientThumbprint: string;
  password: string;
}
