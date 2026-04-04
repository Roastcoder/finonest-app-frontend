import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AuditLogPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ user: '', action: '', startDate: '', endDate: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteFromDate, setDeleteFromDate] = useState('');
  const [deleteToDate, setDeleteToDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: logs = [] } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters as any);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/audit-logs?${params}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } }
      );
      return response.ok ? await response.json() : [];
    },
  });

  const deleteLogs = useMutation({
    mutationFn: async ({ fromDate, toDate }: { fromDate: string; toDate: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/audit-logs/delete-range`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({ fromDate, toDate })
        }
      );
      if (!response.ok) throw new Error('Failed to delete logs');
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success(`Successfully deleted ${data.deletedCount} audit log(s)`);
      setShowDeleteModal(false);
      setDeleteFromDate('');
    },
    onError: () => {
      toast.error('Failed to delete audit logs');
    }
  });

  const handleDeleteLogs = () => {
    if (!deleteFromDate) {
      toast.error('Please select a start date');
      return;
    }
    deleteLogs.mutate({ fromDate: deleteFromDate, toDate: deleteToDate });
  };

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
        <div className="flex gap-2">
          <button 
            onClick={() => setShowDeleteModal(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 size={18} /> Delete Logs
          </button>
          <button onClick={exportLogs} className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity">
            <Download size={18} /> Export
          </button>
        </div>
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
                <td className="py-3">{log.user_name || log.user_id}</td>
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

      {/* Delete Logs Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Delete Audit Logs</h3>
                <p className="text-sm text-muted-foreground mt-1">Select date range to delete logs</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Calendar size={14} className="inline mr-1" />
                  From Date *
                </label>
                <input
                  type="date"
                  value={deleteFromDate}
                  onChange={e => setDeleteFromDate(e.target.value)}
                  max={deleteToDate}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Calendar size={14} className="inline mr-1" />
                  To Date (Today)
                </label>
                <input
                  type="date"
                  value={deleteToDate}
                  onChange={e => setDeleteToDate(e.target.value)}
                  min={deleteFromDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 font-medium">
                  ⚠️ Warning: This action cannot be undone. All audit logs from {deleteFromDate || '(select date)'} to {deleteToDate} will be permanently deleted.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteFromDate('');
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLogs}
                disabled={!deleteFromDate || deleteLogs.isPending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLogs.isPending ? 'Deleting...' : 'Delete Logs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
