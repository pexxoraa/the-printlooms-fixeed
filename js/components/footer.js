/**
 * footer.js
 * ----------------------------------------------------------------------------
 * Renders the shared footer into #site-footer.
 * ----------------------------------------------------------------------------
 */

import { CONFIG } from '../services/config.js';
import { api } from '../services/api.js';

export async function renderFooter(root) {
  const year = new Date().getFullYear();
  let settings = {};
  
  try { 
    settings = await api.getSettings(); 
  } catch { 
    /* falls back below */ 
  }
  
  const instagram = settings?.social?.instagram || 'https://instagram.com/the_print_loom';
  const instagramHandle = settings?.social?.instagramHandle || '@the_print_loom';
  const whatsapp = settings?.brand?.supportWhatsapp || '919030621457';
  const whatsappLink = `https://wa.me/${whatsapp}?text=${encodeURIComponent('Hi! I would like to place an order from The Print Loom.')}`;

  root.innerHTML = `
    <footer class="site-footer" style="background-color: var(--color-maroon); color: var(--color-ivory); padding: var(--space-8) 0 var(--space-4); margin-top: var(--space-12);">
      <div class="container">
        <!-- Main 3-Column Grid -->
        <div class="grid grid-3" style="gap: var(--space-8); align-items: flex-start;">
          
          <!-- Column 1: Brand & Socials -->
          <div style="max-width: 300px;">
            <h2 style="font-family: var(--font-display); font-size: 2rem; color: var(--color-gold-light); margin-bottom: var(--space-3); font-weight: 500; letter-spacing: 0.5px;">
              The Print Loom
            </h2>
            <p style="color: rgba(246, 236, 228, 0.8); line-height: 1.7; font-size: 0.95rem;">
              Premium digital print sarees crafted for the modern Indian woman. Handloom soul, digital precision.
            </p>
            <div style="margin-top: var(--space-5); display: flex; flex-direction: column; gap: 12px;">
              <a href="${instagram}" target="_blank" rel="noopener" aria-label="Instagram" style="color: var(--color-gold-light); text-decoration: none; font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Instagram ${instagramHandle} ↗
              </a>
              <a href="${whatsappLink}" target="_blank" rel="noopener" aria-label="Order on WhatsApp" style="color: var(--color-gold-light); text-decoration: none; font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Order on WhatsApp ↗
              </a>
            </div>
          </div>

          <!-- Column 2: Shop Links -->
          <div>
            <h4 style="color: var(--color-ivory); font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; font-size: 0.85rem; margin-bottom: var(--space-5);">
              Shop
            </h4>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px;">
              <li><a href="${CONFIG.ROUTES.collections}?category=cat-silk" style="color: rgba(246, 236, 228, 0.7); text-decoration: none; font-size: 0.95rem; transition: color 0.2s;">Digital Silk Sarees</a></li>
              <li><a href="${CONFIG.ROUTES.collections}?category=cat-georgette" style="color: rgba(246, 236, 228, 0.7); text-decoration: none; font-size: 0.95rem; transition: color 0.2s;">Georgette Sarees</a></li>
              <li><a href="${CONFIG.ROUTES.collections}?category=cat-bridal" style="color: rgba(246, 236, 228, 0.7); text-decoration: none; font-size: 0.95rem; transition: color 0.2s;">Bridal Edit</a></li>
              <li><a href="${CONFIG.ROUTES.collections}" style="color: rgba(246, 236, 228, 0.7); text-decoration: none; font-size: 0.95rem; transition: color 0.2s;">All Collections</a></li>
            </ul>
          </div>

          <!-- Column 3: Company Links -->
          <div>
            <h4 style="color: var(--color-ivory); font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; font-size: 0.85rem; margin-bottom: var(--space-5);">
              Company
            </h4>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px;">
              <li><a href="${CONFIG.ROUTES.about}" style="color: rgba(246, 236, 228, 0.7); text-decoration: none; font-size: 0.95rem; transition: color 0.2s;">About Us</a></li>
              <li><a href="${CONFIG.ROUTES.contact}" style="color: rgba(246, 236, 228, 0.7); text-decoration: none; font-size: 0.95rem; transition: color 0.2s;">Contact</a></li>
              <li><a href="${CONFIG.ROUTES.profile}" style="color: rgba(246, 236, 228, 0.7); text-decoration: none; font-size: 0.95rem; transition: color 0.2s;">Track Order</a></li>
            </ul>
          </div>

        </div>

        <!-- Gold Zari Divider -->
        <div style="height: 1px; background: linear-gradient(90deg, rgba(212, 175, 55, 0.1), rgba(212, 175, 55, 0.5), rgba(212, 175, 55, 0.1)); margin: var(--space-8) 0 var(--space-5);"></div>

        <!-- Footer Bottom -->
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--space-4);">
          <p style="color: rgba(246, 236, 228, 0.5); font-size: 0.85rem; margin: 0;">
            © ${year} The Print Loom. Built by <a href="https://pexxoraa.github.io/PEXXORAA" target="_blank" rel="noopener" style="text-decoration: underline; color: inherit;">Pexxoraa</a>. All rights reserved.
          </p>
          <p style="color: rgba(246, 236, 228, 0.5); font-size: 0.85rem; margin: 0;">
            Guest checkout · Pay directly via UPI · No gateway fees
          </p>
        </div>
      </div>
    </footer>
  `;
}
