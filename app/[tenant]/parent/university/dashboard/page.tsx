'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, Calendar, TrendingUp, DollarSign, MessageSquare, Eye, BookOpen, GraduationCap, Briefcase, Award } from 'lucide-react';

export default function UniversityParentDashboard() {
  const [parentInfo] = useState({
    name: 'Dr. Mitchell',
    relationship: 'Father',
    children: 1,
    primaryChild: 'Jordan Mitchell',
  });

  const [childInfo] = useState({
    name: 'Jordan Mitchell',
    program: 'Computer Science',
    year: 'Junior (3rd Year)',
    gpa: 3.7,
    creditsCompleted: 98,
    counselor: 'Dr. Johnson',
    residence: 'On Campus',
  });

  const [academicProgress] = useState([
    { course: 'Data Structures & Algorithms', grade: 'A-', instructor: 'Dr. Johnson', credits: 3 },
    { course: 'Database Systems', grade: 'B+', instructor: 'Prof. Smith', credits: 3 },
    { course: 'Software Engineering', grade: 'A', instructor: 'Dr. Williams', credits: 4 },
    { course: 'Web Development', grade: 'A', instructor: 'Ms. Davis', credits: 3 },
  ]);

  const [financialOverview] = useState([
    { item: 'Tuition Fee', amount: 8500, dueDate: '2024-03-31', status: 'paid', paidDate: '2024-03-25' },
    { item: 'Housing Fee', amount: 3200, dueDate: '2024-03-31', status: 'paid', paidDate: '2024-03-28' },
    { item: 'Meal Plan', amount: 1800, dueDate: '2024-04-30', status: 'pending', paidDate: null },
    { item: 'Student Health Insurance', amount: 450, dueDate: '2024-04-30', status: 'pending', paidDate: null },
    { item: 'Lab Fees', amount: 200, dueDate: '2024-05-31', status: 'pending', paidDate: null },
  ]);

  const [careerDevelopment] = useState([
    { activity: 'Resume Workshop', date: 'March 18, 2024', status: 'registered' },
    { activity: 'Tech Company Career Fair', date: 'April 10, 2024', status: 'interested' },
    { activity: 'Mock Interview Session', date: 'March 25, 2024', status: 'registered' },
    { activity: 'Internship Application Deadline', date: 'April 30, 2024', status: 'upcoming' },
  ]);

  const [universityEvents] = useState([
    { event: 'Research Symposium', date: '2024-03-28', type: 'academic' },
    { event: 'Career Development Workshop', date: '2024-04-05', type: 'career' },
    { event: 'International Student Cultural Night', date: '2024-04-12', type: 'cultural' },
    { event: 'Alumni Networking Event', date: '2024-04-20', type: 'networking' },
    { event: 'Mental Health Awareness Week', date: '2024-04-22 to 2024-04-26', type: 'wellness' },
  ]);

  const [professorMessages] = useState([
    { from: 'Dr. Johnson (Data Structures)', subject: 'Jordan\'s Outstanding Project Work', date: '2024-03-15', read: true, priority: 'positive' },
    { from: 'Prof. Smith (Database Systems)', subject: 'Research Opportunity Available', date: '2024-03-12', read: false, priority: 'high' },
    { from: 'Academic Advisor', subject: 'Graduation Planning Meeting', date: '2024-03-10', read: false, priority: 'high' },
    { from: 'Career Services', subject: 'Internship Opportunity at Tech Corp', date: '2024-03-08', read: true, priority: 'normal' },
  ]);

  const [gpaTrend] = useState([
    { semester: 'Fall 2021', gpa: 3.2 },
    { semester: 'Spring 2022', gpa: 3.4 },
    { semester: 'Fall 2022', gpa: 3.5 },
    { semester: 'Spring 2023', gpa: 3.6 },
    { semester: 'Fall 2023', gpa: 3.7 },
    { semester: 'Spring 2024', gpa: 3.7 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Parent Portal - {parentInfo.name} 👨‍🎓</h1>
            <p className="text-slate-400">Supporting {childInfo.name}'s University Journey • {childInfo.program}</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Contact Academic Advisor
          </Button>
        </div>

        {/* Child Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Current GPA</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{childInfo.gpa}</div>
              <p className="text-xs text-slate-400 mt-2">Out of 4.0 scale</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Credits Completed</CardTitle>
              <BookOpen className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{childInfo.creditsCompleted}/120</div>
              <p className="text-xs text-slate-400 mt-2">Total degree credits</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Academic Standing</CardTitle>
              <Award className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-white">Dean's List</div>
              <p className="text-xs text-slate-400 mt-2">3 semesters</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Research Involvement</CardTitle>
              <GraduationCap className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">Active</div>
              <p className="text-xs text-slate-400 mt-2">AI Research Project</p>
            </CardContent>
          </Card>
        </div>

        {/* University Parent Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              Academic Overview
            </TabsTrigger>
            <TabsTrigger value="courses" className="text-slate-300 data-[state=active]:text-white">
              Current Courses
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-slate-300 data-[state=active]:text-white">
              Academic Performance
            </TabsTrigger>
            <TabsTrigger value="career" className="text-slate-300 data-[state=active]:text-white">
              Career Development
            </TabsTrigger>
            <TabsTrigger value="finances" className="text-slate-300 data-[state=active]:text-white">
              Finances & Billing
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-slate-300 data-[state=active]:text-white">
              University Communication
            </TabsTrigger>
            <TabsTrigger value="events" className="text-slate-300 data-[state=active]:text-white">
              University Events
            </TabsTrigger>
            <TabsTrigger value="support" className="text-slate-300 data-[state=active]:text-white">
              Student Support
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* GPA Trend */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Academic Performance Trend</CardTitle>
                  <CardDescription className="text-slate-400">GPA progression throughout university</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={gpaTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis stroke="#94a3b8" dataKey="semester" />
                      <YAxis stroke="#94a3b8" domain={[3.0, 4.0]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Line type="monotone" dataKey="gpa" stroke="#10B981" strokeWidth={2} name="GPA" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Student Status Summary */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">{childInfo.name}'s University Status</CardTitle>
                  <CardDescription className="text-slate-400">Current academic and campus status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Program:</span>
                      <span className="text-sm font-semibold text-white">{childInfo.program}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Year:</span>
                      <span className="text-sm font-semibold text-blue-400">{childInfo.year}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Residence:</span>
                      <span className="text-sm font-semibold text-green-400">{childInfo.residence}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Academic Advisor:</span>
                      <span className="text-sm font-semibold text-white">{childInfo.counselor}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Extracurricular:</span>
                      <span className="text-sm font-semibold text-purple-400">CS Society, Research Assistant</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Expected Graduation:</span>
                      <span className="text-sm font-semibold text-yellow-400">May 2026</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
                <CardDescription className="text-slate-400">Common parent tasks and requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center gap-2 h-20">
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-xs">Message Professors</span>
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white flex flex-col items-center gap-2 h-20">
                    <Eye className="h-5 w-5" />
                    <span className="text-xs">View Transcript</span>
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white flex flex-col items-center gap-2 h-20">
                    <Calendar className="h-5 w-5" />
                    <span className="text-xs">Schedule Meeting</span>
                  </Button>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white flex flex-col items-center gap-2 h-20">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-xs">Pay Tuition</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Current Semester Courses</CardTitle>
                <CardDescription className="text-slate-400">Detailed view of enrolled courses and instructors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {academicProgress.map((course, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{course.course}</p>
                          <p className="text-xs text-slate-400">Instructor: {course.instructor} • {course.credits} credits</p>
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
                          Course Syllabus
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Contact Instructor
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Academic Performance Analysis</CardTitle>
                <CardDescription className="text-slate-400">Detailed analysis of grades, trends, and academic standing</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Academic performance analytics interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="career">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Career Development & Opportunities</CardTitle>
                <CardDescription className="text-slate-400">Internships, job fairs, resume workshops, and career counseling</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {careerDevelopment.map((activity, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${
                      activity.status === 'registered' ? 'bg-green-900/20 border-green-700/50' :
                      activity.status === 'interested' ? 'bg-blue-900/20 border-blue-700/50' :
                      'bg-slate-700/30 border-slate-600/30'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{activity.activity}</p>
                          <p className="text-xs text-slate-400">{activity.date}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.status === 'registered' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          activity.status === 'interested' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                          'bg-gray-900/30 text-gray-300 border border-gray-800/50'
                        }`}>
                          {activity.status === 'registered' ? '✓ Registered' :
                           activity.status === 'interested' ? '⭐ Interested' : '⏰ Upcoming'}
                        </span>
                      </div>
                      {activity.status === 'interested' && (
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

          <TabsContent value="finances">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">University Finances & Billing</CardTitle>
                <CardDescription className="text-slate-400">Tuition, housing, meal plans, and payment tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {financialOverview.map((item, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.item}</p>
                          <p className="text-xs text-slate-400">Due: {item.dueDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">GHS {item.amount}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                            item.status === 'paid' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                            'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                          }`}>
                            {item.status === 'paid' ? '✓ Paid' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      {item.paidDate && (
                        <p className="text-xs text-slate-500">Paid on: {item.paidDate}</p>
                      )}
                      {item.status === 'pending' && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 mt-2">
                          Pay Now
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">University Communication</CardTitle>
                <CardDescription className="text-slate-400">Messages from professors, advisors, and university administration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {professorMessages.map((message, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${
                      message.read ? 'bg-slate-700/30 border-slate-600/30' :
                      'bg-blue-900/20 border-blue-700/50'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{message.subject}</p>
                          <p className="text-xs text-slate-400">From: {message.from}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">{message.date}</p>
                          {!message.read && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white mt-1">
                              New
                            </span>
                          )}
                          {message.priority === 'high' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-600 text-white mt-1">
                              High Priority
                            </span>
                          )}
                          {message.priority === 'positive' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-600 text-white mt-1">
                              Positive
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          {message.read ? 'View Message' : 'Read Message'}
                        </Button>
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Reply
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">University Events & Activities</CardTitle>
                <CardDescription className="text-slate-400">Research symposiums, career fairs, cultural events, and networking opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {universityEvents.map((event, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{event.event}</p>
                          <p className="text-xs text-slate-400">{event.date}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.type === 'academic' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                          event.type === 'career' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          event.type === 'cultural' ? 'bg-purple-900/30 text-purple-300 border border-purple-800/50' :
                          event.type === 'networking' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50' :
                          'bg-pink-900/30 text-pink-300 border border-pink-800/50'
                        }`}>
                          {event.type === 'academic' ? '📚 Academic' :
                           event.type === 'career' ? '💼 Career' :
                           event.type === 'cultural' ? '🎭 Cultural' :
                           event.type === 'networking' ? '🤝 Networking' : '❤️ Wellness'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Learn More
                        </Button>
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Add to Calendar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Support Services</CardTitle>
                <CardDescription className="text-slate-400">Counseling, tutoring, disability services, and academic support</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Student support services interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
