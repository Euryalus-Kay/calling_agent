import { NextResponse } from 'next/server';

// Fallback status webhook for Twilio call status updates.
// The primary status callback goes to the worker server at /status-callback.
// This endpoint can be used for additional tracking or dual processing.

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid');
    const callStatus = formData.get('CallStatus');

    if (!callSid || !callStatus) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[Twilio Status Webhook] ${callSid}: ${callStatus}`);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Twilio Webhook] Error processing status callback:', err);
    // Always return 200 to Twilio to prevent retries
    return NextResponse.json({ received: true });
  }
}
