// FoodDetection — search for food by name, get nutrition info, add to log
import { useState } from 'react';
import { foodAPI } from '../services/api';
import { FiSearch, FiPlus, FiCheck } from 'react-icons/fi';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function FoodDetection() {
  const [query,    setQuery]    = useState('');
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [added,    setAdded]    = useState(false);
  const [mealType, setMealType] = useState('snack');
  const [adding,   setAdding]   = useState(false);

  const handleDetect = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setAdded(false);
    try {
      const { data } = await foodAPI.detectFood(query);
      setResult(data);
    } catch(err) {
      setError(err.response?.data?.message || 'Failed to detect food. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLog = async () => {
    if (!result) return;
    setAdding(true);
    try {
      await foodAPI.addFoodLog({ ...result, mealType });
      setAdded(true);
    } catch(err) {
      setError(err.response?.data?.message || 'Failed to add to log.');
    } finally {
      setAdding(false);
    }
  };

  const quickFoods = ['Pizza', 'Chicken', 'Apple', 'Rice', 'Salmon', 'Burger', 'Oatmeal', 'Salad'];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>🔍 <span style={{ background:'var(--gradient-main)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Food Detection</span></h1>
        <p>Enter a food name to get instant calorie and nutrition information</p>
      </div>

      {/* Image upload notice */}
      <div className="alert alert-info" style={{ marginBottom:'1.5rem' }}>
        💡 <strong>How it works:</strong> Type the name of any food below. We'll fetch real nutrition data from CalorieNinjas API (or our built-in database). Then add it to your daily log!
      </div>

      {/* Search form */}
      <div className="card" style={{ marginBottom:'1.5rem' }}>
        <form onSubmit={handleDetect} style={{ display:'flex', gap:'0.75rem', alignItems:'flex-end', flexWrap:'wrap' }}>
          <div className="form-group" style={{ flex:1, minWidth:'200px' }}>
            <label className="form-label">Food Name</label>
            <div style={{ position:'relative' }}>
              <FiSearch style={{ position:'absolute', left:'0.875rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input
                id="food-search-input"
                className="form-input"
                style={{ paddingLeft:'2.5rem' }}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g. pizza, chicken breast, apple..."
              />
            </div>
          </div>
          <button id="detect-btn" type="submit" className="btn btn-primary" disabled={loading || !query.trim()} style={{ height:'44px' }}>
            {loading ? <span className="spinner" /> : <><FiSearch /> Detect</>}
          </button>
        </form>

        {/* Quick food chips */}
        <div style={{ marginTop:'1rem' }}>
          <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)', marginBottom:'0.5rem' }}>Quick select:</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
            {quickFoods.map(f => (
              <button key={f} className="btn btn-secondary"
                style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem' }}
                onClick={() => { setQuery(f); }}
              >{f}</button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom:'1rem' }}>{error}</div>}

      {/* Result card */}
      {result && (
        <div className="card card-highlight" style={{ animation:'fadeIn 0.3s ease' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem', marginBottom:'1.5rem' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.5rem' }}>
                <h2 style={{ textTransform:'capitalize' }}>{result.foodName}</h2>
                <span className="badge badge-blue">{result.source}</span>
              </div>
              <div style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>Per {result.serving}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'3rem', fontWeight:'800', color:'var(--accent-green)', lineHeight:1 }}>
                {result.calories}
              </div>
              <div style={{ color:'var(--text-secondary)' }}>Calories</div>
            </div>
          </div>

          {/* Macros grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
            {[
              { label:'Protein',  value:result.protein, unit:'g', color:'var(--accent-blue)' },
              { label:'Carbs',    value:result.carbs,   unit:'g', color:'var(--accent-orange)' },
              { label:'Fat',      value:result.fat,     unit:'g', color:'var(--accent-purple)' },
              { label:'Fiber',    value:result.fiber,   unit:'g', color:'var(--accent-green)' },
            ].map(m => (
              <div key={m.label} style={{ textAlign:'center', padding:'0.875rem', background:'rgba(255,255,255,0.04)', borderRadius:'var(--radius-md)' }}>
                <div style={{ fontSize:'1.4rem', fontWeight:'700', color:m.color }}>{m.value}<span style={{fontSize:'0.8rem'}}>{m.unit}</span></div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:'0.2rem' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Healthier alternatives */}
          {result.alternatives?.length > 0 && (
            <div style={{ marginBottom:'1.5rem' }}>
              <h4 style={{ marginBottom:'0.75rem', color:'var(--accent-green)' }}>💚 Healthier Alternatives</h4>
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                {result.alternatives.map((alt, i) => (
                  <span key={i} className="badge badge-green">{alt}</span>
                ))}
              </div>
            </div>
          )}

          {/* Add to log section */}
          {!added ? (
            <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap' }}>
              <select
                className="form-input form-select"
                style={{ width:'auto', flex:'0 0 auto' }}
                value={mealType}
                onChange={e => setMealType(e.target.value)}
              >
                {MEAL_TYPES.map(m => (
                  <option key={m} value={m} style={{textTransform:'capitalize'}}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>
                ))}
              </select>
              <button id="add-to-log-btn" className="btn btn-primary" onClick={handleAddToLog} disabled={adding}>
                {adding ? <span className="spinner" /> : <><FiPlus /> Add to Daily Log</>}
              </button>
            </div>
          ) : (
            <div className="alert alert-success">
              <FiCheck style={{ marginRight:'0.5rem' }} />
              Added to your daily log! <a href="/log" style={{ color:'var(--accent-green)', marginLeft:'0.5rem' }}>View Log →</a>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
