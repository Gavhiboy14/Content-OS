import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { ActivePageProvider } from "@/components/active-page-context";
import { Sidebar } from "@/components/sidebar/sidebar";
import { getPageTree } from "@/lib/pages";
import "./globals.css";

// Display: títulos de página y marca. Tiene carácter, se usa con restricción.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

// UI: todo lo demás. Neutra y muy legible en tamaños chicos.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Metadatos: contadores, fechas, rutas.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Content OS",
  description: "Workspace personal para gestionar clientes y contenido",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tree = await getPageTree();

  return (
    <html
      lang="es"
      className={`${bricolage.variable} ${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="font-sans flex min-h-full">
        <ActivePageProvider>
          <Sidebar tree={tree} />
          {children}
        </ActivePageProvider>
      </body>
    </html>
  );
}
