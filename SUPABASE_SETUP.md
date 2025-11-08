# Supabase Email Confirmation Setup

## Issue: Confirmation Email Not Being Sent

The confirmation email issue can be resolved in two ways:

### Option 1: Disable Email Confirmation (Development Only)

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Email**
3. Scroll down to **Confirm email**
4. Toggle OFF "Enable email confirmations"
5. Save changes

Now users will be automatically confirmed and can sign in immediately after registration.

### Option 2: Configure Email Provider (Production)

For production, you should configure a proper email provider:

1. Go to **Authentication** → **Email Templates**
2. Configure SMTP settings or use Supabase's built-in email service
3. Test the confirmation email flow

### Current Behavior

- If email confirmation is **enabled**: Users see a success page and must check their email
- If email confirmation is **disabled**: Users are automatically logged in and redirected to dashboard

### Environment Variables

Make sure these are set in your `.env.local` or Vercel project:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/dashboard
\`\`\`

## Multiple GoTrueClient Warning

Fixed by implementing proper singleton pattern in `lib/supabase/client.ts`. The client is now created once and reused across all components.
