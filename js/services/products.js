/**
 * products.js
 */

import { api } from './api.js';
import { CONFIG, resolvePath } from './config.js';

let _cache = null;
let _categories = null;

async function loadCatalog() {
  if (_cache) return _cache;
  try {
    _cache = await api.getProducts();
    return _cache || [];
  } catch (err) {
    console.error('Error loading catalog:', err);
    return [];
  }
}

async function loadCategories() {
  if (_categories) return _categories;
  
  // Try multiple fallback paths to ensure it resolves on GitHub Pages subfolders and local dev
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

  console.error('Error loading categories: All fallback paths failed.');
  return [];
}

export const products = {
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
