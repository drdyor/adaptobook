# Supabase Setup Instructions

## ✅ Conversion Complete!

Your app has been converted from MySQL to PostgreSQL/Supabase. Here's what changed:

### Changes Made:
1. ✅ Schema converted to PostgreSQL (`drizzle/schema.ts`)
2. ✅ Database config updated (`drizzle.config.ts`)
3. ✅ Database connection updated (`server/db.ts`)
4. ✅ Dependencies updated (`package.json` - replaced `mysql2` with `pg`)

## Next Steps:

### Step 1: Get Your Supabase Connection String

1. Go to https://supabase.com/dashboard
2. **Create a new project** (or use existing one) for AdaptoBook
3. Go to **Settings** → **Database**
4. Find **Connection string** section
5. Copy the **Session mode** connection string
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
   - Replace `[YOUR-PASSWORD]` with your database password

### Step 2: Update `.env` File

Open `.env` and replace the `DATABASE_URL` with your actual Supabase connection string:

```bash
DATABASE_URL=postgresql://postgres:your-actual-password@db.your-project-ref.supabase.co:5432/postgres
```

### Step 3: Install Dependencies

```bash
npx pnpm@latest install
```

This will install the `pg` package and `@types/pg`.

### Step 4: Run Database Migration

```bash
npx pnpm@latest db:push
```

This will create all tables in your Supabase database.

### Step 5: Start the Server

```bash
npx pnpm@latest dev
```

## Free Tier Limits

Supabase free tier includes:
- ✅ 500MB database storage
- ✅ 1GB file storage  
- ✅ 50,000 monthly active users
- ✅ Free forever (within limits)

Perfect for your reading app!

## Troubleshooting

If you get connection errors:
1. Make sure your Supabase project is active
2. Check that the password in the connection string is correct
3. Verify the project reference in the URL matches your project

