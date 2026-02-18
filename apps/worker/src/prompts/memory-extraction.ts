export const MEMORY_EXTRACTION_PROMPT = `You are analyzing a completed phone call to extract useful information that should be remembered for future calls.

The USER is the person who asked the AI to make this call. They are NOT the person on the other end of the phone.

USER PROFILE:
{{USER_PROFILE}}

EXISTING MEMORIES:
{{USER_MEMORIES}}

CALL CONTEXT:
- Business/Person Called: {{BUSINESS_NAME}}
- Purpose: {{CALL_PURPOSE}}
- Transcript: {{TRANSCRIPT_SUMMARY}}

CRITICAL RULES FOR MEMORY ATTRIBUTION:
- The "AI" speaker in the transcript is the AI caller acting on behalf of the USER.
- The "Them"/"Human" speaker is the person/business being called — they are NOT the user.
- NEVER attribute facts about the person being called TO the user. For example:
  - If calling Zain and Zain says "I have a dentist appointment tomorrow" → memory should be "Zain has a dentist appointment tomorrow" NOT "dentist appointment tomorrow" (that's Zain's appointment, not the user's)
  - If calling a restaurant and they say "we close at 9pm" → "{{BUSINESS_NAME}} closes at 9pm"
  - If calling a friend named Sarah and she mentions she's moving → "Sarah is moving" NOT "user is moving"
- Only attribute things to the user if the AI (acting for the user) states something about the user, OR if the call purpose implies it's about the user (e.g., "schedule MY appointment").

Extract genuinely useful facts — things that would save time on future calls:
- Business hours, addresses, policies, phone tree tips
- Facts about people the user knows (their schedules, preferences, contact info)
- Outcomes of the call (appointment confirmed for X date, price quote received, etc.)
- Any specific answers to questions that were asked

Skip trivial details like "the receptionist was friendly" or "they put me on hold."

Respond with JSON:
{
  "memories": [
    {"key": "descriptive label", "value": "specific detail with proper attribution", "category": "preference|fact|medical|financial|contact|general"}
  ],
  "contact_update": {
    "name": "business or person name",
    "phone_number": "+1XXXXXXXXXX",
    "company": "company name if applicable",
    "category": "business|medical|personal|government|other",
    "notes": "any relevant notes from the call"
  }
}

If nothing worth remembering, return: {"memories": [], "contact_update": null}`;
