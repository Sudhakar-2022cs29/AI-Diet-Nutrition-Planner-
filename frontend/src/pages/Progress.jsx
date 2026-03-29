// Progress — weekly calorie charts + weight tracking
import { useState, useEffect } from 'react';
import { foodAPI, weightAPI, dietAPI } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Legend
} from 'recharts';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

// Custom recharts tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', padding:'0.875rem', fontSize:'0.85rem' }}>
      <div style={{ fontWeight:600, marginBottom:'0.5rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, display:'flex', gap:'0.5rem' }}>
          <span>{p.name}:</span><strong>{Math.round(p.value)}{p.name === 'Calories' ? ' kcal' : 'g'}</strong>
        </div>
      ))}
    </div>
  );
};

export default function Progress() {
  const [weekly,    setWeekly]    = useState([]);
  const [weights,   setWeights]   = useState([]);
  const [targetCal, setTargetCal] = useState(2000);
  const [loading,   setLoading]   = useState(true);
  const [weightForm, setWeightForm] = useState({ weight:'', note:'' });
  const [addingW,   setAddingW]   = useState(false);
  const [deletingW, setDeletingW] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [wRes, wLogRes, dRes] = await Promise.all([
        foodAPI.getWeeklyData(), weightAPI.getWeightHistory(), dietAPI.getRecommendation()
      ]);
      setWeekly(wRes.data);
      setWeights(wLogRes.data);
      setTargetCal(dRes.data.targetCalories);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddWeight = async (e) => {
    e.preventDefault();
    if (!weightForm.weight) return;
    setAddingW(true);
    try {
      await weightAPI.addWeight(weightForm);
      setWeightForm({ weight:'', note:'' });
      fetchAll();
    } catch(err) { console.error(err); }
    finally { setAddingW(false); }
  };

  const handleDeleteWeight = async (id) => {
    setDeletingW(id);
    try { await weightAPI.deleteWeight(id); fetchAll(); }
    catch(err) { console.error(err); }
    finally { setDeletingW(null); }
  };

  // Weekly stats
  const avgCalories = weekly.length ? Math.round(weekly.reduce((s,d) => s+d.calories, 0) / weekly.length) : 0;
  const totalCalories = weekly.reduce((s,d) => s+d.calories, 0);

  if (loading) return <div className="loading-wrapper" style={{ paddingTop:'4rem' }}><span className="spinner spinner-lg" /><span>Loading progress data...</span></div>;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1><span style={{ background:'var(--gradient-main)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Progress</span> 📈</h1>
        <p>Your 7-day calorie history and weight tracking</p>
      </div>

      {/* Weekly summary stats */}
      <div className="grid-3" style={{ marginBottom:'1.5rem' }}>
        {[
          { label:'Avg Daily Calories', value: avgCalories, unit:'kcal', color:'var(--accent-green)' },
          { label:'Weekly Total',       value: Math.round(totalCalories), unit:'kcal', color:'var(--accent-blue)' },
          { label:'Daily Target',       value: targetCal, unit:'kcal', color:'var(--accent-orange)' },
        ].map(m => (
          <div className="card" key={m.label} style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2rem', fontWeight:'800', color:m.color }}>{m.value.toLocaleString()}</div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{m.unit}</div>
            <div style={{ fontWeight:600, marginTop:'0.25rem' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly Calorie Bar Chart */}
      <div className="card" style={{ marginBottom:'1.5rem' }}>
        <h3 style={{ marginBottom:'1.5rem' }}>📊 7-Day Calorie Overview</h3>
        {weekly.every(d => d.calories === 0) ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-secondary)' }}>
            No food logged this week yet. <a href="/detect" style={{ color:'var(--accent-green)' }}>Add your first meal!</a>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weekly} margin={{ top:5, right:10, left:0, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill:'#8892a4', fontSize:12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill:'#8892a4', fontSize:12 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={targetCal} stroke="rgba(251,146,60,0.6)" strokeDasharray="6 3" label={{ value:'Target', fill:'#fb923c', fontSize:12, position:'right' }} />
              <Bar dataKey="calories" name="Calories" fill="url(#barGrad)" radius={[6,6,0,0]} />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#63da8a" />
                  <stop offset="100%" stopColor="#4f9bf8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Macro breakdown chart */}
      <div className="card" style={{ marginBottom:'1.5rem' }}>
        <h3 style={{ marginBottom:'1.5rem' }}>🥩 Weekly Macro Breakdown</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weekly} margin={{ top:5, right:10, left:0, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill:'#8892a4', fontSize:12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill:'#8892a4', fontSize:12 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop:'1rem', fontSize:'0.8rem' }} />
            <Bar dataKey="protein" name="Protein" fill="#4f9bf8" radius={[4,4,0,0]} />
            <Bar dataKey="carbs"   name="Carbs"   fill="#fb923c" radius={[4,4,0,0]} />
            <Bar dataKey="fat"     name="Fat"     fill="#a78bfa" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weight tracking */}
      <div className="grid-2">
        {/* Add weight form */}
        <div className="card">
          <h3 style={{ marginBottom:'1rem' }}>⚖️ Log Your Weight</h3>
          <form onSubmit={handleAddWeight} style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input className="form-input" type="number" step="0.1" placeholder="e.g. 72.5"
                value={weightForm.weight} onChange={e=>setWeightForm(f=>({...f,weight:e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input className="form-input" placeholder="e.g. Morning weight"
                value={weightForm.note} onChange={e=>setWeightForm(f=>({...f,note:e.target.value}))} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={addingW}>
              {addingW ? <span className="spinner" /> : <><FiPlus /> Log Weight</>}
            </button>
          </form>
        </div>

        {/* Weight history + sparkline */}
        <div className="card">
          <h3 style={{ marginBottom:'1rem' }}>📉 Weight History</h3>
          {weights.length > 1 && (
            <ResponsiveContainer width="100%" height={120} style={{ marginBottom:'1rem' }}>
              <LineChart data={weights}>
                <XAxis dataKey="createdAt" hide />
                <YAxis domain={['auto','auto']} hide />
                <Tooltip formatter={(v) => [`${v} kg`, 'Weight']} contentStyle={{ background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:'8px', fontSize:'0.8rem' }} />
                <Line type="monotone" dataKey="weight" stroke="#63da8a" strokeWidth={2} dot={{ r:3, fill:'#63da8a' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {weights.length === 0 ? (
            <p style={{ fontSize:'0.875rem', textAlign:'center', padding:'1rem' }}>No weight entries yet!</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', maxHeight:'200px', overflowY:'auto' }}>
              {[...weights].reverse().map(w => (
                <div key={w._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.5rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.875rem' }}>
                  <div>
                    <strong style={{ color:'var(--accent-green)' }}>{w.weight} kg</strong>
                    {w.note && <span style={{ color:'var(--text-muted)', marginLeft:'0.5rem', fontSize:'0.78rem' }}>{w.note}</span>}
                    <div style={{ color:'var(--text-muted)', fontSize:'0.75rem' }}>{new Date(w.createdAt).toLocaleDateString()}</div>
                  </div>
                  <button className="btn btn-danger" style={{ padding:'0.3rem 0.5rem', fontSize:'0.75rem' }}
                    onClick={() => handleDeleteWeight(w._id)} disabled={deletingW === w._id}>
                    {deletingW === w._id ? <span className="spinner" /> : <FiTrash2 />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
