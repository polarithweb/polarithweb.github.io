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
  if (images.favicon && images.favicon.trim() !== '') {
    const favicons = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]');
    favicons.forEach(fav => {
      fav.href = images.favicon;
    });
  } else {
    const favicons = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]');
    favicons.forEach(fav => {
      fav.href = './favicon.png';
    });
  }

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
  if (images.ceo && images.ceo.trim() !== '') {
    const ceoImg = document.querySelector('.ceo-img') || document.querySelector('img[src="./me.png"]');
    if (ceoImg) {
      ceoImg.src = images.ceo;
      ceoImg.removeAttribute('onerror');
    }
  } else {
    const ceoImg = document.querySelector('.ceo-img');
    if (ceoImg) {
      ceoImg.src = './me.png';
    }
  }

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

// Auto-run on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initDynamicBranding();
    injectDynamicBreadcrumbs();
  });
} else {
  initDynamicBranding();
  injectDynamicBreadcrumbs();
}
