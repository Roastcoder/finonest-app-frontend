import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Search, Phone, User, Building2, Loader2, AlertCircle, CheckCircle2, Map, X } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  };
}

interface AddressSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  lat?: number;
  lng?: number;
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
  };
}

// Get address suggestions from backend proxy
async function getAddressSuggestions(input: string): Promise<AddressSuggestion[]> {
  const trimmedInput = input.trim();
  if (!trimmedInput || trimmedInput.length < 2) return [];
  
  try {
    const response = await fetch(`${API}/google-maps/autocomplete`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ input })
    });
    
    const data = await response.json();
    return data.predictions || [];
  } catch (error) {
    console.error('Address suggestions error:', error);
    return [];
  }
}

// Get coordinates from place_id via backend proxy
async function getPlaceDetails(placeId: string): Promise<{ lat: number; lng: number; address: string } | null> {
  try {
    const response = await fetch(`${API}/google-maps/place-details`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ place_id: placeId })
    });
    
    const data = await response.json();
    if (response.ok) {
      return data;
    }
    return null;
  } catch (error) {
    console.error('Place details error:', error);
    return null;
  }
}

// Geocode address for branch locations via backend proxy
async function geocodeAddress(addr: string) {
  try {
    const response = await fetch(`${API}/google-maps/geocode`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ address: addr })
    });
    
    const data = await response.json();
    if (response.ok) {
      return data;
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

function GoogleMap({ customerLat, customerLng, branches }: { customerLat: number; customerLng: number; branches: LenderBranch[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !branches.length) return;
    
    if (typeof customerLat !== 'number' || typeof customerLng !== 'number' || isNaN(customerLat) || isNaN(customerLng)) {
      console.error('Invalid customer coordinates:', { customerLat, customerLng });
      return;
    }

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

    // Filter branches with valid coordinates (must be numbers)
    const validBranches = branches.filter(b => 
      typeof b.latitude === 'number' && 
      typeof b.longitude === 'number' && 
      !isNaN(b.latitude) && 
      !isNaN(b.longitude)
    );

    // Add branch markers and service areas
    validBranches.forEach(branch => {
      const lat = branch.latitude as number;
      const lng = branch.longitude as number;
      
      // Draw service area circle
      if (branch.geo_limit_km) {
        new google.maps.Circle({
          map: map,
          center: { lat, lng },
          radius: branch.geo_limit_km * 1000,
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          strokeColor: '#3b82f6',
          strokeWeight: 2
        });
      }

      // Add branch marker
      new google.maps.Marker({
        position: { lat, lng },
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
    });

    // Fit bounds
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: customerLat, lng: customerLng });
    validBranches.forEach(b => {
      bounds.extend({ lat: b.latitude!, lng: b.longitude! });
    });
    map.fitBounds(bounds);
  }, [customerLat, customerLng, branches]);

  return <div ref={mapRef} className="w-full h-96 rounded-xl border border-border" />;
}

export default function FindMyLender() {
  const { user } = useAuth();
  const [address, setAddress] = useState('');
  const [caseType, setCaseType] = useState('New Car - Purchase');
  const [loading, setLoading] = useState(false);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [searched, setSearched] = useState(false);
  const [branchesWithCoords, setBranchesWithCoords] = useState<LenderBranch[]>([]);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Set default coordinates to Jaipur location
    setCoordinates({ lat: 26.8925, lng: 75.8048 });
  }, []);

  // Handle address input with debounce
  const handleAddressChange = (value: string) => {
    setAddress(value);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    const trimmedValue = value.trim();
    if (trimmedValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    // Count words (split by spaces)
    const words = trimmedValue.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    // Call API after 1 word and space, then after every 2 more words
    const shouldCallApi = wordCount >= 1 && value.endsWith(' ');
    
    if (!shouldCallApi) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setSuggestionsLoading(true);
    debounceTimer.current = setTimeout(async () => {
      console.log(`API called for: "${value}" (${wordCount} words)`);
      const results = await getAddressSuggestions(value);
      console.log(`API response received:`, results);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSuggestionsLoading(false);
    }, 300);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    setSuggestionsLoading(true);
    try {
      const details = await getPlaceDetails(suggestion.place_id);
      if (details) {
        setAddress(details.address);
        setCoordinates({ lat: details.lat, lng: details.lng });
        setSuggestions([]);
        setShowSuggestions(false);
        toast.success('Address selected');
      }
    } catch (error) {
      toast.error('Failed to get address details');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

      // Branches already have coordinates from backend
      const allBranches = data.lenders.flatMap((lender: Lender) => lender.branches);
      
      // Log branches for debugging
      console.log('All branches received:', allBranches);
      const branchesWithCoords = allBranches.filter(b => 
        typeof b.latitude === 'number' && 
        typeof b.longitude === 'number' && 
        !isNaN(b.latitude) && 
        !isNaN(b.longitude)
      );
      console.log('Branches with valid coordinates:', branchesWithCoords);
      
      setBranchesWithCoords(branchesWithCoords);
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

        {/* Search Bar - Full Width - At Top */}
        <div className="glass-card p-4 mb-6 relative z-[1000]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2 relative" ref={suggestionsRef}>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Enter Your Location
              </label>
              <div className="relative">
                <textarea
                  value={address}
                  onChange={e => handleAddressChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleSearch()}
                  placeholder="e.g., 3rd Floor, Besides Jaipur Hospital, BL Tower, 1, Tonk Rd, Jaipur"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={2}
                />
                {address && (
                  <button
                    onClick={() => {
                      setAddress('');
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }}
                    className="absolute top-3 right-3 p-1 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X size={18} className="text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Address Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg z-[9999] max-h-64 overflow-y-auto">
                  {suggestionsLoading ? (
                    <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 size={16} className="animate-spin" />
                      Loading suggestions...
                    </div>
                  ) : (
                    suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0 flex items-start gap-3"
                      >
                        <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{suggestion.main_text}</p>
                          {suggestion.secondary_text && (
                            <p className="text-xs text-muted-foreground truncate">{suggestion.secondary_text}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
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
                <option value="New Car - Purchase">New Car - Purchase</option>
                <option value="Used Car - Purchase">Used Car - Purchase</option>
                <option value="Used Car - Refinance">Used Car - Refinance</option>
                <option value="Used Car - Top-up">Used Car - Top-up</option>
                <option value="Used Car - BT">Used Car - BT</option>
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
            ) : coordinates && searched && branchesWithCoords.length === 0 ? (
              <div className="w-full h-96 rounded-xl border border-border bg-muted/40 flex items-center justify-center">
                <p className="text-muted-foreground">No branches with coordinates found in your area</p>
              </div>
            ) : coordinates && !searched ? (
              <div className="w-full h-96 rounded-xl border border-border bg-muted/40 flex items-center justify-center">
                <p className="text-muted-foreground">Search for lenders to see branches on map</p>
              </div>
            ) : (
              <div className="w-full h-96 rounded-xl border border-border bg-muted/40 flex items-center justify-center">
                <p className="text-muted-foreground">Unable to load map</p>
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
