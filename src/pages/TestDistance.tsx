import { useState } from 'react';
import { MapPin, Calculator, Navigation, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function TestDistance() {
  const [branchCoords, setBranchCoords] = useState({ lat: '', lng: '' });
  const [customerCoords, setCustomerCoords] = useState({ lat: '', lng: '' });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculateDistance = async () => {
    if (!branchCoords.lat || !branchCoords.lng || !customerCoords.lat || !customerCoords.lng) {
      toast.error('Please enter all coordinates');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/distance/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          branchLat: parseFloat(branchCoords.lat),
          branchLng: parseFloat(branchCoords.lng),
          customerLat: parseFloat(customerCoords.lat),
          customerLng: parseFloat(customerCoords.lng),
        }),
      });

      if (!res.ok) throw new Error('Failed to calculate distance');
      
      const data = await res.json();
      setResult(data);
      toast.success('Distance calculated successfully!');
    } catch (error) {
      toast.error('Failed to calculate distance');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setBranchCoords({ lat: '', lng: '' });
    setCustomerCoords({ lat: '', lng: '' });
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Test Distance Calculator</h1>
          <p className="text-muted-foreground text-sm mt-1">Calculate distance between branch and customer locations using OSRM</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="stat-card space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin size={20} className="text-accent" />
            Location Coordinates
          </h2>

          {/* Branch Location */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Branch Location</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Latitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="28.6139"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                  value={branchCoords.lat}
                  onChange={(e) => setBranchCoords({ ...branchCoords, lat: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Longitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="77.2090"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                  value={branchCoords.lng}
                  onChange={(e) => setBranchCoords({ ...branchCoords, lng: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Customer Location */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Customer Location</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Latitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="28.7041"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                  value={customerCoords.lat}
                  onChange={(e) => setCustomerCoords({ ...customerCoords, lat: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Longitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="77.1025"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                  value={customerCoords.lng}
                  onChange={(e) => setCustomerCoords({ ...customerCoords, lng: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={calculateDistance}
              disabled={loading}
              className="flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm disabled:opacity-60"
            >
              <Calculator size={16} />
              {loading ? 'Calculating...' : 'Calculate Distance'}
            </button>
            <button
              onClick={clearForm}
              className="flex items-center gap-2 border border-border text-foreground font-medium py-2.5 px-4 rounded-xl hover:bg-muted transition-colors text-sm"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="stat-card">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Navigation size={20} className="text-accent" />
            Distance Results
          </h2>

          {result ? (
            <div className="space-y-4">
              {/* Distance Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-accent">{result.distance.kilometers}</div>
                  <div className="text-sm text-muted-foreground">Kilometers</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-accent">{result.duration.minutes}</div>
                  <div className="text-sm text-muted-foreground">Minutes</div>
                </div>
              </div>

              {/* Detailed Information */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <Navigation size={16} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="font-medium">{result.distance.meters.toLocaleString()} meters</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{Math.floor(result.duration.seconds / 60)}m {result.duration.seconds % 60}s</span>
                </div>
              </div>

              {/* Coordinates Summary */}
              <div className="space-y-2 pt-4 border-t border-border">
                <h4 className="font-medium text-sm">Coordinates Used:</h4>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div>Branch: {result.coordinates.branch.lat}, {result.coordinates.branch.lng}</div>
                  <div>Customer: {result.coordinates.customer.lat}, {result.coordinates.customer.lng}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Navigation size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Enter coordinates and click calculate to see distance results</p>
            </div>
          )}
        </div>
      </div>

      {/* Sample Coordinates */}
      <div className="stat-card">
        <h3 className="font-medium mb-3">Sample Coordinates (Delhi, India)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-foreground mb-1">Connaught Place (Branch)</div>
            <div className="text-muted-foreground">Lat: 28.6315, Lng: 77.2167</div>
          </div>
          <div>
            <div className="font-medium text-foreground mb-1">India Gate (Customer)</div>
            <div className="text-muted-foreground">Lat: 28.6129, Lng: 77.2295</div>
          </div>
        </div>
      </div>
    </div>
  );
}