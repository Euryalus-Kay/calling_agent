'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme-provider';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  ShieldPlus,
  Palette,
  AlertTriangle,
  Save,
  Loader2,
  Download,
  Trash2,
  Monitor,
  Sun,
  Moon,
} from 'lucide-react';
import type { UserProfile } from '@/types';
import { VOICE_OPTIONS, TIMEZONE_OPTIONS } from '@/types';

interface SettingsPageProps {
  profile: UserProfile | null;
  userId: string;
  userEmail: string;
}

export function SettingsPage({ profile, userId, userEmail }: SettingsPageProps) {
  const supabase = createSupabaseBrowserClient();
  const { setTheme, theme: currentTheme } = useTheme();

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

  // Insurance & Medical
  const [insuranceProvider, setInsuranceProvider] = useState(
    profile?.insurance_provider || ''
  );
  const [memberId, setMemberId] = useState(profile?.insurance_member_id || '');
  const [preferredPharmacy, setPreferredPharmacy] = useState(
    (profile?.preferences as Record<string, string>)?.preferred_pharmacy || ''
  );
  const [doctorNotes, setDoctorNotes] = useState(
    (profile?.preferences as Record<string, string>)?.doctor_notes || ''
  );

  // Theme
  const [selectedTheme, setSelectedTheme] = useState(
    profile?.theme || currentTheme || 'system'
  );

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
          insurance_provider: insuranceProvider,
          insurance_member_id: memberId,
          theme: selectedTheme,
          preferences: {
            ...(profile?.preferences as Record<string, unknown>),
            ai_introduction: aiIntroduction,
            preferred_pharmacy: preferredPharmacy,
            doctor_notes: doctorNotes,
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

  function handleThemeChange(value: string) {
    setSelectedTheme(value);
    setTheme(value);
  }

  function handleExportData() {
    toast.info('Data export will be sent to your email shortly.');
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account preferences and configuration.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 w-full sm:w-auto flex-wrap">
          <TabsTrigger value="general" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="gap-1.5">
            <Mic className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Voice & AI</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="insurance" className="gap-1.5">
            <ShieldPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Insurance</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Your basic contact details. These are used when the AI makes calls on
                  your behalf.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                  <Input
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone Number</label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used as your callback number during calls.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <Input value={userEmail} disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email is managed through your authentication provider and cannot be
                    changed here.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
                <CardDescription>
                  Your address helps the AI find nearby businesses and provide
                  location-relevant results.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Street Address
                  </label>
                  <Input
                    placeholder="123 Main St"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">City</label>
                    <Input
                      placeholder="New York"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">State</label>
                    <Input
                      placeholder="NY"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">ZIP Code</label>
                    <Input
                      placeholder="10001"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timezone</CardTitle>
                <CardDescription>
                  Used for scheduling calls and displaying times correctly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Voice & AI Tab */}
        <TabsContent value="voice">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Voice Preference</CardTitle>
                <CardDescription>
                  Choose how the AI sounds when making calls on your behalf. This affects
                  tone and speaking style.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {VOICE_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                        voicePreference === option.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="voice"
                        value={option.id}
                        checked={voicePreference === option.id}
                        onChange={(e) => setVoicePreference(e.target.value)}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Call Limit</CardTitle>
                <CardDescription>
                  Maximum number of calls the AI can make per day. This helps prevent
                  unexpected usage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={dailyCallLimit}
                  onChange={(e) =>
                    setDailyCallLimit(
                      Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                    )
                  }
                  className="max-w-[120px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Between 1 and 100 calls per day.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Introduction Script</CardTitle>
                <CardDescription>
                  Customize how the AI introduces itself at the beginning of each call. Leave
                  blank to use the default introduction.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Hi, I'm calling on behalf of [your name]. I'd like to..."
                  value={aiIntroduction}
                  onChange={(e) => setAiIntroduction(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The AI will use your name and this script when starting calls. Supports
                  [your name] as a placeholder.
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Channels</CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications about your tasks and calls.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleSetting
                  label="Email Notifications"
                  description="Receive notifications via email for important updates."
                  checked={emailNotifications}
                  onChange={setEmailNotifications}
                />
                <Separator />
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Types</CardTitle>
                <CardDescription>
                  Fine-tune which events trigger notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleSetting
                  label="Call Completed"
                  description="Get notified when a phone call finishes, including a summary of the outcome."
                  checked={notifyCallCompleted}
                  onChange={setNotifyCallCompleted}
                />
                <Separator />
                <ToggleSetting
                  label="Task Done"
                  description="Get notified when an entire task (including all calls) has been completed."
                  checked={notifyTaskDone}
                  onChange={setNotifyTaskDone}
                />
                <Separator />
                <ToggleSetting
                  label="Scheduled Reminders"
                  description="Get a reminder before a scheduled task is about to run."
                  checked={notifyScheduledReminder}
                  onChange={setNotifyScheduledReminder}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Insurance & Medical Tab */}
        <TabsContent value="insurance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Insurance Information</CardTitle>
                <CardDescription>
                  This information is used when the AI calls healthcare providers, pharmacies,
                  or insurance companies on your behalf.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Insurance Provider
                  </label>
                  <Input
                    placeholder="e.g. Blue Cross Blue Shield"
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Member ID</label>
                  <Input
                    placeholder="e.g. XYZ123456789"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Found on the front of your insurance card.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medical Preferences</CardTitle>
                <CardDescription>
                  Help the AI make better calls to medical offices and pharmacies.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Preferred Pharmacy
                  </label>
                  <Input
                    placeholder="e.g. CVS Pharmacy on 5th Ave"
                    value={preferredPharmacy}
                    onChange={(e) => setPreferredPharmacy(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The AI will mention this pharmacy when calling about prescriptions.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Doctor Name & Notes
                  </label>
                  <Textarea
                    placeholder="Dr. Smith at City Medical Center. Primary care physician."
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Include your doctor&apos;s name, clinic, and any other relevant
                    medical notes.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>
                  Select your preferred color scheme. &quot;System&quot; will automatically match your
                  operating system setting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      value: 'system',
                      label: 'System',
                      icon: Monitor,
                      desc: 'Match OS setting',
                    },
                    {
                      value: 'light',
                      label: 'Light',
                      icon: Sun,
                      desc: 'Always light',
                    },
                    {
                      value: 'dark',
                      label: 'Dark',
                      icon: Moon,
                      desc: 'Always dark',
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex flex-col items-center gap-2 rounded-lg border p-4 cursor-pointer transition-colors ${
                        selectedTheme === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={option.value}
                        checked={selectedTheme === option.value}
                        onChange={() => handleThemeChange(option.value)}
                        className="sr-only"
                      />
                      <option.icon className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Danger Zone - always visible at bottom */}
      <Separator className="my-8" />

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions. Please proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4" />
            Export My Data
          </Button>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove all of your data from our servers, including call history,
                  contacts, and settings.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    toast.info(
                      'Account deletion request received. Please contact support to complete this process.'
                    );
                  }}
                >
                  Yes, delete my account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
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
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${checked ? 'bg-primary' : 'bg-input'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
