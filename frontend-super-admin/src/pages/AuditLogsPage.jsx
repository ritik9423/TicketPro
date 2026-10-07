import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { exportAuditLogsDataset } from '../utils/excelExporter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import { 
  Shield, 
  History, 
  RefreshCw, 
  AlertCircle,
  Clock,
  User,
  Globe,
  Database,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import Pagination from '@/components/common/Pagination';
import { extractPageData } from '../utils/paginationHelper';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pagination State
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const fetchLogs = async (p = page, s = size, isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const resp = await api.get(`/audit-logs?page=${p}&size=${s}`).catch(() => null);
      if (resp) {
        const pageData = extractPageData(resp, p, s);
        const logContent = Array.isArray(pageData.data) ? pageData.data : (Array.isArray(pageData.content) ? pageData.content : []);
        setLogs(logContent);
        setTotalPages(pageData.totalPages || pageData.meta?.totalPages || 1);
        setTotalElements(pageData.totalElements || pageData.meta?.totalElements || 0);
      } else {
        const data = await api.get('/dashboard').catch(() => ({}));
        const rawLogs = Array.isArray(data?.recentLogs) ? data.recentLogs : [];
        setLogs(rawLogs);
        setTotalElements(rawLogs.length);
        setTotalPages(Math.max(1, Math.ceil(rawLogs.length / s)));
      }
    } catch (err) {
      setError('Failed to fetch system audit logs.');
      console.error(err);
      setLogs([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page, size, true);
  }, [page, size]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const logList = Array.isArray(logs) ? logs : [];

  // Export Audit Logs (Excel / CSV)
  const handleExportLogs = (format = 'excel') => {
    if (logList.length === 0) {
      alert('No audit logs recorded to export.');
      return;
    }
    exportAuditLogsDataset(logList, format);
    setSuccessMsg(`✓ Exported ${logList.length} audit logs to ${format === 'excel' ? 'Excel (.xlsx)' : 'CSV'} successfully!`);
  };

  return (
    <div className="space-y-6 text-left font-sans select-none pb-12 w-full">
      
      {/* HEADER BANNER */}
      <Card className="rounded-3xl border-slate-200/80 shadow-xs bg-gradient-to-r from-white via-indigo-50/30 to-slate-50 overflow-hidden">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                System Security & Audit Trail
              </h1>
              <Badge variant="outline" className="bg-cyan-100/80 border-cyan-300/80 text-cyan-900 font-extrabold text-[11px] uppercase tracking-wider rounded-full px-3 py-0.5">
                Root Logs
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl">
              Immutable global audit records tracking all administrative mutations, tenant registrations, and authentication events.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => fetchLogs(page, size, true)}
              className="flex-1 sm:flex-initial rounded-2xl border-slate-200 text-slate-700 font-bold text-xs h-9 sm:h-10 px-3.5 gap-1.5 hover:bg-slate-50 cursor-pointer shadow-xs active:scale-95 shrink-0"
            >
              <RefreshCw className="h-4 w-4 text-slate-500" />
              <span>Refresh</span>
            </Button>

            <Button
              onClick={() => handleExportLogs('excel')}
              className="flex-1 sm:flex-initial rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 sm:h-10 px-3.5 gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0"
              title="Download Logs in Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel</span>
            </Button>

            <Button
              onClick={() => handleExportLogs('csv')}
              className="flex-1 sm:flex-initial rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black text-xs h-9 sm:h-10 px-3.5 gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0"
              title="Download Logs in CSV"
            >
              <Download className="h-4 w-4" />
              <span>CSV</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* NOTIFICATIONS */}
      {successMsg && (
        <div className="rounded-2xl bg-emerald-50 p-3.5 sm:p-4 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 font-black cursor-pointer px-2">✕</button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 p-3.5 sm:p-4 text-xs font-bold text-rose-700 border border-rose-200 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* AUDIT LOG TABLE & MOBILE CARDS (SHADCN) */}
      <Card className="rounded-3xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
          </div>
        ) : (
          <div>
            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {logList.map((log) => (
                <div key={log.id} className="p-4 space-y-2 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-800 text-[10px] font-extrabold">
                      {log.action}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(log.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-700">{log.entityType || 'SYSTEM'}</span>
                    <span className="font-mono text-slate-500 text-[11px]">{log.entityId || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <span className="font-extrabold text-cyan-800">{log.user?.name || 'Super Admin'}</span>
                    <span className="text-slate-400 text-[11px]">{log.ipAddress || '127.0.0.1'}</span>
                  </div>
                </div>
              ))}
              {logList.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                  No security audit logs recorded yet.
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto w-full">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-100">
                    <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Action Event</TableHead>
                    <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Context Object</TableHead>
                    <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Entity ID</TableHead>
                    <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Actor User</TableHead>
                    <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">IP Origin</TableHead>
                    <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400 text-right">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {logList.map((log) => (
                    <TableRow key={log.id} className="hover:bg-cyan-50/20 transition-colors">
                      <TableCell className="py-3.5 px-5 font-black text-slate-900 text-xs">
                        <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-800 text-[10px] font-extrabold">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 px-5 text-xs font-bold text-slate-700">
                        {log.entityType || 'SYSTEM'}
                      </TableCell>
                      <TableCell className="py-3.5 px-5 font-mono text-xs text-slate-500 font-medium">
                        {log.entityId || 'N/A'}
                      </TableCell>
                      <TableCell className="py-3.5 px-5 font-extrabold text-cyan-800 text-xs">
                        {log.user?.name || 'Super Admin'}
                      </TableCell>
                      <TableCell className="py-3.5 px-5 text-slate-400 text-xs font-medium">
                        {log.ipAddress || '127.0.0.1'}
                      </TableCell>
                      <TableCell className="py-3.5 px-5 text-slate-500 text-xs font-medium text-right whitespace-nowrap">
                        {new Date(log.createdAt || Date.now()).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {logList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-slate-400 text-xs font-semibold">
                        No security audit logs recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={size}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setSize(newSize);
              setPage(0);
            }}
          />
        </div>
      </Card>

    </div>
  );
};

export default AuditLogsPage;
