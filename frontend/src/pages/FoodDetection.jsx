// FoodDetection — Multimodal Gemini Vision plate scan, OpenFoodFacts barcode lookup, & text search
import { useState, useRef } from 'react';
import { foodAPI, aiAPI } from '../services/api';
import {
  FiSearch, FiPlus, FiCheck, FiCamera, FiUploadCloud,
  FiZap, FiTag, FiCpu, FiAlertCircle, FiInfo
} from 'react-icons/fi';
import { toast } from 'sonner';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function FoodDetection() {
  const [activeTab, setActiveTab] = useState('vision'); // 'vision' | 'barcode' | 'text'

  // Text search state
  const [query, setQuery] = useState('');

  // Barcode state
  const [barcode, setBarcode] = useState('');

  // Vision scan state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef(null);

  // Common result state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mealType, setMealType] = useState('snack');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Handle image upload & base64 conversion
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
      setSelectedImage(event.target.result);
      setResult(null);
      setAdded(false);
    };
    reader.readAsDataURL(file);
  };

  // Start webcam
  const startCamera = async () => {
    setUseCamera(true);
    setImagePreview(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error('Camera access denied or unavailable: ' + err.message);
      setUseCamera(false);
    }
  };

  // Capture snapshot from webcam
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg');
    setImagePreview(base64);
    setSelectedImage(base64);

    // Stop stream
    const stream = videoRef.current.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
    setUseCamera(false);
  };

  // Execute Gemini Vision Scan
  const handleVisionScan = async () => {
    if (!selectedImage) {
      toast.error('Please select or capture a meal photo first');
      return;
    }

    setLoading(true);
    setResult(null);
    setAdded(false);

    try {
      const { data } = await aiAPI.scanFoodImage({
        imageBase64: selectedImage,
        mimeType: 'image/jpeg',
        mealContext: mealType
      });
      setResult(data);
      toast.success(`Identified: ${data.foodName}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to analyze food image with AI');
    } finally {
      setLoading(false);
    }
  };

  // Execute Barcode Lookup
  const handleBarcodeLookup = async (e) => {
    e?.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    setResult(null);
    setAdded(false);

    try {
      const { data } = await aiAPI.lookupBarcode(barcode.trim());
      setResult(data);
      toast.success(`Found product: ${data.foodName}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Barcode not found in OpenFoodFacts database');
    } finally {
      setLoading(false);
    }
  };

  // Execute Text Search
  const handleTextSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);
    setAdded(false);

    try {
      const { data } = await foodAPI.detectFood(query.trim());
      setResult(data);
      toast.success(`Found nutrition data for ${query}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to detect food');
    } finally {
      setLoading(false);
    }
  };

  // Save to Food Log
  const handleAddToLog = async () => {
    if (!result) return;
    setAdding(true);
    try {
      await foodAPI.addFoodLog({
        foodName: result.foodName,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        fiber: result.fiber || 0,
        serving: result.serving || '100g',
        mealType,
        source: result.source || 'AI Detection'
      });
      setAdded(true);
      toast.success(`Added ${result.foodName} to today's ${mealType}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add food to log');
    } finally {
      setAdding(false);
    }
  };

  const sampleBarcodes = [
    { name: 'Oat Milk Barista', code: '7394376616037' },
    { name: 'Nutella Hazelnut Spread', code: '3017620422003' },
    { name: 'Oreo Biscuits', code: '7622210449283' }
  ];

  const quickFoods = ['Grilled Chicken', 'Brown Rice', 'Avocado', 'Boiled Eggs', 'Greek Yogurt', 'Salmon Fillet', 'Broccoli'];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>
          🔍 <span style={{ background: 'var(--gradient-main)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Smart Food Detection</span>
        </h1>
        <p>Analyze your meals instantly using Gemini 2.5 Vision, Barcode Lookup, or Smart Search</p>
      </div>

      {/* Tabs navigation */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button
          className={`btn ${activeTab === 'vision' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('vision'); setResult(null); }}
        >
          <FiCamera /> AI Photo Scanner (Gemini)
        </button>
        <button
          className={`btn ${activeTab === 'barcode' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('barcode'); setResult(null); }}
        >
          <FiTag /> Barcode Lookup (OpenFoodFacts)
        </button>
        <button
          className={`btn ${activeTab === 'text' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('text'); setResult(null); }}
        >
          <FiSearch /> Text Search
        </button>
      </div>

      {/* Tab 1: Vision Photo Scanner */}
      {activeTab === 'vision' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📸 Multimodal AI Plate Recognition
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Snap or upload a photo of your meal. Google Gemini 2.5 Vision identifies individual ingredients, estimates weight, and calculates macro distribution.
          </p>

          {/* Upload / Capture options */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiUploadCloud /> Upload Meal Photo
              <input type="file" accept="image/*" onChange={handleImageFileChange} style={{ display: 'none' }} />
            </label>
            <button className="btn btn-secondary" onClick={startCamera}>
              <FiCamera /> Open Camera
            </button>
          </div>

          {/* Camera live preview */}
          {useCamera && (
            <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
              <video ref={videoRef} autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '340px', borderRadius: 'var(--radius-md)', border: '2px solid var(--accent-green)' }} />
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={capturePhoto}>Capture Snap</button>
                <button className="btn btn-secondary" onClick={() => setUseCamera(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Captured / Uploaded Image Preview */}
          {imagePreview && (
            <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ position: 'relative', maxWidth: '360px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <img src={imagePreview} alt="Meal preview" style={{ width: '100%', display: 'block', maxHeight: '260px', objectFit: 'cover' }} />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleVisionScan}
                disabled={loading}
                style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
              >
                {loading ? <><span className="spinner" /> Analyzing with Gemini AI...</> : <><FiCpu /> Analyze Plate with AI</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Barcode Lookup */}
      {activeTab === 'barcode' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏷️ Global Barcode Database (OpenFoodFacts)
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Enter any global retail food barcode to query verified nutritional values and Nutri-Scores from over 3 million packaged products.
          </p>

          <form onSubmit={handleBarcodeLookup} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <input
              className="form-input"
              style={{ flex: 1, minWidth: '220px' }}
              placeholder="e.g. 7394376616037 (13-digit EAN/UPC)"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !barcode.trim()}>
              {loading ? <span className="spinner" /> : <><FiSearch /> Lookup Barcode</>}
            </button>
          </form>

          {/* Sample quick barcodes */}
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Try sample products: </span>
            {sampleBarcodes.map(s => (
              <button
                key={s.code}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', marginLeft: '0.4rem', marginTop: '0.25rem' }}
                onClick={() => { setBarcode(s.code); }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Text Search */}
      {activeTab === 'text' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>🔍 Instant Food Search</h3>
          <form onSubmit={handleTextSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <input
              className="form-input"
              style={{ flex: 1, minWidth: '220px' }}
              placeholder="e.g. 100g grilled salmon, 2 eggs, avocado..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
              {loading ? <span className="spinner" /> : <><FiSearch /> Detect</>}
            </button>
          </form>

          {/* Quick chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {quickFoods.map(f => (
              <button
                key={f}
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => { setQuery(f); }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="card card-highlight" style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                <h2 style={{ textTransform: 'capitalize' }}>{result.foodName}</h2>
                <span className="badge badge-blue">{result.source}</span>
                {result.nutriScore && result.nutriScore !== 'N/A' && (
                  <span className="badge badge-green">Nutri-Score: {result.nutriScore}</span>
                )}
                {result.confidence && result.provider !== 'built_in_estimate' && (
                  <span className="badge badge-orange">{Math.round(result.confidence * 100)}% AI Match</span>
                )}
                {result.provider === 'built_in_estimate' && (
                  <span className="badge badge-orange">Sample estimate — not a real scan</span>
                )}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Serving Size: <strong>{result.serving}</strong> {result.brand && `• Brand: ${result.brand}`}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--accent-green)', lineHeight: 1 }}>
                {result.calories}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total kcal</div>
            </div>
          </div>

          {/* Macros Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Protein', value: result.protein, unit: 'g', color: 'var(--accent-blue)' },
              { label: 'Carbs',   value: result.carbs,   unit: 'g', color: 'var(--accent-orange)' },
              { label: 'Fat',     value: result.fat,     unit: 'g', color: 'var(--accent-purple)' },
              { label: 'Fiber',   value: result.fiber || 0, unit: 'g', color: 'var(--accent-green)' },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center', padding: '0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: m.color }}>
                  {m.value}<span style={{ fontSize: '0.8rem' }}>{m.unit}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Identified ingredients table for Gemini Vision */}
          {result.items?.length > 0 && (
            <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-green)' }}>
                <FiInfo /> Plate Component Breakdown (Estimated by Vision AI)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {result.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>
                    <span><strong>{item.name}</strong> ({item.weight})</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {item.calories} kcal • P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Health insights */}
          {result.healthInsights && (
            <div style={{ marginBottom: '1.25rem', padding: '0.875rem 1rem', background: 'rgba(99, 218, 138, 0.08)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--accent-green)' }}>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                💡 <strong>Clinical Insight:</strong> {result.healthInsights}
              </div>
            </div>
          )}

          {/* Healthier alternatives */}
          {result.alternatives?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--accent-green)' }}>💚 Healthier Alternatives & Swaps</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {result.alternatives.map((alt, i) => (
                  <span key={i} className="badge badge-green">{alt}</span>
                ))}
              </div>
            </div>
          )}

          {/* Add to daily log section */}
          {!added ? (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
              <select
                className="form-input form-select"
                style={{ width: 'auto', flex: '0 0 auto' }}
                value={mealType}
                onChange={e => setMealType(e.target.value)}
              >
                {MEAL_TYPES.map(m => (
                  <option key={m} value={m} style={{ textTransform: 'capitalize' }}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handleAddToLog} disabled={adding}>
                {adding ? <span className="spinner" /> : <><FiPlus /> Add to Daily Log</>}
              </button>
            </div>
          ) : (
            <div className="alert alert-success">
              <FiCheck style={{ marginRight: '0.5rem' }} />
              Added to your daily log! <a href="/log" style={{ color: 'var(--accent-green)', marginLeft: '0.5rem' }}>View Log →</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
