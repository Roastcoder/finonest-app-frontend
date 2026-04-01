import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Phone, Lock, Shield, BarChart3, Users, Zap, ArrowRight, Download } from 'lucide-react';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const logo = '/logo.png';

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);
  }, []);

  const requestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/customer-portal/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      if (!response.ok) throw new Error('Failed to send OTP');

      toast.success('OTP sent to your mobile number');
      setStep('otp');
    } catch (error) {
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/customer-portal/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });

      if (!response.ok) throw new Error('Invalid OTP');

      const data = await response.json();
      localStorage.setItem('customer_token', data.access_token);
      toast.success('Login successful');
      navigate(`/customer/status/${data.lead_id}`);
    } catch (error) {
      toast.error('Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <Shield size={22} />, title: 'Real-Time Tracking', desc: 'Monitor your loan application progress every step of the way' },
    { icon: <BarChart3 size={22} />, title: 'Status Updates', desc: 'Get instant notifications on approval and disbursement status' },
    { icon: <Users size={22} />, title: 'Direct Access', desc: 'View your submitted documents and application history' },
    { icon: <Zap size={22} />, title: 'Secure Login', desc: 'Quick and secure access via mobile OTP verification' },
  ];

  return (
    <div className="min-h-screen flex bg-transparent font-sans">
      {/* ─── LEFT PANEL (DESKTOP) ─── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden glass-panel m-4 lg:mr-2 rounded-[2.5rem]">
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full h-full">
          <div className="flex items-center gap-3.5">
            <img src={logo} alt="Finonest India" className="h-14 w-auto object-contain drop-shadow-md" />
          </div>

          <div className="flex-1 flex flex-col justify-center -mt-8">
            <h1 className="text-4xl xl:text-[2.75rem] font-extrabold text-gray-900 dark:text-white leading-[1.15] mb-4 tracking-tight drop-shadow-sm">
              Track Your Loan<br />
              <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                Application Status
              </span>
            </h1>
            <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed max-w-sm mb-8 font-medium">
              Enter your registered mobile number to securely check the progress of your car loan application.
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

            {!isStandalone && (
              <div className="mt-8 hidden lg:block">
                <a
                  href="/finonest-release.apk"
                  download
                  className="inline-flex items-center gap-2.5 glass-card hover:bg-white/60 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 text-sm shadow-sm"
                >
                  <Download size={16} className="text-blue-600 dark:text-blue-400" />
                  Download Android App
                </a>
              </div>
            )}
          </div>

          <p className="text-gray-500 dark:text-slate-400 text-xs font-medium">© 2025 Finonest India. All rights reserved.</p>
        </div>
      </div>

      {/* ─── RIGHT PANEL (FORM) ─── */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 bg-transparent">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src={logo} alt="Finonest India" className="h-14 w-auto object-contain drop-shadow-md mb-3" />
          </div>

          {/* Card */}
          <div className="glass-card p-7 sm:p-8 shadow-xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight drop-shadow-sm">
                {step === 'phone' ? 'Customer Status' : 'Verify OTP'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium">
                {step === 'phone' ? 'Sign in to track your car loan progress' : `Enter the 6-digit code sent to ${phone}`}
              </p>
            </div>

            {step === 'phone' ? (
              <form onSubmit={requestOTP} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5 drop-shadow-sm">Mobile Number</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 10-digit number"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || phone.length !== 10}
                  className="w-full flex items-center justify-center gap-2 font-bold py-3.5 px-4 rounded-xl text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-secondary to-primary border border-white/20"
                >
                  {loading ? 'Sending OTP...' : (
                    <>
                      Send OTP
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOTP} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5 drop-shadow-sm">Enter 6-Digit OTP</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="— — — — — —"
                      className="w-full pl-10 pr-4 py-4 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-xl font-mono text-center tracking-[0.5em] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-bold"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full flex items-center justify-center gap-2 font-bold py-3.5 px-4 rounded-xl text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-secondary to-primary border border-white/20"
                >
                  {loading ? 'Verifying...' : (
                    <>
                      Verify & Login
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="w-full text-sm font-bold text-gray-500 hover:text-primary transition-colors text-center"
                >
                  Change mobile number
                </button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50 text-center">
               <Link to="/login" className="text-sm font-bold text-gray-500 hover:text-primary transition-colors inline-flex items-center gap-2">
                 Staff Member? <span className="text-primary hover:underline underline-offset-2">Login Here</span>
               </Link>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-slate-400 mt-6 font-medium drop-shadow-sm">
            Secured with end-to-end encryption
          </p>
        </div>
      </div>
    </div>
  );
}
