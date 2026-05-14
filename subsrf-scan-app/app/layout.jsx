import './globals.css';
import { UserProvider } from '../context/UserContext';

export const metadata = {
  title: 'Subsrf Scan — Read any interface deeper than any human can',
  description: 'Point at any URL. Get the full token set, health score, component fingerprint, and AI critique — in seconds.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
