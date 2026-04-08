/**
 * Settings Page - School Profile
 * Path: src/app/admin/settings/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Upload, Lock } from 'lucide-react';

export default function SettingsPage() {
  const [schoolProfile, setSchoolProfile] = useState({
    name: 'Academy School',
    email: 'info@academyschool.edu',
    phone: '+233501234567',
    address: '123 Education Street',
    city: 'Accra',
    country: 'Ghana',
    timezone: 'Africa/Accra',
    currency: 'GHS',
    subscriptionPlan: 'Standard',
    subscriptionStatus: 'Active',
  });

  const [branding, setBranding] = useState({
    primaryColor: '#1e40af',
    secondaryColor: '#10B981',
    logoUrl: 'https://via.placeholder.com/200',
    faviconUrl: 'https://via.placeholder.com/32',
  });

  const [academicSettings, setAcademicSettings] = useState({
    academicYear: '2023-2024',
    termSystem: 'Trimester',
    gradingSystem: 'Percentage',
    schoolLevels: ['Primary', 'Secondary', 'Senior'],
    curriculumType: 'Ghana Basic',
  });

  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // API call to save profile
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Profile saved:', schoolProfile);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Manage your school settings and configurations</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
          <TabsTrigger value="profile" className="text-slate-300 data-[state=active]:text-white">
            School Profile
          </TabsTrigger>
          <TabsTrigger value="branding" className="text-slate-300 data-[state=active]:text-white">
            Branding
          </TabsTrigger>
          <TabsTrigger value="academic" className="text-slate-300 data-[state=active]:text-white">
            Academic Settings
          </TabsTrigger>
          <TabsTrigger value="communication" className="text-slate-300 data-[state=active]:text-white">
            Communication
          </TabsTrigger>
          <TabsTrigger value="security" className="text-slate-300 data-[state=active]:text-white">
            Security
          </TabsTrigger>
        </TabsList>

        {/* School Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">School Information</CardTitle>
              <CardDescription className="text-slate-400">Basic details about your school</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">School Name</label>
                  <Input
                    value={schoolProfile.name}
                    onChange={(e) => setSchoolProfile({ ...schoolProfile, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Email</label>
                  <Input
                    type="email"
                    value={schoolProfile.email}
                    onChange={(e) => setSchoolProfile({ ...schoolProfile, email: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Phone</label>
                  <Input
                    value={schoolProfile.phone}
                    onChange={(e) => setSchoolProfile({ ...schoolProfile, phone: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Address</label>
                  <Input
                    value={schoolProfile.address}
                    onChange={(e) => setSchoolProfile({ ...schoolProfile, address: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">City</label>
                  <Input
                    value={schoolProfile.city}
                    onChange={(e) => setSchoolProfile({ ...schoolProfile, city: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Country</label>
                  <Input
                    value={schoolProfile.country}
                    onChange={(e) => setSchoolProfile({ ...schoolProfile, country: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Timezone</label>
                  <select
                    value={schoolProfile.timezone}
                    onChange={(e) => setSchoolProfile({ ...schoolProfile, timezone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="Africa/Accra">Africa/Accra</option>
                    <option value="Africa/Lagos">Africa/Lagos</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Currency</label>
                  <select
                    value={schoolProfile.currency}
                    onChange={(e) => setSchoolProfile({ ...schoolProfile, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="GHS">GHS</option>
                    <option value="USD">USD</option>
                    <option value="NGN">NGN</option>
                  </select>
                </div>
              </div>

              {/* Subscription Info */}
              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Subscription Plan</p>
                    <p className="text-xs text-slate-400">{schoolProfile.subscriptionPlan} Plan</p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900/30 text-green-300 border border-green-800/50">
                    {schoolProfile.subscriptionStatus}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Branding & Appearance</CardTitle>
              <CardDescription className="text-slate-400">Customize your school's visual identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">School Logo</label>
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                      <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <Button className="bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload
                    </Button>
                  </div>
                </div>

                {/* Favicon Upload */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Favicon</label>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                      <img src={branding.faviconUrl} alt="Favicon" className="w-full h-full object-cover" />
                    </div>
                    <Button className="bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload
                    </Button>
                  </div>
                </div>

                {/* Primary Color */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Primary Color</label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="w-20 h-10 rounded-lg cursor-pointer"
                    />
                    <Input
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="flex-1 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Secondary Color</label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                      className="w-20 h-10 rounded-lg cursor-pointer"
                    />
                    <Input
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                      className="flex-1 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
                <Save className="h-4 w-4" />
                Save Branding
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Settings Tab */}
        <TabsContent value="academic" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Academic Configuration</CardTitle>
              <CardDescription className="text-slate-400">Set up your school's academic structure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Academic Year</label>
                  <Input
                    value={academicSettings.academicYear}
                    onChange={(e) => setAcademicSettings({ ...academicSettings, academicYear: e.target.value })}
                    placeholder="2023-2024"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Term System</label>
                  <select
                    value={academicSettings.termSystem}
                    onChange={(e) => setAcademicSettings({ ...academicSettings, termSystem: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="Trimester">Trimester</option>
                    <option value="Semester">Semester</option>
                    <option value="Quarterly">Quarterly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Grading System</label>
                  <select
                    value={academicSettings.gradingSystem}
                    onChange={(e) => setAcademicSettings({ ...academicSettings, gradingSystem: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="Percentage">Percentage</option>
                    <option value="Letter Grade">Letter Grade</option>
                    <option value="Points">Points</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Curriculum Type</label>
                  <select
                    value={academicSettings.curriculumType}
                    onChange={(e) => setAcademicSettings({ ...academicSettings, curriculumType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="Ghana Basic">Ghana Basic</option>
                    <option value="British">British</option>
                    <option value="Cambridge">Cambridge</option>
                    <option value="IB">International Baccalaureate</option>
                  </select>
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
                <Save className="h-4 w-4" />
                Save Academic Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Communication Settings</CardTitle>
              <CardDescription className="text-slate-400">Configure SMS and Email providers</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">See Communication settings page for detailed configuration</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Security & Privacy</CardTitle>
              <CardDescription className="text-slate-400">Manage security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 cursor-pointer hover:bg-slate-700/50">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-semibold text-white">Enable Two-Factor Authentication</p>
                    <p className="text-xs text-slate-400">Require 2FA for all admin accounts</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 cursor-pointer hover:bg-slate-700/50">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-semibold text-white">Enable Audit Logging</p>
                    <p className="text-xs text-slate-400">Log all system activities</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 cursor-pointer hover:bg-slate-700/50">
                  <input type="checkbox" className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-semibold text-white">Enable IP Whitelisting</p>
                    <p className="text-xs text-slate-400">Restrict access to specific IPs</p>
                  </div>
                </label>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
                <Lock className="h-4 w-4" />
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

