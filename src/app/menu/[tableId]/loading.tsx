export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-background px-4 py-5">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="h-20 animate-pulse rounded-3xl bg-white/70" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 w-24 animate-pulse rounded-full bg-white/70" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-3xl bg-white/70" />
          ))}
        </div>
      </div>
    </div>
  );
}
