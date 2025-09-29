import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import "leaflet/dist/leaflet.css";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// --- Custom Hook for Data Fetching ---
const useWaterData = () => {
  const [data, setData] = useState({ tws: {}, geojson: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [twsRes, geojsonRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/tws`),
          fetch(`${API_BASE_URL}/api/boundaries`),
        ]);

        if (!twsRes.ok || !geojsonRes.ok) {
          throw new Error("Network response was not ok");
        }

        
        const geojsonData = await geojsonRes.json();

        // const twsArray = await twsRes.json(); // It's an array
       
        //  // ✅ THE FIX: Convert the array to a lookup object
        // const twsLookupObject = twsArray.reduce((acc, current) => {
        //   // 'acc' is the accumulator (the object we're building)
        //   // 'current' is the current item in the array (e.g., { district: 'badgam', data: {...} })
        //   acc[current.district.toLowerCase()] = current.data;
        //   return acc;
        // }, {}); // Start with an empty object {}

        // setData({ tws: twsLookupObject, geojson: geojsonData });

        const twsLookupObject = await twsRes.json();
        // No .reduce() is necessary.
        setData({ tws: twsLookupObject, geojson: geojsonData });

        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { ...data, loading, error };
};

// --- Map Component ---
const MapComponent = ({ geojson, onDistrictClick }) => {
  const onEachFeature = (feature, layer) => {
    const districtName = feature.properties.DISTRICT || "Unknown";
    layer.bindTooltip(districtName, {
      permanent: false,
      direction: "center",
      className: "leaflet-tooltip",
    });

    layer.on({
      click: () => onDistrictClick(districtName),
      mouseover: (e) => e.target.setStyle({ weight: 3, color: "#3b82f6" }),
      mouseout: (e) => e.target.setStyle({ weight: 1, color: "#60a5fa" }),
    });
  };

  return (
    <MapContainer
      center={[34.0836, 74.7973]}
      zoom={7}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%", borderRadius: "var(--radius)" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geojson && (
        <GeoJSON
          data={geojson}
          style={{
            color: "#60a5fa",
            weight: 1,
            opacity: 0.8,
            fillColor: "#60a5fa",
            fillOpacity: 0.2,
          }}
          onEachFeature={onEachFeature}
        />
      )}
    </MapContainer>
  );
};

// --- Chart Component ---
const ChartComponent = ({ districtData, districtName }) => {
  // THE FIX: Add a more robust check for empty or invalid data.
  if (!districtData || Object.keys(districtData).length === 0) {
    const message = districtName
      ? `No TWS data is available for ${districtName}.`
      : "Click a district on the map to view its water status data.";
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>{message}</p>
      </div>
    );
  }

  const chartData = Object.entries(districtData).map(([year, value]) => ({
    year,
    "TWS (BCM)": value,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="year"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="TWS (BCM)"
          stroke="blue"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 8, stroke: "blue", strokeWidth: 2, fill: "#ffffff" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// --- Main App Component ---
function App() {
  const { tws, geojson, loading, error } = useWaterData();
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  const handleDistrictClick = (districtName) => {
    setSelectedDistrict(districtName);
  };

  // THE FIX & DEBUGGING: Clean the district name from the map before lookup.
  const districtKey = selectedDistrict
    ? selectedDistrict.trim().toLowerCase()
    : null;
  const selectedDistrictData = districtKey ? tws[districtKey] : null;

  // DEBUGGING LOGS: These will appear in your browser's developer console (F12)
  useEffect(() => {
    if (selectedDistrict) {
      console.clear(); // Clear the console for new clicks
      console.log("--- DEBUGGING DISTRICT DATA ---");
      console.log(`🗺️ Map clicked on: "${selectedDistrict}"`);
      console.log(`🔑 Cleaned key for lookup: "${districtKey}"`);
      console.log(
        "📊 Data found for this key:",
        selectedDistrictData || "==> NO DATA FOUND! <=="
      );
      console.log("📋 Available keys in TWS data:", Object.keys(tws));
      console.log("----------------------------");
    }
  }, [selectedDistrict, districtKey, selectedDistrictData, tws]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen font-semibold">
        Loading Dashboard...
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-screen text-destructive font-semibold">
        Error: {error}
      </div>
    );

  return (
    <div className="bg-background text-foreground min-h-screen p-4 lg:p-6 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
          Jammu & Kashmir - Water Status Dashboard
        </h1>
        <p className="text-muted-foreground">
          An interactive map displaying district-wise Terrestrial Water Storage
          (TWS).
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-grow">
        <Card className="lg:col-span-3 h-[50vh] lg:h-[75vh]">
          <MapComponent
            geojson={geojson}
            onDistrictClick={handleDistrictClick}
          />
        </Card>

        <Card className="lg:col-span-2 flex flex-col h-[50vh] lg:h-[75vh]">
          <CardHeader>
            <CardTitle>{selectedDistrict || "No District Selected"}</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow pb-4">
            <ChartComponent
              districtData={selectedDistrictData}
              districtName={selectedDistrict}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default App;
