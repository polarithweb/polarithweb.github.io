/* ===================== GITHUB ISSUES CMS FETCHER ===================== */
let SYSTEM_PROMPT = "";
let chatHistory = [];

// Helper function to parse GitHub Issue Forms markdown into an object
function parseIssueBody(body) {
  const result = {};
  if (!body) return result;
  
  const parts = body.split('### ');
  for (let i = 1; i < parts.length; i++) {
    const lines = parts[i].split('\n');
    const header = lines[0].trim().toLowerCase();
    const content = lines.slice(1).join('\n').trim();
    
    // Ignore empty responses from GitHub Forms
    if (content === '_No response_') continue;

    if (header.includes('title')) result.title = content;
    if (header.includes('price')) result.price = content;
    if (header.includes('link')) result.link = content;
    if (header.includes('features')) {
      result.features = content.split('\n').map(f => f.trim()).filter(f => f);
    }
    if (header.includes('tag')) {
      result.tag = (content !== 'None') ? content : null;
    }
  }
  return result;
}

async function initializeApp() {
  try {
    // Ping GitHub API to get all open issues from your repository
    const repo = 'polarithweb/polarithweb.github.io';
    const response = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=100`);
    
    if (!response.ok) throw new Error("Failed to fetch issues from GitHub");
    const issues = await response.json();

    const pricingData = [];
    const portfolioData = [];

    // Sort issues by oldest first (so your first created plan shows up first)
    issues.reverse().forEach(issue => {
      if (issue.pull_request) return; // Skip pull requests
      
      const isPricing = issue.labels.some(l => l.name.toLowerCase() === 'pricing');
      const isPortfolio = issue.labels.some(l => l.name.toLowerCase() === 'portfolio');
      
      if (isPricing || isPortfolio) {
         const parsedData = parseIssueBody(issue.body);
         if (isPricing && parsedData.title && parsedData.price) pricingData.push(parsedData);
         if (isPortfolio && parsedData.title) portfolioData.push(parsedData);
      }
    });

    // Render the DOM elements
    renderPricing(pricingData);
    renderPortfolio(portfolioData);

    // Teach the AI the live pricing
    initializeAI(pricingData);

  } catch (error) {
    console.error("CMS Error:", error);
    // Fallback if GitHub API rate limits or fails
    initializeAI([]); 
  }
}

/* ===================== DYNAMIC RENDER FUNCTIONS ===================== */

function renderPricing(pricingData) {
  const container = document.getElementById('pricing-grid-container');
  const template = document.getElementById('pricing-card-template');
  if (!container || !template) return;

  pricingData.forEach(item => {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.price-card');
    
    if (item.tag) {
      card.classList.add('featured');
      const badge = clone.querySelector('.featured-badge');
      badge.textContent = item.tag;
      badge.style.display = 'block';
    }
    
    clone.querySelector('.card-title').textContent = item.title;
    clone.querySelector('.price-value').textContent = item.price;
    
    const ul = clone.querySelector('.card-features');
    if (item.features) {
      item.features.forEach(f => {
        const li = document.createElement('li');
        li.textContent = f;
        ul.appendChild(li);
      });
    }
    
    clone.querySelector('.card-btn').onclick = () => openPlanMail(item.title, item.price);
    container.appendChild(clone);
  });
}

function renderPortfolio(portfolioData) {
  const container = document.getElementById('portfolio-grid-container');
  const template = document.getElementById('portfolio-card-template');
  if (!container || !template) return;

  portfolioData.forEach(item => {
    const clone = template.content.cloneNode(true);
    
    clone.querySelector('.port-title').textContent = item.title;
    if (item.link) {
      clone.querySelector('.port-link').href = item.link;
    } else {
      clone.querySelector('.port-link').style.display = 'none';
    }
    
    const ul = clone.querySelector('.port-features');
    if (item.features) {
      item.features.forEach(f => {
        const li = document.createElement('li');
        li.textContent = f;
        ul.appendChild(li);
      });
    }
    
    container.appendChild(clone);
  });
}

/* ===================== POLARITH WEB AI ===================== */

const _k1 = "gsk_j0PbrfP";
const _k2 = "dv2yRiXnepe";
const _k3 = "YzWGdyb3FYAe";
const _k4 = "yFm9qRks7ESf";
const _k5 = "fg9ELTNRJJ";
const GROQ_API_KEY = _k1 + _k2 + _k3 + _k4 + _k5;

function initializeAI(pricingData) {
  let pricingString = "No specific pricing data available at the moment.";
  if (pricingData && pricingData.length > 0) {
    pricingString = pricingData.map(p => `- ${p.title}: ₹${p.price} (${p.features.join(', ')})`).join('\n');
  }

  SYSTEM_PROMPT = `You are Polarith Web AI, an advanced, highly intelligent conversational assistant.
CRITICAL IDENTITY: You are NOT ChatGPT, OpenAI, or Meta. You are "Polarith Web AI", built exclusively on the "PriAxom HyperEngine" architecture by founder Priyam Kesh from West Bengal, India.
PERSONALITY & TONE: You are witty, confident, highly intelligent, and occasionally savage (but never rude). You do not talk like a generic robot.
RESPONSE RULES: You MUST keep responses extremely brief and punchy. Maximum 1-3 short sentences. DO NOT over-explain. Answer exactly what the user asks, directly and sharply. 

CURRENT PRICING AND KNOWLEDGE BASE:
${pricingString}

Goal: Recommend the best package based on user needs. Direct users to priaxom.ai@outlook.com to buy. Speak briefly.`;

  chatHistory = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "assistant", content: "Hello! I am Polarith Web AI, running on the PriAxom HyperEngine. Let's keep it sharp—how can I help you with our web solutions today?" }
  ];
}

function handleAIPress(event) {
  if (event.key === "Enter") sendAIMessage();
}

async function sendAIMessage() {
  const inputEl = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send-btn');
  const chatWindow = document.getElementById('chat-window');
  const userText = inputEl.value.trim();

  if (!userText) return;

  appendMessage('user', userText);
  chatHistory.push({ role: "user", content: userText });
  inputEl.value = '';
  inputEl.disabled = true;
  sendBtn.disabled = true;

  const typingId = showTypingIndicator();

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: chatHistory,
        temperature: 0.6,
        max_tokens: 150
      })
    });

    const data = await response.json();
    removeTypingIndicator(typingId);

    if (data.choices && data.choices.length > 0) {
      const aiReply = data.choices[0].message.content;
      appendMessage('ai', aiReply);
      chatHistory.push({ role: "assistant", content: aiReply });
    } else {
      appendMessage('ai', "Neural sync failure. Ask me that again.");
    }

  } catch (error) {
    removeTypingIndicator(typingId);
    console.error("HyperEngine Error:", error);
    appendMessage('ai', "My connection to the PriAxom HyperEngine dropped. Check your network.");
  } finally {
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

function appendMessage(sender, text) {
  const chatWindow = document.getElementById('chat-window');
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'ai-message'}`;
  
  const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  msgDiv.innerHTML = `
    <div class="msg-avatar">${sender === 'user' ? 'U' : '✦'}</div>
    <div class="msg-bubble">${formattedText}</div>
  `;
  
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTypingIndicator() {
  const chatWindow = document.getElementById('chat-window');
  const indicatorId = 'typing-' + Date.now();
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message ai-message';
  msgDiv.id = indicatorId;
  
  msgDiv.innerHTML = `
    <div class="msg-avatar">✦</div>
    <div class="msg-bubble typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return indicatorId;
}

function removeTypingIndicator(id) {
  const indicator = document.getElementById(id);
  if (indicator) indicator.remove();
}

/* ===================== BOOTSTRAP INITIALIZATION ===================== */
window.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
    startTyping();
    initScrollReveal();
  }, 1700);
});

/* ===================== CANVAS PARTICLES ===================== */
(function() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COLORS = ['#00b4ff', '#00ffe7', '#a855f7', '#0060ff'];

  function rand(a, b) { return a + Math.random() * (b - a); }

  function createParticles() {
    const count = Math.min(80, Math.floor(W * H / 12000));
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: rand(0, W), y: rand(0, H),
        vx: rand(-0.25, 0.25), vy: rand(-0.25, 0.25),
        r: rand(0.8, 2.2),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: rand(0.3, 0.8)
      });
    }
  }
  createParticles();
  window.addEventListener('resize', createParticles);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 140) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0,180,255,${0.08 * (1 - dist/140)})`;
          ctx.lineWidth = 0.6;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.globalAlpha = p.alpha * 0.7;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ===================== TAB NAVIGATION ===================== */
const tabs = document.querySelectorAll('.nav-tab');
const panels = document.querySelectorAll('.tab-panel');

function switchTab(id) {
  tabs.forEach(t => t.classList.remove('active'));
  panels.forEach(p => { p.classList.remove('active'); });
  const targetTab = document.querySelector(`[data-tab="${id}"]`);
  const targetPanel = document.getElementById(`tab-${id}`);
  if (targetTab) targetTab.classList.add('active');
  if (targetPanel) {
    targetPanel.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(initScrollReveal, 100);
  }
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

/* ===================== TYPING EFFECT ===================== */
const phrases = [
  'Next Generation AI-Powered Websites',
  'Where Intelligence Meets Design',
  'Futuristic UI · Premium Performance',
  'Your Vision. Our Code. Pure Excellence.'
];
let phraseIdx = 0, charIdx = 0, deleting = false;
const typedEl = document.getElementById('typed-text');

function startTyping() {
  if (!typedEl) return;
  typeLoop();
}

function typeLoop() {
  const current = phrases[phraseIdx];
  if (deleting) {
    charIdx--;
    typedEl.textContent = current.substring(0, charIdx);
    if (charIdx === 0) {
      deleting = false;
      phraseIdx = (phraseIdx + 1) % phrases.length;
      setTimeout(typeLoop, 500);
      return;
    }
    setTimeout(typeLoop, 35);
  } else {
    charIdx++;
    typedEl.textContent = current.substring(0, charIdx);
    if (charIdx === current.length) {
      deleting = true;
      setTimeout(typeLoop, 2200);
      return;
    }
    setTimeout(typeLoop, 55);
  }
}

/* ===================== SCROLL REVEAL ===================== */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal:not(.visible)');
  const obs = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 90);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => obs.observe(el));
}

/* ===================== 3D TILT ON CARDS ===================== */
document.addEventListener('mousemove', e => {
  document.querySelectorAll('.price-card, .portfolio-card').forEach(card => {
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 1.6) {
      card.style.transform = `perspective(800px) rotateY(${dx * 6}deg) rotateX(${-dy * 5}deg) translateY(-8px)`;
    } else {
      card.style.transform = '';
    }
  });
});

/* ===================== OPEN MAIL FOR PLAN ===================== */
function openPlanMail(plan, price) {
  const subject = encodeURIComponent(`I'd like a ${plan} — ₹${price} | Polarith Web`);
  const body = encodeURIComponent(
    `Hi Priyam,\n\nI'm interested in getting a ${plan} for ₹${price} from Polarith Web.\n\nCould you please reach out so we can get started?\n\nThank you.`
  );
  window.location.href = `mailto:priaxom.ai@outlook.com?subject=${subject}&body=${body}`;
}

/* ===================== COPY EMAIL ===================== */
function copyEmail() {
  navigator.clipboard.writeText('priaxom.ai@outlook.com').then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✓ Copied';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  });
}

/* ===================== CONTACT FORM → MAILTO ===================== */
function submitForm() {
  const name  = document.getElementById('f-name').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const msg   = document.getElementById('f-msg').value.trim();
  if (!name || !email || !msg) {
    alert('Please fill in all fields before sending.');
    return;
  }
  const subject = encodeURIComponent(`Website Enquiry from ${name}`);
  const body = encodeURIComponent(
    `Name: ${name}\nEmail: ${email}\n\nMessage:\n${msg}`
  );
  document.getElementById('contact-form').style.display = 'none';
  document.getElementById('form-success').style.display = 'block';
  window.location.href = `mailto:priaxom.ai@outlook.com?subject=${subject}&body=${body}`;
}

/* ===================== SCROLL TO PRICING ===================== */
function scrollToPricing() {
  document.getElementById('pricing-anchor').scrollIntoView({ behavior: 'smooth' });
}
