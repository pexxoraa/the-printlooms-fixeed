/**
 * products.js
 */

import { api } from './api.js';
import { CONFIG, resolvePath } from './config.js';

let _cache = null;
let _categories = null;

async function loadCatalog() {
  // Only fetch from the API/JSON once
  if (!_cache) {
    try {
      _cache = await api.getProducts();
      if (!_cache) _cache = [];
    } catch (err) {
      console.error('Error loading catalog:', err);
      _cache = [];
    }
  }

  // INTERCEPTOR: Dynamically reduce stock based on local purchases
  return _cache.map(p => {
    const deductKey = `ploom_stock_deduct_${p.id}`;
    const deductedAmount = parseInt(localStorage.getItem(deductKey) || '0');
    
    // Default to 10 if stock isn't explicitly set in your JSON
    const originalStock = typeof p.stock === 'number' ? p.stock : 10;
    let currentStock = originalStock - deductedAmount;

    // AUTO-RESET: If stock hits 0 (or below), wipe the memory and reset to original
    if (currentStock <= 0) {
      currentStock = originalStock;
      localStorage.removeItem(deductKey);
    }

    // Return the product with the newly calculated live stock
    return { ...p, stock: currentStock };
  });
}

async function loadCategories() {
  if (_categories) return _categories;
  
  const pathsToTry = [
    CONFIG?.DATA?.categories,
    resolvePath('data/categories.json'),
    '/the-printlooms-fixeed/data/categories.json',
    './data/categories.json',
    'data/categories.json'
  ].filter(Boolean);

  for (const categoriesUrl of pathsToTry) {
    try {
      const res = await fetch(categoriesUrl);
      if (res.ok) {
        const json = await res.json();
        _categories = Array.isArray(json) ? json : (json.categories || []);
        if (_categories.length > 0) return _categories;
      }
    } catch (err) {
      // Continue to next fallback path
    }
  }
  return [];
}

export const products = {
  
  // NEW: Method to record a stock deduction when a purchase happens
  reduceStock(cartItems) {
    cartItems.forEach(item => {
      const key = `ploom_stock_deduct_${item.productId}`;
      const currentDeducted = parseInt(localStorage.getItem(key) || '0');
      localStorage.setItem(key, currentDeducted + item.quantity);
    });
  },

  async all() {
    return loadCatalog();
  },

  async categories() {
    return loadCategories();
  },

  async getBySlug(slug) {
    const list = await loadCatalog();
    return list.find((p) => p.slug === slug) || null;
  },

  async getById(id) {
    const list = await loadCatalog();
    return list.find((p) => p.id === id) || null;
  },

  async featured(limit = 8) {
    const list = await loadCatalog();
    return list.filter((p) => p.featured).slice(0, limit);
  },

  async byTag(tag, limit = 8) {
    const list = await loadCatalog();
    return list.filter((p) => p.tags?.includes(tag)).slice(0, limit);
  },

  async byCategory(categoryId) {
    const list = await loadCatalog();
    return list.filter((p) => p.category === categoryId);
  },

  async related(product, limit = 4) {
    if (!product) return [];
    const list = await loadCatalog();
    return list
      .filter((p) => p.id !== product.id && p.category === product.category)
      .slice(0, limit);
  },

  async search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const list = await loadCatalog();
    return list.filter((p) => {
      const haystack = [p.name, p.fabric, p.description, ...(p.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  },

  filter(list = [], { categories = [], minPrice, maxPrice, fabrics = [] } = {}) {
    return list.filter((p) => {
      const finalPrice = products.finalPrice(p);
      if (categories.length && !categories.includes(p.category)) return false;
      if (fabrics.length && !fabrics.includes(p.fabric)) return false;
      if (typeof minPrice === 'number' && finalPrice < minPrice) return false;
      if (typeof maxPrice === 'number' && finalPrice > maxPrice) return false;
      return true;
    });
  },

  sort(list = [], mode) {
    const arr = [...(list || [])];
    switch (mode) {
      case 'price-asc': return arr.sort((a, b) => products.finalPrice(a) - products.finalPrice(b));
      case 'price-desc': return arr.sort((a, b) => products.finalPrice(b) - products.finalPrice(a));
      case 'rating': return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'newest': return arr.reverse();
      default: return arr;
    }
  },

  finalPrice(product) {
    if (!product || typeof product.price !== 'number') return 0;
    const discount = product.discount || 0;
    return Math.round(product.price * (1 - discount / 100));
  },
};
