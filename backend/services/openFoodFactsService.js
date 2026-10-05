// OpenFoodFacts service for free global barcode nutritional lookup
const fetch = require('node-fetch');
const cacheService = require('../config/redis');

/**
 * Fetches product nutrition facts by barcode from OpenFoodFacts
 * @param {string} barcode
 */
const lookupBarcode = async (barcode) => {
  const cleanBarcode = barcode.trim();
  const cacheKey = `barcode:${cleanBarcode}`;

  // Check cache first
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AIDietPlanner-MERN-Portfolio/1.0 (contact@example.com)'
      }
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const p = data.product;
    const nutriments = p.nutriments || {};

    const result = {
      barcode: cleanBarcode,
      foodName: p.product_name || p.generic_name || 'Scanned Product',
      brand: p.brands || 'Unknown Brand',
      serving: p.serving_size || '100g',
      calories: Math.round(nutriments['energy-kcal_100g'] || (nutriments['energy_100g'] ? nutriments['energy_100g'] / 4.184 : 0)),
      protein: Math.round(nutriments.proteins_100g || 0),
      carbs: Math.round(nutriments.carbohydrates_100g || 0),
      fat: Math.round(nutriments.fat_100g || 0),
      fiber: Math.round(nutriments.fiber_100g || 0),
      nutriScore: p.nutriscore_grade?.toUpperCase() || 'N/A',
      novaGroup: p.nova_group || null,
      imageUrl: p.image_url || p.image_front_url || null,
      source: 'OpenFoodFacts API'
    };

    // Cache product for 7 days (nutritional facts are static)
    await cacheService.set(cacheKey, result, 7 * 86400);

    return result;
  } catch (error) {
    console.error('OpenFoodFacts API lookup error:', error.message);
    return null;
  }
};

module.exports = {
  lookupBarcode
};

