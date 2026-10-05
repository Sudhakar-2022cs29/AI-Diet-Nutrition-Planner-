// AICoach — Interactive AI Clinical Dietitian & Nutritionist powered by Gemini
import { useState, useRef, useEffect, useCallback } from 'react';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiSend, FiCpu, FiUser, FiZap, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'sonner';
import Markdown from '../components/Markdown';

const ACTIVITY_LABELS = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Very active',
  very_active: 'Athlete level'
};

const GOAL_LABELS = {
  weight_loss: 'Weight loss',
  maintenance: 'Maintenance',
  weight_gain: 'Weight gain'
};

const buildGreeting = (user) => {
  const name = user?.name?.split(' ')[0] || 'there';
  const goal = GOAL_LABELS[user?.goal] || 'maintenance';
  const restrictions = user?.dietaryRestrictions || [];

  const restrictionNote = restrictions.length
    ? `\n\nI'm filtering my recommendations for: **${restrictions.join(', ')}**.`
    : '';

  return `Hello ${name}! 👋 I'm **Aura**, your AI clinical dietitian and sports nutritionist.

I'm working from your profile right now: a **${goal}** goal, ${user?.weight ?? '—'} kg, ${user?.activityLevel ? (ACTIVITY_LABELS[user.activityLevel] || user.activityLevel) : 'moderate'} activity, and everything you've logged today.${restrictionNote}

Ask me to review your macros, build a meal that fits your remaining calories, swap out an ingredient, or explain how a diet style like keto or Mediterranean would change your numbers.`;
};

export default function AICoach() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      content: buildGreeting(user),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const quickPrompts = [
    '📊 Review my macronutrient balance today',
    '🍗 Give me a 40g protein dinner under 550 kcal',
    '🥑 What are healthy fat swaps for butter?',
    '⚡ Best pre-workout snack 45 mins before training',
    '🌙 Healthy late-night snack that won\'t spike insulin',
    '🥑 How would keto change my macros?',
    '💧 How much water should I drink today?'
  ];

  const handleSend = async (messageToSend) => {
    const text = (messageToSend || input).trim();
    if (!text || loading) return;

    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage = { role: 'user', content: text, timestamp: stamp };

    // Build history from the current messages plus the new one, so the model sees the
    // question that produced the reply it is answering.
    const historyPayload = [...messages, userMessage]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await aiAPI.chat({ message: text, history: historyPayload });

      const reply = data.reply || data.content || data.message;

      if (!reply) {
        throw new Error('The coach returned an empty response.');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          source: data.source,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      const detail = err.response?.data?.message || err.message;
      toast.error(detail || 'Failed to get an AI response. Please try again.');

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Something went wrong reaching the nutrition service: ${detail || 'unknown error'}. Please try again.`,
          source: 'Error',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Chat session refreshed! What would you like to discuss next, ${user?.name?.split(' ')[0] || 'there'}?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    toast.info('Chat history cleared');
  };

  const activityLabel = ACTIVITY_LABELS[user?.activityLevel] || user?.activityLevel || 'Not set';

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>
            🤖 <span style={{ background: 'var(--gradient-main)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI Nutrition Coach</span>
          </h1>
          <p>Personalized clinical dietitian guidance based on your profile and today's logs</p>
        </div>
        <button className="btn btn-secondary" onClick={clearChat} title="Reset Conversation">
          <FiRefreshCw /> Reset Chat
        </button>
      </div>

      {/* Context pill banner */}
      <div className="card" style={{ padding: '0.875rem 1.25rem', marginBottom: '1.25rem', background: 'rgba(99, 218, 138, 0.05)', border: '1px solid rgba(99, 218, 138, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-green)', fontWeight: 600 }}>
            <FiZap /> Active Context:
          </span>
          <span>Goal: <strong>{GOAL_LABELS[user?.goal] || user?.goal || 'Not set'}</strong></span>
          <span>•</span>
          <span>Weight: <strong>{user?.weight ?? '—'} kg</strong></span>
          <span>•</span>
          <span>Activity: <strong>{activityLabel}</strong></span>
          {user?.dietaryRestrictions?.length > 0 && (
            <>
              <span>•</span>
              <span>Restrictions: <strong>{user.dietaryRestrictions.join(', ')}</strong></span>
            </>
          )}
          <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Gemini 2.5 Flash · Local fallback</span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '620px', padding: 0, overflow: 'hidden' }}>
        {/* Messages scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={`${idx}-${m.timestamp}`}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                {!isUser && (
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0
                  }}>
                    <FiCpu />
                  </div>
                )}
                <div>
                  <div
                    style={{
                      background: isUser ? 'var(--gradient-main)' : 'rgba(255, 255, 255, 0.05)',
                      color: isUser ? '#0f172a' : 'var(--text-primary)',
                      fontWeight: isUser ? 500 : 400,
                      padding: '1rem 1.25rem',
                      borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      border: isUser ? 'none' : '1px solid var(--border-color)',
                      lineHeight: 1.6,
                      fontSize: '0.92rem',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    {isUser ? m.content : <Markdown>{m.content}</Markdown>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem', textAlign: isUser ? 'right' : 'left' }}>
                    {m.timestamp} {m.source && `• ${m.source}`}
                  </div>
                </div>
                {isUser && (
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', flexShrink: 0
                  }}>
                    <FiUser />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', gap: '0.75rem', alignSelf: 'flex-start', alignItems: 'center' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0
              }}>
                <FiCpu />
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.75rem 1.25rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="spinner" style={{ width: '16px', height: '16px' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Aura is checking your biometrics &amp; today's logs...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick prompt chips */}
        <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={() => handleSend(p)}
              disabled={loading}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
          >
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder="Ask Aura anything about your nutrition, meal recipes, or fitness goals..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !input.trim()}
              style={{ padding: '0.75rem 1.25rem' }}
            >
              {loading ? <span className="spinner" /> : <><FiSend /> Ask</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}