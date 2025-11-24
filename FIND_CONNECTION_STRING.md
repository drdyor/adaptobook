# Finding Your Connection String

## You're in the wrong place! 

You're currently in **Database** section. The connection string is in **Settings**.

## Correct Steps:

1. **Click on "Settings"** (gear icon) in the left sidebar (NOT Database)
2. **Click on "Database"** under Settings
3. **Scroll down** to find **"Connection string"** section
4. Look for **"Session mode"** connection string
5. Click **"Copy"** button

## Visual Guide:

```
Left Sidebar:
├── Dashboard
├── Database  ← You are here (wrong place)
├── Settings  ← Click here instead!
│   └── Database  ← Then click this
│       └── Connection string  ← Find this section
└── ...
```

## Alternative: Use Connection Info

If you can't find the connection string, you can also:
1. Go to **Settings** → **Database**
2. Look for **"Connection info"** or **"Connection pooling"**
3. You'll see:
   - Host: `db.tcieckklivujxqztoxli.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: (your database password)

Then the connection string format is:
```
postgresql://postgres:[PASSWORD]@db.tcieckklivujxqztoxli.supabase.co:5432/postgres
```

## Quick Check:

Can you see a **"Settings"** option in the left sidebar? Click that, then **"Database"** under it.

