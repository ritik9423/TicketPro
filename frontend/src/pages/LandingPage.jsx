import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Layers,
  ShieldCheck,
  Clock3,
  Menu,
  X,
  Mail,
  SlidersHorizontal,
  ChartNoAxesCombined,
  Ticket,
  Play,
  CircleCheck,
  Zap,
  Star,
  Bell,
  Search,
  Users,
  ChevronDown,
  Sparkles,
  Lock,
  Building2,
  BookOpen,
  Send,
  Workflow,
  CheckCircle2,
  Shield,
  Activity,
  Award
} from "lucide-react";

/* ==========================================================================
   STATIC DATA (30 ENTERPRISES WITH AUTHENTIC BRAND LOGOS & STYLING)
   ========================================================================== */

const ALL_30_COMPANIES = [
  { id: "iocl", name: "IOCL", sub: "Indian Oil Corp", bg: "#ff7300", letter: "IOCL" },
  { id: "reliance", name: "Reliance", sub: "Industries Ltd", bg: "#0b1a48", letter: "R" },
  { id: "tata", name: "Tata Motors", sub: "Automotive Global", bg: "#10317e", letter: "TATA" },
  { id: "hdfc", name: "HDFC Bank", sub: "Banking & Finance", bg: "#004c8f", letter: "HDFC" },
  { id: "adani", name: "Adani Group", sub: "Infrastructure & Power", bg: "linear-gradient(135deg, #0284c7 0%, #0d9488 100%)", letter: "ADANI" },
  { id: "infosys", name: "Infosys", sub: "IT & Digital Services", bg: "#007cc3", letter: "INFY" },
  { id: "tcs", name: "TCS", sub: "Global Consultancy", bg: "#1c3e80", letter: "TCS" },
  { id: "wipro", name: "Wipro", sub: "Technologies", bg: "#292562", letter: "WIPRO" },
  { id: "icici", name: "ICICI Bank", sub: "Financial Services", bg: "linear-gradient(135deg, #f37023 0%, #b83210 100%)", letter: "ICICI" },
  { id: "airtel", name: "Airtel", sub: "Telecom & Cloud", bg: "#e40000", letter: "AIRTEL" },
  { id: "sbi", name: "State Bank of India", sub: "National Banking", bg: "#00a4e4", letter: "SBI" },
  { id: "axis", name: "Axis Bank", sub: "Banking & Wealth", bg: "#97144d", letter: "AXIS" },
  { id: "mahindra", name: "Mahindra & Mahindra", sub: "Automotive & Farm", bg: "#e31837", letter: "M&M" },
  { id: "lt", name: "Larsen & Toubro", sub: "Engineering & EPC", bg: "#005a9c", letter: "L&T" },
  { id: "maruti", name: "Maruti Suzuki", sub: "Passenger Mobility", bg: "#10317e", letter: "MS" },
  { id: "hcl", name: "HCLTech", sub: "Supercharging Progress", bg: "#0054a6", letter: "HCL" },
  { id: "techm", name: "Tech Mahindra", sub: "Digital Solutions", bg: "#d41e2a", letter: "TM" },
  { id: "itc", name: "ITC Limited", sub: "FMCG & Conglomerate", bg: "#004b87", letter: "ITC" },
  { id: "bajaj", name: "Bajaj Finserv", sub: "Financial Services", bg: "#00539f", letter: "BAJAJ" },
  { id: "sun", name: "Sun Pharma", sub: "Global Healthcare", bg: "linear-gradient(135deg, #f26522 0%, #f79009 100%)", letter: "SUN" },
  { id: "drl", name: "Dr. Reddy's", sub: "Pharmaceuticals", bg: "#602b84", letter: "DRL" },
  { id: "hindalco", name: "Hindalco", sub: "Metals & Mining", bg: "#ed1c24", letter: "HAL" },
  { id: "ultratech", name: "UltraTech Cement", sub: "The Engineer's Choice", bg: "#1c1930", letter: "UTC" },
  { id: "asianpaints", name: "Asian Paints", sub: "Coatings & Decor", bg: "#e52421", letter: "AP" },
  { id: "titan", name: "Titan Company", sub: "Watches & Jewellery", bg: "#111111", letter: "TITAN" },
  { id: "zomato", name: "Zomato", sub: "Food & Quick Commerce", bg: "#cb202d", letter: "ZMT" },
  { id: "swiggy", name: "Swiggy", sub: "Instamart & Delivery", bg: "#fc8019", letter: "SWIG" },
  { id: "paytm", name: "Paytm", sub: "Fintech Payments", bg: "linear-gradient(135deg, #00baf2 0%, #002e6e 100%)", letter: "PAYTM" },
  { id: "flipkart", name: "Flipkart", sub: "E-Commerce Marketplace", bg: "#2874f0", letter: "FK" },
  { id: "makemytrip", name: "MakeMyTrip", sub: "Travel & Bookings", bg: "#eb2026", letter: "MMT" },
];

export const innovations = [
  {
    label: "Omnichannel Intake",
    title: "Inbound Email Sync Engine",
    description:
      "Customers email your support address and TicketPro automatically parses headers, detects category, extracts attachments, and assigns agents in under 2 seconds.",
    points: ["Zero Portal Login Needed", "99.4% AI Parse Accuracy", "Auto-thread Reply Sync"],
    chip: "IMAP / SMTP / SES Hook",
    gradient: "from-[#06b6d4] to-[#2563eb]"
  },
  {
    label: "No-Code Architecture",
    title: "Dynamic Form Studio",
    description:
      "Intake schemas adapt per company and department dynamically at runtime. Hospitals get bed numbers; engineering gets git commit hashes without DB migrations.",
    points: ["Runtime JSON Schemas", "Zero DB Migrations", "Conditional Field Validation"],
    chip: "Schema Engine v2",
    gradient: "from-[#5236ec] to-[#7c3aed]"
  },
  {
    label: "Sub-Minute SLA Protection",
    title: "Automated SLA Escalation",
    description:
      "Precision countdown clocks trigger tiered automated escalations to managers before breaches happen, backed by automated CSAT feedback surveys.",
    points: ["Multi-Level Escalations", "< 15m Response Target", "Instant CSAT Loops"],
    chip: "Live Breach Monitor",
    gradient: "from-[#059669] to-[#10b981]"
  },
];

export const lifecycle = [
  {
    title: "Intelligent Intake",
    description:
      "Capture structured tickets with company-tailored dynamic form fields, dropdowns, validation rules, and direct file uploads.",
    tag: "Custom Fields Studio",
    icon: Mail,
    color: "#5236ec"
  },
  {
    title: "Department Queues",
    description:
      "Automatically route incoming tickets to the appropriate department and assign specialized agents based on queue availability.",
    tag: "Workload Balancing",
    icon: Users,
    color: "#0ba5ec"
  },
  {
    title: "SLA & Team Collaboration",
    description:
      "Enforce strict SLA countdown targets with multi-level escalation alerts and private internal notes for agent collaboration.",
    tag: "SLA Policy Automation",
    icon: Clock3,
    color: "#f79009"
  },
  {
    title: "Resolution & CSAT",
    description:
      "Close tickets with resolution audit timestamps and trigger automated 5-star customer feedback surveys to measure satisfaction.",
    tag: "CSAT Feedback Loops",
    icon: CircleCheck,
    color: "#12b76a"
  },
];

export const modules = [
  {
    label: "Core Engine",
    title: "Multi-Tenant Architecture",
    description:
      "Complete data isolation per company with custom subdomain, branding and dedicated database segregation.",
    points: ["Isolated Company Databases", "White-label Custom Branding", "Zero Data Leaks"],
    icon: Building2,
    accent: "bg-blue-50 text-blue-600 border-blue-200"
  },
  {
    label: "Governance",
    title: "5-Tier Granular RBAC",
    description:
      "Strict role permissions across Super Admin, Company Admin, Manager, Agent, and Customer portals.",
    points: ["JWT Scoped Token Security", "Route-Level Permission Guards", "Audit Trails"],
    icon: ShieldCheck,
    accent: "bg-purple-50 text-purple-600 border-purple-200"
  },
  {
    label: "Routing",
    title: "Department Management",
    description:
      "Group agents into specialized teams (IT, HR, Billing, Facilities) with department leads and queues.",
    points: ["Specialized Team Queues", "Team Lead Escalation Paths", "Agent Capacity Balancer"],
    icon: Users,
    accent: "bg-indigo-50 text-indigo-600 border-indigo-200"
  },
  {
    label: "Form Studio",
    title: "Dynamic Form Builder",
    description:
      "Create custom intake forms with dynamic fields, selects, validations, and live mobile preview.",
    points: ["Dynamic Field Validation", "Instant Live Form Preview", "Custom Select Studio"],
    icon: SlidersHorizontal,
    accent: "bg-cyan-50 text-cyan-600 border-cyan-200"
  },
  {
    label: "SLA Engine",
    title: "Configurable SLA Policies",
    description:
      "Set target response & resolution hours by priority (Urgent, High, Medium, Low) with automated alerts.",
    points: ["Real-time Countdown Timers", "Automated Breach Warnings", "Multi-Tier Escalations"],
    icon: Clock3,
    accent: "bg-amber-50 text-amber-600 border-amber-200"
  },
  {
    label: "Deflection",
    title: "Self-Service Knowledge Base",
    description:
      "Deflect repetitive queries with searchable articles, step-by-step guides, FAQs, and categories.",
    points: ["Instant Category Search", "High Ticket Deflection Rate", "Rich Markdown Guides"],
    icon: BookOpen,
    accent: "bg-emerald-50 text-emerald-600 border-emerald-200"
  },
  {
    label: "Broadcasts",
    title: "Broadcast Announcements",
    description:
      "Publish critical company-wide operational alerts, system maintenance notices, and priority banners.",
    points: ["Priority Notice Banners", "Targeted Audience Filters", "Scheduled Broadcasts"],
    icon: Bell,
    accent: "bg-rose-50 text-rose-600 border-rose-200"
  },
  {
    label: "Analytics",
    title: "Executive Reports & CSAT",
    description:
      "Track resolution metrics, SLA compliance rates, agent leaderboards, and export CSV/PDF audits.",
    points: ["First-Contact Resolution Metrics", "Exportable CSV & PDF Audits", "Live Leaderboards"],
    icon: ChartNoAxesCombined,
    accent: "bg-sky-50 text-sky-600 border-sky-200"
  },
];

const navItems = [
  "Overview",
  "What We Offer",
  "Key Features",
  "Solutions",
  "About",
];

const navTargets = [
  "overview",
  "innovation",
  "capabilities",
  "lifecycle",
  "enterprise-trust",
];

/* ==========================================================================
   BRAND LOGO RENDERER FOR CONTINUOUS MARQUEE
   ========================================================================== */

function renderCompanyLogo(comp) {
  if (comp.id === "sbi") {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="#00a4e4" />
        <circle cx="12" cy="9.5" r="3.5" fill="white" />
        <rect x="10.8" y="9.5" width="2.4" height="11.5" fill="white" />
      </svg>
    );
  }
  if (comp.id === "axis") {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
        <path d="M12 4L3 20h6l3-6 3 6h6L12 4z" />
      </svg>
    );
  }
  if (comp.id === "hdfc") {
    return (
      <div className="w-5 h-5 grid grid-cols-2 gap-0.5 p-0.5 bg-blue-900 rounded-[3px]">
        <div className="bg-red-600 rounded-[1px]" />
        <div className="bg-white rounded-[1px]" />
        <div className="bg-white rounded-[1px]" />
        <div className="bg-red-600 rounded-[1px]" />
      </div>
    );
  }
  if (comp.id === "tata") {
    return (
      <div className="flex flex-col items-center leading-none">
        <svg viewBox="0 0 24 14" className="w-5 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M4 11C7 4 17 4 20 11M12 4v8" strokeLinecap="round" />
        </svg>
        <span className="text-[6px] font-black tracking-widest mt-0.5">TATA</span>
      </div>
    );
  }
  if (comp.id === "swiggy") {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
      </svg>
    );
  }
  if (comp.id === "flipkart") {
    return (
      <div className="flex items-center space-x-0.5 font-black text-[10px]">
        <span className="text-yellow-300">F</span>
        <span className="text-white">K</span>
      </div>
    );
  }
  if (comp.id === "zomato") {
    return (
      <span className="font-black text-[9px] tracking-tighter italic text-white">zomato</span>
    );
  }
  if (comp.id === "airtel") {
    return (
      <span className="font-extrabold text-[9px] tracking-tight text-white">airtel</span>
    );
  }
  if (comp.id === "adani") {
    return (
      <span className="font-bold text-[9px] tracking-tight text-white">adani</span>
    );
  }
  if (comp.id === "reliance") {
    return (
      <span className="font-serif font-black text-sm text-amber-300">R</span>
    );
  }

  // Default clean monogram
  return (
    <span className="font-mono font-black text-[10px] text-white tracking-tighter">
      {comp.letter || comp.name.slice(0, 3).toUpperCase()}
    </span>
  );
}

function CompanyBrandCard({ comp }) {
  return (
    <div className="flex items-center space-x-3 px-4 py-2.5 rounded-xl border border-border/80 bg-white/95 hover:bg-white hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 shrink-0 group select-none cursor-default shadow-xs">
      {/* Brand Logo Avatar */}
      <div 
        className="h-9 w-9 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-xs shrink-0 group-hover:scale-110 transition-transform overflow-hidden p-1"
        style={{ background: comp.bg }}
      >
        {renderCompanyLogo(comp)}
      </div>

      {/* Brand Information */}
      <div className="leading-tight text-left min-w-0">
        <p className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors whitespace-nowrap">
          {comp.name}
        </p>
        <p className="text-[10px] text-muted-foreground font-medium whitespace-nowrap mt-0.5">
          {comp.sub}
        </p>
      </div>
    </div>
  );
}

/* ==========================================================================
   UI COMPONENTS (LOGO, BUTTON, INPUT, SELECT, DIALOG)
   ========================================================================== */

export function Logo({ inverted = false }) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#22d3ee] to-[#5236ec] shadow-[0_0_20px_-4px] shadow-[#22d3ee]/60">
        <Ticket className="h-5 w-5 text-[#fcfcfd]" />
      </span>
      <span className="leading-none select-none">
        <span
          className={`block font-display text-2xl font-bold tracking-tight ${inverted ? "text-[#fcfcfd]" : "text-[#1c1930]"}`}
        >
          Ticket
          <span className={inverted ? "text-[#22d3ee]" : "text-[#5236ec]"}>Pro</span>
        </span>
        <span
          className={`mt-1 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] ${inverted ? "text-[#22d3ee]" : "text-[#667085]"}`}
        >
          Smart ticketing · better support
        </span>
      </span>
    </Link>
  );
}

export function Button({ asChild = false, variant = "default", size = "default", className = "", children, ...props }) {
  const baseClasses = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer";
  
  const variantClasses = {
    default: "home-primary text-white",
    ghost: "hover:bg-[#ebe9fe] text-[#667085] hover:text-[#1c1930]",
    outline: "border border-[#eaecf0] bg-white text-[#1c1930] hover:bg-[#ebe9fe] hover:text-[#5236ec] shadow-xs",
    link: "text-[#5236ec] underline-offset-4 hover:underline p-0 h-auto font-medium",
  }[variant] || "home-primary";

  const sizeClasses = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  }[size] || "h-9 px-4 py-2";

  const fullClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`;

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: `${fullClasses} ${children.props.className || ""}`.trim(),
      ...props,
    });
  }

  return (
    <button className={fullClasses} {...props}>
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`flex h-9 w-full rounded-md border border-[#eaecf0] bg-white px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-[#667085] focus:border-[#5236ec] focus:outline-none focus:ring-1 focus:ring-[#5236ec] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

/* Custom Interactive Select */
const SelectContext = React.createContext({
  value: "",
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
});

export function Select({ value, onValueChange, children }) {
  const [open, setOpen] = useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div ref={containerRef} className="relative inline-block w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = "", children, ...props }) {
  const { open, setOpen } = React.useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-[#eaecf0] bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-[#5236ec] cursor-pointer ${className}`}
      {...props}
    >
      {children}
      <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

export function SelectValue({ placeholder = "Select option" }) {
  const { value } = React.useContext(SelectContext);
  return <span className="truncate">{value || placeholder}</span>;
}

export function SelectContent({ className = "", children }) {
  const { open } = React.useContext(SelectContext);
  if (!open) return null;
  return (
    <div
      className={`absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-[#eaecf0] bg-white p-1 text-sm shadow-lg animate-in fade-in zoom-in-95 ${className}`}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value, children, className = "" }) {
  const { value: selectedValue, onValueChange, setOpen } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;
  return (
    <div
      onClick={() => {
        onValueChange?.(value);
        setOpen(false);
      }}
      className={`relative flex w-full cursor-pointer select-none items-center justify-between rounded-sm px-3 py-1.5 text-sm outline-none transition-colors hover:bg-[#ebe9fe] hover:text-[#5236ec] ${
        isSelected ? "bg-[#ebe9fe] font-semibold text-[#5236ec]" : "text-[#1c1930]"
      } ${className}`}
    >
      <span>{children}</span>
      {isSelected && <Check className="h-4 w-4 text-[#5236ec]" />}
    </div>
  );
}

/* Modal Dialog */
export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1930]/40 backdrop-blur-xs animate-in fade-in">
      <div
        className="fixed inset-0"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-[#eaecf0] animate-in zoom-in-95">
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

export function DialogHeader({ children, className = "" }) {
  return <div className={`space-y-1.5 ${className}`}>{children}</div>;
}

export function DialogTitle({ children, className = "" }) {
  return (
    <h3 className={`font-display text-xl font-semibold text-[#1c1930] tracking-tight ${className}`}>
      {children}
    </h3>
  );
}

export function DialogDescription({ children, className = "" }) {
  return (
    <p className={`text-sm text-[#667085] leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

/* ==========================================================================
   HOMEPAGE COMPONENT (PIXEL-PERFECT + ULTRA-PREMIUM UPGRADES)
   ========================================================================== */

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Technical Issue");
  const [priority, setPriority] = useState("High Priority");
  const [logged, setLogged] = useState(false);

  function scrollToSection(index) {
    const target = navTargets[index];
    if (!target) return;
    document
      .getElementById(target)
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    setMenuOpen(false);
  }

  return (
    <div className="home-page original-home bg-background text-foreground">
      {/* ── LOVABLE EXACT DESIGN SYSTEM STYLES WITH 1-LINE MARQUEE ── */}
      <style>{`
        :root {
          --radius: 0.5rem;
          --font-sans: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
          --font-display: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
          --background: #f7f7f9;
          --foreground: #1c1930;
          --card: #ffffff;
          --card-foreground: #1c1930;
          --popover: #ffffff;
          --popover-foreground: #1c1930;
          --primary: #5236ec;
          --primary-foreground: #ffffff;
          --secondary: #f4f3f8;
          --secondary-foreground: #1c1930;
          --muted: #f4f3f8;
          --muted-foreground: #667085;
          --accent: #ebe9fe;
          --accent-foreground: #472ecc;
          --destructive: #ef4444;
          --destructive-foreground: #ffffff;
          --success: #12b76a;
          --warning: #f79009;
          --warning-soft: #fef0c7;
          --info: #0ba5ec;
          --signal: #22d3ee;
          --signal-foreground: #164e63;
          --navy: #1f1a4a;
          --navy-foreground: #fcfcfd;
          --navy-muted: #c7c6dc;
          --border: #eaecf0;
          --input: #d0d5dd;
          --ring: #5236ec;
          --shadow-card: 0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 32px -12px rgba(16, 24, 40, 0.12);
          --gradient-panel: linear-gradient(170deg, #3d25b5 0%, #241477 55%, #150a4d 100%);
          --home-product-shadow: 0 4px 12px rgba(16, 24, 40, 0.05), 0 24px 70px -28px rgba(82, 54, 236, 0.25);
          --home-button-shadow: 0 2px 3px rgba(16, 24, 40, 0.1), 0 7px 16px -8px rgba(82, 54, 236, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.22);
        }

        .home-page {
          font-family: var(--font-sans);
          background-color: var(--background);
          color: var(--foreground);
          -webkit-font-smoothing: antialiased;
        }

        .home-page h1,
        .home-page h2,
        .home-page h3,
        .home-page .font-display {
          font-family: var(--font-display);
          letter-spacing: -0.02em;
        }

        .home-page .bg-card { background-color: var(--card); }
        .home-page .text-card-foreground { color: var(--card-foreground); }
        .home-page .bg-background { background-color: var(--background); }
        .home-page .text-foreground { color: var(--foreground); }
        .home-page .bg-muted { background-color: var(--muted); }
        .home-page .text-muted-foreground { color: var(--muted-foreground); }
        .home-page .bg-accent { background-color: var(--accent); }
        .home-page .text-accent-foreground { color: var(--accent-foreground); }
        .home-page .border-border { border-color: var(--border); }
        .home-page .border-input { border-color: var(--input); }
        .home-page .text-primary { color: var(--primary); }
        .home-page .bg-primary { background-color: var(--primary); }
        .home-page .text-primary-foreground { color: var(--primary-foreground); }
        .home-page .text-success { color: var(--success); }
        .home-page .bg-success { background-color: var(--success); }
        .home-page .text-warning { color: var(--warning); }
        .home-page .bg-warning-soft { background-color: var(--warning-soft); }
        .home-page .text-signal { color: var(--signal); }
        .home-page .bg-signal { background-color: var(--signal); }
        .home-page .text-navy-foreground { color: var(--navy-foreground); }
        .home-page .text-navy-muted { color: var(--navy-muted); }
        .home-page .bg-navy { background-color: var(--navy); }
        .home-page .shadow-card { box-shadow: var(--shadow-card); }

        .home-header {
          position: relative;
          z-index: 20;
        }

        .home-hero {
          background: var(--card);
        }

        .original-home section {
          scroll-margin-top: 24px;
        }

        .original-title {
          font-family: var(--font-display);
          font-size: 56px;
          line-height: 1.08;
          letter-spacing: -0.02em;
        }

        .original-home .home-hero {
          background: var(--background);
        }

        .original-home .home-kicker {
          padding: 8px 14px;
          border-radius: 4px;
          background: var(--accent);
          color: var(--primary);
          border: 1px solid #d5d0fc;
        }

        .original-metrics > div + div {
          border-left: 1px solid var(--border);
        }

        .home-primary {
          background-color: var(--primary);
          color: var(--primary-foreground);
          box-shadow: var(--home-button-shadow);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
        }

        .home-primary:hover {
          background-color: #4328d4;
          transform: translateY(-2px);
          box-shadow: 0 4px 18px -4px rgba(82, 54, 236, 0.6);
        }

        .home-primary svg,
        .home-secondary svg,
        .home-capability button svg {
          transition: transform 180ms ease;
        }

        .home-primary:hover svg,
        .home-secondary:hover svg,
        .home-capability button:hover svg {
          transform: translateX(3px);
        }

        .home-secondary {
          background-color: var(--card);
          color: var(--foreground);
          border: 1px solid var(--border);
          box-shadow: 0 2px 3px rgba(16, 24, 40, 0.04);
          transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
        }

        .home-secondary:hover {
          transform: translateY(-2px);
          background-color: #fafafc;
        }

        .home-eyebrow {
          color: var(--primary);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .home-capability {
          position: relative;
          border-top: 3px solid var(--primary);
          box-shadow: var(--shadow-card);
          transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
        }

        .home-capability:nth-child(2) {
          border-top-color: var(--info);
        }

        .home-capability:nth-child(3) {
          border-top-color: var(--success);
        }

        .home-capability:hover {
          transform: translateY(-4px);
          border-inline-color: #c7d2fe;
          box-shadow: 0 16px 36px -12px rgba(16, 24, 40, 0.14);
        }

        .home-icon {
          color: var(--primary);
          background: var(--accent);
        }

        .home-capability:nth-child(2) .home-icon {
          color: var(--info);
          background: #e0f2fe;
        }

        .home-capability:nth-child(3) .home-icon {
          color: var(--success);
          background: #dcfce7;
        }

        .home-lifecycle .grid > div > div {
          border-top: 2px solid var(--border);
        }

        .home-lifecycle .grid > div:first-child > div {
          border-top-color: var(--primary);
        }

        .home-lifecycle .grid > div:last-child > div {
          border-top-color: var(--success);
        }

        /* ── SINGLE 1-LINE MARQUEE SMOOTH KEYFRAMES ── */
        @keyframes tpMarqueeSingleLine {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }

        .animate-marquee-single {
          animation: tpMarqueeSingleLine 70s linear infinite;
          display: flex;
          width: max-content;
        }

        .animate-marquee-single:hover {
          animation-play-state: paused;
        }

        .original-preview {
          padding-right: 54px;
        }

        .original-desktop {
          box-shadow: var(--home-product-shadow);
        }

        .original-ring {
          background: conic-gradient(
            var(--warning) 0% 20%,
            var(--primary) 20% 70%,
            var(--signal) 70% 100%
          );
        }

        .original-module {
          transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
        }

        .original-module:hover {
          border-color: #c7d2fe;
          box-shadow: 0 16px 32px -12px rgba(82, 54, 236, 0.15);
          transform: translateY(-4px);
        }

        .original-module h3 {
          min-height: 48px;
        }

        .original-sandbox form {
          border-left: 1px solid var(--border);
          padding-left: 36px;
        }

        @media (min-width: 1280px) {
          .original-title {
            font-size: 62px;
          }
        }

        @media (max-width: 1023px) {
          .original-sandbox form {
            border-left: 0;
            padding-left: 0;
          }
        }

        @media (max-width: 767px) {
          .original-title {
            font-size: 42px;
          }
          .original-metrics > div:nth-child(3) {
            border-left: 0;
          }
          .original-preview {
            padding-right: 0;
          }
          .original-phone {
            right: -5px;
            bottom: -8px;
            transform: scale(0.8);
            transform-origin: right bottom;
          }
          .original-desktop {
            padding-bottom: 10px;
          }
          .original-desktop > div:last-child {
            padding: 10px;
          }
          .original-desktop .grid-cols-4 {
            gap: 6px;
          }
          .original-desktop .grid-cols-4 > div {
            padding: 8px 5px;
          }
          .original-desktop .grid-cols-4 p:nth-child(2) {
            font-size: 16px;
          }
          .original-desktop .grid-cols-4 p:first-child {
            font-size: 8px;
          }
          .original-desktop .grid-cols-\[1\.7fr_1fr\] {
            grid-template-columns: 1fr;
            padding-right: 106px;
          }
          .original-desktop .grid-cols-\[1\.7fr_1fr\] > div:last-child {
            display: none;
          }
          .original-desktop .grid-cols-7 {
            gap: 6px;
          }
          .original-desktop .grid-cols-7 > div > div {
            width: 8px;
          }
          .original-desktop > div:last-child > div:nth-child(3) {
            display: none;
          }
        }

        @media (max-width: 479px) {
          .original-title {
            font-size: 34px;
          }
          .original-home .home-actions {
            gap: 8px;
          }
          .original-home .home-actions > a {
            padding-inline: 12px;
            font-size: 11px;
          }
          .original-metrics > div {
            gap: 8px;
          }
          .original-metrics p.font-display {
            font-size: 18px;
          }
        }
      `}</style>

      {/* ── HEADER NAVBAR ── */}
      <header className="home-header border-b border-border bg-card">
        <div className="mx-auto flex min-h-20 max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8">
          <Logo />
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 lg:flex"
          >
            {navItems.map((label, i) => (
              <Button
                key={label}
                variant="ghost"
                className={i === 0 ? "text-primary font-medium" : "text-muted-foreground font-medium"}
                onClick={() => scrollToSection(i)}
              >
                {label}
              </Button>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="outline">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild className="home-primary">
              <Link to="/onboard">
                Get Started <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {menuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="grid gap-1 border-t border-border p-5 lg:hidden bg-card"
          >
            {navItems.map((label, i) => (
              <Button
                key={label}
                variant="ghost"
                className="justify-start font-medium"
                onClick={() => scrollToSection(i)}
              >
                {label}
              </Button>
            ))}
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full">
                <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
              </Button>
              <Button asChild className="home-primary w-full">
                <Link to="/onboard" onClick={() => setMenuOpen(false)}>
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </nav>
        )}
      </header>

      {/* ── MAIN CONTENT ── */}
      <main>
        {/* 1. HERO SECTION */}
        <section id="overview" className="home-hero border-b border-border">
          <div className="mx-auto max-w-[1240px] px-5 pb-10 pt-10 text-center sm:px-8 sm:pt-12">
            <p className="home-kicker inline-flex items-center justify-center gap-2 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5" /> #1 Multi-Tenant Enterprise Ticketing
            </p>
            <h1 className="original-title mx-auto mt-5 max-w-[900px] font-semibold text-foreground">
              One Platform.
              <br />
              <span className="text-primary">Every Company.</span> Happy Customers.
            </h1>
            <p className="mx-auto mt-5 max-w-[670px] text-sm leading-relaxed text-muted-foreground sm:text-base">
              Empower your business with an enterprise-grade, secure,
              multi-tenant ticketing platform with automated SLAs, dynamic
              category forms, and real-time live updates.
            </p>
            <div className="home-actions mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="home-primary h-12 px-6 font-semibold">
                <Link to="/onboard">
                  Get Started for Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="home-secondary h-12 px-6 font-semibold"
              >
                <Link to="/login">
                  <Play className="h-4 w-4" /> Launch Live Portal
                </Link>
              </Button>
            </div>
            <div className="original-metrics mx-auto mt-8 grid max-w-[850px] grid-cols-2 gap-y-5 md:grid-cols-4">
              {[
                { v: "68%", a: "Faster", b: "Resolution", icon: Zap },
                {
                  v: "94.2%",
                  a: "Higher",
                  b: "First Fix Rate",
                  icon: ShieldCheck,
                },
                { v: "4.9/5 CSAT", a: "Happy", b: "Clients", icon: Star },
                {
                  v: "40%",
                  a: "Lower",
                  b: "Service Costs",
                  icon: ChartNoAxesCombined,
                },
              ].map((m) => (
                <div
                  key={m.v}
                  className="flex items-center justify-center gap-3 text-left"
                >
                  <m.icon className="h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-display text-xl font-semibold text-foreground">{m.v}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.a} {m.b}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <PortalPreview />
          </div>
        </section>

        {/* 2. ENTERPRISE TRUST RIBBON (1 SINGLE CONTINUOUS MARQUEE LINE WITH ALL 30 BRANDS) */}
        <section
          id="enterprise-trust"
          className="border-b border-border bg-card/70 py-10 sm:py-14 overflow-hidden relative"
        >
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8 text-center mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-primary text-[11px] font-bold uppercase tracking-wider mb-2.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Enterprise Scale &amp; Trust</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Trusted by 30+ innovative enterprise leaders
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
              From Fortune 500 conglomerates to high-growth tech innovators, modern support teams run on TicketPro.
            </p>
          </div>

          {/* 1 Single Clean Line Marquee with Soft Gradient Fade Edge Masks */}
          <div className="relative w-full overflow-hidden py-2">
            {/* Left & Right gradient edge masks */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-28 sm:w-48 bg-gradient-to-r from-card via-card/90 to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-28 sm:w-48 bg-gradient-to-l from-card via-card/90 to-transparent z-10" />

            {/* Exactly 1 Single Continuous Rolling Line */}
            <div className="animate-marquee-single flex items-center gap-4">
              {[...ALL_30_COMPANIES, ...ALL_30_COMPANIES].map((comp, idx) => (
                <CompanyBrandCard key={`single-${comp.id}-${idx}`} comp={comp} />
              ))}
            </div>
          </div>
        </section>

        {/* 3. CORE INNOVATION ENGINE & INTERACTIVE SANDBOX (PREMIUM UPGRADE) */}
        <section
          id="innovation"
          className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24"
        >
          <SectionHeading
            label="Core Innovation Engine"
            title="3 Unique Architectural Capabilities"
            description="Engineered for multi-tenant scalability, zero cross-tenant data leaks, and sub-minute SLA execution."
          />

          {/* 3 Upgraded Architecture Cards */}
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {innovations.map((item, i) => {
              const Icon = [Mail, SlidersHorizontal, Clock3][i] ?? Mail;
              return (
                <article
                  key={item.title}
                  className="home-capability flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="home-icon flex h-12 w-12 items-center justify-center rounded-xl shadow-xs">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {item.chip}
                    </span>
                  </div>

                  <p className="home-eyebrow text-xs font-bold">{item.label}</p>
                  <h3 className="mt-2 text-xl font-bold text-foreground">{item.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>

                  <ul className="mt-6 space-y-2.5 border-t border-border pt-5">
                    {item.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          {/* Upgraded Interactive Live Sandbox Studio */}
          <div className="original-sandbox mt-12 grid rounded-2xl border border-border bg-white p-6 sm:p-9 shadow-sm lg:grid-cols-2 lg:gap-12">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                  <p className="text-xs font-bold text-primary font-mono tracking-wider">
                    #TP-2048 LIVE ENGINE PREVIEW
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                  In Progress
                </span>
              </div>

              <h3 className="mt-4 max-w-[460px] text-2xl font-bold leading-snug text-foreground">
                High-priority database connection pool latency &amp; failover
              </h3>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                  High Priority
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200 font-medium">
                  Assigned: <strong className="text-foreground">Ritik Kumar</strong>
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-primary border border-indigo-200 font-semibold">
                  <Clock3 className="h-3.5 w-3.5 text-primary" />
                  02h 34m SLA
                </span>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px]">
                  <span>Telemetry Audit: Verified</span>
                  <span className="text-emerald-600 font-bold">Latency: 18ms</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-cyan-500 w-[68%]" />
                </div>
              </div>
            </div>

            <form
              className="mt-8 space-y-3.5 lg:mt-0"
              onSubmit={(e) => {
                e.preventDefault();
                setLogged(true);
              }}
            >
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Interactive Ticket Sandbox
                </h3>
                <span className="text-xs text-muted-foreground font-medium">
                  Try creating one live
                </span>
              </div>

              <Input
                aria-label="Ticket subject"
                placeholder="Enter ticket subject (e.g., API webhook timeout)..."
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setLogged(false);
                }}
                required
                maxLength={200}
                className="h-10"
              />

              <div className="grid grid-cols-2 gap-3">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger aria-label="Ticket category" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Technical Issue",
                      "Billing & Invoice",
                      "Access & Security",
                    ].map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger aria-label="Ticket priority" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["High Priority", "Medium Priority", "Low Priority"].map(
                      (x) => (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="home-primary w-full h-11 text-sm font-bold shadow-md">
                Log Ticket <ArrowRight className="h-4 w-4" />
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                Sample simulation data · Local reactive preview
              </p>

              {logged && (
                <div
                  role="status"
                  className="border-l-4 border-emerald-500 bg-emerald-50/80 p-3.5 rounded-r-xl text-sm animate-in fade-in"
                >
                  <p className="font-bold text-emerald-950">{subject || "New Incident Request"}</p>
                  <p className="mt-1 text-xs text-emerald-700 font-medium">
                    {category} · {priority} · Sample incident simulated and auto-routed!
                  </p>
                </div>
              )}
            </form>
          </div>
        </section>

        {/* 4. THE END-TO-END SUPPORT LIFECYCLE (PREMIUM CONNECTED PIPELINE) */}
        <section
          id="lifecycle"
          className="home-lifecycle border-y border-border bg-card py-16 sm:py-24"
        >
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
            <SectionHeading
              label="How TicketPro Works"
              title="The End-to-End Support Lifecycle, Streamlined for Speed"
              description="Experience a seamless workflow from initial request submission to first-contact resolution, team collaboration, and automated customer CSAT feedback."
            />

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {lifecycle.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div 
                    key={step.title}
                    className="p-6 rounded-2xl border border-border bg-white shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div 
                          className="h-11 w-11 rounded-xl flex items-center justify-center shadow-xs"
                          style={{ background: `${step.color}15`, color: step.color }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          STAGE 0{i + 1}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                      <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border">
                      <span 
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: step.color }}
                      >
                        {step.tag}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. ENTERPRISE CAPABILITIES MODULES (8 ENHANCED MODULES) */}
        <section
          id="capabilities"
          className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24"
        >
          <SectionHeading
            label="Enterprise Capabilities"
            title="Architected for Enterprise Control, Scale &amp; Governance"
            description="Explore the core system modules built into TicketPro to power your support department, secure your data, and deliver dependable operations."
          />

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="original-module flex flex-col rounded-xl border border-border bg-card p-5 shadow-xs hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${item.accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="home-eyebrow text-[9px]">{item.label}</span>
                  </div>

                  <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                  <p className="mt-2.5 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>

                  <ul className="mt-5 space-y-2 border-t border-border pt-4">
                    {item.points.map((p) => (
                      <li key={p} className="flex gap-2 text-[11px] font-medium text-slate-700">
                        <Check className="h-3.5 w-3.5 shrink-0 text-success mt-0.5" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="link"
                    className="mt-5 h-auto justify-start p-0 font-bold text-primary hover:text-indigo-800"
                    onClick={() => setSelected(item)}
                  >
                    Explore Module <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </article>
              );
            })}
          </div>
        </section>

        {/* 6. NEW HIGH-IMPACT CLOSING CTA BANNER (LINEAR / STRIPE STYLE) */}
        <section className="mx-auto max-w-[1240px] px-5 sm:px-8 pb-16 sm:pb-24">
          <div className="relative rounded-3xl bg-[#1c1930] p-8 sm:p-14 text-center text-white overflow-hidden shadow-2xl border border-slate-800">
            {/* Ambient Background Glows */}
            <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#5236ec]/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#22d3ee]/25 blur-3xl" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-5">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-white/10 text-cyan-300 text-xs font-bold border border-white/15">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Zero Migration Hassle · Ready in 60s</span>
              </div>

              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Ready to upgrade your enterprise customer support?
              </h2>

              <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
                Join thousands of support professionals using TicketPro to deliver sub-minute SLA responses and delight every customer.
              </p>

              <div className="pt-3 flex flex-wrap justify-center gap-3.5">
                <Button asChild size="lg" className="home-primary h-12 px-8 font-bold text-sm shadow-xl shadow-indigo-500/30">
                  <Link to="/onboard">
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 font-bold text-sm bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">
                  <Link to="/login">
                    Launch Live Portal
                  </Link>
                </Button>
              </div>

              <div className="pt-6 grid grid-cols-3 divide-x divide-white/10 text-[11px] text-slate-400 font-medium">
                <div>99.99% Guaranteed SLA</div>
                <div>Enterprise Data Isolation</div>
                <div>SOC2 &amp; GDPR Ready</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-5 py-8 sm:px-8">
          <Logo />
          <div className="flex items-center space-x-6 text-xs text-muted-foreground font-medium">
            <a href="#overview" className="hover:text-primary transition-colors">Overview</a>
            <a href="#what-we-offer" className="hover:text-primary transition-colors">What We Offer</a>
            <a href="#capabilities" className="hover:text-primary transition-colors">Capabilities</a>
            <Link to="/login" className="hover:text-primary transition-colors">Login</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TicketPro. Smart ticketing · better support.
          </p>
        </div>
      </footer>

      {/* ── MODULE EXPLORE DIALOG ── */}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <p className="home-eyebrow text-[10px]">{selected?.label}</p>
                <DialogTitle className="mt-1">{selected?.title}</DialogTitle>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DialogDescription className="pt-3 leading-relaxed">
              {selected?.description}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 py-3 border-t border-b border-border my-3">
            {selected?.points.map((p) => (
              <li key={p} className="flex gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 text-success shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button asChild className="home-primary">
              <Link to="/login" onClick={() => setSelected(null)}>
                Launch Live Portal <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Sample data · Preview workspace
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ==========================================================================
   SUBCOMPONENTS (SECTIONHEADING, PORTALPREVIEW)
   ========================================================================== */

function SectionHeading({ label, title, description }) {
  return (
    <div className="mx-auto max-w-[760px] text-center">
      <p className="home-eyebrow">{label}</p>
      <h2 className="mt-3 text-[28px] font-semibold leading-tight text-foreground sm:text-[36px]">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-[680px] text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function PortalPreview() {
  return (
    <div className="original-preview relative mx-auto mt-9 max-w-[940px] text-left">
      <Link
        to="/login"
        aria-label="Launch TicketPro sample portal"
        className="original-desktop block overflow-hidden rounded-lg border border-border bg-card shadow-card"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <Ticket className="h-3.5 w-3.5" />
            </span>
            TicketPro Portal
          </div>
          <span className="hidden items-center gap-2 rounded border border-border px-3 py-1 text-[10px] text-muted-foreground sm:flex">
            <Search className="h-3 w-3" />
            Search tickets...
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] text-primary">
            A
          </span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { t: "Total Tickets", v: "1,248", s: "+12.4%" },
              { t: "Open", v: "42", s: "Active" },
              { t: "In Progress", v: "18", s: "Assigned" },
              { t: "Resolved", v: "1,188", s: "95.2%" },
            ].map((m) => (
              <div key={m.t} className="rounded border border-border p-3 bg-card">
                <p className="text-[10px] text-muted-foreground">{m.t}</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{m.v}</p>
                <p className="mt-1 text-[9px] text-success font-medium">{m.s}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-[1.7fr_1fr] gap-3">
            <div className="rounded border border-border p-3 bg-card">
              <div className="flex justify-between text-[10px] font-semibold text-foreground">
                <span>Weekly Ticket Volume</span>
                <span className="text-primary">This Week</span>
              </div>
              <div className="mt-4 grid h-[85px] grid-cols-7 items-end gap-4">
                {[
                  "h-[50%]",
                  "h-[72%]",
                  "h-[90%]",
                  "h-[60%]",
                  "h-[78%]",
                  "h-[38%]",
                  "h-[70%]",
                ].map((h, i) => (
                  <div
                    key={i}
                    className="flex h-full flex-col justify-end gap-2"
                  >
                    <div
                      className={`${h} mx-auto w-3 rounded-t ${i % 2 ? "bg-primary" : "bg-signal"}`}
                    />
                    <span className="text-center text-[8px] text-muted-foreground">
                      {["M", "T", "W", "T", "F", "S", "S"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded border border-border p-3 bg-card">
              <p className="text-[10px] font-semibold text-foreground">Priority Share</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="original-ring flex h-16 w-16 shrink-0 items-center justify-center rounded-full">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-xs font-semibold text-foreground">
                    100%
                  </span>
                </div>
                <div className="space-y-2 text-[9px] text-muted-foreground">
                  <p>
                    High <strong className="text-foreground">20%</strong>
                  </p>
                  <p>
                    Med <strong className="text-foreground">50%</strong>
                  </p>
                  <p>
                    Low <strong className="text-foreground">30%</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded border border-border p-3 bg-card">
            <p className="text-[10px] font-semibold text-foreground">Recent Support Tickets</p>
            <div className="mt-3 space-y-2 text-[9px]">
              {[
                ["#TK-1042", "Database Connection Timeout", "IN_PROGRESS"],
                ["#TK-1041", "SSO Login Auth Loop Bug", "RESOLVED"],
              ].map(([id, t, s]) => (
                <div
                  key={id}
                  className="flex gap-3 border-t border-border pt-2 items-center"
                >
                  <span className="text-primary font-bold">{id}</span>
                  <span className="flex-1 truncate text-foreground">{t}</span>
                  <span className={s === "RESOLVED" ? "text-success font-medium" : "text-warning font-medium"}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[9px] text-muted-foreground">Sample data</p>
        </div>
      </Link>
      <div className="original-phone absolute -right-3 bottom-6 w-[154px] rounded-[24px] border-[5px] border-foreground bg-card p-2 shadow-card">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-foreground" />
        <div className="flex justify-between text-[7px] text-muted-foreground">
          <span>09:41</span>
          <span>5G</span>
        </div>
        <div className="mt-3 rounded bg-primary p-2 text-primary-foreground">
          <p className="text-[9px] font-semibold">
            TicketPro Mobile <span className="text-signal">Live</span>
          </p>
          <p className="mt-1 text-[7px]">
            Enterprise SLA <strong>99.8%</strong>
          </p>
        </div>
        <div className="mt-3 space-y-3 text-[7px]">
          <div>
            <p className="text-primary font-bold">
              #IOCL-8042 <span className="text-warning">In Progress</span>
            </p>
            <p className="mt-1 font-medium text-foreground truncate">Refinery Pipeline Telemetry</p>
          </div>
          <div>
            <p className="text-primary font-bold">
              #IOCL-8041 <span className="text-success">Resolved</span>
            </p>
            <p className="mt-1 font-medium text-foreground truncate">SAP ERP Portal Login Bug</p>
          </div>
        </div>
        <div className="mx-auto mt-5 h-0.5 w-12 bg-border" />
      </div>
    </div>
  );
}

export default HomePage;
export { HomePage as LandingPage };
