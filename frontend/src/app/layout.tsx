import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Audio Notes AI | Speech-to-Text & Summarization Platform',
  description: 'Upload audio of any length to generate accurate transcripts and executive summaries powered by Gnani ASR and LLMs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-[#090d16] text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-200`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>Audio Notes Platform • Powered by Gnani ASR &amp; FastAPI</p>
            <p>
              Designed for high-throughput speech transcription &bull; <a href="/architecture" className="text-sky-400 hover:underline">System Architecture</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
