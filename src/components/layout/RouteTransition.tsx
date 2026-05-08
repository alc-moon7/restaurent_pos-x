"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export default function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="route-enter">
      {children}
    </div>
  );
}

