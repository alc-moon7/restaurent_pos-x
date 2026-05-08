import type { Server as IOServer } from "socket.io";

declare global {
  var __restopos_io: IOServer | undefined;
}

export function setIo(io: IOServer) {
  globalThis.__restopos_io = io;
}

export function getIo(): IOServer | undefined {
  return globalThis.__restopos_io;
}

