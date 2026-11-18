import './globals.css';

export const metadata = {
  title: 'ESP32 Cloud Control Hub',
  description: 'Remote ESP32 Relay Control, Automation & Power Analytics',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#020617',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}