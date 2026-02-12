'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Phone, MapPin, Shield, Check } from 'lucide-react';

const TOTAL_STEPS = 4;

export function OnboardingForm({ userId }: { userId: string }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    insurance_provider: '',
    insurance_member_id: '',
  });
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleComplete() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          onboarding_completed: true,
        })
        .eq('id', userId);

      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  function nextStep() {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleComplete();
  }

  const stepIcons = [Phone, MapPin, Shield, Check];
  const StepIcon = stepIcons[step - 1];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <StepIcon className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle>
            {step === 1 && 'Tell us about yourself'}
            {step === 2 && 'Where are you located?'}
            {step === 3 && 'Insurance info (optional)'}
            {step === 4 && "You're all set!"}
          </CardTitle>
          <CardDescription>
            {step === 1 &&
              'This helps the AI introduce itself when making calls on your behalf'}
            {step === 2 && 'So we can find businesses near you'}
            {step === 3 && 'Useful when booking medical appointments'}
            {step === 4 && 'Review your info and get started'}
          </CardDescription>
          <Progress value={(step / TOTAL_STEPS) * 100} className="mt-4" />
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <Input
                placeholder="Full name"
                value={formData.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                autoFocus
              />
              <Input
                placeholder="Phone number (optional)"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => updateField('phone_number', e.target.value)}
              />
            </>
          )}

          {step === 2 && (
            <>
              <Input
                placeholder="Street address"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                autoFocus
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
            </>
          )}

          {step === 3 && (
            <>
              <Input
                placeholder="Insurance provider (e.g., Aetna, Blue Cross)"
                value={formData.insurance_provider}
                onChange={(e) =>
                  updateField('insurance_provider', e.target.value)
                }
                autoFocus
              />
              <Input
                placeholder="Member ID"
                value={formData.insurance_member_id}
                onChange={(e) =>
                  updateField('insurance_member_id', e.target.value)
                }
              />
            </>
          )}

          {step === 4 && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Name:</span>{' '}
                {formData.full_name || 'Not set'}
              </p>
              <p>
                <span className="font-medium">Phone:</span>{' '}
                {formData.phone_number || 'Not set'}
              </p>
              <p>
                <span className="font-medium">Location:</span>{' '}
                {formData.city
                  ? `${formData.city}, ${formData.state}`
                  : 'Not set'}
              </p>
              <p>
                <span className="font-medium">Insurance:</span>{' '}
                {formData.insurance_provider || 'Not set'}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={nextStep}
              disabled={step === 1 && !formData.full_name}
              className="flex-1"
            >
              {loading
                ? 'Saving...'
                : step === TOTAL_STEPS
                  ? 'Get Started'
                  : step === 3
                    ? 'Skip / Continue'
                    : 'Continue'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
