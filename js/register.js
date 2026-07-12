// ============================================
// تسجيل الطلاب - المنطق الرئيسي
// ============================================

const API_BASE_URL = 'https://lessonsbooking.runasp.net/api';

let activeGroups = [];
let currentStep = 1;
let selectedGroupId = null;

const els = {
  fullName: document.getElementById('fullName'),
  phone: document.getElementById('phone'),
  parentPhone: document.getElementById('parentPhone'),
  email: document.getElementById('email'),
};

// ---------- تحميل المجموعات المتاحة ----------
async function loadActiveGroups() {
  try {
    const res = await fetch(`${API_BASE_URL}/groups/active`, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error();
    const data = await res.json();
    activeGroups = Array.isArray(data) ? data : [];
  } catch (err) {
    document.getElementById('groupsContainer').innerHTML =
      '<div class="empty-state">تعذر تحميل المجموعات المتاحة الآن، من فضلك أعد تحميل الصفحة.</div>';
  }
}
loadActiveGroups();

// ---------- التنقل بين الخطوات ----------
function goToStep(step) {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + step).classList.add('active');

  [1, 2, 3].forEach(n => {
    const dot = document.getElementById('dot-' + n);
    dot.classList.remove('active', 'done');
    if (n < step) dot.classList.add('done');
    else if (n === step) dot.classList.add('active');
  });

  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setFieldError(fieldId, show) {
  const field = document.getElementById(fieldId);
  field.classList.toggle('has-error', show);
  const err = field.querySelector('.field-error');
  if (err) err.classList.toggle('show', show);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function isValidPhone(value) {
  return /^[0-9]{8,15}$/.test(value.trim());
}

// ---------- خطوة 1: البيانات الشخصية ----------
document.getElementById('toStep2Btn').addEventListener('click', () => {
  let valid = true;

  const fullNameOk = els.fullName.value.trim().length >= 3;
  setFieldError('fieldFullName', !fullNameOk);
  if (!fullNameOk) valid = false;

  const phoneOk = isValidPhone(els.phone.value);
  setFieldError('fieldPhone', !phoneOk);
  if (!phoneOk) valid = false;

  const parentPhoneOk = isValidPhone(els.parentPhone.value);
  setFieldError('fieldParentPhone', !parentPhoneOk);
  if (!parentPhoneOk) valid = false;

  const emailOk = isValidEmail(els.email.value.trim());
  setFieldError('fieldEmail', !emailOk);
  if (!emailOk) valid = false;

  if (valid) goToStep(2);
});

document.getElementById('backToStep1Btn').addEventListener('click', () => goToStep(1));

// ---------- خطوة 2: النوع ----------
document.getElementById('toStep3Btn').addEventListener('click', () => {
  const gender = document.querySelector('input[name="gender"]:checked');
  document.getElementById('genderError').classList.toggle('show', !gender);
  if (!gender) return;
  renderGroups(gender.value);
  goToStep(3);
});

document.getElementById('backToStep2Btn').addEventListener('click', () => goToStep(2));

// ---------- خطوة 3: اختيار المجموعة ----------
function renderGroups(gender) {
  const container = document.getElementById('groupsContainer');
  selectedGroupId = null;

  if (!activeGroups.length) {
    container.innerHTML = '<div class="empty-state">لا توجد مجموعات متاحة حاليًا، من فضلك تواصل معنا.</div>';
    return;
  }

  const isMale = gender === 'Male';
  const sorted = [...activeGroups].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  container.innerHTML = `<div class="group-list">${sorted.map(g => {
    const capacity = isMale ? g.maleCapacity : g.femaleCapacity;
    const count = isMale ? g.maleCount : g.femaleCount;
    const isFull = capacity > 0 ? count >= capacity : true;
    const seatsLeft = Math.max(0, capacity - count);

    return `
      <label class="group-option">
        <input type="radio" name="group" value="${g.id}" ${isFull ? 'disabled' : ''}>
        <div class="group-card">
          <div class="group-icon">📚</div>
          <div class="group-info">
            <div class="g-name">${escapeHtml(g.name)}</div>
            <div class="g-meta">${escapeHtml(g.days)} &middot; ${escapeHtml(g.time)}</div>
          </div>
         
        </div>
      </label>`;
  }).join('')}</div>`;

  container.querySelectorAll('input[name="group"]').forEach(input => {
    input.addEventListener('change', () => {
      selectedGroupId = input.value;
      document.getElementById('groupError').classList.remove('show');
    });
  });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

// ---------- الإرسال النهائي ----------
document.getElementById('regForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const gender = document.querySelector('input[name="gender"]:checked');
  const groupInput = document.querySelector('input[name="group"]:checked');
  const globalMsg = document.getElementById('globalMsg');
  globalMsg.classList.remove('show');

  if (!gender) { goToStep(2); return; }
  if (!groupInput) {
    document.getElementById('groupError').classList.add('show');
    return;
  }

  const payload = {
    fullName: els.fullName.value.trim(),
    phone: els.phone.value.trim(),
    parentPhone: els.parentPhone.value.trim(),
    email: els.email.value.trim(),
    gender: gender.value,
    groupId: Number(groupInput.value)
  };

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span>';

  try {
    const res = await fetch(`${API_BASE_URL}/students/register`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let message = 'حدث خطأ أثناء تسجيل بياناتك، من فضلك حاول مرة أخرى.';
      try {
        const errData = await res.json();
        const raw = typeof errData === 'string' ? errData : (errData.message || errData.title || '');
        if (raw && /email|بريد/i.test(raw)) {
          message = 'هذا البريد الإلكتروني مسجل من قبل، من فضلك استخدم بريدًا آخر.';
          setFieldError('fieldEmail', true);
          document.getElementById('emailError').textContent = message;
          goToStep(1);
        } else if (raw) {
          message = raw;
        }
      } catch (parseErr) { /* تجاهل */ }

      globalMsg.textContent = message;
      globalMsg.className = 'form-msg show error';
      submitBtn.disabled = false;
      submitBtn.textContent = 'تأكيد الحجز';
      return;
    }

    sessionStorage.setItem('studentName', payload.fullName);
    window.location.href = 'thanks.html';
  } catch (networkErr) {
    globalMsg.textContent = 'تعذر الاتصال بالسيرفر، تحقق من الإنترنت وحاول مرة أخرى.';
    globalMsg.className = 'form-msg show error';
    submitBtn.disabled = false;
    submitBtn.textContent = 'تأكيد الحجز';
  }
});

// إعادة تفعيل زر الإرسال بنصه الأصلي عند الرجوع لأي خطوة
['backToStep1Btn', 'backToStep2Btn'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    submitBtn.textContent = 'تأكيد الحجز';
  });
});
