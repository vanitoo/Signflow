import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import packageJson from "../../package.json";
import "./globals.css";
import "./version-footer.css";

export const metadata: Metadata = {
  title: "SignFlow — электронная подпись файлов",
  description: "Локальная подпись, проверка, пакетная обработка и шифрование файлов.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const versionStyle = { "--signflow-version": `"${packageJson.version}"` } as CSSProperties;
  return <html lang="ru"><body style={versionStyle}>{children}</body></html>;
}
