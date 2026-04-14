import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Lock, RotateCcw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const ROLES = {
  sales_manager: { label: 'Sales Manager', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  branch_manager: { label: 'Branch Manager', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  team_leader: { label: 'Team Leader', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  executive: { label: 'Executive', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  dsa: { label: 'DSA', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' }
};

const DASHBOARD_COMPONENTS = [
  { key: 'loginVolume', label: '📊 Login Volume Chart', description: 'Shows login count by bank' },
  { key: 'disbursement', label: '💰 Disbursement Chart', description: 'Shows disbursement amount by bank' },
  { key: 'approvedLoans', label: '✅ Approved Loans Card', description: 'Displays approved loan statistics' },
  { key: 'performanceChart', label: '📈 Performance Chart', description: 'Shows performance trend over time' },
  { key: 'stageDistribution', label: '🎯 Stage Distribution Pie', description: 'Pie chart of application stages' },
  { key: 'bankDistribution', label: '🏢 Bank Distribution Pie', description: 'Pie chart of bank distribution' },
  { key: 'statusDistribution', label: '📊 Status Distribution Pie', description: 'Pie chart of status distribution' },
  { key: 'timer', label: '⏱️ 24-Hour Stage Timer', description: 'Shows countdown timer for SUBMITTED→LOGIN and LOGIN→IN_PROCESS stage transitions' },
];

export default function DashboardPermissions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('sales_manager');
  const [expandedRole, setExpandedRole] = useState(true);
  const [permissions, setPermissions] = useState<any>({});
  const [initialPermissions, setInitialPermissions] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [globalTimerEnabled, setGlobalTimerEnabled] = useState(true);
  const [isTogglingTimer, setIsTogglingTimer] = useState(false);

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center">
          <Lock size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">Only administrators can manage dashboard permissions</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { data: allPermissions, isLoading } = useQuery({
    queryKey: ['dashboard-permissions'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/permissions/dashboard`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch permissions');
      return await res.json();
    },
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/config`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  useEffect(() => {
    if (allPermissions) {
      setPermissions(allPermissions);
      setInitialPermissions(JSON.parse(JSON.stringify(allPermissions)));
      
      // Check if timer is enabled from system config
      const timerConfig = configs.find((c: any) => c.config_key === 'login_stage_enabled');
      const configEnabled = timerConfig ? timerConfig.config_value === 'true' : true;
      
      // Also check if timer is enabled in any role permissions
      const anyTimerEnabled = Object.values(allPermissions).some(
        (perm: any) => perm?.dashboard?.components?.timer === true
      );
      
      // Timer is enabled only if BOTH config is true AND at least one role has permission
      setGlobalTimerEnabled(configEnabled && anyTimerEnabled);
    }
  }, [allPermissions, configs]);

  const savePermissions = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/permissions/dashboard`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ role: selectedRole, permissions: permissions[selectedRole] }),
      });
      if (!res.ok) throw new Error('Failed to save permissions');
      return res.json();
    },
    onSuccess: () => {
      setInitialPermissions(JSON.parse(JSON.stringify(permissions)));
      queryClient.invalidateQueries({ queryKey: ['dashboard-permissions'] });
      toast.success('Dashboard permissions saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save permissions');
    },
  });

  const toggleGlobalTimer = async () => {
    setIsTogglingTimer(true);
    try {
      const newTimerState = !globalTimerEnabled;
      
      // Update login_stage_enabled config to match with permission page
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/config/key/login_stage_enabled`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ 
          config_value: newTimerState ? 'true' : 'false',
          description: `Login stage ${newTimerState ? 'enabled' : 'disabled'} for all roles`
        }),
      });
      
      // Update all roles permissions
      const updatedPermissions = { ...permissions };
      Object.keys(updatedPermissions).forEach(role => {
        if (!updatedPermissions[role].dashboard) {
          updatedPermissions[role].dashboard = { view: true, export: true, components: {} };
        }
        if (!updatedPermissions[role].dashboard.components) {
          updatedPermissions[role].dashboard.components = {};
        }
        updatedPermissions[role].dashboard.components.timer = newTimerState;
      });
      
      // Save all roles to backend
      for (const role of Object.keys(updatedPermissions)) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/permissions/dashboard`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({ role, permissions: updatedPermissions[role] }),
        });
      }
      
      setPermissions(updatedPermissions);
      setInitialPermissions(JSON.parse(JSON.stringify(updatedPermissions)));
      setGlobalTimerEnabled(newTimerState);
      queryClient.invalidateQueries({ queryKey: ['dashboard-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      
      toast.success(`Timer ${newTimerState ? 'enabled' : 'disabled'} for all roles`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle timer');
    } finally {
      setIsTogglingTimer(false);
    }
  };

  const resetPermissions = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/permissions/dashboard/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (!res.ok) throw new Error('Failed to reset permissions');
      return res.json();
    },
    onSuccess: (data) => {
      setPermissions(prev => ({ ...prev, [selectedRole]: data.permissions }));
      setInitialPermissions(prev => ({ ...prev, [selectedRole]: data.permissions }));
      queryClient.invalidateQueries({ queryKey: ['dashboard-permissions'] });
      toast.success('Dashboard permissions reset to defaults');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reset permissions');
    },
  });

  const toggleComponentPermission = (componentKey: string) => {
    setPermissions(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        components: {
          ...prev[selectedRole]?.components,
          [componentKey]: !prev[selectedRole]?.components?.[componentKey]
        }
      }
    }));
  };

  const currentRolePermissions = permissions[selectedRole] || {};
  const isChanged = JSON.stringify(permissions[selectedRole]) !== JSON.stringify(initialPermissions[selectedRole]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Control which dashboard components each role can view</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={toggleGlobalTimer}
            disabled={isTogglingTimer}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              globalTimerEnabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            } disabled:opacity-50`}
          >
            ⏱️ Timer: {isTogglingTimer ? 'Updating...' : globalTimerEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => resetPermissions.mutate()}
            disabled={resetPermissions.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-medium transition-colors"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            onClick={() => savePermissions.mutate()}
            disabled={savePermissions.isPending || !isChanged}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium transition-colors"
          >
            <Save size={16} />
            {savePermissions.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {isChanged && (
        <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-300">You have unsaved changes</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Roles */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg border border-border overflow-hidden sticky top-4">
            <div className="p-4 bg-muted/30 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Select Role</h3>
            </div>
            <div className="divide-y divide-border">
              {Object.entries(ROLES).map(([roleKey, roleData]) => (
                <button
                  key={roleKey}
                  onClick={() => setSelectedRole(roleKey)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selectedRole === roleKey
                      ? 'bg-primary/10 border-l-4 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <p className="font-medium text-foreground text-sm">{roleData.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content - Dashboard Components */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading permissions...</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setExpandedRole(!expandedRole)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <h3 className="font-semibold text-foreground">Dashboard Components</h3>
                </div>
                {expandedRole ? (
                  <ChevronUp size={18} className="text-primary" />
                ) : (
                  <ChevronDown size={18} className="text-muted-foreground" />
                )}
              </button>

              {expandedRole && (
                <div className="border-t border-border p-4 space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-4">Select components visible to {ROLES[selectedRole as keyof typeof ROLES]?.label}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {DASHBOARD_COMPONENTS.map(comp => (
                      <label
                        key={comp.key}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 cursor-pointer border border-border/50 hover:border-primary/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={currentRolePermissions.components?.[comp.key] || false}
                          onChange={() => toggleComponentPermission(comp.key)}
                          className="w-4 h-4 rounded border-border cursor-pointer mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{comp.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{comp.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Note:</strong> Admin role always has access to all dashboard components. These permissions apply to other roles only.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
