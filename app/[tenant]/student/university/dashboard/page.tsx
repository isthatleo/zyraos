'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BookOpen, Clock, TrendingUp, Award, Calendar, Star, Briefcase, Users, GraduationCap } from 'lucide-react';

export default function UniversityStudentDashboard() {
  const [studentInfo] = useState({
    name: 'Jordan Mitchell',
    program: 'Computer Science',
    year: 'Junior (3rd Year)',
    studentId: 'CS2023001',
    gpa: 3.7,
    creditsCompleted: 98,
    totalCredits: 120,
    expectedGraduation: 'May 2026',
  });

  const [currentSemester] = useState([
    { course: 'Data Structures & Algorithms', code: 'CS301', credits: 3, instructor: 'Dr. Johnson', schedule: 'MWF 10:00-11:30', grade: 'A-' },
    { course: 'Database Systems', code: 'CS305', credits: 3, instructor: 'Prof. Smith', schedule: 'TTh 13:00-14:30', grade: 'B+' },
    { course: 'Software Engineering', code: 'CS401', credits: 4, instructor: 'Dr. Williams', schedule: 'MWF 14:00-15:30', grade: 'A' },
    { course: 'Web Development', code: 'CS310', credits: 3, instructor: 'Ms. Davis', schedule: 'TTh 09:00-10:30', grade: 'A' },
  ]);

  const [upcomingDeadlines] = useState([
    { course: 'CS301', assignment: 'Algorithm Analysis Project', due: '2024-03-25', type: 'project', weight: 25 },
    { course: 'CS305', assignment: 'Database Design Final', due: '2024-04-02', type: 'exam', weight: 30 },
    { course: 'CS401', assignment: 'Software Requirements Document', due: '2024-03-28', type: 'assignment', weight: 20 },
    { course: 'CS310', assignment: 'Portfolio Website', due: '2024-04-05', type: 'project', weight: 35 },
  ]);

  const [gpaTrend] = useState([
    { semester: 'Fall 2021', gpa: 3.2 },
    { semester: 'Spring 2022', gpa: 3.4 },
    { semester: 'Fall 2022', gpa: 3.5 },
    { semester: 'Spring 2023', gpa: 3.6 },
    { semester: 'Fall 2023', gpa: 3.7 },
    { semester: 'Spring 2024', gpa: 3.7 },
  ]);

  const [careerServices] = useState([
    { service: 'Resume Workshop', date: 'March 20, 2024', type: 'workshop' },
    { service: 'Tech Company Career Fair', date: 'April 10, 2024', type: 'event' },
    { service: 'Mock Interview Session', date: 'March 15, 2024', type: 'workshop' },
    { service: 'Internship Application Deadline', date: 'April 30, 2024', type: 'deadline' },
  ]);

  const [researchOpportunities] = useState([
    { title: 'AI Research Assistant', professor: 'Dr. Johnson', department: 'Computer Science', deadline: 'March 30' },
    { title: 'Data Science Project', professor: 'Prof. Smith', department: 'Statistics', deadline: 'April 15' },
  ]);

  const [achievements] = useState([
    { title: 'Dean\'s List', description: 'Fall 2023 Semester', icon: '🏆', date: 'December 2023' },
    { title: 'Programming Competition Winner', description: 'Inter-College Coding Challenge', icon: '💻', date: 'November 2023' },
    { title: 'Research Publication', description: 'Co-author on AI paper', icon: '📚', date: 'October 2023' },
    { title: 'Leadership Award', description: 'Computer Science Society President', icon: '👑', date: 'September 2023' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Welcome, {studentInfo.name}! ����</h1>
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
              <CardTitle className="text-sm font-medium text-slate-200">Expected Graduation</CardTitle>
              <Award className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-white">{studentInfo.expectedGraduation}</div>
              <p className="text-xs text-slate-400 mt-2">On track for graduation</p>
            </CardContent>
          </Card>
        </div>

        {/* University Student Tabs */}
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
            <TabsTrigger value="performance" className="text-slate-300 data-[state=active]:text-white">
              Academic Performance
            </TabsTrigger>
            <TabsTrigger value="career" className="text-slate-300 data-[state=active]:text-white">
              Career Services
            </TabsTrigger>
            <TabsTrigger value="research" className="text-slate-300 data-[state=active]:text-white">
              Research Opportunities
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
                  <CardTitle className="text-white">GPA Trend</CardTitle>
                  <CardDescription className="text-slate-400">Your academic performance over time</CardDescription>
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
                      <span className="text-sm font-semibold text-white">13</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Dean\'s List:</span>
                      <span className="text-sm font-semibold text-yellow-400">3 semesters</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Research Involvement:</span>
                      <span className="text-sm font-semibold text-purple-400">Active</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Extracurricular:</span>
                      <span className="text-sm font-semibold text-blue-400">Computer Science Society</span>
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
                      <p className="text-xs text-slate-400 mb-3">Schedule: {course.schedule}</p>
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
                <CardTitle className="text-white">Upcoming Assignments & Deadlines</CardTitle>
                <CardDescription className="text-slate-400">Exams, projects, and assignments due soon</CardDescription>
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

          <TabsContent value="performance">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Academic Performance Analytics</CardTitle>
                <CardDescription className="text-slate-400">Detailed analysis of your academic progress and standing</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Performance analytics interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="career">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Career Services & Opportunities</CardTitle>
                <CardDescription className="text-slate-400">Job fairs, internships, resume workshops, and career counseling</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {careerServices.map((service, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{service.service}</p>
                          <p className="text-xs text-slate-400">{service.date}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          service.type === 'workshop' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                          service.type === 'event' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          'bg-red-900/30 text-red-300 border border-red-800/50'
                        }`}>
                          {service.type === 'workshop' ? '🎓 Workshop' :
                           service.type === 'event' ? '🎪 Event' : '⏰ Deadline'}
                        </span>
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 mt-2">
                        Register
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="research">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Research Opportunities</CardTitle>
                <CardDescription className="text-slate-400">Undergraduate research positions and academic projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {researchOpportunities.map((opportunity, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{opportunity.title}</p>
                          <p className="text-xs text-slate-400">{opportunity.professor} • {opportunity.department}</p>
                        </div>
                        <Users className="h-5 w-5 text-blue-400" />
                      </div>
                      <p className="text-xs text-slate-400 mb-3">Application Deadline: {opportunity.deadline}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Learn More
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Apply
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Academic Achievements & Awards 🏆</CardTitle>
                <CardDescription className="text-slate-400">Honors, awards, publications, and special recognitions</CardDescription>
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

          <TabsContent value="resources">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Resources & Support</CardTitle>
                <CardDescription className="text-slate-400">Academic support, counseling, tutoring, and campus resources</CardDescription>
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
