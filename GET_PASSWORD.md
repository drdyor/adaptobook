# Get Your Database Password

## Steps:

1. In Supabase Dashboard, go to **Settings** → **Database**
2. Click **Database** under Settings
3. Look for **"Database password"** section
4. If you see a password field, you can:
   - Click **"Reset database password"** button
   - Copy the new password (save it somewhere safe!)
5. If you don't see it, click **"Reset database password"** to create one

## Once you have the password:

Your connection string will be:
```
postgresql://postgres:[YOUR-PASSWORD]@db.tcieckklivujxqztoxli.supabase.co:5432/postgres
```

Just replace `[YOUR-PASSWORD]` with the actual password.

## Security Note:

You can paste the password here and I'll update your `.env` file. The `.env` file is already in `.gitignore`, so it won't be committed to git.

