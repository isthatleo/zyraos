'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, Calendar, TrendingUp, DollarSign, MessageSquare, Eye, BookOpen, Wrench, Shield, Award } from 'lucide-react';

export default function VocationalParentDashboard() {
  const [parentInfo] = useState({
    name: 'Mr. Asante',
    relationship: 'Father',
    children: 1,
    primaryChild: 'Michael Asante',
  });

  const [childInfo] = useState({
    name: 'Michael Asante',
    trade: 'Electrical Installation',
    level: 'Intermediate',
    completionRate: 75,
    safetyScore: 95,
    instructor: 'Mr. Johnson',
    workshop: 'Workshop A',
  });

  const [moduleProgress] = useState([
    { module: 'Circuit Design & Installation', progress: 85, grade: 'A', status: 'completed' },
    { module: 'Electrical Safety & Regulations', progress: 78, grade: 'A-', status: 'in-progress' },
    { module: 'Advanced Wiring Techniques', progress: 65, grade: 'B+', status: 'in-progress' },
    { module: 'Troubleshooting & Maintenance', progress: 45, grade: '-', status: 'upcoming' },
  ]);

  const [feePayments] = useState([
    { item: 'Training Fee', amount: 2800, dueDate: '2024-03-31', status: 'paid', paidDate: '2024-03-25' },
    { item: 'Equipment Fee', amount: 450, dueDate: '2024-03-31', status: 'paid', paidDate: '2024-03-28' },
    { item: 'Certification Fee', amount: 350, dueDate: '2024-04-30', status: 'pending', paidDate: null },
    { item: 'Safety Gear', amount: 200, dueDate: '2024-04-30', status: 'pending', paidDate: null },
    { item: 'Final Assessment Fee', amount: 150, dueDate: '2024-05-31', status: 'pending', paidDate: null },
  ]);

  const [jobApplications] = useState([
    { company: 'Electrical Contractors Ltd', position: 'Apprentice Electrician', status: 'Applied', appliedDate: '2024-02-15' },
    { company: 'Tech Maintenance Services', position: 'Electrical Technician', status: 'Interview Scheduled', appliedDate: '2024-02-20' },
  ]);

  const [workshopEvents] = useState([
    { event: 'Industry Site Visit', date: '2024-03-28', type: 'industry' },
    { event: 'Safety Training Workshop', date: '2024-04-05', type: 'training' },
    { event: 'Trade Certification Exam', date: '2024-04-12', type: 'assessment' },
    { event: 'Parent-Teacher Conference', date: '2024-04-18', type: 'meeting' },
    { event: 'Graduation Ceremony', date: '2024-06-15', type: 'ceremony' },
  ]);

  const [instructorMessages] = useState([
    { from: 'Mr. Johnson (Electrical Instructor)', subject: 'Michael\'s Excellent Practical Work', date: '2024-03-15', read: true, priority: 'positive' },
    { from: 'Safety Officer', subject: 'Safety Training Completion Certificate', date: '2024-03-12', read: false, priority: 'normal' },
    { from: 'Workshop Coordinator', subject: 'Equipment Maintenance Notice', date: '2024-03-10', read: true, priority: 'normal' },
    { from: 'Career Advisor', subject: 'Job Opportunity Alert', date: '2024-03-08', read: false, priority: 'high' },
  ]);

  const [safetyRecords] = useState([
    { date: '2024-03-15', incident: 'None', score: 98, notes: 'Perfect safety compliance' },
    { date: '2024-03-08', incident: 'Minor equipment handling', score: 92, notes: 'Improved with additional training' },
    { date: '2024-03-01', incident: 'None', score: 100, notes: 'Excellent safety practices' },
  ]);

  const [achievements] = useState([
    { title: 'Safety Excellence Award', description: 'Perfect safety record for 2 months', icon: '🛡️', date: 'March 2024' },
    { title: 'Best Practical Project', description: 'Circuit design competition winner', icon: '⚡', date: 'February 2024' },
    { title: 'Workshop Leadership', description: 'Led team safety drill', icon: '👑', date: 'January 2024' },
  ]);

  const [progressTrend] = useState([
    { month: 'Oct', practical: 65, theory: 70 },
    { month: 'Nov', practical: 72, theory: 75 },
    { month: 'Dec', practical: 78, theory: 80 },
    { month: 'Jan', practical: 82, theory: 85 },
    { month: 'Feb', practical: 85, theory: 88 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Parent Portal - {parentInfo.name} 👨‍👦</h1>
            <p className="text-slate-400">Supporting {childInfo.name}'s Vocational Training • {childInfo.trade}</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Contact Instructor
          </Button>
        </div>

        {/* Child Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{childInfo.completionRate}%</div>
              <p className="text-xs text-slate-400 mt-2">Program progress</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Safety Score</CardTitle>
              <Shield className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{childInfo.safetyScore}%</div>
              <p className="text-xs text-slate-400 mt-2">Workshop safety rating</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Practical Hours</CardTitle>
              <Wrench className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">240</div>
              <p className="text-xs text-slate-400 mt-2">Hours completed</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Job Applications</CardTitle>
              <BookOpen className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{jobApplications.length}</div>
              <p className="text-xs text-slate-400 mt-2">Active applications</p>
            </CardContent>
          </Card>
        </div>

        {/* Vocational Parent Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              Training Overview
            </TabsTrigger>
            <TabsTrigger value="modules" className="text-slate-300 data-[state=active]:text-white">
              Module Progress
            </TabsTrigger>
            <TabsTrigger value="safety" className="text-slate-300 data-[state=active]:text-white">
              Safety Records
            </TabsTrigger>
            <TabsTrigger value="jobs" className="text-slate-300 data-[state=active]:text-white">
              Job Opportunities
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-slate-300 data-[state=active]:text-white">
              Achievements
            </TabsTrigger>
            <TabsTrigger value="fees" className="text-slate-300 data-[state=active]:text-white">
              Fees & Payments
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-slate-300 data-[state=active]:text-white">
              Workshop Communication
            </TabsTrigger>
            <TabsTrigger value="events" className="text-slate-300 data-[state=active]:text-white">
              Workshop Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Progress Trend */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Skill Development Trend</CardTitle>
                  <CardDescription className="text-slate-400">Practical and theoretical progress over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={progressTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis stroke="#94a3b8" dataKey="month" />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Legend />
                      <Bar dataKey="practical" fill="#10B981" name="Practical Skills" />
                      <Bar dataKey="theory" fill="#3B82F6" name="Theory" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Student Status Summary */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">{childInfo.name}'s Training Status</CardTitle>
                  <CardDescription className="text-slate-400">Current training progress and status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Trade:</span>
                      <span className="text-sm font-semibold text-white">{childInfo.trade}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Level:</span>
                      <span className="text-sm font-semibold text-blue-400">{childInfo.level}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Instructor:</span>
                      <span className="text-sm font-semibold text-white">{childInfo.instructor}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Workshop:</span>
                      <span className="text-sm font-semibold text-green-400">{childInfo.workshop}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Expected Completion:</span>
                      <span className="text-sm font-semibold text-yellow-400">December 2024</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Attendance Rate:</span>
                      <span className="text-sm font-semibold text-white">95%</span>
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
                    <span className="text-xs">Message Instructor</span>
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white flex flex-col items-center gap-2 h-20">
                    <Eye className="h-5 w-5" />
                    <span className="text-xs">View Progress Report</span>
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white flex flex-col items-center gap-2 h-20">
                    <Calendar className="h-5 w-5" />
                    <span className="text-xs">Schedule Workshop Visit</span>
                  </Button>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white flex flex-col items-center gap-2 h-20">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-xs">Pay Training Fees</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Module Progress</CardTitle>
                <CardDescription className="text-slate-400">Detailed progress through training modules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {moduleProgress.map((module, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{module.module}</p>
                          <p className="text-xs text-slate-400">Progress: {module.progress}%</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2 ${
                            module.status === 'completed' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                            module.status === 'in-progress' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                            'bg-gray-900/30 text-gray-300 border border-gray-800/50'
                          }`}>
                            {module.status === 'completed' ? '✓ Completed' :
                             module.status === 'in-progress' ? 'In Progress' : 'Upcoming'}
                          </span>
                          <p className="text-sm font-semibold text-white">{module.grade}</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                          style={{ width: `${module.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="safety" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Safety Records & Training</CardTitle>
                <CardDescription className="text-slate-400">Monitor safety compliance and training records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {safetyRecords.map((record, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{record.date}</p>
                          <p className="text-xs text-slate-400">Safety Score: {record.score}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Incident: {record.incident}</p>
                          <div className="w-16 bg-slate-600 rounded-full h-1 mt-1">
                            <div
                              className="bg-green-500 h-1 rounded-full"
                              style={{ width: `${record.score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{record.notes}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Job Applications & Opportunities</CardTitle>
                <CardDescription className="text-slate-400">Track job applications and apprenticeship opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jobApplications.map((job, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{job.position}</p>
                          <p className="text-xs text-slate-400">{job.company} • Applied: {job.appliedDate}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          job.status === 'Applied' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                          job.status === 'Interview Scheduled' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50' :
                          'bg-green-900/30 text-green-300 border border-green-800/50'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        View Application
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Training Achievements & Awards 🏆</CardTitle>
                <CardDescription className="text-slate-400">Safety awards, project recognitions, and skill certifications</CardDescription>
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
                <CardTitle className="text-white">Training Fees & Payment History</CardTitle>
                <CardDescription className="text-slate-400">Track training fees, equipment costs, and certification fees</CardDescription>
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
                <CardTitle className="text-white">Workshop Communication</CardTitle>
                <CardDescription className="text-slate-400">Messages from instructors, safety officers, and workshop coordinators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {instructorMessages.map((message, i) => (
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
                <CardTitle className="text-white">Workshop Events & Activities</CardTitle>
                <CardDescription className="text-slate-400">Industry visits, safety training, assessments, and workshop events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workshopEvents.map((event, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{event.event}</p>
                          <p className="text-xs text-slate-400">{event.date}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.type === 'industry' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                          event.type === 'training' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          event.type === 'assessment' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50' :
                          event.type === 'meeting' ? 'bg-purple-900/30 text-purple-300 border border-purple-800/50' :
                          'bg-pink-900/30 text-pink-300 border border-pink-800/50'
                        }`}>
                          {event.type === 'industry' ? '🏭 Industry' :
                           event.type === 'training' ? '🎓 Training' :
                           event.type === 'assessment' ? '📝 Assessment' :
                           event.type === 'meeting' ? '👥 Meeting' : '🎓 Ceremony'}
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
        </Tabs>
      </div>
    </div>
  );
}
