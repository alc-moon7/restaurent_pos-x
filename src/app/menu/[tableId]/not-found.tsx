export default function TableMenuNotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-3xl border border-secondary/10 bg-white shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-warning/15 border border-warning/25 flex items-center justify-center text-warning">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 9V13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M12 17H12.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-lg font-black tracking-tight">
              This table&apos;s menu is not available right now
            </div>
            <div className="mt-2 text-sm text-secondary/70">
              Please ask staff for assistance.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

