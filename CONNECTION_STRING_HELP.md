# Your Supabase Connection String

## Your Project Info:
- **Project URL:** https://tcieckklivujxqztoxli.supabase.co
- **Project Reference:** tcieckklivujxqztoxli

## To Get Your Database Password:

1. In Supabase Dashboard, go to **Settings** → **Database**
2. Look for **Database password** section
3. If you don't see it or forgot it, click **Reset database password**
4. Copy the password (you'll need it for the connection string)

## Connection String Format:

Once you have your password, the connection string will be:

```
postgresql://postgres:[YOUR-PASSWORD]@db.tcieckklivujxqztoxli.supabase.co:5432/postgres
```

**Replace `[YOUR-PASSWORD]` with your actual database password.**

## Alternative: Use Connection Pooling (Recommended)

In Supabase Dashboard → Settings → Database → Connection string:
- Use the **Session mode** connection string
- It might look like:
  ```
  postgresql://postgres.tcieckklivujxqztoxli:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
  ```

## Once You Have It:

Paste the full connection string here and I'll update your `.env` file!

