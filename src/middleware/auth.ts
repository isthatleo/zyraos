// Auth middleware
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../services/auth.service';

export async function authMiddleware(request: NextRequest) {
  const token = AuthService.extractTokenFromRequest(request);

  if (!token) {
    return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
  }

  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // Add user info to request headers for downstream use
  const response = NextResponse.next();
  response.headers.set('x-user-id', decoded.userId || decoded.id);
  response.headers.set('x-user-role', decoded.role || 'user');

  return response;
}
