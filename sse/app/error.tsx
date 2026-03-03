'use client';

export default function GlobalError({ error }: { error: Error }) {
  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 p-8">
      <div className="bg-white border rounded-lg p-6 max-w-lg">
        <h2 className="font-semibold text-lg">Something went wrong</h2>
        <p className="text-slate-600 text-sm mt-2">{error.message}</p>
      </div>
    </main>
  );
}
