import { Express, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import fs from "fs";
import { broadcastNotification } from "../../server";

const JWT_SECRET = "supersecretkey";

// Middleware
const authenticate = (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const requireAdmin = (req: Request, res: Response, next: Function) => {
  if ((req as any).user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

const logAction = (userId: number, action: string, entity: string, entityId: number, details: string) => {
  db.prepare("INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)").run(
    userId, action, entity, entityId, details
  );
  
  // Broadcast notification to admins
  broadcastNotification({
    type: "AUDIT_LOG",
    message: `User ${userId} performed ${action} on ${entity} ${entityId}`,
    action,
    entity,
    entityId,
    details
  }, ["admin"]);
};

export function setupRoutes(app: Express, upload: any) {
  // Auth
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });

  // Products CRUD
  app.get("/api/products", authenticate, (req, res) => {
    const { search, sort, order, page = 1, limit = 10 } = req.query;
    let query = "SELECT * FROM products WHERE 1=1";
    const params: any[] = [];

    if (search) {
      query += " AND name LIKE ?";
      params.push(`%${search}%`);
    }

    if (sort && order) {
      query += ` ORDER BY ${sort} ${order === "desc" ? "DESC" : "ASC"}`;
    } else {
      query += " ORDER BY id DESC";
    }

    const offset = (Number(page) - 1) * Number(limit);
    const total = db.prepare(`SELECT COUNT(*) as count FROM (${query})`).get(...params) as any;
    
    query += " LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);

    const products = db.prepare(query).all(...params);
    res.json({ data: products, total: total.count, page: Number(page), limit: Number(limit) });
  });

  app.post("/api/products", authenticate, requireAdmin, (req, res) => {
    const { name, category, price, stock, status } = req.body;
    const result = db.prepare("INSERT INTO products (name, category, price, stock, status) VALUES (?, ?, ?, ?, ?)").run(
      name, category, price, stock, status
    );
    logAction((req as any).user.id, "CREATE", "products", result.lastInsertRowid as number, JSON.stringify(req.body));
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/products/:id", authenticate, requireAdmin, (req, res) => {
    const { name, category, price, stock, status } = req.body;
    const id = req.params.id;
    db.prepare("UPDATE products SET name = ?, category = ?, price = ?, stock = ?, status = ? WHERE id = ?").run(
      name, category, price, stock, status, id
    );
    logAction((req as any).user.id, "UPDATE", "products", Number(id), JSON.stringify(req.body));
    res.json({ success: true });
  });

  app.delete("/api/products/:id", authenticate, requireAdmin, (req, res) => {
    const id = req.params.id;
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    logAction((req as any).user.id, "DELETE", "products", Number(id), "");
    res.json({ success: true });
  });

  // CSV Import/Export
  app.get("/api/products/export", authenticate, (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    const csv = stringify(products, { header: true });
    res.header("Content-Type", "text/csv");
    res.attachment("products.csv");
    res.send(csv);
  });

  app.post("/api/products/import", authenticate, requireAdmin, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    const fileContent = fs.readFileSync(req.file.path, "utf-8");
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    
    const insert = db.prepare("INSERT INTO products (name, category, price, stock, status) VALUES (?, ?, ?, ?, ?)");
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insert.run(item.name, item.category, item.price, item.stock, item.status);
      }
    });

    insertMany(records);
    fs.unlinkSync(req.file.path);
    
    logAction((req as any).user.id, "IMPORT", "products", 0, `Imported ${records.length} records`);
    res.json({ success: true, count: records.length });
  });

  // Audit Logs
  app.get("/api/logs", authenticate, requireAdmin, (req, res) => {
    const logs = db.prepare(`
      SELECT audit_logs.*, users.username 
      FROM audit_logs 
      LEFT JOIN users ON audit_logs.user_id = users.id 
      ORDER BY audit_logs.created_at DESC 
      LIMIT 100
    `).all();
    res.json(logs);
  });
}
