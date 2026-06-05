export function normalizeDatabaseUrl(value: string | undefined) {
  if (!value) return value;

  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");

  try {
    const url = new URL(trimmed);
    if (["prefer", "require", "verify-ca"].includes(url.searchParams.get("sslmode") || "")) {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    const match = trimmed.match(/^(postgres(?:ql)?:\/\/)([^:/?#]+):(.+)@([^@/]+)(\/.*)$/i);
    if (!match) return trimmed;

    const [, protocol, username, password, host, rest] = match;
    const normalized = `${protocol}${encodeURIComponent(decodeURIComponent(username))}:${encodeURIComponent(
      decodeURIComponent(password)
    )}@${host}${rest}`;
    try {
      const url = new URL(normalized);
      if (["prefer", "require", "verify-ca"].includes(url.searchParams.get("sslmode") || "")) {
        url.searchParams.set("sslmode", "verify-full");
      }
      return url.toString();
    } catch {
      return normalized;
    }
  }
}
