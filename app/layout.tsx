import type { Metadata } from 'next';
import { Atkinson_Hyperlegible, Geologica } from 'next/font/google';
import '@/styles/main.scss';
import { WebMCPClientProvider } from './WebMCPClientProvider';

const geologica = Geologica({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
});

const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: 'CabCraft 3D — Agent-Native Cabinet Studio & Retailer BOM',
  description:
    'Design modular cabinetry in real-time 3D, run NKBA clearance validation, auto-fit wall layouts, and export Home Depot bill of materials with WebMCP.',
  keywords: [
    'WebMCP',
    'Cabinet Maker',
    'Kitchen Design',
    'Home Depot BOM',
    'Three.js',
    'NKBA',
    'OpenAI Challenge',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${geologica.variable} ${atkinson.variable}`}>
      <body>
        <WebMCPClientProvider>{children}</WebMCPClientProvider>
      </body>
    </html>
  );
}
