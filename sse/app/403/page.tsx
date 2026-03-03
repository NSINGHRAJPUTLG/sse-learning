export default function ForbiddenPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-slate-100 p-8">
      <div className="bg-white border rounded-xl p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2">403 Forbidden</h1>
        <p className="text-slate-600">You do not have permission to access this page.</p>
      </div>
    </main>
  );
}
