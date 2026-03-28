import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Lock, Users, Eye, Edit, Trash2, ChevronDown, ChevronUp, RotateCcw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const ROLES = {
  sales_manager: { label: 'Sales Manager', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  branch_manager: { label: 'Branch Manager', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  team_leader: { label: 'Team Leader', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  executive: { label: 'Executive', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  dsa: { label: 'DSA', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' }
};

const MODULES = {
  dashboard: { label: 'Dashboard', icon: '📊' },
  leads: { label: 'Leads', icon: '👥' },
  loans: { label: 'Loans', icon: '💰' },
  applications: { label: 'Applications', icon: '📋' },
  users: { label: 'Users', icon: '👤' },
  reports: { label: 'Reports', icon: '📈' },
  settings: { label: 'Settings', icon: '⚙️' }
};

export default function FieldPermissions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('sales_manager');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['dashboard', 'leads', 'loans']));
  const [permissions, setPermissions] = useState<any>({});
  const [initialPermissions, setInitialPermissions] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center">
          <Lock size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">Only administrators can manage permissions</p>
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
    queryKey: ['all-permissions'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/permissions/all`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch permissions');
      return await res.json();
    },
  });

  useEffect(() => {
    if (allPermissions) {
      setPermissions(allPermissions);
      setInitialPermissions(JSON.parse(JSON.stringify(allPermissions)));
    }
  }, [allPermissions]);

  const savePermissions = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/permissions`, {
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
      queryClient.invalidateQueries({ queryKey: ['all-permissions'] });
      toast.success('Permissions saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save permissions');
    },
  });

  const resetPermissions = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/permissions/reset`, {
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
      queryClient.invalidateQueries({ queryKey: ['all-permissions'] });
      toast.success('Permissions reset to defaults');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reset permissions');
    },
  });

  const toggleModulePermission = (module: string, permission: string) => {
    setPermissions(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [module]: {
          ...prev[selectedRole]?.[module],
          [permission]: !prev[selectedRole]?.[module]?.[permission]
        }
      }
    }));
  };

  const toggleNestedPermission = (module: string, section: string, permission: string) => {
    setPermissions(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [module]: {
          ...prev[selectedRole]?.[module],
          [section]: {
            ...prev[selectedRole]?.[module]?.[section],
            [permission]: !prev[selectedRole]?.[module]?.[section]?.[permission]
          }
        }
      }
    }));
  };

  const toggleModule = (module: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(module)) {
      newExpanded.delete(module);
    } else {
      newExpanded.add(module);
    }
    setExpandedModules(newExpanded);
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
          <h1 className="text-3xl font-bold text-foreground">Role Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage access control for all modules and features (Admin has full access)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
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

        {/* Right Content - Permissions */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading permissions...</p>
            </div>
          ) : (
            Object.entries(MODULES).map(([moduleKey, moduleData]: any) => (
              <div key={moduleKey} className="bg-card rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => toggleModule(moduleKey)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{moduleData.icon}</span>
                    <h3 className="font-semibold text-foreground">{moduleData.label}</h3>
                  </div>
                  {expandedModules.has(moduleKey) ? (
                    <ChevronUp size={18} className="text-primary" />
                  ) : (
                    <ChevronDown size={18} className="text-muted-foreground" />
                  )}
                </button>

                {expandedModules.has(moduleKey) && (
                  <div className="border-t border-border p-4 space-y-3">
                    {moduleKey === 'dashboard' && (
                      <>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Dashboard Access</p>
                          <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentRolePermissions.dashboard?.view || false}
                              onChange={() => toggleModulePermission('dashboard', 'view')}
                              className="w-4 h-4 rounded border-border cursor-pointer"
                            />
                            <span className="text-sm text-foreground">View Dashboard</span>
                          </label>
                          <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentRolePermissions.dashboard?.export || false}
                              onChange={() => toggleModulePermission('dashboard', 'export')}
                              className="w-4 h-4 rounded border-border cursor-pointer"
                            />
                            <span className="text-sm text-foreground">Export Dashboard Data</span>
                          </label>
                        </div>
                        <div className="space-y-2 pt-3 border-t border-border/50">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Dashboard Components</p>
                          {[
                            { key: 'loginVolume', label: '📊 Login Volume Chart' },
                            { key: 'disbursement', label: '💰 Disbursement Chart' },
                            { key: 'approvedLoans', label: '✅ Approved Loans Card' },
                            { key: 'performanceChart', label: '📈 Performance Chart' },
                            { key: 'stageDistribution', label: '🎯 Stage Distribution Pie' },
                            { key: 'bankDistribution', label: '🏢 Bank Distribution Pie' },
                            { key: 'statusDistribution', label: '📊 Status Distribution Pie' },
                            { key: 'criticalNodes', label: '⚠️ Critical Nodes Status' },
                            { key: 'globalTraffic', label: '🌍 Global Traffic Density' },
                            { key: 'applicationBreakdown', label: '📋 Application Breakdown' },
                            { key: 'financierPerformance', label: '🏢 Financier Performance' }
                          ].map(comp => (
                            <label key={comp.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentRolePermissions.dashboard?.components?.[comp.key] || false}
                                onChange={() => toggleNestedPermission('dashboard', 'components', comp.key)}
                                className="w-4 h-4 rounded border-border cursor-pointer"
                              />
                              <span className="text-sm text-foreground">{comp.label}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    )}

                    {moduleKey === 'leads' && (
                      <>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase">List Permissions</p>
                          {['view', 'create', 'edit', 'delete', 'export', 'assign', 'changeStatus'].map(perm => (
                            <label key={perm} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentRolePermissions.leads?.list?.[perm] || false}
                                onChange={() => toggleNestedPermission('leads', 'list', perm)}
                                className="w-4 h-4 rounded border-border cursor-pointer"
                              />
                              <span className="text-sm text-foreground capitalize">{perm}</span>
                            </label>
                          ))}
                        </div>
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Document Permissions</p>
                          {['upload', 'view', 'delete'].map(perm => (
                            <label key={perm} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentRolePermissions.leads?.documents?.[perm] || false}
                                onChange={() => toggleNestedPermission('leads', 'documents', perm)}
                                className="w-4 h-4 rounded border-border cursor-pointer"
                              />
                              <span className="text-sm text-foreground capitalize">{perm}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    )}

                    {moduleKey === 'loans' && (
                      <>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase">List Permissions</p>
                          {['view', 'create', 'edit', 'delete', 'export', 'changeStatus'].map(perm => (
                            <label key={perm} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentRolePermissions.loans?.list?.[perm] || false}
                                onChange={() => toggleNestedPermission('loans', 'list', perm)}
                                className="w-4 h-4 rounded border-border cursor-pointer"
                              />
                              <span className="text-sm text-foreground capitalize">{perm}</span>
                            </label>
                          ))}
                        </div>
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Actions</p>
                          {['disburse', 'approve', 'reject', 'addNotes'].map(perm => (
                            <label key={perm} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentRolePermissions.loans?.actions?.[perm] || false}
                                onChange={() => toggleNestedPermission('loans', 'actions', perm)}
                                className="w-4 h-4 rounded border-border cursor-pointer"
                              />
                              <span className="text-sm text-foreground capitalize">{perm}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    )}

                    {moduleKey === 'applications' && (
                      <>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase">List Permissions</p>
                          {['view', 'create', 'edit', 'delete', 'export'].map(perm => (
                            <label key={perm} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentRolePermissions.applications?.list?.[perm] || false}
                                onChange={() => toggleNestedPermission('applications', 'list', perm)}
                                className="w-4 h-4 rounded border-border cursor-pointer"
                              />
                              <span className="text-sm text-foreground capitalize">{perm}</span>
                            </label>
                          ))}
                        </div>
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Actions</p>
                          {['changeStage', 'addNotes'].map(perm => (
                            <label key={perm} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentRolePermissions.applications?.actions?.[perm] || false}
                                onChange={() => toggleNestedPermission('applications', 'actions', perm)}
                                className="w-4 h-4 rounded border-border cursor-pointer"
                              />
                              <span className="text-sm text-foreground capitalize">{perm}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    )}

                    {moduleKey === 'users' && (
                      <>
                        {['view', 'create', 'edit', 'delete'].map(perm => (
                          <label key={perm} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentRolePermissions.users?.[perm] || false}
                              onChange={() => toggleModulePermission('users', perm)}
                              className="w-4 h-4 rounded border-border cursor-pointer"
                            />
                            <span className="text-sm text-foreground capitalize">{perm} Users</span>
                          </label>
                        ))}
                      </>
                    )}

                    {moduleKey === 'reports' && (
                      <>
                        {['view', 'export', 'create'].map(perm => (
                          <label key={perm} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentRolePermissions.reports?.[perm] || false}
                              onChange={() => toggleModulePermission('reports', perm)}
                              className="w-4 h-4 rounded border-border cursor-pointer"
                            />
                            <span className="text-sm text-foreground capitalize">{perm} Reports</span>
                          </label>
                        ))}
                      </>
                    )}

                    {moduleKey === 'settings' && (
                      <>
                        {['view', 'edit'].map(perm => (
                          <label key={perm} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentRolePermissions.settings?.[perm] || false}
                              onChange={() => toggleModulePermission('settings', perm)}
                              className="w-4 h-4 rounded border-border cursor-pointer"
                            />
                            <span className="text-sm text-foreground capitalize">{perm} Settings</span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
