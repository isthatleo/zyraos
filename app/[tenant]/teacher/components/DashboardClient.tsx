"use client";
import React, { useEffect, useState } from "react";
import AssignmentModal from "./AssignmentModal";
import RoleSelector from "./RoleSelector";
import GradeModal from "./GradeModal";
import { ToastProvider, useToast } from "./ToastProvider";

type Tenant = string;

function InnerDashboard({
  initialData,
  tenant,
  initialRole,
}: {
  initialData: any;
  tenant: Tenant;
  initialRole?: string | null;
}) {
  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [role, setRole] = useState<string | null>(initialRole ?? null);

  const toast = useToast();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/dashboard?tenant=${encodeURIComponent(tenant)}`, {
        headers: { "x-user-role": role ?? "" },
        cache: "no-store",
      });
      if (res.ok) {
        setData(await res.json());
      } else {
        const text = await res.text();
        toast.addToast({ type: "error", title: "Dashboard error", message: text || `Status ${res.status}` });
      }
    } catch (err) {
      console.error(err);
      toast.addToast({ type: "error", title: "Network error", message: "Failed to refresh dashboard" });
    } finally {
      setLoading(false);
    }
  }

  function onRoleChange(newRole: string) {
    setRole(newRole);
    document.cookie = `teacher_role=${encodeURIComponent(newRole)}; path=/`;
    refresh();
  }

  async function openGradesQuick() {
    try {
      const res = await fetch(`/api/teacher/grades?tenant=${encodeURIComponent(tenant)}`, {
        headers: { "x-user-role": role ?? "" },
      });
      if (!res.ok) {
        const txt = await res.text();
        toast.addToast({ type: "error", title: "Grades failed", message: txt || `Status ${res.status}` });
        return;
      }
      const json = await res.json();
      toast.addToast({ type: "info", title: "Grades loaded", message: `${json?.classes?.length ?? "?"} classes` });
    } catch (err) {
      console.error(err);
      toast.addToast({ type: "error", title: "Grades failed", message: "Network error" });
    }
  }

  async function openAttendanceQuick() {
    try {
      const res = await fetch(`/api/teacher/attendance?tenant=${encodeURIComponent(tenant)}`, {
        headers: { "x-user-role": role ?? "" },
      });
      if (!res.ok) {
        const txt = await res.text();
        toast.addToast({ type: "error", title: "Attendance failed", message: txt || `Status ${res.status}` });
        return;
      }
      const json = await res.json();
      toast.addToast({ type: "info", title: "Attendance snapshot", message: `${json.present} present, ${json.absent} absent` });
    } catch (err) {
      console.error(err);
      toast.addToast({ type: "error", title: "Attendance failed", message: "Network error" });
    }
  }

  async function openAssessmentsQuick() {
    try {
      const res = await fetch(`/api/teacher/assessments?tenant=${encodeURIComponent(tenant)}`, {
        headers: { "x-user-role": role ?? "" },
      });
      if (!res.ok) {
        const txt = await res.text();
        toast.addToast({ type: "error", title: "Assessments failed", message: txt || `Status ${res.status}` });
        return;
      }
      const json = await res.json();
      toast.addToast({ type: "info", title: "Assessments", message: `${json.assessments?.length ?? 0} assessments` });
    } catch (err) {
      console.error(err);
      toast.addToast({ type: "error", title: "Assessments failed", message: "Network error" });
    }
  }

  async function exportGradesCSV() {
    try {
      const res = await fetch(`/api/teacher/export?tenant=${encodeURIComponent(tenant)}`, {
        headers: { "x-user-role": role ?? "" },
      });
      if (!res.ok) {
        const txt = await res.text();
        toast.addToast({ type: "error", title: "Export failed", message: txt || `Status ${res.status}` });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grades-${tenant}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.addToast({ type: "success", title: "Export", message: "Grades exported" });
    } catch (err) {
      console.error(err);
      toast.addToast({ type: "error", title: "Export failed", message: "Network error" });
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Welcome back{role ? `, ${role}` : ""}</h2>
          <p>{loading ? "Refreshing..." : "Overview of your classes and actions"}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <RoleSelector initialRole={role ?? "primary_teacher"} onChange={onRoleChange} />
          <button onClick={refresh}>Refresh</button>
          <button onClick={() => setShowAssignmentModal(true)}>New Assignment</button>
          <button onClick={() => setShowGradeModal(true)}>Record Grade</button>
        </div>
      </div>

      {/* Summary cards */}
      <section style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ padding: 16, border: "1px solid #ddd", minWidth: 200 }}>
          <h3>Classes</h3>
          <p>{data?.classes?.length ?? "—"} active</p>
          <p style={{ color: "#666", marginTop: 8 }}>
            {data?.classes?.slice(0, 3).map((c: any) => c.name).join(", ") || "No classes loaded"}
          </p>
        </div>

        <div style={{ padding: 16, border: "1px solid #ddd", minWidth: 200 }}>
          <h3>Upcoming Assignments</h3>
          <p>{(data?.upcomingAssignments ?? []).length} due soon</p>
          <p style={{ color: "#666", marginTop: 8 }}>{(data?.upcomingAssignments ?? []).slice(0, 2).map((a:any)=>a.title).join(", ")}</p>
        </div>

        <div style={{ padding: 16, border: "1px solid #ddd", minWidth: 200 }}>
          <h3>Notifications</h3>
          <p>{(data?.notifications ?? []).length} unread</p>
        </div>

        <div style={{ padding: 16, border: "1px solid #ddd", minWidth: 200 }}>
          <h3>Average Grade</h3>
          <p>{data?.averageGrade ?? "—"}</p>
        </div>

        <div style={{ padding: 16, border: "1px solid #ddd", minWidth: 200 }}>
          <h3>Assessments</h3>
          <p>{(data?.assessments ?? []).length} scheduled</p>
        </div>

        <div style={{ padding: 16, border: "1px solid #ddd", minWidth: 200 }}>
          <h3>Students</h3>
          <p>{(data?.studentsCount ?? "—")} students</p>
        </div>
      </section>

      {/* Quick actions */}
      <section style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <button onClick={() => setShowAssignmentModal(true)}>Quick: Create Assignment</button>
        <button onClick={openGradesQuick}>Quick: Open Grades</button>
        <button onClick={openAttendanceQuick}>Quick: Attendance Snapshot</button>
        <button onClick={openAssessmentsQuick}>Quick: Assessments</button>
        <button onClick={exportGradesCSV}>Export: Grades CSV</button>
      </section>

      {/* Upcoming assignments list */}
      <section style={{ marginTop: 8 }}>
        <h3>Upcoming assignments</h3>
        <ul>
          {(data?.upcomingAssignments ?? []).map((a: any) => (
            <li key={a.id}>
              <strong>{a.title}</strong> — due {new Date(a.dueDate).toLocaleString()}
            </li>
          ))}
          {(!data?.upcomingAssignments || data.upcomingAssignments.length === 0) && <li>None</li>}
        </ul>
      </section>

      {/* Assignment modal */}
      {showAssignmentModal && (
        <AssignmentModal
          tenant={tenant}
          role={role ?? "primary_teacher"}
          onClose={() => setShowAssignmentModal(false)}
          onCreated={() => {
            setShowAssignmentModal(false);
            refresh();
            toast.addToast({ type: "success", title: "Assignment created", message: "Assignment was successfully created" });
          }}
        />
      )}

      {/* Grade modal */}
      {showGradeModal && (
        <GradeModal
          tenant={tenant}
          role={role ?? "primary_teacher"}
          onCloseAction={() => setShowGradeModal(false)}
          onCreatedAction={() => {
            setShowGradeModal(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

export default function DashboardClient(props: { initialData: any; tenant: Tenant; initialRole?: string | null }) {
  return (
    <ToastProvider>
      <InnerDashboard {...props} />
    </ToastProvider>
  );
}

