const reveals = document.querySelectorAll('.reveal');
const bgShots = document.querySelectorAll('.scroll-shot');
const filterButtons = document.querySelectorAll('.chip');
const mosaicItems = document.querySelectorAll('.mosaic-item');
const mosaicGrid = document.querySelector('.mosaic-grid');
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
const singleDayToggle = document.querySelector('#single-day-toggle');
const singleDayToggleLabel = document.querySelector('.quick-booking-checkbox');

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

reveals.forEach((el, idx) => {
  el.style.transitionDelay = `${idx * 35}ms`;
  revealObserver.observe(el);
});

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

bgShots.forEach((shot) => {
  bgObserver.observe(shot);
});

let ticking = false;

const updateParallax = () => {
  const y = window.scrollY;

  bgShots.forEach((shot) => {
    const speed = Number(shot.dataset.speed || 0.05) * 1.35;
    const offset = y * speed;
    shot.style.setProperty('--scroll', `${offset}px`);
  });

  ticking = false;
};

window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(updateParallax);
    ticking = true;
  }
}, { passive: true });

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
    if (!packageSelect || !endDateField || !endDateInput || !singleDayToggle || !singleDayToggleLabel) {
      return;
    }

    const isSingleGame = packageSelect.value === 'Single Game';
    const singleDayChecked = singleDayToggle.checked;

    if (isSingleGame) {
      singleDayToggle.checked = true;
      singleDayToggleLabel.hidden = true;
      endDateField.hidden = true;
      endDateInput.value = '';
      endDateInput.disabled = true;
      return;
    }

    singleDayToggleLabel.hidden = false;
    endDateInput.disabled = false;
    endDateField.hidden = singleDayChecked;

    if (singleDayChecked) {
      endDateInput.value = '';
    }
  };

  if (packageSelect && singleDayToggle) {
    packageSelect.addEventListener('change', updateQuickBookingDateUI);
    singleDayToggle.addEventListener('change', updateQuickBookingDateUI);
    updateQuickBookingDateUI();
  }

  quickBookingForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!quickBookingForm.checkValidity()) {
      quickBookingForm.reportValidity();
      return;
    }

    const formData = new FormData(quickBookingForm);
    const packageName = String(formData.get('package') || 'General Inquiry').trim();
    const subject = `Booking Inquiry - ${packageName}`;

    const lines = [
      `Name: ${String(formData.get('full_name') || '').trim()}`,
      `Email: ${String(formData.get('email') || '').trim()}`,
      `Team: ${String(formData.get('team') || '').trim() || 'N/A'}`,
      `Package: ${packageName}`,
      (() => {
        const startDate = String(formData.get('start_date') || '').trim();
        const endDate = String(formData.get('end_date') || '').trim();
        const singleDayEvent = packageName === 'Single Game' || Boolean(formData.get('single_day'));
        const dateRange = singleDayEvent
          ? (startDate || 'N/A')
          : (startDate && endDate ? `${startDate} to ${endDate}` : (startDate || endDate || 'N/A'));
        return `Game Date(s): ${dateRange}`;
      })(),
      `Rink/Location: ${String(formData.get('rink') || '').trim() || 'N/A'}`,
      '',
      'Notes:',
      String(formData.get('notes') || '').trim()
    ];

    const body = lines.join('\n');
    const mailto = `mailto:Booking@groisslhockeyphotography.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (quickBookingStatus) {
      quickBookingStatus.textContent = 'Opening your email app with your pre-filled inquiry...';
    }

    window.location.href = mailto;
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

updateParallax();

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



