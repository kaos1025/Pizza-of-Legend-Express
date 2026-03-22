'use client';

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <span className="text-6xl block mb-4">😵</span>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm mb-6">Please try again or refresh the page.</p>
          <button
            onClick={reset}
            className="bg-[#D4371C] text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
