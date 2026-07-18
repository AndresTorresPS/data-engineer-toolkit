import sqlite3

DB_PATH = "training/sql_sandbox/ecommerce.db"

def bootstrap():
    print(f"Creating training database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Create Tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        email TEXT NOT NULL,
        country TEXT,
        created_at DATETIME
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        order_id INTEGER PRIMARY KEY,
        user_id INTEGER,
        amount REAL,
        status TEXT,
        order_date DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
    """)

    # 2. Insert Mock Data (with intentional data quality anomalies)
    users_data = [
        (1, "alice@example.com", "US", "2026-01-01 10:00:00"),
        (2, "bob@example.com", "CA", "2026-01-02 11:30:00"),
        (3, "charlie@example.com", "UK", "2026-01-03 09:15:00"),
        (4, "alice@example.com", "US", "2026-01-04 14:00:00")  # INTENTIONAL DUPLICATE EMAIL
    ]
    
    orders_data = [
        (101, 1, 150.50, "COMPLETED", "2026-01-05 12:00:00"),
        (102, 2, -20.00, "COMPLETED", "2026-01-06 13:00:00"), # INTENTIONAL NEGATIVE AMOUNT
        (105, 3, 25.00, "PENDING", "2026-02-07 14:22:00"),
        (103, 3, 75.00, "PENDING", "2026-01-07 14:22:00"),
        (104, 1, 300.00, "COMPLETED", "2026-01-08 09:00:00")
    ]

    cursor.executemany("INSERT OR REPLACE INTO users VALUES (?, ?, ?, ?)", users_data)
    cursor.executemany("INSERT OR REPLACE INTO orders VALUES (?, ?, ?, ?, ?)", orders_data)
    
    conn.commit()
    conn.close()
    print("SUCCESS: Training ecommerce.db successfully bootstrapped with mock data")

if __name__ == "__main__":
    bootstrap()