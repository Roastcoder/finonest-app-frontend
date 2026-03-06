import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const FIELD_GROUPS = {
  customer: ['customer_id', 'applicant_name', 'mobile', 'co_applicant_name', 'guarantor_name', 'current_address', 'permanent_address'],
  vehicle: ['vehicle_number', 'maker_name', 'model_variant_name', 'mfg_year', 'vertical', 'scheme'],
  loan: ['loan_amount', 'ltv', 'loan_type_vehicle', 'income_source', 'monthly_income'],
  emi: ['irr', 'tenure', 'emi_amount', 'emi_start_date', 'processing_fee'],
  financier: ['assigned_bank_id', 'assigned_broker_id', 'sanction_amount', 'sanction_date'],
  insurance: ['insurance_company_name', 'premium_amount', 'insurance_policy_number', 'insurance_date'],
  rto: ['rc_owner_name', 'rto_agent_name', 'agent_mobile_no'],
  deduction: ['total_deduction', 'net_disbursement_amount', 'payment_received_date'],
};

const ROLES = ['user', 'tl', 'manager'];

export default function FieldPermissions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  if (user?.role !== 'admin') {
    return <div className="text-center py-20 text-muted-foreground">Access Denied</div>;
  }

  const { data: permissions = {}, isLoading } = useQuery({
    queryKey: ['field-permissions'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/field-permissions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch permissions');
      const data = await res.json();
      return data?.permissions || {};
    },
  });

  const [localPermissions, setLocalPermissions] = useState<any>({});

  const savePermissions = useMutation({
    mutationFn: async (perms: any) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/field-permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ permissions: perms }),
      });
      if (!res.ok) throw new Error('Failed to save permissions');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-permissions'] });
      toast.success('Permissions saved');
    },
    onError: () => toast.error('Failed to save permissions'),
  });

  const togglePermission = (role: string, field: string, type: 'view' | 'edit') => {
    setLocalPermissions((prev: any) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [field]: {
          ...prev[role]?.[field],
          [type]: !prev[role]?.[field]?.[type],
        },
      },
    }));
  };

  const currentPerms = Object.keys(localPermissions).length > 0 ? localPermissions : permissions;

  return (
    <div className="max-w-7xl mx-auto px-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Field Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Control what fields each role can view and edit</p>
        </div>
        <button
          onClick={() => savePermissions.mutate(currentPerms)}
          disabled={savePermissions.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          Save Changes
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(FIELD_GROUPS).map(([group, fields]) => (
            <div key={group} className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-bold text-foreground mb-4 capitalize">{group} Fields</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-semibold text-foreground">Field</th>
                      {ROLES.map(role => (
                        <th key={role} className="text-center py-2 px-3 font-semibold text-foreground capitalize" colSpan={2}>
                          {role}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th></th>
                      {ROLES.map(role => (
                        <>
                          <th key={`${role}-view`} className="text-center py-1 px-2">View</th>
                          <th key={`${role}-edit`} className="text-center py-1 px-2">Edit</th>
                        </>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map(field => (
                      <tr key={field} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium text-foreground">{field.replace(/_/g, ' ')}</td>
                        {ROLES.map(role => (
                          <>
                            <td key={`${role}-${field}-view`} className="text-center py-2 px-2">
                              <input
                                type="checkbox"
                                checked={currentPerms[role]?.[field]?.view || false}
                                onChange={() => togglePermission(role, field, 'view')}
                                className="w-4 h-4 rounded border-border cursor-pointer"
                              />
                            </td>
                            <td key={`${role}-${field}-edit`} className="text-center py-2 px-2">
                              <input
                                type="checkbox"
                                checked={currentPerms[role]?.[field]?.edit || false}
                                onChange={() => togglePermission(role, field, 'edit')}
                                className="w-4 h-4 rounded border-border cursor-pointer"
                              />
                            </td>
                          </>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
