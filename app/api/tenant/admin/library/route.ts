import crypto from "node:crypto";

import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getTenantDbBySlug } from "@/lib/db";
import { isTenantAdminResponse, requireTenantAdmin } from "@/lib/tenant-admin-auth";
import { writeTenantAuditLog } from "@/lib/tenant-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
const LIBRARY_KEY = "admin_library";

const DEFAULT_LIBRARY = { books: [], loans: [], settings: { loanDays: 14, dailyFine: 0, allowReservations: true } };

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const next = Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

function asDate(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value as Row[] : [];
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Admin library ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function readLibrary(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>) {
  const [row] = await safeRows<Row>(() => tenantDb.execute(sql`select value from system_settings where key = ${LIBRARY_KEY} limit 1`), "read settings");
  const value = objectValue(row?.value);
  return {
    books: arrayValue(value.books),
    loans: arrayValue(value.loans),
    settings: { ...DEFAULT_LIBRARY.settings, ...objectValue(value.settings) },
  };
}

async function writeLibrary(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, library: { books: Row[]; loans: Row[]; settings: Row }) {
  await tenantDb.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${LIBRARY_KEY}, ${JSON.stringify(library)}::jsonb, 'operations', 'School library catalog and circulation', now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);
}

function normalizeBook(input: Row) {
  const copies = Math.max(0, asNumber(input.copies, 1));
  const available = Math.max(0, Math.min(copies, asNumber(input.available, copies)));
  return {
    id: asString(input.id) || `book_${crypto.randomUUID()}`,
    title: asString(input.title),
    author: asString(input.author),
    isbn: asString(input.isbn),
    category: asString(input.category, "General"),
    shelf: asString(input.shelf),
    copies,
    available,
    status: asString(input.status, "active"),
    notes: asString(input.notes),
    createdAt: asString(input.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeLoan(input: Row) {
  return {
    id: asString(input.id) || `loan_${crypto.randomUUID()}`,
    bookId: asString(input.bookId),
    studentId: asString(input.studentId),
    issuedAt: asDate(input.issuedAt) || new Date().toISOString().slice(0, 10),
    dueAt: asDate(input.dueAt),
    returnedAt: asDate(input.returnedAt),
    status: asString(input.status, "issued"),
    fine: asNumber(input.fine),
  };
}

function validateBook(book: ReturnType<typeof normalizeBook>) {
  const errors: string[] = [];
  if (!book.title) errors.push("Book title is required");
  if (!book.author) errors.push("Book author is required");
  if (book.copies < 0) errors.push("Copies cannot be negative");
  if (book.available > book.copies) errors.push("Available copies cannot exceed total copies");
  return errors;
}

function csvEscape(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Row[]) {
  const headers = ["id", "title", "author", "isbn", "category", "shelf", "copies", "available", "status"];
  return [headers.join(","), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(","))].join("\n");
}

async function studentRows(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>) {
  return safeRows<Row>(() => tenantDb.execute(sql`
    select s.id, s.admission_number, s.status, u.name, u.email, c.name as class_name
    from students s
    left join users u on u.id = s.user_id
    left join classes c on c.id = s.class_id
    where coalesce(s.status, 'active') <> 'deleted'
    order by u.name asc
  `), "students");
}

async function buildPayload(request: NextRequest, slug: string) {
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const tenantDb = await getTenantDbBySlug(slug);
  const search = request.nextUrl.searchParams.get("query")?.trim().toLowerCase() || "";
  const status = request.nextUrl.searchParams.get("status")?.trim().toLowerCase() || "all";
  const exportFormat = request.nextUrl.searchParams.get("export")?.trim().toLowerCase() || "";
  const library = await readLibrary(tenantDb);
  const students = await studentRows(tenantDb);
  const books = library.books.map(normalizeBook).filter((book) => {
    const matchesSearch = !search || [book.title, book.author, book.isbn, book.category, book.shelf].join(" ").toLowerCase().includes(search);
    const matchesStatus = status === "all" || book.status === status;
    return matchesSearch && matchesStatus;
  });
  const loans = library.loans.map(normalizeLoan);
  const today = new Date().toISOString().slice(0, 10);
  const activeLoans = loans.filter((loan) => loan.status === "issued");
  const overdueLoans = activeLoans.filter((loan) => loan.dueAt && loan.dueAt < today);
  const payload = {
    students: students.map((row) => ({ id: asString(row.id), name: asString(row.name, asString(row.email)), admissionNumber: asString(row.admission_number), className: asString(row.class_name), status: asString(row.status) })),
    library: { books, loans, settings: library.settings },
    summaries: {
      books: library.books.length,
      copies: library.books.reduce((sum, item) => sum + asNumber(objectValue(item).copies), 0),
      available: library.books.reduce((sum, item) => sum + asNumber(objectValue(item).available), 0),
      activeLoans: activeLoans.length,
      overdueLoans: overdueLoans.length,
      finesDue: overdueLoans.reduce((sum, loan) => {
        const days = loan.dueAt ? Math.max(0, Math.ceil((Date.now() - new Date(loan.dueAt).getTime()) / 86400000)) : 0;
        return sum + days * asNumber(library.settings.dailyFine);
      }, 0),
    },
    generatedAt: new Date().toISOString(),
  };
  if (exportFormat === "json") {
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.library.exported", resource: "library", resourceId: slug, changes: { format: "json", books: books.length } }).catch(() => undefined);
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${slug}-library.json"` } });
  }
  if (exportFormat === "csv") {
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.library.exported", resource: "library", resourceId: slug, changes: { format: "csv", books: books.length } }).catch(() => undefined);
    return new NextResponse(toCsv(books as unknown as Row[]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${slug}-library.csv"` } });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  return buildPayload(request, slug);
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const tenantDb = await getTenantDbBySlug(slug);
  const body = await request.json().catch(() => ({}));
  const action = asString(body.action);
  const library = await readLibrary(tenantDb);

  if (action === "book.upsert") {
    const book = normalizeBook(objectValue(body.book));
    const errors = validateBook(book);
    if (errors.length) return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 });
    library.books = [book, ...library.books.filter((item) => asString(objectValue(item).id) !== book.id)];
    await writeLibrary(tenantDb, library);
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.library.book.upserted", resource: "library", resourceId: book.id, changes: book }).catch(() => undefined);
  } else if (action === "loan.issue") {
    const loan = normalizeLoan(objectValue(body.loan));
    if (!loan.bookId || !loan.studentId) return NextResponse.json({ error: "Book and student are required" }, { status: 400 });
    const book = library.books.map(normalizeBook).find((item) => item.id === loan.bookId);
    if (!book || book.available <= 0) return NextResponse.json({ error: "No copies available for this book" }, { status: 400 });
    loan.dueAt ||= new Date(new Date(loan.issuedAt).getTime() + asNumber(library.settings.loanDays, 14) * 86400000).toISOString().slice(0, 10);
    library.books = library.books.map((item) => {
      const next = normalizeBook(item);
      return next.id === loan.bookId ? { ...next, available: Math.max(0, next.available - 1) } : next;
    });
    library.loans = [loan, ...library.loans.filter((item) => asString(objectValue(item).id) !== loan.id)];
    await writeLibrary(tenantDb, library);
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.library.loan.issued", resource: "library", resourceId: loan.id, changes: loan }).catch(() => undefined);
  } else if (action === "loan.return") {
    const loanId = asString(body.loanId);
    const loan = library.loans.map(normalizeLoan).find((item) => item.id === loanId);
    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    const returnedAt = new Date().toISOString().slice(0, 10);
    const daysLate = loan.dueAt ? Math.max(0, Math.ceil((new Date(returnedAt).getTime() - new Date(loan.dueAt).getTime()) / 86400000)) : 0;
    const fine = daysLate * asNumber(library.settings.dailyFine);
    library.loans = library.loans.map((item) => normalizeLoan(item).id === loanId ? { ...loan, status: "returned", returnedAt, fine } : item);
    library.books = library.books.map((item) => {
      const book = normalizeBook(item);
      return book.id === loan.bookId ? { ...book, available: Math.min(book.copies, book.available + 1) } : book;
    });
    await writeLibrary(tenantDb, library);
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.library.loan.returned", resource: "library", resourceId: loanId, changes: { returnedAt, fine } }).catch(() => undefined);
  } else if (action === "settings.save") {
    library.settings = { ...library.settings, ...objectValue(body.settings) };
    await writeLibrary(tenantDb, library);
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.library.settings.updated", resource: "library", resourceId: LIBRARY_KEY, changes: library.settings }).catch(() => undefined);
  } else {
    return NextResponse.json({ error: "Unsupported library action" }, { status: 400 });
  }
  return buildPayload(request, slug);
}

export async function DELETE(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  const type = request.nextUrl.searchParams.get("type") || "";
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!slug || !id) return NextResponse.json({ error: "Tenant slug and ID are required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const tenantDb = await getTenantDbBySlug(slug);
  const library = await readLibrary(tenantDb);
  if (type === "book") {
    const hasActiveLoan = library.loans.map(normalizeLoan).some((loan) => loan.bookId === id && loan.status === "issued");
    if (hasActiveLoan) return NextResponse.json({ error: "Cannot delete a book with active loans" }, { status: 400 });
    library.books = library.books.filter((item) => asString(objectValue(item).id) !== id);
  } else if (type === "loan") {
    library.loans = library.loans.filter((item) => asString(objectValue(item).id) !== id);
  } else {
    return NextResponse.json({ error: "Unsupported delete type" }, { status: 400 });
  }
  await writeLibrary(tenantDb, library);
  await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: `admin.library.${type}.deleted`, resource: "library", resourceId: id }).catch(() => undefined);
  return buildPayload(request, slug);
}
