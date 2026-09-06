"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Layers,
  Lock,
  PackageCheck,
  Receipt,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Spotlight } from "@/components/ui/spotlight";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

export default function LandingPage() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isContact = user?.role === "contact";
  const dashboardUrl = isContact ? "/portal/invoices" : "/contacts";

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* ─── Top Sticky Navbar ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <Image
              src="/logo.svg"
              alt="Urban Furniture Logo"
              width={34}
              height={34}
              priority
              className="shrink-0"
            />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight">Urban Furniture</span>
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Accounting & ERP
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              How It Works
            </a>
            <a
              href="#portal"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Client Portal
            </a>
          </nav>

          {/* User Auth / Action Links */}
          <div className="flex items-center gap-2.5">
            <ModeToggle />

            {!isPending && user ? (
              <div className="flex items-center gap-2">
                <Link href="/profile">
                  <div className="hidden items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium sm:flex">
                    <User className="size-3.5 text-primary" />
                    <span className="max-w-[120px] truncate">{user.name || user.email}</span>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] capitalize">
                      {user.role}
                    </Badge>
                  </div>
                </Link>

                <Button
                  nativeButton={false}
                  render={<Link href={dashboardUrl} />}
                  size="sm"
                  className="gap-1.5 shadow-sm shadow-primary/20"
                >
                  Dashboard
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            ) : !isPending ? (
              <div className="flex items-center gap-2">
                <Button
                  nativeButton={false}
                  render={<Link href="/signin" />}
                  variant="ghost"
                  size="sm"
                >
                  Sign In
                </Button>
                <Button
                  nativeButton={false}
                  render={<Link href="/signin" />}
                  size="sm"
                  className="gap-1.5 shadow-sm shadow-primary/20"
                >
                  Launch App
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
        {/* Aceternity Grid Background */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 select-none",
            "[background-size:40px_40px]",
            "[background-image:linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)]",
            "dark:[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]",
          )}
        />
        {/* Radial vignette mask so grid fades cleanly toward container edges */}
        <div className="pointer-events-none absolute inset-0 bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

        {/* Top-Left Spotlight */}
        <Spotlight
          className="-top-40 left-0 md:-top-20 md:left-20"
          fill="white"
        />

        {/* Top-Right Spotlight (horizontally mirrored container) */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-full overflow-hidden [transform:scaleX(-1)]">
          <Spotlight
            className="-top-40 left-0 md:-top-20 md:left-20"
            fill="white"
          />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            <span>Double-Entry Accounting & Commercial Operations</span>
          </div>

          {/* Main Heading (Solid, no text gradient) */}
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
            Financial Precision & ERP for <span className="text-primary">Urban Furniture</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Manage procurement, sales orders, vendor bills, customer invoices, and strictly
            balanced general ledgers. Real-time balance sheets and customer self-service in one unified platform.
          </p>

          {/* Centered Action Button */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              nativeButton={false}
              render={<Link href={user ? dashboardUrl : "/signin"} />}
              size="lg"
              className="h-11 gap-2 px-7 text-sm font-semibold shadow-md shadow-primary/25"
            >
              {user ? "Open Dashboard" : "Get Started Free"}
              <ArrowRight className="size-4" />
            </Button>

            <Button
              nativeButton={false}
              render={<a href="#features" />}
              variant="outline"
              size="lg"
              className="h-11 px-6 text-sm"
            >
              Explore Platform Features
            </Button>
          </div>

          {/* Micro stats banner */}
          <div className="mt-12 grid grid-cols-2 gap-4 border-y border-border/50 py-5 sm:grid-cols-4">
            <div>
              <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">100%</p>
              <p className="text-xs text-muted-foreground">Balanced Ledger (Debits = Credits)</p>
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Zero</p>
              <p className="text-xs text-muted-foreground">Balance Sheet Discrepancies</p>
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">1-Click</p>
              <p className="text-xs text-muted-foreground">PO to Bill & SO to Invoice</p>
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Role-Based</p>
              <p className="text-xs text-muted-foreground">Admin, Accountant & Client Portal</p>
            </div>
          </div>

          {/* Glassmorphic Dashboard Preview Mockup */}
          <div className="relative mx-auto mt-12 max-w-4xl rounded-2xl border border-border/70 bg-card/60 p-3 shadow-2xl shadow-primary/5 backdrop-blur-xl sm:p-4">
            <div className="overflow-hidden rounded-xl border border-border/50 bg-background/95 p-5 text-left">
              {/* Mock Window Top Bar */}
              <div className="flex items-center justify-between border-b border-border/50 pb-3.5">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-destructive/60" />
                  <div className="size-2.5 rounded-full bg-amber-500/60" />
                  <div className="size-2.5 rounded-full bg-emerald-500/60" />
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    urban-furniture.app/dashboard
                  </span>
                </div>
                <Badge variant="outline" className="gap-1 text-[10px] text-emerald-600 border-emerald-500/30">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  General Ledger Balanced
                </Badge>
              </div>

              {/* Mock Dashboard Grid */}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Total Assets</p>
                  <p className="mt-1 text-lg font-bold text-foreground">₹24,50,800.00</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Verified against GL</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Accounts Receivable</p>
                  <p className="mt-1 text-lg font-bold text-foreground">₹4,82,400.00</p>
                  <p className="text-[10px] text-muted-foreground">12 Active Invoices</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Operating Net Profit</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    +₹3,15,450.00
                  </p>
                  <p className="text-[10px] text-emerald-600 font-medium">Real-time P&L</p>
                </div>
              </div>

              {/* Mock Recent Rows */}
              <div className="mt-4 rounded-lg border border-border/40 bg-card/40 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-2 border-b">
                  <span>Transaction</span>
                  <span>Entity</span>
                  <span>Status</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-border/30 text-xs">
                  <div className="flex items-center justify-between py-2">
                    <span className="font-medium">Customer Invoice #INV-2026-001</span>
                    <span className="text-muted-foreground">Azure Living</span>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 text-[10px]">
                      Paid
                    </Badge>
                    <span className="font-semibold">₹64,000.00</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="font-medium">Vendor Bill #BILL-2026-089</span>
                    <span className="text-muted-foreground">Sharma Woodworks</span>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-600 text-[10px]">
                      Pending Payment
                    </Badge>
                    <span className="font-semibold">₹32,500.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bento Grid Section ─── */}
      <section id="features" className="border-t border-border/40 py-20 bg-muted/20 scroll-mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="secondary" className="mb-3 text-xs uppercase tracking-wider">
              System Architecture
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Engineered with Enterprise Principles
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Explore how our modular architecture guarantees mathematical ledger balance, role isolation,
              and frictionless workflow execution.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="mt-12 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {/* Bento Card 1 (Large - 2 cols) */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md md:col-span-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Scale className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold tracking-tight">Zero-Drift Double-Entry Engine</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Every commercial event automatically posts double-entry journal lines. Our ledger service enforces
                zero-variance balancing before persistence, eliminating discrepancies between total debits and credits.
              </p>
              <div className="mt-5 rounded-lg border border-border/40 bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
                <span className="text-emerald-600 font-semibold">assert:</span> Math.abs(sumDebit - sumCredit) &lt; 0.01
              </div>
            </div>

            {/* Bento Card 2 */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Receipt className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold tracking-tight">P2P & O2C Lifecycles</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Seamlessly convert confirmed Purchase Orders into Vendor Bills and Sales Orders into Customer Invoices with partial payment tracking.
              </p>
            </div>

            {/* Bento Card 3 */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold tracking-tight">Self-Service Portal</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Dedicated client/vendor portal at <code className="text-primary">/portal</code> allowing external parties to inspect their documents and pay online.
              </p>
            </div>

            {/* Bento Card 4 */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold tracking-tight">Multi-Role RBAC</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Powered by Better Auth Organization plugin with strict separation between Admin, Accountant, and Contact portal roles.
              </p>
            </div>

            {/* Bento Card 5 (Large - 2 cols) */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md md:col-span-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold tracking-tight">Real-Time Financial Intelligence</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Instant reports generated directly from General Ledger journal entries. Access your Balance Sheet (strictly balanced),
                Profit & Loss statement with gross/net margins, Budget variance tracking, and Stock valuation.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">Balance Sheet</Badge>
                <Badge variant="secondary">Profit & Loss</Badge>
                <Badge variant="secondary">Budget Performance</Badge>
                <Badge variant="secondary">FIFO Stock Valuation</Badge>
              </div>
            </div>

            {/* Bento Card 6 */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Send className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold tracking-tight">Email Onboarding</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Invite contacts with a switch toggle. Integrated with Resend API and secure public link onboarding with automatic profile bridging.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works Section ─── */}
      <section id="how-it-works" className="py-20 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="secondary" className="mb-3 text-xs uppercase tracking-wider">
              Workflow
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              From Master Data to Balance Sheet
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              A frictionless accounting process that automates journals and eliminates human calculation errors.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Step 1 */}
            <div className="relative flex flex-col rounded-xl border border-border/60 bg-card p-5">
              <span className="text-2xl font-black text-primary/40">01</span>
              <h4 className="mt-3 text-base font-bold">Configure Master Data</h4>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Establish Chart of Accounts, Journals (Bank, Cash, Sales, Purchase), Products, and Contacts with custom tax specifications.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col rounded-xl border border-border/60 bg-card p-5">
              <span className="text-2xl font-black text-primary/40">02</span>
              <h4 className="mt-3 text-base font-bold">Record Transactions</h4>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Create and confirm Purchase Orders and Sales Orders. Generate official Vendor Bills and Customer Invoices in a single click.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col rounded-xl border border-border/60 bg-card p-5">
              <span className="text-2xl font-black text-primary/40">03</span>
              <h4 className="mt-3 text-base font-bold">Automate Ledgers</h4>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Double-entry journal lines are computed and posted instantly, updating Accounts Receivable, Payable, and Bank accounts.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative flex flex-col rounded-xl border border-border/60 bg-card p-5">
              <span className="text-2xl font-black text-primary/40">04</span>
              <h4 className="mt-3 text-base font-bold">Inspect & Reconcile</h4>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Review balanced Balance Sheets and P&L statements, while vendors and clients manage their invoices via the self-service portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Client Portal Highlight Section ─── */}
      <section id="portal" className="py-16 border-t border-border/40 bg-muted/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-8 sm:p-12">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <Badge variant="outline" className="text-xs text-primary border-primary/30 mb-3">
                  Self-Service Experience
                </Badge>
                <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Empower Clients & Vendors with a Dedicated Portal
                </h3>
                <p className="mt-3 text-sm text-muted-foreground sm:text-base leading-relaxed">
                  Eliminate billing back-and-forth. When you invite contacts to the portal, they receive a secure onboarding link to create their password and manage payments independently.
                </p>
                <div className="mt-6 space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>View complete billing history and invoice statuses</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>Submit instant online payments against pending invoices</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>Strict multi-tenant security &mdash; contacts only access their own records</span>
                  </div>
                </div>

                <div className="mt-8">
                  <Button
                    nativeButton={false}
                    render={<Link href={user ? dashboardUrl : "/signin"} />}
                    className="gap-2"
                  >
                    Explore Portal Features
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background/90 p-5 shadow-xl">
                <div className="flex items-center justify-between border-b pb-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="size-4 text-primary" />
                    Customer Portal View
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    contact_role
                  </Badge>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-border/40 p-3 text-xs">
                    <div>
                      <p className="font-semibold">Invoice #INV-2026-004</p>
                      <p className="text-[10px] text-muted-foreground">Due in 15 days</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹15,000.00</p>
                      <Button size="sm" className="h-6 text-[10px] px-2 mt-1">
                        Pay Now
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/40 p-3 text-xs">
                    <div>
                      <p className="font-semibold">Invoice #INV-2026-002</p>
                      <p className="text-[10px] text-emerald-600 font-medium">Completed</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹42,000.00</p>
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
                        Paid
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Call to Action Section with Dotted Glow Background ─── */}
      <section className="relative overflow-hidden py-24 border-t border-border/40 bg-card/20">
        <DottedGlowBackground
          className="pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] opacity-35 dark:opacity-90"
          opacity={1}
          gap={12}
          radius={1.8}
          color="rgba(120, 120, 130, 0.4)"
          darkColor="rgba(160, 160, 180, 0.35)"
          glowColor="rgba(59, 130, 246, 0.8)"
          darkGlowColor="rgba(56, 189, 248, 0.85)"
          backgroundOpacity={0}
          speedMin={0.3}
          speedMax={1.6}
          speedScale={1}
        />
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Badge variant="secondary" className="mb-4 text-xs tracking-wide">
            Enterprise Ready
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Ready to streamline your enterprise accounting?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Get started with Urban Furniture Accounting today. Zero manual ledger errors, automated commercial documents, and complete financial clarity.
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              nativeButton={false}
              render={<Link href={user ? dashboardUrl : "/signin"} />}
              size="lg"
              className="h-11 px-8 font-semibold shadow-md shadow-primary/25"
            >
              {user ? "Go to Dashboard" : "Sign In & Get Started"}
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/40 py-12 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.svg"
                alt="Urban Furniture Logo"
                width={26}
                height={26}
                className="shrink-0"
              />
              <span className="text-sm font-semibold tracking-tight">Urban Furniture</span>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} Urban Furniture Accounting System. All rights reserved.
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link href="/signin" className="hover:text-foreground transition-colors">
                Sign In
              </Link>
              <span>&bull;</span>
              <a href="#features" className="hover:text-foreground transition-colors">
                Features
              </a>
              <span>&bull;</span>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">
                How It Works
              </a>
              <span>&bull;</span>
              <a href="#portal" className="hover:text-foreground transition-colors">
                Portal
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
