# TrackWise - Expense Analytics Platform

## Setup Instructions (Windows)

### Step 1 - Install Node.js
Download from: https://nodejs.org (LTS version)

### Step 2 - Setup Database
Open PowerShell in the trackwise folder and run:

  Get-Content database\schema.sql | & "C:\Program Files\MySQL\MySQL Server 9.5\bin\mysql.exe" -u root -p

### Step 3 - Configure Environment
Copy .env.example to .env:

  Copy-Item .env.example .env

Then open .env in Notepad and set your MySQL password.

### Step 4 - Install Dependencies
  npm install

### Step 5 - Start the Server
  npm start

### Step 6 - Open in Browser
  http://localhost:3000

## Demo Login
  Email:    arjun@example.com
  Password: password123

## Features
- User login and registration
- Add, edit, delete expenses
- Monthly spending trend chart
- Category breakdown chart
- Budget alert system
- Smart spending insights
- Daily heatmap
- CSV export
