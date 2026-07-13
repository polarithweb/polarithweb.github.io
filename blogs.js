import { db, collection, onSnapshot, doc, setDoc, serverTimestamp, handleFirestoreError, OperationType } from './src/firebaseConfig.js';

// State
let blogPosts = [];
let filteredBlogPosts = [];

// DOM Elements
const blogsContainer = document.getElementById('blogs-container');
const loadingSpinner = document.getElementById('loading-spinner');
const searchInput = document.getElementById('blog-search');
const readerModal = document.getElementById('reader-modal');
const readerClose = document.getElementById('reader-close');
const readerDate = document.getElementById('reader-date');
const readerTitle = document.getElementById('reader-title');
const readerCover = document.getElementById('reader-cover');
const readerContent = document.getElementById('reader-content');

// Mobile Menu Elements
const menuBtn = document.getElementById('menu-btn');
const menuCloseBtn = document.getElementById('menu-close-btn');
const navOverlay = document.getElementById('nav-overlay');

// Global WhatsApp redirect
window.quickChatWhatsApp = function() {
  window.open("https://wa.me/918345890843?text=Hi%20Polarith%20Web%20Studio!%20I'm%20interested%20in%20discussing%20a%20project.", "_blank");
};

// Analytics Click Tracker
async function trackBlogClick(blogId, title) {
  try {
    const clickRef = doc(collection(db, 'clicks'));
    await setDoc(clickRef, {
      buttonId: `blog_post_${blogId}`,
      buttonText: `Read Blog: ${title}`,
      pageUrl: window.location.href,
      createdAt: serverTimestamp()
    });
    console.log(`Telemetry updated for blog click: ${title}`);
  } catch (err) {
    console.warn("Telemetry cached or skipped:", err.message);
    try {
      handleFirestoreError(err, OperationType.WRITE, 'clicks');
    } catch (e) {
      console.error(e);
    }
  }
}

// Mobile Menu Interactions
if (menuBtn && navOverlay) {
  menuBtn.addEventListener('click', () => {
    navOverlay.classList.add('active');
  });
}
if (menuCloseBtn && navOverlay) {
  menuCloseBtn.addEventListener('click', () => {
    navOverlay.classList.remove('active');
  });
}

// Close reader when clicking background
if (readerModal) {
  readerModal.addEventListener('click', (e) => {
    if (e.target === readerModal) {
      closeReader();
    }
  });
}

if (readerClose) {
  readerClose.addEventListener('click', closeReader);
}

// Keydown listener for Esc key to close reader
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeReader();
  }
});

// Setup Live Sync with Firestore
function initBlogsSync() {
  const blogsRef = collection(db, 'blogs');
  
  onSnapshot(blogsRef, (snapshot) => {
    blogPosts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort blogs by newest first (using createdAt or publishDate)
    blogPosts.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
    
    console.log("Blogs synchronized successfully from Firestore. Count:", blogPosts.length);
    
    // Hide loading screen, display grid
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    if (blogsContainer) blogsContainer.style.display = 'grid';
    
    applyFilters();
    checkUrlHash(); // Check if there is a blog id in hash to open immediately
  }, (error) => {
    const errMsg = error ? (error.message || String(error)) : "";
    const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit');
    if (isQuota) {
      console.warn("Firestore Blogs subscription completed via cache/fallback limit.", errMsg);
    } else {
      console.error("Firestore Blogs synchronization failed:", errMsg);
    }
    if (loadingSpinner) {
      loadingSpinner.innerHTML = `
        <div style="color: #ef4444; font-weight: 700;">Connection Failed</div>
        <p style="margin-top: 0.5rem; font-size: 0.85rem; color: rgba(255,255,255,0.4);">${errMsg}</p>
      `;
    }
    try {
      handleFirestoreError(error, OperationType.LIST, 'blogs');
    } catch (e) {
      // Safe boundary
    }
  });
}

// Render dynamic card items
function renderBlogCards() {
  if (!blogsContainer) return;
  
  if (filteredBlogPosts.length === 0) {
    blogsContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3>No insights match your query</h3>
        <p>Try searching another keyword or check back later for new articles.</p>
      </div>
    `;
    return;
  }
  
  blogsContainer.innerHTML = filteredBlogPosts.map(post => {
    // Generate a secure image cover element
    const coverHtml = post.imageUrl 
      ? `<img src="${post.imageUrl}" class="card-img" alt="${post.title}" loading="lazy" />`
      : `<div class="card-placeholder">
          <svg style="width: 48px; height: 48px; margin-bottom: 8px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <span style="font-size: 0.8rem; font-weight: 600; font-family: var(--font-mono);">POLARITH RESEARCH</span>
         </div>`;
         
    // Safe text snippet
    const contentText = stripHtmlTags(post.content || "");
    const snippet = contentText.length > 130 ? contentText.substring(0, 130) + '...' : contentText;
    
    return `
      <div class="blog-card" data-id="${post.id}">
        <div class="card-img-box">
          ${coverHtml}
        </div>
        <div class="card-body">
          <div class="card-date">${post.date || 'Technical Insight'}</div>
          <h3 class="card-title">${post.title}</h3>
          <p class="card-desc">${snippet}</p>
          <div class="read-more-btn">
            Read Insights 
            <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners to newly generated cards
  document.querySelectorAll('.blog-card').forEach(card => {
    card.addEventListener('click', () => {
      const postId = card.getAttribute('data-id');
      openReader(postId);
    });
  });
}

// Utility to remove HTML tags for generating snippets safely
function stripHtmlTags(html) {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

// Filter and search logic
function applyFilters() {
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  if (!query) {
    filteredBlogPosts = [...blogPosts];
  } else {
    filteredBlogPosts = blogPosts.filter(post => 
      post.title.toLowerCase().includes(query) || 
      (post.content && post.content.toLowerCase().includes(query))
    );
  }
  
  renderBlogCards();
}

// Open Frosted Reader
function openReader(postId) {
  const post = blogPosts.find(p => p.id === postId);
  if (!post) return;
  
  // Track Click Telemetry in Firebase
  trackBlogClick(postId, post.title);
  
  // Populate elements
  if (readerDate) readerDate.textContent = post.date || 'Technical Insight';
  if (readerTitle) readerTitle.textContent = post.title;
  
  if (readerCover) {
    if (post.imageUrl) {
      readerCover.src = post.imageUrl;
      readerCover.style.display = 'block';
    } else {
      readerCover.style.display = 'none';
    }
  }
  
  if (readerContent) {
    readerContent.innerHTML = post.content || '';
  }
  
  // Trigger animations and modal display
  if (readerModal) {
    readerModal.style.display = 'flex';
    // Small timeout to allow styling display change before adding active class (enables smooth transition)
    setTimeout(() => {
      readerModal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Stop background scrolling
    }, 10);
  }
  
  // Update URL Hash to support shareable deep-linking
  window.location.hash = `blog-${postId}`;
}

// Close Frosted Reader
function closeReader() {
  if (readerModal) {
    readerModal.classList.remove('active');
    setTimeout(() => {
      readerModal.style.display = 'none';
      document.body.style.overflow = 'auto'; // Restore background scrolling
    }, 300);
  }
  
  // Clean URL Hash safely
  history.replaceState(null, null, ' ');
}

// Check if deep linked blog exists
function checkUrlHash() {
  const hash = window.location.hash;
  if (hash.startsWith('#blog-')) {
    const blogId = hash.replace('#blog-', '');
    // Only open if the blog is loaded
    if (blogPosts.some(p => p.id === blogId)) {
      openReader(blogId);
    }
  }
}

// Bind search input events
if (searchInput) {
  searchInput.addEventListener('input', applyFilters);
}

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
  initBlogsSync();
});
