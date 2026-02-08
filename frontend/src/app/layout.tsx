import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrivateAudit — Privacy-Preserving Smart Contract Audits",
  description: "Submit contracts for security analysis with encrypted results using COTI's privacy layer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
