/**
 * Student Detail Profile Page
 * Path: src/app/admin/sis/profiles/[studentId]/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit2, Download, Print, Share2, Eye, FileText } from 'lucide-react';

export default function StudentDetailPage({ params }: { params: { studentId: string } }) {
  const [studentData] = useState({
    id: 'STU001',
    firstName: 'Ama',
    lastName: 'Asare',
    otherNames: 'Ama Deborah',
    gender: 'Female',
    dateOfBirth: '2009-05-15',
    nationality: 'Ghanaian',
    phone: '+233501234567',
    email: 'ama.asare@student.school.com',
    homeAddress: '123 Main Street, Accra',
    admissionNo: 'APP001',
    class: 'JHS 2A',
    academicYear: '2023-2024',
    enrollmentDate: '2023-09-01',
    previousSchool: 'Westend Primary School',
    status: 'active',
  });

  const [guardianData] = useState({
    name: 'Mr. James Asare',
    relationship: 'Father',
    phone: '+233502345678',
    email: 'james.asare@email.com',
    occupation: 'Manager',
    address: '123 Main Street, Accra',
  });

  const [academicData] = useState({
    englishGrade: 'A',
    englishScore: 92,
    mathGrade: 'B+',
    mathScore: 85,
    scienceGrade: 'B',
    scienceScore: 78,
    attendance: 94,
    overallAverage: 85,
  });

  const [medicalData] = useState({
    bloodGroup: 'O+',
    allergies: 'None',
    chronicConditions: 'None',
    lastCheckup: '2024-01-15',
  });

  const [documentsData] = useState([
    { name: 'Birth Certificate', uploaded: true, uploadedBy: 'Admin Staff', uploadDate: '2023-08-20' },
    { name: 'Passport', uploaded: true, uploadedBy: 'Admin Staff', uploadDate: '2023-08-20' },
    { name: 'Previous School Results', uploaded: true, uploadedBy: 'Admin Staff', uploadDate: '2023-08-25' },
    { name: 'Medical Records', uploaded: false, uploadedBy: '-', uploadDate: '-' },
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {studentData.firstName} {studentData.lastName}
          </h1>
          <p className="text-slate-400">Student ID: {studentData.id} • Admission No: {studentData.admissionNo}</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
            <Print className="h-4 w-4" />
            Print
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2">
            <Download className="h-4 w-4" />
            Report Card
          </Button>
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Class</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-white">{studentData.class}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-900/30 text-green-300 border border-green-800/50">
              Active
            </span>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-green-400">{academicData.attendance}%</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Avg. Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-blue-400">{academicData.overallAverage}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="bio" className="w-full">
        <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
          <TabsTrigger value="bio" className="text-slate-300 data-[state=active]:text-white">
            Bio & Admission
          </TabsTrigger>
          <TabsTrigger value="family" className="text-slate-300 data-[state=active]:text-white">
            Family & Contact
          </TabsTrigger>
          <TabsTrigger value="academics" className="text-slate-300 data-[state=active]:text-white">
            Academics
          </TabsTrigger>
          <TabsTrigger value="medical" className="text-slate-300 data-[state=active]:text-white">
            Medical
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-slate-300 data-[state=active]:text-white">
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Bio & Admission Tab */}
        <TabsContent value="bio" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'First Name', value: studentData.firstName },
                  { label: 'Last Name', value: studentData.lastName },
                  { label: 'Other Names', value: studentData.otherNames },
                  { label: 'Gender', value: studentData.gender },
                  { label: 'Date of Birth', value: studentData.dateOfBirth },
                  { label: 'Nationality', value: studentData.nationality },
                  { label: 'Phone', value: studentData.phone },
                  { label: 'Email', value: studentData.email },
                  { label: 'Home Address', value: studentData.homeAddress },
                ].map((field) => (
                  <div key={field.label}>
                    <p className="text-xs text-slate-400 mb-1">{field.label}</p>
                    <p className="text-sm font-semibold text-white">{field.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Admission Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Admission No', value: studentData.admissionNo },
                  { label: 'Class', value: studentData.class },
                  { label: 'Academic Year', value: studentData.academicYear },
                  { label: 'Enrollment Date', value: studentData.enrollmentDate },
                  { label: 'Previous School', value: studentData.previousSchool },
                  { label: 'Status', value: studentData.status },
                ].map((field) => (
                  <div key={field.label}>
                    <p className="text-xs text-slate-400 mb-1">{field.label}</p>
                    <p className="text-sm font-semibold text-white">{field.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Family & Contact Tab */}
        <TabsContent value="family">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Guardian Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Full Name', value: guardianData.name },
                  { label: 'Relationship', value: guardianData.relationship },
                  { label: 'Phone', value: guardianData.phone },
                  { label: 'Email', value: guardianData.email },
                  { label: 'Occupation', value: guardianData.occupation },
                  { label: 'Address', value: guardianData.address },
                ].map((field) => (
                  <div key={field.label}>
                    <p className="text-xs text-slate-400 mb-1">{field.label}</p>
                    <p className="text-sm font-semibold text-white">{field.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academics Tab */}
        <TabsContent value="academics">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Academic Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">Subject Grades</h3>
                  <p className="text-sm text-slate-400">Overall Average: {academicData.overallAverage}%</p>
                </div>
                <div className="space-y-4">
                  {[
                    { subject: 'English', grade: academicData.englishGrade, score: academicData.englishScore },
                    { subject: 'Mathematics', grade: academicData.mathGrade, score: academicData.mathScore },
                    { subject: 'Science', grade: academicData.scienceGrade, score: academicData.scienceScore },
                  ].map((subject) => (
                    <div key={subject.subject}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-white">{subject.subject}</span>
                        <span className="text-sm font-bold text-blue-400">{subject.grade}</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${subject.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{subject.score}%</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <p className="text-sm text-slate-300 mb-2">Attendance Rate</p>
                <div className="flex items-center justify-between">
                  <div className="flex-1 bg-slate-600 rounded-full h-3 mr-4">
                    <div className="bg-green-500 h-3 rounded-full" style={{ width: `${academicData.attendance}%` }} />
                  </div>
                  <p className="text-lg font-bold text-green-400">{academicData.attendance}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Tab */}
        <TabsContent value="medical">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Medical Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Blood Group', value: medicalData.bloodGroup },
                  { label: 'Allergies', value: medicalData.allergies },
                  { label: 'Chronic Conditions', value: medicalData.chronicConditions },
                  { label: 'Last Checkup', value: medicalData.lastCheckup },
                ].map((field) => (
                  <div key={field.label}>
                    <p className="text-xs text-slate-400 mb-1">{field.label}</p>
                    <p className="text-sm font-semibold text-white">{field.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Documents & Compliance</CardTitle>
              <CardDescription className="text-slate-400">All student documents and certifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documentsData.map((doc) => (
                  <div
                    key={doc.name}
                    className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">{doc.name}</p>
                        {doc.uploaded && (
                          <p className="text-xs text-slate-400">
                            Uploaded by {doc.uploadedBy} on {doc.uploadDate}
                          </p>
                        )}
                        {!doc.uploaded && <p className="text-xs text-yellow-400">Not uploaded</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {doc.uploaded && (
                        <>
                          <button className="p-2 rounded-lg hover:bg-slate-600">
                            <Eye className="h-4 w-4 text-slate-300" />
                          </button>
                          <button className="p-2 rounded-lg hover:bg-slate-600">
                            <Download className="h-4 w-4 text-slate-300" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

