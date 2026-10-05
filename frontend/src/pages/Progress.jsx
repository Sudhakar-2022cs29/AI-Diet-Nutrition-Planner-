// Progress — weekly calorie charts + weight tracking + PDF & CSV report export
import { useState, useEffect } from 'react';
import { foodAPI, weightAPI, dietAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Legend
} from 'recharts';
import { FiPlus, FiTrash2, FiDownload, FiFileText } from 'react-icons/fi';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Custom recharts tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.875rem', fontSize: '0.85rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, display: 'flex', gap: '0.5rem' }}>
          <span>{p.name}:</span><strong>{Math.round(p.value)}{p.name === 'Calories' ? ' kcal' : 'g'}</strong>
        </div>
      ))}
    </div>
  );
};

export default function Progress() {
  const { user } = useAuth();
  const [weekly, setWeekly] = useState([]);
  const [weights, setWeights] = useState([]);
  const [targetCal, setTargetCal] = useState(2000);
  const [loading, setLoading] = useState(true);
  const [weightForm, setWeightForm] = useState({ weight: '', note: '' });
  const [addingW, setAddingW] = useState(false);
  const [deletingW, setDeletingW] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [wRes, wLogRes, dRes] = await Promise.all([
        foodAPI.getWeeklyData(), weightAPI.getWeightHistory(), dietAPI.getRecommendation()
      ]);
      setWeekly(wRes.data || []);
      setWeights(wLogRes.data || []);
      setTargetCal(dRes.data?.targetCalories || 2000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWeight = async (e) => {
    e.preventDefault();
    if (!weightForm.weight) return;
    setAddingW(true);
    try {
      await weightAPI.addWeight({
        weight: Number(weightForm.weight),
        note: weightForm.note
      });
      setWeightForm({ weight: '', note: '' });
      toast.success('Weight entry logged!');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log weight');
    } finally {
      setAddingW(false);
    }
  };

  const handleDeleteWeight = async (id) => {
    setDeletingW(id);
    // Optimistic UI update
    const previousWeights = [...weights];
    setWeights(weights.filter(w => w._id !== id));

    try {
      await weightAPI.deleteWeight(id);
      toast.success('Weight entry deleted');
    } catch {
      setWeights(previousWeights);
      toast.error('Failed to delete weight entry');
    } finally {
      setDeletingW(null);
    }
  };

  // ── Export PDF Report ─────────────────────────────────────
  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      const exportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // Title & Branding
      doc.setFontSize(20);
      doc.setTextColor(34, 197, 94);
      doc.text('NutriAI — Nutrition & Progress Report', 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on ${exportDate} for ${user?.name || 'User'} (${user?.email || ''})`, 14, 28);
      doc.text(`Target Calories: ${targetCal} kcal/day | Fitness Goal: ${user?.goal?.replace('_', ' ') || 'Maintenance'}`, 14, 34);

      // Section 1: Weekly Calorie & Macronutrient Table
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('1. 7-Day Macronutrient Intake Summary', 14, 46);

      const weeklyRows = weekly.map(d => [
        d.date,
        `${d.calories} kcal`,
        `${d.protein}g`,
        `${d.carbs}g`,
        `${d.fat}g`,
        d.calories > targetCal ? 'Surplus' : 'Deficit / On Target'
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['Date', 'Calories', 'Protein', 'Carbohydrates', 'Fat', 'Target Status']],
        body: weeklyRows,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] }
      });

      // Section 2: Weight Progression Log Table
      const finalY = doc.lastAutoTable.finalY + 12;
      doc.text('2. Weight Progression History', 14, finalY);

      const weightRows = weights.map(w => [
        new Date(w.createdAt).toLocaleDateString(),
        `${w.weight} kg`,
        w.note || '—'
      ]);

      autoTable(doc, {
        startY: finalY + 4,
        head: [['Date', 'Weight', 'Note / Context']],
        body: weightRows.length ? weightRows : [['No weight logs recorded', '—', '—']],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`NutriAI_Report_${user?.name?.replace(/\s+/g, '_') || 'Progress'}_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success('Downloaded nutrition PDF report!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF report');
    }
  };

  // ── Export CSV Report ─────────────────────────────────────
  const exportCSV = () => {
    try {
      const headers = ['Date', 'Calories (kcal)', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
      const rows = weekly.map(d => [
        `"${d.date}"`,
        d.calories,
        d.protein,
        d.carbs,
        d.fat
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `nutriai_weekly_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Downloaded CSV data file!');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const avgCalories = weekly.length ? Math.round(weekly.reduce((s, d) => s + d.calories, 0) / weekly.length) : 0;
  const totalCalories = weekly.reduce((s, d) => s + d.calories, 0);

  if (loading) {
    return (
      <div className="loading-wrapper" style={{ paddingTop: '4rem' }}>
        <span className="spinner spinner-lg" />
        <span>Aggregating your nutrition trends...</span>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>
            <span style={{ background: 'var(--gradient-main)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Progress Analytics
            </span> 📈
          </h1>
          <p>Visual 7-day intake charts, weight progression trends, and exported health reports</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={exportCSV}>
            <FiFileText /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={exportPDF}>
            <FiDownload /> Export Health PDF
          </button>
        </div>
      </div>

      {/* Weekly summary stats */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Avg Daily Calories', value: avgCalories, unit: 'kcal', color: 'var(--accent-green)' },
          { label: 'Weekly Total', value: Math.round(totalCalories), unit: 'kcal', color: 'var(--accent-blue)' },
          { label: 'Daily Target', value: targetCal, unit: 'kcal', color: 'var(--accent-orange)' },
        ].map(m => (
          <div className="card" key={m.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: m.color }}>{m.value.toLocaleString()}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.unit}</div>
            <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly Calorie Bar Chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>📊 7-Day Caloric Trajectory vs. Target</h3>
        {weekly.every(d => d.calories === 0) ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No food logged this week yet. <a href="/detect" style={{ color: 'var(--accent-green)' }}>Add your first meal!</a>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weekly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#8892a4', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#8892a4', fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={targetCal} stroke="rgba(251,146,60,0.6)" strokeDasharray="6 3" label={{ value: 'Target', fill: '#fb923c', fontSize: 12, position: 'right' }} />
              <Bar dataKey="calories" name="Calories" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
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
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>🥩 Weekly Macronutrient Distribution</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weekly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: '#8892a4', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#8892a4', fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '1rem', fontSize: '0.8rem' }} />
            <Bar dataKey="protein" name="Protein" fill="#4f9bf8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="carbs"   name="Carbs"   fill="#fb923c" radius={[4, 4, 0, 0]} />
            <Bar dataKey="fat"     name="Fat"     fill="#a78bfa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weight tracking */}
      <div className="grid-2">
        {/* Add weight form */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>⚖️ Log Body Weight</h3>
          <form onSubmit={handleAddWeight} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                placeholder="e.g. 72.5"
                value={weightForm.weight}
                onChange={e => setWeightForm(f => ({ ...f, weight: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input
                className="form-input"
                placeholder="e.g. Fasted morning weigh-in"
                value={weightForm.note}
                onChange={e => setWeightForm(f => ({ ...f, note: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={addingW}>
              {addingW ? <span className="spinner" /> : <><FiPlus /> Log Weight</>}
            </button>
          </form>
        </div>

        {/* Weight history + sparkline */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>📉 Weight History & Trend</h3>
          {weights.length > 1 && (
            <ResponsiveContainer width="100%" height={120} style={{ marginBottom: '1rem' }}>
              <LineChart data={weights}>
                <XAxis dataKey="createdAt" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip formatter={(v) => [`${v} kg`, 'Weight']} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8rem' }} />
                <Line type="monotone" dataKey="weight" stroke="#63da8a" strokeWidth={2} dot={{ r: 3, fill: '#63da8a' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {weights.length === 0 ? (
            <p style={{ fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>No weight entries recorded yet!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
              {[...weights].reverse().map(w => (
                <div key={w._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.875rem' }}>
                  <div>
                    <strong style={{ color: 'var(--accent-green)' }}>{w.weight} kg</strong>
                    {w.note && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.78rem' }}>{w.note}</span>}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(w.createdAt).toLocaleDateString()}</div>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => handleDeleteWeight(w._id)}
                    disabled={deletingW === w._id}
                  >
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
