import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-3xl border border-secondary/10 bg-white/70 shadow-sm p-7">
        <div className="flex items-start gap-5">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-primary">
              <path
                d="M12 9V13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M12 17H12.01"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <path
                d="M10.2 4.8L3.6 18.6C3.2 19.4 3.8 20.4 4.7 20.4H19.3C20.2 20.4 20.8 19.4 20.4 18.6L13.8 4.8C13.4 4 12.6 4 12.2 4C11.4 4 10.6 4 10.2 4.8Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xl font-black tracking-tight text-foreground">Page not found</div>
            <div className="mt-2 text-sm text-secondary/70">
              The page you’re looking for doesn’t exist or may have been moved.
            </div>

            <div className="mt-6">
              <Link href="/dashboard" aria-label="Back to dashboard">
                <Button variant="primary" size="lg" type="button">
                  Back to dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

