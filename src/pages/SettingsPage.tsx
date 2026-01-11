// src/pages/SettingsPage.tsx
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';
import useUIStore from '@/store/useUIStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { UserSettings } from '@/types';
import { LANGUAGES_AVAILABLE } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import useUserStore from '@/store/useUserStore';
import { Loader2, Pencil, X } from 'lucide-react'; // Added Loader2, Pencil, X import


// Zod schema for validation of UserSettings
const settingsSchema = z.object({
  language: z.string(),
  preferred_currency: z.string(),
  date_format: z.string(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

// Zod schema for validation of Account and Security (username, email, password)
const accountSecuritySchema = z.object({
  username: z.string().min(1, 'settings.profile.usernameRequired'),
  email: z.string().email('settings.profile.emailInvalid'),
  current_password: z.string().optional(),
  new_password1: z.string().optional(),
  new_password2: z.string().optional(),
}).refine((data) => {
  if (data.new_password1 || data.new_password2) {
    return data.current_password && data.new_password1 && data.new_password2;
  }
  return true;
}, {
  message: 'settings.password.allPasswordFieldsRequired',
  path: ['current_password'],
}).refine((data) => {
  if (data.new_password1 || data.new_password2) {
    return data.new_password1 === data.new_password2;
  }
  return true;
}, {
  message: 'settings.password.newPasswordsMismatch',
  path: ['new_password2'],
});

type AccountSecurityFormData = z.infer<typeof accountSecuritySchema>;

// Component to handle user profile and password updates
const AccountSecuritySection = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, refetchUser } = useAuth();
  const { setUser } = useUserStore();

  const [isEditingUsername, setIsEditingUsername] = useState(false); // New state for username editing

  const { control, handleSubmit, formState: { isDirty, errors }, reset } = useForm<AccountSecurityFormData>({
    resolver: zodResolver(accountSecuritySchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      current_password: '',
      new_password1: '',
      new_password2: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    reset({
      username: user?.username || '',
      email: user?.email || '',
      current_password: '',
      new_password1: '',
      new_password2: '',
    });
  }, [user, reset]);

  const profileMutation = useMutation({
    mutationFn: (data: { username: string; email: string }) => apiClient.patch('api/v1/users/me/', data),
    onSuccess: (response) => {
      const updatedUser = response.data;
      setUser(updatedUser);
      refetchUser();
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast.success(t('settings.profile.updateSuccess'));
      reset((prev) => ({ ...prev, username: updatedUser.username, email: updatedUser.email }));
    },
    onError: (error: any) => {
      console.error('Failed to update user profile:', error);
      const errorMsg = error.response?.data?.username?.[0] || error.response?.data?.email?.[0] || t('settings.profile.updateFailed');
      toast.error(errorMsg);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { old_password: string; new_password1: string; new_password2: string }) => apiClient.post('api/auth/password/change/', data),
    onSuccess: () => {
      toast.success(t('settings.password.updateSuccess'));
      reset((prev) => ({ ...prev, current_password: '', new_password1: '', new_password2: '' }));
    },
    onError: (error: any) => {
      console.error('Failed to change password:', error);
      const errorMsg = error.response?.data?.new_password1?.[0] || error.response?.data?.old_password?.[0] || t('settings.password.updateFailed');
      toast.error(errorMsg);
    },
  });

  const onSubmit = async (data: AccountSecurityFormData) => {
    // Only check username for profileChanged, as email is disabled
    const profileChanged = isEditingUsername && user?.username !== data.username;
    const passwordChanged = data.current_password || data.new_password1 || data.new_password2;

    if (!profileChanged && !passwordChanged) {
      toast.info(t('settings.noChangesMade'));
      return;
    }

    if (profileChanged) {
      await profileMutation.mutateAsync({ username: data.username, email: user?.email || '' }); // Send existing email if username changed
    }

    if (passwordChanged) {
      await passwordMutation.mutateAsync({
        old_password: data.current_password!,
        new_password1: data.new_password1!,
        new_password2: data.new_password2!,
      });
    }
  };

  const isSaving = profileMutation.isPending || passwordMutation.isPending;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t('settings.accountSecurity.title')}</CardTitle>
        <CardDescription>{t('settings.accountSecurity.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Username */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="username">{t('settings.profile.usernameLabel')}</Label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isEditingUsername) {
                    // If cancelling edit, reset username to initial value
                    reset((prev) => ({ ...prev, username: user?.username || '' }));
                  }
                  setIsEditingUsername(!isEditingUsername);
                }}
                className="ml-2"
              >
                {isEditingUsername ? (
                  <>
                    <X className="h-4 w-4" />
                    <span className="sr-only">{t('common.cancel')}</span>
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">{t('common.edit')}</span>
                  </>
                )}
              </Button>
            </div>
            {isEditingUsername ? (
              <Controller
                name="username"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <>
                    <Input
                      id="username"
                      placeholder={t('settings.profile.usernamePlaceholder')}
                      {...field}
                      disabled={isSaving}
                    />
                    {error && <p className="text-red-500 text-sm">{t(error.message)}</p>}
                  </>
                )}
              />
            ) : (
              <p className="text-lg font-medium">{user?.username}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">{t('settings.profile.emailLabel')}</Label>
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('settings.profile.emailPlaceholder')}
                    {...field}
                    disabled={true} // Temporarily disabled as per user request
                  />
                  {error && <p className="text-red-500 text-sm">{t(error.message)}</p>}
                </>
              )}
            />
          </div>

          <h3 className="text-lg font-semibold mt-8">{t('settings.password.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('settings.password.description')}</p>

          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current_password">{t('settings.password.currentPasswordLabel')}</Label>
            <Controller
              name="current_password"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <>
                  <Input
                    id="current_password"
                    type="password"
                    placeholder={t('settings.password.currentPasswordPlaceholder')}
                    {...field}
                    disabled={isSaving}
                  />
                  {error && <p className="text-red-500 text-sm">{t(error.message)}</p>}
                </>
              )}
            />
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new_password1">{t('settings.password.newPasswordLabel')}</Label>
            <Controller
              name="new_password1"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <>
                  <Input
                    id="new_password1"
                    type="password"
                    placeholder={t('settings.password.newPasswordPlaceholder')}
                    {...field}
                    disabled={isSaving}
                  />
                  {error && <p className="text-red-500 text-sm">{t(error.message)}</p>}
                </>
              )}
            />
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label htmlFor="new_password2">{t('settings.password.confirmNewPasswordLabel')}</Label>
            <Controller
              name="new_password2"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <>
                  <Input
                    id="new_password2"
                    type="password"
                    placeholder={t('settings.password.confirmNewPasswordPlaceholder')}
                    {...field}
                    disabled={isSaving}
                  />
                  {error && <p className="text-red-500 text-sm">{t(error.message)}</p>}
                </>
              )}
            />
          </div>

          <Button type="submit" disabled={!isDirty || isSaving}>
            {isSaving ? t('settings.saving') : t('settings.saveButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const SettingsForm = ({ settings }: { settings: UserSettings }) => {
  const { t, i18n } = useTranslation();
  const setUi = useUIStore((state) => state.setUi);
  const queryClient = useQueryClient();

  const { control, handleSubmit, formState: { isDirty }, reset } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      language: settings.language,
      preferred_currency: settings.preferred_currency,
      date_format: settings.date_format,
    },
    mode: 'onChange',
  });

  const mutation = useMutation({
    mutationFn: (data: SettingsFormData) => apiClient.patch('api/v1/finance/user-settings/', data),
    onSuccess: (response, variables) => {
        const updatedSettings = response.data;
        
        const uiPayload: { dateFormat: string; language?: string } = {
          dateFormat: updatedSettings.date_format,
        };

        // Check if the language was explicitly changed in the form
        if (variables.language !== settings.language) {
            // If it was changed, then update i18n and localStorage to the new submitted language
            if (variables.language !== i18n.language) { // Prevent redundant i18n change
                i18n.changeLanguage(variables.language);
                localStorage.setItem('i18nextLng', variables.language);
            }
            uiPayload.language = variables.language; // Update UI store with the newly submitted language
        } else {
            // If the language was NOT explicitly changed in the form,
            // ensure uiPayload.language matches the current i18n.language.
            // This prevents reverting the UI language if it was set by the LanguageSwitcher.
            uiPayload.language = i18n.language;
        }
        
        setUi(uiPayload);
        
        reset(updatedSettings);
        queryClient.invalidateQueries({ queryKey: ['user-settings'] });
        
        console.log('Settings updated successfully!');
      },
      onError: (error) => {
        console.error('Failed to update settings:', error);
      }
  });

  console.log("isDirty:", isDirty, "mutation.isPending:", mutation.isPending);

  const onSubmit = (data: SettingsFormData) => {
    mutation.mutate(data);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t('settings.title')}</CardTitle>
        <CardDescription>{t('settings.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Language Setting */}
          <div className="space-y-2">
            <Label htmlFor="language">{t('settings.language.label')}</Label>
            <Controller
              name="language"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('settings.language.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.options?.language.map(([value]) => (
                      <SelectItem key={value} value={value}>
                        {LANGUAGES_AVAILABLE.find(lang => lang.code === value)?.name || value} {/* Use native name from LANGUAGES_AVAILABLE */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Preferred Currency Setting */}
          <div className="space-y-2">
            <Label htmlFor="preferred_currency">{t('settings.currency.label')}</Label>
            <Controller
              name="preferred_currency"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('settings.currency.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.options?.preferred_currency.map(([value]) => (
                      <SelectItem key={value} value={value}>
                        {t(`currencies.${value}`)} {/* Translate using the currency code */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Date Format Setting */}
          <div className="space-y-2">
            <Label htmlFor="date_format">{t('settings.dateFormat.label')}</Label>
            <Controller
              name="date_format"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('settings.dateFormat.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.options?.date_format.map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <Button type="submit" disabled={!isDirty || mutation.isPending}>
            {mutation.isPending ? t('settings.saving') : t('settings.saveButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};



export function SettingsPage() {
  const { t } = useTranslation();

  const { data: settings, isPending, isError } = useQuery({
    queryKey: ['user-settings'],
    queryFn: () => apiClient.get('api/v1/finance/user-settings/').then(res => res.data),
    retry: false,
  });

  useEffect(() => {
    document.title = t('settings.title');
  }, [t]);

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError || !settings) {
    return <div className="flex justify-center items-center h-full text-red-500">{t('settings.error')}</div>;
  }

  return (
    <div className="space-y-6 p-8 pt-6">
      <div className="space-y-8">
        <SettingsForm settings={settings} />
        <AccountSecuritySection />
      </div>
    </div>
  );
}
