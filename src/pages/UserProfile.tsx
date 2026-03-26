import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { User, CreditCard, FileText, MapPin, CheckCircle, XCircle, Eye, EyeOff, Pencil, Check, X, Camera, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function UserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [verifyingPan, setVerifyingPan] = useState(false);
  const [panInput, setPanInput] = useState('');
  const [showPanForm, setShowPanForm] = useState(false);
  // Aadhaar OTP flow
  const [showAadhaarForm, setShowAadhaarForm] = useState(false);
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [aadhaarStep, setAadhaarStep] = useState<'number' | 'otp'>('number');
  const [aadhaarSessionId, setAadhaarSessionId] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false);

  useEffect(() => {
    api.get('/auth/profile')
      .then((data) => { setProfile(data); setPhoneValue(data.phone || ''); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5MB'); return; }
    setUploadingPhoto(true);
    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`${API_BASE}/api/auth/profile/photo`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setProfile((prev: any) => ({ ...prev, photo_path: data.photo_path }));
        toast.success('Photo updated!');
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSavePhone = async () => {
    if (!phoneValue || phoneValue.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setSavingPhone(true);
    try {
      await api.put('/auth/profile/phone', { phone: phoneValue });
      setProfile((prev: any) => ({ ...prev, phone: phoneValue }));
      setEditingPhone(false);
      toast.success('Mobile number updated!');
    } catch {
      toast.error('Failed to update mobile number');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleVerifyPan = async () => {
    if (!panInput || panInput.length !== 10) { toast.error('Enter a valid 10-character PAN'); return; }
    setVerifyingPan(true);
    try {
      const data = await api.post('/kyc/verify-and-save-pan', { pan_number: panInput.toUpperCase() });
      // Merge returned pan data directly into profile kyc
      setProfile((prev: any) => ({
        ...prev,
        kyc: {
          ...prev.kyc,
          pan_number: data.data?.pan_number || panInput.toUpperCase(),
          pan_verified: true,
          pan_details: {
            full_name: data.data?.full_name || '',
            dob: data.data?.dob || '',
            gender: data.data?.gender || '',
            category: data.data?.category || '',
          }
        }
      }));
      setShowPanForm(false);
      setPanInput('');
      toast.success('PAN verified successfully!');
    } catch (err: any) {
      toast.error(err.message || 'PAN verification failed');
    } finally {
      setVerifyingPan(false);
    }
  };

  const handleSendAadhaarOtp = async () => {
    if (!aadhaarInput || aadhaarInput.length !== 12) { toast.error('Enter a valid 12-digit Aadhaar number'); return; }
    setSendingOtp(true);
    try {
      const data = await api.post('/kyc/send-aadhaar-otp', { aadhaar_number: aadhaarInput });
      setAadhaarSessionId(data.session_id || data.client_id || '');
      setAadhaarStep('otp');
      toast.success('OTP sent to your Aadhaar-linked mobile!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (!aadhaarOtp || aadhaarOtp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setVerifyingAadhaar(true);
    try {
      const data = await api.post('/kyc/verify-aadhaar-otp', { session_id: aadhaarSessionId, otp: aadhaarOtp });
      // Save aadhaar data to backend
      await api.post('/kyc/save-aadhaar-data', { aadhaar_data: data.data, user_id: user?.id });
      const addr = data.data?.address || data.data?.full_address || '';
      setProfile((prev: any) => ({
        ...prev,
        kyc: {
          ...prev.kyc,
          aadhaar_number: data.data?.aadhaar_number || aadhaarInput,
          aadhaar_verified: true,
          aadhaar_details: {
            full_name: data.data?.full_name || data.data?.name || '',
            date_of_birth: data.data?.date_of_birth || data.data?.dob || '',
            gender: data.data?.gender || '',
            father_name: data.data?.father_name || '',
            phone: data.data?.phone || data.data?.mobile || '',
            address: addr,
          }
        }
      }));
      setShowAadhaarForm(false);
      setAadhaarInput('');
      setAadhaarOtp('');
      setAadhaarStep('number');
      setAadhaarSessionId('');
      toast.success('Aadhaar verified successfully!');
    } catch (err: any) {
      toast.error(err.message || 'OTP verification failed');
    } finally {
      setVerifyingAadhaar(false);
    }
  };

  const maskAadhaar = (num: string) => {
    if (!num) return '************';
    return 'XXXX-XXXX-' + num.slice(-4);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="text-center text-gray-500 py-16">Failed to load profile.</div>
  );

  const kyc = profile.kyc || {};

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card p-6 flex items-center gap-5">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white font-bold text-2xl shadow-md">
            {profile.photo_path ? (
              <img
                src={`${API_BASE}/${profile.photo_path}`}
                alt={profile.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              profile.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            )}
          </div>
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/80 transition-colors"
            title="Change photo"
          >
            {uploadingPhoto ? (
              <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Camera size={12} />
            )}
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{profile.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{profile.role?.replace('_', ' ')}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${profile.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {profile.status}
            </span>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <User size={16} /> Basic Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="User ID" value={profile.user_id} />
          {/* Editable Mobile Number */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mobile Number</span>
            {editingPhone ? (
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  value={phoneValue}
                  onChange={(e) => setPhoneValue(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  className="flex-1 text-sm font-bold px-3 py-1.5 rounded-lg border border-primary/40 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
                <button onClick={handleSavePhone} disabled={savingPhone} className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors">
                  <Check size={14} />
                </button>
                <button onClick={() => { setEditingPhone(false); setPhoneValue(profile.phone || ''); }} className="p-1.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{profile.phone || '—'}</span>
                <button onClick={() => setEditingPhone(true)} className="p-1 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors">
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>
          <InfoRow label="Branch" value={profile.branch_name || '—'} />
          <InfoRow label="Manager" value={profile.manager_name || '—'} />
          {kyc.date_of_birth && <InfoRow label="Date of Birth" value={new Date(kyc.date_of_birth).toLocaleDateString('en-IN')} />}
          {kyc.gender && <InfoRow label="Gender" value={kyc.gender} />}
          {kyc.father_name && <InfoRow label="Father's Name" value={kyc.father_name} />}
          <InfoRow label="Member Since" value={profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN') : '—'} />
        </div>
      </div>

      {/* PAN Details */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <CreditCard size={16} /> PAN Details
          {kyc.pan_verified
            ? <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-semibold"><CheckCircle size={14} /> Verified</span>
            : (
              <div className="ml-auto flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-red-500 font-semibold"><XCircle size={14} /> Not Verified</span>
                <button
                  onClick={() => setShowPanForm(v => !v)}
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <ShieldCheck size={13} /> Get Verified
                </button>
              </div>
            )}
        </h2>
        {showPanForm && !kyc.pan_verified && (
          <div className="mb-4 flex items-center gap-2">
            <input
              type="text"
              value={panInput}
              onChange={e => setPanInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
              placeholder="Enter PAN (e.g. ABCDE1234F)"
              className="flex-1 text-sm font-mono px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              maxLength={10}
            />
            <button
              onClick={handleVerifyPan}
              disabled={verifyingPan}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {verifyingPan ? 'Verifying…' : 'Verify'}
            </button>
            <button onClick={() => { setShowPanForm(false); setPanInput(''); }} className="p-2 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><X size={14} /></button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="PAN Number" value={kyc.pan_number || '—'} mono />
          <InfoRow label="Full Name" value={kyc.pan_details?.full_name || '—'} />
          {kyc.pan_details?.dob && <InfoRow label="Date of Birth" value={kyc.pan_details.dob} />}
          {kyc.pan_details?.gender && <InfoRow label="Gender" value={kyc.pan_details.gender} />}
          {kyc.pan_details?.category && <InfoRow label="Category" value={kyc.pan_details.category} />}
        </div>
      </div>

      {/* Aadhaar Details */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText size={16} /> Aadhaar Details
          {kyc.aadhaar_verified
            ? <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-semibold"><CheckCircle size={14} /> Verified</span>
            : (
              <div className="ml-auto flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-red-500 font-semibold"><XCircle size={14} /> Not Verified</span>
                <button
                  onClick={() => setShowAadhaarForm(v => !v)}
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <ShieldCheck size={13} /> Get Verified
                </button>
              </div>
            )}
        </h2>
        {showAadhaarForm && !kyc.aadhaar_verified && (
          <div className="mb-4 space-y-2">
            {aadhaarStep === 'number' ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aadhaarInput}
                  onChange={e => setAadhaarInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="Enter 12-digit Aadhaar number"
                  className="flex-1 text-sm font-mono px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  maxLength={12}
                />
                <button
                  onClick={handleSendAadhaarOtp}
                  disabled={sendingOtp}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {sendingOtp ? 'Sending…' : 'Send OTP'}
                </button>
                <button onClick={() => { setShowAadhaarForm(false); setAadhaarInput(''); setAadhaarStep('number'); }} className="p-2 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aadhaarOtp}
                  onChange={e => setAadhaarOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="flex-1 text-sm font-mono px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  maxLength={6}
                  autoFocus
                />
                <button
                  onClick={handleVerifyAadhaarOtp}
                  disabled={verifyingAadhaar}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {verifyingAadhaar ? 'Verifying…' : 'Verify OTP'}
                </button>
                <button onClick={() => setAadhaarStep('number')} className="text-xs text-primary underline">Resend</button>
                <button onClick={() => { setShowAadhaarForm(false); setAadhaarInput(''); setAadhaarOtp(''); setAadhaarStep('number'); }} className="p-2 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><X size={14} /></button>
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Masked Aadhaar with toggle */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Aadhaar Number</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                {showAadhaar ? kyc.aadhaar_number || '—' : maskAadhaar(kyc.aadhaar_number)}
              </span>
              {kyc.aadhaar_number && (
                <button onClick={() => setShowAadhaar(!showAadhaar)} className="text-gray-400 hover:text-primary transition-colors">
                  {showAadhaar ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
          </div>
          <InfoRow label="Full Name" value={kyc.aadhaar_details?.full_name || '—'} />
          {kyc.aadhaar_details?.date_of_birth && <InfoRow label="Date of Birth" value={kyc.aadhaar_details.date_of_birth} />}
          {kyc.aadhaar_details?.gender && <InfoRow label="Gender" value={kyc.aadhaar_details.gender} />}
          {kyc.aadhaar_details?.father_name && <InfoRow label="Father's Name" value={kyc.aadhaar_details.father_name} />}
          {kyc.aadhaar_details?.phone && <InfoRow label="Linked Mobile" value={kyc.aadhaar_details.phone} />}
        </div>
      </div>

      {/* Address — always shown, sourced from Aadhaar details */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <MapPin size={16} /> Address
        </h2>
        {(() => {
          const a = kyc.aadhaar_details?.address;
          const structured = kyc.address;
          // Priority 1: structured address from kyc.address
          if (structured?.line1) {
            return <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{[structured.line1, structured.line2, structured.city, structured.state, structured.pincode, structured.country].filter(Boolean).join(', ')}</p>;
          }
          // Priority 2: address object from Aadhaar (Neokred returns house/street/vtc/district/state/pincode)
          if (typeof a === 'object' && a !== null) {
            const parts = [a.house, a.street, a.street2, a.landmark, a.locality, a.vtc, a.po, a.subdist, a.dist, a.district, a.state, a.pc, a.pincode, a.zip, a.country].filter(Boolean);
            if (parts.length > 0) return <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{parts.join(', ')}</p>;
          }
          // Priority 3: flat string address
          if (typeof a === 'string' && a.trim()) {
            return <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{a}</p>;
          }
          return <p className="text-sm text-gray-400 italic">Address will appear after Aadhaar verification</p>;
        })()}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-bold ${mono ? 'font-mono' : ''} ${highlight ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </span>
    </div>
  );
}
