import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function InsurancePage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: policies = [] } = useQuery({
    queryKey: ['insurance'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/insurance`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  const createPolicy = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/insurance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance'] });
      toast.success('Policy created');
      setShowForm(false);
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Shield size={32} /> Insurance Module</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg">
          <Plus size={18} /> Add Policy
        </button>
      </div>

      {showForm && <PolicyForm onClose={() => setShowForm(false)} onSubmit={(data) => createPolicy.mutate(data)} />}

      <div className="stat-card">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3">Customer</th>
              <th className="text-left py-3">Company</th>
              <th className="text-left py-3">Policy Number</th>
              <th className="text-left py-3">Type</th>
              <th className="text-left py-3">Premium</th>
              <th className="text-left py-3">Expiry</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy: any) => (
              <tr key={policy.id} className="border-b">
                <td className="py-3">{policy.customer_name}</td>
                <td className="py-3">{policy.insurance_company}</td>
                <td className="py-3">{policy.policy_number}</td>
                <td className="py-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{policy.policy_type}</span></td>
                <td className="py-3">₹{Number(policy.premium).toLocaleString()}</td>
                <td className="py-3">{new Date(policy.policy_expiry_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PolicyForm({ onClose, onSubmit }: any) {
  const [form, setForm] = useState({
    loan_id: '',
    insurance_company: '',
    policy_type: 'comprehensive',
    policy_number: '',
    premium: '',
    policy_start_date: '',
    policy_expiry_date: '',
    idv: '',
    ncb_applicable: false,
    ncb_percentage: ''
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add Insurance Policy</h2>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Loan ID" type="number" value={form.loan_id} onChange={e => setForm({...form, loan_id: e.target.value})} className="w-full px-3 py-2 border rounded" />
          <input placeholder="Insurance Company" value={form.insurance_company} onChange={e => setForm({...form, insurance_company: e.target.value})} className="w-full px-3 py-2 border rounded" />
          <select value={form.policy_type} onChange={e => setForm({...form, policy_type: e.target.value})} className="w-full px-3 py-2 border rounded">
            <option value="comprehensive">Comprehensive</option>
            <option value="third_party">Third Party</option>
          </select>
          <input placeholder="Policy Number" value={form.policy_number} onChange={e => setForm({...form, policy_number: e.target.value})} className="w-full px-3 py-2 border rounded" />
          <input placeholder="Premium" type="number" value={form.premium} onChange={e => setForm({...form, premium: e.target.value})} className="w-full px-3 py-2 border rounded" />
          <input placeholder="IDV" type="number" value={form.idv} onChange={e => setForm({...form, idv: e.target.value})} className="w-full px-3 py-2 border rounded" />
          <input type="date" placeholder="Start Date" value={form.policy_start_date} onChange={e => setForm({...form, policy_start_date: e.target.value})} className="w-full px-3 py-2 border rounded" />
          <input type="date" placeholder="Expiry Date" value={form.policy_expiry_date} onChange={e => setForm({...form, policy_expiry_date: e.target.value})} className="w-full px-3 py-2 border rounded" />
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={form.ncb_applicable} onChange={e => setForm({...form, ncb_applicable: e.target.checked})} />
            <label>NCB Applicable</label>
            {form.ncb_applicable && (
              <input placeholder="NCB %" type="number" value={form.ncb_percentage} onChange={e => setForm({...form, ncb_percentage: e.target.value})} className="w-32 px-3 py-2 border rounded" />
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => onSubmit(form)} className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded">Create</button>
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
}
