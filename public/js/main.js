/**
 * রক্তবার্তা (Roktobarta) - Client-side Main Script
 */

// Helper selector & Bengali digits
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const toBnDigit = (n) => String(n).replace(/\d/g, (d) => bnDigits[Number(d)]);

/* ------------------------------------------------------------------
   ১. গ্লোবাল পাসওয়ার্ড ভিজিবিলিটি টগল (Universal Password Visibility Toggle)
------------------------------------------------------------------ */
window.togglePasswordVisibility = function (inputId, btn) {
  const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  if (btn) {
    const icon = btn.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-eye', !isPass);
      icon.classList.toggle('fa-eye-slash', isPass);
    }
    btn.setAttribute('aria-label', isPass ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন');
    btn.setAttribute('title', isPass ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন');
  }
};

// গ্লোবাল ক্লিক ডেলিগেশন: যাতে CSP বা যে কোনো ব্রাউজারে বাটন ক্লিকের সাথে সাথেই কাজ করে
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.password-toggle-btn');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();

  let input = null;
  const targetId = btn.getAttribute('data-target');
  if (targetId) {
    input = document.getElementById(targetId);
  }
  if (!input) {
    const wrap = btn.closest('.password-wrap') || btn.parentElement;
    if (wrap) input = wrap.querySelector('input');
  }
  if (!input) return;

  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';

  const icon = btn.querySelector('i');
  if (icon) {
    icon.classList.toggle('fa-eye', !isPass);
    icon.classList.toggle('fa-eye-slash', isPass);
  }
  btn.setAttribute('aria-label', isPass ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন');
  btn.setAttribute('title', isPass ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন');

  input.focus();
  try {
    const len = input.value.length;
    input.setSelectionRange(len, len);
  } catch (err) {}
});

window.initAutocomplete = function (inputEl, fetchUrlOrList, onPick) {
  if (!inputEl) return;
  if (inputEl.dataset.acInitialized === 'true') return;
  inputEl.dataset.acInitialized = 'true';

  const parent = inputEl.parentElement;
  if (parent && !parent.classList.contains('relative')) {
    parent.classList.add('relative');
  }

  let box = parent ? parent.querySelector('.ac-box') : null;
  if (!box) {
    box = document.createElement('div');
    box.className = 'ac-box';
    if (parent) parent.appendChild(box);
  }

  // Ensure crucial dropdown floating styles are applied directly
  box.style.position = 'absolute';
  box.style.left = '0';
  box.style.right = '0';
  box.style.top = '100%';
  box.style.marginTop = '6px';
  box.style.zIndex = '9999';
  box.style.backgroundColor = '#ffffff';
  box.style.border = '1px solid #f3c4ca';
  box.style.borderRadius = '14px';
  box.style.boxShadow = '0 16px 40px -10px rgba(200, 16, 46, 0.35)';
  box.style.maxHeight = '260px';
  box.style.overflowY = 'auto';
  box.style.display = 'none';

  let currentIndex = -1;
  let currentResults = [];
  let requestId = 0;
  let debounceTimer = null;

  const showBox = () => {
    if (parent) parent.style.zIndex = '60';
    box.style.display = 'block';
  };

  const hideBox = () => {
    box.style.display = 'none';
    if (parent) parent.style.zIndex = '';
    currentIndex = -1;
  };

  const selectItem = (item) => {
    const val = typeof item === 'object' ? item.n : item;
    inputEl.value = val;
    hideBox();
    if (typeof onPick === 'function') onPick(item);
  };

  const highlightActive = () => {
    Array.from(box.children).forEach((child, i) => {
      const active = i === currentIndex;
      child.classList.toggle('on', active);
      if (active) {
        child.style.backgroundColor = '#fff1f2';
        child.style.color = '#c8102e';
        if (child.scrollIntoView) child.scrollIntoView({ block: 'nearest' });
      } else {
        child.style.backgroundColor = '#ffffff';
        child.style.color = '#1f2937';
      }
    });
  };

  const drawList = async () => {
    const query = inputEl.value.trim();
    const myRequest = ++requestId;
    let items = [];

    try {
      if (typeof fetchUrlOrList === 'function') {
        const res = fetchUrlOrList(query);
        items = Array.isArray(res) ? res : await res;
      } else if (typeof fetchUrlOrList === 'string') {
        const sep = fetchUrlOrList.includes('?') ? '&' : '?';
        const res = await fetch(`${fetchUrlOrList}${sep}query=${encodeURIComponent(query)}`);
        const json = await res.json();
        items = json.data || [];
      } else if (Array.isArray(fetchUrlOrList)) {
        const lowered = query.toLowerCase();
        items = fetchUrlOrList.filter((x) => {
          if (!lowered) return true;
          const val = typeof x === 'object' ? (x.n || '') : x;
          return val.toLowerCase().includes(lowered);
        });
      }
    } catch (err) {
      items = [];
    }

    if (myRequest !== requestId) return;

    currentResults = (items || []).slice(0, 50);
    box.innerHTML = '';
    currentIndex = -1;

    if (currentResults.length === 0) {
      hideBox();
      return;
    }

    currentResults.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'ac-item';
      div.style.padding = '10px 14px';
      div.style.cursor = 'pointer';
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.justifyContent = 'space-between';
      div.style.gap = '8px';
      div.style.fontSize = '14px';
      div.style.color = '#1f2937';
      div.style.backgroundColor = '#ffffff';
      div.style.borderBottom = '1px solid #fff1f2';
      div.style.transition = 'background-color 0.12s ease, color 0.12s ease';

      const nameSpan = document.createElement('span');
      nameSpan.style.fontWeight = '600';
      nameSpan.textContent = typeof item === 'object' ? item.n : item;

      const subSpan = document.createElement('small');
      subSpan.style.color = '#9a6a70';
      subSpan.style.fontSize = '12px';
      subSpan.textContent = typeof item === 'object' ? (item.s || '') : '';

      div.appendChild(nameSpan);
      div.appendChild(subSpan);

      div.addEventListener('mouseenter', () => {
        currentIndex = index;
        highlightActive();
      });

      const pickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectItem(item);
      };

      div.addEventListener('mousedown', pickHandler);
      div.addEventListener('touchstart', pickHandler, { passive: false });

      box.appendChild(div);
    });

    showBox();
  };

  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(drawList, 60);
  });

  inputEl.addEventListener('focus', () => {
    drawList();
  });

  inputEl.addEventListener('blur', () => {
    setTimeout(() => {
      hideBox();
    }, 250);
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (parent && !parent.contains(e.target)) {
      hideBox();
    }
  });

  inputEl.addEventListener('keydown', (e) => {
    if (box.style.display !== 'block') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentIndex = Math.min(currentIndex + 1, currentResults.length - 1);
      highlightActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentIndex = Math.max(currentIndex - 1, 0);
      highlightActive();
    } else if (e.key === 'Enter') {
      if (currentResults.length > 0) {
        e.preventDefault();
        const pickIdx = currentIndex >= 0 ? currentIndex : 0;
        selectItem(currentResults[pickIdx]);
      }
    } else if (e.key === 'Escape') {
      hideBox();
    }
  });
};

/* ------------------------------------------------------------------
   ২. স্বয়ংক্রিয় লোকেশন বাইন্ডার (Auto-binds any District & Upazila pair)
------------------------------------------------------------------ */
function autoBindLocations() {
  const pairs = [
    { d: 'homeDistrict', u: 'homeUpazila' },
    { d: 'regDistrict', u: 'regUpazila' },
    { d: 'reqDistrict', u: 'reqUpazila' },
    { d: 'reqFilterDistrict', u: 'reqFilterUpazila' },
    { d: 'donorFilterDistrict', u: 'donorFilterUpazila' },
    { d: 'dashDistrict', u: 'dashUpazila' }
  ];

  pairs.forEach(({ d, u }) => {
    const dInput = document.getElementById(d);
    const uInput = document.getElementById(u);

    if (dInput && !dInput.dataset.acInitialized) {
      window.initAutocomplete(
        dInput,
        async (q) => {
          try {
            const res = await fetch(`/api/locations/districts?query=${encodeURIComponent(q)}`);
            const json = await res.json();
            return json.data || [];
          } catch (e) {
            return [];
          }
        },
        (pickedItem) => {
          if (uInput) {
            uInput.value = '';
            uInput.focus();
          }
        }
      );
    }

    if (uInput && !uInput.dataset.acInitialized) {
      window.initAutocomplete(
        uInput,
        async (q) => {
          try {
            const dist = dInput ? dInput.value.trim() : '';
            const url = `/api/locations/upazilas?district=${encodeURIComponent(dist)}&query=${encodeURIComponent(q)}`;
            const res = await fetch(url);
            const json = await res.json();
            return json.data || [];
          } catch (e) {
            return [];
          }
        },
        (pickedItem) => {
          // If upazila was picked without district, auto-populate district
          if (dInput && !dInput.value.trim() && pickedItem && pickedItem.s) {
            dInput.value = pickedItem.s;
          }
        }
      );
    }
  });
}

/* ------------------------------------------------------------------
   ৩. DOMContentLoaded ইভেন্ট হ্যান্ডলার
------------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  // Auto bind location autocompletes
  autoBindLocations();

  /* ১. মোবাইল মেনু টগল */
  const menuBtn = $('#menuBtn');
  const mobileMenu = $('#mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  /* ২. স্ক্রল রিভীল অ্যানিমেশন (Intersection Observer) */
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    window.watchReveal = (container) => {
      const scope = container || document;
      scope.querySelectorAll('.reveal:not(.show)').forEach((el) => {
        revealObserver.observe(el);
      });
    };

    window.watchReveal();

    /* ৩. সংখ্যা কাউন্ট-আপ অ্যানিমেশন (data-count) */
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          countObserver.unobserve(entry.target);

          const targetNum = parseInt(entry.target.dataset.count, 10);
          if (isNaN(targetNum)) return;

          let startTime = null;
          const duration = 1800; // 1.8 seconds

          const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOutProgress = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.floor(targetNum * easeOutProgress);
            entry.target.textContent = toBnDigit(currentVal);

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              entry.target.textContent = toBnDigit(targetNum);
            }
          };

          requestAnimationFrame(step);
        });
      },
      { threshold: 0.3 }
    );

    $$('[data-count]').forEach((el) => countObserver.observe(el));
  }

  /* ৪. রক্তের গল্পের মোডাল (Story Modal) */
  const storyModal = $('#storyModal');
  const openStoryModalBtn = $('#openStoryModalBtn');
  const closeStoryModalBtn = $('#closeStoryModal');

  if (openStoryModalBtn && storyModal) {
    openStoryModalBtn.addEventListener('click', () => {
      storyModal.classList.add('open');
      storyModal.classList.remove('hidden');
    });
  }

  if (closeStoryModalBtn && storyModal) {
    closeStoryModalBtn.addEventListener('click', () => {
      storyModal.classList.remove('open');
      storyModal.classList.add('hidden');
    });
  }

  if (storyModal) {
    storyModal.addEventListener('click', (e) => {
      if (e.target === storyModal) {
        storyModal.classList.remove('open');
        storyModal.classList.add('hidden');
      }
    });
  }

  /* ৫. কুকি কনসেন্ট ব্যানার (Cookie Banner) */
  const cookieBanner = $('#cookieBanner');
  const cookieAcceptBtn = $('#cookieAcceptBtn');
  const cookieDeclineBtn = $('#cookieDeclineBtn');
  const COOKIE_STORAGE_KEY = 'roktobarta_cookie_consent_v1';

  if (cookieBanner) {
    const consent = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!consent) {
      setTimeout(() => {
        cookieBanner.classList.remove('hidden');
      }, 1000);
    }

    if (cookieAcceptBtn) {
      cookieAcceptBtn.addEventListener('click', () => {
        localStorage.setItem(COOKIE_STORAGE_KEY, 'accepted');
        cookieBanner.classList.add('hidden');
      });
    }

    if (cookieDeclineBtn) {
      cookieDeclineBtn.addEventListener('click', () => {
        localStorage.setItem(COOKIE_STORAGE_KEY, 'declined');
        cookieBanner.classList.add('hidden');
      });
    }
  }

  /* ৬. ফ্ল্যাশ মেসেজ অটো রিমুভ (Auto dismiss flash toasts) */
  const flashContainer = $('#flashContainer');
  if (flashContainer) {
    setTimeout(() => {
      flashContainer.style.opacity = '0';
      flashContainer.style.transition = 'opacity 0.6s ease';
      setTimeout(() => flashContainer.remove(), 600);
    }, 5000);
  }
});
