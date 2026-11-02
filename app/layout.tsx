import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'BARBERPRO — Votre salon, en mieux', description: 'La plateforme de gestion pour les salons de coiffure.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="fr"><body>{children}</body></html>; }
