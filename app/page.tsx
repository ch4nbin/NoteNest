import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight, BookOpen, Users, Sparkles, Brain, Network, Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 animate-gradient" />

        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Logo/Brand */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-border">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">AI-Powered Note Taking</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              Study Smarter with <span className="gradient-text">NoteNest</span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Transform lectures into intelligent notes. Collaborate with friends. Ace your exams with AI-powered
              insights.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="hover-glow group">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button size="lg" variant="outline" className="hover-glow bg-transparent">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to <span className="gradient-text">Excel</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed for modern students
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Feature 1 */}
          <Card className="p-6 hover-glow space-y-4 bg-card/50 backdrop-blur-sm border-border">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">AI Note Generation</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our AI watches your lectures in real-time, extracting key concepts and creating comprehensive notes
              automatically.
            </p>
          </Card>

          {/* Feature 2 */}
          <Card className="p-6 hover-glow space-y-4 bg-card/50 backdrop-blur-sm border-border">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold">Instant Q&A Assistant</h3>
            <p className="text-muted-foreground leading-relaxed">
              Ask questions during lectures and get instant, context-aware answers powered by Grok AI.
            </p>
          </Card>

          {/* Feature 3 */}
          <Card className="p-6 hover-glow space-y-4 bg-card/50 backdrop-blur-sm border-border">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">Social Learning</h3>
            <p className="text-muted-foreground leading-relaxed">
              Share notes with classmates and compile multiple perspectives into one comprehensive study guide.
            </p>
          </Card>

          {/* Feature 4 */}
          <Card className="p-6 hover-glow space-y-4 bg-card/50 backdrop-blur-sm border-border">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Network className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Smart Compilation</h3>
            <p className="text-muted-foreground leading-relaxed">
              Merge your notes with friends' notes to get different teaching perspectives in one place.
            </p>
          </Card>

          {/* Feature 5 */}
          <Card className="p-6 hover-glow space-y-4 bg-card/50 backdrop-blur-sm border-border">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold">Multi-Source Support</h3>
            <p className="text-muted-foreground leading-relaxed">
              Works with Zoom lectures, YouTube videos, websites, and uploaded documents.
            </p>
          </Card>

          {/* Feature 6 */}
          <Card className="p-6 hover-glow space-y-4 bg-card/50 backdrop-blur-sm border-border">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">Predictive Insights</h3>
            <p className="text-muted-foreground leading-relaxed">
              AI analyzes your engagement patterns to identify weak areas and suggest focused study topics.
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-24 bg-card/30">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How <span className="gradient-text">NoteNest</span> Works
          </h2>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              1
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2">Paste Your Link</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Drop a Zoom meeting link, YouTube video, or website URL into NoteNest.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-2xl font-bold">
              2
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2">AI Takes Notes</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Watch or read the content while Grok AI automatically generates structured notes and answers your
                questions in real-time.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-2xl font-bold">
              3
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2">Share & Compile</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Share your notes with friends or compile multiple note sets to create comprehensive study guides from
                different perspectives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-24">
        <Card className="p-12 text-center space-y-6 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border-primary/20">
          <h2 className="text-4xl md:text-5xl font-bold">Ready to Transform Your Learning?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of students already acing their classes with NoteNest
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="hover-glow">
              Start Taking Smart Notes
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </Card>
      </section>
    </div>
  )
}
