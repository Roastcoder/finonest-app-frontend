import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Search, Phone, User, Building2, Loader2, AlertCircle, CheckCircle2, Map } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

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
    console.log('🔍 Starting geocoding for address:', addr);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${GOOGLE_MAPS_API_KEY}`;
    console.log('📍 Geocoding API URL:', url);
    
    const response = await fetch(url);
    console.log('📡 Geocoding API Response Status:', response.status);
    
    const data = await response.json();
    console.log('📊 Geocoding API Response Data:', data);
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log('✅ Geocoding Success! Coordinates:', location);
      console.log('   Latitude:', location.lat);
      console.log('   Longitude:', location.lng);
      return {
        lat: location.lat,
        lng: location.lng
      };
    }
    console.log('❌ No results found from geocoding API');
    return null;
  } catch (error) {
    console.error('❌ Geocoding error:', error);
    return null;
  }
}

function GoogleMap({ customerLat, customerLng, branches }: { customerLat: number; customerLng: number; branches: LenderBranch[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !branches.length) return;

    const map = new google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: customerLat, lng: customerLng },
      mapTypeId: 'roadmap'
    });

    mapInstanceRef.current = map;

    // Add customer location marker
    new google.maps.Marker({
      position: { lat: customerLat, lng: customerLng },
      map: map,
      title: 'Your Location',
      icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
    });

    // Add branch markers and service areas
    branches.forEach(branch => {
      if (branch.latitude && branch.longitude) {
        // Draw service area circle
        if (branch.geo_limit_km) {
          new google.maps.Circle({
            map: map,
            center: { lat: branch.latitude, lng: branch.longitude },
            radius: branch.geo_limit_km * 1000,
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            strokeColor: '#3b82f6',
            strokeWeight: 2
          });
        }

        // Add branch marker
        new google.maps.Marker({
          position: { lat: branch.latitude, lng: branch.longitude },
          map: map,
          title: branch.branch_name,
          icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
          infoWindow: new google.maps.InfoWindow({
            content: `
              <div style="font-size: 12px;">
                <strong>${branch.branch_name}</strong><br/>
                ${branch.location}<br/>
                Distance: ${branch.distance} km<br/>
                Service Area: ${branch.geo_limit_km} km
              </div>
            `
          })
        }).addListener('click', function() {
          this.infoWindow.open(map, this);
        });
      }
    });

    // Fit bounds
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: customerLat, lng: customerLng });
    branches.forEach(b => {
      if (b.latitude && b.longitude) {
        bounds.extend({ lat: b.latitude, lng: b.longitude });
      }
    });
    map.fitBounds(bounds);
  }, [customerLat, customerLng, branches]);

  return <div ref={mapRef} className="w-full h-96 rounded-xl border border-border" />;
}

export default function FindMyLender() {
  const { user } = useAuth();
  const [address, setAddress] = useState('');
  const [caseType, setCaseType] = useState('');
  const [loading, setLoading] = useState(false);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [searched, setSearched] = useState(false);
  const [branchesWithCoords, setBranchesWithCoords] = useState<LenderBranch[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    // Set default coordinates to Jaipur location
    setCoordinates({ lat: 26.8925, lng: 75.8048 });
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSearch = async () => {
    let customerCoords = coordinates;
    
    // If address is provided, geocode it to get exact coordinates
    if (address.trim()) {
      const geocodedCoords = await geocodeAddress(address);
      if (!geocodedCoords) {
        toast.error('Could not find your address. Please try another location.');
        return;
      }
      customerCoords = geocodedCoords;
      setCoordinates(geocodedCoords);
    } else if (!coordinates) {
      toast.error('Please enter an address');
      return;
    }

    setLoading(true);
    try {
      // Call API to find lenders
      const response = await fetch(`${API}/find-lender/search-by-address`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          address: address.trim(),
          case_type: caseType || null
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

        {/* Search Bar - Full Width */}
        <div className="glass-card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Enter Your Location
              </label>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleSearch()}
                placeholder="e.g., 3rd Floor, Besides Jaipur Hospital, BL Tower, 1, Tonk Rd, Jaipur"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={2}
              />
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

            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-secondary font-semibold hover:opacity-90 disabled:opacity-60 transition-all h-12"
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
          </div>
        </div>

        {/* Map - Full Width */}
        {(searched || coordinates) && (
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Map size={20} className="text-primary" />
              <h2 className="text-lg font-bold text-foreground">Map View</h2>
            </div>

            {coordinates && branchesWithCoords.length > 0 ? (
              <GoogleMap
                customerLat={coordinates.lat}
                customerLng={coordinates.lng}
                branches={branchesWithCoords}
              />
            ) : coordinates && !searched ? (
              <div className="w-full h-96 rounded-xl border border-border bg-muted/40 flex items-center justify-center">
                <p className="text-muted-foreground">Search for lenders to see branches on map</p>
              </div>
            ) : (
              <div className="w-full h-96 rounded-xl border border-border bg-muted/40 flex items-center justify-center">
                <p className="text-muted-foreground">No branches found in your area</p>
              </div>
            )}

            {coordinates && (
              <div className="p-4 rounded-xl bg-muted/40 border border-border mt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Your Location:</strong> {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                </p>
                {searched && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Results:</strong> {lenders.length} lender{lenders.length !== 1 ? 's' : ''} found
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Lenders List */}
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
