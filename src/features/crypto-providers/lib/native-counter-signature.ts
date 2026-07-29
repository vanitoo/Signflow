const DEFAULT_NATIVE_HELPER_URL = "http://127.0.0.1:17891";

export interface CounterSignatureRequest {
  source: File;
  signature: File;
  certificateThumbprint: string;
  signerIndex: number;
  timestamp: boolean;
  tsaAddress: string;
}

interface NativeHelperStatus {
  service: string;
  version: string;
  capabilities: string[];
}

export async function counterSignWithNativeHelper(
  request: CounterSignatureRequest,
  baseUrl = DEFAULT_NATIVE_HELPER_URL,
): Promise<Blob> {
  const status = await readNativeHelperStatus(baseUrl);
  if (!status.capabilities.includes("cades-counter-signature")) {
    throw new Error("Установленный SignFlow Native Helper не поддерживает CAdES-контрподпись.");
  }

  const form = new FormData();
  form.append("source", request.source, request.source.name);
  form.append("signature", request.signature, request.signature.name);
  form.append("certificateThumbprint", request.certificateThumbprint);
  form.append("signerIndex", String(request.signerIndex));
  form.append("timestamp", String(request.timestamp));
  form.append("tsaAddress", request.tsaAddress);

  const response = await fetch(`${baseUrl}/v1/cades/counter-sign`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(details || `Native Helper вернул HTTP ${response.status}.`);
  }
  return response.blob();
}

async function readNativeHelperStatus(baseUrl: string): Promise<NativeHelperStatus> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/status`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error(
      "Контрподпись пока недоступна в одной только веб-версии SignFlow. Для неё требуется отдельный SignFlow Native Helper, который ещё не выпущен. Обычная подпись и две независимые подписи работают без него.",
    );
  }
  if (!response.ok) throw new Error(`Не удалось проверить SignFlow Native Helper: HTTP ${response.status}.`);
  return response.json() as Promise<NativeHelperStatus>;
}
