-- TrackWise Database Schema
-- Run from PowerShell:
-- Get-Content database\schema.sql | & "C:\Program Files\MySQL\MySQL Server 9.5\bin\mysql.exe" -u root -p

CREATE DATABASE IF NOT EXISTS trackwise;
USE trackwise;

CREATE TABLE IF NOT EXISTS users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  category_id   INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS expenses (
  expense_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  category_id  INT NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,
  description  VARCHAR(255) DEFAULT '',
  expense_date DATE NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(user_id)          ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
  INDEX idx_user_date (user_id, expense_date),
  INDEX idx_category  (category_id)
);

CREATE TABLE IF NOT EXISTS budgets (
  budget_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  monthly_limit DECIMAL(10,2) NOT NULL,
  budget_month  TINYINT NOT NULL,
  budget_year   YEAR NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_month_year (user_id, budget_month, budget_year),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

INSERT IGNORE INTO categories (category_name) VALUES
  ('Food'), ('Transport'), ('Shopping'), ('Bills'), ('Education'), ('Health');

INSERT IGNORE INTO users (name, email, password_hash) VALUES
  ('Arjun Kumar', 'arjun@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

INSERT IGNORE INTO budgets (user_id, monthly_limit, budget_month, budget_year)
  VALUES (1, 10000.00, 3, 2026);

INSERT INTO expenses (user_id, category_id, amount, description, expense_date) VALUES
  (1,1,320,'Zomato Order','2026-03-01'),
  (1,2,180,'Ola Cab','2026-03-02'),
  (1,3,1200,'Amazon Shoes','2026-03-03'),
  (1,4,850,'Electricity Bill','2026-03-04'),
  (1,1,450,'Swiggy Instamart','2026-03-05'),
  (1,2,250,'BMTC Bus Pass','2026-03-07'),
  (1,3,1800,'Myntra Jacket','2026-03-08'),
  (1,5,499,'Udemy Course','2026-03-10'),
  (1,6,320,'Medical Pharmacy','2026-03-11'),
  (1,1,680,'Grocery DMart','2026-03-12'),
  (1,3,400,'Meesho Delivery','2026-03-13'),
  (1,4,799,'Internet Bill','2026-03-14'),
  (1,1,950,'Restaurant Dinner','2026-03-15'),
  (1,2,120,'Auto Fare','2026-03-17'),
  (1,3,1200,'Flipkart Headphones','2026-03-18'),
  (1,1,540,'Grocery','2026-02-05'),
  (1,2,320,'Cab Booking','2026-02-10'),
  (1,3,2100,'Clothing Ajio','2026-02-15'),
  (1,4,720,'Electricity','2026-02-20'),
  (1,6,480,'Gym Membership','2026-02-22'),
  (1,1,620,'Swiggy Orders','2026-02-25'),
  (1,1,480,'Grocery','2026-01-08'),
  (1,2,200,'Metro Card','2026-01-12'),
  (1,3,1500,'Amazon Order','2026-01-20'),
  (1,5,999,'Course Fee','2026-01-25'),
  (1,4,350,'Water Bill','2026-01-28'),
  (1,1,780,'Restaurant','2026-01-30');
