// Static site assets and dynamic JSON-LD BreadcrumbList helper
// Brand logos, favicons, CEO portraits, management suite artwork, AI Lab visuals, and game showcase artwork
// are served statically from ./assets/ so every page loads instantly with zero external database dependency.

export function applyDynamicImages() {
  // All primary brand and showcase visuals are served statically from ./assets/images/ and ./assets/aistudio/.
}

export function initDynamicBranding() {
  // Static branding is pre-rendered directly in HTML.
}

// Dynamically inject/optimize BreadcrumbList schema on subpages for Google crawlers
export function injectDynamicBreadcrumbs() {
  const baseUrl = 'https://polarithweb.github.io';
  const path = window.location.pathname;

  let pageName = '';
  let pagePath = '';
  let categoryName = 'Services';
  let categoryUrl = `${baseUrl}/#services`;

  if (path.includes('management-softwares.html')) {
    pageName = 'Polarith Management Softwares';
    pagePath = 'management-softwares.html';
  } else if (path.includes('ai-lab.html')) {
    pageName = 'AI Lab';
    pagePath = 'ai-lab.html';
  } else if (path.includes('game-development.html')) {
    pageName = 'Game Development';
    pagePath = 'game-development.html';
  } else if (path.includes('priyam-kesh.html')) {
    pageName = 'Priyam Kesh';
    pagePath = 'priyam-kesh.html';
    categoryName = 'About';
    categoryUrl = `${baseUrl}/priyam-kesh.html`;
  } else {
    const homeBreadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${baseUrl}/`,
        },
      ],
    };
    updateOrCreateBreadcrumb(homeBreadcrumb);
    return;
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${baseUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoryName,
        item: categoryUrl,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: pageName,
        item: `${baseUrl}/${pagePath}`,
      },
    ],
  };

  updateOrCreateBreadcrumb(breadcrumbSchema);
}

function updateOrCreateBreadcrumb(schema) {
  const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
  let updated = false;

  existingScripts.forEach((script) => {
    try {
      const text = script.textContent.trim();
      if (text.startsWith('[') || text.startsWith('{')) {
        const json = JSON.parse(text);
        if (json && json['@type'] === 'BreadcrumbList') {
          script.textContent = JSON.stringify(schema, null, 2);
          updated = true;
        } else if (
          json &&
          Array.isArray(json['@graph']) &&
          json['@graph'].some((node) => node && node['@type'] === 'BreadcrumbList')
        ) {
          updated = true;
        }
      }
    } catch {
      // Ignore parse errors for unrelated JSON-LD blocks
    }
  });

  if (!updated) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema, null, 2);
    document.head.appendChild(script);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectDynamicBreadcrumbs);
} else {
  injectDynamicBreadcrumbs();
}
