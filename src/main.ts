import './generated/tokens.css';
import './css/base.css';
import './css/concepts.css';
import './css/components.css';
import { SiteDS } from './behaviors/site';
import { loadEnhancements } from './behaviors/enhancements';

function boot(): void {
  void loadEnhancements(document, window, SiteDS);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();