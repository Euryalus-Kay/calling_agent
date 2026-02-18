import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from './supabase.js';
import { MEMORY_EXTRACTION_PROMPT } from '../prompts/memory-extraction.js';

const anthropic = new Anthropic();

interface MemoryExtractionInput {
  callId: string;
  userId: string;
  businessName: string;
  purpose: string;
  transcript: string;
  userProfile: Record<string, unknown>;
}

interface ExtractedMemory {
  key: string;
  value: string;
  category: string;
}

interface ContactUpdate {
  name: string;
  phone_number: string;
  company: string;
  category: string;
  notes: string;
}

interface ExtractionResult {
  memories: ExtractedMemory[];
  contact_update: ContactUpdate | null;
}

/**
 * Extract memories and contact info from a completed call, then save to database.
 * This runs as fire-and-forget — errors are logged but don't affect call completion.
 */
export async function extractAndSaveMemories({
  callId,
  userId,
  businessName,
  purpose,
  transcript,
  userProfile,
}: MemoryExtractionInput): Promise<void> {
  try {
    console.log(`[Memory] Starting extraction for call ${callId}`);

    // Skip if transcript is too short to be meaningful
    if (!transcript || transcript.length < 50) {
      console.log(`[Memory] Transcript too short for call ${callId}, skipping`);
      return;
    }

    // 1. Fetch existing user memories
    const { data: existingMemories } = await supabaseAdmin
      .from('user_memory')
      .select('key, value')
      .eq('user_id', userId)
      .limit(100);

    // 2. Build the prompt
    const systemPrompt = MEMORY_EXTRACTION_PROMPT
      .replace('{{USER_PROFILE}}', JSON.stringify(userProfile, null, 2))
      .replace(
        '{{USER_MEMORIES}}',
        existingMemories && existingMemories.length > 0
          ? existingMemories.map((m: { key: string; value: string }) => `- ${m.key}: ${m.value}`).join('\n')
          : 'None stored yet.'
      )
      .replace('{{BUSINESS_NAME}}', businessName)
      .replace('{{CALL_PURPOSE}}', purpose)
      .replace('{{TRANSCRIPT_SUMMARY}}', transcript);

    // 3. Call Claude Haiku for extraction
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Extract memories from this call.' }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // 4. Parse response
    let result: ExtractionResult;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log(`[Memory] No JSON found in response for call ${callId}`);
        return;
      }
      result = JSON.parse(jsonMatch[0]);
    } catch {
      console.log(`[Memory] Failed to parse JSON for call ${callId}`);
      return;
    }

    // 5. Save memories (upsert — update if key already exists for this user)
    if (result.memories && result.memories.length > 0) {
      for (const memory of result.memories) {
        const { error: memError } = await supabaseAdmin
          .from('user_memory')
          .upsert(
            {
              user_id: userId,
              key: memory.key,
              value: memory.value,
              category: memory.category || 'general',
              source: `call:${callId}`,
              confidence: 1.0,
              use_count: 0,
            },
            { onConflict: 'user_id,key' }
          );

        if (memError) {
          console.error(`[Memory] Failed to save memory "${memory.key}":`, memError);
        }
      }
      console.log(`[Memory] Saved ${result.memories.length} memories for call ${callId}`);
    }

    // 6. Save/update contact
    let contactSaved: { name: string; phone_number: string; category: string } | null = null;

    if (result.contact_update && result.contact_update.name) {
      const contact = result.contact_update;

      // Check if contact already exists
      const { data: existing } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('user_id', userId)
        .eq('name', contact.name)
        .single();

      if (existing) {
        // Update existing contact
        const { error: updateError } = await supabaseAdmin
          .from('contacts')
          .update({
            phone_number: contact.phone_number || undefined,
            company: contact.company || undefined,
            category: contact.category || 'other',
            notes: contact.notes || undefined,
            last_contacted_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error(`[Memory] Failed to update contact:`, updateError);
        } else {
          contactSaved = {
            name: contact.name,
            phone_number: contact.phone_number,
            category: contact.category,
          };
          console.log(`[Memory] Updated contact "${contact.name}" for call ${callId}`);
        }
      } else {
        // Create new contact
        const { error: insertError } = await supabaseAdmin
          .from('contacts')
          .insert({
            user_id: userId,
            name: contact.name,
            phone_number: contact.phone_number || null,
            company: contact.company || null,
            category: contact.category || 'other',
            notes: contact.notes || null,
            last_contacted_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`[Memory] Failed to create contact:`, insertError);
        } else {
          contactSaved = {
            name: contact.name,
            phone_number: contact.phone_number,
            category: contact.category,
          };
          console.log(`[Memory] Created contact "${contact.name}" for call ${callId}`);
        }
      }
    }

    // 7. Save extraction summary to the call record
    const memoryExtraction = {
      memories: result.memories || [],
      contact_saved: contactSaved,
      extracted_at: new Date().toISOString(),
    };

    await supabaseAdmin
      .from('calls')
      .update({ memory_extraction: memoryExtraction })
      .eq('id', callId);

    console.log(`[Memory] Extraction complete for call ${callId}: ${result.memories?.length || 0} memories, contact: ${contactSaved ? 'yes' : 'no'}`);
  } catch (err) {
    // Fire-and-forget: log errors but don't propagate
    console.error(`[Memory] Extraction failed for call ${callId}:`, err);
  }
}
