"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Crown, Mail, Lock, Loader2, ArrowLeft, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import Image from "next/image"

export default function MasterLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error("Please provide both email and password")
      return
    }

    setLoading(true)
    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      })

      if (error) {
        toast.error(error.message || "Invalid credentials for Master Access")
        setLoading(false)
        return
      }

      toast.success("Welcome, Super Admin")
      router.push("/master/dashboard")
    } catch (err) {
      toast.error("An unexpected error occurred during master authentication")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-900 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <div className="bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-sm">
            <Image src="/images/roxan-logo.png" alt="Roxan" width={48} height={48} className="h-12 w-12" />
          </div>
        </div>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white shadow-2xl">
          <CardHeader className="space-y-1 text-center pb-8">
            <CardTitle className="text-3xl font-bold tracking-tight">Master Console</CardTitle>
            <CardDescription className="text-gray-400">
              Super-user authentication for Roxan platform infrastructure
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Super Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@roxan.app"
                    className="pl-10 bg-black/20 border-white/10 focus:border-indigo-500 text-white transition-all h-12"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-300">Secret Key / Password</Label>
                  <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Emergency Recovery</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 bg-black/20 border-white/10 focus:border-indigo-500 text-white transition-all h-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-indigo-400 mt-0.5" />
                <p className="text-xs text-indigo-200/80 leading-relaxed">
                  Authentication in this console grants access to cross-tenant database control and financial records. Ensure you are on a secure network.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-none shadow-lg shadow-indigo-900/20"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Authenticating...
                  </div>
                ) : (
                  "Initiate Master Session"
                )}
              </Button>
            </CardContent>
          </form>
          <CardFooter className="flex flex-col gap-4 border-t border-white/5 pt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="text-gray-400 hover:text-white hover:bg-white/5 w-full flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Public Portal
            </Button>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest text-center">
              Roxan v1.0.0-Enterprise • Secure Session
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
