import { db, collection, addDoc, updateDoc, deleteDoc, doc, setDoc, onSnapshot, serverTimestamp, OperationType, handleFirestoreError } from './src/firebaseConfig.js';

// State
let projectsData = [];
let projectsFromDb = [];
let unsubscribeProjectsDb = null;
let editingProjectId = null;
let selectedProjectIds = new Set();
let currentBgImage = "";

// Analytics and lead tracking state
let inquiriesData = [];
let clicksData = [];
let unsubscribeInquiries = null;
let unsubscribeClicks = null;

// AI Lab state
let aiProjectsData = [];
let unsubscribeAiProjects = null;
let editingAiProjectId = null;
let currentAiImg = "";

// Blog state
let adminBlogsData = [];
let unsubscribeAdminBlogs = null;
let editingBlogId = null;
let currentBlogImg = "";

// Routing logic
function handleRouting() {
  const hash = window.location.hash;
  const mainContent = document.getElementById('main-content');
  const adminContent = document.getElementById('admin-content');
  
  if (mainContent && adminContent) {
    if (hash === '#/admin' || hash === '#admin') {
      mainContent.style.display = 'none';
      adminContent.style.display = 'block';
    } else {
      adminContent.style.display = 'none';
      mainContent.style.display = 'block';
    }
  }
}

window.addEventListener('hashchange', handleRouting);

document.addEventListener("DOMContentLoaded", () => {
  handleRouting();
  setupInteractions();
  subscribeToProjects();
  setupAdmin();
});

// Deep telemetry analytics click logger
window.trackClick = async function(buttonId, buttonText) {
  try {
    const documentRef = doc(collection(db, 'clicks'));
    const docId = documentRef.id;
    await setDoc(doc(db, 'clicks', docId), {
      buttonId: buttonId,
      buttonText: buttonText,
      pageUrl: window.location.href,
      createdAt: serverTimestamp()
    });
    console.log(`Lead Telemetry recorded: buttonId="${buttonId}"`);
  } catch (err) {
    // Fail silently for guests / public access, logging to dev console
    console.warn("Lead Telemetry registration skipped or cached: ", err.message);
  }
};

function combineAndRenderProjects() {
  projectsData = [...projectsFromDb];
  
  // Sort projects: newest first based on createdAt timestamp if available
  projectsData.sort((a, b) => {
    const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
    const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
    return timeB - timeA;
  });

  console.log("Active projects loaded from Firestore. Count:", projectsData.length);
  renderServices();
  renderAdminProjects();
}

function subscribeToProjects() {
  const projectsRef = collection(db, 'projects');
  
  // Subscribe to the unified Firestore database instance
  unsubscribeProjectsDb = onSnapshot(projectsRef, (snapshot) => {
    projectsFromDb = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log("Firebase Connection: Projects synchronized successfully. Items:", projectsFromDb.length);
    combineAndRenderProjects();
  }, (error) => {
    const errMsg = error ? (error.message || String(error)) : "";
    const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit');
    if (isQuota) {
      console.warn("Firestore projects subscription completed via cache/fallback limit.", errMsg);
    } else {
      console.error("Firestore subscription failed: ", errMsg);
    }
    projectsFromDb = [];
    combineAndRenderProjects();
    try {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    } catch (err) {
      // Safe boundary for public guest users
    }
  });
}

function renderServices() {
  const container = document.getElementById("services-grid");
  if (!container) return;

  // If there are no custom projects fetched yet via Firestore subscription,
  // we preserve the semantic, keyword-optimized fallback cards for maximum search indexing (SEO).
  if (projectsData.length === 0) {
     initServicesObserver();
     return;
  }

  container.innerHTML = "";

  projectsData.forEach(project => {
    const el = document.createElement("div");
    const isDark = !!project.darkMode;

    if (project.bgImage && project.bgImage.trim() !== '') {
      el.className = isDark ? "service-card has-bg dark-mode reveal-scroll" : "service-card has-bg reveal-scroll";
      if (isDark) {
        el.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url('${project.bgImage}')`;
      } else {
        el.style.backgroundImage = `url('${project.bgImage}')`;
      }
    } else {
      el.className = isDark ? "service-card dark-mode reveal-scroll" : "service-card reveal-scroll";
      if (isDark) {
        el.style.background = "#0f172a"; // slate-900 backup for dark mode card with no bg image
      } else {
        el.style.backgroundColor = "var(--bg-surface)";
      }
    }
    // Inline style for positioning the tag
    el.style.position = "relative";
    
    let tagHtml = '';
    if (project.tag && project.tag.trim() !== '') {
      tagHtml = `<div class="project-tag">${project.tag}</div>`;
    }

    let featuresHtml = '';
    if (project.features && project.features.trim() !== '') {
      const featuresArr = project.features.split(',').map(f => f.trim());
      featuresHtml = '<ul class="project-features">';
      featuresArr.forEach(feature => {
        featuresHtml += `<li>✓ ${feature}</li>`;
      });
      featuresHtml += '</ul>';
    }

    el.innerHTML = `
      ${tagHtml}
      <div class="service-card-info-box">
        <h3>${project.title}</h3>
        <div class="project-price">${project.price}</div>
        ${featuresHtml}
      </div>
      <button class="btn-primary" style="width: 100%; margin-top: auto;" onclick="contactForProject('${project.title}', '${project.price}')">
        Contact via WhatsApp
      </button>
    `;
    container.appendChild(el);
  });

  initServicesObserver();
}

window.contactForProject = function(title, price) {
  window.trackClick(`project-whatsapp-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, `WhatsApp Catalog: ${title} (${price})`);
  const message = `Hi Polarith Web! I am interested in ${title} at ${price}. Let's discuss this project!`;
  const whatsappUrl = `https://wa.me/918345890843?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};

window.quickChatWhatsApp = function() {
  window.trackClick('quick-chat-whatsapp', 'WhatsApp Header Banner Or Popups');
  const message = "Hi Polarith Web! I am reaching out to discuss a custom web, app, or software development project. Let's build something great together.";
  const whatsappUrl = `https://wa.me/918345890843?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};

window.startProjectWhatsApp = function() {
  window.trackClick('start-project-whatsapp', 'Start Project Button (Hero CTA)');
  const message = "Hi Polarith Web! I want to start a custom software/app development project with India's #1 engineering ecosystem. Let's discuss our requirements.";
  const whatsappUrl = `https://wa.me/918345890843?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};


function setupAdmin() {
  const passwordForm = document.getElementById('admin-password-form');
  const passwordInput = document.getElementById('admin-password-input');
  const loginBtn = document.getElementById('admin-login-btn');
  const logoutBtn = document.getElementById('admin-logout-btn');
  const addForm = document.getElementById('admin-add-form');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const bgFileInput = document.getElementById('add-bg-file');
  const bgUrlInput = document.getElementById('add-bg-url');
  const clearBgBtn = document.getElementById('clear-bg-btn');
  const bgPreviewContainer = document.getElementById('bg-preview-container');
  const bgPreviewImg = document.getElementById('bg-preview-img');

  function updateBgPreview() {
    if (currentBgImage && currentBgImage.trim() !== '') {
      if (bgPreviewImg) bgPreviewImg.src = currentBgImage;
      if (bgPreviewContainer) bgPreviewContainer.style.display = 'flex';
      if (clearBgBtn) clearBgBtn.style.display = 'inline-block';
    } else {
      if (bgPreviewContainer) bgPreviewContainer.style.display = 'none';
      if (clearBgBtn) clearBgBtn.style.display = 'none';
      if (bgFileInput) bgFileInput.value = '';
      if (bgUrlInput) bgUrlInput.value = '';
    }
  }

  if (bgFileInput) {
    bgFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          const img = new Image();
          img.onload = function() {
            let width = img.width;
            let height = img.height;
            const maxWidth = 1000;
            const maxHeight = 1000;
            
            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            currentBgImage = canvas.toDataURL('image/webp', 0.7);
            if (bgUrlInput) bgUrlInput.value = '';
            updateBgPreview();
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (bgUrlInput) {
    bgUrlInput.addEventListener('input', () => {
      const val = bgUrlInput.value.trim();
      if (val !== '') {
        currentBgImage = val;
        if (bgFileInput) bgFileInput.value = '';
        updateBgPreview();
      } else {
        currentBgImage = '';
        updateBgPreview();
      }
    });
  }

  if (clearBgBtn) {
    clearBgBtn.addEventListener('click', () => {
      currentBgImage = '';
      if (bgFileInput) bgFileInput.value = '';
      if (bgUrlInput) bgUrlInput.value = '';
      updateBgPreview();
    });
  }

  window.triggerUpdateBgPreview = updateBgPreview;

  // --- Admin Website Assets & Images Manager ---
  const imagesForm = document.getElementById('admin-images-form');
  const saveImagesBtn = document.getElementById('save-images-btn');
  const saveImagesStatus = document.getElementById('save-images-status');

  const assetsList = ['logo', 'img1', 'img2', 'img3'];
  const defaultAssetPaths = {
    logo: './logo.png',
    img1: './img1.png',
    img2: './img2.png',
    img3: './img3.png'
  };

  let currentImagesState = {
    logo: '',
    img1: '',
    img2: '',
    img3: ''
  };

  // Helper to update individual asset preview & inputs
  function updateAssetUI(asset, value) {
    const fileInput = document.getElementById(`img-${asset}-file`);
    const urlInput = document.getElementById(`img-${asset}-url`);
    const previewImg = document.getElementById(`preview-${asset}-img`);

    if (previewImg) {
      previewImg.src = (value && value.trim() !== '') ? value : defaultAssetPaths[asset];
    }

    if (urlInput) {
      if (value && value.startsWith('data:')) {
        urlInput.value = '';
        urlInput.placeholder = 'Base64 uploaded file (re-paste URL to override)';
      } else {
        urlInput.value = value || '';
        urlInput.placeholder = 'Or paste image URL';
      }
    }

    if (!value && fileInput) {
      fileInput.value = '';
    }
  }

  // Subscribe to real-time image settings
  let unsubscribeSettings = null;
  function subscribeToImageSettings() {
    if (unsubscribeSettings) return;
    const settingsRef = collection(db, 'settings');
    unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
      // First initialize with defaults
      assetsList.forEach(asset => {
        if (!currentImagesState[asset]) {
          currentImagesState[asset] = '';
          updateAssetUI(asset, '');
        }
      });
      
      snapshot.forEach((doc) => {
        const id = doc.id;
        if (id.startsWith('image_')) {
          const asset = id.replace('image_', '');
          if (assetsList.includes(asset)) {
            const data = doc.data();
            currentImagesState[asset] = data.value || '';
            updateAssetUI(asset, currentImagesState[asset]);
          }
        } else if (id === 'images') {
          // Legacy support for single document
          const data = doc.data();
          assetsList.forEach(asset => {
            if (data[asset] && !currentImagesState[asset]) {
              currentImagesState[asset] = data[asset];
              updateAssetUI(asset, currentImagesState[asset]);
            }
          });
        }
      });
    }, (error) => {
      console.warn("Failed to subscribe to image settings:", error.message);
    });
  }

  // Bind file upload & URL text inputs
  assetsList.forEach(asset => {
    const fileInput = document.getElementById(`img-${asset}-file`);
    const urlInput = document.getElementById(`img-${asset}-url`);

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
              let width = img.width;
              let height = img.height;
              const maxWidth = 1000;
              const maxHeight = 1000;
              
              if (width > height) {
                if (width > maxWidth) {
                  height = Math.round((height * maxWidth) / width);
                  width = maxWidth;
                }
              } else {
                if (height > maxHeight) {
                  width = Math.round((width * maxHeight) / height);
                  height = maxHeight;
                }
              }
              
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              
              const base64Data = canvas.toDataURL('image/webp', 0.7);
              
              currentImagesState[asset] = base64Data;
              if (urlInput) {
                urlInput.value = '';
                urlInput.placeholder = 'Base64 uploaded file (re-paste URL to override)';
              }
              const previewImg = document.getElementById(`preview-${asset}-img`);
              if (previewImg) previewImg.src = base64Data;
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', () => {
        const val = urlInput.value.trim();
        currentImagesState[asset] = val;
        if (fileInput) fileInput.value = '';
        const previewImg = document.getElementById(`preview-${asset}-img`);
        if (previewImg) {
          previewImg.src = val !== '' ? val : defaultAssetPaths[asset];
        }
      });
    }
  });

  // Bind individual reset buttons
  document.querySelectorAll('.reset-asset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const asset = e.target.getAttribute('data-asset');
      if (asset && assetsList.includes(asset)) {
        currentImagesState[asset] = '';
        updateAssetUI(asset, '');
      }
    });
  });

  // Save All Images Form Submission
  if (imagesForm) {
    imagesForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!saveImagesStatus || !saveImagesBtn) return;

      saveImagesStatus.style.display = 'inline-flex';
      saveImagesStatus.style.color = '#0284c7';
      saveImagesStatus.textContent = 'Saving assets...';
      saveImagesBtn.disabled = true;

      try {
        if (!isAdminAuthenticated) {
          throw new Error("Unauthorized. You must log in with the admin password to save branding assets.");
        }
        const savePromises = assetsList.map(asset => {
          const val = currentImagesState[asset] || '';
          return setDoc(doc(db, 'settings', `image_${asset}`), { value: val }, { merge: true });
        });
        await Promise.all(savePromises);
        saveImagesStatus.style.color = '#16a34a';
        saveImagesStatus.textContent = 'Saved successfully! ✨';
        setTimeout(() => {
          saveImagesStatus.style.display = 'none';
        }, 3000);
      } catch (err) {
        console.error("Failed to save dynamic branding assets: ", err);
        saveImagesStatus.style.color = '#dc2626';
        saveImagesStatus.textContent = `Error: ${err.message}`;
      } finally {
        saveImagesBtn.disabled = false;
      }
    });
  }

  let isAdminAuthenticated = false;

  function updateAuthState(isAuthenticated) {
    isAdminAuthenticated = isAuthenticated;
    const adminAuthSec = document.getElementById('admin-auth');
    const adminPanelSec = document.getElementById('admin-panel');
    
    if (isAuthenticated) {
      if (adminAuthSec) adminAuthSec.style.display = 'none';
      if (adminPanelSec) adminPanelSec.style.display = 'block';
      
      // Admin is authenticated: dynamically sync inquiries, clicks, and branding assets
      if (!unsubscribeInquiries) {
        subscribeInquiries();
      }
      if (!unsubscribeClicks) {
        subscribeClicks();
      }
      subscribeToImageSettings();
      if (!unsubscribeAiProjects) {
        subscribeAiProjects();
      }
      if (!unsubscribeAdminBlogs) {
        subscribeAdminBlogs();
      }
    } else {
      if (adminAuthSec) adminAuthSec.style.display = 'block';
      if (adminPanelSec) adminPanelSec.style.display = 'none';
      
      // Clean up subscriptions to save resource capacity
      if (unsubscribeInquiries) {
        unsubscribeInquiries();
        unsubscribeInquiries = null;
      }
      if (unsubscribeClicks) {
        unsubscribeClicks();
        unsubscribeClicks = null;
      }
      if (unsubscribeSettings) {
        unsubscribeSettings();
        unsubscribeSettings = null;
      }
      if (unsubscribeAiProjects) {
        unsubscribeAiProjects();
        unsubscribeAiProjects = null;
      }
      if (unsubscribeAdminBlogs) {
        unsubscribeAdminBlogs();
        unsubscribeAdminBlogs = null;
      }
      
      clearInquiriesAndClicksUI();
    }
  }

  // Initial state check
  updateAuthState(false);

  if (passwordForm) {
    passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const password = passwordInput.value;
      if (password !== 'priyampriya8825') {
        alert('Access denied. Incorrect password.');
        return;
      }
      
      alert("Access authorized successfully! Welcome back, Priyam.");
      if (passwordForm) passwordForm.reset();
      updateAuthState(true);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      alert("Signed out successfully.");
      updateAuthState(false);
      resetFormToCreate();
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      resetFormToCreate();
    });
  }

  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('add-title').value;
      const price = document.getElementById('add-price').value;
      const tag = document.getElementById('add-tag').value;
      const features = document.getElementById('add-features').value;
      const darkModeCheckbox = document.getElementById('add-dark-mode');
      const darkMode = darkModeCheckbox ? darkModeCheckbox.checked : false;

      const submitBtn = document.getElementById('submit-btn');
      const originalText = submitBtn ? submitBtn.textContent : (editingProjectId ? "Save Changes" : "Add Project");

      try {
        if (!isAdminAuthenticated) {
          throw new Error("Unauthorized. You must log in with the admin password to author changes to this database catalog.");
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Saving to Database...";
        }

        if (editingProjectId) {
          // Update Mode
          const payload = { title, price, tag, features, bgImage: currentBgImage, darkMode };

          try {
            await updateDoc(doc(db, 'projects', editingProjectId), payload);
          } catch (dbErr) {
            console.error("Firestore update failed: ", dbErr);
            handleFirestoreError(dbErr, OperationType.UPDATE, `projects/${editingProjectId}`);
          }
          alert("Project updated successfully!");
        } else {
          // Create Mode
          const payload = { 
            title, 
            price, 
            tag, 
            features, 
            bgImage: currentBgImage,
            darkMode,
            createdAt: serverTimestamp() 
          };
          
          const documentRef = doc(collection(db, 'projects'));
          const newId = documentRef.id;

          try {
            await setDoc(doc(db, 'projects', newId), payload);
          } catch (dbErr) {
            console.error("Firestore write failed: ", dbErr);
            handleFirestoreError(dbErr, OperationType.CREATE, 'projects');
          }
          alert("Project added successfully!");
        }
        resetFormToCreate();
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  // --- Admin Polarith AI Lab Projects Manager ---
  const aiFileInput = document.getElementById('ai-add-img-file');
  const aiUrlInput = document.getElementById('ai-add-img-url');
  const aiClearImgBtn = document.getElementById('ai-clear-img-btn');
  const aiImgPreviewContainer = document.getElementById('ai-img-preview-container');
  const aiImgPreviewImg = document.getElementById('ai-img-preview-img');

  function updateAiImgPreview() {
    if (currentAiImg && currentAiImg.trim() !== '') {
      if (aiImgPreviewImg) aiImgPreviewImg.src = currentAiImg;
      if (aiImgPreviewContainer) aiImgPreviewContainer.style.display = 'flex';
      if (aiClearImgBtn) aiClearImgBtn.style.display = 'inline-block';
    } else {
      if (aiImgPreviewContainer) aiImgPreviewContainer.style.display = 'none';
      if (aiClearImgBtn) aiClearImgBtn.style.display = 'none';
      if (aiFileInput) aiFileInput.value = '';
      if (aiUrlInput) aiUrlInput.value = '';
    }
  }

  if (aiFileInput) {
    aiFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          const img = new Image();
          img.onload = function() {
            let width = img.width;
            let height = img.height;
            const maxWidth = 1000;
            const maxHeight = 1000;
            
            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            currentAiImg = canvas.toDataURL('image/webp', 0.7);
            if (aiUrlInput) aiUrlInput.value = '';
            updateAiImgPreview();
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (aiUrlInput) {
    aiUrlInput.addEventListener('input', () => {
      const val = aiUrlInput.value.trim();
      if (val !== '') {
        currentAiImg = val;
        if (aiFileInput) aiFileInput.value = '';
        updateAiImgPreview();
      } else {
        currentAiImg = '';
        updateAiImgPreview();
      }
    });
  }

  if (aiClearImgBtn) {
    aiClearImgBtn.addEventListener('click', () => {
      currentAiImg = '';
      if (aiFileInput) aiFileInput.value = '';
      if (aiUrlInput) aiUrlInput.value = '';
      updateAiImgPreview();
    });
  }

  window.triggerUpdateAiImgPreview = updateAiImgPreview;

  const aiAddForm = document.getElementById('admin-ai-form');
  const aiCancelEditBtn = document.getElementById('ai-cancel-edit-btn');

  if (aiCancelEditBtn) {
    aiCancelEditBtn.addEventListener('click', () => {
      resetAiFormToCreate();
    });
  }

  if (aiAddForm) {
    aiAddForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('ai-add-title').value.trim();
      const description = document.getElementById('ai-add-desc').value.trim();
      const link = document.getElementById('ai-add-link-url').value.trim();
      const linkTitle = document.getElementById('ai-add-link-title').value.trim();

      const submitBtn = document.getElementById('ai-submit-btn');
      const originalText = submitBtn ? submitBtn.textContent : (editingAiProjectId ? "Save Changes" : "Add Lab Project");

      try {
        if (!isAdminAuthenticated) {
          throw new Error("Unauthorized. You must log in with the admin password to author changes to the AI Lab database catalog.");
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Saving to Database...";
        }

        const payload = {
          title,
          description,
          link,
          linkTitle,
          image: currentAiImg
        };

        if (editingAiProjectId) {
          // Update Mode
          await updateDoc(doc(db, 'ai_lab_projects', editingAiProjectId), payload);
          alert("AI Lab Project updated successfully!");
        } else {
          // Create Mode
          payload.createdAt = serverTimestamp();
          const documentRef = doc(collection(db, 'ai_lab_projects'));
          await setDoc(doc(db, 'ai_lab_projects', documentRef.id), payload);
          alert("AI Lab Project added successfully!");
        }
        resetAiFormToCreate();
      } catch (err) {
        alert("Error saving AI project: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  // --- Admin Dashboard Tabs Navigation ---
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      document.querySelectorAll('.admin-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'white';
      });
      // Add active class to clicked button
      btn.classList.add('active');
      btn.style.background = 'var(--bg-surface)';

      // Hide all panels
      document.querySelectorAll('.admin-tab-panel').forEach(panel => {
        panel.style.display = 'none';
      });
      // Show selected panel
      const target = btn.getAttribute('data-tab');
      const panel = document.getElementById(`panel-${target}`);
      if (panel) panel.style.display = 'block';
    });
  });

  // --- Admin Blog Posts Manager ---
  const blogFileInput = document.getElementById('blog-add-img-file');
  const blogUrlInput = document.getElementById('blog-add-img-url');
  const blogClearImgBtn = document.getElementById('blog-clear-img-btn');
  const blogImgPreviewContainer = document.getElementById('blog-img-preview-container');
  const blogImgPreviewImg = document.getElementById('blog-img-preview-img');
  const blogContentInput = document.getElementById('blog-add-content');
  const blogLivePreview = document.getElementById('blog-live-preview');

  function updateBlogImgPreview() {
    if (currentBlogImg && currentBlogImg.trim() !== '') {
      if (blogImgPreviewImg) blogImgPreviewImg.src = currentBlogImg;
      if (blogImgPreviewContainer) blogImgPreviewContainer.style.display = 'flex';
      if (blogClearImgBtn) blogClearImgBtn.style.display = 'inline-block';
    } else {
      if (blogImgPreviewContainer) blogImgPreviewContainer.style.display = 'none';
      if (blogClearImgBtn) blogClearImgBtn.style.display = 'none';
      if (blogFileInput) blogFileInput.value = '';
      if (blogUrlInput) blogUrlInput.value = '';
    }
  }

  if (blogFileInput) {
    blogFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          const img = new Image();
          img.onload = function() {
            let width = img.width;
            let height = img.height;
            const maxWidth = 1000;
            const maxHeight = 1000;
            
            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            currentBlogImg = canvas.toDataURL('image/webp', 0.7);
            if (blogUrlInput) blogUrlInput.value = '';
            updateBlogImgPreview();
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (blogUrlInput) {
    blogUrlInput.addEventListener('input', () => {
      const val = blogUrlInput.value.trim();
      if (val !== '') {
        currentBlogImg = val;
        if (blogFileInput) blogFileInput.value = '';
        updateBlogImgPreview();
      } else {
        currentBlogImg = '';
        updateBlogImgPreview();
      }
    });
  }

  if (blogClearImgBtn) {
    blogClearImgBtn.addEventListener('click', () => {
      currentBlogImg = '';
      if (blogFileInput) blogFileInput.value = '';
      if (blogUrlInput) blogUrlInput.value = '';
      updateBlogImgPreview();
    });
  }

  window.triggerUpdateBlogImgPreview = updateBlogImgPreview;

  // Formatting Helper tags injection inside content textarea
  document.querySelectorAll('.editor-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.getAttribute('data-tag');
      if (!blogContentInput) return;
      
      const startPos = blogContentInput.selectionStart;
      const endPos = blogContentInput.selectionEnd;
      const originalText = blogContentInput.value;
      const selectedText = originalText.substring(startPos, endPos);
      
      let replacement = '';
      if (tag === 'img') {
        const url = prompt("Enter Image URL:") || "https://placehold.co/600x400";
        replacement = `<img src="${url}" alt="Blog Image" />`;
      } else if (tag === 'ul') {
        replacement = `<ul>\n  <li>${selectedText || 'List item 1'}</li>\n  <li>List item 2</li>\n</ul>`;
      } else {
        replacement = `<${tag}>${selectedText || 'Text'}</${tag}>`;
      }
      
      blogContentInput.value = originalText.substring(0, startPos) + replacement + originalText.substring(endPos);
      
      // Update Live Preview & cursor
      updateLivePreview();
      blogContentInput.focus();
      blogContentInput.selectionStart = startPos + replacement.length;
      blogContentInput.selectionEnd = startPos + replacement.length;
    });
  });

  function updateLivePreview() {
    if (!blogLivePreview) return;
    const content = blogContentInput ? blogContentInput.value : '';
    if (content.trim() === '') {
      blogLivePreview.innerHTML = '<em style="color: var(--text-muted); font-size: 0.9rem;">Type inside content box to render HTML preview...</em>';
    } else {
      blogLivePreview.innerHTML = content;
    }
  }

  if (blogContentInput) {
    blogContentInput.addEventListener('input', updateLivePreview);
  }

  const blogAddForm = document.getElementById('admin-blog-form');
  const blogCancelEditBtn = document.getElementById('blog-cancel-edit-btn');

  if (blogCancelEditBtn) {
    blogCancelEditBtn.addEventListener('click', () => {
      resetBlogFormToCreate();
    });
  }

  if (blogAddForm) {
    blogAddForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('blog-add-title').value.trim();
      const date = document.getElementById('blog-add-date').value.trim();
      const content = blogContentInput.value;

      const submitBtn = document.getElementById('blog-submit-btn');
      const originalText = submitBtn ? submitBtn.textContent : (editingBlogId ? "Save Changes" : "Add Blog Post");

      try {
        if (!isAdminAuthenticated) {
          throw new Error("Unauthorized. You must log in with the admin password to manage blog posts.");
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Saving to Database...";
        }

        const payload = {
          title,
          date,
          content,
          imageUrl: currentBlogImg
        };

        if (editingBlogId) {
          // Update Mode
          await updateDoc(doc(db, 'blogs', editingBlogId), payload);
          alert("Blog Post updated successfully!");
        } else {
          // Create Mode
          payload.createdAt = serverTimestamp();
          const documentRef = doc(collection(db, 'blogs'));
          await setDoc(doc(db, 'blogs', documentRef.id), payload);
          alert("Blog Post added successfully!");
        }
        resetBlogFormToCreate();
      } catch (err) {
        alert("Error saving blog: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }
}

// AI Lab Real-time subscription & render helpers
function subscribeAiProjects() {
  const projectsRef = collection(db, 'ai_lab_projects');
  unsubscribeAiProjects = onSnapshot(projectsRef, (snapshot) => {
    aiProjectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort descending by createdAt or timestamp
    aiProjectsData.sort((a, b) => {
      const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
      const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
      return timeB - timeA;
    });
    renderAdminAiProjects();
  }, (error) => {
    const errMsg = error ? (error.message || String(error)) : "";
    const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit');
    if (isQuota) {
      console.warn("AI Lab subscription completed via cache/fallback limit.", errMsg);
    } else {
      console.error("AI Lab subscription failed: ", errMsg);
    }
  });
}

function renderAdminAiProjects() {
  const list = document.getElementById('admin-ai-projects-list');
  if (!list) return;

  list.innerHTML = '';
  
  if (aiProjectsData.length === 0) {
    list.innerHTML = `
      <div style="padding: 1.5rem; background: #f8fafc; border: 2px dashed var(--border-light); border-radius: 6px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        No Polarith AI Lab projects logged inside Firestore database yet.
      </div>
    `;
    return;
  }

  aiProjectsData.forEach(p => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.style.padding = '1rem';
    div.style.background = 'white';
    div.style.border = '1px solid var(--border-light)';
    
    div.innerHTML = `
      <div><strong>🧪 ${escapeHtml(p.title)}</strong></div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn-secondary" style="padding: 4px 12px; min-height: unset;" onclick="startEditAiProject('${p.id}')">Edit</button>
        <button class="btn-secondary" style="padding: 4px 12px; min-height: unset; background: #fee2e2; color: #991b1b; border-color: #fca5a5;" onclick="deleteAiProject('${p.id}')">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function resetAiFormToCreate() {
  editingAiProjectId = null;
  currentAiImg = "";
  const form = document.getElementById('admin-ai-form');
  if (form) form.reset();
  
  if (window.triggerUpdateAiImgPreview) window.triggerUpdateAiImgPreview();
  
  const heading = document.getElementById('ai-form-heading');
  const submitBtn = document.getElementById('ai-submit-btn');
  const cancelBtn = document.getElementById('ai-cancel-edit-btn');
  
  if (heading) heading.textContent = "🧪 Manage Polarith AI Lab Projects";
  if (submitBtn) submitBtn.textContent = "Add Lab Project";
  if (cancelBtn) cancelBtn.style.display = "none";
}

window.resetAiFormToCreate = resetAiFormToCreate;

window.startEditAiProject = function(id) {
  const project = aiProjectsData.find(p => p.id === id);
  if (!project) return;
  
  editingAiProjectId = id;
  currentAiImg = project.image || '';
  
  const titleField = document.getElementById('ai-add-title');
  const descField = document.getElementById('ai-add-desc');
  const linkUrlField = document.getElementById('ai-add-link-url');
  const linkTitleField = document.getElementById('ai-add-link-title');
  const fileInput = document.getElementById('ai-add-img-file');
  const urlInput = document.getElementById('ai-add-img-url');
  
  if (titleField) titleField.value = project.title || '';
  if (descField) descField.value = project.description || '';
  if (linkUrlField) linkUrlField.value = project.link || '';
  if (linkTitleField) linkTitleField.value = project.linkTitle || '';
  
  if (fileInput) fileInput.value = '';
  if (urlInput) {
    urlInput.value = (project.image && !project.image.startsWith('data:')) ? project.image : '';
  }
  
  if (window.triggerUpdateAiImgPreview) window.triggerUpdateAiImgPreview();
  
  const heading = document.getElementById('ai-form-heading');
  const submitBtn = document.getElementById('ai-submit-btn');
  const cancelBtn = document.getElementById('ai-cancel-edit-btn');
  
  if (heading) heading.textContent = "🧪 Edit AI Lab Project";
  if (submitBtn) submitBtn.textContent = "Save Changes";
  if (cancelBtn) cancelBtn.style.display = "inline-block";
  
  const form = document.getElementById('admin-ai-form');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth' });
  }
};

window.deleteAiProject = async function(id) {
  if (confirm("Are you sure you want to permanently delete this AI Lab project?")) {
    try {
      if (editingAiProjectId === id) {
        resetAiFormToCreate();
      }
      await deleteDoc(doc(db, 'ai_lab_projects', id));
      alert("AI Lab Project deleted successfully!");
    } catch(err) {
      alert("Error deleting AI project: " + err.message);
    }
  }
};

// Blogs Real-time subscription & render helpers
function subscribeAdminBlogs() {
  const blogsRef = collection(db, 'blogs');
  unsubscribeAdminBlogs = onSnapshot(blogsRef, (snapshot) => {
    adminBlogsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort descending by createdAt or publishDate
    adminBlogsData.sort((a, b) => {
      const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
      const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
      return timeB - timeA;
    });
    renderAdminBlogs();
  }, (error) => {
    const errMsg = error ? (error.message || String(error)) : "";
    const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit');
    if (isQuota) {
      console.warn("Blogs database sync completed via cache/fallback limit.", errMsg);
    } else {
      console.error("Blogs database sync failed: ", errMsg);
    }
    try {
      handleFirestoreError(error, OperationType.LIST, 'blogs');
    } catch (e) {
      // Safe boundary
    }
  });
}

function renderAdminBlogs() {
  const list = document.getElementById('admin-blogs-list');
  if (!list) return;

  list.innerHTML = '';
  
  if (adminBlogsData.length === 0) {
    list.innerHTML = `
      <div style="padding: 1.5rem; background: #f8fafc; border: 2px dashed var(--border-light); border-radius: 6px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        No blog posts published in the Firestore database yet.
      </div>
    `;
    return;
  }

  adminBlogsData.forEach(blog => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.style.padding = '1rem';
    div.style.background = 'white';
    div.style.border = '1px solid var(--border-light)';
    
    div.innerHTML = `
      <div><strong>✍️ ${escapeHtml(blog.title)}</strong> <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 8px;">(${escapeHtml(blog.date)})</span></div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn-secondary" style="padding: 4px 12px; min-height: unset;" onclick="startEditBlog('${blog.id}')">Edit</button>
        <button class="btn-secondary" style="padding: 4px 12px; min-height: unset; background: #fee2e2; color: #991b1b; border-color: #fca5a5;" onclick="deleteBlog('${blog.id}')">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function resetBlogFormToCreate() {
  editingBlogId = null;
  currentBlogImg = "";
  const form = document.getElementById('admin-blog-form');
  if (form) form.reset();
  
  if (window.triggerUpdateBlogImgPreview) window.triggerUpdateBlogImgPreview();
  
  const heading = document.getElementById('blog-form-heading');
  const submitBtn = document.getElementById('blog-submit-btn');
  const cancelBtn = document.getElementById('blog-cancel-edit-btn');
  const previewDiv = document.getElementById('blog-live-preview');
  
  if (heading) heading.textContent = "✍️ Manage Polarith Blog Posts";
  if (submitBtn) submitBtn.textContent = "Add Blog Post";
  if (cancelBtn) cancelBtn.style.display = "none";
  if (previewDiv) previewDiv.innerHTML = '<em style="color: var(--text-muted); font-size: 0.9rem;">Type inside content box to render HTML preview...</em>';
}

window.resetBlogFormToCreate = resetBlogFormToCreate;

window.startEditBlog = function(id) {
  const blog = adminBlogsData.find(b => b.id === id);
  if (!blog) return;
  
  editingBlogId = id;
  currentBlogImg = blog.imageUrl || '';
  
  const titleField = document.getElementById('blog-add-title');
  const dateField = document.getElementById('blog-add-date');
  const contentField = document.getElementById('blog-add-content');
  const fileInput = document.getElementById('blog-add-img-file');
  const urlInput = document.getElementById('blog-add-img-url');
  
  if (titleField) titleField.value = blog.title || '';
  if (dateField) dateField.value = blog.date || '';
  if (contentField) {
    contentField.value = blog.content || '';
    // trigger live preview
    const previewDiv = document.getElementById('blog-live-preview');
    if (previewDiv) previewDiv.innerHTML = blog.content || '';
  }
  
  if (fileInput) fileInput.value = '';
  if (urlInput) {
    urlInput.value = (blog.imageUrl && !blog.imageUrl.startsWith('data:')) ? blog.imageUrl : '';
  }
  
  if (window.triggerUpdateBlogImgPreview) window.triggerUpdateBlogImgPreview();
  
  const heading = document.getElementById('blog-form-heading');
  const submitBtn = document.getElementById('blog-submit-btn');
  const cancelBtn = document.getElementById('blog-cancel-edit-btn');
  
  if (heading) heading.textContent = "✍️ Edit Blog Post";
  if (submitBtn) submitBtn.textContent = "Save Changes";
  if (cancelBtn) cancelBtn.style.display = "inline-block";
  
  const form = document.getElementById('admin-blog-form');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth' });
  }
};

window.deleteBlog = async function(id) {
  if (confirm("Are you sure you want to permanently delete this Blog Post?")) {
    try {
      if (editingBlogId === id) {
        resetBlogFormToCreate();
      }
      await deleteDoc(doc(db, 'blogs', id));
      alert("Blog Post deleted successfully!");
    } catch(err) {
      alert("Error deleting Blog Post: " + err.message);
    }
  }
};

// Admin Real-time listeners for Inquiries & Clicks Telemetry
function subscribeInquiries() {
  const inquiriesRef = collection(db, 'inquiries');
  unsubscribeInquiries = onSnapshot(inquiriesRef, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort descending by createdAt
    data.sort((a, b) => {
      const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
      const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
      return timeB - timeA;
    });
    inquiriesData = data;
    renderInquiries();
  }, (error) => {
    const errMsg = error ? (error.message || String(error)) : "";
    const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit');
    if (isQuota) {
      console.warn("Inquiries subscription completed via cache/fallback limit.", errMsg);
    } else {
      console.error("Inquiries subscription failed: ", errMsg);
    }
  });
}

function subscribeClicks() {
  const clicksRef = collection(db, 'clicks');
  unsubscribeClicks = onSnapshot(clicksRef, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort descending by createdAt
    data.sort((a, b) => {
      const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
      const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
      return timeB - timeA;
    });
    // Keep most recent 50 clicks in memory for clean dashboard list
    clicksData = data.slice(0, 50);
    renderClicks();
  }, (error) => {
    const errMsg = error ? (error.message || String(error)) : "";
    const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit');
    if (isQuota) {
      console.warn("Clicks telemetry subscription completed via cache/fallback limit.", errMsg);
    } else {
      console.error("Clicks telemetry subscription failed: ", errMsg);
    }
  });
}

function renderInquiries() {
  const list = document.getElementById('admin-inquiries-list');
  const countEl = document.getElementById('admin-inquiries-count');
  if (countEl) countEl.textContent = inquiriesData.length;
  if (!list) return;

  if (inquiriesData.length === 0) {
    list.innerHTML = `
      <div style="font-size: 0.85rem; padding: 1.5rem; background: #f8fafc; border: 1px dashed var(--border-light); text-align: center; color: var(--text-muted);">
        No customer inquiries logged yet inside Firestore database.
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  inquiriesData.forEach(item => {
    const dateStr = item.createdAt?.seconds 
      ? new Date(item.createdAt.seconds * 1000).toLocaleString()
      : 'Just now';
    const div = document.createElement('div');
    div.style.padding = '1rem';
    div.style.background = 'white';
    div.style.border = '1px solid var(--border-light)';
    div.style.borderRadius = '4px';
    div.style.fontSize = '0.85rem';
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <strong style="color: var(--brand-primary);">${escapeHtml(item.name)}</strong>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${dateStr}</span>
      </div>
      <div style="margin-bottom: 0.5rem;"><a href="mailto:${escapeHtml(item.email)}" style="color: var(--text-dark); text-decoration: underline; font-weight: 500;">${escapeHtml(item.email)}</a></div>
      <p style="margin: 0; color: var(--text-dark); background: #f8fafc; padding: 0.65rem; border-left: 3px solid var(--brand-primary); font-family: var(--font-sans); line-height: 1.4; word-wrap: break-word; white-space: pre-wrap;">${escapeHtml(item.brief)}</p>
      <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
        <button class="btn-secondary" style="padding: 2px 8px; font-size: 0.75rem; min-height: unset; background: #fee2e2; color: #991b1b; border-color: #fca5a5;" onclick="deleteInquiry('${item.id}')">Delete Lead</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function renderClicks() {
  const list = document.getElementById('admin-clicks-list');
  const countEl = document.getElementById('admin-clicks-count');
  if (countEl) countEl.textContent = clicksData.length;
  if (!list) return;

  if (clicksData.length === 0) {
    list.innerHTML = `
      <div style="font-size: 0.85rem; padding: 1.5rem; background: #f8fafc; border: 1px dashed var(--border-light); text-align: center; color: var(--text-muted);">
        No lead clicks registered yet in telemetry database.
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  clicksData.forEach(item => {
    const dateStr = item.createdAt?.seconds 
      ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString()
      : 'Just now';
    const div = document.createElement('div');
    div.style.padding = '0.5rem 0.75rem';
    div.style.background = 'white';
    div.style.border = '1px solid var(--border-light)';
    div.style.borderRadius = '4px';
    div.style.fontSize = '0.8rem';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.innerHTML = `
      <div style="font-family: var(--font-sans); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;" title="${escapeHtml(item.buttonText)}">
        <strong style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--brand-primary);">${escapeHtml(item.buttonId)}</strong> - <span style="color: var(--text-dark);">${escapeHtml(item.buttonText)}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">${dateStr}</span>
        <button style="border: none; background: none; color: #ef4444; cursor: pointer; padding: 2px; font-size: 0.95rem; font-weight: bold; line-height: 1;" aria-label="Delete telemetry" onclick="deleteClick('${item.id}')">&times;</button>
      </div>
    `;
    list.appendChild(div);
  });
}

window.deleteInquiry = async function(id) {
  if (confirm("Are you sure you want to permanently delete this customer inquiry?")) {
    try {
      await deleteDoc(doc(db, 'inquiries', id));
      alert("Inquiry entry deleted.");
    } catch (err) {
      console.error("Failed to delete inquiry: ", err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `inquiries/${id}`);
      } catch (e) {
        alert("Error deleting inquiry: " + err.message);
      }
    }
  }
};

window.deleteClick = async function(id) {
  try {
    await deleteDoc(doc(db, 'clicks', id));
  } catch (err) {
    console.error("Failed to delete click event: ", err);
    try {
      handleFirestoreError(err, OperationType.DELETE, `clicks/${id}`);
    } catch(e) {}
  }
};

function clearInquiriesAndClicksUI() {
  const inquiriesList = document.getElementById('admin-inquiries-list');
  const clicksList = document.getElementById('admin-clicks-list');
  const inquiriesCount = document.getElementById('admin-inquiries-count');
  const clicksCount = document.getElementById('admin-clicks-count');

  if (inquiriesCount) inquiriesCount.textContent = '0';
  if (clicksCount) clicksCount.textContent = '0';

  if (inquiriesList) {
    inquiriesList.innerHTML = `
      <div style="font-size: 0.85rem; padding: 1.5rem; background: #f8fafc; border: 1px dashed var(--border-light); text-align: center; color: var(--text-muted);">
        Sign in as Admin to sync customer inquiries.
      </div>
    `;
  }
  if (clicksList) {
    clicksList.innerHTML = `
      <div style="font-size: 0.85rem; padding: 1.5rem; background: #f8fafc; border: 1px dashed var(--border-light); text-align: center; color: var(--text-muted);">
        Sign in as Admin to sync lead telemetry activity.
      </div>
    `;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
}

// Function to reset the project form back to creation state
function resetFormToCreate() {
  editingProjectId = null;
  currentBgImage = "";
  const form = document.getElementById('admin-add-form');
  if (form) form.reset();
  
  if (window.triggerUpdateBgPreview) window.triggerUpdateBgPreview();
  
  const heading = document.getElementById('form-heading');
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  
  if (heading) heading.textContent = "Add New Project";
  if (submitBtn) submitBtn.textContent = "Add Project";
  if (cancelBtn) cancelBtn.style.display = "none";
}

window.startEditProject = function(id) {
  const project = projectsData.find(p => p.id === id);
  if (!project) return;
  
  editingProjectId = id;
  currentBgImage = project.bgImage || '';
  
  const titleField = document.getElementById('add-title');
  const priceField = document.getElementById('add-price');
  const tagField = document.getElementById('add-tag');
  const featuresField = document.getElementById('add-features');
  const bgUrlInput = document.getElementById('add-bg-url');
  const bgFileInput = document.getElementById('add-bg-file');
  
  if (titleField) titleField.value = project.title || '';
  if (priceField) priceField.value = project.price || '';
  if (tagField) tagField.value = project.tag || '';
  if (featuresField) featuresField.value = project.features || '';
  const darkModeCheckbox = document.getElementById('add-dark-mode');
  if (darkModeCheckbox) darkModeCheckbox.checked = !!project.darkMode;
  if (bgFileInput) bgFileInput.value = '';
  if (bgUrlInput) {
    bgUrlInput.value = (project.bgImage && !project.bgImage.startsWith('data:')) ? project.bgImage : '';
  }
  
  if (window.triggerUpdateBgPreview) window.triggerUpdateBgPreview();
  
  const heading = document.getElementById('form-heading');
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  
  if (heading) heading.textContent = "Edit Project";
  if (submitBtn) submitBtn.textContent = "Save Changes";
  if (cancelBtn) cancelBtn.style.display = "inline-block";
  
  // Scroll form into view
  const form = document.getElementById('admin-add-form');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth' });
  }
};

window.deleteProject = async function(id) {
  if (confirm("Are you sure you want to delete this project?")) {
    try {
      if (editingProjectId === id) {
        resetFormToCreate();
      }
      try {
        await deleteDoc(doc(db, 'projects', id));
      } catch (dbErr) {
        console.error("Firestore delete failed: ", dbErr);
        handleFirestoreError(dbErr, OperationType.DELETE, `projects/${id}`);
      }
      alert("Project deleted successfully!");
    } catch(err) {
      alert("Error deleting: " + err.message);
    }
  }
}

function renderAdminProjects() {
  const list = document.getElementById('admin-projects-list');
  if(!list) return;

  list.innerHTML = '';
  
  if (projectsData.length === 0) {
    list.innerHTML = `
      <div style="padding: 1.5rem; background: #f8fafc; border: 2px dashed var(--border-light); border-radius: 6px; text-align: center; color: var(--text-muted); font-size: 0.9rem; line-height: 1.5;">
        <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #1e293b; font-size: 0.95rem;">Your Firestore database collection "projects" is currently empty.</p>
        <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem;">The public website is currently displaying 3 hardcoded static SEO fallback cards ("Enterprise Custom AI Websites", "Custom Android & iOS App Development", "Tailored SaaS Dashboards & DBs").</p>
        <p style="margin: 0; font-size: 0.85rem; font-weight: 500; color: var(--brand-primary);">Adding just one project above will automatically sweep away the hardcoded mock cards and render your actual dynamic database catalog!</p>
      </div>
    `;
    return;
  }

  projectsData.forEach(p => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.style.padding = '1rem';
    div.style.background = 'white';
    div.style.border = '1px solid var(--border-light)';
    
    div.innerHTML = `
      <div><strong>${p.title}</strong> - ${p.price}${p.darkMode ? ' <span style="background: #0f172a; color: white; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 8px; vertical-align: middle;">Dark Card</span>' : ''}</div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn-secondary" style="padding: 4px 12px; min-height: unset;" onclick="startEditProject('${p.id}')">Edit</button>
        <button class="btn-secondary" style="padding: 4px 12px; min-height: unset; background: #fee2e2; color: #991b1b; border-color: #fca5a5;" onclick="deleteProject('${p.id}')">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function setupInteractions() {
  const menuBtn = document.getElementById("menu-btn");
  const overlay = document.getElementById("nav-overlay");
  
  if (menuBtn && overlay) {
    menuBtn.addEventListener("click", () => {
      menuBtn.classList.toggle("active");
      overlay.classList.toggle("active");
    });

    const menuCloseBtn = document.getElementById("menu-close-btn");
    if (menuCloseBtn) {
      menuCloseBtn.addEventListener("click", () => {
        menuBtn.classList.remove("active");
        overlay.classList.remove("active");
      });
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        menuBtn.classList.remove("active");
        overlay.classList.remove("active");
      }
    });

    const navLinks = overlay.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
      link.addEventListener("click", () => {
        menuBtn.classList.remove("active");
        overlay.classList.remove("active");
        
        const modalId = link.getAttribute("data-modal");
        if (modalId && window.openModal) {
          window.openModal(modalId);
        }
      });
    });
  }

  const closeBtns = document.querySelectorAll(".modal-close");
  closeBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const modal = e.target.closest('.modal-backdrop');
      if (modal) modal.classList.remove("active");
    });
  });

  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove("active");
      }
    });
  });

  const contactForm = document.getElementById("contact-form");
  const message = document.getElementById("form-message");
  if (contactForm && message) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("form-name").value;
      const email = document.getElementById("form-email").value;
      const brief = document.getElementById("form-brief").value;
      
      message.style.display = "block";
      message.textContent = `Thank you ${name}! Directing your inquiry to priaxom.ai@outlook.com and securing a slot in our database...`;
      
      // Dynamic lead tracking registration in Firestore inquiries collection
      try {
        const documentRef = doc(collection(db, 'inquiries'));
        const docId = documentRef.id;
        await setDoc(doc(db, 'inquiries', docId), {
          name,
          email,
          brief,
          createdAt: serverTimestamp()
        });
        console.log("Customer inquiry saved in database catalog: ", docId);
        window.trackClick('lead-form-submit', `Submit Contact Lead Name="${name}" Email="${email}"`);
      } catch (dbErr) {
        console.error("Firestore customer inquiry failed: ", dbErr);
        try {
          handleFirestoreError(dbErr, OperationType.CREATE, 'inquiries');
        } catch (err) {
          // Fall through safely for client
        }
      }

      const subject = encodeURIComponent(`Project Inquiry - ${name}`);
      const body = encodeURIComponent(`Hi Polarith Web,\n\nMy name is ${name} (${email}). Here are details of my project:\n\n${brief}\n\nLooking forward to your response!`);
      
      setTimeout(() => {
        window.location.href = `mailto:priaxom.ai@outlook.com?subject=${subject}&body=${body}`;
        contactForm.reset();
        message.textContent = `Inquiry prepared! We have securely saved your message and opened your email app. We will get back to you at ${email} shortly.`;
        setTimeout(() => {
          message.style.display = "none";
        }, 5000);
      }, 1200);
    });
  }
}

window.openModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("active");
};

window.closeModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("active");
};

window.toggleFaq = function(element) {
  const answer = element.querySelector(".faq-answer");
  const icon = element.querySelector(".faq-icon");
  const isActive = element.classList.contains("active");

  if (isActive) {
    element.classList.remove("active");
    if (answer) answer.style.maxHeight = "0";
    if (icon) icon.style.transform = "rotate(0deg)";
  } else {
    // Close other open items
    document.querySelectorAll(".faq-item").forEach(item => {
      item.classList.remove("active");
      const ans = item.querySelector(".faq-answer");
      const icn = item.querySelector(".faq-icon");
      if (ans) ans.style.maxHeight = "0";
      if (icn) icn.style.transform = "rotate(0deg)";
    });

    element.classList.add("active");
    if (answer) answer.style.maxHeight = answer.scrollHeight + "px";
    if (icon) icon.style.transform = "rotate(45deg)";
  }
};

let servicesObserver = null;

function initServicesObserver() {
  if (servicesObserver) {
    servicesObserver.disconnect();
  }

  const cards = document.querySelectorAll('.service-card.reveal-scroll');
  if (cards.length === 0) return;

  servicesObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  cards.forEach(card => {
    servicesObserver.observe(card);
  });
}
