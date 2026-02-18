export const MEMORY_EXTRACTION_PROMPT = `You are analyzing a completed phone call to extract useful information that should be remembered for future calls.

USER PROFILE:
{{USER_PROFILE}}

EXISTING MEMORIES:
{{USER_MEMORIES}}

CALL CONTEXT:
- Business: {{BUSINESS_NAME}}
- Purpose: {{CALL_PURPOSE}}
- Transcript summary: {{TRANSCRIPT_SUMMARY}}

Extract genuinely useful facts — things that would save time on future calls. Good examples:
- "Dr. Smith's office hours are Mon-Fri 8am-5pm"
- "User's preferred pharmacy is Walgreens on Main St"
- "Toyota dealer requires appointment for oil changes"
- "User's friend Zain's phone number is +1234567890"
- "User studies Latin at the university"

Also extract facts about the person who was called if meaningful — their name, role, phone number, and any personal details shared during the conversation that would help the user remember them.

Skip trivial details like "the receptionist was friendly."

Respond with JSON:
{
  "memories": [
    {"key": "label", "value": "detail", "category": "preference|fact|medical|financial|contact|general"}
  ],
  "contact_update": {
    "name": "business or person name",
    "phone_number": "+1XXXXXXXXXX",
    "company": "company name if applicable",
    "category": "business|medical|personal|government|other",
    "notes": "any relevant notes"
  }
}

If nothing worth remembering, return: {"memories": [], "contact_update": null}`;
