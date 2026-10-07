import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import { 
  CreditCard, 
  Plus, 
  Check, 
  Download, 
  ShieldCheck, 
  Zap, 
  Building, 
  Sparkles, 
  FileText, 
  Edit3, 
  X, 
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  PlusCircle
} from 'lucide-react';

const initialPlans = [
  {
    id: 'plan-basic',
    name: 'Basic Starter',
    badge: 'Starter',
    price: 29,
    period: '/mo',
    description: 'Essential ticketing system for small teams and startups.',
    popular: false,
    color: 'blue',
    stats: {
      agents: '5 Agents',
      tickets: '100 Tickets/mo',
      storage: '5 GB File Storage'
    },
    features: [
      '5 Agent Seats included',
      '100 Tickets per month quota',
      'Standard Email & Web Form ticketing',
      'Basic SLA Policy rules',
      'Standard Response Templates',
      'Community & Standard Email Support',
      '99.5% Uptime Guarantee'
    ]
  },
  {
    id: 'plan-pro',
    name: 'Professional Team',
    badge: 'Most Popular',
    price: 79,
    period: '/mo',
    description: 'Advanced features and automated workflows for growing businesses.',
    popular: true,
    color: 'indigo',
    stats: {
      agents: '25 Agents',
      tickets: '500 Tickets/mo',
      storage: '50 GB File Storage'
    },
    features: [
      '25 Agent Seats included',
      '500 Tickets per month quota',
      'Multi-channel: Email, Web, API & Webhooks',
      'Custom SLA Escalation policies & alerts',
      'Automated Ticket Routing & Round-robin',
      'Advanced Reporting & Analytics exports',
      'Priority Email & Live Chat Support (4h SLA)',
      '99.9% Uptime SLA'
    ]
  },
  {
    id: 'plan-ent',
    name: 'Enterprise Scale',
    badge: 'Dedicated Scale',
    price: 199,
    period: '/mo',
    description: 'Full-scale tenant isolation, unlimited capacity, and 24/7 dedicated support.',
    popular: false,
    color: 'emerald',
    stats: {
      agents: 'Unlimited Agents',
      tickets: 'Unlimited Tickets',
      storage: '1 TB High-speed Storage'
    },
    features: [
      'Unlimited Agent & Admin seats',
      'Unlimited Monthly Tickets',
      'Custom Domain & Whitelabel Branding',
      'SAML 2.0 / Okta SSO Integration',
      'Custom SLA Tier rules per organization',
      'Audit Log Streaming & SIEM Export',
      'Dedicated Account Manager & 24/7 Hotline',
      '99.99% Enterprise Uptime SLA'
    ]
  }
];


const PlansPage = () => {
  const [plans, setPlans] = useState(() => {
    try {
      const saved = localStorage.getItem('ticketpro_superadmin_plans');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}
    return initialPlans;
  });
  // Billing history loaded from backend API via useEffect below
  const [billingList, setBillingList] = useState([]);
  const [billingLoading, setBillingLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Form State for Plan Creation/Edit
  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    agents: '',
    tickets: '',
    description: '',
    features: ''
  });

  // Fetch billing history from backend on mount
  useEffect(() => {
    const fetchBillingHistory = async () => {
      try {
        setBillingLoading(true);
        // Backend endpoint: GET /api/billing/history — returns array of invoice records
        const data = await api.get('/billing/history').catch(() => null);
        if (Array.isArray(data) && data.length > 0) {
          setBillingList(data);
        } else {
          // Endpoint not yet implemented — show empty state, not mock data
          setBillingList([]);
        }
      } catch (err) {
        console.warn('Billing history fetch failed:', err.message);
        setBillingList([]);
      } finally {
        setBillingLoading(false);
      }
    };
    fetchBillingHistory();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      price: '',
      agents: '',
      tickets: '',
      description: '',
      features: 'Dedicated Agent Seats\nAutomated ticket routing\nStandard Email Support'
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      price: plan.price.toString(),
      agents: plan.stats.agents,
      tickets: plan.stats.tickets,
      description: plan.description,
      features: plan.features.join('\n')
    });
    setIsCreateModalOpen(true);
  };

  const handleSavePlan = (e) => {
    e.preventDefault();
    if (!planForm.name || !planForm.price) return;

    const featureList = planForm.features.split('\n').filter((f) => f.trim().length > 0);

    let updatedPlans = [];
    if (editingPlan) {
      updatedPlans = plans.map((p) =>
        p.id === editingPlan.id
          ? {
              ...p,
              name: planForm.name,
              price: parseFloat(planForm.price) || 0,
              description: planForm.description,
              stats: {
                ...p.stats,
                agents: planForm.agents || p.stats.agents,
                tickets: planForm.tickets || p.stats.tickets
              },
              features: featureList.length > 0 ? featureList : p.features
            }
          : p
      );
    } else {
      const newPlan = {
        id: `plan-${Date.now()}`,
        name: planForm.name,
        badge: 'Custom Tier',
        price: parseFloat(planForm.price) || 0,
        period: '/mo',
        description: planForm.description || 'Custom subscription tier.',
        popular: false,
        color: 'blue',
        stats: {
          agents: planForm.agents || '10 Agents',
          tickets: planForm.tickets || '250 Tickets/mo',
          storage: '20 GB Storage'
        },
        features: featureList
      };
      updatedPlans = [...plans, newPlan];
    }
    setPlans(updatedPlans);
    try {
      localStorage.setItem('ticketpro_superadmin_plans', JSON.stringify(updatedPlans));
    } catch(e) {}

    setIsCreateModalOpen(false);
  };

  const handleDownloadInvoice = (invoiceId) => {
    alert(`Downloading invoice receipt for ${invoiceId}...`);
  };

  return (
    <div className="space-y-6 text-left font-sans select-none pb-12 w-full">
      
      {/* HEADER BANNER */}
      <Card className="rounded-3xl border-slate-200/80 shadow-sm bg-gradient-to-r from-white via-indigo-50/30 to-slate-50 overflow-hidden">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Plans & Subscription Management
              </h1>
              <Badge variant="outline" className="bg-cyan-100/80 border-cyan-300/80 text-cyan-900 font-extrabold text-[11px] uppercase tracking-wider rounded-full px-3 py-0.5">
                Multi-Tenant Tiers
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl">
              Configure tenant subscription plans, pricing quotas, agent allowances, and review platform billing transactions.
            </p>
          </div>

          <Button
            onClick={openCreateModal}
            className="rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black text-xs h-10 px-4 gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer active:scale-95 shrink-0 w-full sm:w-auto"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Create Tier</span>
          </Button>
        </CardContent>
      </Card>

      {/* PLAN PRICING TIERS (SHADCN CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {plans.map((plan) => {
          const isPopular = plan.popular;
          return (
            <Card
              key={plan.id}
              className={`rounded-3xl transition-all relative flex flex-col justify-between overflow-hidden ${
                isPopular
                  ? 'border-2 border-cyan-500 shadow-xl bg-gradient-to-b from-white via-indigo-50/20 to-white'
                  : 'border border-slate-200/80 shadow-sm bg-white hover:border-cyan-200'
              }`}
            >
              {isPopular && (
                <div className="bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white text-[10px] font-black uppercase tracking-widest text-center py-1.5">
                  ★ Recommended Tier
                </div>
              )}

              <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{plan.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(plan)}
                    className="h-8 w-8 text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 rounded-xl shrink-0"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-baseline space-x-1 border-b border-slate-100 pb-4">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">${plan.price}</span>
                  <span className="text-xs font-bold text-slate-400">{plan.period}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seats</span>
                    <span className="font-extrabold text-slate-800">{plan.stats.agents}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Volume</span>
                    <span className="font-extrabold text-slate-800">{plan.stats.tickets}</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Features Included</span>
                  <ul className="space-y-2 text-xs font-medium text-slate-700">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <div className="p-4 sm:p-6 pt-0">
                <Button
                  onClick={() => openEditModal(plan)}
                  className={`w-full rounded-2xl font-black text-xs h-10 sm:h-11 ${
                    isPopular
                      ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white shadow-md shadow-cyan-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  Configure {plan.name} Tier
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* BILLING HISTORY (SHADCN TABLE & MOBILE CARDS) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-cyan-700" />
            <h3 className="text-base font-black text-slate-900">
              Recent Tenant Invoices & Billing ({billingList.length})
            </h3>
          </div>
        </div>

        <Card className="rounded-3xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
          {/* Mobile Billing Cards */}
          <div className="block md:hidden divide-y divide-slate-100">
            {billingLoading ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Loading billing history…
              </div>
            ) : billingList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No billing records found. Invoices will appear here once payments are processed.
              </div>
            ) : (
              billingList.map((item) => (
                <div key={item.id} className="p-4 space-y-2 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-cyan-800 text-xs">{item.id}</span>
                    <Badge variant="outline" className={`rounded-full text-[10px] font-extrabold uppercase ${
                      item.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : item.status === 'Pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs">{item.company}</span>
                    <span className="text-slate-600 text-xs font-bold">{item.plan}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <div>
                      <span className="font-black text-slate-900 text-sm">{item.amount}</span>
                      <span className="text-[11px] text-slate-400 font-medium ml-2">{item.date}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadInvoice(item.id)}
                      className="text-cyan-700 hover:text-cyan-900 hover:bg-cyan-50 rounded-xl text-xs font-bold h-7.5 px-2 gap-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>PDF</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full">
            <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100">
                <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Invoice ID</TableHead>
                <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Company Tenant</TableHead>
                <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Plan</TableHead>
                <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Amount</TableHead>
                <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Status</TableHead>
                <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Date</TableHead>
                <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400 text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {billingLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                    Loading billing history…
                  </TableCell>
                </TableRow>
              ) : billingList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                    No billing records found. Invoices will appear here once payments are processed.
                  </TableCell>
                </TableRow>
              ) : (
                billingList.map((item) => (
                  <TableRow key={item.id} className="hover:bg-cyan-50/20 transition-colors">
                    <TableCell className="py-3.5 px-5 font-mono font-black text-cyan-800 text-xs">
                      {item.id}
                    </TableCell>
                    <TableCell className="py-3.5 px-5 font-bold text-slate-900 text-xs">
                      {item.company}
                    </TableCell>
                    <TableCell className="py-3.5 px-5 text-slate-600 text-xs font-bold">
                      {item.plan}
                    </TableCell>
                    <TableCell className="py-3.5 px-5 font-black text-slate-900 text-xs">
                      {item.amount}
                    </TableCell>
                    <TableCell className="py-3.5 px-5">
                      <Badge variant="outline" className={`rounded-full text-[10px] font-extrabold uppercase ${
                        item.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5 px-5 text-slate-500 text-xs font-medium">
                      {item.date}
                    </TableCell>
                    <TableCell className="py-3.5 px-5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoice(item.id)}
                        className="text-cyan-700 hover:text-cyan-900 hover:bg-cyan-50 rounded-xl text-xs font-bold h-8 px-2.5 gap-1"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>PDF</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </Card>
      </div>

      {/* CREATE / EDIT TIER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border-slate-200 overflow-hidden bg-white animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <h3 className="text-sm font-black text-slate-900">
                {editingPlan ? `Edit Tier: ${editingPlan.name}` : 'Create New Subscription Tier'}
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Tier Name</Label>
                <Input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Enterprise Plus"
                  className="rounded-2xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Monthly Price ($)</Label>
                  <Input
                    type="number"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    placeholder="99"
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Agent Seats</Label>
                  <Input
                    type="text"
                    value={planForm.agents}
                    onChange={(e) => setPlanForm({ ...planForm, agents: e.target.value })}
                    placeholder="e.g. 50 Agents"
                    className="rounded-2xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Short Description</Label>
                <Input
                  type="text"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Target audience or summary"
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Features List (1 per line)</Label>
                <textarea
                  rows={4}
                  value={planForm.features}
                  onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end pt-4 border-t border-slate-100 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-2xl w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black w-full sm:w-auto"
                >
                  Save Tier
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
};

export default PlansPage;
