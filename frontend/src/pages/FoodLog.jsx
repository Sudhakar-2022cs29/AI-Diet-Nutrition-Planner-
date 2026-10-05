// FoodLog — display today's food log with totals and optimistic deletion
import { useState, useEffect } from 'react';
import { foodAPI } from '../services/api';
import { FiTrash2, FiPlus } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const MEAL_COLORS = {
  breakfast: 'badge-orange', lunch: 'badge-blue',
  dinner: 'badge-purple', snack: 'badge-green'
};

export default function FoodLog() {
  const [data, setData] = useState({ logs: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { fetchLog(); }, []);

  const fetchLog = async () => {
    setLoading(true);
    try {
      const { data } = await foodAPI.getTodayLog();
      setData(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load food log');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    const itemToDelete = data.logs.find(l => l._id === id);
    const prevData = { ...data };

    // Optimistic UI update
    setData({
      logs: data.logs.filter(l => l._id !== id),
      totals: {
        calories: Math.max(0, data.totals.calories - (itemToDelete?.calories || 0)),
        protein:  Math.max(0, data.totals.protein - (itemToDelete?.protein || 0)),
        carbs:    Math.max(0, data.totals.carbs - (itemToDelete?.carbs || 0)),
        fat:      Math.max(0, data.totals.fat - (itemToDelete?.fat || 0)),
      }
    });

    try {
      await foodAPI.deleteFoodLog(id);
      toast.success(`Removed ${itemToDelete?.foodName || 'item'} from log`);
    } catch {
      setData(prevData);
      toast.error('Failed to delete food log entry');
    } finally {
      setDeleting(null);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>📋 <span style={{ background: 'var(--gradient-main)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Food Log</span></h1>
          <p>{today}</p>
        </div>
        <Link to="/detect" className="btn btn-primary"><FiPlus /> Add Food</Link>
      </div>

      {/* Today's totals */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Calories', value: Math.round(data.totals.calories), unit: 'kcal', color: 'var(--accent-green)' },
          { label: 'Protein',        value: Math.round(data.totals.protein),  unit: 'g',    color: 'var(--accent-blue)' },
          { label: 'Carbs',          value: Math.round(data.totals.carbs),    unit: 'g',    color: 'var(--accent-orange)' },
          { label: 'Fat',            value: Math.round(data.totals.fat),      unit: 'g',    color: 'var(--accent-purple)' },
        ].map(m => (
          <div className="card" key={m.label} style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: m.color }}>
              {m.value}<span style={{ fontSize: '0.9rem', fontWeight: 400 }}>{m.unit}</span>
            </div>
            <div className="stat-label">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div className="card" style={{ padding: '0' }}>
        {loading ? (
          <div className="loading-wrapper"><span className="spinner spinner-lg" /><span>Loading your food log...</span></div>
        ) : data.logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
            <h3 style={{ marginBottom: '0.5rem' }}>No food logged today</h3>
            <p style={{ marginBottom: '1.5rem' }}>Scan a plate photo or search an item to start tracking!</p>
            <Link to="/detect" className="btn btn-primary"><FiPlus /> Add Your First Meal</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Food Item</th>
                  <th>Meal</th>
                  <th>Source</th>
                  <th>Calories</th>
                  <th>Protein</th>
                  <th>Carbs</th>
                  <th>Fat</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map(log => (
                  <tr key={log._id}>
                    <td>
                      <strong style={{ textTransform: 'capitalize' }}>{log.foodName}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.serving}</div>
                    </td>
                    <td>
                      <span className={`badge ${MEAL_COLORS[log.mealType] || 'badge-blue'}`} style={{ textTransform: 'capitalize' }}>
                        {log.mealType}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {log.source || 'Manual'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{log.calories} kcal</td>
                    <td style={{ color: 'var(--accent-blue)' }}>{log.protein}g</td>
                    <td style={{ color: 'var(--accent-orange)' }}>{log.carbs}g</td>
                    <td style={{ color: 'var(--accent-purple)' }}>{log.fat}g</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => handleDelete(log._id)}
                        disabled={deleting === log._id}
                        title="Delete entry"
                      >
                        {deleting === log._id ? <span className="spinner" /> : <FiTrash2 />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-color)', background: 'rgba(99,218,138,0.04)' }}>
                  <td colSpan="3" style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Daily Total</td>
                  <td style={{ padding: '1rem', color: 'var(--accent-green)', fontWeight: 700 }}>{Math.round(data.totals.calories)} kcal</td>
                  <td style={{ padding: '1rem', color: 'var(--accent-blue)', fontWeight: 600 }}>{Math.round(data.totals.protein)}g</td>
                  <td style={{ padding: '1rem', color: 'var(--accent-orange)', fontWeight: 600 }}>{Math.round(data.totals.carbs)}g</td>
                  <td style={{ padding: '1rem', color: 'var(--accent-purple)', fontWeight: 600 }}>{Math.round(data.totals.fat)}g</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
