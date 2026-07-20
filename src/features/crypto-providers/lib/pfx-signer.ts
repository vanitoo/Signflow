import forge from "node-forge";

export async function signFileWithPfx(file: File, pfxFile: File, password: string): Promise<Blob> {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const pfxBytes = arrayBufferToBinary(await pfxFile.arrayBuffer());
    const asn1 = forge.asn1.fromDer(pfxBytes);
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  } catch {
    throw new Error("Не удалось открыть PFX/P12. Проверьте пароль и целостность файла.");
  }

  const certificate = firstBag<forge.pki.Certificate>(p12, forge.pki.oids.certBag);
  const privateKey = firstBag<forge.pki.PrivateKey>(p12, forge.pki.oids.pkcs8ShroudedKeyBag)
    ?? firstBag<forge.pki.PrivateKey>(p12, forge.pki.oids.keyBag);
  if (!certificate) throw new Error("В PFX/P12 не найден сертификат.");
  if (!privateKey) throw new Error("В PFX/P12 не найден закрытый ключ.");
  if (!isRsaKey(privateKey)) {
    throw new Error("Этот PFX/P12 использует неподдерживаемый алгоритм. ГОСТ-контейнер импортируйте в КриптоПро.");
  }

  const content = arrayBufferToBinary(await file.arrayBuffer());
  const signedData = forge.pkcs7.createSignedData();
  signedData.content = forge.util.createBuffer(content, "raw");
  signedData.addCertificate(certificate);
  signedData.addSigner({
    key: privateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  signedData.sign({ detached: true });
  const der = forge.asn1.toDer(signedData.toAsn1()).getBytes();
  return new Blob([binaryToArrayBuffer(der)], { type: "application/pkcs7-signature" });
}

function firstBag<T>(p12: forge.pkcs12.Pkcs12Pfx, bagType: string): T | undefined {
  const bags = p12.getBags({ bagType })[bagType];
  const bag = bags?.[0];
  return (bag?.cert ?? bag?.key) as T | undefined;
}

function isRsaKey(key: forge.pki.PrivateKey): key is forge.pki.rsa.PrivateKey {
  return "n" in key && "d" in key;
}

function arrayBufferToBinary(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return binary;
}

function binaryToArrayBuffer(binary: string): ArrayBuffer {
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return buffer;
}
