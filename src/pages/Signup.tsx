import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Mail, Lock, User, Building2, Shield, BarChart3, Users as UsersIcon, Zap, Download, Eye, EyeOff, UserCircle, CreditCard, FileText, CheckCircle, ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.png';
import { toast } from 'sonner';
import React from 'react';

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Step 1: PAN Verification
  const [panNumber, setPanNumber] = useState('');
  const [panData, setPanData] = useState<any>(null);
  const [panVerified, setPanVerified] = useState(false);
  const [panError, setPanError] = useState('');
  
  // Step 2: Aadhaar Verification
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [aadhaarData, setAadhaarData] = useState<any>(null);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [clientId, setClientId] = useState('');
  
  // Step 3: User Details
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('executive');
  const [referCode, setReferCode] = useState('');

  const steps = [
    { id: 1, title: 'PAN Verification', icon: <CreditCard size={20} /> },
    { id: 2, title: 'Personal Details', icon: <User size={20} /> },
    { id: 3, title: 'Aadhaar Verification', icon: <FileText size={20} /> },
    { id: 4, title: 'Complete Profile', icon: <Shield size={20} /> }
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
    
    // Set error messages
    if (error) {
      setPanError(error);
    } else if (validatedValue.length > 0 && validatedValue.length < 10) {
      setPanError(`PAN must be 10 characters (${validatedValue.length}/10)`);
    } else if (validatedValue.length === 10) {
      if (validatePAN(validatedValue)) {
        setPanError('');
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
      const response = await fetch('http://localhost:5000/api/kyc/verify-pan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pan_number: panNumber })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPanData(data.data);
        setPanVerified(true);
        setFullName(data.data.full_name);
        toast.success('PAN verified successfully!');
        setCurrentStep(2);
      } else {
        toast.error('PAN verification failed. Please check your PAN number.');
      }
    } catch (error) {
      toast.error('PAN verification failed. Please try again.');
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
      const response = await fetch('http://localhost:5000/api/kyc/send-aadhaar-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaar_number: aadhaarNumber })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setClientId(data.client_id);
        setOtpSent(true);
        toast.success('OTP sent to your registered mobile number!');
      } else {
        toast.error('Failed to send OTP. Please check your Aadhaar number.');
      }
    } catch (error) {
      toast.error('Failed to send OTP. Please try again.');
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
      const response = await fetch('http://localhost:5000/api/kyc/verify-aadhaar-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          client_id: clientId,
          otp: aadhaarOtp 
        })
      });
      
      const data = await response.json();
      
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
        role,
        refer_code: referCode,
        pan_number: panNumber,
        aadhaar_number: aadhaarNumber,
        pan_data: panData,
        aadhaar_data: aadhaarData
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
              {!panError && panNumber.length === 10 && validatePAN(panNumber) && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold flex items-center gap-1">
                  <CheckCircle size={12} />
                  Valid PAN format
                </p>
              )}
              {!panError && panNumber.length === 0 && (
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
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                />
              </div>
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
                if (!fullName.trim()) {
                  toast.error('Please enter your full name');
                  return;
                }
                if (!email.trim() || !email.includes('@')) {
                  toast.error('Please enter a valid email address');
                  return;
                }
                if (!password.trim() || password.length < 6) {
                  toast.error('Password must be at least 6 characters long');
                  return;
                }
                setCurrentStep(3);
              }}
              disabled={!fullName || !email || !password}
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Complete Your Profile</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select your role and referral details</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">Role</label>
              <div className="relative">
                <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setReferCode('');
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all appearance-none shadow-sm backdrop-blur-md font-medium"
                >
                  <option value="executive">Executive</option>
                  <option value="dsa">DSA</option>
                </select>
              </div>
            </div>

            {role === 'executive' && (
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
            )}

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
            <div className="mb-2">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                Management Portal
              </span>
            </div>
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
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium">Join Finonest India team</p>
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
                      <div className={`w-16 h-0.5 mx-2 transition-all ${
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
                {currentStep === 4 && 'Complete your profile'}
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
