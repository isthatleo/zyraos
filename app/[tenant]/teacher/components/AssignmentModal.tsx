"use client";
import React, { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";

export default function AssignmentModal({
  tenant,
  role,
  onClose,
  onCreated,
}: {
  tenant: string;
  role: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [classId, setClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const toast = useToast();

  useEffect(() => {
    // load classes for selection
    fetch(`/api/teacher/dashboard?tenant=${encodeURIComponent(tenant)}`, {
      headers: { "x-user-role": role ?? "" },
    })
      .then((r) => r.json())
      .then((json) => setClasses(json?.classes ?? []))
      .catch((e) => {
        console.error(e);
        toast.addToast({ type: "error", title: "Load failed", message: "Failed to load classes" });
      });
  }, [tenant, role]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      // Upload attachments (if any) first
      const attachmentUrls: string[] = [];
      for (const f of files) {
        const form = new FormData();
        form.append("file", f);
        form.append("tenant", tenant);

        const res = await fetch(`/api/teacher/attachments`, {
          method: "POST",
          body: form,
          headers: { "x-user-role": role ?? "" },
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Upload failed");
        }
        const json = await res.json();
        if (json?.url) attachmentUrls.push(json.url);
      }

      // Create assignment
      const payload = {
        tenant,
        title,
        description,
        dueDate,
        classId,
        attachments: attachmentUrls,
      };
      const res2 = await fetch(`/api/teacher/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": role ?? "",
        },
        body: JSON.stringify(payload),
      });
      const result = await res2.json().catch(() => null);
      if (!res2.ok) {
        toast.addToast({ type: "error", title: "Create failed", message: result?.error ?? "Failed to create assignment" });
        setUploading(false);
        return;
      }
      toast.addToast({ type: "success", title: "Assignment created", message: `ID ${result?.id ?? "unknown"}` });
      onCreated();
    } catch (err) {
      console.error(err);
      toast.addToast({ type: "error", title: "Error", message: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 700, background: "white", padding: 20, borderRadius: 8 }}
      >
        <h3>Create Assignment</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label>
              Due date
              <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <label>
              Class
              <select value={classId ?? ""} onChange={(e) => setClassId(e.target.value)}>
                <option value="">-- select class --</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Attach files
              <input
                type="file"
                multiple
                onChange={(e) => {
                  const fl = e.target.files;
                  if (!fl) return;
                  setFiles(Array.from(fl));
                }}
              />
              <div>
                {files.map((f) => (
                  <div key={f.name}>
                    {f.name} ({Math.round(f.size / 1024)} KB)
                  </div>
                ))}
              </div>
            </label>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={onClose} disabled={uploading}>
                Cancel
              </button>
              <button type="submit" disabled={uploading}>
                {uploading ? "Creating..." : "Create Assignment"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

