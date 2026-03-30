import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Search, Phone, User, Building2, Loader2, AlertCircle, CheckCircle2, Map } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  };
}

interface LenderBranch {
  branch_id: number;
  branch_name: string;
  location: string;
  distance: number;
  geo_limit: string;
  geo_limit_km: number;
  sales_manager_name: string;
  sales_manager_mobile: string;
  area_sales_manager_name: string;
  area_sales_manager_mobile: string;
  latitude?: number;
  longitude?: number;
}

interface Lender {
  bank_id: number;
  bank_name: string;
  logo_url: string;
  branches: LenderBranch[];
  supports: {
    purchase: boolean;
    refinance: boolean;
    bt: boolean;
    credit_card?: boolean;
  };
}

async function geocodeAddress(addr: string) {
  try {
    const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
    const variations = [
      addr,
      parts.slice(-2).join(', '),
      parts.slice(-3).join(', '),
      parts[parts.length - 1]
    ].filter(Boolean);

    for (const searchAddr of variations) {
      try {
        const params = new URLSearchParams({
          q: searchAddr,
          format: 'json',
          limit: '1'
        });

        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { 'User-Agent': 'Finonest-App' }
        });

        const data = await response.json();
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

function SimpleMap({ customerLat, customerLng, branches }: { customerLat: number; customerLng: number; branches: LenderBranch[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !branches.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let minLat = customerLat, maxLat = customerLat;
    let minLng = customerLng, maxLng = customerLng;

    branches.forEach(b => {
      if (b.latitude && b.longitude) {
        minLat = Math.min(minLat, b.latitude);
        maxLat = Math.max(maxLat, b.latitude);
        minLng = Math.min(minLng, b.longitude);
        maxLng = Math.max(maxLng, b.longitude);
      }
    });

    const latPadding = (maxLat - minLat) * 0.1 || 0.1;
    const lngPadding = (maxLng - minLng) * 0.1 || 0.1;
    minLat -= latPadding;
    maxLat += latPadding;
    minLng -= lngPadding;
    maxLng += lngPadding;

    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;
    const scaleX = canvas.width / lngRange;
    const scaleY = canvas.height / latRange;

    const toCanvasX = (lng: number) => (lng - minLng) * scaleX;
    const toCanvasY = (lat: number) => canvas.height - (lat - minLat) * scaleY;

    branches.forEach(branch => {
      if (branch.latitude && branch.longitude && branch.geo_limit_km) {
        const x = toCanvasX(branch.longitude);
        const y = toCanvasY(branch.latitude);
        const radius = (branch.geo_limit_km / 111) * scaleX;

        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    branches.forEach(branch => {
      if (branch.latitude && branch.longitude) {
        const x = toCanvasX(branch.longitude);
        const y = toCanvasY(branch.latitude);

        ctx.fillStyle = '#16a136';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    const custX = toCanvasX(customerLng);
    const custY = toCanvasY(customerLat);

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(custX, custY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#1f2937';
    ctx.font = '12px sans-serif';
    ctx.fillText('🔴 Your Location', 10, 20);
    ctx.fillText('🟢 Bank Branch', 10, 40);
    ctx.fillText('🔵 Service Area', 10, 60);
  }, [customerLat, customerLng, branches]);

  return <canvas ref={canvasRef} width={600} height={400} className="w-full rounded-xl border border-border" />;
}

export default function FindMyLender() {
  const { user } = useAuth();
  const [address, setAddress] = useState('');
  const [caseType, setCaseType] = useState('');
  const [radius, setRadius] = useState(50);
  const [loading, setLoading] = useState(false);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [searched, setSearched] = useState(false);
  const [branchesWithCoords, setBranchesWithCoords] = useState<LenderBranch[]>([]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSearch = async () => {
    if (!address.trim()) {
      toast.error('Please enter an address');
      return;
    }

    setLoading(true);
    try {
      // Geocode customer address
      const customerCoords = await geocodeAddress(address);
      if (!customerCoords) {
        toast.error('Could not find your address. Please try another location.');
        setLoading(false);
        return;
      }

      setCoordinates(customerCoords);

      // Call API to find lenders
      const response = await fetch(`${API}/find-lender/search-by-address`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          address: address.trim(),
          case_type: caseType || null,
          radius
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.error || 'Search failed');
        setLoading(false);
        return;
      }

      // Geocode all branch addresses to get coordinates for map
      const allBranches = data.lenders.flatMap((lender: Lender) => lender.branches);
      const branchesWithCoordinates = await Promise.all(
        allBranches.map(async (branch: LenderBranch) => {
          const coords = await geocodeAddress(branch.location);
          return {
            ...branch,
            latitude: coords?.lat,
            longitude: coords?.lng
          };
        })
      );

      setBranchesWithCoords(branchesWithCoordinates);
      setLenders(data.lenders || []);
      setSearched(true);

      if (data.lenders.length === 0) {
        toast.info('No lenders found in this area');
      } else {
        toast.success(`Found ${data.lenders.length} lenders`);
      }

      await fetch(`${API}/find-lender/save-search`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          latitude: customerCoords.lat,
          longitude: customerCoords.lng,
          case_type: caseType || null,
          results_count: data.lenders.length
        })
      }).catch(() => {});
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Find My Lender</h1>
              <p className="text-sm text-muted-foreground">Discover lenders near your location</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-24 space-y-4">
              <h2 className="text-lg font-bold text-foreground mb-4">Search Lenders</h2>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Enter Your Location
                </label>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleSearch()}
                  placeholder="e.g., 3rd Floor, Besides Jaipur Hospital, BL Tower, 1, Tonk Rd, Jaipur"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">Ctrl+Enter to search</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Loan Type (Optional)
                </label>
                <select
                  value={caseType}
                  onChange={e => setCaseType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">All Types</option>
                  <option value="purchase">Purchase</option>
                  <option value="refinance">Refinance</option>
                  <option value="bt">Balance Transfer</option>
                  <option value="credit card">Credit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Search Radius: {radius} km
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={radius}
                  onChange={e => setRadius(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-secondary font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Find Lenders
                  </>
                )}
              </button>

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-bold text-foreground mb-3">Map Legend</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span>Your Location</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-500"></div>
                    <span>Service Area (km)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-600"></div>
                    <span>Bank Branch</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Map size={20} className="text-primary" />
                <h2 className="text-lg font-bold text-foreground">Map View</h2>
              </div>

              {searched && coordinates && branchesWithCoords.length > 0 ? (
                <SimpleMap
                  customerLat={coordinates.lat}
                  customerLng={coordinates.lng}
                  branches={branchesWithCoords}
                />
              ) : (
                <div className="w-full h-96 rounded-xl border border-border bg-muted/40 flex items-center justify-center">
                  <p className="text-muted-foreground">Search for lenders to see the map</p>
                </div>
              )}

              {searched && coordinates && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Location:</strong> {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Results:</strong> {lenders.length} lender{lenders.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {searched && (
          <div className="mt-8">
            {lenders.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Lenders Found</h3>
                <p className="text-muted-foreground">
                  Try increasing the search radius or changing your location
                </p>
              </div>
            ) : (
              <>
                <div className="glass-card overflow-x-auto mb-8">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Lender</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Purchase</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Refinance</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">BT</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Credit Card</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Branches</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lenders.map((lender, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {lender.logo_url && (
                                <img
                                  src={lender.logo_url}
                                  alt={lender.bank_name}
                                  className="w-10 h-10 rounded object-contain"
                                />
                              )}
                              <span className="font-semibold text-foreground">{lender.bank_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {lender.supports.purchase ? (
                              <CheckCircle2 size={20} className="mx-auto text-green-500" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {lender.supports.refinance ? (
                              <CheckCircle2 size={20} className="mx-auto text-green-500" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {lender.supports.bt ? (
                              <CheckCircle2 size={20} className="mx-auto text-green-500" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {lender.supports.credit_card ? (
                              <CheckCircle2 size={20} className="mx-auto text-green-500" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-medium text-primary">
                              {lender.branches.length} branch{lender.branches.length !== 1 ? 'es' : ''}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4">
                  {lenders.map((lender, idx) => (
                    <div key={idx} className="glass-card p-6">
                      <div className="flex items-center gap-3 mb-4">
                        {lender.logo_url && (
                          <img
                            src={lender.logo_url}
                            alt={lender.bank_name}
                            className="w-12 h-12 rounded object-contain"
                          />
                        )}
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{lender.bank_name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {lender.branches.length} branch{lender.branches.length !== 1 ? 'es' : ''} nearby
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {lender.branches.map((branch, bidx) => (
                          <div key={bidx} className="p-4 rounded-lg border border-border bg-muted/20">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-foreground">{branch.branch_name}</h4>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin size={14} />
                                  {branch.location}
                                </p>
                              </div>
                              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                                {branch.distance} km
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              {branch.geo_limit_km && (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full border-2 border-blue-500"></div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Service Area</p>
                                    <p className="font-medium text-foreground">{branch.geo_limit_km} km</p>
                                  </div>
                                </div>
                              )}
                              {branch.sales_manager_name && (
                                <div className="flex items-center gap-2">
                                  <User size={16} className="text-muted-foreground" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Sales Manager</p>
                                    <p className="font-medium text-foreground">{branch.sales_manager_name}</p>
                                  </div>
                                </div>
                              )}
                              {branch.sales_manager_mobile && (
                                <div className="flex items-center gap-2">
                                  <Phone size={16} className="text-muted-foreground" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Contact</p>
                                    <a
                                      href={`tel:${branch.sales_manager_mobile}`}
                                      className="font-medium text-primary hover:underline"
                                    >
                                      {branch.sales_manager_mobile}
                                    </a>
                                  </div>
                                </div>
                              )}
                              {branch.area_sales_manager_name && (
                                <div className="flex items-center gap-2">
                                  <Building2 size={16} className="text-muted-foreground" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Area Manager</p>
                                    <p className="font-medium text-foreground">{branch.area_sales_manager_name}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
