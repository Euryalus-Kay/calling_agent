import Link from 'next/link';
import {
  Phone,
  Bot,
  Clock,
  Shield,
  ArrowRight,
  CheckCircle,
  Zap,
  PhoneCall,
  MessageSquare,
  BarChart3,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Phone className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">CallAgent</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/[0.03] blur-3xl pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-1.5 text-sm font-medium text-primary mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered phone calls
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Your AI makes the
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              phone calls for you
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed mb-10">
            Tell CallAgent what you need done. It plans the calls, dials the numbers,
            navigates phone menus, waits on hold, and reports back with results.
            No more sitting on the phone.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              Start for free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#how-it-works"
              className="flex items-center gap-2 rounded-2xl border border-border px-8 py-3.5 text-base font-semibold transition-all hover:bg-muted/50"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground/60">
            No credit card required &middot; Free to try
          </p>
        </div>
      </section>

      {/* Social proof / quick stats */}
      <section className="border-y border-border/40 bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold tracking-tight">30s</p>
              <p className="text-sm text-muted-foreground mt-1">Average setup time</p>
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight">5</p>
              <p className="text-sm text-muted-foreground mt-1">Simultaneous calls</p>
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight">24/7</p>
              <p className="text-sm text-muted-foreground mt-1">Always available</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Three steps. Zero phone anxiety.
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Describe what you need, review the plan, and let CallAgent handle the rest.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="relative rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-transparent p-8 text-center">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
              1
            </div>
            <div className="mx-auto mb-5 mt-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
              <MessageSquare className="h-7 w-7 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Describe your task</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              &ldquo;Book a dentist appointment for next Tuesday&rdquo; or &ldquo;Call my insurance about claim #12345&rdquo;
            </p>
          </div>
          <div className="relative rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-transparent p-8 text-center">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
              2
            </div>
            <div className="mx-auto mb-5 mt-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
              <Bot className="h-7 w-7 text-violet-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI plans the calls</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              CallAgent figures out who to call, what to say, and what questions to ask. You review and approve.
            </p>
          </div>
          <div className="relative rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-transparent p-8 text-center">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
              3
            </div>
            <div className="mx-auto mb-5 mt-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
              <PhoneCall className="h-7 w-7 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Calls happen automatically</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Watch live transcripts as calls happen. Get a summary when everything is done.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/40 bg-muted/20">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Built for the real world
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Not a toy demo. CallAgent handles everything a real phone call throws at it.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Phone,
                title: 'IVR menu navigation',
                description: 'Presses the right buttons to get through "Press 1 for..." menus automatically.',
                color: 'text-blue-500',
                bg: 'bg-blue-500/10',
              },
              {
                icon: Clock,
                title: 'Holds for you',
                description: 'Sits on hold so you don\'t have to. Notifies you of hold status in real time.',
                color: 'text-amber-500',
                bg: 'bg-amber-500/10',
              },
              {
                icon: Zap,
                title: 'Simultaneous calls',
                description: 'Makes multiple calls at once. Book 3 appointments in the time it takes to make 1.',
                color: 'text-violet-500',
                bg: 'bg-violet-500/10',
              },
              {
                icon: Shield,
                title: 'Auto-retry on failure',
                description: 'If a call drops or gets a busy signal, it automatically retries with context.',
                color: 'text-emerald-500',
                bg: 'bg-emerald-500/10',
              },
              {
                icon: BarChart3,
                title: 'Live transcripts',
                description: 'Watch every word of the conversation as it happens. Full transparency.',
                color: 'text-pink-500',
                bg: 'bg-pink-500/10',
              },
              {
                icon: Bot,
                title: 'Smart adaptation',
                description: 'Handles transfers, voicemails, and unexpected situations. Pivots when plans change.',
                color: 'text-cyan-500',
                bg: 'bg-cyan-500/10',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-border/50 bg-background p-6 transition-all hover:shadow-md hover:shadow-black/[0.04]"
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${feature.bg}`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="font-semibold mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            What people use it for
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            'Book doctor, dentist, or specialist appointments',
            'Call insurance companies about claims or coverage',
            'Make restaurant reservations',
            'Check store hours or product availability',
            'Schedule home repair or maintenance',
            'Follow up on orders or deliveries',
            'Call government offices for information',
            'Get quotes from multiple service providers',
          ].map((useCase) => (
            <div key={useCase} className="flex items-start gap-3 rounded-xl border border-border/40 p-4">
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{useCase}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Stop wasting time on the phone
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Create a free account and let CallAgent handle your next call.
          </p>
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-2xl bg-primary px-10 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            Get started for free
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-6 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Phone className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">CallAgent</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by Claude AI &middot; Built by Zain Zaidi
          </p>
        </div>
      </footer>
    </div>
  );
}
