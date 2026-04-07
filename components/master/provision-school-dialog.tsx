"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import countries from 'countries-list'

const PLANS = [
  { id: 'basic', name: 'Basic', price: '299', features: ['Up to 50 students', 'Up to 10 staff', 'Core modules only'] },
  { id: 'standard', name: 'Standard', price: '499', features: ['Up to 200 students', 'Up to 30 staff', 'Advanced modules'] },
  { id: 'premium', name: 'Premium', price: '799', features: ['Unlimited students', 'Unlimited staff', 'All modules + customization'] },
]

const SCHOOL_TYPES = ['Primary', 'Secondary', 'University', 'Other']

const getCurrencyForCountry = (countryCode: string): string => {
  const countryData = countries.countries as Record<string, any>
  const country = countryData[countryCode]
  return country?.currencies?.[0] || 'USD'
}

interface ProvisionSteps {
  plan: string
  country: string
  schoolName: string
  slug: string
  schoolType: string
  address: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  maxStudents: number
  maxStaff: number
}

export function ProvisionNewSchoolDialog({
  isOpen,
  onOpenChange,
  onSchoolCreated,
  children,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSchoolCreated: (school: any) => void
  children: React.ReactNode
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [provisioningStatus, setProvisioningStatus] = useState<string[]>([])
  const [formData, setFormData] = useState<ProvisionSteps>({
    plan: '',
    country: '',
    schoolName: '',
    slug: '',
    schoolType: '',
    address: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    maxStudents: 0,
    maxStaff: 0,
  })

  const countryList = Object.entries(countries.countries as Record<string, any>).map(([code, country]) => ({
    code,
    name: country.name,
  }))

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes('max') ? parseInt(value) || 0 : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleProvision = async () => {
    setIsProvisioning(true)
    setProvisioningStatus([])

    const steps = [
      'Creating Isolated Database',
      'Deploying School Schema',
      'Configuring Authentication',
      'Setting Default Data',
      'Setting Up Subscription',
      'Sending Onboarding Email',
    ]

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setProvisioningStatus((prev) => [...prev, step])
    }

    // Simulate school creation
    onSchoolCreated({
      id: Date.now().toString(),
      name: formData.schoolName,
      slug: formData.slug,
      plan: formData.plan,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    })

    setIsProvisioning(false)
    setTimeout(() => {
      onOpenChange(false)
      setCurrentStep(1)
      setFormData({
        plan: '',
        country: '',
        schoolName: '',
        slug: '',
        schoolType: '',
        address: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        maxStudents: 0,
        maxStaff: 0,
      })
    }, 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Provision New School</DialogTitle>
          <DialogDescription>
            Create and configure a new isolated school environment in the system
          </DialogDescription>
        </DialogHeader>

        {isProvisioning ? (
          <div className="space-y-4 py-6">
            <h3 className="font-semibold text-lg">Provisioning in Progress...</h3>
            <div className="space-y-3">
              {[
                'Creating Isolated Database',
                'Deploying School Schema',
                'Configuring Authentication',
                'Setting Default Data',
                'Setting Up Subscription',
                'Sending Onboarding Email',
              ].map((status, index) => (
                <div key={status} className="flex items-center gap-3">
                  {index < provisioningStatus.length ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : index === provisioningStatus.length ? (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={index < provisioningStatus.length ? 'text-green-600' : ''}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Tabs value={`step-${currentStep}`} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {[1, 2, 3, 4].map((step) => (
                <TabsTrigger key={step} value={`step-${step}`} disabled>
                  {step}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Step 1: Select Plan */}
            <TabsContent value="step-1" className="space-y-4">
              <div>
                <Label className="text-base font-semibold mb-3 block">Select Plan</Label>
                <div className="grid grid-cols-1 gap-3">
                  {PLANS.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => handleSelectChange('plan', plan.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.plan === plan.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">R{plan.price}/month</p>
                        </div>
                        {formData.plan === plan.id && <Badge>Selected</Badge>}
                      </div>
                      <ul className="text-sm space-y-1">
                        {plan.features.map((feature) => (
                          <li key={feature} className="text-muted-foreground">
                            • {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Step 2: School Information */}
            <TabsContent value="step-2" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="schoolName">School Name *</Label>
                  <Input
                    id="schoolName"
                    name="schoolName"
                    placeholder="e.g., Springfield Academy"
                    value={formData.schoolName}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    name="slug"
                    placeholder="e.g., springfield-academy"
                    value={formData.slug}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Select value={formData.country} onValueChange={(value) => handleSelectChange('country', value)}>
                      <SelectTrigger id="country">
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
                    <Label htmlFor="schoolType">School Type *</Label>
                    <Select value={formData.schoolType} onValueChange={(value) => handleSelectChange('schoolType', value)}>
                      <SelectTrigger id="schoolType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHOOL_TYPES.map((type) => (
                          <SelectItem key={type} value={type.toLowerCase()}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">School Address *</Label>
                  <Textarea
                    id="address"
                    name="address"
                    placeholder="Enter school address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>

                {formData.country && (
                  <div>
                    <Label>Default Currency</Label>
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="font-semibold">{getCurrencyForCountry(formData.country)}</p>
                      <p className="text-sm text-muted-foreground">Auto-set based on country</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Step 3: Owner/Administrator */}
            <TabsContent value="step-3" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ownerName">Full Name *</Label>
                  <Input
                    id="ownerName"
                    name="ownerName"
                    placeholder="School administrator name"
                    value={formData.ownerName}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label htmlFor="ownerEmail">Email *</Label>
                  <Input
                    id="ownerEmail"
                    name="ownerEmail"
                    type="email"
                    placeholder="admin@school.com"
                    value={formData.ownerEmail}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label htmlFor="ownerPhone">Phone *</Label>
                  <Input
                    id="ownerPhone"
                    name="ownerPhone"
                    placeholder="+1 (555) 000-0000"
                    value={formData.ownerPhone}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxStudents">Max Students *</Label>
                    <Input
                      id="maxStudents"
                      name="maxStudents"
                      type="number"
                      placeholder="500"
                      value={formData.maxStudents}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxStaff">Max Staff *</Label>
                    <Input
                      id="maxStaff"
                      name="maxStaff"
                      type="number"
                      placeholder="50"
                      value={formData.maxStaff}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Step 4: Review & Confirm */}
            <TabsContent value="step-4" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Review all information before provisioning. This action cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>School Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{formData.schoolName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Slug:</span>
                      <span className="font-medium">{formData.slug}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{formData.schoolType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Country:</span>
                      <span className="font-medium">{formData.country}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Owner Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{formData.ownerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{formData.ownerEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{formData.ownerPhone}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Capacity Limits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Students:</span>
                      <span className="font-medium">{formData.maxStudents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Staff:</span>
                      <span className="font-medium">{formData.maxStaff}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Selected Plan:</span>
                      <span className="font-medium uppercase">{formData.plan}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-4 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                Previous
              </Button>

              {currentStep < 4 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={
                    (currentStep === 1 && !formData.plan) ||
                    (currentStep === 2 &&
                      (!formData.schoolName || !formData.slug || !formData.country || !formData.schoolType)) ||
                    (currentStep === 3 &&
                      (!formData.ownerName || !formData.ownerEmail || !formData.ownerPhone || !formData.maxStudents || !formData.maxStaff))
                  }
                >
                  Next
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleProvision} className="bg-green-600 hover:bg-green-700">
                    Provision School
                  </Button>
                </>
              )}
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

