'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Settings,
  Mic,
  Bell,
  Phone,
  AlertTriangle,
  Save,
  Loader2,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { UserProfile } from '@/types';
import { VOICE_OPTIONS, TIMEZONE_OPTIONS } from '@/types';

interface SettingsPageProps {
  profile: UserProfile | null;
  userId: string;
  userEmail: string;
}

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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'auto' as const,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  color: '#37352F',
  background: '#FFFFFF',
  border: '1px solid #E3E2DE',
  borderRadius: 8,
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#2383E2';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35,131,226,0.15)';
}

function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#E3E2DE';
  e.currentTarget.style.boxShadow = 'none';
}

type TabValue = 'general' | 'voice' | 'notifications';

export function SettingsPage({ profile, userId, userEmail }: SettingsPageProps) {
  const supabase = createSupabaseBrowserClient();

  const [activeTab, setActiveTab] = useState<TabValue>('general');

  // General
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [city, setCity] = useState(profile?.city || '');
  const [state, setState] = useState(profile?.state || '');
  const [zipCode, setZipCode] = useState(profile?.zip_code || '');
  const [timezone, setTimezone] = useState(profile?.timezone || 'America/New_York');

  // Voice & AI
  const [voicePreference, setVoicePreference] = useState(
    profile?.ai_voice_preference || 'professional'
  );
  const [dailyCallLimit, setDailyCallLimit] = useState(
    profile?.daily_call_limit ?? 20
  );
  const [aiIntroduction, setAiIntroduction] = useState(
    (profile?.preferences as Record<string, string>)?.ai_introduction || ''
  );

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(
    profile?.notification_email ?? true
  );
  const [smsNotifications, setSmsNotifications] = useState(
    profile?.notification_sms ?? false
  );
  const [notifyCallCompleted, setNotifyCallCompleted] = useState(
    (profile?.preferences as Record<string, boolean>)?.notify_call_completed ?? true
  );
  const [notifyTaskDone, setNotifyTaskDone] = useState(
    (profile?.preferences as Record<string, boolean>)?.notify_task_done ?? true
  );
  const [notifyScheduledReminder, setNotifyScheduledReminder] = useState(
    (profile?.preferences as Record<string, boolean>)?.notify_scheduled_reminder ?? true
  );

  // Caller ID verification
  const [verifiedCallerId, setVerifiedCallerId] = useState<string | null>(
    (profile as unknown as Record<string, unknown>)?.verified_caller_id as string | null ?? null
  );
  const [verifyPhone, setVerifyPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: phoneNumber,
          address,
          city,
          state,
          zip_code: zipCode,
          timezone,
          ai_voice_preference: voicePreference,
          daily_call_limit: dailyCallLimit,
          notification_email: emailNotifications,
          notification_sms: smsNotifications,
          preferences: {
            ...(profile?.preferences as Record<string, unknown>),
            ai_introduction: aiIntroduction,
            notify_call_completed: notifyCallCompleted,
            notify_task_done: notifyTaskDone,
            notify_scheduled_reminder: notifyScheduledReminder,
          },
        })
        .eq('id', userId);

      if (error) {
        toast.error('Failed to save settings');
      } else {
        toast.success('Settings saved successfully');
      }
    } catch {
      toast.error('An unexpected error occurred');
    }
    setSaving(false);
  }

  async function startVerification() {
    const numberToVerify = phoneNumber.trim();
    if (!numberToVerify) {
      toast.error('Enter a phone number first');
      return;
    }
    setVerifyPhone(numberToVerify);
    setVerifying(true);
    try {
      const res = await fetch('/api/caller-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: numberToVerify }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.alreadyVerified) {
          // Number was already verified in Twilio — saved directly
          setVerifiedCallerId(numberToVerify);
          setVerifyCode(null);
          toast.success('This number is already verified! Calls will show your number.');
        } else {
          setVerifyCode(data.validationCode);
          toast.success(`Twilio is calling you now. Your code is: ${data.validationCode}`);
        }
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
        toast.error(data.error || 'Confirmation failed — make sure you entered the code on the call first.');
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

  function handleExportData() {
    toast.info('Data export will be sent to your email shortly.');
  }

  const tabs: { value: TabValue; label: string; icon: React.ElementType }[] = [
    { value: 'general', label: 'General', icon: Settings },
    { value: 'voice', label: 'Voice & AI', icon: Mic },
    { value: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div style={{ maxWidth: 896, margin: '0 auto', padding: '16px 24px', paddingBottom: 80 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#37352F', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 14, color: '#787774', marginTop: 4 }}>
          Manage your account preferences and configuration.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 24 }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                fontSize: 13,
                fontWeight: activeTab === tab.value ? 600 : 400,
                color: activeTab === tab.value ? '#37352F' : '#787774',
                background: activeTab === tab.value ? '#EFEFEF' : 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => { if (activeTab !== tab.value) e.currentTarget.style.background = '#EFEFEF'; }}
              onMouseLeave={(e) => { if (activeTab !== tab.value) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon style={{ height: 14, width: 14 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ---- GENERAL TAB ---- */}
      {activeTab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E3E2DE', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '16px 20px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#37352F', margin: 0 }}>Personal Information</h2>
              <p style={{ fontSize: 12, color: '#787774', marginTop: 2 }}>
                Your basic contact details. These are used when the AI makes calls on your behalf.
              </p>
            </div>
            <div style={{ height: 1, background: '#E3E2DE' }} />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#787774', display: 'block', marginBottom: 6 }}>Full Name</label>
                <input
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#787774', display: 'block', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone style={{ height: 13, width: 13, color: '#2383E2' }} />
                    Phone Number
                  </div>
                </label>
                <input
                  placeholder="+1 (555) 123-4567"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />

                {/* Caller ID verification — inline below the phone number */}
                {verifyCode ? (
                  <div style={{
                    padding: '14px',
                    borderRadius: 8,
                    backgroundColor: 'rgba(35,131,226,0.04)',
                    border: '1px solid rgba(35,131,226,0.15)',
                    marginTop: 8,
                  }}>
                    <p style={{ fontSize: 13, color: '#37352F', margin: '0 0 4px', fontWeight: 500 }}>
                      Twilio is calling {verifyPhone} now
                    </p>
                    <p style={{ fontSize: 12, color: '#787774', margin: '0 0 12px', lineHeight: 1.5 }}>
                      When you answer, enter this code:
                    </p>
                    <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 6, color: '#2383E2', marginBottom: 12, fontFamily: 'monospace' }}>
                      {verifyCode}
                    </div>
                    <button
                      onClick={confirmVerification}
                      disabled={confirming}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#FFFFFF',
                        background: '#4DAB9A',
                        border: 'none',
                        borderRadius: 8,
                        cursor: confirming ? 'not-allowed' : 'pointer',
                        opacity: confirming ? 0.6 : 1,
                      }}
                    >
                      {confirming && <Loader2 style={{ height: 14, width: 14 }} className="animate-spin" />}
                      {confirming ? 'Checking...' : "I've entered the code"}
                    </button>
                  </div>
                ) : verifiedCallerId && verifiedCallerId === phoneNumber ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: 'rgba(77,171,154,0.06)',
                    border: '1px solid rgba(77,171,154,0.2)',
                    marginTop: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle style={{ height: 14, width: 14, color: '#4DAB9A' }} />
                      <span style={{ fontSize: 12, color: '#4DAB9A', fontWeight: 500 }}>Verified — calls will show your number</span>
                    </div>
                    <button
                      onClick={removeCallerId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        color: '#EB5757',
                        background: 'transparent',
                        border: '1px solid rgba(235,87,87,0.3)',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <XCircle style={{ height: 10, width: 10 }} />
                      Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    {verifiedCallerId && verifiedCallerId !== phoneNumber ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 12px',
                        borderRadius: 6,
                        backgroundColor: 'rgba(217,115,13,0.06)',
                        border: '1px solid rgba(217,115,13,0.2)',
                        marginBottom: 8,
                      }}>
                        <AlertTriangle style={{ height: 13, width: 13, color: '#D9730D', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#D9730D' }}>
                          Your verified number ({verifiedCallerId}) doesn't match. Verify this number to use it as caller ID.
                        </span>
                      </div>
                    ) : null}
                    <p style={{ fontSize: 12, color: '#787774', margin: '0 0 8px' }}>
                      Verify this number so outgoing calls show your real caller ID.
                    </p>
                    <button
                      onClick={startVerification}
                      disabled={verifying || !phoneNumber.trim()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#FFFFFF',
                        background: '#2383E2',
                        border: 'none',
                        borderRadius: 6,
                        cursor: verifying || !phoneNumber.trim() ? 'not-allowed' : 'pointer',
                        opacity: verifying || !phoneNumber.trim() ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {verifying && <Loader2 style={{ height: 13, width: 13 }} className="animate-spin" />}
                      {verifying ? 'Calling...' : 'Verify Number'}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#787774', display: 'block', marginBottom: 6 }}>Email</label>
                <input
                  value={userEmail}
                  disabled
                  style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                />
                <p style={{ fontSize: 12, color: '#787774', marginTop: 4, opacity: 0.7 }}>
                  Email is managed through your authentication provider.
                </p>
              </div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E3E2DE', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '16px 20px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#37352F', margin: 0 }}>Address</h2>
              <p style={{ fontSize: 12, color: '#787774', marginTop: 2 }}>
                Your address helps the AI find nearby businesses.
              </p>
            </div>
            <div style={{ height: 1, background: '#E3E2DE' }} />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#787774', display: 'block', marginBottom: 6 }}>Street Address</label>
                <input
                  placeholder="123 Main St"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#787774', display: 'block', marginBottom: 6 }}>City</label>
                  <input
                    placeholder="New York"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#787774', display: 'block', marginBottom: 6 }}>State</label>
                  <input
                    placeholder="NY"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#787774', display: 'block', marginBottom: 6 }}>ZIP Code</label>
                  <input
                    placeholder="10001"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E3E2DE', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '16px 20px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#37352F', margin: 0 }}>Timezone</h2>
              <p style={{ fontSize: 12, color: '#787774', marginTop: 2 }}>
                Used for scheduling calls and displaying times correctly.
              </p>
            </div>
            <div style={{ height: 1, background: '#E3E2DE' }} />
            <div style={{ padding: 20 }}>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{ ...selectStyle, maxWidth: 320 }}
                onFocus={handleFocus as any}
                onBlur={handleBlur as any}
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={saving}
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
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? <Loader2 style={{ height: 16, width: 16 }} className="animate-spin" /> : <Save style={{ height: 16, width: 16 }} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ---- VOICE & AI TAB ---- */}
      {activeTab === 'voice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E3E2DE', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '16px 20px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#37352F', margin: 0 }}>AI Voice Preference</h2>
              <p style={{ fontSize: 12, color: '#787774', marginTop: 2 }}>
                Choose how the AI sounds when making calls on your behalf.
              </p>
            </div>
            <div style={{ height: 1, background: '#E3E2DE' }} />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {VOICE_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    borderRadius: 8,
                    border: `1px solid ${voicePreference === option.id ? '#2383E2' : '#E3E2DE'}`,
                    padding: 16,
                    cursor: 'pointer',
                    background: voicePreference === option.id ? 'rgba(35,131,226,0.02)' : '#FFFFFF',
                    transition: 'border-color 150ms ease',
                  }}
                >
                  <input
                    type="radio"
                    name="voice"
                    value={option.id}
                    checked={voicePreference === option.id}
                    onChange={(e) => setVoicePreference(e.target.value)}
                    style={{ marginTop: 2, accentColor: '#2383E2' }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#37352F' }}>{option.label}</div>
                    <div style={{ fontSize: 12, color: '#787774', marginTop: 2 }}>{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E3E2DE', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '16px 20px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#37352F', margin: 0 }}>Daily Call Limit</h2>
              <p style={{ fontSize: 12, color: '#787774', marginTop: 2 }}>
                Maximum number of calls the AI can make per day.
              </p>
            </div>
            <div style={{ height: 1, background: '#E3E2DE' }} />
            <div style={{ padding: 20 }}>
              <input
                type="number"
                min={1}
                max={100}
                value={dailyCallLimit}
                onChange={(e) =>
                  setDailyCallLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))
                }
                style={{ ...inputStyle, maxWidth: 120 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              <p style={{ fontSize: 12, color: '#787774', marginTop: 4, opacity: 0.7 }}>
                Between 1 and 100 calls per day.
              </p>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E3E2DE', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '16px 20px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#37352F', margin: 0 }}>AI Introduction Script</h2>
              <p style={{ fontSize: 12, color: '#787774', marginTop: 2 }}>
                Customize how the AI introduces itself. Leave blank for the default.
              </p>
            </div>
            <div style={{ height: 1, background: '#E3E2DE' }} />
            <div style={{ padding: 20 }}>
              <textarea
                placeholder="Hi, I'm calling on behalf of [your name]. I'd like to..."
                value={aiIntroduction}
                onChange={(e) => setAiIntroduction(e.target.value)}
                rows={4}
                style={textareaStyle}
                onFocus={handleFocus as any}
                onBlur={handleBlur as any}
              />
              <p style={{ fontSize: 12, color: '#787774', marginTop: 4, opacity: 0.7 }}>
                Supports [your name] as a placeholder.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={saving}
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
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? <Loader2 style={{ height: 16, width: 16 }} className="animate-spin" /> : <Save style={{ height: 16, width: 16 }} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ---- NOTIFICATIONS TAB ---- */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E3E2DE', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '16px 20px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#37352F', margin: 0 }}>Notification Channels</h2>
              <p style={{ fontSize: 12, color: '#787774', marginTop: 2 }}>
                Choose how you want to receive notifications.
              </p>
            </div>
            <div style={{ height: 1, background: '#E3E2DE' }} />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ToggleSetting
                label="Email Notifications"
                description="Receive notifications via email for important updates."
                checked={emailNotifications}
                onChange={setEmailNotifications}
              />
              <div style={{ height: 1, background: '#E3E2DE' }} />
              <ToggleSetting
                label="SMS Notifications"
                description={
                  phoneNumber
                    ? `Text notifications will be sent to ${phoneNumber}.`
                    : 'Add a phone number in the General tab to enable SMS notifications.'
                }
                checked={smsNotifications}
                onChange={setSmsNotifications}
                disabled={!phoneNumber}
              />
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E3E2DE', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '16px 20px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#37352F', margin: 0 }}>Notification Types</h2>
              <p style={{ fontSize: 12, color: '#787774', marginTop: 2 }}>
                Fine-tune which events trigger notifications.
              </p>
            </div>
            <div style={{ height: 1, background: '#E3E2DE' }} />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ToggleSetting
                label="Call Completed"
                description="Get notified when a phone call finishes, including a summary of the outcome."
                checked={notifyCallCompleted}
                onChange={setNotifyCallCompleted}
              />
              <div style={{ height: 1, background: '#E3E2DE' }} />
              <ToggleSetting
                label="Task Done"
                description="Get notified when an entire task (including all calls) has been completed."
                checked={notifyTaskDone}
                onChange={setNotifyTaskDone}
              />
              <div style={{ height: 1, background: '#E3E2DE' }} />
              <ToggleSetting
                label="Scheduled Reminders"
                description="Get a reminder before a scheduled task is about to run."
                checked={notifyScheduledReminder}
                onChange={setNotifyScheduledReminder}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={saving}
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
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? <Loader2 style={{ height: 16, width: 16 }} className="animate-spin" /> : <Save style={{ height: 16, width: 16 }} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div style={{ height: 1, background: '#E3E2DE', marginTop: 32, marginBottom: 32 }} />

      <div style={{
        background: '#FFFFFF',
        border: '1px solid rgba(235,87,87,0.3)',
        borderRadius: 8,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      }}>
        <div style={{ padding: '16px 20px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: '#EB5757', margin: 0 }}>
            <AlertTriangle style={{ height: 18, width: 18 }} />
            Danger Zone
          </h2>
          <p style={{ fontSize: 12, color: '#787774', marginTop: 2 }}>
            Irreversible and destructive actions. Please proceed with caution.
          </p>
        </div>
        <div style={{ height: 1, background: '#E3E2DE' }} />
        <div style={{ padding: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={handleExportData}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: 14,
              fontWeight: 500,
              color: '#37352F',
              background: '#FFFFFF',
              border: '1px solid #E3E2DE',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <Download style={{ height: 16, width: 16 }} />
            Export My Data
          </button>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <button
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#FFFFFF',
                  background: '#EB5757',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                <Trash2 style={{ height: 16, width: 16 }} />
                Delete Account
              </button>
            </DialogTrigger>
            <DialogContent style={{ borderRadius: 8, border: '1px solid #E3E2DE', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', background: '#FFFFFF' }}>
              <DialogHeader>
                <DialogTitle style={{ fontSize: 18, fontWeight: 600, color: '#37352F' }}>Are you absolutely sure?</DialogTitle>
                <DialogDescription style={{ fontSize: 14, color: '#787774' }}>
                  This action cannot be undone. This will permanently delete your account and remove all
                  of your data from our servers, including call history, contacts, and settings.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button
                  onClick={() => setDeleteDialogOpen(false)}
                  style={{
                    padding: '6px 14px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#37352F',
                    background: '#FFFFFF',
                    border: '1px solid #E3E2DE',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    toast.info(
                      'Account deletion request received. Please contact support to complete this process.'
                    );
                  }}
                  style={{
                    padding: '6px 14px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#FFFFFF',
                    background: '#EB5757',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Yes, delete my account
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

// Toggle setting sub-component
function ToggleSetting({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#37352F' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#787774', marginTop: 2 }}>{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          width: 40,
          height: 22,
          borderRadius: 11,
          border: 'none',
          background: checked ? '#2383E2' : '#E3E2DE',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background 200ms ease',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          transition: 'left 200ms ease',
        }} />
      </button>
    </div>
  );
}
