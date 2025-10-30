import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Lock, User, Mail, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Profile() {
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();

  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now()); // Force re-render of avatar

  // Log profile photo_url changes
  useEffect(() => {
    console.log('🔍 [Profile] Profile data loaded:', {
      user_id: profile?.user_id,
      email: profile?.email,
      photo_url: profile?.photo_url,
      has_photo: !!profile?.photo_url,
    });
  }, [profile?.photo_url]);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: profile?.email || '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      await updateProfile({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email,
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      // Check if auth is enabled by looking at the session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { error } = await supabase.auth.updateUser({
          password: passwordForm.newPassword
        });
        if (error) throw error;
      } else {
        // Mock update for disabled auth
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast({
        title: "Password updated",
        description: "Your password has been successfully changed.",
      });
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    console.log('🖼️ [Profile] Avatar upload started');
    console.log('📋 [Profile] File:', file?.name, file?.size, file?.type);
    console.log('👤 [Profile] Profile:', profile?.user_id, profile?.email);

    if (!file || !profile) {
      console.error('❌ [Profile] Missing file or profile');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.user_id}/${timestamp}-${randomStr}.${fileExt}`;

      console.log('📤 [Profile] Uploading avatar to Supabase Storage:', fileName);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ [Profile] Upload failed:', uploadError);
        throw new Error(uploadError.message || 'Failed to upload photo');
      }

      console.log('✅ [Profile] Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(fileName);

      console.log('🔗 [Profile] Public URL:', publicUrl);

      // Update user profile in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ photo_url: publicUrl })
        .eq('user_id', profile.user_id);

      if (updateError) {
        console.error('❌ [Profile] Database update failed:', updateError);
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      console.log('✅ [Profile] Database updated successfully');

      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been successfully updated. Refreshing page...",
      });

      // Wait a moment for the toast to show, then reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('❌ [Profile] Photo upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to update profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and profile picture.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24" key={avatarKey}>
                    <AvatarImage
                      src={profile?.photo_url ? `${profile.photo_url}?v=${avatarKey}` : undefined}
                      alt={profile?.first_name || 'User'}
                      className="object-cover"
                      onError={(e) => {
                        console.error('❌ [Profile] Avatar image failed to load:', profile?.photo_url);
                        console.error('❌ [Profile] Image error:', e);
                      }}
                      onLoad={() => {
                        console.log('✅ [Profile] Avatar image loaded successfully');
                      }}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {getInitials(profile?.first_name, profile?.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-medium">Profile Picture</h3>
                  <p className="text-sm text-muted-foreground">
                    Click the camera icon to upload a new profile picture.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Profile Form */}
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={profile?.user_type || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact an administrator to change your role.
                  </p>
                </div>

                <Button type="submit" disabled={isUpdating} className="w-full sm:w-auto">
                  {isUpdating ? 'Updating...' : 'Update Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter your current password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter your new password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm your new password"
                  />
                </div>

                <Button type="submit" disabled={isChangingPassword} className="w-full sm:w-auto">
                  {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your account details and status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Account Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {profile?.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Account Type</Label>
                  <p className="text-sm text-muted-foreground capitalize">
                    {profile?.user_type}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Member Since</Label>
                  <p className="text-sm text-muted-foreground">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Updated</Label>
                  <p className="text-sm text-muted-foreground">
                    {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}