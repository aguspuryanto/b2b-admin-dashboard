import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { db } from "./src/server/db";
import { setupRoutes } from "./src/server/routes";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";

const upload = multer({ dest: "uploads/" });
const JWT_SECRET = "supersecretkey";

// WebSocket clients map
export const clients = new Map<number, WebSocket>();

export function broadcastNotification(message: any, targetRoles?: string[]) {
  clients.forEach((ws, userId) => {
    if (ws.readyState === WebSocket.OPEN) {
      if (!targetRoles) {
        ws.send(JSON.stringify(message));
      } else {
        const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as any;
        if (user && targetRoles.includes(user.role)) {
          ws.send(JSON.stringify(message));
        }
      }
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  setupRoutes(app, upload);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // WebSocket Server
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    // Extract token from URL query params for WebSocket auth
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(1008, "Token required");
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      clients.set(decoded.id, ws);

      ws.on("close", () => {
        clients.delete(decoded.id);
      });
    } catch (err) {
      ws.close(1008, "Invalid token");
    }
  });
}

startServer();

