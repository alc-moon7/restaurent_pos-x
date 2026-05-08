import http from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import ip from "ip";
import { setIo } from "./src/lib/socket-server";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const server = http.createServer((req, res) => handle(req, res));

  const io = new SocketIOServer(server, {
    cors: { origin: "*" },
  });

  // Namespace: Kitchen (admin/kitchen displays)
  const kitchen = io.of("/kitchen");
  kitchen.on("connection", (socket) => {
    socket.emit("connected", { namespace: "/kitchen" });
  });

  // Namespace: Customer (joined by table room)
  const customer = io.of("/customer");
  customer.on("connection", (socket) => {
    const tableIdRaw = socket.handshake.query.tableId;
    const tableId =
      typeof tableIdRaw === "string" && tableIdRaw.trim() ? tableIdRaw.trim() : null;

    if (tableId) {
      socket.join(tableId);
      socket.join(`table:${tableId}`);
    }

    socket.on("join_table", (payload: { tableId: string }) => {
      if (!payload?.tableId) return;
      socket.join(payload.tableId);
      socket.join(`table:${payload.tableId}`);
    });

    socket.emit("connected", { namespace: "/customer", tableId });
  });

  setIo(io);

  server.listen(port, "0.0.0.0", () => {
    const localIp = ip.address();
    console.log(`Server running at http://${localIp}:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
