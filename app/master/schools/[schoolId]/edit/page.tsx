"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, Building2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium',
  'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic',
  'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus',
  'Czech Republic', 'Czechia', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran',
  'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati',
  'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
  'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands',
  'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco',
  'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
  'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
  'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa',
  'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone',
  'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
  'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania',
  'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
  'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
]

interface School {
  id: string
  name: string
  slug: string
  domain: string
  schoolEmail: string
  phone: string
  address: string
  country: string
  city: string
  timezone: string
  currency: string
}

const mockSchool: School = {
  id: '1',
  name: 'Johannesburg High School',
  slug: 'johannesburg-high-school',
  domain: 'johannesburg-high-school.roxan.com',
  schoolEmail: 'admin@johannesburg-high-school.roxan.com',
  phone: '+27 11 123 4567',
  address: '123 Main Street, Johannesburg, 2000',
  country: 'ZA',
  city: 'Johannesburg',
  timezone: 'Africa/Johannesburg',
  currency: 'ZAR',
}

const getCurrencyForCountry = (countryCode: string): string => {
  // Default to USD for most countries, ZAR for South Africa
  const currencyMap: Record<string, string> = {
    'ZA': 'ZAR',
    'US': 'USD',
    'GB': 'GBP',
    'EU': 'EUR',
    'AU': 'AUD',
    'IN': 'INR',
  }
  return currencyMap[countryCode] || 'USD'
}

const timezones = [
  'Africa/Johannesburg',
  'UTC',
  'America/New_York',
  'Europe/London',
  'Asia/Dubai',
  'Australia/Sydney',
]

export default function EditSchoolPage() {
  const params = useParams()
  const schoolId = (params?.schoolId as string) || ''
  const [school, setSchool] = useState<School>(mockSchool)
  const [isLoading, setIsLoading] = useState(false)

  const countryList = countries.map((country) => ({
    code: country.substring(0, 2).toUpperCase(),
    name: country,
  }))

  const handleInputChange = (field: string, value: string) => {
    setSchool((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Auto-update currency when country changes
    if (field === 'country') {
      setSchool((prev) => ({
        ...prev,
        currency: getCurrencyForCountry(value),
      }))
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('School updated:', school)
    setIsLoading(false)
    // Here you would typically redirect back to the school detail page
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/master/schools/${schoolId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to School
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit School</h1>
            <p className="text-muted-foreground mt-1">
              Update school information and settings
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* School Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School Information
          </CardTitle>
          <CardDescription>
            Basic school details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">School Name *</Label>
              <Input
                id="name"
                value={school.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter school name"
              />
            </div>
            <div>
              <Label htmlFor="slug">URL Slug *</Label>
              <Input
                id="slug"
                value={school.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                placeholder="e.g., johannesburg-high-school"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              value={school.domain}
              onChange={(e) => handleInputChange('domain', e.target.value)}
              placeholder="e.g., school.roxan.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="schoolEmail">School Email</Label>
              <Input
                id="schoolEmail"
                type="email"
                value={school.schoolEmail}
                onChange={(e) => handleInputChange('schoolEmail', e.target.value)}
                placeholder="admin@school.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone (with country code)</Label>
              <Input
                id="phone"
                value={school.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+27 11 123 4567"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={school.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter full school address"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="country">Country *</Label>
              <Select value={school.country} onValueChange={(value) => handleInputChange('country', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {countryList.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={school.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Enter city"
              />
            </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={school.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="currency">Currency</Label>
            <div className="flex items-center gap-2">
              <Input
                id="currency"
                value={school.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                placeholder="e.g., ZAR"
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                Auto-set based on country selection
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
