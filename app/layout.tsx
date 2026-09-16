import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'translAIte - Fast Multimodal Document, Audio & Video Translator',
  description:
    'High-speed system for translating documents (PDF, DOCX, TXT), audio files, and video streams into 50+ languages with synchronized subtitles and voice dubbing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
