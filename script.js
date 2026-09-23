(() => {
  const officialHosts = new Set([
    'groisslhockeyphotography.com',
    'www.groisslhockeyphotography.com',
  ]);
  const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
  const host = window.location.hostname.toLowerCase().replace(/\.$/, '');

  if (officialHosts.has(host) || loopbackHosts.has(host)) {
    return;
  }

  const officialUrl = new URL(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
    'https://groisslhockeyphotography.com'
  );

  const blockUnofficialCopy = () => {
    if (!document.body) {
      return;
    }

    document.title = 'Official site required';
    document.documentElement.classList.add('unofficial-copy');

    const robotsMeta = document.querySelector('meta[name="robots"]') || document.createElement('meta');
    robotsMeta.setAttribute('name', 'robots');
    robotsMeta.setAttribute('content', 'noindex, nofollow, noarchive');
    if (!robotsMeta.parentNode) {
      document.head.appendChild(robotsMeta);
    }

    document.body.innerHTML = `
      <main class="unofficial-site-lock" role="main" aria-labelledby="unofficial-site-title">
        <div class="unofficial-site-lock-panel">
          <p class="unofficial-site-kicker">Unofficial copy blocked</p>
          <h1 id="unofficial-site-title">This is not the official Groissl Hockey Photography site.</h1>
          <p>This copy is running from an unauthorized host, so the site has disabled itself.</p>
          <a href="${officialUrl.href}" rel="canonical">Open the official site</a>
        </div>
      </main>
    `;
  };

  const lockStyle = document.createElement('style');
  lockStyle.textContent = `
    html.unofficial-copy,
    html.unofficial-copy body {
      min-height: 100%;
      margin: 0;
      background: #07090e;
      color: #e8edf5;
    }

    html.unofficial-copy body {
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .unofficial-site-lock {
      width: min(100%, 720px);
    }

    .unofficial-site-lock-panel {
      border: 1px solid #ffffff26;
      background: #0f141df2;
      padding: clamp(28px, 6vw, 56px);
      box-shadow: 0 24px 80px #00000080;
    }

    .unofficial-site-kicker {
      margin: 0 0 12px;
      color: #d8af6f;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .unofficial-site-lock h1 {
      margin: 0;
      max-width: 12ch;
      font-size: clamp(2.4rem, 10vw, 5.8rem);
      line-height: 0.92;
    }

    .unofficial-site-lock p:not(.unofficial-site-kicker) {
      max-width: 52ch;
      margin: 20px 0 0;
      color: #c5ced9;
      font-size: 1.05rem;
    }

    .unofficial-site-lock a {
      display: inline-flex;
      margin-top: 28px;
      color: #07090e;
      background: #d8af6f;
      padding: 0.85rem 1rem;
      font-weight: 800;
      text-decoration: none;
      text-transform: uppercase;
    }
  `;
  document.head.appendChild(lockStyle);

  blockUnofficialCopy();
  throw new Error('Unofficial host blocked');
})();

const reveals = document.querySelectorAll('.reveal');
const bgShots = document.querySelectorAll('.scroll-shot');
const filterButtons = document.querySelectorAll('.chip');
const mosaicItems = document.querySelectorAll('.mosaic-item');
const lightboxTargets = document.querySelectorAll('.lightboxable');
const lightbox = document.querySelector('#lightbox');
const lightboxImage = document.querySelector('.lightbox-image');
const lightboxClose = document.querySelector('.lightbox-close');
const lightboxPrev = document.querySelector('.lightbox-nav-prev');
const lightboxNext = document.querySelector('.lightbox-nav-next');
const bookingCards = document.querySelectorAll('.booking-option[data-scroll-target]');
const quickBookingForm = document.querySelector('#quick-booking-form');
const quickBookingStatus = document.querySelector('.quick-booking-status');
const packageSelect = document.querySelector('#quick-booking-form select[name="package"]');
const endDateField = document.querySelector('#end-date-field');
const endDateInput = document.querySelector('#end-date-input');
const bookingEmailLinks = document.querySelectorAll('a[href="mailto:Booking@groisslhockeyphotography.com"]');
const questionsEmailLinks = document.querySelectorAll('a[href="mailto:questions@groisslhockeyphotography.com"]');
const siteHeader = document.querySelector('.site-header');
const headerExpandToggle = document.querySelector('.header-expand-toggle');
const primaryNavList = siteHeader?.querySelector('.nav-links') || null;
const introOverlay = document.querySelector('.intro-overlay');
const introLogoCanvas = document.querySelector('.intro-logo-canvas');
const introLogoSource = document.querySelector('.intro-logo-source');
const internalAnchorLinks = document.querySelectorAll('a[href^="#"]');
const mobileHeaderMedia = window.matchMedia('(max-width: 640px)');
const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
const bookingEmailAddress = 'Booking@groisslhockeyphotography.com';
const questionsEmailAddress = 'questions@groisslhockeyphotography.com';

let bookingEmailMenu = null;
let copyBookingButton = null;
let openBookingMailButton = null;
let activeBookingLink = null;
let questionsEmailMenu = null;
let copyQuestionsButton = null;
let openMailButton = null;
let activeQuestionsLink = null;
let mobileHeaderExpanded = false;
let previousMobileHeaderState = mobileHeaderMedia.matches;
let lightboxItems = [];
let activeLightboxIndex = -1;
let lightboxTouchStartX = 0;
let lightboxTouchStartY = 0;
let lightboxReturnFocus = null;
let lightboxScrollY = 0;
let lightboxBodyOverflow = '';
let lightboxBackgroundInert = [];
let anchorScrollTimeout = null;
const introSeenStorageKey = 'ghp-intro-seen';

const hasBgShots = bgShots.length > 0;
const isMobileViewport = window.matchMedia('(max-width: 900px)').matches;
const slowLoadTimeoutMs = 2500;

let nonCriticalInitialized = false;
let lightboxBound = false;
let parallaxBound = false;
let headerCompactBound = false;
let ticking = false;
let lastScrollY = -1;
let introFinished = false;

let resolveIntroReady = () => {};
const introReady = new Promise((resolve) => {
  resolveIntroReady = resolve;
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const easeInOutCubic = (value) => (value < 0.5
  ? 4 * value * value * value
  : 1 - ((-2 * value + 2) ** 3) / 2);
const easeOutCubic = (value) => 1 - ((1 - value) ** 3);
const randomBetween = (min, max) => min + ((max - min) * Math.random());

const addSkipLink = () => {
  const main = document.querySelector('main');
  if (!main || document.querySelector('.skip-link')) {
    return;
  }

  if (!main.id) {
    main.id = 'main-content';
  }

  if (!main.hasAttribute('tabindex')) {
    main.setAttribute('tabindex', '-1');
  }

  const skipLink = document.createElement('a');
  skipLink.className = 'skip-link';
  skipLink.href = `#${main.id}`;
  skipLink.textContent = 'Skip to main content';
  document.body.prepend(skipLink);
};

const normalizeHeaderToggle = () => {
  if (!headerExpandToggle || !primaryNavList) {
    return;
  }

  if (!primaryNavList.id) {
    primaryNavList.id = 'primary-nav-list';
  }

  headerExpandToggle.setAttribute('aria-controls', primaryNavList.id);
  headerExpandToggle.setAttribute('aria-expanded', 'false');

  let label = headerExpandToggle.querySelector('.header-expand-label');
  if (!label) {
    label = document.createElement('span');
    label.className = 'header-expand-label';
    headerExpandToggle.prepend(label);
  }

  let icon = headerExpandToggle.querySelector('.header-expand-icon');
  if (!icon) {
    icon = document.createElement('span');
    icon.className = 'header-expand-icon';
    headerExpandToggle.append(icon);
  }
  icon.setAttribute('aria-hidden', 'true');

  headerExpandToggle.querySelectorAll('.header-expand-label').forEach((extraLabel) => {
    if (extraLabel !== label) {
      extraLabel.remove();
    }
  });
  headerExpandToggle.querySelectorAll('.header-expand-icon').forEach((extraIcon) => {
    if (extraIcon !== icon) {
      extraIcon.remove();
    }
  });
};

const syncMobileCollapsibleDetails = (isMobile = mobileHeaderMedia.matches) => {
  document.querySelectorAll('details.mobile-collapsible').forEach((item) => {
    item.open = !isMobile;
  });
};

const shouldSkipIntroForReferrer = () => {
  try {
    if (window.sessionStorage.getItem(introSeenStorageKey) === '1') {
      return true;
    }
  } catch (error) {
    // Ignore storage access failures and fall back to referrer checks.
  }

  if (!document.referrer) {
    return false;
  }

  try {
    const referrerUrl = new URL(document.referrer);
    return referrerUrl.origin === window.location.origin;
  } catch (error) {
    return false;
  }
};

const waitForImage = (image) => new Promise((resolve, reject) => {
  if (!image) {
    reject(new Error('Missing intro logo image'));
    return;
  }

  if (image.complete && image.naturalWidth > 0) {
    resolve(image);
    return;
  }

  const handleLoad = () => {
    cleanup();
    resolve(image);
  };

  const handleError = () => {
    cleanup();
    reject(new Error('Failed to load intro logo image'));
  };

  const cleanup = () => {
    image.removeEventListener('load', handleLoad);
    image.removeEventListener('error', handleError);
  };

  image.addEventListener('load', handleLoad);
  image.addEventListener('error', handleError);
});

const bgShotSpeeds = hasBgShots
  ? Array.from(bgShots, (shot) => Number(shot.dataset.speed || 0.05) * 1.35)
  : [];

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.08, rootMargin: '0px 0px -8% 0px' }
);

const bgObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        bgObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.01 }
);

const buildIntroDustScene = () => {
  if (!introLogoCanvas || !introLogoSource) {
    return null;
  }

  const rect = introLogoCanvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    return null;
  }

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  introLogoCanvas.width = width;
  introLogoCanvas.height = height;

  const ctx = introLogoCanvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });

  const logoCanvas = document.createElement('canvas');
  logoCanvas.width = width;
  logoCanvas.height = height;
  const logoCtx = logoCanvas.getContext('2d');

  const maskedCanvas = document.createElement('canvas');
  maskedCanvas.width = width;
  maskedCanvas.height = height;
  const maskedCtx = maskedCanvas.getContext('2d');

  if (!sourceCtx || !logoCtx || !maskedCtx) {
    return null;
  }

  const scale = Math.min(width / introLogoSource.naturalWidth, height / introLogoSource.naturalHeight);
  const drawWidth = Math.max(1, Math.round(introLogoSource.naturalWidth * scale));
  const drawHeight = Math.max(1, Math.round(introLogoSource.naturalHeight * scale));
  const drawX = Math.round((width - drawWidth) / 2);
  const drawY = Math.round((height - drawHeight) / 2);

  sourceCtx.clearRect(0, 0, width, height);
  sourceCtx.drawImage(introLogoSource, drawX, drawY, drawWidth, drawHeight);

  const sourcePixels = sourceCtx.getImageData(0, 0, width, height);
  const logoPixels = logoCtx.createImageData(width, height);

  for (let index = 0; index < sourcePixels.data.length; index += 4) {
    const luminance = (
      (sourcePixels.data[index] * 0.2126)
      + (sourcePixels.data[index + 1] * 0.7152)
      + (sourcePixels.data[index + 2] * 0.0722)
    );
    const alpha = clamp((luminance - 18) / 210, 0, 1);

    if (alpha <= 0) {
      continue;
    }

    logoPixels.data[index] = 255;
    logoPixels.data[index + 1] = 255;
    logoPixels.data[index + 2] = 255;
    logoPixels.data[index + 3] = Math.round(alpha * 255);
  }

  logoCtx.putImageData(logoPixels, 0, 0);

  const sampleStep = Math.max(2, Math.round(1.5 * dpr));
  const bandSize = Math.max(14 * dpr, drawHeight * 0.085);
  const samples = [];

  for (let y = drawY; y < drawY + drawHeight; y += sampleStep) {
    for (let x = drawX; x < drawX + drawWidth; x += sampleStep) {
      const pixelIndex = ((y * width) + x) * 4;
      const alpha = logoPixels.data[pixelIndex + 3];

      if (alpha < 24) {
        continue;
      }

      samples.push({
        x: x + randomBetween(-sampleStep * 0.3, sampleStep * 0.3),
        y: y + randomBetween(-sampleStep * 0.3, sampleStep * 0.3),
        triggerY: y + randomBetween(-bandSize * 0.55, bandSize * 0.45),
        size: Math.max(1, sampleStep * randomBetween(0.28, 0.6)),
        row: clamp((y - drawY) / Math.max(1, drawHeight), 0, 1),
        opacity: clamp(alpha / 255, 0.28, 1)
      });
    }
  }

  samples.sort((left, right) => left.triggerY - right.triggerY);

  return {
    ctx,
    width,
    height,
    dpr,
    drawY,
    drawHeight,
    logoCanvas,
    maskedCanvas,
    maskedCtx,
    samples,
    nextSampleIndex: 0,
    particles: [],
    bandSize,
    sampleStep
  };
};

const spawnIntroDustParticle = (state, sample, dissolveProgress) => {
  const rowPull = (sample.row - 0.48) * 18 * state.dpr;
  const windBase = (26 + (dissolveProgress * 44)) * state.dpr;

  return {
    x: sample.x,
    y: sample.y,
    vx: randomBetween(windBase * 0.75, windBase * 1.16),
    vy: rowPull + randomBetween(-12, 12) * state.dpr,
    size: Math.max(1, Math.round(sample.size)),
    shade: Math.round(randomBetween(214, 255)),
    baseAlpha: randomBetween(0.34, 0.78) * sample.opacity,
    age: 0,
    life: randomBetween(290, 540)
  };
};

const releaseIntroDustParticles = (state, releaseY, dissolveProgress) => {
  while (
    state.nextSampleIndex < state.samples.length
    && state.samples[state.nextSampleIndex].triggerY <= releaseY
  ) {
    const sample = state.samples[state.nextSampleIndex];
    state.nextSampleIndex += 1;
    state.particles.push(spawnIntroDustParticle(state, sample, dissolveProgress));

    if (sample.size > (state.sampleStep * 0.58) && Math.random() > 0.7) {
      const secondary = spawnIntroDustParticle(state, sample, dissolveProgress);
      secondary.size = Math.max(1, secondary.size - 1);
      secondary.x += randomBetween(-state.sampleStep * 0.45, state.sampleStep * 0.45);
      secondary.y += randomBetween(-state.sampleStep * 0.45, state.sampleStep * 0.45);
      secondary.vx *= randomBetween(0.88, 1.08);
      secondary.vy += randomBetween(-8, 8) * state.dpr;
      secondary.baseAlpha *= 0.82;
      secondary.life *= 0.88;
      state.particles.push(secondary);
    }
  }
};

const updateIntroDustParticles = (state, deltaMs, dissolveProgress) => {
  const deltaSeconds = deltaMs / 1000;
  const windPull = (18 + (dissolveProgress * 62)) * state.dpr;
  const activeParticles = [];

  for (const particle of state.particles) {
    particle.age += deltaMs;
    const ageProgress = particle.age / particle.life;

    if (ageProgress >= 1) {
      continue;
    }

    particle.vx += windPull * deltaSeconds * 0.36;
    particle.vy += randomBetween(-5, 5) * state.dpr * deltaSeconds;
    particle.x += particle.vx * deltaSeconds;
    particle.y += particle.vy * deltaSeconds;

    activeParticles.push(particle);
  }

  state.particles = activeParticles;
};

const drawIntroRemainingLogo = (state, dissolveProgress) => {
  if (dissolveProgress >= 1) {
    return;
  }

  if (dissolveProgress <= 0.001) {
    state.ctx.drawImage(state.logoCanvas, 0, 0);
    return;
  }

  const bandCenter = state.drawY + (dissolveProgress * state.drawHeight);
  const bandTop = bandCenter - state.bandSize;
  const bandBottom = bandCenter + (state.bandSize * 0.65);

  state.maskedCtx.clearRect(0, 0, state.width, state.height);
  state.maskedCtx.globalCompositeOperation = 'source-over';
  state.maskedCtx.drawImage(state.logoCanvas, 0, 0);
  state.maskedCtx.globalCompositeOperation = 'destination-in';

  const gradient = state.maskedCtx.createLinearGradient(0, bandTop, 0, bandBottom);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.26, 'rgba(0, 0, 0, 0.05)');
  gradient.addColorStop(0.58, 'rgba(0, 0, 0, 0.34)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');

  state.maskedCtx.fillStyle = gradient;
  state.maskedCtx.fillRect(0, 0, state.width, state.height);
  state.maskedCtx.globalCompositeOperation = 'source-over';

  state.ctx.drawImage(state.maskedCanvas, 0, 0);
};

const drawIntroDustParticles = (state) => {
  for (const particle of state.particles) {
    const ageProgress = clamp(particle.age / particle.life, 0, 1);
    const alpha = particle.baseAlpha * (1 - easeOutCubic(ageProgress));

    if (alpha <= 0.01) {
      continue;
    }

    const size = Math.max(1, Math.round(particle.size * (1 - (ageProgress * 0.18))));
    const channel = particle.shade;
    const highlight = Math.min(255, channel + 6);
    state.ctx.fillStyle = `rgba(${channel}, ${channel}, ${highlight}, ${alpha})`;
    state.ctx.fillRect(Math.round(particle.x), Math.round(particle.y), size, size);
  }
};

const renderIntroDustScene = (state, deltaMs, dissolveProgress) => {
  state.ctx.clearRect(0, 0, state.width, state.height);

  if (dissolveProgress > 0) {
    const releaseY = state.drawY + (dissolveProgress * state.drawHeight) + (dissolveProgress >= 1 ? state.bandSize : 0);
    releaseIntroDustParticles(state, releaseY, dissolveProgress);
  }

  updateIntroDustParticles(state, deltaMs, dissolveProgress);
  drawIntroRemainingLogo(state, dissolveProgress);
  drawIntroDustParticles(state);
};

const runIntroDustAnimation = async () => {
  if (!introOverlay || !introLogoCanvas || !introLogoSource) {
    return false;
  }

  await waitForImage(introLogoSource);

  const state = buildIntroDustScene();
  if (!state) {
    return false;
  }

  introOverlay.classList.add('is-playing');

  const dissolveStartMs = 380;
  const dissolveDurationMs = 700;
  const totalDurationMs = dissolveStartMs + dissolveDurationMs + 160;

  return new Promise((resolve) => {
    let startTime = 0;
    let lastTime = 0;

    const frame = (time) => {
      if (startTime === 0) {
        startTime = time;
        lastTime = time;
      }

      const elapsed = time - startTime;
      const deltaMs = Math.min(40, time - lastTime);
      lastTime = time;

      const dissolveProgress = easeInOutCubic(
        clamp((elapsed - dissolveStartMs) / dissolveDurationMs, 0, 1)
      );

      renderIntroDustScene(state, deltaMs, dissolveProgress);

      if (
        elapsed < totalDurationMs
        || state.nextSampleIndex < state.samples.length
        || state.particles.length > 0
      ) {
        window.requestAnimationFrame(frame);
        return;
      }

      resolve(true);
    };

    window.requestAnimationFrame(frame);
  });
};

const finishIntro = (immediate = false) => {
  if (introFinished) {
    return;
  }

  introFinished = true;

  try {
    window.sessionStorage.setItem(introSeenStorageKey, '1');
  } catch (error) {
    // Ignore storage access failures; referrer-based skipping still applies.
  }

  document.documentElement.classList.remove('intro-active');

  if (introOverlay) {
    if (immediate) {
      introOverlay.remove();
    } else {
      introOverlay.classList.add('is-complete');
      window.setTimeout(() => {
        introOverlay.remove();
      }, reducedMotionMedia.matches ? 65 : 150);
    }
  }

  resolveIntroReady();
};

const beginIntro = async () => {
  if (!introOverlay) {
    finishIntro();
    return;
  }

  if (mobileHeaderMedia.matches || reducedMotionMedia.matches) {
    finishIntro(true);
    return;
  }

  if (shouldSkipIntroForReferrer()) {
    finishIntro();
    return;
  }

  document.documentElement.classList.add('intro-active');

  try {
    const animationRan = await runIntroDustAnimation();

    if (animationRan && introOverlay) {
      introOverlay.classList.add('is-finishing');
      window.setTimeout(finishIntro, 30);
      return;
    }
  } catch (error) {
    // Fall back to a quick overlay exit if the canvas intro cannot start.
  }

  finishIntro();
};

const updateParallax = () => {
  if (reducedMotionMedia.matches) {
    bgShots.forEach((shot) => {
      shot.classList.add('visible');
      shot.style.setProperty('--scroll', '0px');
    });
    ticking = false;
    return;
  }

  const y = window.scrollY;
  if (y === lastScrollY) {
    ticking = false;
    return;
  }

  lastScrollY = y;

  bgShots.forEach((shot, idx) => {
    const offset = y * bgShotSpeeds[idx];
    shot.style.setProperty('--scroll', `${offset}px`);
  });

  ticking = false;
};

const bindParallax = () => {
  if (!hasBgShots || parallaxBound) {
    return;
  }

  if (reducedMotionMedia.matches) {
    updateParallax();
    return;
  }

  parallaxBound = true;

  bgShots.forEach((shot) => {
    bgObserver.observe(shot);
  });

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    },
    { passive: true }
  );

  updateParallax();
};

const bindHeaderCompaction = () => {
  if (!siteHeader || headerCompactBound) {
    return;
  }

  headerCompactBound = true;
  let headerTicking = false;

  const applyMobileHeaderDisclosure = ({ returnFocus = false } = {}) => {
    const isMobile = mobileHeaderMedia.matches;
    const isExpanded = isMobile && mobileHeaderExpanded;

    siteHeader.classList.toggle('is-mobile-expanded', isExpanded);

    if (headerExpandToggle) {
      headerExpandToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      headerExpandToggle.setAttribute('aria-label', isExpanded ? 'Close navigation menu' : 'Open navigation menu');
      const label = headerExpandToggle.querySelector('.header-expand-label');
      if (label) {
        label.textContent = isExpanded ? 'Close' : 'Menu';
      }
    }

    if (primaryNavList) {
      primaryNavList.inert = isMobile && !isExpanded;
    }

    if (returnFocus && headerExpandToggle) {
      headerExpandToggle.focus({ preventScroll: true });
    }

    updateHeaderOffset();
  };

  const applyMobileHeaderState = () => {
    const isCompact = window.scrollY > 42;
    const isMobile = mobileHeaderMedia.matches;

    if (!isMobile) {
      mobileHeaderExpanded = false;
    }

    siteHeader.classList.toggle('is-compact', isCompact);

    const focusWasInCollapsedNav = isMobile
      && !mobileHeaderExpanded
      && primaryNavList?.contains(document.activeElement);
    applyMobileHeaderDisclosure({ returnFocus: focusWasInCollapsedNav });

    if (headerExpandToggle && !isMobile) {
      headerExpandToggle.setAttribute('aria-expanded', 'false');
    }
  };

  const queueHeaderUpdate = () => {
    if (headerTicking) {
      return;
    }

    headerTicking = true;
    window.requestAnimationFrame(() => {
      applyMobileHeaderState();
      headerTicking = false;
    });
  };

  if (headerExpandToggle) {
    headerExpandToggle.addEventListener('click', () => {
      if (!mobileHeaderMedia.matches) {
        return;
      }

      mobileHeaderExpanded = !mobileHeaderExpanded;
      applyMobileHeaderState();
    });
  }

  if (primaryNavList) {
    primaryNavList.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (!mobileHeaderMedia.matches || !mobileHeaderExpanded) {
          return;
        }

        const destination = new URL(link.href, window.location.href);
        const staysOnPage = destination.origin === window.location.origin
          && destination.pathname === window.location.pathname
          && destination.search === window.location.search
          && Boolean(destination.hash);

        mobileHeaderExpanded = false;
        applyMobileHeaderState();

        if (staysOnPage) {
          const target = document.getElementById(decodeURIComponent(destination.hash.slice(1)));
          if (target) {
            if (!target.hasAttribute('tabindex')) {
              target.setAttribute('tabindex', '-1');
            }
            target.focus({ preventScroll: true });
          }
        }
      });
    });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !mobileHeaderMedia.matches || !mobileHeaderExpanded) {
      return;
    }

    event.preventDefault();
    mobileHeaderExpanded = false;
    applyMobileHeaderState();
    headerExpandToggle?.focus({ preventScroll: true });
  });

  const handleMobileBreakpointChange = (event) => {
    if (event.matches === previousMobileHeaderState) {
      return;
    }

    const focusWasOnToggle = document.activeElement === headerExpandToggle;
    previousMobileHeaderState = event.matches;
    mobileHeaderExpanded = false;
    syncMobileCollapsibleDetails(event.matches);
    applyMobileHeaderState();

    if (!event.matches && focusWasOnToggle) {
      primaryNavList?.querySelector('a[href]')?.focus({ preventScroll: true });
    }
  };

  if (typeof mobileHeaderMedia.addEventListener === 'function') {
    mobileHeaderMedia.addEventListener('change', handleMobileBreakpointChange);
  } else if (typeof mobileHeaderMedia.addListener === 'function') {
    mobileHeaderMedia.addListener(handleMobileBreakpointChange);
  }

  window.addEventListener('scroll', queueHeaderUpdate, { passive: true });
  window.addEventListener('resize', queueHeaderUpdate, { passive: true });
  applyMobileHeaderState();
};

const updateHeaderOffset = () => {
  if (!siteHeader) {
    return 0;
  }

  const headerHeight = Math.ceil(siteHeader.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--header-offset', `${headerHeight}px`);
  return headerHeight;
};

const collapseMobileHeader = () => {
  if (!siteHeader || !mobileHeaderMedia.matches || !mobileHeaderExpanded) {
    return false;
  }

  mobileHeaderExpanded = false;
  siteHeader.classList.remove('is-mobile-expanded');

  if (headerExpandToggle) {
    headerExpandToggle.setAttribute('aria-expanded', 'false');
    headerExpandToggle.setAttribute('aria-label', 'Open navigation menu');
    const label = headerExpandToggle.querySelector('.header-expand-label');
    if (label) {
      label.textContent = 'Menu';
    }
  }

  if (primaryNavList) {
    primaryNavList.inert = true;
  }

  return true;
};

const scrollToSelector = (selector, options = {}) => {
  if (!selector) {
    return;
  }

  const target = document.querySelector(selector);
  if (!target) {
    return;
  }

  const needsHeaderCollapse = options.collapseHeader !== false && collapseMobileHeader();
  const scrollBehavior = reducedMotionMedia.matches
    ? 'instant'
    : (options.behavior || 'smooth');
  const delayMs = needsHeaderCollapse ? 220 : 0;

  if (anchorScrollTimeout) {
    window.clearTimeout(anchorScrollTimeout);
  }

  const performScroll = () => {
    const headerOffset = updateHeaderOffset();
    const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - headerOffset - 12);

    window.scrollTo({
      top,
      behavior: scrollBehavior
    });
  };

  if (delayMs > 0) {
    anchorScrollTimeout = window.setTimeout(performScroll, delayMs);
    return;
  }

  performScroll();
};

const bindInternalAnchorScroll = () => {
  if (internalAnchorLinks.length === 0) {
    return;
  }

  internalAnchorLinks.forEach((link) => {
    const href = link.getAttribute('href');

    if (!href || href === '#') {
      return;
    }

    link.addEventListener('click', (event) => {
      const target = document.querySelector(href);
      if (!target) {
        return;
      }

      event.preventDefault();
      scrollToSelector(href);

      if (window.location.hash !== href) {
        history.pushState(null, '', href);
      }
    });
  });

  window.addEventListener('resize', updateHeaderOffset, { passive: true });
  window.addEventListener('load', updateHeaderOffset, { once: true });
  updateHeaderOffset();
};

const getVisibleLightboxItems = () => Array.from(lightboxTargets).filter((img) => {
  const card = img.closest('.mosaic-item');
  return !card || !card.classList.contains('is-hidden');
});

const getLightboxFocusableElements = () => {
  if (!lightbox) {
    return [];
  }

  return Array.from(lightbox.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((element) => (
    !element.hidden
    && !element.closest('[inert]')
    && element.getAttribute('aria-hidden') !== 'true'
    && element.getClientRects().length > 0
  ));
};

const setLightboxBackgroundInert = () => {
  if (!lightbox || !document.body) {
    return;
  }

  const background = new Set();
  let branch = lightbox;

  while (branch.parentElement && branch.parentElement !== document.body) {
    const parent = branch.parentElement;
    Array.from(parent.children).forEach((sibling) => {
      if (sibling !== branch) {
        background.add(sibling);
      }
    });
    branch = parent;
  }

  Array.from(document.body.children).forEach((sibling) => {
    if (sibling !== branch) {
      background.add(sibling);
    }
  });

  lightboxBackgroundInert = Array.from(background, (element) => ({
    element,
    inert: element.inert,
  }));
  lightboxBackgroundInert.forEach(({ element }) => {
    element.inert = true;
  });
};

const restoreLightboxBackground = () => {
  lightboxBackgroundInert.forEach(({ element, inert }) => {
    element.inert = inert;
  });
  lightboxBackgroundInert = [];
};

const focusLightboxEntry = () => {
  if (!lightbox) {
    return;
  }

  const entry = lightboxClose || getLightboxFocusableElements()[0] || lightbox;
  entry.focus({ preventScroll: true });
};

const trapLightboxFocus = (event) => {
  if (!lightbox || !lightbox.classList.contains('open') || event.key !== 'Tab') {
    return;
  }

  const focusableElements = getLightboxFocusableElements();
  if (focusableElements.length === 0) {
    event.preventDefault();
    lightbox.focus({ preventScroll: true });
    return;
  }

  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && (active === first || !lightbox.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !lightbox.contains(active))) {
    event.preventDefault();
    first.focus();
  }
};

const updateLightboxControls = () => {
  const hasMultiple = lightboxItems.length > 1;

  if (lightboxPrev) {
    lightboxPrev.hidden = !hasMultiple;
  }

  if (lightboxNext) {
    lightboxNext.hidden = !hasMultiple;
  }
};

const showLightboxItem = (index) => {
  if (!lightbox || !lightboxImage || lightboxItems.length === 0) {
    return;
  }

  const total = lightboxItems.length;
  activeLightboxIndex = ((index % total) + total) % total;

  const item = lightboxItems[activeLightboxIndex];
  lightboxImage.src = item.currentSrc || item.src;
  lightboxImage.alt = item.alt || 'Expanded gallery image';
  updateLightboxControls();
};

const openLightbox = (target) => {
  if (!lightbox || !lightboxImage) {
    return;
  }

  lightboxItems = getVisibleLightboxItems();
  activeLightboxIndex = lightboxItems.indexOf(target);

  if (activeLightboxIndex === -1) {
    lightboxItems = Array.from(lightboxTargets);
    activeLightboxIndex = lightboxItems.indexOf(target);
  }

  if (activeLightboxIndex === -1) {
    return;
  }

  if (mobileHeaderExpanded) {
    collapseMobileHeader();
  }

  lightboxReturnFocus = target;
  lightboxScrollY = window.scrollY;
  lightboxBodyOverflow = document.body.style.overflow;
  showLightboxItem(activeLightboxIndex);
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  if (!lightbox.hasAttribute('aria-label') && !lightbox.hasAttribute('aria-labelledby')) {
    lightbox.setAttribute('aria-label', 'Expanded hockey photograph');
  }
  if (!lightbox.hasAttribute('tabindex')) {
    lightbox.setAttribute('tabindex', '-1');
  }
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  setLightboxBackgroundInert();
  document.body.style.overflow = 'hidden';
  focusLightboxEntry();
  document.addEventListener('focusin', keepFocusInLightbox);
};

const keepFocusInLightbox = (event) => {
  if (lightbox?.classList.contains('open') && !lightbox.contains(event.target)) {
    focusLightboxEntry();
  }
};

const closeLightbox = () => {
  if (!lightbox || !lightboxImage) {
    return;
  }

  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.removeEventListener('focusin', keepFocusInLightbox);
  restoreLightboxBackground();
  lightboxImage.src = '';
  lightboxItems = [];
  activeLightboxIndex = -1;
  document.body.style.overflow = lightboxBodyOverflow;
  const focusTarget = lightboxReturnFocus;
  lightboxReturnFocus = null;
  window.scrollTo({ top: lightboxScrollY, behavior: 'instant' });
  if (focusTarget?.isConnected) {
    focusTarget.focus({ preventScroll: true });
  }
  if (Math.abs(window.scrollY - lightboxScrollY) > 1) {
    window.scrollTo({ top: lightboxScrollY, behavior: 'instant' });
  }
};

const showNextLightboxItem = () => {
  if (activeLightboxIndex === -1) {
    return;
  }

  showLightboxItem(activeLightboxIndex + 1);
};

const showPreviousLightboxItem = () => {
  if (activeLightboxIndex === -1) {
    return;
  }

  showLightboxItem(activeLightboxIndex - 1);
};

const bindLightbox = () => {
  if (lightboxBound) {
    return;
  }

  lightboxBound = true;

  lightboxTargets.forEach((img) => {
    const description = img.alt.trim();
    img.setAttribute('role', 'button');
    img.setAttribute('tabindex', '0');
    img.setAttribute('aria-haspopup', 'dialog');
    if (lightbox?.id) {
      img.setAttribute('aria-controls', lightbox.id);
    }
    img.setAttribute('aria-label', description ? `View larger image: ${description}` : 'View larger gallery image');

    img.addEventListener('click', () => {
      openLightbox(img);
    });

    img.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      openLightbox(img);
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', showPreviousLightboxItem);
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', showNextLightboxItem);
  }

  if (lightbox) {
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    if (!lightbox.hasAttribute('aria-label') && !lightbox.hasAttribute('aria-labelledby')) {
      lightbox.setAttribute('aria-label', 'Expanded hockey photograph');
    }
    if (!lightbox.hasAttribute('tabindex')) {
      lightbox.setAttribute('tabindex', '-1');
    }

    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    lightbox.addEventListener('touchstart', (event) => {
      const touch = event.changedTouches[0];
      lightboxTouchStartX = touch.clientX;
      lightboxTouchStartY = touch.clientY;
    }, { passive: true });

    lightbox.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - lightboxTouchStartX;
      const deltaY = touch.clientY - lightboxTouchStartY;

      if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      if (deltaX < 0) {
        showNextLightboxItem();
        return;
      }

      showPreviousLightboxItem();
    }, { passive: true });

    lightbox.addEventListener('keydown', trapLightboxFocus);
  }

  window.addEventListener('keydown', (event) => {
    if (!lightbox || !lightbox.classList.contains('open')) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNextLightboxItem();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPreviousLightboxItem();
    }
  });
};

const initNonCritical = () => {
  if (nonCriticalInitialized) {
    return;
  }

  nonCriticalInitialized = true;

  reveals.forEach((el, idx) => {
    if (reducedMotionMedia.matches) {
      el.classList.add('visible');
      return;
    }

    el.style.transitionDelay = `${idx * 35}ms`;
    revealObserver.observe(el);
  });

  bindParallax();
  bindLightbox();
};

const initNonCriticalWhenReady = () => {
  introReady.then(() => {
    initNonCritical();
  });
};

const runWhenIdle = (fn) => {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => fn(), { timeout: 2200 });
    return;
  }

  window.setTimeout(fn, 250);
};

beginIntro();
addSkipLink();
normalizeHeaderToggle();
syncMobileCollapsibleDetails();
bindHeaderCompaction();

const skipActiveIntroForPreferences = () => {
  if (!introFinished && (mobileHeaderMedia.matches || reducedMotionMedia.matches)) {
    finishIntro(true);
  }
};

if (typeof mobileHeaderMedia.addEventListener === 'function') {
  mobileHeaderMedia.addEventListener('change', skipActiveIntroForPreferences);
} else if (typeof mobileHeaderMedia.addListener === 'function') {
  mobileHeaderMedia.addListener(skipActiveIntroForPreferences);
}

const handleReducedMotionChange = () => {
  skipActiveIntroForPreferences();
  updateParallax();
  if (!reducedMotionMedia.matches) {
    bindParallax();
  }
};

if (typeof reducedMotionMedia.addEventListener === 'function') {
  reducedMotionMedia.addEventListener('change', handleReducedMotionChange);
} else if (typeof reducedMotionMedia.addListener === 'function') {
  reducedMotionMedia.addListener(handleReducedMotionChange);
}

if (isMobileViewport) {
  let slowModeTriggered = false;

  const slowModeTimer = window.setTimeout(() => {
    if (document.readyState !== 'complete') {
      slowModeTriggered = true;
      document.documentElement.classList.add('perf-defer');
    }
  }, slowLoadTimeoutMs);

  window.addEventListener(
    'load',
    () => {
      window.clearTimeout(slowModeTimer);

      if (slowModeTriggered) {
        runWhenIdle(() => {
          document.documentElement.classList.remove('perf-defer');
          initNonCriticalWhenReady();
        });
        return;
      }

      initNonCriticalWhenReady();
    },
    { once: true }
  );

  if (document.readyState === 'complete') {
    window.clearTimeout(slowModeTimer);
    initNonCriticalWhenReady();
  }
} else {
  initNonCriticalWhenReady();
}

if (mosaicItems.length > 0) {
  mosaicItems.forEach((item) => item.classList.remove('is-hidden'));
}

if (filterButtons.length > 0) {
  filterButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === 'all');
  });
}

if (quickBookingForm) {
  const updateQuickBookingDateUI = () => {
    if (!packageSelect || !endDateField || !endDateInput) {
      return;
    }

    const selectedPackage = String(packageSelect.value || '').trim().toLowerCase();
    const isSingleGame = selectedPackage === 'single game' || selectedPackage === 'individual player';

    if (isSingleGame) {
      endDateField.classList.add('is-hidden');
      endDateInput.value = '';
      endDateInput.disabled = true;
      return;
    }

    endDateField.classList.remove('is-hidden');
    endDateInput.disabled = false;
  };

  if (packageSelect) {
    packageSelect.addEventListener('change', updateQuickBookingDateUI);
    updateQuickBookingDateUI();
  }

  quickBookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = quickBookingForm.querySelector('button[type="submit"]');

    if (quickBookingStatus) {
      quickBookingStatus.textContent = 'Submitting inquiry...';
      quickBookingStatus.style.color = '#d8af6f';
    }

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const formData = new FormData(quickBookingForm);
      const response = await fetch(quickBookingForm.action, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Form submission failed with status ${response.status}`);
      }

      if (quickBookingStatus) {
        quickBookingStatus.textContent = 'Inquiry sent successfully. I will get back to you soon.';
        quickBookingStatus.style.color = '#a8e6b0';
      }

      quickBookingForm.reset();
      updateQuickBookingDateUI();
    } catch (error) {
      if (quickBookingStatus) {
        quickBookingStatus.textContent = 'Could not send right now. Please try again or email Booking@groisslhockeyphotography.com.';
        quickBookingStatus.style.color = '#ffb4b4';
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

const selectBookingPackage = (packageName) => {
  if (!packageSelect || !packageName) {
    return;
  }

  packageSelect.value = packageName;
  packageSelect.dispatchEvent(new Event('change', { bubbles: true }));
};

const scrollToBookingTarget = (selector, packageName) => {
  if (!selector) {
    return;
  }

  selectBookingPackage(packageName);
  scrollToSelector(selector);

  if (packageSelect) {
    packageSelect.focus({ preventScroll: true });
  }
};

bookingCards.forEach((card) => {
  card.addEventListener('click', () => {
    scrollToBookingTarget(card.dataset.scrollTarget, card.dataset.package);
  });

  card.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    scrollToBookingTarget(card.dataset.scrollTarget, card.dataset.package);
  });
});

const faqItems = Array.from(document.querySelectorAll('#faq details'));

const getFaqBody = (item) => item.querySelector('p');

const openFaqItem = (item) => {
  const body = getFaqBody(item);
  if (!body) {
    return;
  }

  item.open = true;
  body.style.maxHeight = '0px';
  body.style.opacity = '0';
  body.style.transform = 'translateY(-4px)';
  body.style.marginTop = '0';

  window.requestAnimationFrame(() => {
    body.style.maxHeight = `${body.scrollHeight}px`;
    body.style.opacity = '1';
    body.style.transform = 'translateY(0)';
    body.style.marginTop = '0.75rem';
  });
};

const closeFaqItem = (item) => {
  const body = getFaqBody(item);
  if (!body || !item.open) {
    return;
  }

  body.style.maxHeight = `${body.scrollHeight}px`;

  window.requestAnimationFrame(() => {
    body.style.maxHeight = '0px';
    body.style.opacity = '0';
    body.style.transform = 'translateY(-4px)';
    body.style.marginTop = '0';
  });

  const handleClose = (event) => {
    if (event.propertyName !== 'max-height') {
      return;
    }

    item.open = false;
    body.removeEventListener('transitionend', handleClose);
  };

  body.addEventListener('transitionend', handleClose);
};

const closeQuestionsEmailMenu = () => {
  if (!questionsEmailMenu) {
    return;
  }

  questionsEmailMenu.hidden = true;
  activeQuestionsLink = null;
};

const positionQuestionsEmailMenu = (anchor) => {
  if (!questionsEmailMenu || !anchor) {
    return;
  }

  const rect = anchor.getBoundingClientRect();
  const gap = 8;

  questionsEmailMenu.hidden = false;

  const menuRect = questionsEmailMenu.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.left + (rect.width / 2) - (menuRect.width / 2), window.innerWidth - menuRect.width - 8));

  let top = rect.top - menuRect.height - gap;
  if (top < 8) {
    top = rect.bottom + gap;
  }

  questionsEmailMenu.style.left = `${left}px`;
  questionsEmailMenu.style.top = `${top}px`;
};

const closeBookingEmailMenu = () => {
  if (!bookingEmailMenu) {
    return;
  }

  bookingEmailMenu.hidden = true;
  activeBookingLink = null;
};

const positionBookingEmailMenu = (anchor) => {
  if (!bookingEmailMenu || !anchor) {
    return;
  }

  const rect = anchor.getBoundingClientRect();
  const gap = 8;

  bookingEmailMenu.hidden = false;

  const menuRect = bookingEmailMenu.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.left + (rect.width / 2) - (menuRect.width / 2), window.innerWidth - menuRect.width - 8));

  let top = rect.top - menuRect.height - gap;
  if (top < 8) {
    top = rect.bottom + gap;
  }

  bookingEmailMenu.style.left = `${left}px`;
  bookingEmailMenu.style.top = `${top}px`;
};

const copyBookingEmail = async () => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(bookingEmailAddress);
    } else {
      const temp = document.createElement('textarea');
      temp.value = bookingEmailAddress;
      temp.setAttribute('readonly', '');
      temp.style.position = 'fixed';
      temp.style.left = '-9999px';
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }

    if (copyBookingButton) {
      const originalText = copyBookingButton.textContent;
      copyBookingButton.textContent = 'Copied';
      window.setTimeout(() => {
        copyBookingButton.textContent = originalText;
      }, 1100);
    }
  } catch (error) {
    if (copyBookingButton) {
      const originalText = copyBookingButton.textContent;
      copyBookingButton.textContent = 'Copy failed';
      window.setTimeout(() => {
        copyBookingButton.textContent = originalText;
      }, 1300);
    }
  }
};

const buildBookingEmailMenu = () => {
  if (bookingEmailMenu) {
    return;
  }

  bookingEmailMenu = document.createElement('div');
  bookingEmailMenu.className = 'questions-email-menu';
  bookingEmailMenu.setAttribute('role', 'menu');
  bookingEmailMenu.hidden = true;

  copyBookingButton = document.createElement('button');
  copyBookingButton.type = 'button';
  copyBookingButton.setAttribute('role', 'menuitem');
  copyBookingButton.textContent = 'Copy email address';

  openBookingMailButton = document.createElement('button');
  openBookingMailButton.type = 'button';
  openBookingMailButton.setAttribute('role', 'menuitem');
  openBookingMailButton.textContent = 'Open mail app';

  bookingEmailMenu.append(copyBookingButton, openBookingMailButton);
  document.body.appendChild(bookingEmailMenu);

  copyBookingButton.addEventListener('click', async () => {
    await copyBookingEmail();
  });

  openBookingMailButton.addEventListener('click', () => {
    closeBookingEmailMenu();
    window.location.href = `mailto:${bookingEmailAddress}`;
  });
};

const bindBookingEmailMenu = () => {
  if (bookingEmailLinks.length === 0) {
    return;
  }

  buildBookingEmailMenu();

  bookingEmailLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();

      const sameLink = activeBookingLink === link && bookingEmailMenu && !bookingEmailMenu.hidden;
      if (sameLink) {
        closeBookingEmailMenu();
        return;
      }

      activeBookingLink = link;
      positionBookingEmailMenu(link);
    });
  });

  document.addEventListener('click', (event) => {
    if (!bookingEmailMenu || bookingEmailMenu.hidden) {
      return;
    }

    const clickedBookingLink = event.target.closest('a[href="mailto:Booking@groisslhockeyphotography.com"]');
    if (clickedBookingLink || bookingEmailMenu.contains(event.target)) {
      return;
    }

    closeBookingEmailMenu();
  });

  window.addEventListener('resize', () => {
    if (!bookingEmailMenu || bookingEmailMenu.hidden || !activeBookingLink) {
      return;
    }

    positionBookingEmailMenu(activeBookingLink);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeBookingEmailMenu();
    }
  });
};

const copyQuestionsEmail = async () => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(questionsEmailAddress);
    } else {
      const temp = document.createElement('textarea');
      temp.value = questionsEmailAddress;
      temp.setAttribute('readonly', '');
      temp.style.position = 'fixed';
      temp.style.left = '-9999px';
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }

    if (copyQuestionsButton) {
      const originalText = copyQuestionsButton.textContent;
      copyQuestionsButton.textContent = 'Copied';
      window.setTimeout(() => {
        copyQuestionsButton.textContent = originalText;
      }, 1100);
    }
  } catch (error) {
    if (copyQuestionsButton) {
      const originalText = copyQuestionsButton.textContent;
      copyQuestionsButton.textContent = 'Copy failed';
      window.setTimeout(() => {
        copyQuestionsButton.textContent = originalText;
      }, 1300);
    }
  }
};

const buildQuestionsEmailMenu = () => {
  if (questionsEmailMenu) {
    return;
  }

  questionsEmailMenu = document.createElement('div');
  questionsEmailMenu.className = 'questions-email-menu';
  questionsEmailMenu.setAttribute('role', 'menu');
  questionsEmailMenu.hidden = true;

  copyQuestionsButton = document.createElement('button');
  copyQuestionsButton.type = 'button';
  copyQuestionsButton.setAttribute('role', 'menuitem');
  copyQuestionsButton.textContent = 'Copy email address';

  openMailButton = document.createElement('button');
  openMailButton.type = 'button';
  openMailButton.setAttribute('role', 'menuitem');
  openMailButton.textContent = 'Open mail app';

  questionsEmailMenu.append(copyQuestionsButton, openMailButton);
  document.body.appendChild(questionsEmailMenu);

  copyQuestionsButton.addEventListener('click', async () => {
    await copyQuestionsEmail();
  });

  openMailButton.addEventListener('click', () => {
    closeQuestionsEmailMenu();
    window.location.href = `mailto:${questionsEmailAddress}`;
  });
};

const bindQuestionsEmailMenu = () => {
  if (questionsEmailLinks.length === 0) {
    return;
  }

  buildQuestionsEmailMenu();

  questionsEmailLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();

      const sameLink = activeQuestionsLink === link && questionsEmailMenu && !questionsEmailMenu.hidden;
      if (sameLink) {
        closeQuestionsEmailMenu();
        return;
      }

      activeQuestionsLink = link;
      positionQuestionsEmailMenu(link);
    });
  });

  document.addEventListener('click', (event) => {
    if (!questionsEmailMenu || questionsEmailMenu.hidden) {
      return;
    }

    const clickedQuestionsLink = event.target.closest('a[href="mailto:questions@groisslhockeyphotography.com"]');
    if (clickedQuestionsLink || questionsEmailMenu.contains(event.target)) {
      return;
    }

    closeQuestionsEmailMenu();
  });

  window.addEventListener('resize', () => {
    if (!questionsEmailMenu || questionsEmailMenu.hidden || !activeQuestionsLink) {
      return;
    }

    positionQuestionsEmailMenu(activeQuestionsLink);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeQuestionsEmailMenu();
    }
  });
};

bindBookingEmailMenu();
bindQuestionsEmailMenu();
bindInternalAnchorScroll();

faqItems.forEach((item) => {
  const body = getFaqBody(item);
  const summary = item.querySelector('summary');

  if (!body || !summary) {
    return;
  }

  item.open = false;
  body.style.maxHeight = '0px';
  body.style.opacity = '0';
  body.style.transform = 'translateY(-4px)';
  body.style.marginTop = '0';

  summary.addEventListener('click', (event) => {
    event.preventDefault();

    const shouldOpen = !item.open;

    faqItems.forEach((other) => {
      if (other !== item) {
        closeFaqItem(other);
      }
    });

    if (shouldOpen) {
      openFaqItem(item);
    } else {
      closeFaqItem(item);
    }
  });
});

if (window.location.hash) {
  window.addEventListener(
    'load',
    () => {
      introReady.then(() => {
        scrollToSelector(window.location.hash, { behavior: 'auto' });
      });
    },
    { once: true }
  );
}




