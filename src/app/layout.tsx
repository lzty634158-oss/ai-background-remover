import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Background Remover - Remove Image Background Automatically",
  description: "Remove image background automatically in seconds. Free 10 images for new users. Support PNG, JPG, WebP formats.",
  keywords: ["background remover", "remove background", "AI", "image processing", "transparent background"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
