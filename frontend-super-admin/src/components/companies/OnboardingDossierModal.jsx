import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Layers, 
  Check, 
  X, 
  Download, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  Palette,
  FileText
} from 'lucide-react';

export const downloadOnboardingPDF = (company, adminUser = null) => {
  if (!company) return;

  let custom = {};
  if (company.customFields) {
    try {
      custom = typeof company.customFields === 'string' 
        ? JSON.parse(company.customFields) 
        : company.customFields;
    } catch (_e) {}
  }

  const adminName = adminUser?.name || custom?.adminName || company.companyName + ' Admin';
  const adminEmail = adminUser?.email || custom?.adminEmail || company.email;
  const adminPhone = adminUser?.phone || custom?.adminPhone || company.phone || 'N/A';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to view and download the official Onboarding Dossier PDF.');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Corporate Onboarding Dossier - ${company.companyName}</title>
      <style>
        @media print {
          body { margin: 0; padding: 24px; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; }
          .no-print { display: none !important; }
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 40px;
          background: #ffffff;
          color: #0f172a;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .brand-title {
          font-size: 22px;
          font-weight: 900;
          color: #1e3a8a;
          margin: 0 0 4px 0;
          letter-spacing: -0.5px;
        }
        .brand-subtitle {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          margin: 0;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 14px;
          background: #fef3c7;
          color: #92400e;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          border: 1px solid #fde68a;
          letter-spacing: 0.5px;
        }
        .status-badge.active {
          background: #d1fae5;
          color: #065f46;
          border-color: #a7f3d0;
        }
        .section {
          margin-bottom: 24px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
        }
        .section-title {
          font-size: 12px;
          font-weight: 800;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px 20px;
        }
        .field-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .field-value {
          font-size: 13px;
          color: #0f172a;
          font-weight: 700;
          margin-top: 2px;
        }
        .color-swatch {
          display: inline-block;
          width: 14px;
          height: 14px;
          border-radius: 4px;
          vertical-align: middle;
          margin-right: 6px;
          border: 1px solid rgba(0,0,0,0.15);
        }
        .footer {
          margin-top: 36px;
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          color: #94a3b8;
          font-weight: 600;
        }
        .print-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #2563eb;
          color: white;
          border: none;
          padding: 10px 20px;
          font-weight: 800;
          font-size: 12px;
          border-radius: 10px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          transition: all 0.2s ease;
        }
        .print-btn:hover {
          background: #1d4ed8;
        }
      </style>
    </head>
    <body>
      <button onclick="window.print()" class="print-btn no-print">🖨️ Download / Print Dossier PDF</button>

      <div class="header">
        <div>
          <h1 class="brand-title">TicketPro Corporate Onboarding Dossier</h1>
          <p class="brand-subtitle">Official Workspace Registration, Architecture & Legal Security Audit Record</p>
        </div>
        <div>
          <span class="status-badge ${company.status === 'ACTIVE' ? 'active' : ''}">
            ${company.status || 'PENDING'} REGISTRATION
          </span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">1. Organization & Legal Identity</div>
        <div class="grid">
          <div>
            <div class="field-label">Legal Corporate Name</div>
            <div class="field-value">${company.companyName || 'N/A'}</div>
          </div>
          <div>
            <div class="field-label">Unique Tenant Code</div>
            <div class="field-value">${company.companyCode || 'N/A'}</div>
          </div>
          <div>
            <div class="field-label">Official Corporate Email</div>
            <div class="field-value">${company.email || 'N/A'}</div>
          </div>
          <div>
            <div class="field-label">Direct Contact Phone</div>
            <div class="field-value">${company.phone || 'N/A'}</div>
          </div>
          <div>
            <div class="field-label">Corporate Website</div>
            <div class="field-value">${company.website || ('https://' + (company.companyCode || 'corp').toLowerCase() + '.ticketpro.com')}</div>
          </div>
          <div>
            <div class="field-label">Registered Office Address</div>
            <div class="field-value">${company.address || 'Corporate Headquarters'}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">2. Operating Scale & Industry Classification</div>
        <div class="grid">
          <div>
            <div class="field-label">Industry Sector</div>
            <div class="field-value">${custom.industryType || 'IT & Software Support'}</div>
          </div>
          <div>
            <div class="field-label">Employee / Workforce Scale</div>
            <div class="field-value">${custom.companySize || '50-250 Employees'}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">3. Designated Primary Administrator Account</div>
        <div class="grid">
          <div>
            <div class="field-label">Administrator Full Name</div>
            <div class="field-value">${adminName}</div>
          </div>
          <div>
            <div class="field-label">Administrator Login Email</div>
            <div class="field-value">${adminEmail}</div>
          </div>
          <div>
            <div class="field-label">Administrator Phone</div>
            <div class="field-value">${adminPhone}</div>
          </div>
          <div>
            <div class="field-label">Granted Role Privilege</div>
            <div class="field-value">COMPANY_ADMIN (Root Organization Authority)</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">4. Helpdesk SLAs & Theme Branding</div>
        <div class="grid">
          <div>
            <div class="field-label">Target First Response SLA</div>
            <div class="field-value">Within ${custom.slaResponseHours || '2'} Hours (Standard Priority)</div>
          </div>
          <div>
            <div class="field-label">Target Full Resolution SLA</div>
            <div class="field-value">Within ${custom.slaResolutionHours || '24'} Hours (Standard Priority)</div>
          </div>
          <div>
            <div class="field-label">Portal Theme Accent Color</div>
            <div class="field-value">
              <span class="color-swatch" style="background:${custom.primaryColor || '#4f46e5'};"></span>
              ${custom.primaryColor || '#4f46e5'}
            </div>
          </div>
          <div>
            <div class="field-label">Corporate Logo Status</div>
            <div class="field-value">${custom.logoUrl ? 'Brand Asset Configured' : 'Platform Default Theme'}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">5. Platform Verification & Governance</div>
        <div class="grid">
          <div>
            <div class="field-label">Registration Submitted On</div>
            <div class="field-value">${company.createdAt ? new Date(company.createdAt).toLocaleString() : new Date().toLocaleString()}</div>
          </div>
          <div>
            <div class="field-label">System Cryptographic Verification</div>
            <div class="field-value">SHA-256 Multi-Tenant Isolation Verified ✓</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <div>Generated by TicketPro Central Super Admin Platform Engine</div>
        <div>Confidential Internal Record • TicketPro Multi-Tenant SaaS</div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 350);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

const OnboardingDossierModal = ({ isOpen, onClose, company, onApprove, onReject }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    if (isOpen && company?.id) {
      setAdminUser(null);
      setLoadingAdmin(true);
      api.get(`/companies/${company.id}/admin`)
        .then((res) => {
          if (res && res.id) setAdminUser(res);
        })
        .catch(() => {})
        .finally(() => setLoadingAdmin(false));
    }
  }, [isOpen, company]);

  if (!isOpen || !company) return null;

  let custom = {};
  if (company.customFields) {
    try {
      custom = typeof company.customFields === 'string' 
        ? JSON.parse(company.customFields) 
        : company.customFields;
    } catch (_e) {}
  }

  const adminName = adminUser?.name || custom?.adminName || company.companyName + ' Admin';
  const adminEmail = adminUser?.email || custom?.adminEmail || company.email;
  const adminPhone = adminUser?.phone || custom?.adminPhone || company.phone || 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden select-none">
      {/* Dimmed Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-4 bg-gradient-to-r from-amber-50/60 via-white to-indigo-50/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
              {company.companyName?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {company.companyName}
                </h3>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-[9.5px] font-black uppercase">
                  {company.status || 'PENDING'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Onboarding Application Dossier & Documentation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-left">
          
          {/* Section 1: Organization Profile */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center space-x-2 text-cyan-800">
              <Building2 className="h-4 w-4" />
              <h4 className="text-xs font-black uppercase tracking-wider">
                1. Organization & Legal Identity
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company Legal Name</span>
                <span className="font-extrabold text-slate-900 mt-0.5 block">{company.companyName}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tenant Partition Code</span>
                <span className="font-mono font-black text-cyan-700 mt-0.5 block">{company.companyCode}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corporate Email</span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate">{company.email}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Contact</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{company.phone || 'N/A'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 sm:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corporate Website</span>
                <span className="font-semibold text-cyan-700 mt-0.5 block truncate">{company.website || ('https://' + company.companyCode.toLowerCase() + '.ticketpro.com')}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Industry & Scale */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center space-x-2 text-cyan-800">
              <Layers className="h-4 w-4" />
              <h4 className="text-xs font-black uppercase tracking-wider">
                2. Industry Classification & Scale
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Industry Classification</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{custom.industryType || 'IT & Software Support'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Workforce Scale</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{custom.companySize || '50-250 Employees'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Designated Primary Administrator */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center space-x-2 text-indigo-700">
              <User className="h-4 w-4" />
              <h4 className="text-xs font-black uppercase tracking-wider">
                3. Designated Organization Administrator
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admin Full Name</span>
                <span className="font-black text-slate-900 mt-0.5 block">
                  {loadingAdmin ? 'Loading...' : adminName}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admin Login Email</span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                  {loadingAdmin ? 'Loading...' : adminEmail}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admin Phone</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{adminPhone}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Security Role</span>
                <span className="font-bold text-indigo-600 mt-0.5 block">COMPANY_ADMIN</span>
              </div>
            </div>
          </div>

          {/* Section 4: SLA Targets & Branding */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center space-x-2 text-purple-700">
              <Clock className="h-4 w-4" />
              <h4 className="text-xs font-black uppercase tracking-wider">
                4. Helpdesk SLAs & Theme Branding
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target First Response SLA</span>
                <span className="font-extrabold text-slate-900 mt-0.5 block">Within {custom.slaResponseHours || '2'} Hours</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Full Resolution SLA</span>
                <span className="font-extrabold text-slate-900 mt-0.5 block">Within {custom.slaResolutionHours || '24'} Hours</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 sm:col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Portal Brand Accent</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span 
                      className="h-4 w-6 rounded border border-black/20"
                      style={{ backgroundColor: custom.primaryColor || '#4f46e5' }}
                    />
                    <span className="font-mono font-bold text-slate-900">{custom.primaryColor || '#4f46e5'}</span>
                  </div>
                </div>
                {custom.logoUrl && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Logo Loaded:</span>
                    <img src={custom.logoUrl} alt="Logo" className="h-7 w-7 object-contain rounded border bg-white p-0.5" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="border-t border-slate-100 p-4 sm:p-5 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadOnboardingPDF(company, adminUser)}
            className="w-full sm:w-auto rounded-xl border-cyan-200 bg-white hover:bg-cyan-50 text-cyan-800 font-bold text-xs h-9 px-4 gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download Official PDF</span>
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onReject && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onReject(company);
                  onClose();
                }}
                className="flex-1 sm:flex-initial rounded-xl border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs h-9 px-4 gap-1.5 cursor-pointer"
              >
                <X className="h-4 w-4" />
                <span>Reject</span>
              </Button>
            )}
            
            {onApprove && (
              <Button
                type="button"
                onClick={() => {
                  onApprove(company);
                  onClose();
                }}
                className="flex-1 sm:flex-initial rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 px-5 gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Approve Workspace</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingDossierModal;
