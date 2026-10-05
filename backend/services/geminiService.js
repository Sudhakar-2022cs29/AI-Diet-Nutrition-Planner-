// Gemini AI service — Multimodal vision for food plate scanning & contextual nutrition chat
// Falls back to the local rule-based nutrition engine whenever no usable API key is set,
// so the coach always returns context-aware answers instead of a canned string.
const { GoogleGenAI } = require('@google/genai');
const { answerLocally } = require('./localNutritionist');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let aiClient = null;

const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_')) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

/**
 * Analyzes a food plate image using Gemini Vision API
 * @param {string} base64Data - Raw or data URL base64 image
 * @param {string} mimeType - Image mime type
 */
const analyzeFoodImage = async (base64Data, mimeType = 'image/jpeg', mealContext = null, dietaryRestrictions = []) => {
  // Strip data:image/...;base64, prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

  const client = getAIClient();

  if (client) {
    try {
      const mealLine = mealContext
        ? `This photo is of a ${mealContext}. Weight portions accordingly (a breakfast bowl is smaller than a dinner plate).`
        : '';

      const restrictionLine = dietaryRestrictions.length
        ? `\n\nThe user follows these dietary restrictions: ${dietaryRestrictions.join(', ')}.
Flag any item that conflicts with them in healthInsights, and put a compliant alternative in "alternatives".`
        : '';

      const prompt = `You are an expert AI clinical nutritionist and food vision analyzer.
Analyze the meal in this photo accurately. Identify all food items, estimate portions in grams, and compute nutritional facts.
${mealLine}
Respond ONLY with a valid JSON object matching this schema:
{
  "foodName": "Overall descriptive meal name (e.g. Grilled Salmon with Brown Rice and Broccoli)",
  "serving": "Total estimated weight (e.g. 350g)",
  "calories": 520,
  "protein": 42,
  "carbs": 48,
  "fat": 14,
  "fiber": 6,
  "confidence": 0.94,
  "healthRating": "healthy",
  "items": [
    { "name": "Grilled Salmon", "weight": "150g", "calories": 310, "protein": 34, "carbs": 0, "fat": 18 },
    { "name": "Brown Rice", "weight": "120g", "calories": 150, "protein": 3, "carbs": 32, "fat": 1 },
    { "name": "Steamed Broccoli", "weight": "80g", "calories": 60, "protein": 5, "carbs": 12, "fat": 0.5 }
  ],
  "healthInsights": "High in lean protein and heart-healthy Omega-3 fatty acids. Complex carbohydrates provide sustained energy.",
  "alternatives": ["Add a squeeze of fresh lemon for vitamin C", "Substitute quinoa for even higher fiber content"]
}${restrictionLine}`;

      const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || 'image/jpeg'
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text;
      const parsed = JSON.parse(responseText);
      parsed.source = 'Gemini 2.5 Vision AI';
      return parsed;
    } catch (error) {
      console.warn('Gemini Vision API error, falling back to built-in estimate:', error.message);
    }
  }

  // Static estimate used when no API key is set or vision is unavailable. It is labelled
  // as an estimate so the UI never presents it as a real scan.
  return {
    foodName: 'Avocado Toast with Poached Eggs & Cherry Tomatoes',
    serving: '280g',
    calories: 420,
    protein: 18,
    carbs: 34,
    fat: 22,
    fiber: 8,
    confidence: 0.91,
    healthRating: 'healthy',
    items: [
      { name: 'Sourdough Bread (2 slices)', weight: '90g', calories: 180, protein: 6, carbs: 32, fat: 1 },
      { name: 'Poached Eggs (2 large)', weight: '100g', calories: 144, protein: 12, carbs: 1, fat: 10 },
      { name: 'Mashed Avocado', weight: '60g', calories: 96, protein: 1, carbs: 5, fat: 9 },
      { name: 'Cherry Tomatoes', weight: '30g', calories: 10, protein: 0.5, carbs: 2, fat: 0 }
    ],
    healthInsights: 'Excellent balance of healthy monounsaturated fats from avocado and high biological value complete protein from eggs.',
    alternatives: ['Sprinkle hemp seeds for extra omega-3', 'Use sprouted grain bread for lower glycemic index'],
    provider: 'built_in_estimate',
    source: client
      ? `${MODEL_NAME} Vision AI (unavailable - showing built-in estimate)`
      : 'Built-in Estimate (set GEMINI_API_KEY in backend/.env for live vision)'
  };
};

/**
 * Normalises stored history entries into Gemini turns, dropping empties and collapsing
 * consecutive same-role turns (the API rejects two user turns in a row).
 */
const buildHistoryTurns = (history) => {
  const turns = history
    .map((h) => {
      const role = h.role === 'assistant' || h.role === 'model' ? 'model' : 'user';
      const raw = Array.isArray(h.parts) ? h.parts[0]?.text : (typeof h.parts === 'string' ? h.parts : h.content);
      return { role, text: typeof raw === 'string' ? raw.trim() : '' };
    })
    .filter((turn) => turn.text.length > 0);

  return turns.reduce((acc, turn) => {
    const last = acc[acc.length - 1];
    if (last && last.role === turn.role) {
      last.text += `\n${turn.text}`;
      return acc;
    }
    acc.push({ ...turn });
    return acc;
  }, []);
};

/**
 * Generates context-aware nutrition advice based on user stats and today's logs
 */
const chatWithNutritionist = async (userContext, message, history = []) => {
  const client = getAIClient();

  const restrictions = userContext.dietaryRestrictions || [];
  const restrictionLine = restrictions.length
    ? `\n- Dietary restrictions: ${restrictions.join(', ')}. NEVER recommend anything that conflicts with these. If a request conflicts, say so plainly and offer the nearest compliant option.`
    : '';

  const systemInstruction = `You are "Aura", a world-class AI Clinical Dietitian and Sports Nutritionist.
User Profile:
- Name: ${userContext.name || 'User'}
- Goal: ${userContext.goalLabel || userContext.goal || 'maintenance'}
- Current Weight: ${userContext.weight || 70} kg, Height: ${userContext.height || 170} cm, Age: ${userContext.age || 25}
- Activity Level: ${userContext.activityLabel || userContext.activityLevel || 'moderate'}
- Daily Target: ${userContext.targetCalories || 2000} kcal (Protein: ${userContext.proteinTarget || 120}g, Carbs: ${userContext.carbsTarget || 200}g, Fat: ${userContext.fatTarget || 60}g)
- Today's Consumed: ${userContext.consumedCalories || 0} kcal (Protein: ${userContext.consumedProtein || 0}g, Carbs: ${userContext.consumedCarbs || 0}g, Fat: ${userContext.consumedFat || 0}g)
- Remaining Calories: ${Math.max(0, (userContext.targetCalories || 2000) - (userContext.consumedCalories || 0))} kcal${restrictionLine}

Style:
- Be encouraging, science-backed, and direct.
- Use Markdown: headings (##), bullet lists, and **bold** for numbers. Keep it scannable.
- Keep responses concise (2-4 short paragraphs or a short bullet list).
- Provide practical meal ideas and specific macronutrient numbers.
- Reference the user's actual logged food and remaining calories when relevant rather than giving generic advice.
- If asked about a diet style (keto, low carb, Mediterranean, vegetarian, vegan, intermittent fasting, high protein, balanced), explain how it shifts their macros and whether it suits their goal.`;

if (client) {
    try {
      const turns = buildHistoryTurns(history.slice(-12));

      // The final turn must be a user turn so the model always has something to answer
      if (!turns.length || turns[turns.length - 1].role !== 'user') {
        turns.push({ role: 'user', text: message });
      }

      const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents: turns.map(({ role, text }) => ({ role, parts: [{ text }] })),
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      });

      const reply = typeof response.text === 'string' ? response.text.trim() : '';

      if (!reply) throw new Error('Gemini returned an empty response');

      return {
        reply,
        source: `Gemini ${MODEL_NAME}`,
        provider: 'gemini'
      };
    } catch (err) {
      console.warn('Gemini Chat error, using local nutrition engine:', err.message);
    }
  }

  // Local rule-based engine — always available, always uses the user's real context
  const result = answerLocally({ ...userContext, lastMessage: message });
  return { ...result, provider: client ? 'local_fallback' : 'local' };
};

module.exports = {
  analyzeFoodImage,
  chatWithNutritionist
};

