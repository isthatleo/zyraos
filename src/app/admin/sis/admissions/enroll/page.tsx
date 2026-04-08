/**
 * Student Enrollment Wizard - 6 Step Process
 * Path: src/app/admin/sis/admissions/enroll/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Upload, FileText } from 'lucide-react';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function EnrollmentWizard() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    firstName: '',
    lastName: '',
    otherNames: '',
    gender: '',
    dateOfBirth: '',
    nationality: '',
    phone: '',
    email: '',
    homeAddress: '',
    profilePhoto: '',

    // Step 2: Admission
    grade: '',
    academicYear: '',
    previousSchool: '',

    // Step 3: Parents/Guardians
    guardianFullName: '',
    relationship: '',
    guardianPhone: '',
    guardianEmail: '',
    guardianOccupation: '',
    guardianAddress: '',

    // Step 4: Health & Academic
    bloodGroup: '',
    allergies: '',
    chronicConditions: '',
    academicStrengths: '',
    academicWeaknesses: '',

    // Step 5: Logistics & Finance
    transport: '',
    feePlan: '',
    scholarship: false,

    // Step 6: Documents
    birthCertificate: '',
    passport: '',
    previousResults: '',
    medicalRecords: '',
  });

  const steps = [
    { number: 1, title: 'Basic Info', icon: '👤' },
    { number: 2, title: 'Admission', icon: '📝' },
    { number: 3, title: 'Parents/Guardians', icon: '👨‍👩‍👧' },
    { number: 4, title: 'Health & Academic', icon: '🏥' },
    { number: 5, title: 'Logistics & Finance', icon: '💰' },
    { number: 6, title: 'Documents', icon: '📄' },
  ];

  const handleInputChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep((currentStep + 1) as Step);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as Step);
  };

  const handleSubmit = () => {
    console.log('Submitting form:', formData);
    alert('Student enrolled successfully!');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Student Enrollment Wizard</h1>
        <p className="text-slate-400">6-step process for new student admission</p>
      </div>

      {/* Stepper */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <button
                onClick={() => setCurrentStep(step.number as Step)}
                className={`flex items-center justify-center w-12 h-12 rounded-full font-bold transition-all ${
                  currentStep === step.number
                    ? 'bg-blue-600 text-white'
                    : currentStep > step.number
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {currentStep > step.number ? <CheckCircle className="h-6 w-6" /> : step.number}
              </button>
              <div className="ml-3">
                <p className="text-sm font-semibold text-white">{step.title}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-6 ${currentStep > step.number ? 'bg-green-600' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">{steps[currentStep - 1].title}</CardTitle>
          <CardDescription className="text-slate-400">Step {currentStep} of 6</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">First Name</label>
                  <Input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Last Name</label>
                  <Input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Other Names</label>
                <Input
                  name="otherNames"
                  value={formData.otherNames}
                  onChange={handleInputChange}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Date of Birth</label>
                  <Input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Profile Photo (Admin Upload Only)</label>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Only admission staff can upload photos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Nationality</label>
                  <Input
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleInputChange}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Phone</label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Home Address</label>
                <Input
                  name="homeAddress"
                  value={formData.homeAddress}
                  onChange={handleInputChange}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          )}

          {/* Step 2: Admission */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Grade/Class Applying For</label>
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Select Grade</option>
                    <option value="primary5">Primary 5</option>
                    <option value="jhs1">JHS 1</option>
                    <option value="jhs2">JHS 2</option>
                    <option value="shs1">SHS 1</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Academic Year</label>
                  <Input
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleInputChange}
                    placeholder="2024-2025"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Previous School Attended</label>
                <Input
                  name="previousSchool"
                  value={formData.previousSchool}
                  onChange={handleInputChange}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          )}

          {/* Step 3: Parents/Guardians */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Guardian Full Name</label>
                  <Input
                    name="guardianFullName"
                    value={formData.guardianFullName}
                    onChange={handleInputChange}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Relationship</label>
                  <select
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Select Relationship</option>
                    <option value="mother">Mother</option>
                    <option value="father">Father</option>
                    <option value="uncle">Uncle</option>
                    <option value="aunt">Aunt</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Phone</label>
                  <Input
                    name="guardianPhone"
                    value={formData.guardianPhone}
                    onChange={handleInputChange}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Email</label>
                  <Input
                    type="email"
                    name="guardianEmail"
                    value={formData.guardianEmail}
                    onChange={handleInputChange}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Occupation</label>
                <Input
                  name="guardianOccupation"
                  value={formData.guardianOccupation}
                  onChange={handleInputChange}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Address</label>
                <Input
                  name="guardianAddress"
                  value={formData.guardianAddress}
                  onChange={handleInputChange}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          )}

          {/* Step 4: Health & Academic */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Blood Group</label>
                  <Input
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleInputChange}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Allergies</label>
                  <Input
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleInputChange}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Chronic Conditions</label>
                <Input
                  name="chronicConditions"
                  value={formData.chronicConditions}
                  onChange={handleInputChange}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Academic Strengths</label>
                <Input
                  name="academicStrengths"
                  value={formData.academicStrengths}
                  onChange={handleInputChange}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Academic Weaknesses</label>
                <Input
                  name="academicWeaknesses"
                  value={formData.academicWeaknesses}
                  onChange={handleInputChange}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          )}

          {/* Step 5: Logistics & Finance */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Transport Preference</label>
                <select
                  name="transport"
                  value={formData.transport}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Select Transport</option>
                  <option value="school-bus">School Bus</option>
                  <option value="personal">Personal</option>
                  <option value="none">None</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Fee Plan</label>
                <select
                  name="feePlan"
                  value={formData.feePlan}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Select Fee Plan</option>
                  <option value="standard">Standard</option>
                  <option value="international">International</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <label className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 cursor-pointer">
                <input
                  type="checkbox"
                  name="scholarship"
                  checked={formData.scholarship}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-300">Apply for Scholarship</span>
              </label>
            </div>
          )}

          {/* Step 6: Documents */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  { name: 'birthCertificate', label: 'Birth Certificate' },
                  { name: 'passport', label: 'Passport Photo' },
                  { name: 'previousResults', label: 'Previous School Results' },
                  { name: 'medicalRecords', label: 'Medical Records' },
                ].map((doc) => (
                  <div key={doc.name}>
                    <label className="block text-sm text-slate-300 mb-2">{doc.label}</label>
                    <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500">
                      <FileText className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Click to upload or drag file</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800/50">
                <p className="text-sm text-blue-300">All documents are securely stored and only accessible to authorized staff members.</p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-700">
            <Button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50"
            >
              Previous
            </Button>

            {currentStep < 6 ? (
              <Button onClick={handleNext} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                Complete Enrollment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

