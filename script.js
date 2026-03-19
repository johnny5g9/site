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
const introSceneCanvas = document.querySelector('.intro-scene');
const introLogoSource = document.querySelector('.intro-logo-source');
const introTagline = document.querySelector('.intro-tagline');
const internalAnchorLinks = document.querySelectorAll('a[href^="#"]');
const mobileHeaderMedia = window.matchMedia('(max-width: 640px)');
const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
const questionsEmailAddress = 'questions@groisslhockeyphotography.com';
const introTaglineText = 'Hockey moves fast, and so do I';

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

const createAmbientIntroParticle = (width, height, dpr, x = randomBetween(0, width), y = randomBetween(0, height)) => ({
  x,
  y,
  radius: randomBetween(0.8, 2.2) * dpr,
  alpha: randomBetween(0.05, 0.2),
  vx: randomBetween(-5.5, 5.5) * dpr,
  vy: randomBetween(-7.5, 1.5) * dpr,
  sway: randomBetween(1.4, 4.8) * dpr,
  phase: randomBetween(0, Math.PI * 2)
});

const createIntroDisintegrationParticle = (state, sample) => ({
  x: sample.x,
  y: sample.y,
  radius: Math.max(1, sample.size * randomBetween(0.45, 0.9)),
  alpha: randomBetween(0.14, 0.28) * sample.opacity,
  vx: ((sample.dirX * randomBetween(10, 22)) + randomBetween(-9, 10)) * state.dpr,
  vy: ((sample.dirY * randomBetween(8, 20)) - randomBetween(3, 16)) * state.dpr,
  drift: randomBetween(4, 10) * state.dpr,
  phase: randomBetween(0, Math.PI * 2),
  age: 0,
  life: randomBetween(820, 1460)
});

const drawIntroSoftParticle = (ctx, x, y, radius, alpha) => {
  const outerRadius = radius * 2.35;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, outerRadius);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
  gradient.addColorStop(0.35, `rgba(255, 255, 255, ${alpha * 0.42})`);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
  ctx.fill();
};

const updateIntroTaglineText = (elapsed, timeline) => {
  if (!introTagline) {
    return;
  }

  const typingProgress = clamp((elapsed - timeline.textStartMs) / timeline.textCharacterMs, 0, introTaglineText.length);
  const typedLength = elapsed < timeline.textStartMs ? 0 : Math.min(introTaglineText.length, Math.floor(typingProgress));
  let opacity = 0;

  if (typedLength > 0) {
    opacity = 0.78;
  }

  if (elapsed >= timeline.textFadeStartMs) {
    opacity *= 1 - clamp((elapsed - timeline.textFadeStartMs) / timeline.textFadeDurationMs, 0, 1);
  }

  introTagline.textContent = introTaglineText.slice(0, typedLength);
  introTagline.style.opacity = opacity.toFixed(3);
};

const buildIntroAtmosphereScene = () => {
  if (!introOverlay || !introSceneCanvas || !introLogoSource) {
    return null;
  }

  const rect = introOverlay.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    return null;
  }

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  introSceneCanvas.width = width;
  introSceneCanvas.height = height;

  const ctx = introSceneCanvas.getContext('2d');
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

  const breakCanvas = document.createElement('canvas');
  breakCanvas.width = width;
  breakCanvas.height = height;
  const breakCtx = breakCanvas.getContext('2d');

  if (!sourceCtx || !logoCtx || !maskedCtx || !breakCtx) {
    return null;
  }

  const logoMaxWidth = Math.min(width * (mobileHeaderMedia.matches ? 0.62 : 0.42), 560 * dpr);
  const logoMaxHeight = Math.min(height * (mobileHeaderMedia.matches ? 0.23 : 0.28), 340 * dpr);
  const scale = Math.min(logoMaxWidth / introLogoSource.naturalWidth, logoMaxHeight / introLogoSource.naturalHeight);
  const drawWidth = Math.max(1, Math.round(introLogoSource.naturalWidth * scale));
  const drawHeight = Math.max(1, Math.round(introLogoSource.naturalHeight * scale));
  const drawX = Math.round((width - drawWidth) / 2);
  const drawY = Math.round((height - drawHeight) * 0.35);

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
  const centerX = drawX + (drawWidth / 2);
  const centerY = drawY + (drawHeight / 2);
  const samples = [];

  for (let y = drawY; y < drawY + drawHeight; y += sampleStep) {
    for (let x = drawX; x < drawX + drawWidth; x += sampleStep) {
      const pixelIndex = ((y * width) + x) * 4;
      const alpha = logoPixels.data[pixelIndex + 3];

      if (alpha < 28) {
        continue;
      }

      const leftAlpha = x > 0 ? logoPixels.data[pixelIndex - 1] : 0;
      const rightAlpha = x < width - 1 ? logoPixels.data[pixelIndex + 7] : 0;
      const topAlpha = y > 0 ? logoPixels.data[pixelIndex - (width * 4) + 3] : 0;
      const bottomAlpha = y < height - 1 ? logoPixels.data[pixelIndex + (width * 4) + 3] : 0;
      const edgeOpen = leftAlpha < 18 || rightAlpha < 18 || topAlpha < 18 || bottomAlpha < 18;
      const dirX = (x - centerX) / Math.max(1, drawWidth * 0.5);
      const dirY = (y - centerY) / Math.max(1, drawHeight * 0.5);
      const radial = clamp(Math.hypot(dirX, dirY), 0, 1.3);
      const edgeStrength = clamp((edgeOpen ? 0.7 : 0) + (((radial - 0.42) / 0.58) * 0.75), 0, 1);
      const trigger = clamp(((1 - edgeStrength) * 0.78) + randomBetween(-0.08, 0.1), 0, 1);

      samples.push({
        x: x + randomBetween(-sampleStep * 0.25, sampleStep * 0.25),
        y: y + randomBetween(-sampleStep * 0.25, sampleStep * 0.25),
        size: Math.max(1, sampleStep * randomBetween(0.5, 1)),
        opacity: clamp(alpha / 255, 0.22, 1),
        dirX: Math.abs(dirX) < 0.05 ? randomBetween(-0.24, 0.24) : dirX,
        dirY: Math.abs(dirY) < 0.05 ? randomBetween(-0.3, 0.1) : dirY,
        trigger
      });
    }
  }

  samples.sort((left, right) => left.trigger - right.trigger);

  const ambientCount = clamp(Math.round((rect.width * rect.height) / 13000), 85, 150);

  return {
    ctx,
    width,
    height,
    dpr,
    logoCanvas,
    maskedCanvas,
    maskedCtx,
    breakCanvas,
    breakCtx,
    samples,
    nextSampleIndex: 0,
    ambientParticles: Array.from({ length: ambientCount }, () => createAmbientIntroParticle(width, height, dpr)),
    disintegrationParticles: [],
    logoCenterX: centerX,
    logoCenterY: centerY,
    logoRadius: Math.max(drawWidth, drawHeight) * 0.42
  };
};

const updateAmbientIntroParticles = (state, deltaMs, time) => {
  const deltaSeconds = deltaMs / 1000;
  const margin = 32 * state.dpr;

  for (const particle of state.ambientParticles) {
    const swayX = Math.sin((time * 0.00022) + particle.phase) * particle.sway;
    const swayY = Math.cos((time * 0.00018) + particle.phase) * particle.sway * 0.3;
    particle.x += (particle.vx + swayX) * deltaSeconds;
    particle.y += (particle.vy + swayY) * deltaSeconds;

    if (particle.x < -margin) {
      particle.x = state.width + margin;
    } else if (particle.x > state.width + margin) {
      particle.x = -margin;
    }

    if (particle.y < -margin) {
      particle.y = state.height + margin;
    } else if (particle.y > state.height + margin) {
      particle.y = -margin;
    }
  }
};

const releaseIntroDisintegration = (state, dissolveProgress) => {
  while (
    state.nextSampleIndex < state.samples.length
    && state.samples[state.nextSampleIndex].trigger <= dissolveProgress
  ) {
    const sample = state.samples[state.nextSampleIndex];
    state.nextSampleIndex += 1;

    state.disintegrationParticles.push(createIntroDisintegrationParticle(state, sample));

    if (sample.size > 1.2 && Math.random() > 0.58) {
      const secondary = createIntroDisintegrationParticle(state, sample);
      secondary.radius *= 0.8;
      secondary.alpha *= 0.8;
      state.disintegrationParticles.push(secondary);
    }

    drawIntroSoftParticle(
      state.breakCtx,
      sample.x,
      sample.y,
      sample.size * 0.9,
      0.18 * sample.opacity
    );
  }
};

const updateIntroDisintegrationParticles = (state, deltaMs, time) => {
  const deltaSeconds = deltaMs / 1000;
  const activeParticles = [];
  const margin = 36 * state.dpr;

  for (const particle of state.disintegrationParticles) {
    particle.age += deltaMs;
    const ageProgress = particle.age / particle.life;

    if (ageProgress >= 1) {
      continue;
    }

    const driftX = Math.sin((time * 0.00032) + particle.phase) * particle.drift;
    const driftY = Math.cos((time * 0.00028) + particle.phase) * particle.drift * 0.28;
    particle.x += (particle.vx + driftX) * deltaSeconds;
    particle.y += (particle.vy + driftY) * deltaSeconds;

    if (
      particle.x < -margin
      || particle.x > state.width + margin
      || particle.y < -margin
      || particle.y > state.height + margin
    ) {
      continue;
    }

    activeParticles.push(particle);
  }

  state.disintegrationParticles = activeParticles;
};

const drawIntroLogo = (state, introProgress, dissolveProgress, sceneOpacity) => {
  if (introProgress <= 0.001) {
    return;
  }

  state.maskedCtx.clearRect(0, 0, state.width, state.height);
  state.maskedCtx.globalCompositeOperation = 'source-over';
  state.maskedCtx.drawImage(state.logoCanvas, 0, 0);

  if (dissolveProgress > 0) {
    state.maskedCtx.globalCompositeOperation = 'destination-out';
    state.maskedCtx.drawImage(state.breakCanvas, 0, 0);
    state.maskedCtx.globalCompositeOperation = 'source-over';
  }

  const dissolveFade = dissolveProgress < 0.72
    ? 1
    : 1 - clamp((dissolveProgress - 0.72) / 0.28, 0, 1);
  const alpha = easeInOutCubic(introProgress) * dissolveFade * sceneOpacity;

  if (alpha <= 0.001) {
    return;
  }

  const glowRadius = state.logoRadius * (1.3 + (introProgress * 0.08));
  const glow = state.ctx.createRadialGradient(
    state.logoCenterX,
    state.logoCenterY,
    0,
    state.logoCenterX,
    state.logoCenterY,
    glowRadius
  );
  glow.addColorStop(0, `rgba(255, 255, 255, ${0.1 * introProgress * sceneOpacity})`);
  glow.addColorStop(0.5, `rgba(255, 255, 255, ${0.035 * introProgress * sceneOpacity})`);
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');

  state.ctx.fillStyle = glow;
  state.ctx.beginPath();
  state.ctx.arc(state.logoCenterX, state.logoCenterY, glowRadius, 0, Math.PI * 2);
  state.ctx.fill();

  state.ctx.save();
  state.ctx.globalAlpha = alpha;
  state.ctx.translate(0, (1 - introProgress) * 14 * state.dpr);
  state.ctx.drawImage(state.maskedCanvas, 0, 0);
  state.ctx.restore();
};

const drawIntroAtmosphere = (state, sceneOpacity) => {
  for (const particle of state.ambientParticles) {
    drawIntroSoftParticle(state.ctx, particle.x, particle.y, particle.radius, particle.alpha * sceneOpacity);
  }
};

const drawIntroDisintegrationParticles = (state, sceneOpacity) => {
  for (const particle of state.disintegrationParticles) {
    const ageProgress = clamp(particle.age / particle.life, 0, 1);
    const alpha = particle.alpha * (1 - easeOutCubic(ageProgress)) * sceneOpacity;

    if (alpha <= 0.008) {
      continue;
    }

    drawIntroSoftParticle(
      state.ctx,
      particle.x,
      particle.y,
      particle.radius * (1 - (ageProgress * 0.14)),
      alpha
    );
  }
};

const renderIntroAtmosphereScene = (state, deltaMs, elapsed, timeline) => {
  const introProgress = clamp((elapsed - timeline.logoFadeStartMs) / timeline.logoFadeDurationMs, 0, 1);
  const dissolveProgress = easeInOutCubic(
    clamp((elapsed - timeline.dissolveStartMs) / timeline.dissolveDurationMs, 0, 1)
  );
  const sceneOpacity = 1 - clamp((elapsed - timeline.sceneFadeStartMs) / timeline.sceneFadeDurationMs, 0, 1);

  updateAmbientIntroParticles(state, deltaMs, elapsed);

  if (dissolveProgress > 0) {
    releaseIntroDisintegration(state, dissolveProgress);
  }

  updateIntroDisintegrationParticles(state, deltaMs, elapsed);

  state.ctx.clearRect(0, 0, state.width, state.height);
  drawIntroAtmosphere(state, sceneOpacity);
  drawIntroLogo(state, introProgress, dissolveProgress, sceneOpacity);
  drawIntroDisintegrationParticles(state, sceneOpacity);
  updateIntroTaglineText(elapsed, timeline);
};

const runIntroDustAnimation = async () => {
  if (!introOverlay || !introSceneCanvas || !introLogoSource) {
    return false;
  }

  await waitForImage(introLogoSource);

  const state = buildIntroAtmosphereScene();
  if (!state) {
    return false;
  }

  if (introTagline) {
    introTagline.textContent = '';
    introTagline.style.opacity = '0';
  }

  const timeline = {
    logoFadeStartMs: 120,
    logoFadeDurationMs: 860,
    textStartMs: 960,
    textCharacterMs: 42,
    textHoldMs: 520,
    textFadeDurationMs: 360
  };

  timeline.textFadeStartMs = timeline.textStartMs + (introTaglineText.length * timeline.textCharacterMs) + timeline.textHoldMs;
  timeline.dissolveStartMs = timeline.textFadeStartMs;
  timeline.dissolveDurationMs = 1120;
  timeline.sceneFadeStartMs = timeline.dissolveStartMs + timeline.dissolveDurationMs - 160;
  timeline.sceneFadeDurationMs = 280;
  timeline.totalDurationMs = timeline.sceneFadeStartMs + timeline.sceneFadeDurationMs;

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

      renderIntroAtmosphereScene(state, deltaMs, elapsed, timeline);

      if (elapsed < timeline.totalDurationMs || state.disintegrationParticles.length > 0) {
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
  document.documentElement.classList.add('site-entering');
  document.documentElement.classList.remove('intro-active');

  if (introOverlay) {
    introOverlay.classList.add('is-complete');
    window.setTimeout(() => {
      introOverlay.remove();
    }, reducedMotionMedia.matches ? 130 : 300);
  }

  window.setTimeout(() => {
    document.documentElement.classList.remove('site-entering');
  }, reducedMotionMedia.matches ? 130 : 520);

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

    if (animationRan) {
      window.setTimeout(finishIntro, 36);
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




