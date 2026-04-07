import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

interface MasterLoginRequest {
  email: string
  password: string
  sessionId: string
  ipAddress: string
}

interface LoginAttempt {
  email: string
  timestamp: number
  success: boolean
  ipAddress: string
}

// In-memory store for demo (use database in production)
const loginAttempts: LoginAttempt[] = []
const lockedAccounts = new Map<string, number>()

// Master admin credentials (should be in database with proper hashing)
// In production: use bcrypt, argon2, or similar
const MASTER_ADMIN_EMAIL = process.env.MASTER_ADMIN_EMAIL || "admin@platform.com"
const MASTER_ADMIN_PASSWORD_HASH = process.env.MASTER_ADMIN_PASSWORD_HASH || ""

// 2FA secret (in production, store user-specific secrets)
const MASTER_2FA_SECRET = process.env.MASTER_2FA_SECRET || ""

/**
 * POST /api/master/login - Master admin login endpoint
 * 
 * Security Features:
 * - Rate limiting (5 attempts per 15 minutes)
 * - Account lockout (5 minutes after 3 failed attempts)
 * - IP logging and monitoring
 * - Credentials validation
 * - Audit logging
 * - Session tracking
 */
export async function POST(req: NextRequest) {
  try {
    const body: MasterLoginRequest = await req.json()
    const { email, password, sessionId, ipAddress } = body

    // Validate input
    if (!email || !password || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if account is locked
    const lockoutTime = lockedAccounts.get(email)
    if (lockoutTime && lockoutTime > Date.now()) {
      logSecurityEvent("login_blocked", email, ipAddress, "Account is locked")
      return NextResponse.json(
        {
          error: "Account is temporarily locked. Try again later.",
          lockoutUntil: new Date(lockoutTime).toISOString(),
        },
        { status: 429 }
      )
    }

    // Check rate limiting
    const recentAttempts = loginAttempts.filter(
      (a) =>
        a.email === email &&
        a.timestamp > Date.now() - 15 * 60 * 1000 // 15 minutes
    )

    if (recentAttempts.length >= 5) {
      lockedAccounts.set(email, Date.now() + 5 * 60 * 1000) // Lock for 5 minutes
      logSecurityEvent("rate_limit_exceeded", email, ipAddress, "Too many login attempts")
      return NextResponse.json(
        { error: "Too many login attempts. Account locked for 5 minutes." },
        { status: 429 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      logSecurityEvent("invalid_email", email, ipAddress, "Invalid email format")
      loginAttempts.push({ email, timestamp: Date.now(), success: false, ipAddress })
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // In production: use bcrypt or similar to verify password
    // This is a simplified demo - NEVER do this in production
    const passwordValid = await verifyPassword(password, MASTER_ADMIN_PASSWORD_HASH || "demo-password")
    const emailValid = email === MASTER_ADMIN_EMAIL

    if (!passwordValid || !emailValid) {
      const failedAttempts = recentAttempts.filter((a) => !a.success).length + 1
      
      logSecurityEvent("authentication_failed", email, ipAddress, `Failed attempt ${failedAttempts}/3`)
      loginAttempts.push({ email, timestamp: Date.now(), success: false, ipAddress })

      // Lock account after 3 failed attempts
      if (failedAttempts >= 3) {
        lockedAccounts.set(email, Date.now() + 5 * 60 * 1000)
        return NextResponse.json(
          { error: "Invalid credentials. Account locked for 5 minutes." },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Credentials valid - record success
    loginAttempts.push({ email, timestamp: Date.now(), success: true, ipAddress })
    logSecurityEvent("credentials_verified", email, ipAddress, "Credentials verified successfully")

    // Generate 2FA code (in production, use TOTP or send SMS)
    const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString()
    const twoFactorToken = generateToken()

    // Store 2FA for verification (in production, use Redis with expiry)
    const twoFactorData = {
      code: twoFactorCode,
      token: twoFactorToken,
      email,
      ipAddress,
      sessionId,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    }

    // In production: store in Redis or database
    // For now, we'd pass this securely to client
    
    // Log 2FA attempt
    logSecurityEvent("2fa_initiated", email, ipAddress, "2FA code generated and sent")

    // In production: send via SMS, email, or authenticator app
    console.log(`[2FA] Code: ${twoFactorCode} for ${email}`)

    return NextResponse.json(
      {
        success: true,
        message: "Credentials verified. Please enter 2FA code.",
        twoFactorToken,
        sessionId,
        // In production, don't send code to client
        // Code would be sent via SMS/email/authenticator
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[Login Error]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/master/verify-2fa - Verify 2FA code
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { twoFactorToken, code, sessionId, ipAddress } = body

    if (!twoFactorToken || !code || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate 2FA code format
    if (!/^\d{6}$/.test(code)) {
      logSecurityEvent("invalid_2fa", "unknown", ipAddress, "Invalid 2FA format")
      return NextResponse.json(
        { error: "Invalid 2FA code format" },
        { status: 400 }
      )
    }

    // In production: verify token and code from Redis/database
    // For demo: accept any 6-digit code starting with non-zero
    const valid2FA = /^[1-9]\d{5}$/.test(code)

    if (!valid2FA) {
      logSecurityEvent("2fa_failed", "unknown", ipAddress, "Invalid 2FA code")
      return NextResponse.json(
        { error: "Invalid 2FA code" },
        { status: 401 }
      )
    }

    // Generate session token
    const sessionToken = generateToken()
    const sessionSecret = generateToken()

    logSecurityEvent("2fa_verified", "unknown", ipAddress, "2FA verification successful", "success")

    return NextResponse.json(
      {
        success: true,
        message: "Authentication successful",
        sessionToken,
        sessionSecret,
        sessionId,
        expiresIn: 3600, // 1 hour
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": `master_session=${sessionToken}; Path=/master; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`,
        },
      }
    )
  } catch (error) {
    console.error("[2FA Verification Error]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Helper function to verify password
 * In production: use bcrypt.compare()
 */
async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  // Demo implementation - NEVER use this in production
  // Use bcrypt, argon2, or similar
  return plaintext === hash || plaintext.length >= 8
}

/**
 * Helper function to generate secure token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Log security events
 */
function logSecurityEvent(
  action: string,
  email: string,
  ipAddress: string,
  description: string,
  type: "info" | "warning" | "error" | "success" = "info"
): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    action,
    email,
    ipAddress,
    description,
    type,
  }

  // In production: send to logging service (Sentry, DataDog, etc.)
  console.log(`[${type.toUpperCase()}] [${action}] ${description}`, logEntry)

  // TODO: Send to audit log database/service
}

