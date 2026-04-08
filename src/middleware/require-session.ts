// Require session middleware
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../services/auth.service';

export async function requireSession(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;

  if (!sessionId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const session = await AuthService.validateSession(sessionId);
  if (!session.valid) {
    // Clear invalid session cookie
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session_id');
    return response;
  }

  // Add session info to headers
  const response = NextResponse.next();
  response.headers.set('x-session-id', sessionId);
  response.headers.set('x-user-id', session.userId);

  return response;
}
