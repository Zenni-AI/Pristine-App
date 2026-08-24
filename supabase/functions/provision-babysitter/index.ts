// Provisions a babysitter's temporary login. Requires the service role
// because inviting/creating an auth user is a privileged operation the
// client-side anon key cannot perform. Called from Settings > Babysitter
// Mode right before a babysitter_sessions row is created.
//   supabase functions deploy provision-babysitter
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabaseAdmin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { householdId, displayName, email } = await req.json();
    const supabase = createSupabaseAdminClient();

    // Verify the caller is an admin of this household before doing anything
    // privileged — the anon-key JWT is forwarded automatically by
    // supabase.functions.invoke(), so we can check it here.
    const authHeader = req.headers.get('Authorization');
    const jwt = authHeader?.replace('Bearer ', '');
    if (!jwt) throw new Error('Missing auth token');
    const {
      data: { user },
    } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Invalid session');

    const { data: callerMember } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!callerMember || !['primary_admin', 'second_admin'].includes(callerMember.role)) {
      throw new Error('Only admins can provision a babysitter');
    }

    // A babysitter without an email gets a placeholder auth account tied to
    // a one-time PIN/magic-link the admin shares in person; with an email we
    // send a real invite so they can sign in on their own device.
    const placeholderEmail = email || `sitter+${crypto.randomUUID().slice(0, 8)}@babysitters.motherboard.app`;

    let authUserId: string;
    if (email) {
      const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(placeholderEmail, {
        data: { display_name: displayName, role: 'babysitter' },
      });
      if (inviteError) throw inviteError;
      authUserId = invited.user.id;
    } else {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: placeholderEmail,
        email_confirm: true,
        user_metadata: { display_name: displayName, role: 'babysitter' },
      });
      if (createError) throw createError;
      authUserId = created.user.id;
    }

    const { data: memberRow, error: memberError } = await supabase
      .from('household_members')
      .insert({ household_id: householdId, user_id: authUserId, role: 'babysitter', display_name: displayName, joined_at: new Date().toISOString() })
      .select('id')
      .single();
    if (memberError) throw memberError;

    return new Response(JSON.stringify({ memberId: memberRow.id, authUserId }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});
