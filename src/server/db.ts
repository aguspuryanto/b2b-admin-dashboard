import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

export const db = new Database("app.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT UNIQUE,
    name TEXT,
    category TEXT,
    price REAL,
    stock INTEGER,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    entity TEXT,
    entity_id INTEGER,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    starting_cash REAL,
    ending_cash REAL,
    status TEXT DEFAULT 'open',
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id INTEGER,
    total_amount REAL,
    payment_method TEXT,
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(shift_id) REFERENCES shifts(id)
  );

  CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

// Insert default admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hash, "admin");
}

const staffExists = db.prepare("SELECT * FROM users WHERE username = 'staff'").get();
if (!staffExists) {
  const hash = bcrypt.hashSync("staff123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("staff", hash, "staff");
}

// Add barcode column to existing products table if it doesn't exist
try {
  db.exec("ALTER TABLE products ADD COLUMN barcode TEXT UNIQUE;");
} catch (e) {
  // Column might already exist
}

// Insert dummy products if table is empty
const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as any;
if (productCount.count === 0) {
  const dummyProducts = [
    { barcode: "899999900001", name: "Indomie Goreng", category: "Makanan", price: 3500, stock: 150, status: "active" },
    { barcode: "899999900002", name: "Aqua Botol 600ml", category: "Minuman", price: 4000, stock: 200, status: "active" },
    { barcode: "899999900003", name: "Teh Pucuk Harum", category: "Minuman", price: 5000, stock: 120, status: "active" },
    { barcode: "899999900004", name: "Chitato Sapi Panggang", category: "Snack", price: 12000, stock: 80, status: "active" },
    { barcode: "899999900005", name: "Silverqueen 65g", category: "Snack", price: 18000, stock: 50, status: "active" },
    { barcode: "899999900006", name: "Pepsodent 190g", category: "Perawatan Diri", price: 15000, stock: 60, status: "active" },
    { barcode: "899999900007", name: "Lifebuoy Sabun Mandi", category: "Perawatan Diri", price: 4500, stock: 100, status: "active" },
    { barcode: "899999900008", name: "Sari Roti Tawar", category: "Makanan", price: 17000, stock: 30, status: "active" },
    { barcode: "899999900009", name: "Kopi Kenangan Mantan", category: "Minuman", price: 10000, stock: 45, status: "active" },
    { barcode: "899999900010", name: "Bimoli Minyak Goreng 2L", category: "Sembako", price: 38000, stock: 40, status: "active" },
  ];

  const insertProduct = db.prepare("INSERT INTO products (barcode, name, category, price, stock, status) VALUES (?, ?, ?, ?, ?, ?)");
  
  db.transaction((products) => {
    for (const p of products) {
      insertProduct.run(p.barcode, p.name, p.category, p.price, p.stock, p.status);
    }
  })(dummyProducts);
}

