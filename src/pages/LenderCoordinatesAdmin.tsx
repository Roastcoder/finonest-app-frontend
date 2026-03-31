import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Loader2, CheckCircle2, AlertCircle, Copy, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  };
}

interface Branch {
  id: number;
  bank_id: number;
  branch_name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  product: string;
  status: string;
  geo_limit: string;
}

interface Bank {
  id: number;
  name: string;
  branches: Branch[];
}

export default function LenderCoordinatesAdmin() {
  const { user } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState<number | null>(null);
  const [editingBranch, setEditingBranch] = useState<number | null>(null);
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedBranchForMap, setSelectedBranchForMap] = useState<Branch | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/banks`, {
        headers: authHeaders()
      });
      const data = await response.json();

      const banksWithBranches = await Promise.all(
        data.map(async (bank: any) => {
          const branchRes = await fetch(`${API}/banks/${bank.id}/branches`, {
            headers: authHeaders()
          });
          const branches = await branchRes.json();
          return { ...bank, branches };
        })
      );

      setBanks(banksWithBranches);
    } catch (error: any) {
      toast.error('Failed to load banks');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeocode = async (branchId: number, address: string) => {
    if (!address.trim()) {
      toast.error('Address is required');
      return;
    }

    setGeocoding(branchId);
    try {
      const response = await fetch(`${API}/find-lender/branch/${branchId}/geocode`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ address })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success('Branch geocoded successfully');
      fetchBanks();
    } catch (error: any) {
      toast.error(error.message || 'Geocoding failed. Try using the map instead.');
    } finally {
      setGeocoding(null);
    }
  };

  const handleUpdateCoordinates = async (branchId: number) => {
    if (!editLat || !editLng) {
      toast.error('Please enter both latitude and longitude');
      return;
    }

    try {
      const response = await fetch(`${API}/find-lender/branch/${branchId}/coordinates`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          latitude: parseFloat(editLat),
          longitude: parseFloat(editLng)
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success('Coordinates updated');
      setEditingBranch(null);
      fetchBanks();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openMapModal = (branch: Branch) => {
    setSelectedBranchForMap(branch);
    setShowMapModal(true);
    setEditLat(branch.latitude?.toString() || '');
    setEditLng(branch.longitude?.toString() || '');
  };

  const closeMapModal = () => {
    setShowMapModal(false);
    setSelectedBranchForMap(null);
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  };

  useEffect(() => {
    if (!showMapModal || !selectedBranchForMap) return;

    const initMap = () => {
      const container = document.getElementById('map-container');
      if (!container) return;

      const lat = selectedBranchForMap.latitude || 20.5937;
      const lng = selectedBranchForMap.longitude || 78.9629;

      if (mapRef.current) {
        mapRef.current.remove();
      }

      mapRef.current = L.map('map-container').setView([lat, lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      // Add search box using Nominatim
      const searchControl = L.Control.extend({
        onAdd: function(map) {
          const div = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
          const input = L.DomUtil.create('input', '', div);
          input.type = 'text';
          input.placeholder = 'Search address...';
          input.style.padding = '5px';
          input.style.width = '200px';
          input.style.borderRadius = '4px';
          input.style.border = '1px solid #ccc';

          input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
              const address = input.value;
              try {
                const response = await fetch(
                  `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
                  { headers: { 'User-Agent': 'Finonest-App' } }
                );
                const data = await response.json();
                if (data && data.length > 0) {
                  const newLat = parseFloat(data[0].lat);
                  const newLng = parseFloat(data[0].lon);
                  setEditLat(newLat.toString());
                  setEditLng(newLng.toString());
                  if (markerRef.current) {
                    markerRef.current.setLatLng([newLat, newLng]);
                  } else {
                    markerRef.current = L.marker([newLat, newLng], { draggable: true }).addTo(mapRef.current!);
                    markerRef.current.on('dragend', () => {
                      const pos = markerRef.current!.getLatLng();
                      setEditLat(pos.lat.toString());
                      setEditLng(pos.lng.toString());
                    });
                  }
                  mapRef.current?.setView([newLat, newLng], 15);
                }
              } catch (error) {
                console.error('Search error:', error);
              }
            }
          });

          return div;
        }
      });

      new searchControl({ position: 'topleft' }).addTo(mapRef.current);

      if (markerRef.current) {
        markerRef.current.remove();
      }

      markerRef.current = L.marker([lat, lng], {
        draggable: true,
      }).addTo(mapRef.current);

      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLatLng();
        setEditLat(pos.lat.toString());
        setEditLng(pos.lng.toString());
      });

      mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setEditLat(lat.toString());
        setEditLng(lng.toString());
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
      });
    };

    const timer = setTimeout(initMap, 100);
    return () => clearTimeout(timer);
  }, [showMapModal, selectedBranchForMap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  const totalBranches = banks.reduce((sum, b) => sum + b.branches.length, 0);
  const branchesWithCoords = banks.reduce((sum, b) => sum + b.branches.filter(br => br.latitude && br.longitude).length, 0);
  const missingCoords = totalBranches - branchesWithCoords;

  return (
    <>
      {showMapModal && selectedBranchForMap && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Set Location - {selectedBranchForMap.branch_name}
              </h3>
              <button
                onClick={closeMapModal}
                className="p-1 hover:bg-muted rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <div id="map-container" className="w-full h-full" />
            </div>

            <div className="p-4 border-t border-border space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">💡 How to use:</p>
                <ul className="text-xs space-y-1 ml-2">
                  <li>• Use the search box at the top to find an address</li>
                  <li>• Drag the marker to adjust location</li>
                  <li>• Click on the map to place marker</li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={editLat}
                    onChange={e => setEditLat(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded border border-border"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={editLng}
                    onChange={e => setEditLng(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded border border-border"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={closeMapModal}
                  className="px-4 py-2 text-sm bg-muted text-foreground rounded hover:bg-muted/80"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleUpdateCoordinates(selectedBranchForMap.id);
                    closeMapModal();
                  }}
                  className="px-4 py-2 text-sm bg-primary text-secondary rounded hover:opacity-90"
                >
                  Save Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin size={24} className="text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Lender Coordinates</h1>
                <p className="text-sm text-muted-foreground">Manage bank branch locations and service areas</p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card p-6">
              <p className="text-xs text-muted-foreground mb-2">Total Banks</p>
              <p className="text-3xl font-bold text-foreground">{banks.length}</p>
            </div>

            <div className="glass-card p-6">
              <p className="text-xs text-muted-foreground mb-2">Total Branches</p>
              <p className="text-3xl font-bold text-foreground">{totalBranches}</p>
            </div>

            <div className="glass-card p-6">
              <p className="text-xs text-muted-foreground mb-2">With Coordinates</p>
              <p className="text-3xl font-bold text-green-600">{branchesWithCoords}</p>
            </div>

            <div className="glass-card p-6">
              <p className="text-xs text-muted-foreground mb-2">Missing Coordinates</p>
              <p className="text-3xl font-bold text-amber-600">{missingCoords}</p>
            </div>
          </div>

          {/* Banks List */}
          <div className="space-y-6">
            {banks.map((bank) => (
              <div key={bank.id} className="glass-card p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">{bank.name}</h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Branch Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Location</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Coordinates</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Service Area</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bank.branches.map((branch) => (
                        <tr key={branch.id} className="border-b border-border hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-foreground">{branch.branch_name}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{branch.location}</td>
                          <td className="px-4 py-3">
                            {branch.latitude && branch.longitude ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-green-500" />
                                <span className="text-xs font-mono">
                                  {branch.latitude.toFixed(6)}, {branch.longitude.toFixed(6)}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      `${branch.latitude},${branch.longitude}`
                                    );
                                    toast.success('Copied to clipboard');
                                  }}
                                  className="p-1 hover:bg-muted rounded"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle size={14} /> Not set
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {branch.geo_limit ? (
                              <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {branch.geo_limit}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {editingBranch === branch.id ? (
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="number"
                                    step="0.000001"
                                    value={editLat}
                                    onChange={e => setEditLat(e.target.value)}
                                    placeholder="Lat"
                                    className="w-20 px-2 py-1 text-xs rounded border border-border"
                                  />
                                  <input
                                    type="number"
                                    step="0.000001"
                                    value={editLng}
                                    onChange={e => setEditLng(e.target.value)}
                                    placeholder="Lng"
                                    className="w-20 px-2 py-1 text-xs rounded border border-border"
                                  />
                                  <button
                                    onClick={() => handleUpdateCoordinates(branch.id)}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingBranch(null)}
                                    className="px-2 py-1 text-xs bg-muted text-foreground rounded hover:bg-muted/80"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleGeocode(branch.id, branch.location)}
                                    disabled={geocoding === branch.id}
                                    className="px-3 py-1 text-xs bg-primary text-secondary rounded hover:opacity-90 disabled:opacity-60 flex items-center gap-1"
                                  >
                                    {geocoding === branch.id ? (
                                      <>
                                        <Loader2 size={12} className="animate-spin" />
                                        Geocoding...
                                      </>
                                    ) : (
                                      <>
                                        <MapPin size={12} />
                                        Geocode
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => openMapModal(branch)}
                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Map
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingBranch(branch.id);
                                      setEditLat(branch.latitude?.toString() || '');
                                      setEditLng(branch.longitude?.toString() || '');
                                    }}
                                    className="px-3 py-1 text-xs bg-muted text-foreground rounded hover:bg-muted/80"
                                  >
                                    Edit
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {banks.length === 0 && (
            <div className="glass-card p-8 text-center">
              <AlertCircle size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No banks found</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
