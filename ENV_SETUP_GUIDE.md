# Environment Variables Setup Guide

Your `.env` file is missing several required variables. Here's what you need to add:

## Current .env Content (from terminal):
```
OPENROUTER_API_KEY=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

```

## Complete .env Template:

Copy this content to your `.env` file:

```bash
# ============================================
# DATABASE CONFIGURATION (REQUIRED)
# ============================================
# Get this from Supabase Dashboard -> Settings -> Database -> Connection String (Session mode)
# Example: postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres
DATABASE_URL=postgresql://postgres:Noy275jrd@db.your-project-ref.supabase.co:5432/postgres

# ============================================
# AI API KEY (ALREADY SET)
# ============================================
OPENROUTER_API_KEY=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

# ============================================
# OAUTH (OPTIONAL - Can leave empty for local dev)
# ============================================
OAUTH_SERVER_URL=
VITE_APP_ID=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=

# ============================================
# SECURITY
# ============================================
# Generate a random string for JWT_SECRET (e.g., run: openssl rand -base64 32)
JWT_SECRET=change-this-to-random-secret-key-for-production

# ============================================
# VITE APP CONFIGURATION (REQUIRED)
# ============================================
VITE_APP_TITLE=AdaptoBook
VITE_APP_LOGO=/logo.png
VITE_ENABLE_AUTH=false

# ============================================
# ANALYTICS (OPTIONAL - Leave empty to disable)
# ============================================
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=

# ============================================
# FORGE API (OPTIONAL)
# ============================================
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
```

## Quick Fix Command:

Run this command to update your `.env` file with the missing variables (you'll still need to add your Supabase DATABASE_URL):

```bash
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://postgres:your-Noy275jrd@db.your-project-ref.supabase.co:5432/postgres

# OpenRouter API Key
OPENROUTER_API_KEY=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

# OAuth (optional for local dev)
OAUTH_SERVER_URL=
VITE_APP_ID=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=

# JWT Secret
JWT_SECRET=dev-secret-change-in-production

# Vite App Config
VITE_APP_TITLE=AdaptoBook
VITE_APP_LOGO=/logo.png
VITE_ENABLE_AUTH=false

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=

# Forge API (optional)
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
EOF
```

## Next Steps:

1. **Update your `.env` file** with the template above
2. **Add your Supabase DATABASE_URL**:
   - Go to https://supabase.com/dashboard
   - Open your project (or create one)
   - Go to Settings → Database
   - Copy the "Connection string" (Session mode)
   - Replace `your-password` with your actual database password
3. **Run the migration**: `npx pnpm@latest db:push`
4. **Start the server**: `npx pnpm@latest dev`

## What Each Variable Does:

| Variable | Required? | Purpose |
|----------|-----------|---------|
| `DATABASE_URL` | ✅ YES | PostgreSQL connection to Supabase |
| `OPENROUTER_API_KEY` | ✅ YES | AI text generation features |
| `VITE_APP_TITLE` | ✅ YES | App name in browser tab |
| `VITE_APP_LOGO` | ✅ YES | App favicon/logo |
| `VITE_ENABLE_AUTH` | ✅ YES | Enable/disable authentication |
| `JWT_SECRET` | ⚠️ Recommended | Session security |
| `OAUTH_SERVER_URL` | ❌ Optional | OAuth authentication |
| `VITE_ANALYTICS_*` | ❌ Optional | Umami analytics tracking |
| `FORGE_API_*` | ❌ Optional | Map/Forge features |

## Troubleshooting:

### Error: "EHOSTUNREACH" when running db:push
- Your `DATABASE_URL` is missing or incorrect
- Make sure you've replaced `your-password` with your actual Supabase password

### Warnings about %VITE_APP_LOGO% etc
- These variables are missing from your `.env`
- Add them using the template above

### OAuth errors (can be ignored for local dev)
- Set `OAUTH_SERVER_URL=` to empty if not using OAuth
- Set `VITE_ENABLE_AUTH=false` to disable authentication

