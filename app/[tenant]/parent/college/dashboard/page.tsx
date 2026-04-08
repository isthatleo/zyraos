'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, Calendar, TrendingUp, DollarSign, MessageSquare, Eye, BookOpen, Briefcase, Award } from 'lucide-react';

export default function CollegeParentDashboard() {
  const [parentInfo] = useState({
    name: 'Mrs. Okafor',
    relationship: 'Mother',
    children: 1,
    primaryChild: 'Jennifer Okafor',
  });

  const [childInfo] = useState({
    name: 'Jennifer Okafor',
    program: 'Business Administration',
    year: '2nd Year',
    gpa: 3.4,
    creditsCompleted: 65,
    counselor: 'Ms. Johnson',
    internshipStatus: 'Applied',
  });

  const [academicProgress] = useState([
    { course: 'Marketing Principles', grade: 'A-', instructor: 'Dr. Johnson', credits: 3 },
    { course: 'Financial Accounting', grade: 'B+', instructor: 'Prof. Smith', credits: 3 },
    { course: 'Business Statistics', grade: 'A', instructor: 'Ms. Davis', credits: 3 },
    { course: 'Entrepreneurship', grade: 'A-', instructor: 'Dr. Williams', credits: 3 },
  ]);

  const [feePayments] = useState([
    { item: 'Tuition Fee', amount: 4500, dueDate: '2024-03-31', status: 'paid', paidDate: '2024-03-25' },
    { item: 'Examination Fee', amount: 300, dueDate: '2024-03-31', status: 'paid', paidDate: '2024-03-28' },
    { item: 'Activity Fee', amount: 250, dueDate: '2024-04-30', status: 'pending', paidDate: null },
    { item: 'Lab Fee', amount: 150, dueDate: '2024-04-30', status: 'pending', paidDate: null },
    { item: 'Library Fee', amount: 100, dueDate: '2024-05-31', status: 'pending', paidDate: null },
  ]);

  const [internshipTracking] = useState({
    status: 'Application Submitted',
    company: 'TechStart Solutions',
    position: 'Marketing Assistant',
    appliedDate: '2024-02-15',
    nextStep: 'Interview scheduled for March 20',
    progress: 60,
  });

  const [collegeEvents] = useState([
    { event: 'Career Fair', date: '2024-03-28', type: 'career' },
    { event: 'Business Plan Competition', date: '2024-04-05', type: 'academic' },
    { event: 'Industry Guest Lecture', date: '2024-04-12', type: 'industry' },
    { event: 'PTA Meeting', date: '2024-04-18', type: 'parent' },
    { event: 'Graduation Ceremony', date: '2024-06-15', type: 'ceremony' },
  ]);

  const [teacherMessages] = useState([
    { from: 'Dr. Johnson (Marketing)', subject: 'Jennifer\'s Excellent Presentation', date: '2024-03-15', read: true, priority: 'positive' },
    { from: 'Prof. Smith (Accounting)', subject: 'Internship Opportunity', date: '2024-03-12', read: false, priority: 'high' },
    { from: 'Career Services', subject: 'Resume Review Session Available', date: '2024-03-10', read: false, priority: 'normal' },
    { from: 'Student Counselor', subject: 'Academic Advising Session', date: '2024-03-08', read: true, priority: 'normal' },
  ]);

  const [performanceTrend] = useState([
    { semester: 'Fall 2022', gpa: 3.1 },
    { semester: 'Spring 2023', gpa: 3.3 },
    { semester: 'Fall 2023', gpa: 3.4 },
    { semester: 'Spring 2024', gpa: 3.4 },
  ]);

  const [achievements] = useState([
    { title: 'Deans List', description: 'Fall 2023 Semester', icon: '🏆', date: 'December 2023' },
    { title: 'Business Plan Winner', description: 'Inter-College Competition', icon: '💼', date: 'November 2023' },
    { title: 'Leadership Award', description: 'Business Club President', icon: '👑', date: 'October 2023' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Parent Portal - {parentInfo.name} 👩‍👧</h1>
            <p className="text-slate-400">Supporting {childInfo.name}'s College Journey • {childInfo.program}</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Contact Career Advisor
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
              <div className="text-2xl font-bold text-white">{childInfo.creditsCompleted}/90</div>
              <p className="text-xs text-slate-400 mt-2">Diploma credits</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Internship Status</CardTitle>
              <Briefcase className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-white">{childInfo.internshipStatus}</div>
              <p className="text-xs text-slate-400 mt-2">Application in progress</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Achievements</CardTitle>
              <Award className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{achievements.length}</div>
              <p className="text-xs text-slate-400 mt-2">This academic year</p>
            </CardContent>
          </Card>
        </div>

        {/* College Parent Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              Academic Overview
            </TabsTrigger>
            <TabsTrigger value="courses" className="text-slate-300 data-[state=active]:text-white">
              Current Courses
            </TabsTrigger>
            <TabsTrigger value="internships" className="text-slate-300 data-[state=active]:text-white">
              Internship Tracking
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-slate-300 data-[state=active]:text-white">
              Achievements
            </TabsTrigger>
            <TabsTrigger value="fees" className="text-slate-300 data-[state=active]:text-white">
              Fees & Payments
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-slate-300 data-[state=active]:text-white">
              College Communication
            </TabsTrigger>
            <TabsTrigger value="events" className="text-slate-300 data-[state=active]:text-white">
              College Events
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
                  <CardDescription className="text-slate-400">GPA progression throughout college</CardDescription>
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

              {/* Student Status Summary */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">{childInfo.name}'s College Status</CardTitle>
                  <CardDescription className="text-slate-400">Current academic and career status</CardDescription>
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
                      <span className="text-sm text-slate-400">Academic Advisor:</span>
                      <span className="text-sm font-semibold text-white">{childInfo.counselor}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Expected Completion:</span>
                      <span className="text-sm font-semibold text-green-400">May 2025</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Extracurricular:</span>
                      <span className="text-sm font-semibold text-purple-400">Business Club, Marketing Society</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Attendance Rate:</span>
                      <span className="text-sm font-semibold text-white">94%</span>
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
                    <span className="text-xs">Message Instructors</span>
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white flex flex-col items-center gap-2 h-20">
                    <Eye className="h-5 w-5" />
                    <span className="text-xs">View Grades</span>
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white flex flex-col items-center gap-2 h-20">
                    <Calendar className="h-5 w-5" />
                    <span className="text-xs">Schedule Meeting</span>
                  </Button>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white flex flex-col items-center gap-2 h-20">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-xs">Pay Outstanding Fees</span>
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
                          Course Materials
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

          <TabsContent value="internships" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Internship Application Tracking</CardTitle>
                <CardDescription className="text-slate-400">Monitor internship applications and progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{internshipTracking.position}</p>
                      <p className="text-xs text-slate-400">{internshipTracking.company}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      internshipTracking.status === 'Application Submitted' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                      'bg-green-900/30 text-green-300 border border-green-800/50'
                    }`}>
                      {internshipTracking.status}
                    </span>
                  </div>
                  <div className="space-y-2 mb-3">
                    <p className="text-xs text-slate-400">Applied: {internshipTracking.appliedDate}</p>
                    <p className="text-xs text-slate-400">Next Step: {internshipTracking.nextStep}</p>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2 mb-3">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${internshipTracking.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mb-3">Application Progress: {internshipTracking.progress}%</p>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    View Application Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Academic Achievements & Awards 🏆</CardTitle>
                <CardDescription className="text-slate-400">Awards, certificates, and special recognitions</CardDescription>
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

          <TabsContent value="fees" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">College Fees & Payment History</CardTitle>
                <CardDescription className="text-slate-400">Track tuition, fees, and payment schedules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {feePayments.map((fee, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{fee.item}</p>
                          <p className="text-xs text-slate-400">Due: {fee.dueDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">GHS {fee.amount}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                            fee.status === 'paid' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                            'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                          }`}>
                            {fee.status === 'paid' ? '✓ Paid' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      {fee.paidDate && (
                        <p className="text-xs text-slate-500">Paid on: {fee.paidDate}</p>
                      )}
                      {fee.status === 'pending' && (
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

          <TabsContent value="communication" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">College Communication</CardTitle>
                <CardDescription className="text-slate-400">Messages from instructors, counselors, and college administration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teacherMessages.map((message, i) => (
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

          <TabsContent value="events" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">College Events & Activities</CardTitle>
                <CardDescription className="text-slate-400">Career fairs, competitions, guest lectures, and college events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {collegeEvents.map((event, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{event.event}</p>
                          <p className="text-xs text-slate-400">{event.date}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.type === 'career' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                          event.type === 'academic' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          event.type === 'industry' ? 'bg-purple-900/30 text-purple-300 border border-purple-800/50' :
                          event.type === 'parent' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50' :
                          'bg-pink-900/30 text-pink-300 border border-pink-800/50'
                        }`}>
                          {event.type === 'career' ? '💼 Career' :
                           event.type === 'academic' ? '📚 Academic' :
                           event.type === 'industry' ? '🏭 Industry' :
                           event.type === 'parent' ? '👨‍👩‍👧 Parent' : '🎓 Ceremony'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Learn More
                        </Button>
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          RSVP
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Support Services</CardTitle>
                <CardDescription className="text-slate-400">Academic advising, counseling, tutoring, and career guidance</CardDescription>
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
