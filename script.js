const reveals = document.querySelectorAll('.reveal');
const bgShots = document.querySelectorAll('.scroll-shot');
const filterButtons = document.querySelectorAll('.chip');
const mosaicItems = document.querySelectorAll('.mosaic-item');
const lightboxTargets = document.querySelectorAll('.lightboxable');
const lightbox = document.querySelector('#lightbox');
const lightboxImage = document.querySelector('.lightbox-image');
const lightboxClose = document.querySelector('.lightbox-close');
const bookingCards = document.querySelectorAll('.booking-option[data-scroll-target]');
const quickBookingForm = document.querySelector('#quick-booking-form');
const quickBookingStatus = document.querySelector('.quick-booking-status');
const packageSelect = document.querySelector('#quick-booking-form select[name="package"]');
const endDateField = document.querySelector('#end-date-field');
const endDateInput = document.querySelector('#end-date-input');
const dateInputs = document.querySelectorAll('#quick-booking-form input[type="date"]');

const hasBgShots = bgShots.length > 0;
const isMobileViewport = window.matchMedia('(max-width: 900px)').matches;
const slowLoadTimeoutMs = 2500;

let nonCriticalInitialized = false;
let lightboxBound = false;
let parallaxBound = false;
let ticking = false;
let lastScrollY = -1;

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

const openLightbox = (src, alt) => {
  if (!lightbox || !lightboxImage) {
    return;
  }

  lightboxImage.src = src;
  lightboxImage.alt = alt || 'Expanded gallery image';
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
  document.body.style.overflow = '';
};

const bindLightbox = () => {
  if (lightboxBound) {
    return;
  }

  lightboxBound = true;

  lightboxTargets.forEach((img) => {
    img.addEventListener('click', () => {
      openLightbox(img.currentSrc || img.src, img.alt);
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightbox) {
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeLightbox();
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

const runWhenIdle = (fn) => {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => fn(), { timeout: 2200 });
    return;
  }

  window.setTimeout(fn, 250);
};

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
          initNonCritical();
        });
        return;
      }

      initNonCritical();
    },
    { once: true }
  );

  if (document.readyState === 'complete') {
    window.clearTimeout(slowModeTimer);
    initNonCritical();
  }
} else {
  initNonCritical();
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

  const target = document.querySelector(selector);
  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
