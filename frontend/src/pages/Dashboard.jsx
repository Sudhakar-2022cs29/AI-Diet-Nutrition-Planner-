// Dashboard — main home page showing user stats and daily summary
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { foodAPI, dietAPI, authAPI } from '../services/api';
import { FiSearch, FiList, FiTarget, FiBarChart2, FiEdit2, FiCheck, FiX, FiCpu } from 'react-icons/fi';

const GOAL_LABELS = {
  weight_loss:  { label: '🔥 Weight Loss',  badge: 'badge-red' },
  maintenance:  { label: '⚖️ Maintenance',  badge: 'badge-blue' },
  weight_gain:  { label: '💪 Weight Gain',  badge: 'badge-green' },
};

const ACTIVITY_LABELS = {
  sedentary:   'Sedentary', light: 'Lightly Active', moderate: 'Moderately Active',
  active: 'Active', very_active: 'Very Active'
};

export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const [todayData,  setTodayData]  = useState({ logs: [], totals: { calories:0, protein:0, carbs:0, fat:0 } });
  const [dietRec,    setDietRec]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [editMode,   setEditMode]   = useState(false);
  const [editForm,   setEditForm]   = useState({});
  const [saving,     setSaving]     = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logRes, dietRes] = await Promise.all([foodAPI.getTodayLog(), dietAPI.getRecommendation()]);
      setTodayData(logRes.data);
      setDietRec(dietRes.data);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const startEdit = () => {
    setEditForm({ weight: user.weight, height: user.height, age: user.age, gender: user.gender, goal: user.goal, activityLevel: user.activityLevel });
    setEditMode(true);
  };
  const cancelEdit = () => setEditMode(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await authAPI.updateProfile(editForm);
      updateUser(data);
      setEditMode(false);
      fetchData();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const caloriesConsumed = todayData.totals.calories;
  const caloriesTarget   = dietRec?.targetCalories || 2000;
  const caloriePercent   = Math.min(100, Math.round((caloriesConsumed / caloriesTarget) * 100));
  const caloriesLeft     = Math.max(0, caloriesTarget - caloriesConsumed);
  const goalInfo         = GOAL_LABELS[user?.goal] || GOAL_LABELS.maintenance;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1>Good {getTimeGreeting()}, <span style={{ background:'var(--gradient-main)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{user?.name?.split(' ')[0]}! 👋</span></h1>
          <p>Here's your nutrition overview for today.</p>
        </div>
        <button className="btn btn-secondary" onClick={editMode ? cancelEdit : startEdit}>
          {editMode ? <><FiX /> Cancel</> : <><FiEdit2 /> Edit Profile</>}
        </button>
      </div>

      {/* Profile Edit Form */}
      {editMode && (
        <div className="card" style={{ marginBottom: '2rem', background:'var(--gradient-card)' }}>
          <h3 style={{ marginBottom:'1rem' }}>✏️ Edit Profile</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'1rem', marginBottom:'1rem' }}>
            {[['weight','Weight (kg)','number'],['height','Height (cm)','number'],['age','Age','number']].map(([k,lbl,t]) => (
              <div className="form-group" key={k}>
                <label className="form-label">{lbl}</label>
                <input className="form-input" type={t} value={editForm[k]||''} onChange={e => setEditForm(f=>({...f,[k]:e.target.value}))} />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-input form-select" value={editForm.gender||'male'} onChange={e=>setEditForm(f=>({...f,gender:e.target.value}))}>
                <option value="male">Male</option><option value="female">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Goal</label>
              <select className="form-input form-select" value={editForm.goal||'maintenance'} onChange={e=>setEditForm(f=>({...f,goal:e.target.value}))}>
                <option value="weight_loss">Weight Loss</option>
                <option value="maintenance">Maintenance</option>
                <option value="weight_gain">Weight Gain</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Activity</label>
              <select className="form-input form-select" value={editForm.activityLevel||'moderate'} onChange={e=>setEditForm(f=>({...f,activityLevel:e.target.value}))}>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="active">Active</option>
                <option value="very_active">Very Active</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
            {saving ? <span className="spinner" /> : <><FiCheck /> Save Changes</>}
          </button>
        </div>
      )}

      {/* Calorie Summary — hero card */}
      <div className="card card-highlight" style={{ marginBottom:'1.5rem', padding:'2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1.5rem' }}>
          <div>
            <div style={{ fontSize:'0.85rem', color:'var(--text-secondary)', marginBottom:'0.5rem' }}>Today's Calorie Progress</div>
            <div style={{ fontSize:'3rem', fontWeight:'800', color:'var(--accent-green)', lineHeight:1 }}>
              {caloriesConsumed.toLocaleString()}
            </div>
            <div style={{ color:'var(--text-secondary)', marginTop:'0.25rem' }}>
              of <strong style={{color:'var(--text-primary)'}}>{caloriesTarget.toLocaleString()}</strong> kcal target
            </div>
          </div>
          <div style={{ flex:'0 0 auto', textAlign:'right' }}>
            <div style={{ fontSize:'2rem', fontWeight:'700', color: caloriesLeft === 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
              {caloriesLeft.toLocaleString()}
            </div>
            <div style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>kcal remaining</div>
          </div>
        </div>
        <div className="progress-bar" style={{ marginTop:'1.5rem' }}>
          <div className="progress-fill" style={{ width:`${caloriePercent}%`,
            background: caloriePercent > 100 ? 'linear-gradient(135deg,#f87171,#fb923c)' : 'var(--gradient-main)' }}
          />
        </div>
        <div style={{ color:'var(--text-secondary)', fontSize:'0.8rem', marginTop:'0.5rem' }}>{caloriePercent}% of daily goal</div>
      </div>

      {/* Macro summary row */}
      <div className="grid-3" style={{ marginBottom:'1.5rem' }}>
        {[
          { label:'Protein', value: todayData.totals.protein, unit:'g', color:'var(--accent-blue)' },
          { label:'Carbs',   value: todayData.totals.carbs,   unit:'g', color:'var(--accent-orange)' },
          { label:'Fat',     value: todayData.totals.fat,     unit:'g', color:'var(--accent-purple)' },
        ].map(m => (
          <div className="card" key={m.label} style={{ textAlign:'center', padding:'1.25rem' }}>
            <div style={{ fontSize:'1.75rem', fontWeight:'700', color:m.color }}>{Math.round(m.value)}<span style={{fontSize:'1rem',fontWeight:400}}>{m.unit}</span></div>
            <div className="stat-label">{m.label}</div>
          </div>
        ))}
      </div>

      {/* User profile snapshot */}
      <div className="grid-2" style={{ marginBottom:'1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom:'1rem' }}>👤 Your Profile</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {[
              ['Weight', `${user?.weight} kg`],
              ['Height', `${user?.height} cm`],
              ['Age',    `${user?.age} years`],
              ['Gender', user?.gender],
              ['Activity', ACTIVITY_LABELS[user?.activityLevel]],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.875rem' }}>
                <span style={{ color:'var(--text-secondary)' }}>{k}</span>
                <span style={{ fontWeight:500, textTransform:'capitalize' }}>{v}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.875rem', alignItems:'center' }}>
              <span style={{ color:'var(--text-secondary)' }}>Goal</span>
              <span className={`badge ${goalInfo.badge}`}>{goalInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Calorie targets */}
        <div className="card">
          <h3 style={{ marginBottom:'1rem' }}>🎯 Calorie Targets</h3>
          {loading ? <div className="loading-wrapper"><span className="spinner" /></div> : dietRec && (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {[
                ['BMR (base metabolic rate)', `${dietRec.bmr} kcal`],
                ['TDEE (maintenance)',         `${dietRec.tdee} kcal`],
                ['Daily Target',               `${dietRec.targetCalories} kcal`, 'var(--accent-green)'],
                ['Protein target',             `${dietRec.macros?.protein}g`],
                ['Carbs target',               `${dietRec.macros?.carbs}g`],
                ['Fat target',                 `${dietRec.macros?.fat}g`],
                ['Hydration',                  `${dietRec.hydration}L water`],
              ].map(([k,v,color]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.875rem' }}>
                  <span style={{ color:'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight:600, color: color || 'var(--text-primary)' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick action buttons */}
      <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
        {[
          { to:'/detect',       icon:<FiSearch />,   label:'Detect Food',         primary:true },
          { to:'/ai-coach',     icon:<FiCpu />,      label:'AI Nutrition Coach',  primary:true },
          { to:'/log',          icon:<FiList />,     label:'View Log',            primary:false },
          { to:'/diet-planner', icon:<FiTarget />,   label:'Diet Planner',        primary:false },
          { to:'/progress',     icon:<FiBarChart2 />,label:'Progress Analytics',   primary:false },
        ].map(a => (
          <Link key={a.to} to={a.to} className={`btn ${a.primary ? 'btn-primary' : 'btn-secondary'}`}>
            {a.icon} {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
