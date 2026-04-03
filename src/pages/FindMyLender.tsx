import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Search, Phone, User, Building2, Loader2, AlertCircle, CheckCircle2, Map, X } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const GOOGLE_MAPS_API_KEY = 'AIzaSyBMkTPRdi-YeWJO-tLIdQ44hNLKsV-YfAE';

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

async function getAddressSuggestions(input: string): Promise<AddressSuggestion[]> {
  const trimmedInput = input.trim();
  if (!trimmedInput || trimmedInput.length < 2) return [];
  
  try {
    const response = await fetch(`${API_BASE_URL}/google-maps/autocomplete`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ input })
    });
    
    if (!response.ok) {
      console.error('Backend API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    return data.predictions || [];
  } catch (error) {
    console.error('Address suggestions error:', error);
    return [];
  }
}

async function getPlaceDetails(placeId: string): Promise<{ lat: number; lng: number; address: string } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/google-maps/place-details`, {
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

async function geocodeAddress(addr: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/google-maps/geocode`, {
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
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

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
    directionsServiceRef.current = new google.maps.DirectionsService();
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map: map,
      polylineOptions: {
        strokeColor: '#3b82f6',
        strokeWeight: 4,
        strokeOpacity: 0.7
      }
    });

    // Add customer location marker
    new google.maps.Marker({
      position: { lat: customerLat, lng: customerLng },
      map: map,
      title: 'Your Location',
      icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
    });

    // Filter branches with valid coordinates
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
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: branch.branch_name,
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-size: 12px; max-width: 300px;">
            <strong style="font-size: 14px;">${branch.branch_name}</strong><br/>
            <div style="margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 8px;">
              <div style="margin-bottom: 6px;"><strong>📍 Location:</strong> ${branch.location}</div>
              <div style="margin-bottom: 6px;"><strong>📏 Distance:</strong> ${branch.distance.toFixed(2)} km</div>
              <div style="margin-bottom: 6px;"><strong>🎯 Service Area:</strong> ${branch.geo_limit_km} km</div>
              ${branch.sales_manager_name ? `<div style="margin-bottom: 6px;"><strong>👤 Sales Manager:</strong> ${branch.sales_manager_name}</div>` : ''}
              ${branch.sales_manager_mobile ? `<div style="margin-bottom: 6px;"><strong>📞 Contact:</strong> <a href="tel:${branch.sales_manager_mobile}" style="color: #3b82f6; text-decoration: none;">${branch.sales_manager_mobile}</a></div>` : ''}
              ${branch.area_sales_manager_name ? `<div style="margin-bottom: 6px;"><strong>🏢 Area Manager:</strong> ${branch.area_sales_manager_name}</div>` : ''}
              ${branch.area_sales_manager_mobile ? `<div style="margin-bottom: 6px;"><strong>📱 Area Manager Contact:</strong> <a href="tel:${branch.area_sales_manager_mobile}" style="color: #3b82f6; text-decoration: none;">${branch.area_sales_manager_mobile}</a></div>` : ''}
              <button style="margin-top: 8px; padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;" onclick="window.showMapRoute && window.showMapRoute(${customerLat}, ${customerLng}, ${lat}, ${lng})">Show Route</button>
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        if (window.showMapRoute) window.showMapRoute(customerLat, customerLng, lat, lng);
      });
    });

    // Fit bounds
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: customerLat, lng: customerLng });
    validBranches.forEach(b => {
      bounds.extend({ lat: b.latitude!, lng: b.longitude! });
    });
    map.fitBounds(bounds);

    // Store route function globally
    (window as any).showMapRoute = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      if (!directionsServiceRef.current || !directionsRendererRef.current) return;

      directionsServiceRef.current.route(
        {
          origin: { lat: lat1, lng: lng1 },
          destination: { lat: lat2, lng: lng2 },
          travelMode: google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            directionsRendererRef.current!.setDirections(result);
          } else {
            console.error('Directions request failed due to ' + status);
          }
        }
      );
    };
  }, [customerLat, customerLng, branches]);

  return <div ref={mapRef} className="w-full h-[500px] rounded-lg border border-border" />;
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
  const [showMap, setShowMap] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCoordinates({ lat: 26.8925, lng: 75.8048 });
  }, []);

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
    
    const words = trimmedValue.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const shouldCallApi = wordCount >= 1 && value.endsWith(' ');
    
    if (!shouldCallApi) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setSuggestionsLoading(true);
    debounceTimer.current = setTimeout(async () => {
      const results = await getAddressSuggestions(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSuggestionsLoading(false);
    }, 300);
  };

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    setSuggestionsLoading(true);
    try {
      const details = await getPlaceDetails(suggestion.place_id);
      if (details) {
        setAddress(details.address);
        setCoordinates({ lat: details.lat, lng: details.lng });
        setSuggestions([]);
        setShowSuggestions(false);
        setSearched(false);
        setBranchesWithCoords([]);
        setLenders([]);
        toast.success('Address selected');
      }
    } catch (error) {
      toast.error('Failed to get address details');
    } finally {
      setSuggestionsLoading(false);
    }
  };

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
      const response = await fetch(`${API_BASE_URL}/find-lender/search-by-address`, {
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

      const allBranches = data.lenders.flatMap((lender: Lender) => lender.branches);
      const branchesWithCoords = allBranches.filter(b => 
        typeof b.latitude === 'number' && 
        typeof b.longitude === 'number' && 
        !isNaN(b.latitude) && 
        !isNaN(b.longitude)
      );
      
      setBranchesWithCoords(branchesWithCoords);
      setLenders(data.lenders || []);
      setSearched(true);

      if (data.lenders.length === 0) {
        toast.info('No lenders found in this area');
      } else {
        toast.success(`Found ${data.lenders.length} lenders`);
      }

      await fetch(`${API_BASE_URL}/find-lender/save-search`, {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-3 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Find My Lender</h1>
              <p className="text-xs text-muted-foreground">Discover lenders near your location</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-3 mb-4 relative z-[1000]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2 relative" ref={suggestionsRef}>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Enter Your Location
              </label>
              <div className="relative">
                <textarea
                  value={address}
                  onChange={e => handleAddressChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleSearch()}
                  placeholder="e.g., 3rd Floor, Besides Jaipur Hospital, BL Tower, 1, Tonk Rd, Jaipur"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={1}
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

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-[9999] max-h-48 overflow-y-auto">
                  {suggestionsLoading ? (
                    <div className="p-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 size={14} className="animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b border-border last:border-b-0 flex items-start gap-2"
                      >
                        <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{suggestion.main_text}</p>
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
              <label className="block text-xs font-semibold text-foreground mb-1">
                Loan Type (Optional)
              </label>
              <select
                value={caseType}
                onChange={e => setCaseType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-secondary font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Find
                </>
              )}
            </button>
          </div>
        </div>

        {(searched || coordinates) && (
          <div className="glass-card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Map size={18} className="text-primary" />
                <h2 className="text-base font-bold text-foreground">Map View</h2>
              </div>
              <button
                onClick={() => setShowMap(!showMap)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium text-foreground"
              >
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
            </div>

            {showMap && (coordinates && branchesWithCoords.length > 0 ? (
              <GoogleMap
                customerLat={coordinates.lat}
                customerLng={coordinates.lng}
                branches={branchesWithCoords}
              />
            ) : coordinates && searched && branchesWithCoords.length === 0 ? (
              <div className="w-full h-[500px] rounded-lg border border-border bg-muted/40 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No branches with coordinates found in your area</p>
              </div>
            ) : coordinates && !searched ? (
              <div className="w-full h-[500px] rounded-lg border border-border bg-muted/40 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Search for lenders to see branches on map</p>
              </div>
            ) : (
              <div className="w-full h-[500px] rounded-lg border border-border bg-muted/40 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Unable to load map</p>
              </div>
            ))}
          </div>
        )}

        {searched && (
          <div className="mt-4">
            {lenders.length === 0 ? (
              <div className="glass-card p-6 text-center">
                <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">No Lenders Found</h3>
                <p className="text-sm text-muted-foreground">
                  Try increasing the search radius or changing your location
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {lenders.map((lender, idx) => (
                    <div key={idx} className="glass-card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        {lender.logo_url && (
                          <img
                            src={lender.logo_url}
                            alt={lender.bank_name}
                            className="w-10 h-10 rounded object-contain"
                          />
                        )}
                        <div>
                          <h3 className="text-base font-bold text-foreground">{lender.bank_name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {lender.branches.length} branch{lender.branches.length !== 1 ? 'es' : ''} nearby
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {lender.branches.map((branch, bidx) => (
                          <div key={bidx} className="p-3 rounded-lg border border-border bg-muted/20">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold text-sm text-foreground">{branch.branch_name}</h4>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin size={12} />
                                  {branch.location}
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                {branch.distance.toFixed(2)} km
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {branch.geo_limit_km && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full border border-blue-500"></div>
                                  <div>
                                    <p className="text-muted-foreground">Service Area: {branch.geo_limit_km} km</p>
                                  </div>
                                </div>
                              )}
                              {branch.sales_manager_name && (
                                <div className="flex items-center gap-1">
                                  <User size={12} className="text-muted-foreground" />
                                  <p className="text-foreground">{branch.sales_manager_name}</p>
                                </div>
                              )}
                              {branch.sales_manager_mobile && (
                                <div className="flex items-center gap-1">
                                  <Phone size={12} className="text-muted-foreground" />
                                  <a
                                    href={`tel:${branch.sales_manager_mobile}`}
                                    className="text-primary hover:underline"
                                  >
                                    {branch.sales_manager_mobile}
                                  </a>
                                </div>
                              )}
                              {branch.area_sales_manager_name && (
                                <div className="flex items-center gap-1">
                                  <Building2 size={12} className="text-muted-foreground" />
                                  <p className="text-foreground">{branch.area_sales_manager_name}</p>
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
