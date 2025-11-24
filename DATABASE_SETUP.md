# Database Setup Guide

## Quick Setup Options

### Option 1: PlanetScale (Free MySQL - Recommended)

1. Go to https://planetscale.com
2. Sign up (free tier available)
3. Create a new database
4. Copy the connection string (looks like: `mysql://...`)
5. Add to `.env`:
   ```
   DATABASE_URL=mysql://your-connection-string-here
   ```

### Option 2: Railway (Free MySQL)

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Add MySQL"
4. Copy the connection string
5. Add to `.env`

### Option 3: Local MySQL (if you have MySQL installed)

1. Create a database:
   ```bash
   mysql -u root -p
   CREATE DATABASE adaptobook;
   ```

2. Add to `.env`:
   ```
   DATABASE_URL=mysql://root:yourpassword@localhost:3306/adaptobook
   ```

## After Setting Up Database

Run the migration:
```bash
npx pnpm@latest db:push
```

This will create all the tables needed for AdaptoBook.

