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
const dateInputs = document.querySelectorAll('#quick-booking-form input[type="date"]');
const questionsEmailLinks = document.querySelectorAll('a[href="mailto:questions@groisslhockeyphotography.com"]');
const siteHeader = document.querySelector('.site-header');
const headerExpandToggle = document.querySelector('.header-expand-toggle');
const introOverlay = document.querySelector('.intro-overlay');
const introLogoCanvas = document.querySelector('.intro-logo-canvas');
const introLogoSource = document.querySelector('.intro-logo-source');
const internalAnchorLinks = document.querySelectorAll('a[href^="#"]');
const mobileHeaderMedia = window.matchMedia('(max-width: 640px)');
const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
const questionsEmailAddress = 'questions@groisslhockeyphotography.com';

let questionsEmailMenu = null;
let copyQuestionsButton = null;
let openMailButton = null;
let activeQuestionsLink = null;
let mobileHeaderExpanded = false;
let lightboxItems = [];
let activeLightboxIndex = -1;
let lightboxTouchStartX = 0;
let lightboxTouchStartY = 0;
let anchorScrollTimeout = null;

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
    life: randomBetween(520, 980)
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

  const dissolveStartMs = 760;
  const dissolveDurationMs = 1280;
  const totalDurationMs = dissolveStartMs + dissolveDurationMs + 360;

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

const finishIntro = () => {
  if (introFinished) {
    return;
  }

  introFinished = true;
  document.documentElement.classList.remove('intro-active');

  if (introOverlay) {
    introOverlay.classList.add('is-complete');
    window.setTimeout(() => {
      introOverlay.remove();
    }, reducedMotionMedia.matches ? 240 : 620);
  }

  resolveIntroReady();
};

const beginIntro = async () => {
  if (!introOverlay) {
    finishIntro();
    return;
  }

  if (reducedMotionMedia.matches) {
    finishIntro();
    return;
  }

  document.documentElement.classList.add('intro-active');

  try {
    const animationRan = await runIntroDustAnimation();

    if (animationRan && introOverlay) {
      introOverlay.classList.add('is-finishing');
      window.setTimeout(finishIntro, 220);
      return;
    }
  } catch (error) {
    // Fall back to a quick overlay exit if the canvas intro cannot start.
  }

  finishIntro();
};

const updateParallax = () => {
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

  const applyMobileHeaderState = () => {
    const isCompact = window.scrollY > 42;
    const isMobile = mobileHeaderMedia.matches;

    if (!isMobile || !isCompact) {
      mobileHeaderExpanded = false;
    }

    siteHeader.classList.toggle('is-compact', isCompact);
    siteHeader.classList.toggle('is-mobile-expanded', isMobile && isCompact && mobileHeaderExpanded);

    if (headerExpandToggle) {
      headerExpandToggle.setAttribute('aria-expanded', isMobile && isCompact && mobileHeaderExpanded ? 'true' : 'false');
    }

    updateHeaderOffset();
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
      if (!mobileHeaderMedia.matches || !siteHeader.classList.contains('is-compact')) {
        return;
      }

      mobileHeaderExpanded = !mobileHeaderExpanded;
      applyMobileHeaderState();
    });
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
  const scrollBehavior = options.behavior || 'smooth';
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

  showLightboxItem(activeLightboxIndex);
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};

const closeLightbox = () => {
  if (!lightbox || !lightboxImage) {
    return;
  }

  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImage.src = '';
  lightboxItems = [];
  activeLightboxIndex = -1;
  document.body.style.overflow = '';
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
    img.addEventListener('click', () => {
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
  }

  window.addEventListener('keydown', (event) => {
    if (!lightbox || !lightbox.classList.contains('open')) {
      return;
    }

    if (event.key === 'Escape') {
      closeLightbox();
      return;
    }

    if (event.key === 'ArrowRight') {
      showNextLightboxItem();
      return;
    }

    if (event.key === 'ArrowLeft') {
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
bindHeaderCompaction();

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
  dateInputs.forEach((input) => {
    input.setAttribute('inputmode', 'none');

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Tab' || event.key === 'Shift' || event.key === 'Escape') {
        return;
      }

      event.preventDefault();
    });

    const openNativePicker = () => {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      }
    };

    input.addEventListener('focus', openNativePicker);
    input.addEventListener('click', openNativePicker);
  });

  const updateQuickBookingDateUI = () => {
    if (!packageSelect || !endDateField || !endDateInput) {
      return;
    }

    const selectedPackage = String(packageSelect.value || '').trim().toLowerCase();
    const isSingleGame = selectedPackage === 'single game';

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

const scrollToBookingTarget = (selector) => {
  if (!selector) {
    return;
  }
  scrollToSelector(selector);
};

bookingCards.forEach((card) => {
  card.addEventListener('click', () => {
    scrollToBookingTarget(card.dataset.scrollTarget);
  });

  card.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    scrollToBookingTarget(card.dataset.scrollTarget);
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




