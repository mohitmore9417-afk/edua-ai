import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, Users, BookOpen, BarChart3, Calendar, Bell, Brain, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-education.jpg";

const Home = () => {
  const features = [
    {
      icon: Users,
      title: "Smart Attendance",
      description: "Track student presence with intelligent insights and automated reports"
    },
    {
      icon: BookOpen,
      title: "Assignment Management",
      description: "Create, distribute, and grade assignments with AI assistance"
    },
    {
      icon: Brain,
      title: "AI Grading",
      description: "Get intelligent grading suggestions and detailed feedback for students"
    },
    {
      icon: Calendar,
      title: "Timetable Management",
      description: "Organize class schedules and never miss an important session"
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description: "Visualize student progress with comprehensive dashboards"
    },
    {
      icon: Bell,
      title: "Real-time Announcements",
      description: "Keep everyone informed with instant notifications"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SmartClass AI
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
            <Link to="/auth">
              <Button variant="default" size="sm">
                Get Started
              </Button>
            </Link>
          </nav>
          <Link to="/auth" className="md:hidden">
            <Button variant="default" size="sm">
              Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-block">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Brain className="w-4 h-4" />
                  AI-Powered Education Platform
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Smarter Learning.
                <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Simpler Teaching.
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                AI-powered classroom management to save teachers time and help students grow. 
                Manage attendance, assignments, and analytics all in one intelligent platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto">
                    Launch App
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-accent" />
                  <span className="text-sm text-muted-foreground">No setup required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-accent" />
                  <span className="text-sm text-muted-foreground">Free to start</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl" />
              <img
                src={heroImage}
                alt="Students learning with technology"
                className="relative rounded-3xl shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Modern Education
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to streamline teaching and enhance learning experiences
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-all hover:-translate-y-1 border-border bg-card">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="relative overflow-hidden p-12 md:p-16 bg-gradient-to-br from-primary to-accent text-white">
            <div className="relative z-10 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Transform Your Classroom?
              </h2>
              <p className="text-xl mb-8 text-white/90">
                Join thousands of educators using SmartClass AI to create better learning experiences
              </p>
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="text-primary">
                  Get Started for Free
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              <span className="font-semibold">SmartClass AI</span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 SmartClass AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;