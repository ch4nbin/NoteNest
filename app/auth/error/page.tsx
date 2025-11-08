import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookMarked, AlertCircle } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 space-y-6 hover-lift">
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-2">
              <div className="relative">
                <BookMarked className="h-12 w-12 text-primary" />
                <AlertCircle className="h-6 w-6 text-destructive absolute -bottom-1 -right-1 bg-card rounded-full p-1 border-2 border-card" />
              </div>
            </div>
            <h1 className="text-3xl font-bold gradient-text">Authentication Error</h1>
            <p className="text-muted-foreground">
              Something went wrong during authentication. Please try again or contact support if the problem persists.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Link href="/auth/signin" className="block">
              <Button className="w-full hover-lift" size="lg">
                Try Again
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full hover-lift bg-transparent" size="lg">
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
