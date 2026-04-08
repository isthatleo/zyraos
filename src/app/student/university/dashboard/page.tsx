/**
 * Student Dashboard - University/College Level
 * Path: src/app/student/university/dashboard/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BookOpen, TrendingUp, FileText, Users, Calendar, Award, Clock, Zap } from 'lucide-react';

export default function UniversityStudentDashboard() {
  const [studentData] = useState({
    name: 'Jordan Williams',
    studentId: 'STU2024001234',
    degree: 'Bachelor of Computer Science',
    semester: 'Semester 5',
    university: 'State University',
    cgpa: 3.78,
    currentGPA: 3.82,
    credits: 120,
    creditsCompleted: 78,
    coursesEnrolled: 5,
    coursesCompleted: 16,
  });

  const [coursesData] = useState([
    {
      name: 'Data Structures & Algorithms',
      code: 'CS301',
      instructor: 'Dr. Smith',
      credits: 4,
      currentScore: 88,
      grade: 'A',
      attendance: 95,
      assignments: '8/8',
    },
    {
      name: 'Database Management Systems',
      code: 'CS302',
      instructor: 'Dr. Johnson',
      credits: 3,
      currentScore: 85,
      grade: 'A-',
      attendance: 92,
      assignments: '7/8',
    },
    {
      name: 'Web Development',
      code: 'CS303',
      instructor: 'Dr. Lee',
      credits: 4,
      currentScore: 92,
      grade: 'A+',
      attendance: 98,
      assignments: '8/8',
    },
    {
      name: 'Operating Systems',
      code: 'CS304',
      instructor: 'Dr. Brown',
      credits: 4,
      currentScore: 80,
      grade: 'B+',
      attendance: 88,
      assignments: '7/8',
    },
    {
      name: 'Software Engineering',
      code: 'CS305',
      instructor: 'Dr. Wilson',
      credits: 3,
      currentScore: 87,
      grade: 'A-',
      attendance: 93,
      assignments: '6/7',
    },
  ]);

  const [projectsData] = useState([
    { name: 'Mobile App Development', course: 'CS303', dueDate: '2024-03-30', status: 'in-progress', progress: 75 },
    { name: 'Database Design Project', course: 'CS302', dueDate: '2024-04-15', status: 'planning', progress: 20 },
    { name: 'Final Year Project', course: 'CS305', dueDate: '2024-05-30', status: 'planning', progress: 0 },
  ]);

  const [academicData] = useState([
    { semester: 'Sem 1', gpa: 3.65 },
    { semester: 'Sem 2', gpa: 3.72 },
    { semester: 'Sem 3', gpa: 3.75 },
    { semester: 'Sem 4', gpa: 3.80 },
    { semester: 'Sem 5', gpa: 3.82 },
  ]);

  const [internships] = useState([
    { company: 'Tech Corp', position: 'Software Engineering Intern', duration: 'Summer 2024', status: 'applied' },
    { company: 'Digital Solutions', position: 'Data Analysis Intern', duration: 'Spring 2024', status: 'applied' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{studentData.name}</h1>
            <p className="text-slate-400">{studentData.degree} • {studentData.university}</p>
            <p className="text-slate-500 text-sm mt-1">ID: {studentData.studentId} • {studentData.semester}</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">CGPA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{studentData.cgpa}</div>
              <p className="text-xs text-slate-400 mt-1">Cumulative</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Current GPA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{studentData.currentGPA}</div>
              <p className="text-xs text-slate-400 mt-1">This semester</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{studentData.creditsCompleted}/{studentData.credits}</div>
              <p className="text-xs text-slate-400 mt-1">Completed</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{studentData.coursesEnrolled}</div>
              <p className="text-xs text-slate-400 mt-1">Enrolled this semester</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">
                {Math.round((studentData.creditsCompleted / studentData.credits) * 100)}%
              </div>
              <p className="text-xs text-slate-400 mt-1">Degree completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="courses" className="text-slate-300 data-[state=active]:text-white">
              Courses
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-slate-300 data-[state=active]:text-white">
              Projects
            </TabsTrigger>
            <TabsTrigger value="academic" className="text-slate-300 data-[state=active]:text-white">
              Academic Trends
            </TabsTrigger>
            <TabsTrigger value="internships" className="text-slate-300 data-[state=active]:text-white">
              Internships
            </TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {coursesData.map((course, i) => (
                <Card key={i} className="bg-slate-800/50 border-slate-700 backdrop-blur">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{course.name}</p>
                        <p className="text-xs text-slate-400">{course.code} • {course.credits} Credits • {course.instructor}</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        course.grade.startsWith('A') ? 'bg-green-900/30 text-green-300 border border-green-700/50' :
                        course.grade.startsWith('B') ? 'bg-blue-900/30 text-blue-300 border border-blue-700/50' :
                        'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50'
                      }`}>
                        {course.grade}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Current Score</p>
                        <p className="text-sm font-semibold text-white">{course.currentScore}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Attendance</p>
                        <p className="text-sm font-semibold text-white">{course.attendance}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Assignments</p>
                        <p className="text-sm font-semibold text-white">{course.assignments}</p>
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Ongoing Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projectsData.map((project, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{project.name}</p>
                          <p className="text-xs text-slate-400">{project.course}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.status === 'in-progress' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                          'bg-gray-900/30 text-gray-300 border border-gray-800/50'
                        }`}>
                          {project.status === 'in-progress' ? 'In Progress' : 'Planning'}
                        </span>
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-slate-400">Progress</span>
                          <span className="text-xs font-semibold text-white">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-600 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">Due: {project.dueDate}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Academic Trends */}
          <TabsContent value="academic">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">GPA Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={academicData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis stroke="#94a3b8" dataKey="semester" />
                    <YAxis stroke="#94a3b8" domain={[3.5, 4.0]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Line type="monotone" dataKey="gpa" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Internships */}
          <TabsContent value="internships">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Internship Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {internships.map((intern, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{intern.position}</p>
                          <p className="text-xs text-slate-400">{intern.company}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          intern.status === 'applied' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50' :
                          'bg-green-900/30 text-green-300 border border-green-800/50'
                        }`}>
                          {intern.status === 'applied' ? 'Applied' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Duration: {intern.duration}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

