import '@/app/globals.css';

export const metadata = {
  title: '\ud53c\uc790\uc624\ube0c\ub808\uc804\ub4dc \uad00\ub9ac\uc790',
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
