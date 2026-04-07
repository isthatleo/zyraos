// Utility to get current tenant from request
// This file must remain Edge-compatible (no Node.js modules like 'pg' or 'crypto')
export function getTenantFromRequest(request: Request | any): string | null {
  const host = (request instanceof Request 
    ? request.headers.get('host') 
    : request.headers?.host || request.host) || '';
    
  const subdomain = host.split('.')[0];

  // If it's the main domain, return null (master)
  // We check against common local hosts and the environment variable
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';
  
  // Normalize host and mainDomain for comparison (remove protocol if exists, though host usually doesn't have it)
  const normalizedHost = host.toLowerCase();
  const normalizedMainDomain = mainDomain.toLowerCase();

  if (normalizedHost === normalizedMainDomain || subdomain === 'www' || subdomain === normalizedHost) {
    return null;
  }

  // Handle localhost subdomains: slug.localhost:3000
  if (normalizedHost.includes('localhost')) {
    const parts = normalizedHost.split('.');
    console.log('getTenantFromRequest: localhost parts =', parts);
    // If it's something.localhost or something.localhost:3000
    if (parts.length > 1) {
      // Check if the first part is NOT 'localhost'
      if (parts[0] !== 'localhost') {
        console.log('getTenantFromRequest: detected tenant =', parts[0]);
        return parts[0];
      }
    }
    return null;
  }

  return subdomain;
}
