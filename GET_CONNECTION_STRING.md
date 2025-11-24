# How to Get Your Supabase Connection String

## Quick Steps:

1. **In Supabase Dashboard:**
   - Make sure you're in your project (or create a new one)
   - Click on **Settings** (gear icon in left sidebar)
   - Click on **Database** in the settings menu

2. **Find Connection String:**
   - Scroll down to **Connection string** section
   - Look for **Session mode** (not Transaction mode)
   - Click the **Copy** button next to it

3. **The connection string looks like:**
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```
   OR
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

4. **Important:** Replace `[YOUR-PASSWORD]` with your actual database password
   - If you don't know it, go to **Settings** → **Database** → **Database password**
   - You can reset it if needed

5. **Copy the full connection string** and paste it into your `.env` file

## Once you have it:
Tell me the connection string (or just paste it) and I'll update your `.env` file!

