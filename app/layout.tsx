import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
 title: 'Annadharaa — Good Food Shouldn’t Become Waste',  
  description:
    'Annadharaa connects surplus food from parties, events, restaurants and hotels with verified organizations that can use it.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-black/5 py-8 mt-16 text-sm text-black/50">
          <div className="max-w-6xl mx-auto px-4 flex flex-wrap gap-x-6 gap-y-2 justify-between">
            <span>© {new Date().getFullYear()} Annadharaa. Demo build — not for production food-safety reliance.</span>
            <div className="flex gap-4">
              <a href="/food-safety" className="hover:underline">Food Safety</a>
              <a href="/terms" className="hover:underline">Terms</a>
              <a href="/privacy" className="hover:underline">Privacy</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
