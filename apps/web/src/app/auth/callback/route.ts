import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Handles the redirect from a Supabase magic-link email — the flow you get
 * for free with Supabase's default (no custom SMTP) email sender, which
 * only sends a clickable link, not a typed code. Exchanges the `code` query
 * param for a real session (PKCE flow), then sends the user on to
 * `/dashboard`, where DashboardLayout's auth/household routing takes over
 * (it, not `/`, is what actually checks session/household state).
 *
 * This must be registered as a Redirect URL in the Supabase dashboard:
 * Authentication → URL Configuration → Redirect URLs, e.g.
 * http://localhost:3000/auth/callback for local dev.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
    return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=Missing sign-in code`);
}
