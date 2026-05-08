"use client";

import * as React from "react";
import { io as createIo, type Socket } from "socket.io-client";

export function useSocket(
  namespace: "/kitchen" | "/customer",
  query?: Record<string, string>,
  options?: { enabled?: boolean }
) {
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const enabled = options?.enabled ?? true;

  React.useEffect(() => {
    if (!enabled) {
      setSocket(null);
      return;
    }

    const s = createIo(`${window.location.origin}${namespace}`, {
      transports: ["websocket"],
      query,
      autoConnect: true,
      reconnectionAttempts: 2,
    });

    const t = window.setTimeout(() => setSocket(s), 0);
    return () => {
      window.clearTimeout(t);
      s.disconnect();
      window.setTimeout(() => setSocket(null), 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, namespace, JSON.stringify(query ?? {})]);

  return socket;
}
