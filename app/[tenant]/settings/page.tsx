'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Upload } from 'lucide-react';

export default function SchoolSettings() {
  const [schoolInfo, setSchoolInfo] = useState({
    name: 'Sample School',
    email: 'admin@sampleschool.com',
    phone: '+233XXXXXXXXX',
    website: 'https://sampleschool.com',
    address: '123 School Street',
    city: 'Accra',
    country: 'Ghana',
    timezone: 'Africa/Accra',
    currency: 'GHS',
  });

  const [branding, setBranding] = useState({
    primaryColor: '#2563FF',
    secondaryColor: '#10B981',
    logoUrl: '/logo.png',
  });

  const [academicSettings, setAcademicSettings] = useState({
    academicYearFormat: 'September-July',
    termSystem: 'Trimester',
    gradingSystem: 'Percentage (0-100%)',
  });

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setSchoolInfo(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">School Settings</h1>
          <p className="text-slate-400">Configure your school profile, branding, and system preferences</p>
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
            <TabsTrigger value="finance" className="text-slate-300 data-[state=active]:text-white">
              Finance
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-slate-300 data-[state=active]:text-white">
              Communication
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Basic Information</CardTitle>
                <CardDescription className="text-slate-400">Update your school's basic information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">School Name</label>
                      <Input
                        name="name"
                        value={schoolInfo.name}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                      <Input
                        name="email"
                        type="email"
                        value={schoolInfo.email}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                      <Input
                        name="phone"
                        value={schoolInfo.phone}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                      <Input
                        name="website"
                        type="url"
                        value={schoolInfo.website}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                      <Input
                        name="address"
                        value={schoolInfo.address}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">City</label>
                      <Input
                        name="city"
                        value={schoolInfo.city}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Country</label>
                      <Input
                        name="country"
                        value={schoolInfo.country}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                      <Input
                        name="timezone"
                        value={schoolInfo.timezone}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
                      <Input
                        name="currency"
                        value={schoolInfo.currency}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-700">
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                      Cancel
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Branding & Appearance</CardTitle>
                <CardDescription className="text-slate-400">Customize your school's visual identity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-4">School Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32 rounded-lg bg-slate-700/50 border border-slate-600 flex items-center justify-center">
                        <span className="text-slate-400">Logo Preview</span>
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Logo
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Primary Color</label>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-16 h-16 rounded-lg border-2 border-slate-600"
                          style={{ backgroundColor: branding.primaryColor }}
                        />
                        <Input
                          type="color"
                          value={branding.primaryColor}
                          className="w-20 h-10 cursor-pointer bg-slate-700/50 border-slate-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Secondary Color</label>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-16 h-16 rounded-lg border-2 border-slate-600"
                          style={{ backgroundColor: branding.secondaryColor }}
                        />
                        <Input
                          type="color"
                          value={branding.secondaryColor}
                          className="w-20 h-10 cursor-pointer bg-slate-700/50 border-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-700">
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                      Cancel
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Save Branding
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Academic Settings</CardTitle>
                <CardDescription className="text-slate-400">Configure academic year and grading policies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Academic Year Format</label>
                    <Input
                      value={academicSettings.academicYearFormat}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Term System</label>
                    <Input
                      value={academicSettings.termSystem}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Grading System</label>
                    <Input
                      value={academicSettings.gradingSystem}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-700">
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                      Cancel
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Save Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Finance Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Finance configuration interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Communication Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Communication provider configuration will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

