"use client";
import React, { useEffect, useState } from "react";
import { useToast } from "./ToastProvider";

export default function GradeModal({
  tenant,
  role,
  onCloseAction,
  onCreatedAction,
}: {
  tenant: string;
  role: string;
  onCloseAction: () => void;
  onCreatedAction: () => void;
}) {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [classId, setClassId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [score, setScore] = useState<number | "">("");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);

  const toast = useToast();

  useEffect(() => {
    // Fetch classes & subjects from dashboard
    fetch(`/api/teacher/dashboard?tenant=${encodeURIComponent(tenant)}`, {
      headers: { "x-user-role": role ?? "" },
    })
      .then((r) => r.json())
      .then((json) => {
        setClasses(json?.classes ?? []);
        setSubjects(json?.subjects ?? []);
      })
      .catch((err) => {
        console.error(err);
        toast.addToast({ type: "error", title: "Load failed", message: "Failed to load classes/subjects" });
      });
  }, [tenant, role]);

  useEffect(() => {
    setStudentId("");
    setStudents([]);
    if (!classId) return;
    fetch(`/api/teacher/students?tenant=${encodeURIComponent(tenant)}&classId=${encodeURIComponent(classId)}`, {
      headers: { "x-user-role": role ?? "" },
    })
      .then((r) => r.json())
      .then((json) => setStudents(json?.students ?? []))
      .catch((err) => {
        console.error(err);
        toast.addToast({ type: "error", title: "Load failed", message: "Failed to load students" });
      });
  }, [classId, tenant, role]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classId || !subjectId || !studentId || score === "") {
      toast.addToast({ type: "warning", title: "Missing fields", message: "Please complete all fields." });
      return;
    }
    setSaving(true);
    try {
      const payload = { tenant, classId, subjectId, studentId, score, comments };
      const res = await fetch(`/api/teacher/grades?tenant=${encodeURIComponent(tenant)}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-user-role": role ?? "" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.addToast({ type: "error", title: "Save failed", message: json?.error ?? "Unknown error" });
        setSaving(false);
        return;
      }
      toast.addToast({ type: "success", title: "Grade saved", message: `Saved grade for ${json.studentId}` });
      onCreatedAction();
    } catch (err) {
      console.error(err);
      toast.addToast({ type: "error", title: "Save failed", message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onCloseAction}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 620, background: "#fff", padding: 20, borderRadius: 8 }}>
        <h3>Record Grade</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              Class
              <select value={classId} onChange={(e) => setClassId(e.target.value)} required>
                <option value="">-- select class --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Subject
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
                <option value="">-- select subject --</option>
                {subjects
                  .filter((s: any) => !s.classId || s.classId === classId) // allow subjects per class or global
                  .map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Student
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                <option value="">-- select student --</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Score
              <input
                type="number"
                min={0}
                max={100}
                value={score === "" ? "" : String(score)}
                onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
            </label>

            <label>
              Comments
              <textarea value={comments} onChange={(e) => setComments(e.target.value)} />
            </label>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={onCloseAction} disabled={saving}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Grade"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

