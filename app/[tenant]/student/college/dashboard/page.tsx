'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BookOpen, Clock, TrendingUp, Award, Calendar, Star, Briefcase, Users, GraduationCap } from 'lucide-react';

export default function CollegeStudentDashboard() {
  const [studentInfo] = useState({
    name: 'Jennifer Okafor',
    program: 'Business Administration',
    year: '2nd Year',
    studentId: 'BUS2023005',
    gpa: 3.4,
    creditsCompleted: 65,
    totalCredits: 90,
    expectedGraduation: 'May 2025',
  });

  const [currentSemester] = useState([
    { course: 'Marketing Principles', code: 'MKT201', credits: 3, instructor: 'Dr. Johnson', grade: 'A-' },
    { course: 'Financial Accounting', code: 'ACC205', credits: 3, instructor: 'Prof. Smith', grade: 'B+' },
    { course: 'Business Statistics', code: 'STA301', credits: 3, instructor: 'Ms. Davis', grade: 'A' },
    { course: 'Entrepreneurship', code: 'ENT401', credits: 3, instructor: 'Dr. Williams', grade: 'A-' },
  ]);

  const [upcomingDeadlines] = useState([
    { course: 'MKT201', assignment: 'Marketing Plan Project', due: '2024-03-25', type: 'project', weight: 30 },
    { course: 'ACC205', assignment: 'Financial Statements Analysis', due: '2024-03-28', type: 'assignment', weight: 20 },
    { course: 'STA301', assignment: 'Statistical Report', due: '2024-04-02', type: 'project', weight: 25 },
    { course: 'ENT401', assignment: 'Business Proposal', due: '2024-04-05', type: 'project', weight: 35 },
  ]);

  const [internshipStatus] = useState({
    status: 'Applied',
    company: 'TechStart Solutions',
    position: 'Marketing Assistant',
    appliedDate: '2024-02-15',
    interviewDate: '2024-03-20',
    progress: 60,
  });

  const [careerServices] = useState([
    { service: 'Resume Workshop', date: 'March 18, 2024', registered: true },
    { service: 'Mock Interview Session', date: 'March 25, 2024', registered: false },
    { service: 'Career Fair', date: 'April 10, 2024', registered: true },
  ]);

  const [achievements] = useState([
    { title: 'Deans List', description: 'Fall 2023 Semester', icon: '🏆', date: 'December 2023' },
    { title: 'Business Plan Competition', description: '2nd Place Winner', icon: '💼', date: 'November 2023' },
    { title: 'Leadership Award', description: 'Student Council Member', icon: '👑', date: 'October 2023' },
  ]);

  const [performanceTrend] = useState([
    { semester: 'Fall 2022', gpa: 3.1 },
    { semester: 'Spring 2023', gpa: 3.3 },
    { semester: 'Fall 2023', gpa: 3.4 },
    { semester: 'Spring 2024', gpa: 3.4 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Welcome, {studentInfo.name}! 🎓</h1>
            <p className="text-slate-400">{studentInfo.program} • {studentInfo.year} • ID: {studentInfo.studentId}</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Academic Planning
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Current GPA</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{studentInfo.gpa}</div>
              <p className="text-xs text-slate-400 mt-2">Out of 4.0 scale</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Credits Completed</CardTitle>
              <BookOpen className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{studentInfo.creditsCompleted}/{studentInfo.totalCredits}</div>
              <p className="text-xs text-slate-400 mt-2">{studentInfo.totalCredits - studentInfo.creditsCompleted} credits remaining</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Current Semester</CardTitle>
              <Calendar className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{currentSemester.length}</div>
              <p className="text-xs text-slate-400 mt-2">Courses enrolled</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Internship Status</CardTitle>
              <Briefcase className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-white">{internshipStatus.status}</div>
              <p className="text-xs text-slate-400 mt-2">{internshipStatus.company}</p>
            </CardContent>
          </Card>
        </div>

        {/* College Student Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              Academic Overview
            </TabsTrigger>
            <TabsTrigger value="courses" className="text-slate-300 data-[state=active]:text-white">
              Current Courses
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-slate-300 data-[state=active]:text-white">
              Assignments & Deadlines
            </TabsTrigger>
            <TabsTrigger value="internships" className="text-slate-300 data-[state=active]:text-white">
              Internships & Jobs
            </TabsTrigger>
            <TabsTrigger value="career" className="text-slate-300 data-[state=active]:text-white">
              Career Services
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-slate-300 data-[state=active]:text-white">
              Achievements
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-slate-300 data-[state=active]:text-white">
              Student Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* GPA Trend */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Academic Performance Trend</CardTitle>
                  <CardDescription className="text-slate-400">Your GPA progression over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={performanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis stroke="#94a3b8" dataKey="semester" />
                      <YAxis stroke="#94a3b8" domain={[2.5, 4.0]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Bar dataKey="gpa" fill="#3B82F6" name="GPA" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Academic Status */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Academic Standing</CardTitle>
                  <CardDescription className="text-slate-400">Your current academic status and progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Academic Status:</span>
                      <span className="text-sm font-semibold text-green-400">Good Standing</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Credits This Semester:</span>
                      <span className="text-sm font-semibold text-white">12</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Dean's List:</span>
                      <span className="text-sm font-semibold text-yellow-400">2 semesters</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Extracurricular:</span>
                      <span className="text-sm font-semibold text-purple-400">Business Club</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Expected Graduation:</span>
                      <span className="text-sm font-semibold text-blue-400">{studentInfo.expectedGraduation}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Current Semester Courses</CardTitle>
                <CardDescription className="text-slate-400">Your enrolled courses and current grades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentSemester.map((course, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{course.course}</p>
                          <p className="text-xs text-slate-400">{course.code} • {course.credits} credits • {course.instructor}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                            course.grade.startsWith('A') ? 'bg-green-900/30 text-green-300 border border-green-700/50' :
                            course.grade.startsWith('B') ? 'bg-blue-900/30 text-blue-300 border border-blue-700/50' :
                            'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50'
                          }`}>
                            {course.grade}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Course Materials
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          View Syllabus
                        </Button>
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Contact Instructor
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Upcoming Assignments & Projects</CardTitle>
                <CardDescription className="text-slate-400">Deadlines for assignments, projects, and assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingDeadlines.map((deadline, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{deadline.assignment}</p>
                          <p className="text-xs text-slate-400">{deadline.course} • {deadline.weight}% of final grade</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          deadline.type === 'exam' ? 'bg-red-900/30 text-red-300 border border-red-800/50' :
                          deadline.type === 'project' ? 'bg-purple-900/30 text-purple-300 border border-purple-800/50' :
                          'bg-blue-900/30 text-blue-300 border border-blue-800/50'
                        }`}>
                          {deadline.type === 'exam' ? '📝 Exam' :
                           deadline.type === 'project' ? '🎯 Project' : '📄 Assignment'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-400">Due: {deadline.due}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                            View Details
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Submit
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="internships" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Internship & Job Opportunities</CardTitle>
                <CardDescription className="text-slate-400">Your internship applications and job prospects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{internshipStatus.position}</p>
                      <p className="text-xs text-slate-400">{internshipStatus.company}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      internshipStatus.status === 'Applied' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                      internshipStatus.status === 'Interview' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50' :
                      'bg-green-900/30 text-green-300 border border-green-800/50'
                    }`}>
                      {internshipStatus.status}
                    </span>
                  </div>
                  <div className="space-y-2 mb-3">
                    <p className="text-xs text-slate-400">Applied: {internshipStatus.appliedDate}</p>
                    {internshipStatus.interviewDate && (
                      <p className="text-xs text-slate-400">Interview: {internshipStatus.interviewDate}</p>
                    )}
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2 mb-3">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${internshipStatus.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mb-3">Application Progress: {internshipStatus.progress}%</p>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    View Application
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="career" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Career Development Services</CardTitle>
                <CardDescription className="text-slate-400">Workshops, events, and resources for career development</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {careerServices.map((service, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${
                      service.registered ? 'bg-green-900/20 border-green-700/50' : 'bg-slate-700/30 border-slate-600/30'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{service.service}</p>
                          <p className="text-xs text-slate-400">{service.date}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          service.registered ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          'bg-gray-900/30 text-gray-300 border border-gray-800/50'
                        }`}>
                          {service.registered ? '✓ Registered' : 'Not Registered'}
                        </span>
                      </div>
                      {!service.registered && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Register Now
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Academic Achievements & Awards 🏆</CardTitle>
                <CardDescription className="text-slate-400">Your accomplishments and recognitions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="text-3xl mb-2">{achievement.icon}</div>
                      <p className="text-sm font-semibold text-white mb-1">{achievement.title}</p>
                      <p className="text-xs text-slate-400 mb-2">{achievement.description}</p>
                      <p className="text-xs text-slate-500">{achievement.date}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Resources & Support</CardTitle>
                <CardDescription className="text-slate-400">Academic support, tutoring, counseling, and campus resources</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Student resources interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
