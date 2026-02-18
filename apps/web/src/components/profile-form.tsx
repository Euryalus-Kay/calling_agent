'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Phone, CheckCircle, XCircle, Loader2 } from 'lucide-react';
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
  const [verifiedCallerId, setVerifiedCallerId] = useState<string | null>(
    profile.verified_caller_id ?? null
  );
  const [verifyPhone, setVerifyPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [confirming, setConfirming] = useState(false);
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

  async function startVerification() {
    if (!verifyPhone) {
      toast.error('Enter a phone number to verify');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/caller-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: verifyPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        setVerifyCode(data.validationCode);
        toast.success(`Twilio is calling you now. Your code is: ${data.validationCode}`);
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch {
      toast.error('Failed to start verification');
    } finally {
      setVerifying(false);
    }
  }

  async function confirmVerification() {
    setConfirming(true);
    try {
      const res = await fetch('/api/caller-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: verifyPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        setVerifiedCallerId(verifyPhone);
        setVerifyCode(null);
        setVerifyPhone('');
        toast.success('Phone number verified! Calls will now show your number.');
      } else {
        toast.error(data.error || 'Confirmation failed');
      }
    } catch {
      toast.error('Failed to confirm verification');
    } finally {
      setConfirming(false);
    }
  }

  async function removeCallerId() {
    try {
      const res = await fetch('/api/caller-id', { method: 'DELETE' });
      if (res.ok) {
        setVerifiedCallerId(null);
        toast.success('Caller ID removed');
      }
    } catch {
      toast.error('Failed to remove caller ID');
    }
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

      {/* Caller ID Section */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E3E2DE',
        borderRadius: 8,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        marginTop: 24,
      }}>
        <div style={{ padding: '20px 20px 8px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#37352F', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone style={{ height: 18, width: 18, color: '#787774' }} />
            Caller ID
          </h2>
          <p style={{ fontSize: 13, color: '#787774', margin: '6px 0 0' }}>
            Verify your phone number so outbound calls show your number instead of ours
          </p>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {verifiedCallerId ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 6,
              backgroundColor: 'rgba(77,171,154,0.06)',
              border: '1px solid rgba(77,171,154,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle style={{ height: 16, width: 16, color: '#4DAB9A' }} />
                <span style={{ fontSize: 14, color: '#37352F', fontWeight: 500 }}>{verifiedCallerId}</span>
                <span style={{ fontSize: 12, color: '#4DAB9A' }}>Verified</span>
              </div>
              <button
                onClick={removeCallerId}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  fontSize: 12,
                  color: '#EB5757',
                  background: 'transparent',
                  border: '1px solid rgba(235,87,87,0.3)',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                <XCircle style={{ height: 12, width: 12 }} />
                Remove
              </button>
            </div>
          ) : verifyCode ? (
            <div style={{
              padding: '14px',
              borderRadius: 6,
              backgroundColor: 'rgba(35,131,226,0.06)',
              border: '1px solid rgba(35,131,226,0.2)',
            }}>
              <p style={{ fontSize: 14, color: '#37352F', margin: '0 0 8px', fontWeight: 500 }}>
                Twilio is calling {verifyPhone} now
              </p>
              <p style={{ fontSize: 13, color: '#787774', margin: '0 0 12px' }}>
                When you answer, enter this code: <strong style={{ color: '#2383E2', fontSize: 18, letterSpacing: 2 }}>{verifyCode}</strong>
              </p>
              <button
                onClick={confirmVerification}
                disabled={confirming}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#FFFFFF',
                  background: '#4DAB9A',
                  border: 'none',
                  borderRadius: 8,
                  cursor: confirming ? 'not-allowed' : 'pointer',
                  opacity: confirming ? 0.6 : 1,
                }}
              >
                {confirming && <Loader2 style={{ height: 14, width: 14, animation: 'spin 1s linear infinite' }} />}
                {confirming ? 'Checking...' : "I've entered the code"}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="+1 (555) 123-4567"
                type="tel"
                value={verifyPhone}
                onChange={(e) => setVerifyPhone(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              <button
                onClick={startVerification}
                disabled={verifying}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#FFFFFF',
                  background: '#2383E2',
                  border: 'none',
                  borderRadius: 8,
                  cursor: verifying ? 'not-allowed' : 'pointer',
                  opacity: verifying ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {verifying && <Loader2 style={{ height: 14, width: 14, animation: 'spin 1s linear infinite' }} />}
                {verifying ? 'Calling...' : 'Verify Number'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
