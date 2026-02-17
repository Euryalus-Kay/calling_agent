'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { UserProfile } from '@/types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 12px',
  fontSize: 14,
  color: '#37352F',
  background: '#FFFFFF',
  border: '1px solid #E3E2DE',
  borderRadius: 8,
  outline: 'none',
  boxSizing: 'border-box',
};

function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#2383E2';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35,131,226,0.15)';
}

function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#E3E2DE';
  e.currentTarget.style.boxShadow = 'none';
}

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    phone_number: profile.phone_number || '',
    address: profile.address || '',
    city: profile.city || '',
    state: profile.state || '',
    zip_code: profile.zip_code || '',
    insurance_provider: profile.insurance_provider || '',
    insurance_member_id: profile.insurance_member_id || '',
  });
  const [saving, setSaving] = useState(false);
  const supabase = createSupabaseBrowserClient();

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update(formData)
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to save profile');
    } else {
      toast.success('Profile updated');
    }
    setSaving(false);
  }

  return (
    <div style={{ maxWidth: 672, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#37352F', marginBottom: 24 }}>Profile</h1>

      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E3E2DE',
        borderRadius: 8,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      }}>
        <div style={{ padding: '20px 20px 8px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#37352F', margin: 0 }}>Personal Information</h2>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            placeholder="Full name"
            value={formData.full_name}
            onChange={(e) => updateField('full_name', e.target.value)}
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <input
            placeholder="Phone number"
            type="tel"
            value={formData.phone_number}
            onChange={(e) => updateField('phone_number', e.target.value)}
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />

          <div style={{ height: 1, background: '#E3E2DE' }} />

          <input
            placeholder="Street address"
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <input
              placeholder="City"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <input
              placeholder="State"
              value={formData.state}
              onChange={(e) => updateField('state', e.target.value)}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <input
              placeholder="ZIP"
              value={formData.zip_code}
              onChange={(e) => updateField('zip_code', e.target.value)}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div style={{ height: 1, background: '#E3E2DE' }} />

          <input
            placeholder="Insurance provider"
            value={formData.insurance_provider}
            onChange={(e) => updateField('insurance_provider', e.target.value)}
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <input
            placeholder="Insurance member ID"
            value={formData.insurance_member_id}
            onChange={(e) =>
              updateField('insurance_member_id', e.target.value)
            }
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 14px',
              fontSize: 14,
              fontWeight: 500,
              color: '#FFFFFF',
              background: '#2383E2',
              border: 'none',
              borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
