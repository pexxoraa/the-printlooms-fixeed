/**
 * app.js
 * ----------------------------------------------------------------------------
 * Bootstraps chrome shared by every page: sticky header, footer, scroll
 * reveal animations, back-to-top button, and homepage category strip loading.
 * ----------------------------------------------------------------------------
 */

import { renderNavbar } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { router } from './router.js';
import { api } from './services/api.js';

export async function initApp() {
  const headerRoot = document.getElementById('site-header');
  const footerRoot = document.getElementById('site-footer');

  if (headerRoot) {
    await renderNavbar(headerRoot);
    router.highlightActiveNav(headerRoot);
  }
  if (footerRoot) await renderFooter(footerRoot);

  initScrollReveal();
  initBackToTop();
  initWhatsAppButton();
  initCategoryStrip(); // Loads and renders the Shop by Category section
}

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  const observeAll = () => {
    document.querySelectorAll('.reveal:not(.is-visible)').forEach((el, i) => {
      el.style.setProperty('--stagger-index', i % 8);
      observer.observe(el);
    });
  };

  observeAll();
  // Re-scan whenever components inject new content (e.g. product grids).
  window.addEventListener('reveal:refresh', observeAll);
}

function initBackToTop() {
  let btn = document.getElementById('back-to-top');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.textContent = '↑';
    document.body.appendChild(btn);
  }
  window.addEventListener('scroll', () => {
    btn.classList.toggle('is-visible', window.scrollY > 480);
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

async function initWhatsAppButton() {
  if (document.getElementById('whatsapp-fab')) return;
  let settings = {};
  try { settings = await api.getSettings(); } catch { /* falls back below */ }
  
  const whatsapp = settings?.brand?.supportWhatsapp || '919030621467';
  const link = `https://wa.me/${whatsapp}?text=${encodeURIComponent('Hi! I would like to place an order from The Print Loom.')}`;

  const btn = document.createElement('a');
  btn.id = 'whatsapp-fab';
  btn.href = link;
  btn.target = '_blank';
  btn.rel = 'noopener';
  btn.setAttribute('aria-label', 'Order on WhatsApp');
  btn.className = 'back-to-top is-visible';
  btn.style.cssText = 'right:var(--space-6);left:auto;bottom:var(--space-6);background:#25D366;';
  btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.2-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5C10.9 8.4 10.5 7.4 10.3 7c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.1.2 2 3 4.8 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.3L2 22l4.8-1.5C8.3 21.5 10.1 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.7 0-3.3-.5-4.7-1.3l-.3-.2-3.1.9.9-3.2-.2-.3C3.7 14.3 3.2 12.7 3.2 11 3.2 6.1 7.1 2.2 12 2.2S20.8 6.1 20.8 11 16.9 20.2 12 20.2z"/></svg>';
  document.body.appendChild(btn);
}

/**
 * Automatically fetches category data and populates the homepage category strip.
 */
async function initCategoryStrip() {
  const strip = document.getElementById('category-strip');
  if (!strip) return;

  try {
    const response = await fetch('data/categories.json');
    const data = await response.json();
    
    if (data.categories && Array.isArray(data.categories)) {
      strip.innerHTML = data.categories.map(cat => `
        <a href="pages/collections/index.html?category=${cat.slug}" class="category-card">
          <img src="${cat.image}" alt="${cat.name}">
          <h3>${cat.name}</h3>
        </a>
      `).join('');
      
      window.dispatchEvent(new Event('reveal:refresh'));
    }
  } catch (error) {
    console.error("Failed to load categories:", error);
  }
}

/**
 * Stock UI Handler
 * Evaluates product stock and updates the UI accordingly.
 */
export function updateStockUI(product) {
  const stockBadge = document.querySelector('.stock-status'); 
  const addToCartBtn = document.querySelector('.add-to-cart-btn'); 
  const buyNowBtn = document.querySelector('.buy-now-btn');

  if (!stockBadge || !addToCartBtn || !buyNowBtn) return;

  if (product.stock > 0) {
      stockBadge.innerText = `In Stock (${product.stock} left)`;
      stockBadge.style.color = 'green'; 
      addToCartBtn.disabled = false;
      buyNowBtn.disabled = false;
      addToCartBtn.innerText = "Add to Cart";
      buyNowBtn.innerText = "Buy Now";
  } else {
      stockBadge.innerText = `Out of Stock`;
      stockBadge.style.color = 'red'; 
      addToCartBtn.disabled = true;
      buyNowBtn.disabled = true;
      addToCartBtn.innerText = "Unavailable";
      buyNowBtn.innerText = "Unavailable";
  }
}

// Auto-run on every page as soon as this module is imported.
initApp();
