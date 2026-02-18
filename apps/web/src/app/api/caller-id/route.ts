import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

/**
 * POST /api/caller-id — Start phone number verification
 * Twilio will call the user's number and read a verification code.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneNumber } = await request.json();
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // First check if this number is already verified with Twilio
    try {
      const existing = await twilioClient.outgoingCallerIds.list({
        phoneNumber,
        limit: 1,
      });

      if (existing.length > 0) {
        // Number is already verified in Twilio — save it directly to profile
        const admin = createSupabaseAdminClient();
        await admin
          .from('profiles')
          .update({ verified_caller_id: phoneNumber } as never)
          .eq('id', user.id);

        return NextResponse.json({
          alreadyVerified: true,
          phoneNumber,
        });
      }
    } catch {
      // If the check fails, just proceed with normal verification
    }

    // Start verification — Twilio will call the number with a code
    const validation = await twilioClient.validationRequests.create({
      phoneNumber,
      friendlyName: `CallingAgent User ${user.id.substring(0, 8)}`,
    });

    return NextResponse.json({
      validationCode: validation.validationCode,
      callSid: validation.callSid,
      phoneNumber: validation.phoneNumber,
    });
  } catch (err) {
    console.error('[CallerID] Verification start failed:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PUT /api/caller-id — Confirm verification and save to profile
 * Called after the user receives and confirms the verification code.
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneNumber } = await request.json();
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Verify the number is now in Twilio's verified caller IDs
    const callerIds = await twilioClient.outgoingCallerIds.list({
      phoneNumber,
      limit: 1,
    });

    if (callerIds.length === 0) {
      return NextResponse.json({
        error: 'Number not yet verified. Please complete the verification call first.',
      }, { status: 400 });
    }

    // Save to user's profile
    const admin = createSupabaseAdminClient();
    const { error: updateError } = await admin
      .from('profiles')
      .update({ verified_caller_id: phoneNumber } as never)
      .eq('id', user.id);

    if (updateError) {
      console.error('[CallerID] Failed to save verified number:', updateError);
      return NextResponse.json({ error: 'Failed to save verified number' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      verified_caller_id: phoneNumber,
    });
  } catch (err) {
    console.error('[CallerID] Verification confirm failed:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/caller-id — Remove verified caller ID
 */
export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from('profiles')
      .update({ verified_caller_id: null } as never)
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to remove caller ID' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[CallerID] Remove failed:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
