# API Documentation

## Authentication

All API endpoints (except login) require a JWT token in the `Authorization` header.

```
Authorization: Bearer <token>
```

## Endpoints

### 1. Login
- **URL**: `/api/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5c...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
  ```

### 2. Get Products
- **URL**: `/api/products`
- **Method**: `GET`
- **Query Params**:
  - `page` (default: 1)
  - `limit` (default: 10)
  - `search` (optional)
  - `sort` (optional, e.g., 'price')
  - `order` (optional, 'asc' or 'desc')
- **Response**: `200 OK`
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "Product A",
        "category": "Electronics",
        "price": 99.99,
        "stock": 50,
        "status": "active"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10
  }
  ```

### 3. Create Product (Admin Only)
- **URL**: `/api/products`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "name": "New Product",
    "category": "Gadgets",
    "price": 49.99,
    "stock": 100,
    "status": "active"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "id": 2
  }
  ```

### 4. Update Product (Admin Only)
- **URL**: `/api/products/:id`
- **Method**: `PUT`
- **Body**: Same as Create Product
- **Response**: `200 OK`
  ```json
  {
    "success": true
  }
  ```

### 5. Delete Product (Admin Only)
- **URL**: `/api/products/:id`
- **Method**: `DELETE`
- **Response**: `200 OK`
  ```json
  {
    "success": true
  }
  ```

### 6. Export Products
- **URL**: `/api/products/export`
- **Method**: `GET`
- **Response**: `200 OK` (CSV File Download)

### 7. Import Products (Admin Only)
- **URL**: `/api/products/import`
- **Method**: `POST`
- **Body**: `multipart/form-data` with a `file` field containing the CSV.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "count": 50
  }
  ```

### 8. Get Audit Logs (Admin Only)
- **URL**: `/api/logs`
- **Method**: `GET`
- **Response**: `200 OK`
  ```json
  [
    {
      "id": 1,
      "user_id": 1,
      "username": "admin",
      "action": "CREATE",
      "entity": "products",
      "entity_id": 2,
      "details": "{\"name\":\"New Product\"...}",
      "created_at": "2023-10-27T10:00:00Z"
    }
  ]
  ```

## WebSocket Notifications

Connect to the WebSocket server to receive real-time notifications.

- **URL**: `ws://<host>/?token=<jwt_token>`
- **Events**: The server pushes JSON messages for significant events (e.g., audit logs).
- **Example Message**:
  ```json
  {
    "type": "AUDIT_LOG",
    "message": "User 1 performed CREATE on products 2",
    "action": "CREATE",
    "entity": "products",
    "entityId": 2,
    "details": "{\"name\":\"New Product\"...}"
  }
  ```
