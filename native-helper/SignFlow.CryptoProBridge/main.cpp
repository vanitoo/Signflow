#include <windows.h>
#include <wincrypt.h>
#include <ncrypt.h>
#include <cades.h>
#include <algorithm>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

#pragma comment(lib, "crypt32.lib")
#pragma comment(lib, "ncrypt.lib")
#pragma comment(lib, "cades.lib")

namespace {
std::vector<BYTE> read_file(const std::wstring& path) {
    std::ifstream stream(path, std::ios::binary);
    if (!stream) throw std::runtime_error("Cannot open input file");
    return {std::istreambuf_iterator<char>(stream), std::istreambuf_iterator<char>()};
}

void write_file(const std::wstring& path, const std::vector<BYTE>& data) {
    std::ofstream stream(path, std::ios::binary | std::ios::trunc);
    if (!stream) throw std::runtime_error("Cannot create output file");
    stream.write(reinterpret_cast<const char*>(data.data()), static_cast<std::streamsize>(data.size()));
    if (!stream) throw std::runtime_error("Cannot write output file");
}

std::vector<BYTE> hex_to_bytes(std::wstring value) {
    value.erase(std::remove_if(value.begin(), value.end(), [](wchar_t ch) { return iswspace(ch) || ch == L':'; }), value.end());
    if (value.size() % 2 != 0) throw std::runtime_error("Invalid certificate thumbprint");
    std::vector<BYTE> result(value.size() / 2);
    for (size_t i = 0; i < result.size(); ++i) result[i] = static_cast<BYTE>(std::stoul(value.substr(i * 2, 2), nullptr, 16));
    return result;
}

PCCERT_CONTEXT find_certificate(const std::wstring& thumbprint) {
    const auto hash = hex_to_bytes(thumbprint);
    CRYPT_HASH_BLOB blob{static_cast<DWORD>(hash.size()), const_cast<BYTE*>(hash.data())};
    HCERTSTORE store = CertOpenSystemStoreW(nullptr, L"MY");
    if (!store) throw std::runtime_error("Cannot open CurrentUser\\My certificate store");
    PCCERT_CONTEXT cert = CertFindCertificateInStore(store, X509_ASN_ENCODING | PKCS_7_ASN_ENCODING,
        0, CERT_FIND_HASH, &blob, nullptr);
    CertCloseStore(store, 0);
    if (!cert) throw std::runtime_error("Certificate not found in CurrentUser\\My");
    return cert;
}

std::string windows_error(const char* operation) {
    return std::string(operation) + " failed, Win32 error " + std::to_string(GetLastError());
}

std::wstring argument(int argc, wchar_t** argv, const std::wstring& name) {
    for (int i = 1; i + 1 < argc; ++i) if (argv[i] == name) return argv[i + 1];
    return {};
}

int counter_sign(int argc, wchar_t** argv) {
    const auto input = argument(argc, argv, L"--input");
    const auto output = argument(argc, argv, L"--output");
    const auto thumbprint = argument(argc, argv, L"--thumbprint");
    const auto signerIndexText = argument(argc, argv, L"--signer-index");
    if (input.empty() || output.empty() || thumbprint.empty() || signerIndexText.empty()) {
        std::cerr << "Required: --input --output --thumbprint --signer-index";
        return 2;
    }
    const DWORD signerIndex = static_cast<DWORD>(std::stoul(signerIndexText));
    const auto signature = read_file(input);

    HCRYPTMSG message = CryptMsgOpenToDecode(X509_ASN_ENCODING | PKCS_7_ASN_ENCODING, 0, 0, 0, nullptr, nullptr);
    if (!message) throw std::runtime_error(windows_error("CryptMsgOpenToDecode"));
    if (!CryptMsgUpdate(message, signature.data(), static_cast<DWORD>(signature.size()), TRUE)) {
        CryptMsgClose(message);
        throw std::runtime_error(windows_error("CryptMsgUpdate"));
    }

    PCCERT_CONTEXT cert = find_certificate(thumbprint);
    HCRYPTPROV_OR_NCRYPT_KEY_HANDLE keyHandle = 0;
    DWORD keySpec = 0;
    BOOL freeKey = FALSE;
    if (!CryptAcquireCertificatePrivateKey(cert, CRYPT_ACQUIRE_COMPARE_KEY_FLAG | CRYPT_ACQUIRE_PREFER_NCRYPT_KEY_FLAG,
        nullptr, &keyHandle, &keySpec, &freeKey)) {
        CertFreeCertificateContext(cert);
        CryptMsgClose(message);
        throw std::runtime_error(windows_error("CryptAcquireCertificatePrivateKey"));
    }

    CMSG_SIGNER_ENCODE_INFO signer{};
    signer.cbSize = sizeof(signer);
    signer.pCertInfo = cert->pCertInfo;
    signer.dwKeySpec = keySpec;
    if (keySpec == CERT_NCRYPT_KEY_SPEC) signer.hNCryptKey = keyHandle;
    else signer.hCryptProv = static_cast<HCRYPTPROV>(keyHandle);
    signer.HashAlgorithm.pszObjId = const_cast<LPSTR>(szOID_CP_GOST_R3411_12_256);

    CADES_SIGN_PARA signPara{};
    signPara.dwSize = sizeof(signPara);
    signPara.dwCadesType = CADES_BES;
    signPara.pSignerCert = cert;

    CADES_COSIGN_PARA cosignPara{};
    cosignPara.dwSize = sizeof(cosignPara);
    cosignPara.pSigner = &signer;
    cosignPara.pCadesSignPara = &signPara;

    if (!CadesMsgCountersign(message, signerIndex, 1, &cosignPara)) {
        const auto error = windows_error("CadesMsgCountersign");
        if (freeKey) {
            if (keySpec == CERT_NCRYPT_KEY_SPEC) NCryptFreeObject(keyHandle);
            else CryptReleaseContext(static_cast<HCRYPTPROV>(keyHandle), 0);
        }
        CertFreeCertificateContext(cert);
        CryptMsgClose(message);
        throw std::runtime_error(error);
    }

    DWORD encodedSize = 0;
    if (!CryptMsgGetParam(message, CMSG_ENCODED_MESSAGE, 0, nullptr, &encodedSize)) throw std::runtime_error(windows_error("CryptMsgGetParam(size)"));
    std::vector<BYTE> encoded(encodedSize);
    if (!CryptMsgGetParam(message, CMSG_ENCODED_MESSAGE, 0, encoded.data(), &encodedSize)) throw std::runtime_error(windows_error("CryptMsgGetParam(data)"));
    encoded.resize(encodedSize);

    if (freeKey) {
        if (keySpec == CERT_NCRYPT_KEY_SPEC) NCryptFreeObject(keyHandle);
        else CryptReleaseContext(static_cast<HCRYPTPROV>(keyHandle), 0);
    }
    CertFreeCertificateContext(cert);
    CryptMsgClose(message);
    write_file(output, encoded);
    std::cout << "CAdES countersignature created";
    return 0;
}
}

int wmain(int argc, wchar_t** argv) {
    try {
        if (argc < 2 || std::wstring(argv[1]) != L"counter-sign") {
            std::cerr << "Usage: SignFlow.CryptoProBridge counter-sign ...";
            return 2;
        }
        return counter_sign(argc, argv);
    } catch (const std::exception& error) {
        std::cerr << error.what();
        return 1;
    }
}
