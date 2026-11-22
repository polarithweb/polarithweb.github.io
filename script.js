// Polarith Web — Core Public Site Interactions (100% Static, Zero External Database Dependencies)

function openExternalUrl(url) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

let servicesObserver = null;

function initMainApp() {
  setupInteractions();
  initServicesObserver();
}

window.contactForProject = function (title, price) {
  const safeTitle = String(title || 'Custom Project').trim();
  const safePrice = String(price || 'Custom Quote').trim();
  const message = `Hi Polarith Web! I am interested in ${safeTitle} at ${safePrice}. Let's discuss this project!`;
  openExternalUrl(`https://wa.me/918345890843?text=${encodeURIComponent(message)}`);
};

window.quickChatWhatsApp = function () {
  const message =
    "Hi Polarith Web! I am reaching out to discuss a custom web, app, or software development project. Let's build something great together.";
  openExternalUrl(`https://wa.me/918345890843?text=${encodeURIComponent(message)}`);
};

window.startProjectWhatsApp = function () {
  const message =
    "Hi Polarith Web! I want to start a custom software/app development project with India's #1 engineering ecosystem. Let's discuss our requirements.";
  openExternalUrl(`https://wa.me/918345890843?text=${encodeURIComponent(message)}`);
};

function setupInteractions() {
  const menuBtn = document.getElementById('menu-btn');
  const overlay = document.getElementById('nav-overlay');

  if (menuBtn && overlay && menuBtn.dataset.menuBound !== 'true') {
    menuBtn.dataset.menuBound = 'true';
    menuBtn.addEventListener('click', () => {
      menuBtn.classList.toggle('active');
      overlay.classList.toggle('active');
    });

    const menuCloseBtn = document.getElementById('menu-close-btn');
    if (menuCloseBtn) {
      menuCloseBtn.addEventListener('click', () => {
        menuBtn.classList.remove('active');
        overlay.classList.remove('active');
      });
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        menuBtn.classList.remove('active');
        overlay.classList.remove('active');
      }
    });

    const navLinks = overlay.querySelectorAll('.nav-link');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        menuBtn.classList.remove('active');
        overlay.classList.remove('active');

        const modalId = link.getAttribute('data-modal');
        if (modalId && window.openModal) {
          window.openModal(modalId);
        }
      });
    });
  }

  document.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-backdrop');
      if (modal && modal.id) window.closeModal(modal.id);
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && backdrop.id) {
        window.closeModal(backdrop.id);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.active').forEach((modal) => {
        if (modal.id) window.closeModal(modal.id);
      });
    }
  });

  const contactForm = document.getElementById('contact-form');
  const messageEl = document.getElementById('form-message');
  if (contactForm && messageEl) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('form-name');
      const emailInput = document.getElementById('form-email');
      const briefInput = document.getElementById('form-brief');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const brief = briefInput ? briefInput.value.trim() : '';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!name || name.length < 2) {
        messageEl.style.display = 'block';
        messageEl.textContent = 'Please enter your name (at least 2 characters).';
        return;
      }

      if (!emailRegex.test(email)) {
        messageEl.style.display = 'block';
        messageEl.textContent = 'Please enter a valid email address.';
        return;
      }

      if (!brief || brief.length < 5) {
        messageEl.style.display = 'block';
        messageEl.textContent = 'Please share a brief description of your project.';
        return;
      }

      messageEl.style.display = 'block';
      messageEl.textContent = `Thank you ${name}! Opening your email client to send your inquiry to priaxom.ai@outlook.com...`;

      const subject = encodeURIComponent(`Project Inquiry - ${name}`);
      const body = encodeURIComponent(
        `Hi Polarith Web,\n\nMy name is ${name} (${email}). Here are details of my project:\n\n${brief}\n\nLooking forward to your response!`
      );

      setTimeout(() => {
        window.location.href = `mailto:priaxom.ai@outlook.com?subject=${subject}&body=${body}`;
        contactForm.reset();
        messageEl.textContent = `Inquiry prepared for priaxom.ai@outlook.com! You can also message us directly on WhatsApp (+91 8345890843) for an instant reply.`;
        setTimeout(() => {
          messageEl.style.display = 'none';
        }, 6000);
      }, 600);
    });
  }
}

window.openModal = function (id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = '';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

window.closeModal = function (id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = '';
    document.body.style.overflow = '';
  }
};

window.toggleFaq = function (element) {
  const answer = element.querySelector('.faq-answer');
  const icon = element.querySelector('.faq-icon');
  const isActive = element.classList.contains('active');

  if (isActive) {
    element.classList.remove('active');
    if (answer) answer.style.maxHeight = '0';
    if (icon) icon.style.transform = 'rotate(0deg)';
  } else {
    document.querySelectorAll('.faq-item').forEach((item) => {
      item.classList.remove('active');
      const ans = item.querySelector('.faq-answer');
      const icn = item.querySelector('.faq-icon');
      if (ans) ans.style.maxHeight = '0';
      if (icn) icn.style.transform = 'rotate(0deg)';
    });

    element.classList.add('active');
    if (answer) answer.style.maxHeight = answer.scrollHeight + 'px';
    if (icon) icon.style.transform = 'rotate(45deg)';
  }
};

function initServicesObserver() {
  if (servicesObserver) {
    servicesObserver.disconnect();
  }

  const cards = document.querySelectorAll('.service-card.reveal-scroll');
  if (cards.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    cards.forEach((card) => card.classList.add('is-visible'));
    return;
  }

  servicesObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    }
  );

  cards.forEach((card) => {
    servicesObserver.observe(card);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMainApp);
} else {
  initMainApp();
}
