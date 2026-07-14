import { db, doc, collection, onSnapshot } from './firebaseConfig.js';

// Apply images from Firestore configuration to elements on the page
export function applyDynamicImages(images) {
  if (!images) return;

  // 1. Logo (logo.png)
  if (images.logo && images.logo.trim() !== '') {
    const logos = document.querySelectorAll('.brand-logo, img[src="./logo.png"]');
    logos.forEach(logo => {
      logo.src = images.logo;
      logo.removeAttribute('onerror');
    });
  } else {
    const logos = document.querySelectorAll('.brand-logo');
    logos.forEach(logo => {
      logo.src = './logo.png';
    });
  }

  // 2. Favicon (favicon.png)
  // Removed dynamic override as search engines require a fixed favicon.png in code/file structure.

  // 3. Hero Illustration (hero.svg)
  if (images.hero && images.hero.trim() !== '') {
    const heroImg = document.getElementById('hero-svg-img') || document.querySelector('img[src="./hero.svg"]');
    if (heroImg) {
      heroImg.src = images.hero;
      heroImg.removeAttribute('onerror');
    }
  } else {
    const heroImg = document.getElementById('hero-svg-img');
    if (heroImg) {
      heroImg.src = './hero.svg';
    }
  }

  // 4. CEO Portrait (me.png)
  // Removed dynamic override - loaded statically from ./me.png directly.

  // 5. RPG Game Screenshot (img1.png)
  document.querySelectorAll('img[data-game-screenshot="img1"], img[src="./img1.png"], img[alt="RPG & Adventure"], #preview-img1-img').forEach(img1 => {
    if (images.img1 && images.img1.trim() !== '') {
      img1.src = images.img1;
      img1.removeAttribute('onerror');
      img1.style.display = 'block';
      if (img1.nextElementSibling && img1.nextElementSibling.tagName === 'DIV') {
        img1.nextElementSibling.style.display = 'none';
      }
    } else {
      img1.src = './img1.png';
    }
  });

  // 6. Action Game Screenshot (img2.png)
  document.querySelectorAll('img[data-game-screenshot="img2"], img[src="./img2.png"], img[alt="Action & Simulation"], #preview-img2-img').forEach(img2 => {
    if (images.img2 && images.img2.trim() !== '') {
      img2.src = images.img2;
      img2.removeAttribute('onerror');
      img2.style.display = 'block';
      if (img2.nextElementSibling && img2.nextElementSibling.tagName === 'DIV') {
        img2.nextElementSibling.style.display = 'none';
      }
    } else {
      img2.src = './img2.png';
    }
  });

  // 7. Casual Game Screenshot (img3.png)
  document.querySelectorAll('img[data-game-screenshot="img3"], img[src="./img3.png"], img[alt="Casual & 2D"], img[alt="Casual & Mobile"], #preview-img3-img').forEach(img3 => {
    if (images.img3 && images.img3.trim() !== '') {
      img3.src = images.img3;
      img3.removeAttribute('onerror');
      img3.style.display = 'block';
      if (img3.nextElementSibling && img3.nextElementSibling.tagName === 'DIV') {
        img3.nextElementSibling.style.display = 'none';
      }
    } else {
      img3.src = './img3.png';
    }
  });
}

// Global real-time listener for site assets
export function initDynamicBranding() {
  const settingsRef = collection(db, 'settings');
  
  onSnapshot(settingsRef, (snapshot) => {
    const currentImages = {};
    
    // First pass: Process individual modern documents
    snapshot.forEach((docSnap) => {
      const id = docSnap.id;
      if (id.startsWith('image_')) {
        const asset = id.replace('image_', '');
        const data = docSnap.data();
        currentImages[asset] = data.value || '';
      }
    });
    
    // Second pass: Process legacy fallback document if present, without overwriting modern settings
    snapshot.forEach((docSnap) => {
      const id = docSnap.id;
      if (id === 'images') {
        const data = docSnap.data();
        for (const asset in data) {
          if (data[asset] && !currentImages[asset]) {
            currentImages[asset] = data[asset];
          }
        }
      }
    });
    
    applyDynamicImages(currentImages);
  }, (error) => {
    console.warn("Dynamic assets load skipped or cached:", error.message);
  });
}

// Dynamically inject/optimize BreadcrumbList schema on subpages for Google crawlers
export function injectDynamicBreadcrumbs() {
  const baseUrl = "https://polarithweb.github.io";
  const path = window.location.pathname;
  
  let pageName = "";
  let pagePath = "";
  let categoryName = "Services";
  let categoryUrl = `${baseUrl}/#services`;

  if (path.includes("ai-lab.html")) {
    pageName = "AI Lab";
    pagePath = "ai-lab.html";
  } else if (path.includes("game-development.html")) {
    pageName = "Game Development";
    pagePath = "game-development.html";
  } else if (path.includes("blogs.html")) {
    pageName = "Tech Blogs";
    pagePath = "blogs.html";
    categoryName = "Publications";
    categoryUrl = `${baseUrl}/blogs.html`;
  } else if (path.includes("priyam-kesh.html")) {
    pageName = "Priyam Kesh";
    pagePath = "priyam-kesh.html";
    categoryName = "About";
    categoryUrl = `${baseUrl}/priyam-kesh.html`;
  } else {
    // For Home (index.html), make sure we have a clean Home breadcrumb
    const homeBreadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": `${baseUrl}/`
        }
      ]
    };
    updateOrCreateBreadcrumb(homeBreadcrumb);
    return;
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${baseUrl}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": categoryName,
        "item": categoryUrl
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": pageName,
        "item": `${baseUrl}/${pagePath}`
      }
    ]
  };

  updateOrCreateBreadcrumb(breadcrumbSchema);
}

function updateOrCreateBreadcrumb(schema) {
  const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
  let updated = false;

  existingScripts.forEach(script => {
    try {
      const text = script.textContent.trim();
      // Try parsing as object or array
      if (text.startsWith('[') || text.startsWith('{')) {
        const json = JSON.parse(text);
        if (json && json["@type"] === "BreadcrumbList") {
          script.textContent = JSON.stringify(schema, null, 2);
          updated = true;
        }
      }
    } catch (e) {
      // Ignore parse errors for other JSON-LD types
    }
  });

  if (!updated) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema, null, 2);
    document.head.appendChild(script);
  }
}

// Universal Drop-In Animations for all pages, headings, texts, and cards
function injectUniversalAnimationStyles() {
  const hasIntro = document.getElementById('intro-transition-container') !== null;
  const baseDelay = hasIntro ? 1.30 : 0.05;
  const step = 0.07;

  const styleId = 'universal-drop-animations-style';
  if (document.getElementById(styleId)) return;

  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = `
    /* Universal Drop-In Animations Keyframes */
    @keyframes drop-in-bounce-universal {
      0% {
        opacity: 0;
        transform: translateY(-80px) scale(0.92);
      }
      50% {
        opacity: 1;
        transform: translateY(15px) scale(1.03);
      }
      75% {
        transform: translateY(-5px) scale(0.98);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Target class */
    .reveal-drop-universal {
      opacity: 0;
      transform: translateY(-80px);
      will-change: transform, opacity;
    }

    body.is-revealed .reveal-drop-universal {
      animation: drop-in-bounce-universal 0.85s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards !important;
    }

    /* Staggered delays */
    body.is-revealed .drop-delay-univ-1 { animation-delay: ${baseDelay}s !important; }
    body.is-revealed .drop-delay-univ-2 { animation-delay: ${(baseDelay + step).toFixed(2)}s !important; }
    body.is-revealed .drop-delay-univ-3 { animation-delay: ${(baseDelay + step * 2).toFixed(2)}s !important; }
    body.is-revealed .drop-delay-univ-4 { animation-delay: ${(baseDelay + step * 3).toFixed(2)}s !important; }
    body.is-revealed .drop-delay-univ-5 { animation-delay: ${(baseDelay + step * 4).toFixed(2)}s !important; }
  `;
  document.head.appendChild(styleEl);
}

function applyUniversalDropAnimations() {
  const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';
  
  if (!isIndexPage) {
    // For non-index pages, we must add 'is-revealed' to body to trigger animations!
    setTimeout(() => {
      document.body.classList.add("is-revealed");
    }, 50);
  }

  const targets = [];

  // 1. Header
  const header = document.querySelector('header');
  if (header && !header.classList.contains('reveal-anim') && !header.classList.contains('reveal-drop')) {
    targets.push(header);
  }

  // 2. Headings & Hero Info
  const main = document.querySelector('main') || document.body;
  if (main) {
    const h1s = main.querySelectorAll('h1');
    h1s.forEach(h1 => {
      if (!h1.classList.contains('reveal-anim') && !h1.classList.contains('reveal-drop')) {
        targets.push(h1);
      }
    });

    // Paragraphs near the top (e.g., hero descriptions)
    const topParagraphs = main.querySelectorAll('h1 + p, .hero-desc, .hero-blogs p, .hero-sec p, main section:first-of-type p');
    topParagraphs.forEach(p => {
      if (!targets.includes(p) && !p.classList.contains('reveal-anim') && !p.classList.contains('reveal-drop')) {
        targets.push(p);
      }
    });

    // Primary/secondary CTA buttons near the top
    const topButtons = main.querySelectorAll('main section:first-of-type .btn-primary, main section:first-of-type .btn-secondary, main section:first-of-type button, main section:first-of-type a[style*="padding"]');
    topButtons.forEach(btn => {
      if (!targets.includes(btn) && !btn.classList.contains('reveal-anim') && !btn.classList.contains('reveal-drop') && btn.offsetParent !== null) {
        targets.push(btn);
      }
    });

    // Content headers (h2)
    const h2s = main.querySelectorAll('h2, .section-title');
    h2s.forEach(h2 => {
      if (!targets.includes(h2) && !h2.classList.contains('reveal-anim') && !h2.classList.contains('reveal-drop')) {
        targets.push(h2);
      }
    });

    // Cards, bento boxes, etc.
    const cards = main.querySelectorAll('.service-card, .blog-card, .project-card, .ai-card, .bento-box, .faq-item, .approach-text-box, .feature-card, .projects-grid > div, .blogs-grid > div, .services-grid > div');
    cards.forEach(card => {
      if (!targets.includes(card) && !card.classList.contains('reveal-anim') && !card.classList.contains('reveal-drop') && !card.classList.contains('reveal-scroll')) {
        targets.push(card);
      }
    });
  }

  // Apply target class and staggered delays
  let staggerIndex = 1;
  targets.forEach(el => {
    el.classList.add('reveal-drop-universal');
    el.classList.add(`drop-delay-univ-${staggerIndex}`);
    staggerIndex++;
    if (staggerIndex > 5) {
      staggerIndex = 1;
    }
  });
}

// Auto-run on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initDynamicBranding();
    injectDynamicBreadcrumbs();
    injectUniversalAnimationStyles();
    applyUniversalDropAnimations();
  });
} else {
  initDynamicBranding();
  injectDynamicBreadcrumbs();
  injectUniversalAnimationStyles();
  applyUniversalDropAnimations();
}
