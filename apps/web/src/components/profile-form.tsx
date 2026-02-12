'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { UserProfile } from '@/types';

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
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Full name"
            value={formData.full_name}
            onChange={(e) => updateField('full_name', e.target.value)}
          />
          <Input
            placeholder="Phone number"
            type="tel"
            value={formData.phone_number}
            onChange={(e) => updateField('phone_number', e.target.value)}
          />

          <Separator />

          <Input
            placeholder="Street address"
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              placeholder="City"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
            />
            <Input
              placeholder="State"
              value={formData.state}
              onChange={(e) => updateField('state', e.target.value)}
            />
            <Input
              placeholder="ZIP"
              value={formData.zip_code}
              onChange={(e) => updateField('zip_code', e.target.value)}
            />
          </div>

          <Separator />

          <Input
            placeholder="Insurance provider"
            value={formData.insurance_provider}
            onChange={(e) => updateField('insurance_provider', e.target.value)}
          />
          <Input
            placeholder="Insurance member ID"
            value={formData.insurance_member_id}
            onChange={(e) =>
              updateField('insurance_member_id', e.target.value)
            }
          />

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
