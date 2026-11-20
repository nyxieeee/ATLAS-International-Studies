import type { Metadata } from 'next';
import './globals.css';
import './design-system.css';
import './motion.css';
import './auth.css';
import './workspace-redesign.css';
import './atlas-refresh.css';
export const metadata: Metadata = { title: 'ATLAS — International Studies Platform', description: 'Understand the world. Analyze events. Think like a diplomat.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

