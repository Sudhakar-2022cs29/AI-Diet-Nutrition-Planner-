const { z } = require('zod');

// Safe number coercion that gracefully handles empty strings, nulls, and strings from HTML inputs
const optionalNumber = (min, max, fallback) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return fallback;
    const parsed = Number(val);
    return isNaN(parsed) ? fallback : parsed;
  }, z.number().min(min).max(max).default(fallback));

// Authentication schemas
const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  weight: optionalNumber(20, 300, 70),
  height: optionalNumber(50, 280, 170),
  age: optionalNumber(10, 120, 25),
  gender: z.preprocess((v) => v || 'male', z.enum(['male', 'female']).default('male')),
  goal: z.preprocess((v) => v || 'maintenance', z.enum(['weight_loss', 'maintenance', 'weight_gain']).default('maintenance')),
  activityLevel: z.preprocess((v) => v || 'moderate', z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).default('moderate')),
  dietaryRestrictions: z.array(z.string()).optional().default([])
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  weight: optionalNumber(20, 300, 70).optional(),
  height: optionalNumber(50, 280, 170).optional(),
  age: optionalNumber(10, 120, 25).optional(),
  gender: z.enum(['male', 'female']).optional(),
  goal: z.enum(['weight_loss', 'maintenance', 'weight_gain']).optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  dietaryRestrictions: z.array(z.string()).optional()
});

// Food schemas
const foodDetectSchema = z.object({
  foodName: z.string().trim().min(1, 'Food name cannot be empty')
});

const foodLogSchema = z.object({
  foodName: z.string().trim().min(1, 'Food name is required'),
  calories: optionalNumber(0, 10000, 0),
  protein: optionalNumber(0, 1000, 0),
  carbs: optionalNumber(0, 1000, 0),
  fat: optionalNumber(0, 1000, 0),
  fiber: optionalNumber(0, 500, 0),
  serving: z.string().optional().default('100g'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('snack'),
  source: z.string().optional().default('Manual'),
  imageUrl: z.string().nullable().optional(),
  date: z.string().optional()
});

// Weight log schema
const weightLogSchema = z.object({
  weight: optionalNumber(20, 300, 70),
  note: z.string().max(200).optional().default('')
});

// AI schemas
const aiScanSchema = z.object({
  imageBase64: z.string().min(10, 'Valid base64 image data is required'),
  mimeType: z.string().regex(/^image\/(jpeg|jpg|png|webp|heic)$/i, 'Only JPEG, PNG, WEBP, or HEIC images are supported').optional().default('image/jpeg'),
  mealContext: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional()
});

const aiChatSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(4000),
  mealContext: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'model', 'assistant']),
    parts: z.union([z.string(), z.array(z.any())]).optional(),
    content: z.string().optional()
  })).optional().default([])
});

module.exports = {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  foodDetectSchema,
  foodLogSchema,
  weightLogSchema,
  aiScanSchema,
  aiChatSchema
};
