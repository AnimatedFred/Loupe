import './globals.css';

export const metadata = {
  title: 'Subsrf Tokens — Extract any design system',
  description: 'Point at any URL. Get the full token set — colors, typography, spacing, shadows, radii — cleaned, named, and exported.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
