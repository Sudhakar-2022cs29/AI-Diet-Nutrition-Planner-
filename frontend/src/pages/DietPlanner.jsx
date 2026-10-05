// DietPlanner — energy/macro targets plus a selectable named diet style plan
import { useState, useEffect, useCallback } from 'react';
import { dietAPI } from '../services/api';
import { FiDroplet, FiCheck, FiRefreshCw } from 'react-icons/fi';

const GOAL_INFO = {
  weight_loss: { emoji: '🔥', color: 'var(--accent-red)', tip: 'A daily deficit of ~500 kcal supports roughly 0.5kg of fat loss per week' },
  maintenance: { emoji: '⚖️', color: 'var(--accent-blue)', tip: 'Eating at your TDEE keeps your current weight stable' },
  weight_gain: { emoji: '💪', color: 'var(--accent-green)', tip: 'A 500 kcal surplus supports lean mass gain at about 0.5kg per week' },
};

const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snacks: '🍎' };

const formatNumber = (value) => (Number.isFinite(value) ? value.toLocaleString() : '—');

export default function DietPlanner() {
  const [rec, setRec] = useState(null);
  const [style, setStyle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');

  // Initial load: state is already "loading", so this only touches state from the
  // promise callbacks (never synchronously inside the effect body)
  useEffect(() => {
    let active = true;

    dietAPI
      .getRecommendation()
      .then(({ data }) => {
        if (!active) return;
        setRec(data);
        setStyle(data.selectedStyle);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || 'Failed to load recommendations');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Style switching is user-initiated, so setting state up front is fine here
  const switchStyle = useCallback((nextStyle) => {
    setSwitching(true);
    dietAPI
      .getRecommendation(nextStyle)
      .then(({ data }) => {
        setRec(data);
        setStyle(data.selectedStyle);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load recommendations'))
      .finally(() => setSwitching(false));
  }, []);

  if (loading) return <div className="loading-wrapper" style={{ paddingTop: '4rem' }}><span className="spinner spinner-lg" /><span>Calculating your plan...</span></div>;
  if (error) return <div className="page-wrapper"><div className="alert alert-error">{error}</div></div>;
  if (!rec) return <div className="page-wrapper"><div className="alert alert-error">No recommendation data returned.</div></div>;

  const info = GOAL_INFO[rec.goal] || GOAL_INFO.maintenance;
  const plan = rec.plan || {};
  const macros = plan.macros || rec.macros || {};
  const split = plan.macroSplit || {};
  const styles = rec.availableStyles || [];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1><span style={{ background: 'var(--gradient-main)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Diet Planner</span> 🥑</h1>
        <p>Personalized calorie targets and a meal plan matched to your goal</p>
      </div>

      {/* Goal banner */}
      <div className="card card-highlight" style={{ marginBottom: '1.5rem', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{info.emoji}</div>
        <h2 style={{ color: info.color, marginBottom: '0.5rem' }}>{rec.goalDescription}</h2>
        <p style={{ fontSize: '0.9rem' }}>{info.tip}</p>
      </div>

      {/* Key numbers */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'BMR (at rest)', value: rec.bmr, unit: 'kcal/day', sub: 'Minimum calories to stay alive', color: 'var(--accent-purple)' },
          { label: 'TDEE (maintenance)', value: rec.tdee, unit: 'kcal/day', sub: 'Calories burned with activity', color: 'var(--accent-blue)' },
          { label: 'Daily Target', value: rec.targetCalories, unit: 'kcal/day', sub: 'Your personalised goal', color: 'var(--accent-green)' },
        ].map((m) => (
          <div className="card" key={m.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: m.color }}>{formatNumber(m.value)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.15rem 0' }}>{m.unit}</div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{m.label}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Diet style selector ─────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>🧭 Choose a diet style</h3>
          {switching && <span className="spinner" style={{ width: '16px', height: '16px' }} />}
        </div>
        <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Each style re-scales your macros and swaps in its own meal library. The suggestion below
          is picked from your goal and dietary restrictions — override it freely.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '0.75rem' }}>
          {styles.map((s) => {
            const isActive = s.key === style;
            const isSuggested = s.key === rec.suggestedStyle;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => s.key !== style && switchStyle(s.key)}
                disabled={switching}
                style={{
                  textAlign: 'left',
                  cursor: switching ? 'wait' : 'pointer',
                  padding: '0.9rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'rgba(99,218,138,0.12)' : 'rgba(255,255,255,0.04)',
                  border: isActive ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                    {s.emoji} {s.name}
                  </span>
                  {isActive && <FiCheck style={{ color: 'var(--accent-green)' }} />}
                  {!isActive && isSuggested && (
                    <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Suggested</span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{s.tagline}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Selected style plan ─────────────────────────────── */}
      {plan.name && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>{plan.emoji} {plan.name}</h3>
            <span className="badge badge-green">{formatNumber(plan.calories)} kcal / day</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>{plan.description}</p>

          <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
            {[
              { label: 'Protein', value: macros.protein, unit: 'g', color: 'var(--accent-blue)', tip: 'Builds & repairs muscle' },
              { label: 'Carbs', value: macros.carbs, unit: 'g', color: 'var(--accent-orange)', tip: 'Primary energy source' },
              { label: 'Fat', value: macros.fat, unit: 'g', color: 'var(--accent-purple)', tip: 'Hormones & brain health' },
            ].map((m) => (
              <div key={m.label} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {split[m.label.toLowerCase()] !== undefined ? `${split[m.label.toLowerCase()]}% of calories` : ''}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: m.color }}>
                  {formatNumber(m.value)}<span style={{ fontSize: '1rem' }}>{m.unit}</span>
                </div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{m.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{m.tip}</div>
              </div>
            ))}
          </div>

          {(plan.focus?.length > 0 || plan.avoid?.length > 0) && (
            <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
              {plan.focus?.length > 0 && (
                <div style={{ padding: '1rem 1.25rem', background: 'rgba(99,218,138,0.07)', borderRadius: 'var(--radius-md)' }}>
                  <strong style={{ color: 'var(--accent-green)' }}>Prioritise</strong>
                  <ul style={{ listStyle: 'none', margin: '0.5rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {plan.focus.map((f) => (
                      <li key={f} style={{ fontSize: '0.85rem' }}>• {f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {plan.avoid?.length > 0 && (
                <div style={{ padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.07)', borderRadius: 'var(--radius-md)' }}>
                  <strong style={{ color: 'var(--accent-red)' }}>Limit</strong>
                  <ul style={{ listStyle: 'none', margin: '0.5rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {plan.avoid.map((f) => (
                      <li key={f} style={{ fontSize: '0.85rem' }}>• {f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {plan.tips?.length > 0 && (
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(79,155,248,0.08)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
              <strong style={{ color: 'var(--accent-blue)' }}>How to follow it</strong>
              <ul style={{ listStyle: 'none', margin: '0.5rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {plan.tips.map((t) => (
                  <li key={t} style={{ fontSize: '0.85rem' }}>• {t}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Meal library */}
          <h4 style={{ marginBottom: '0.875rem' }}>🍽️ Meal options for this style</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1.25rem' }}>
            {(plan.mealPlan || []).map(({ slot, label, options }) => (
              <div key={slot} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ textTransform: 'capitalize', marginBottom: '0.75rem', color: 'var(--accent-green)' }}>
                  {MEAL_ICONS[slot] || '🍽️'} {label || slot}
                </h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {options.map((item) => (
                    <li key={item.name} style={{ fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--accent-green)', marginTop: '2px' }}>•</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.calories} kcal · {item.protein}g protein
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Baseline macros + hydration */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>🥩 Baseline Daily Macros</h3>
        <p style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          These are your goal-based targets before any diet style adjustment.
        </p>
        <div className="grid-3">
          {[
            { label: 'Protein', value: rec.macros?.protein, unit: 'g', color: 'var(--accent-blue)', tip: 'Builds & repairs muscle', pct: rec.macros?.percentages?.protein },
            { label: 'Carbs', value: rec.macros?.carbs, unit: 'g', color: 'var(--accent-orange)', tip: 'Primary energy source', pct: rec.macros?.percentages?.carbs },
            { label: 'Fat', value: rec.macros?.fat, unit: 'g', color: 'var(--accent-purple)', tip: 'Hormones & brain health', pct: rec.macros?.percentages?.fat },
          ].map((m) => (
            <div key={m.label} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{m.pct}% of calories</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: m.color }}>{formatNumber(m.value)}<span style={{ fontSize: '1rem' }}>{m.unit}</span></div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{m.label}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{m.tip}</div>
              <div className="progress-bar" style={{ marginTop: '0.75rem' }}>
                <div className="progress-fill" style={{ width: `${m.pct || 0}%`, background: m.color }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'rgba(79,155,248,0.08)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FiDroplet style={{ color: 'var(--accent-blue)', fontSize: '1.25rem' }} />
          <div>
            <strong>Daily Hydration Goal:</strong> <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{rec.hydration}L</span> of water
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>~{Math.round(rec.hydration * 4)} glasses (250ml each)</div>
          </div>
        </div>
      </div>

      {style && rec.suggestedStyle !== style && (
        <button type="button" className="btn btn-secondary" onClick={() => switchStyle(rec.suggestedStyle)} disabled={switching}>
          <FiRefreshCw /> Use my suggested style ({styles.find((s) => s.key === rec.suggestedStyle)?.name || rec.suggestedStyle})
        </button>
      )}
    </div>
  );
}