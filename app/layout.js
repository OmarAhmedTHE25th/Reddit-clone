export const metadata = {
  title: 'Reddit Clone',
  description: 'Reddit Clone',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
