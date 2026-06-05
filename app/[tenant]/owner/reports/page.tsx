"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Download, FileImage, FileText, Pencil, Printer, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  title: string;
  category: string;
  description: string;
  sections: string[];
  cadence: string;
  audience: string;
  customized?: boolean;
};

type ReportsPayload = {
  templates: Template[];
  school: {
    displayName: string;
    currency: string;
    logoUrl?: string | null;
    schoolSealUrl?: string | null;
    reportCardWatermarkUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    motto?: string | null;
  };
  generatedAt: string;
  summary: {
    students: number;
    staff: number;
    billed: number;
    outstanding: number;
    collectionRate: number;
    attendanceRate: number;
    performanceAverage: number;
    platformDue: number;
  };
};

type GeneratedReport = {
  template: Template;
  html: string;
  generatedAt: string;
  fileName: string;
};

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: React.ElementType }) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OwnerReportsPage() {
  const params = useParams<{ tenant: string }>();
  const router = useRouter();
  const tenantSlug = String(params?.tenant || "");
  const [data, setData] = React.useState<ReportsPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [generatingId, setGeneratingId] = React.useState<string | null>(null);
  const [generated, setGenerated] = React.useState<GeneratedReport | null>(null);
  const [exportFormat, setExportFormat] = React.useState<"pdf" | "png" | "html">("pdf");
  const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = React.useState<Template | null>(null);
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = React.useState<string | null>(null);
  const [templateForm, setTemplateForm] = React.useState({ title: "", category: "", description: "", sections: "", cadence: "", audience: "" });

  const currency = React.useMemo(() => new Intl.NumberFormat("en", { style: "currency", currency: data?.school.currency || "ZAR", maximumFractionDigits: 0 }), [data?.school.currency]);
  const tenantHref = React.useCallback((path: string) => (typeof window !== "undefined" && getTenantSubdomain(window.location.host) ? path : `/${tenantSlug}${path}`), [tenantSlug]);

  const load = React.useCallback(async (quiet = false) => {
    if (!tenantSlug) return;
    setError(null);
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const response = await fetch(`/api/tenant/owner/reports?tenant=${tenantSlug}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load owner reports");
      setData(payload);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to load owner reports";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantSlug]);

  React.useEffect(() => { void load(); }, [load]);

  const openEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setTemplateForm({
      title: template.title,
      category: template.category,
      description: template.description,
      sections: template.sections.join(", "),
      cadence: template.cadence,
      audience: template.audience,
    });
  };

  const saveTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTemplate) return;
    setSavingTemplate(true);
    try {
      const response = await fetch(`/api/tenant/owner/reports?tenant=${tenantSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          templateId: editingTemplate.id,
          ...templateForm,
          sections: templateForm.sections.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to update report template");
      setData((current) => current ? { ...current, templates: payload.templates || current.templates } : current);
      if (generated?.template.id === editingTemplate.id && payload.template) setGenerated((current) => current ? { ...current, template: payload.template } : current);
      setEditingTemplate(null);
      toast.success("Template updated");
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to update report template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async () => {
    if (!deletingTemplate) return;
    setDeletingTemplateId(deletingTemplate.id);
    try {
      const response = await fetch(`/api/tenant/owner/reports?tenant=${tenantSlug}&templateId=${deletingTemplate.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to delete report template");
      setData((current) => current ? { ...current, templates: payload.templates || current.templates.filter((item) => item.id !== deletingTemplate.id) } : current);
      if (generated?.template.id === deletingTemplate.id) setGenerated(null);
      setDeletingTemplate(null);
      toast.success("Template deleted for this tenant");
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to delete report template");
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const categories = React.useMemo(() => ["all", ...Array.from(new Set((data?.templates || []).map((item) => item.category))).sort()], [data?.templates]);
  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.templates || []).filter((template) => {
      const matchesTerm = !term || [template.title, template.category, template.description, template.audience, template.cadence].some((value) => value.toLowerCase().includes(term));
      const matchesCategory = category === "all" || template.category === category;
      return matchesTerm && matchesCategory;
    });
  }, [category, data?.templates, query]);

  const generate = async (templateId: string) => {
    setGeneratingId(templateId);
    try {
      const response = await fetch(`/api/tenant/owner/reports?tenant=${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templateId, format: exportFormat }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to generate report");
      setGenerated(payload);
      toast.success("Report generated");
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to generate report");
    } finally {
      setGeneratingId(null);
    }
  };

  const printReport = () => {
    if (!generated) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return toast.error("Popup blocked. Allow popups to print this report.");
    printWindow.document.write(generated.html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const downloadReport = () => {
    if (!generated) return;
    const blob = new Blob([generated.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = generated.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadPngSnapshot = () => {
    if (!generated) return;
    const escaped = generated.html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:1240px;height:1754px;overflow:hidden;background:white">${escaped}</div></foreignObject></svg>`;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1240;
      canvas.height = 1754;
      const context = canvas.getContext("2d");
      if (!context) return toast.error("PNG export is not supported in this browser.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return toast.error("Failed to create PNG report.");
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = generated.fileName.replace(/\.html$/i, ".png");
        anchor.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    image.onerror = () => toast.error("Failed to render PNG snapshot.");
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  const exportGeneratedReport = () => {
    if (exportFormat === "pdf") return printReport();
    if (exportFormat === "png") return downloadPngSnapshot();
    return downloadReport();
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-36 rounded-3xl" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Reports failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No report data was returned for this tenant."}</span>
          <Button variant="secondary" onClick={() => void load()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm backdrop-blur">
        <CardContent className="p-0">
          <div className="relative isolate p-6 md:p-8">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_38%),linear-gradient(135deg,hsl(var(--muted)/0.45),transparent)]" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex max-w-3xl gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-border/80 bg-background/80 text-xl font-semibold text-primary shadow-sm">
                  {data.school.logoUrl ? (
                    <img src={data.school.logoUrl} alt={`${data.school.displayName} logo`} className="h-full w-full object-cover" />
                  ) : (
                    data.school.displayName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                <Badge className="mb-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner reporting suite</Badge>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Reports</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Generate professional branded reports with school letterhead, logo, real operational metrics, finance data, HR data, attendance, academics, and governance sections.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Loaded for {data.school.displayName}
                  {data.school.motto ? ` • ${data.school.motto}` : ""}
                  {[data.school.address, data.school.phone, data.school.email, data.school.website].filter(Boolean).length ? (
                    <span className="block pt-1">
                      {[data.school.address, data.school.phone, data.school.email, data.school.website].filter(Boolean).join(" • ")}
                    </span>
                  ) : null}
                </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/finance"))}>Finance overview <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Templates" value={data.templates.length} detail="Professional owner reports" icon={FileText} />
        <StatCard label="Collection rate" value={`${data.summary.collectionRate}%`} detail={`${currency.format(data.summary.outstanding)} outstanding`} icon={Wallet} />
        <StatCard label="Attendance" value={`${data.summary.attendanceRate}%`} detail={`${data.summary.students} students tracked`} icon={ShieldCheck} />
        <StatCard label="Platform due" value={currency.format(data.summary.platformDue)} detail="Converted tenant dashboard currency where applicable" icon={Sparkles} />
      </div>

      <Tabs defaultValue="templates" className="space-y-5">
        <TabsList className="mx-auto flex h-auto w-fit flex-wrap justify-center rounded-full bg-muted/70 p-1">
          <TabsTrigger value="templates" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Templates</TabsTrigger>
          <TabsTrigger value="preview" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Generated Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates, audience, cadence..." className="pl-9" />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((item) => <SelectItem key={item} value={item}>{item === "all" ? "All categories" : item}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((template) => (
              <Card key={template.id} className="group border-border/70 bg-card/80 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full">{template.category}</Badge>
                        {template.customized ? <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Edited</Badge> : null}
                      </div>
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                      <CardDescription className="mt-2 leading-6">{template.description}</CardDescription>
                    </div>
                    <div className="rounded-2xl bg-primary/10 p-2 text-primary"><FileText className="h-5 w-5" /></div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-2xl bg-muted/40 p-3"><p className="text-muted-foreground">Cadence</p><p className="mt-1 font-medium">{template.cadence}</p></div>
                    <div className="rounded-2xl bg-muted/40 p-3"><p className="text-muted-foreground">Audience</p><p className="mt-1 font-medium">{template.audience}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {template.sections.slice(0, 5).map((section) => <Badge key={section} variant="secondary" className="rounded-full capitalize">{section}</Badge>)}
                    {template.sections.length > 5 ? <Badge variant="secondary" className="rounded-full">+{template.sections.length - 5}</Badge> : null}
                  </div>
                  <div className="grid grid-cols-3 gap-2 rounded-2xl border bg-muted/25 p-2 text-xs">
                    <button type="button" onClick={() => setExportFormat("pdf")} className={cn("rounded-xl px-2 py-2 font-medium transition", exportFormat === "pdf" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>PDF</button>
                    <button type="button" onClick={() => setExportFormat("png")} className={cn("rounded-xl px-2 py-2 font-medium transition", exportFormat === "png" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>PNG</button>
                    <button type="button" onClick={() => setExportFormat("html")} className={cn("rounded-xl px-2 py-2 font-medium transition", exportFormat === "html" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>HTML</button>
                  </div>
                  <Button className="w-full" onClick={() => void generate(template.id)} disabled={generatingId === template.id}>
                    {generatingId === template.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate Report
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={() => openEditTemplate(template)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
                    <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeletingTemplate(template)} disabled={deletingTemplateId === template.id}>
                      {deletingTemplateId === template.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>{generated ? generated.template.title : "No report generated yet"}</CardTitle>
                <CardDescription>{generated ? `Generated ${new Date(generated.generatedAt).toLocaleString()}` : "Generate a report from the templates tab to preview it here."}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as "pdf" | "png" | "html")}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF default</SelectItem>
                    <SelectItem value="png">PNG image</SelectItem>
                    <SelectItem value="html">HTML file</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" disabled={!generated} onClick={downloadReport}><Download className="mr-2 h-4 w-4" />HTML</Button>
                <Button disabled={!generated} onClick={exportGeneratedReport}>
                  {exportFormat === "png" ? <FileImage className="mr-2 h-4 w-4" /> : exportFormat === "html" ? <Download className="mr-2 h-4 w-4" /> : <Printer className="mr-2 h-4 w-4" />}
                  Export {exportFormat.toUpperCase()}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {generated ? (
                <iframe title="Generated report preview" srcDoc={generated.html} className="h-[760px] w-full rounded-3xl border bg-white" />
              ) : (
                <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed text-center">
                  <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">No report preview</p>
                  <p className="mt-1 text-sm text-muted-foreground">Choose one of the 20 report templates and click Generate Report.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={Boolean(editingTemplate)} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <form onSubmit={saveTemplate} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Edit report template</DialogTitle>
              <DialogDescription>Changes are saved for this tenant and will be used the next time this report is generated.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={templateForm.title} onChange={(event) => setTemplateForm((current) => ({ ...current, title: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={templateForm.category} onChange={(event) => setTemplateForm((current) => ({ ...current, category: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Cadence</Label>
                <Input value={templateForm.cadence} onChange={(event) => setTemplateForm((current) => ({ ...current, cadence: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Input value={templateForm.audience} onChange={(event) => setTemplateForm((current) => ({ ...current, audience: event.target.value }))} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea value={templateForm.description} onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))} className="min-h-28" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Sections</Label>
                <Textarea value={templateForm.sections} onChange={(event) => setTemplateForm((current) => ({ ...current, sections: event.target.value }))} className="min-h-24" placeholder="executive, finance, billing" />
                <p className="text-xs text-muted-foreground">Allowed: executive, finance, payments, invoices, people, leave, payroll, attendance, academics, communications, governance, billing.</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
              <Button type="submit" disabled={savingTemplate}>{savingTemplate ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}Save template</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(deletingTemplate)} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete report template?</DialogTitle>
            <DialogDescription>
              This hides "{deletingTemplate?.title}" from this tenant's owner reports. It will no longer be available for generation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingTemplate(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => void deleteTemplate()} disabled={Boolean(deletingTemplateId)}>
              {deletingTemplateId ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
