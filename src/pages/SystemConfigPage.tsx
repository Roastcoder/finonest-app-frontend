import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function SystemConfigPage() {
  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/config`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  const updateConfig = useMutation({
    mutationFn: async ({ key, value }: any) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/config/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ config_value: value })
      });
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Configuration updated');
    },
  });

  const handleUpdate = (key: string, value: string) => {
    updateConfig.mutate({ key, value });
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2"><Settings size={32} /> System Configuration</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card">
          <h2 className="text-xl font-semibold mb-4">General Settings</h2>
          <div className="space-y-4">
            {configs.filter((c: any) => c.config_type === 'general').map((config: any) => (
              <ConfigItem key={config.id} config={config} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>

        <div className="stat-card">
          <h2 className="text-xl font-semibold mb-4">Document Settings</h2>
          <div className="space-y-4">
            {configs.filter((c: any) => c.config_type === 'document').map((config: any) => (
              <ConfigItem key={config.id} config={config} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>

        <div className="stat-card">
          <h2 className="text-xl font-semibold mb-4">Stage Rules</h2>
          <div className="space-y-4">
            {configs.filter((c: any) => c.config_type === 'stage').map((config: any) => (
              <ConfigItem key={config.id} config={config} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>

        <div className="stat-card">
          <h2 className="text-xl font-semibold mb-4">Integration Settings</h2>
          <div className="space-y-4">
            {configs.filter((c: any) => c.config_type === 'integration').map((config: any) => (
              <ConfigItem key={config.id} config={config} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigItem({ config, onUpdate }: any) {
  const [value, setValue] = useState(config.config_value);
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    onUpdate(config.config_key, value);
    setEditing(false);
  };

  return (
    <div className="border-b pb-3">
      <div className="flex items-center justify-between mb-1">
        <label className="font-medium text-sm">{config.config_key.replace(/_/g, ' ').toUpperCase()}</label>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
        ) : (
          <button onClick={handleSave} className="text-xs text-green-600 hover:underline">Save</button>
        )}
      </div>
      {editing ? (
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm"
        />
      ) : (
        <p className="text-sm text-muted-foreground">{value}</p>
      )}
      {config.description && <p className="text-xs text-muted-foreground mt-1">{config.description}</p>}
    </div>
  );
}
