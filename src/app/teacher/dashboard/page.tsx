/**
 * Teacher Dashboard Main Page
 * Path: src/app/teacher/dashboard/page.tsx
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock, AlertCircle, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function TeacherDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    todayPeriods: 0,
    pendingGrading: 0,
    averageScore: 0,
    attendanceRate: 0,
  });

  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/teacher/dashboard', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load dashboard (${res.status})`);
      const json = await res.json();

      // Map to local UI state with safe fallbacks
      const metrics = json?.metrics || {};
      setStats((s) => ({
        ...s,
        totalClasses: metrics.classes ?? (json?.classes?.length ?? 0),
        totalStudents: metrics.students ?? (json?.learners?.length ?? 0),
        todayPeriods: metrics.lessonsToday ?? (json?.todaysLessons?.length ?? 0),
        pendingGrading: metrics.pendingGrading ?? 0,
        averageScore: metrics.averageScore ?? 0,
        attendanceRate: metrics.attendanceRate ?? 0,
      }));

      setMyClasses((json?.classes || []).map((c: any) => ({
        id: c.id,
        name: c.name || c.className || 'Class',
        subject: c.subject || c.subject || '',
        students: c.students ?? 0,
        room: c.room ?? '',
        nextClass: c.timetableEntries ? `${c.timetableEntries} schedules` : '—',
      })));

      setTodaySchedule(json?.todaysLessons || json?.timetable?.slice(0, 8) || []);

      // Build pending tasks from assessments/alerts
      const alerts = json?.alerts || [];
      const assessments = json?.assessments || [];
      const tasks = [] as any[];
      if (assessments.length) tasks.push({ id: 'assess', title: 'Pending Assessments', count: assessments.length, dueDate: 'Soon', priority: 'high' });
      if (alerts.length) tasks.push({ id: 'alerts', title: 'Learner Alerts', count: alerts.length, dueDate: 'Now', priority: 'high' });
      tasks.push({ id: 'attendance', title: 'Update Attendance Records', count: 0, dueDate: 'This Week', priority: 'low' });
      setPendingTasks(tasks);
    } catch (err: any) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Teacher Dashboard</h1>
        <p className="text-slate-400">Welcome back — here is your teaching overview.</p>
        <div className="mt-2 text-sm">
          <span className="text-slate-400 mr-3">{loading ? 'Refreshing...' : `Updated: ${new Date().toLocaleString()}`}</span>
          {error && <span className="text-red-400">Error: {error}</span>}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">My Classes</CardTitle>
            <BookOpen className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalClasses}</div>
            <p className="text-xs text-slate-400 mt-2">Classes assigned</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Students</CardTitle>
            <Users className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalStudents}</div>
            <p className="text-xs text-slate-400 mt-2">Across all classes</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Today's Periods</CardTitle>
            <Clock className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.todayPeriods}</div>
            <p className="text-xs text-slate-400 mt-2">Classes scheduled</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Pending Grading</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.pendingGrading}</div>
            <p className="text-xs text-slate-400 mt-2">Assignments to grade</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule & My Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Today's Schedule</CardTitle>
            <CardDescription className="text-slate-400">Classes and periods for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaySchedule.length === 0 && <p className="text-slate-400">No lessons scheduled for today</p>}
              {todaySchedule.map((period, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 flex items-center gap-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{period.time || period.startTime || period.period || 'TBD'}</p>
                    <p className="text-xs text-slate-400">{period.className || period.class || period.subject || 'Lesson'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-300">Room {period.room || period.room || '-'}</p>
                    {Number(period.students) > 0 && (
                      <p className="text-xs text-slate-500">{period.students} students</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Pending Tasks</CardTitle>
            <CardDescription className="text-slate-400">Items awaiting attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 bg-slate-700/30 rounded-lg border ${
                    task.priority === 'high'
                      ? 'border-red-600/30'
                      : task.priority === 'medium'
                      ? 'border-yellow-600/30'
                      : 'border-slate-600/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-white">{task.title}</p>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        task.priority === 'high'
                          ? 'bg-red-900/30 text-red-300'
                          : task.priority === 'medium'
                          ? 'bg-yellow-900/30 text-yellow-300'
                          : 'bg-green-900/30 text-green-300'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">
                      {task.count > 0 ? `${task.count} items` : 'View details'}
                    </span>
                    <span className="text-xs text-slate-500">Due: {task.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Classes Grid */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">My Classes</CardTitle>
          <CardDescription className="text-slate-400">All assigned classes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myClasses.map((cls) => (
              <div
                key={cls.id}
                onClick={() => router.push(`/teacher/classes/${encodeURIComponent(cls.id)}`)}
                className="p-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg border border-slate-600/30 hover:border-blue-500/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{cls.name}</h3>
                    <p className="text-xs text-slate-400">{cls.subject}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-800/50">
                    Room {cls.room}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-600/30">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Users className="h-4 w-4" />
                    <span>{cls.students} students</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-300">{cls.nextClass}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowAttendanceModal(true)}>
              Mark Attendance
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowGradeModal(true)}>
              Enter Grades
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowAnalytics(true)}>
              View Analytics
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => setShowMessageModal(true)}>
              Message Parents
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {showAnalytics && (
        <AnalyticsModal onClose={() => setShowAnalytics(false)} metrics={stats} />
      )}

      {showAttendanceModal && (
        <AttendanceModal onClose={() => setShowAttendanceModal(false)} learnersEndpoint="/api/teacher/dashboard" submitEndpoint="/api/teacher/dashboard" refresh={fetchData} />
      )}

      {showGradeModal && (
        <GradeModal onClose={() => setShowGradeModal(false)} submitEndpoint="/api/teacher/dashboard" refresh={fetchData} />
      )}

      {showMessageModal && (
        <MessageModal onClose={() => setShowMessageModal(false)} refresh={fetchData} />
      )}
    </div>
  );
}

function AnalyticsModal({ onClose, metrics }: { onClose: () => void; metrics: any }) {
  const data = [
    { name: 'Avg Score', value: Math.round(metrics.averageScore || 0) },
    { name: 'Attendance', value: Math.round(metrics.attendanceRate || 0) },
    { name: 'Pending', value: Math.round(metrics.pendingGrading || 0) },
  ];
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-900 p-6 rounded w-11/12 max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Analytics</h3>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="value" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function AttendanceModal({ onClose, learnersEndpoint, submitEndpoint, refresh }: { onClose: () => void; learnersEndpoint: string; submitEndpoint: string; refresh: () => void }) {
  const [learners, setLearners] = useState<any[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch(learnersEndpoint, { cache: 'no-store' }).then((r) => r.json()).then((json) => {
      if (!mounted) return;
      const learnersData = json?.learners?.slice(0, 200) || [];
      setLearners(learnersData);
      setRecords(learnersData.map((l: any) => ({ studentId: l.id, classId: l.classId, status: 'present' })));
    }).catch((e) => console.error(e));
    return () => { mounted = false; }
  }, [learnersEndpoint]);

  function setStatus(studentId: string, status: string) {
    setRecords((prev) => prev.map((r) => r.studentId === studentId ? { ...r, status } : r));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = { action: 'attendance.mark-daily', date, records };
      const res = await fetch(submitEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Attendance saved');
      refresh();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save attendance: ' + (err.message || String(err)));
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-900 p-6 rounded w-11/12 max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Mark Attendance</h3>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="mb-4">
          <label className="text-sm text-slate-300">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ml-2 bg-slate-800 text-white p-2 rounded" />
        </div>
        <div className="max-h-80 overflow-y-auto mb-4">
          {learners.map((l) => (
            <div key={l.id} className="flex items-center justify-between p-2 border-b border-slate-700">
              <div>
                <div className="text-sm text-white">{l.name}</div>
                <div className="text-xs text-slate-400">{l.className}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStatus(l.id, 'present')} className="px-2 py-1 rounded bg-green-600 text-white">P</button>
                <button onClick={() => setStatus(l.id, 'late')} className="px-2 py-1 rounded bg-yellow-600 text-white">L</button>
                <button onClick={() => setStatus(l.id, 'absent')} className="px-2 py-1 rounded bg-red-600 text-white">A</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Attendance'}</Button>
        </div>
      </div>
    </div>
  );
}

function GradeModal({ onClose, submitEndpoint, refresh }: { onClose: () => void; submitEndpoint: string; refresh: () => void }) {
  const [title, setTitle] = useState('Quick Assignment');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  // classes/subjects wired so teacher can choose target class & subject
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    // fetch available classes/subjects from dashboard endpoint
    fetch('/api/teacher/dashboard', { cache: 'no-store' }).then((r) => r.json()).then((json) => {
      if (!mounted) return;
      const cls = json?.classes || [];
      const subs = json?.subjects || json?.subjectsList || [];
      setClasses(cls);
      setSubjects(subs);
      if (cls.length === 1) setSelectedClassId(cls[0].id || '');
      if (subs.length === 1) setSelectedSubjectId(subs[0].id || subs[0].name || '');
    }).catch((e) => console.error(e));
    return () => { mounted = false; };
  }, []);

  async function submit() {
    setSubmitting(true);
    try {
      const payload = {
        action: 'assessment.create',
        name: title,
        description,
        dueDate,
        classId: selectedClassId || undefined,
        subjectId: selectedSubjectId || undefined,
      };
      const res = await fetch(submitEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Assessment created');
      refresh();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to create assessment: ' + (err.message || String(err)));
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-900 p-6 rounded w-11/12 max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Create Quick Assessment</h3>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="grid grid-cols-1 gap-3 mb-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="p-2 bg-slate-800 text-white rounded" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="p-2 bg-slate-800 text-white rounded" />
          <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="p-2 bg-slate-800 text-white rounded" />
          <div className="flex gap-2">
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="p-2 bg-slate-800 text-white rounded flex-1">
              <option value="">Select class (optional)</option>
              {classes.map((c) => (
                <option key={c.id || c.classId || c.name} value={c.id || c.classId || c.name}>{c.name || c.className || c.title}</option>
              ))}
            </select>
            <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="p-2 bg-slate-800 text-white rounded flex-1">
              <option value="">Select subject (optional)</option>
              {subjects.map((s) => (
                <option key={s.id || s.name} value={s.id || s.name}>{s.name || s.title}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</Button>
        </div>
      </div>
    </div>
  );
}

function MessageModal({ onClose, refresh }: { onClose: () => void; refresh: () => void }) {
  const [conversationId, setConversationId] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!conversationId || !content) return toast.error('Conversation and message are required');
    setSending(true);
    try {
      const res = await fetch('/api/tenant/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, senderId: 'me', content }) });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Message sent');
      refresh();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to send message: ' + (err.message || String(err)));
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-900 p-6 rounded w-11/12 max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Message Parents / Guardians</h3>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 mb-4">
          <input value={conversationId} onChange={(e) => setConversationId(e.target.value)} placeholder="Conversation ID (or parent email)" className="p-2 bg-slate-800 text-white rounded" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Message" className="p-2 bg-slate-800 text-white rounded" />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sending}>{sending ? 'Sending...' : 'Send'}</Button>
        </div>
      </div>
    </div>
  );
}
