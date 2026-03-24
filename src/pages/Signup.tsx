import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { ArrowRight, Mail, Lock, User, Building2, Shield, BarChart3, Users as UsersIcon, Zap, Download, Eye, EyeOff, UserCircle, CreditCard, FileText, CheckCircle, ArrowLeft, Camera, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const logo = '/Finonest%20logo.png';
  
  // Step 1: PAN Verification
  const [panNumber, setPanNumber] = useState('');
  const [panData, setPanData] = useState<any>(null);
  const [panVerified, setPanVerified] = useState(false);
  const [panError, setPanError] = useState('');
  const [panFetchedName, setPanFetchedName] = useState('');
  const [panFetching, setPanFetching] = useState(false);
  
  // Step 3: Aadhaar Verification
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [aadhaarData, setAadhaarData] = useState<any>(null);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [clientId, setClientId] = useState('');
  
  // Step 2: Personal Details + Phone OTP
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [password, setPassword] = useState('');
  const [role] = useState('executive'); // Fixed role as executive
  const [referCode, setReferCode] = useState('');

  // Step 4: Photo Upload
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState('');
  const [photoUploaded, setPhotoUploaded] = useState(false);

  const steps = [
    { id: 1, title: 'PAN Verification', icon: <CreditCard size={20} /> },
    { id: 2, title: 'Personal Details', icon: <User size={20} /> },
    { id: 3, title: 'Aadhaar Verification', icon: <FileText size={20} /> },
    { id: 4, title: 'Photo Upload', icon: <Camera size={20} /> },
    { id: 5, title: 'Complete Profile', icon: <Shield size={20} /> }
  ];

  // Validation functions
  const validatePAN = (pan: string): boolean => {
    // PAN format: AAAAA9999A (5 letters, 4 numbers, 1 letter)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const handlePANChange = (value: string) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const cleanValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    let validatedValue = '';
    let error = '';
    
    // Validate character by character based on position
    for (let i = 0; i < cleanValue.length && i < 10; i++) {
      const char = cleanValue[i];
      
      if (i < 5) {
        // First 5 positions: only letters allowed
        if (/[A-Z]/.test(char)) {
          validatedValue += char;
        } else {
          error = 'First 5 characters must be letters only';
          break;
        }
      } else if (i >= 5 && i < 9) {
        // Positions 6-9: only digits allowed
        if (/[0-9]/.test(char)) {
          validatedValue += char;
        } else {
          error = 'Characters 6-9 must be digits only';
          break;
        }
      } else if (i === 9) {
        // Position 10: only letter allowed
        if (/[A-Z]/.test(char)) {
          validatedValue += char;
        } else {
          error = 'Last character must be a letter';
          break;
        }
      }
    }
    
    setPanNumber(validatedValue);
    setPanFetchedName('');
    
    // Set error messages
    if (error) {
      setPanError(error);
    } else if (validatedValue.length > 0 && validatedValue.length < 10) {
      setPanError(`PAN must be 10 characters (${validatedValue.length}/10)`);
    } else if (validatedValue.length === 10) {
      if (validatePAN(validatedValue)) {
        setPanError('');
        // Live-fetch name as soon as PAN is complete
        setPanFetching(true);
        fetch(`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'}/kyc/verify-pan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pan_number: validatedValue })
        })
          .then(r => r.json())
          .then(d => { if (d.success && d.data?.full_name) setPanFetchedName(d.data.full_name); })
          .catch(() => {})
          .finally(() => setPanFetching(false));
      } else {
        setPanError('Invalid PAN format');
      }
    } else {
      setPanError('');
    }
  };

  // PAN Verification
  const handlePanVerification = async () => {
    if (!panNumber || panNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit PAN number');
      return;
    }
    
    if (!validatePAN(panNumber)) {
      toast.error('Invalid PAN format. Format: AAAAA9999A (5 letters, 4 numbers, 1 letter)');
      return;
    }
    
    if (panError) {
      toast.error('Please fix PAN validation errors before proceeding');
      return;
    }
    
    setLoading(true);
    try {
      // First check if PAN already exists in our system
      const checkData = await api.post('/auth/check-pan', { pan_number: panNumber });
      
      // If PAN doesn't exist, proceed with KYC verification
      const data = await api.post('/kyc/verify-pan', { pan_number: panNumber });
      
      if (data.success) {
        setPanData(data.data);
        setPanVerified(true);
        setFullName(data.data.full_name);
        toast.success('PAN verified successfully!');
        setCurrentStep(2);
      } else {
        toast.error('PAN verification failed. Please check your PAN number.');
      }
    } catch (error: any) {
      if (error.message.includes('already registered')) {
        toast.error(error.message);
      } else {
        toast.error('PAN verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Send Aadhaar OTP
  const handleSendAadhaarOtp = async () => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      toast.error('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    
    setLoading(true);
    try {
      // First check if Aadhaar already exists in our system
      const checkData = await api.post('/auth/check-aadhaar', { aadhaar_number: aadhaarNumber });
      
      // If Aadhaar doesn't exist, proceed with OTP
      const data = await api.post('/kyc/send-aadhaar-otp', { aadhaar_number: aadhaarNumber });
      
      if (data.success) {
        setClientId(data.client_id);
        setOtpSent(true);
        toast.success('OTP sent to your registered mobile number!');
      } else {
        toast.error('Failed to send OTP. Please check your Aadhaar number.');
      }
    } catch (error: any) {
      if (error.message.includes('already registered')) {
        toast.error(error.message);
      } else {
        toast.error('Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify Aadhaar OTP
  const handleVerifyAadhaarOtp = async () => {
    if (!aadhaarOtp || aadhaarOtp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      const data = await api.post('/kyc/verify-aadhaar-otp', { 
        client_id: clientId,
        otp: aadhaarOtp 
      });
      
      if (data.success) {
        setAadhaarData(data.data);
        setAadhaarVerified(true);
        // Auto-fill email if available and not masked
        if (data.data.email && !email && !data.data.email.includes('*')) {
          setEmail(data.data.email);
        }
        toast.success('Aadhaar verified successfully!');
        setCurrentStep(4);
      } else {
        toast.error('OTP verification failed. Please try again.');
      }
    } catch (error) {
      toast.error('OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Final Signup
  const handleSignup = async () => {
    if (!fullName || !email || !password) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!panVerified || !aadhaarVerified) {
      toast.error('Please complete PAN and Aadhaar verification');
      return;
    }

    if (!validatePAN(panNumber)) {
      toast.error('Invalid PAN format. Please verify your PAN again.');
      return;
    }

    setLoading(true);
    try {
      const response = await signUp({
        name: fullName,
        email,
        password,
        phone,
        role,
        refer_code: referCode,
        pan_number: panNumber,
        aadhaar_number: aadhaarNumber,
        pan_data: panData,
        aadhaar_data: aadhaarData,
        photo_path: photoPath || undefined
      });
      
      if (response.success) {
        toast.success('Account created successfully!');
        navigate('/login');
      }
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const features = [
    { icon: <Shield size={22} />, title: 'Role-Based Access', desc: 'Multi-level permissions for admins, managers, brokers & employees' },
    { icon: <BarChart3 size={22} />, title: 'Real-Time Analytics', desc: 'Track applications, commissions & performance metrics live' },
    { icon: <UsersIcon size={22} />, title: 'Multi-Party Management', desc: 'Banks, NBFCs, brokers & customers — all in one place' },
    { icon: <Zap size={22} />, title: 'Streamlined Workflow', desc: 'Application to disbursement with full document tracking' },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Verify Your PAN</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Enter your PAN number to fetch your details</p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">PAN Number</label>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input
                  type="text"
                  value={panNumber}
                  onChange={(e) => handlePANChange(e.target.value)}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border ${panError ? 'border-red-500' : 'border-white/50 dark:border-white/10'} bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium`}
                />
              </div>
              {panError && <p className="text-xs text-red-500 mt-1 font-semibold">{panError}</p>}
              {panFetching && <p className="text-xs text-blue-500 mt-1 font-semibold">Fetching PAN details...</p>}
              {panFetchedName && !panFetching && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold flex items-center gap-1">
                  <CheckCircle size={12} />
                  {panFetchedName}
                </p>
              )}
              {!panError && !panFetchedName && !panFetching && panNumber.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Format: AAAAA9999A (5 letters, 4 numbers, 1 letter)
                </p>
              )}
            </div>

            {panVerified && panData && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-sm font-semibold text-green-800 dark:text-green-200">PAN Verified</span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">Name: {panData.full_name}</p>
              </div>
            )}

            <button
              onClick={handlePanVerification}
              disabled={loading || !panNumber || panVerified || panError !== ''}
              className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-secondary to-primary border border-white/20"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying PAN...
                </div>
              ) : panVerified ? (
                <>
                  <CheckCircle size={16} />
                  PAN Verified
                </>
              ) : (
                <>
                  Verify PAN
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Personal Details</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Fill in your basic information</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">Mobile Number</label>
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-[140px]">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(val);
                      if (phoneVerified) { setPhoneVerified(false); setPhoneOtpSent(false); setPhoneOtp(''); }
                    }}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    disabled={phoneVerified}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium disabled:opacity-60"
                  />
                </div>
                {!phoneVerified && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!phone || phone.length !== 10) { toast.error('Enter a valid 10-digit mobile number'); return; }
                      setLoading(true);
                      try {
                        await api.post('/auth/send-mobile-otp', { phone });
                        setPhoneOtpSent(true);
                        toast.success('OTP sent to your mobile!');
                      } catch (e: any) {
                        toast.error(e.message || 'Failed to send OTP');
                      } finally { setLoading(false); }
                    }}
                    disabled={loading || phone.length !== 10}
                    className="px-4 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-secondary to-primary disabled:opacity-60 whitespace-nowrap"
                  >
                    {loading ? '...' : phoneOtpSent ? 'Resend' : 'Send OTP'}
                  </button>
                )}
                {phoneVerified && (
                  <div className="flex items-center gap-1 px-3 text-green-600">
                    <CheckCircle size={18} />
                  </div>
                )}
              </div>
              {phoneOtpSent && !phoneVerified && (
                <div className="mt-2 flex gap-2">
                  <div className="relative flex-1 min-w-[140px]">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                    <input
                      type="text"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (phoneOtp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
                      setLoading(true);
                      try {
                        await api.post('/auth/verify-mobile-otp', { phone, otp: phoneOtp });
                        setPhoneVerified(true);
                        toast.success('Mobile number verified!');
                      } catch (e: any) {
                        toast.error(e.message || 'Invalid OTP');
                      } finally { setLoading(false); }
                    }}
                    disabled={loading || phoneOtp.length !== 6}
                    className="px-4 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-secondary to-primary disabled:opacity-60"
                  >
                    {loading ? '...' : 'Verify'}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                if (!fullName.trim()) { toast.error('Please enter your full name'); return; }
                if (!phone.trim() || phone.length !== 10) { toast.error('Please enter a valid 10-digit mobile number'); return; }
                if (!phoneVerified) { toast.error('Please verify your mobile number with OTP'); return; }
                if (!email.trim() || !email.includes('@')) { toast.error('Please enter a valid email address'); return; }
                if (!password.trim() || password.length < 6) { toast.error('Password must be at least 6 characters long'); return; }
                setCurrentStep(3);
              }}
              disabled={!fullName || !email || !password || !phoneVerified}
              className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-secondary to-primary border border-white/20"
            >
              Continue to Aadhaar Verification
              <ArrowRight size={16} />
            </button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Verify Your Aadhaar</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Enter your Aadhaar number and verify with OTP</p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">Aadhaar Number</label>
              <div className="relative">
                <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input
                  type="text"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456789012"
                  maxLength={12}
                  disabled={otpSent}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium disabled:opacity-50"
                />
              </div>
            </div>

            {!otpSent ? (
              <button
                onClick={handleSendAadhaarOtp}
                disabled={loading || !aadhaarNumber || aadhaarNumber.length !== 12}
                className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-secondary to-primary border border-white/20"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending OTP...
                  </div>
                ) : (
                  <>
                    Send OTP
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">Enter OTP</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                    <input
                      type="text"
                      value={aadhaarOtp}
                      onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      maxLength={6}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                    />
                  </div>
                </div>

                {aadhaarVerified && aadhaarData && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-sm font-semibold text-green-800 dark:text-green-200">Aadhaar Verified</span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300">Name: {aadhaarData.full_name}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setOtpSent(false);
                      setAadhaarOtp('');
                      setClientId('');
                    }}
                    className="flex-1 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Resend OTP
                  </button>
                  <button
                    onClick={handleVerifyAadhaarOtp}
                    disabled={loading || !aadhaarOtp || aadhaarOtp.length !== 6 || aadhaarVerified}
                    className="flex-1 flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-secondary to-primary border border-white/20"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying...
                      </div>
                    ) : aadhaarVerified ? (
                      <>
                        <CheckCircle size={16} />
                        Verified
                      </>
                    ) : (
                      <>
                        Verify OTP
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upload Your Photo</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Upload a clear photo for identity verification</p>
            </div>

            <div className="flex flex-col items-center gap-4">
              {/* Preview */}
              <div className="relative w-32 h-32 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); setPhotoPath(''); setPhotoUploaded(false); }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <Camera size={32} className="text-gray-400" />
                )}
              </div>

              {/* File input */}
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                <Upload size={16} />
                {photoFile ? 'Change Photo' : 'Choose Photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5MB'); return; }
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                    setPhotoUploaded(false);
                    setPhotoPath('');
                  }}
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">JPG or PNG, max 5MB</p>
            </div>

            {photoUploaded && (
              <div className="flex items-center gap-2 justify-center text-green-600">
                <CheckCircle size={16} />
                <span className="text-sm font-semibold">Photo uploaded successfully</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm"
              >
                Skip
              </button>
              <button
                onClick={async () => {
                  if (!photoFile) { toast.error('Please select a photo first'); return; }
                  setLoading(true);
                  try {
                    const formData = new FormData();
                    formData.append('photo', photoFile);
                    const BASE = (import.meta as any).env?.VITE_API_URL || '/api';
                    const res = await fetch(`${BASE}/auth/upload-photo`, { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.success) {
                      setPhotoPath(data.photo_path);
                      setPhotoUploaded(true);
                      toast.success('Photo uploaded!');
                      setTimeout(() => setCurrentStep(5), 600);
                    } else {
                      toast.error(data.error || 'Upload failed');
                    }
                  } catch (e: any) {
                    toast.error('Upload failed. Please try again.');
                  } finally { setLoading(false); }
                }}
                disabled={loading || !photoFile}
                className="flex-1 flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg bg-gradient-to-r from-secondary to-primary border border-white/20"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <>
                    Upload & Continue
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Complete Your Profile</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select your role and referral details</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">Role</label>
              <div className="relative">
                <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <div className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm shadow-sm backdrop-blur-md font-medium">
                  Executive
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                You are signing up as an Executive
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                Refer Code
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
              </label>
              <div className="relative">
                <UserCircle size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input
                  type="text"
                  value={referCode}
                  onChange={(e) => setReferCode(e.target.value.toUpperCase())}
                  placeholder="Enter BM/DSA refer code"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {referCode 
                  ? "Enter refer code of Branch Manager or DSA to join their team" 
                  : "Without refer code, your account will need admin approval before you can login"
                }
              </p>
            </div>

            <button
              onClick={handleSignup}
              disabled={loading || !panVerified || !aadhaarVerified}
              className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-secondary to-primary border border-white/20"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account…
                </div>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex bg-transparent font-sans">
      {/* ─── LEFT PANEL ─── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden glass-panel m-4 lg:mr-2 rounded-[2.5rem]">
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full h-full">
          <div className="flex items-center gap-3.5">
            <img src={logo} alt="Finonest India" className="h-14 w-auto object-contain drop-shadow-md" />
          </div>

          <div className="flex-1 flex flex-col justify-center -mt-8">
            <h1 className="text-4xl xl:text-[2.75rem] font-extrabold text-gray-900 dark:text-white leading-[1.15] mb-4 tracking-tight drop-shadow-sm">
              Car Loan Sales<br />
              <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                & Management
              </span>
            </h1>
            <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed max-w-sm mb-8 font-medium">
              Complete loan lifecycle management — from lead generation to disbursement, all in one powerful platform.
            </p>

            <div className="space-y-3.5">
              {features.map(f => (
                <div key={f.title} className="flex items-start gap-3 group">
                  <div className="shrink-0 w-9 h-9 rounded-xl glass-card flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-white/40 dark:group-hover:bg-white/10 transition-all duration-300 shadow-sm border border-white/50 dark:border-white/10">
                    {f.icon}
                  </div>
                  <div className="pt-0.5">
                    <h3 className="text-gray-900 dark:text-white text-sm font-semibold mb-0.5">{f.title}</h3>
                    <p className="text-gray-600 dark:text-slate-400 text-xs leading-relaxed font-medium">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 hidden lg:block">
              <a
                href="/finonest.apk"
                download
                className="inline-flex items-center gap-2.5 glass-card hover:bg-white/60 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 text-sm shadow-sm"
              >
                <Download size={16} className="text-blue-600 dark:text-blue-400" />
                Download Android App
              </a>
            </div>
          </div>

          <p className="text-gray-500 dark:text-slate-400 text-xs font-medium">© 2025 Finonest India. All rights reserved.</p>
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 bg-transparent">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src={logo} alt="Finonest India" className="h-14 w-auto object-contain drop-shadow-md mb-3" />
          </div>

          {/* Card */}
          <div className="glass-card p-7 sm:p-8 shadow-xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight drop-shadow-sm">Create Account</h2>
            </div>

            {/* Stepper */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      currentStep >= step.id 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                    }`}>
                      {currentStep > step.id ? (
                        <CheckCircle size={20} />
                      ) : (
                        step.icon
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 min-w-[1.5rem] h-0.5 mx-1.5 transition-all ${
                        currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="text-center mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Step {currentStep} of {steps.length}: {steps[currentStep - 1]?.title}
                </h3>
              </div>
            </div>

            {/* Step Content */}
            {renderStepContent()}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  onClick={goBack}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              ) : (
                <div />
              )}
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {currentStep === 1 && 'Verify your PAN to continue'}
                {currentStep === 2 && 'Fill in your personal details'}
                {currentStep === 3 && 'Verify your Aadhaar with OTP'}
                {currentStep === 4 && 'Upload your photo'}
                {currentStep === 5 && 'Complete your profile'}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-200/50 dark:border-gray-700/50 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-700 dark:text-blue-400 font-bold hover:underline underline-offset-2">
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-slate-400 mt-5 font-medium drop-shadow-sm">
            Secured with end-to-end encryption
          </p>
        </div>
      </div>
    </div>
  );
}
