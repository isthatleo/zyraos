"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Copy,
  Phone,
  Mail,
  Key,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

type RecoveryMethod = "recovery-code" | "backup-email" | "backup-phone"

export default function MasterRecoveryPage() {
  const [method, setMethod] = useState<RecoveryMethod>("recovery-code")
  const [email, setEmail] = useState("")
  const [recoveryCode, setRecoveryCode] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"method-select" | "verify" | "reset" | "success">("method-select")
  const [codeCopied, setCodeCopied] = useState(false)

  const router = useRouter()

  const handleRecoveryCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!recoveryCode || recoveryCode.length !== 32) {
      toast.error("Recovery code must be 32 characters")
      return
    }

    setLoading(true)
    try {
      // Verify recovery code
      const response = await fetch("/api/master/recovery/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recoveryCode,
          verificationCode,
        }),
      })

      if (!response.ok) {
        throw new Error("Invalid recovery code")
      }

      setStep("reset")
      toast.success("Recovery code verified. Set your new password.")
    } catch (error) {
      toast.error("Recovery code verification failed")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailRecovery = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error("Please enter email")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/master/recovery/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error("Failed to send email")
      }

      toast.success("Recovery email sent. Check your inbox.")
      setStep("verify")
    } catch (error) {
      toast.error("Failed to send recovery email")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword || !confirmPassword) {
      toast.error("Please enter password")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match")
      return
    }

    if (newPassword.length < 12) {
      toast.error("Password must be at least 12 characters")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/master/recovery/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          recoveryCode,
          newPassword,
          verificationCode,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to reset password")
      }

      setStep("success")
      toast.success("Password reset successful!")

      setTimeout(() => {
        router.push("/master/login")
      }, 2000)
    } catch (error) {
      toast.error("Password reset failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-900 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-900 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-amber-500/20 p-4 rounded-3xl border border-amber-500/30">
              <Shield className="h-12 w-12 text-amber-500" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Account Recovery</h1>
          <p className="text-slate-400">Regain access to your master admin account</p>
        </div>

        {/* Alert */}
        <Card className="bg-amber-500/10 border-amber-500/30 mb-6">
          <CardContent className="pt-6 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300 mb-1">Recovery Required</p>
              <p className="text-sm text-amber-200/80">
                This feature is for emergency access only. All recovery attempts are logged and monitored.
              </p>
            </div>
          </CardContent>
        </Card>

        {step === "method-select" && (
          <Card className="bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-xl border-slate-600/50 text-white">
            <CardHeader className="pb-4">
              <CardTitle>Select Recovery Method</CardTitle>
              <CardDescription>Choose how you want to verify your identity</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={method} onValueChange={(v) => setMethod(v as RecoveryMethod)}>
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="recovery-code" className="text-xs">
                    <Key className="h-4 w-4 mr-1" />
                    Recovery Code
                  </TabsTrigger>
                  <TabsTrigger value="backup-email" className="text-xs">
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="backup-phone" className="text-xs">
                    <Phone className="h-4 w-4 mr-1" />
                    Phone
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="recovery-code" className="space-y-4">
                  <form onSubmit={handleRecoveryCodeSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="recovery-code" className="text-slate-300 mb-2 block">
                        32-Character Recovery Code
                      </Label>
                      <Input
                        id="recovery-code"
                        placeholder="abc123def456ghi789jkl012mno345pqr"
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                        className="bg-slate-800/50 border-slate-600/50 text-white h-10 font-mono"
                        maxLength={32}
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        You received this code when you set up your account recovery options.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="verification" className="text-slate-300 mb-2 block">
                        Verification Code (from email/SMS)
                      </Label>
                      <Input
                        id="verification"
                        placeholder="000000"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                        className="bg-slate-800/50 border-slate-600/50 text-white h-10 text-center text-2xl tracking-widest"
                        maxLength={6}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                      Verify Recovery Code
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="backup-email" className="space-y-4">
                  <form onSubmit={handleEmailRecovery} className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="text-slate-300 mb-2 block">
                        Backup Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="backup@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-slate-800/50 border-slate-600/50 text-white h-10"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Enter the backup email associated with your account.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                      Send Recovery Email
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="backup-phone" className="space-y-4">
                  <p className="text-slate-400 text-center py-8">
                    Contact your platform administrator to verify via phone.
                  </p>
                  <Button disabled className="w-full">
                    Contact Support
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {step === "verify" && (
          <Card className="bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-xl border-slate-600/50 text-white">
            <CardHeader className="text-center pb-4">
              <CardTitle>Verify Email</CardTitle>
              <CardDescription>Enter the code sent to your email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                className="bg-slate-800/50 border-slate-600/50 text-white h-12 text-center text-2xl tracking-widest"
                maxLength={6}
              />
              <Button
                onClick={() => setStep("reset")}
                disabled={verificationCode.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Verify Code
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "reset" && (
          <Card className="bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-xl border-slate-600/50 text-white">
            <CardHeader className="pb-4">
              <CardTitle>Set New Password</CardTitle>
              <CardDescription>Create a strong new master password</CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordReset}>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="new-password" className="text-slate-300 mb-2 block">
                    New Password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-slate-800/50 border-slate-600/50 text-white h-10"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Must be at least 12 characters with mixed case, numbers, and symbols.
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirm-password" className="text-slate-300 mb-2 block">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-slate-800/50 border-slate-600/50 text-white h-10"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                  Reset Password
                </Button>
              </CardContent>
            </form>
          </Card>
        )}

        {step === "success" && (
          <Card className="bg-gradient-to-b from-green-700/50 to-green-800/50 backdrop-blur-xl border-green-600/50 text-white">
            <CardContent className="pt-12 pb-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-500/20 p-6 rounded-full border border-green-500/30">
                  <CheckCircle2 className="h-12 w-12 text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-300 mb-2">Recovery Successful</h3>
                <p className="text-green-200/80">
                  Your password has been reset. Redirecting to login...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/master/login")}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
          <a href="/help/recovery" className="text-xs text-slate-500 hover:text-slate-400">
            Need more help?
          </a>
        </div>
      </div>
    </div>
  )
}

