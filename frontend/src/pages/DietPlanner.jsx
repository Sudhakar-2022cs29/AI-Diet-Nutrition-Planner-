// DietPlanner — shows calorie recommendation, macros, and meal suggestions
import { useState, useEffect } from 'react';
import { dietAPI } from '../services/api';
import { FiTarget, FiDroplet } from 'react-icons/fi';

const GOAL_INFO = {
  weight_loss: { emoji:'🔥', color:'var(--accent-red)', tip:'Aim for a 500 cal/day deficit to lose ~0.5kg/week' },
  maintenance: { emoji:'⚖️', color:'var(--accent-blue)', tip:'Eat at your TDEE to maintain your current weight' },
  weight_gain: { emoji:'💪', color:'var(--accent-green)', tip:'Eat 500 cal above TDEE to gain ~0.5kg/week' },
};

export default function DietPlanner() {
  const [rec,     setRec]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    dietAPI.getRecommendation()
      .then(({ data }) => setRec(data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load recommendations'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-wrapper" style={{ paddingTop:'4rem' }}><span className="spinner spinner-lg" /><span>Calculating your plan...</span></div>;
  if (error)   return <div className="page-wrapper"><div className="alert alert-error">{error}</div></div>;

  const info = GOAL_INFO[rec?.goal] || GOAL_INFO.maintenance;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1><span style={{ background:'var(--gradient-main)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Diet Planner</span> 🥑</h1>
        <p>Personalized calorie and nutrition recommendations based on your profile</p>
      </div>

      {/* Goal banner */}
      <div className="card card-highlight" style={{ marginBottom:'1.5rem', padding:'2rem', textAlign:'center' }}>
        <div style={{ fontSize:'3rem', marginBottom:'0.5rem' }}>{info.emoji}</div>
        <h2 style={{ color: info.color, marginBottom:'0.5rem' }}>{rec.goalDescription}</h2>
        <p style={{ fontSize:'0.9rem' }}>{info.tip}</p>
      </div>

      {/* Key numbers */}
      <div className="grid-3" style={{ marginBottom:'1.5rem' }}>
        {[
          { label:'BMR (at rest)',  value:rec.bmr,            unit:'kcal/day', sub:'Minimum calories to stay alive', color:'var(--accent-purple)' },
          { label:'TDEE (maintenance)', value:rec.tdee,       unit:'kcal/day', sub:'Calories burned with activity', color:'var(--accent-blue)' },
          { label:'Daily Target',   value:rec.targetCalories, unit:'kcal/day', sub:'Your personalised goal', color:'var(--accent-green)' },
        ].map(m => (
          <div className="card" key={m.label} style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2.25rem', fontWeight:'800', color:m.color }}>{m.value.toLocaleString()}</div>
            <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:'0.15rem 0' }}>{m.unit}</div>
            <div style={{ fontWeight:600, marginBottom:'0.25rem' }}>{m.label}</div>
            <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Macros */}
      <div className="card" style={{ marginBottom:'1.5rem' }}>
        <h3 style={{ marginBottom:'1rem' }}>🥩 Daily Macronutrient Targets</h3>
        <p style={{ marginBottom:'1.5rem', fontSize:'0.875rem' }}>
          Based on a 30% protein / 40% carbs / 30% fat split — adjust to your preference.
        </p>
        <div className="grid-3">
          {[
            { label:'Protein', value:rec.macros.protein, unit:'g', color:'var(--accent-blue)',   tip:'Builds & repairs muscle', pct:'30%' },
            { label:'Carbs',   value:rec.macros.carbs,   unit:'g', color:'var(--accent-orange)', tip:'Primary energy source',   pct:'40%' },
            { label:'Fat',     value:rec.macros.fat,     unit:'g', color:'var(--accent-purple)', tip:'Hormones & brain health', pct:'30%' },
          ].map(m => (
            <div key={m.label} style={{ padding:'1.25rem', background:'rgba(255,255,255,0.04)', borderRadius:'var(--radius-md)', textAlign:'center' }}>
              <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'0.5rem' }}>{m.pct} of calories</div>
              <div style={{ fontSize:'2rem', fontWeight:'700', color:m.color }}>{m.value}<span style={{fontSize:'1rem'}}>{m.unit}</span></div>
              <div style={{ fontWeight:600, marginBottom:'0.25rem' }}>{m.label}</div>
              <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)' }}>{m.tip}</div>
              <div className="progress-bar" style={{ marginTop:'0.75rem' }}>
                <div className="progress-fill" style={{ width:'100%', background: m.color }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:'1rem', padding:'0.875rem', background:'rgba(79,155,248,0.08)', borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <FiDroplet style={{ color:'var(--accent-blue)', fontSize:'1.25rem' }} />
          <div>
            <strong>Daily Hydration Goal:</strong> <span style={{ color:'var(--accent-blue)', fontWeight:700 }}>{rec.hydration}L</span> of water
            <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>~{Math.round(rec.hydration * 4)} glasses (250ml each)</div>
          </div>
        </div>
      </div>

      {/* Meal suggestions */}
      <div className="card">
        <h3 style={{ marginBottom:'1.25rem' }}>🍽️ Recommended Meal Plan</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'1.25rem' }}>
          {Object.entries(rec.mealSuggestions).map(([meal, items]) => (
            <div key={meal} style={{ padding:'1.25rem', background:'rgba(255,255,255,0.04)', borderRadius:'var(--radius-md)' }}>
              <h4 style={{ textTransform:'capitalize', marginBottom:'0.75rem', color:'var(--accent-green)' }}>
                {meal === 'breakfast' ? '🌅' : meal === 'lunch' ? '☀️' : meal === 'dinner' ? '🌙' : '🍎'} {meal}
              </h4>
              <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                {items.map((item, i) => (
                  <li key={i} style={{ fontSize:'0.85rem', display:'flex', alignItems:'flex-start', gap:'0.5rem' }}>
                    <span style={{ color:'var(--accent-green)', marginTop:'2px' }}>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
