import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download } from 'lucide-react';

export default function AuditLogPage() {
  const [filters, setFilters] = useState({ user: '', action: '', startDate: '', endDate: '' });

  const { data: logs = [] } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters as any);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/audit-logs?${params}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } }
      );
      return response.ok ? await response.json() : [];
    },
  });

  const exportLogs = () => {
    const csv = 'data:text/csv;charset=utf-8,' +
      'User,Role,Action,Table,Record ID,Timestamp\n' +
      logs.map((log: any) => 
        `${log.user_id},${log.user_role},${log.action},${log.table_name || ''},${log.record_id || ''},${log.created_at}`
      ).join('\n');
    
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `audit_logs_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2"><FileText size={32} /> Audit Logs</h1>
        <button onClick={exportLogs} className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg">
          <Download size={18} /> Export
        </button>
      </div>

      <div className="stat-card mb-6">
        <div className="grid grid-cols-4 gap-4">
          <input
            placeholder="User ID"
            value={filters.user}
            onChange={e => setFilters({...filters, user: e.target.value})}
            className="px-3 py-2 border rounded"
          />
          <input
            placeholder="Action"
            value={filters.action}
            onChange={e => setFilters({...filters, action: e.target.value})}
            className="px-3 py-2 border rounded"
          />
          <input
            type="date"
            value={filters.startDate}
            onChange={e => setFilters({...filters, startDate: e.target.value})}
            className="px-3 py-2 border rounded"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={e => setFilters({...filters, endDate: e.target.value})}
            className="px-3 py-2 border rounded"
          />
        </div>
      </div>

      <div className="stat-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3">Timestamp</th>
              <th className="text-left py-3">User</th>
              <th className="text-left py-3">Role</th>
              <th className="text-left py-3">Action</th>
              <th className="text-left py-3">Table</th>
              <th className="text-left py-3">Record ID</th>
              <th className="text-left py-3">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log: any) => (
              <tr key={log.id} className="border-b hover:bg-muted">
                <td className="py-3">{new Date(log.created_at).toLocaleString()}</td>
                <td className="py-3">{log.user_id}</td>
                <td className="py-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{log.user_role}</span></td>
                <td className="py-3">{log.action}</td>
                <td className="py-3">{log.table_name || '-'}</td>
                <td className="py-3">{log.record_id || '-'}</td>
                <td className="py-3 text-xs text-muted-foreground">{log.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
