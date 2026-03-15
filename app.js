/* ===== 5-Year Diary App ===== */
(function () {
  'use strict';

  // --- Config ---
  const START_YEAR = 2026;
  const END_YEAR = 2030;
  const STORAGE_KEY = '5y_diary_entries';
  const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];
  const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);

  // --- State ---
  let currentYear = START_YEAR;
  let currentMonth = 0; // 0-indexed
  let entries = {};
  let currentEditKey = null;
  let viewMode = 'calendar'; // 'calendar' | 'fiveYear'
  let fiveYrMonth = 0; // 0-indexed
  let fiveYrDay = 1;

  // --- DOM ---
  const $ = (id) => document.getElementById(id);
  const dateRangeEl = $('dateRange');
  const currentYearEl = $('currentYear');
  const prevYearBtn = $('prevYear');
  const nextYearBtn = $('nextYear');
  const monthTabsEl = $('monthTabs');
  const diaryGridEl = $('diaryGrid');
  const weekdayHeaderEl = $('weekdayHeader');
  const modalOverlay = $('modalOverlay');
  const modalDateEl = $('modalDate');
  const modalTextarea = $('modalTextarea');
  const modalSaveBtn = $('modalSave');
  const modalDeleteBtn = $('modalDelete');
  const modalCloseBtn = $('modalClose');
  const charCountEl = $('charCount');
  const saveStatusEl = $('saveStatus');
  const toastEl = $('toast');
  const exportBtn = $('exportBtn');
  const importBtn = $('importBtn');

  // Views
  const calendarView = $('calendarView');
  const fiveYearView = $('fiveYearView');
  const fiveYearBtn = $('fiveYearBtn');
  const fiveYrDateTitle = $('fiveYrDateTitle');
  const fiveYrEntries = $('fiveYrEntries');
  const fiveYrPrevDay = $('fiveYrPrevDay');
  const fiveYrNextDay = $('fiveYrNextDay');

  // --- Persistence ---
  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      entries = raw ? JSON.parse(raw) : {};
    } catch {
      entries = {};
    }
  }

  function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function getEntryKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // --- Date Helpers ---
  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getDayOfWeek(year, month, day) {
    return new Date(year, month, day).getDay();
  }

  function getToday() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate()
    };
  }

  function formatDateKR(key) {
    const [y, m, d] = key.split('-').map(Number);
    const dow = DAYS_KR[getDayOfWeek(y, m - 1, d)];
    return `${y}년 ${m}월 ${d}일 (${dow})`;
  }

  // --- Month has entries ---
  function monthHasEntries(year, month) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    return Object.keys(entries).some(k => k.startsWith(prefix) && entries[k].trim());
  }

  // --- Render ---
  function renderHeader() {
    dateRangeEl.textContent = `${START_YEAR}년 ~ ${END_YEAR}년`;
  }

  function renderYearNav() {
    currentYearEl.textContent = currentYear;
    prevYearBtn.disabled = currentYear <= START_YEAR;
    nextYearBtn.disabled = currentYear >= END_YEAR;
  }

  function renderMonthTabs() {
    monthTabsEl.innerHTML = '';
    MONTHS.forEach((label, i) => {
      const btn = document.createElement('button');
      btn.className = 'month-tab' + (i === currentMonth ? ' active' : '');
      btn.innerHTML = label;
      if (monthHasEntries(currentYear, i)) {
        btn.innerHTML += '<span class="entry-dot"></span>';
      }
      btn.addEventListener('click', () => {
        currentMonth = i;
        renderMonthTabs();
        renderWeekdayHeader();
        renderDiaryGrid();
      });
      monthTabsEl.appendChild(btn);
    });
  }

  // --- Weekday Header ---
  function renderWeekdayHeader() {
    weekdayHeaderEl.innerHTML = '';
    DAYS_KR.forEach((day, i) => {
      const cell = document.createElement('div');
      cell.className = 'weekday-cell';
      if (i === 0) cell.classList.add('sunday');
      if (i === 6) cell.classList.add('saturday');
      cell.textContent = day;
      weekdayHeaderEl.appendChild(cell);
    });
  }

  // --- Calendar Grid (with proper weekday alignment) ---
  function renderDiaryGrid() {
    const days = getDaysInMonth(currentYear, currentMonth);
    const today = getToday();
    const firstDow = getDayOfWeek(currentYear, currentMonth, 1); // 0=Sun ... 6=Sat
    diaryGridEl.innerHTML = '';

    // Empty cells before 1st
    for (let i = 0; i < firstDow; i++) {
      const empty = document.createElement('div');
      empty.className = 'diary-card empty-cell';
      diaryGridEl.appendChild(empty);
    }

    for (let d = 1; d <= days; d++) {
      const key = getEntryKey(currentYear, currentMonth, d);
      const entry = entries[key] || '';
      const dow = getDayOfWeek(currentYear, currentMonth, d);
      const dayLabel = DAYS_KR[dow];
      const isToday = currentYear === today.year && currentMonth === today.month && d === today.day;
      const isFuture = new Date(currentYear, currentMonth, d) > new Date(today.year, today.month, today.day);

      const card = document.createElement('div');
      card.className = 'diary-card';
      if (entry.trim()) card.classList.add('has-entry');
      if (isToday) card.classList.add('today');
      if (isFuture) card.classList.add('future');

      card.style.animationDelay = `${(d - 1) * 15}ms`;

      let dayClass = 'card-day';
      if (dow === 0) dayClass += ' sunday';
      else if (dow === 6) dayClass += ' saturday';

      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-date">${d}</div>
          <div class="${dayClass}">${dayLabel}요일</div>
        </div>
        ${entry.trim()
          ? `<div class="card-preview">${escapeHtml(entry)}</div>`
          : `<div class="card-empty">✏️</div>`
        }
      `;

      card.addEventListener('click', () => openModal(key));
      diaryGridEl.appendChild(card);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===================================
  // ===== 5-Year View =====
  // ===================================

  function switchView(mode) {
    viewMode = mode;
    if (mode === 'calendar') {
      calendarView.classList.remove('hidden');
      fiveYearView.classList.add('hidden');
      fiveYearBtn.classList.remove('active');
      fiveYearBtn.querySelector('span').textContent = '5년간 일기';
    } else {
      calendarView.classList.add('hidden');
      fiveYearView.classList.remove('hidden');
      fiveYearBtn.classList.add('active');
      fiveYearBtn.querySelector('span').textContent = '달력 보기';
      renderFiveYearView();
    }
  }

  function renderFiveYearView() {
    // Clamp day to valid range for current month
    const maxDay = Math.min(
      getDaysInMonth(START_YEAR, fiveYrMonth),
      getDaysInMonth(END_YEAR, fiveYrMonth)
    );
    if (fiveYrDay > maxDay) fiveYrDay = maxDay;

    fiveYrDateTitle.textContent = `${fiveYrMonth + 1}월 ${fiveYrDay}일 일기`;
    fiveYrEntries.innerHTML = '';

    const today = getToday();

    for (let year = START_YEAR; year <= END_YEAR; year++) {
      const daysInThisMonth = getDaysInMonth(year, fiveYrMonth);
      // If this day doesn't exist in this year's month (e.g., Feb 29 in non-leap), skip
      if (fiveYrDay > daysInThisMonth) continue;

      const key = getEntryKey(year, fiveYrMonth, fiveYrDay);
      const entry = entries[key] || '';
      const dow = getDayOfWeek(year, fiveYrMonth, fiveYrDay);
      const dayLabel = DAYS_KR[dow];
      const isToday = year === today.year && fiveYrMonth === today.month && fiveYrDay === today.day;
      const isFuture = new Date(year, fiveYrMonth, fiveYrDay) > new Date(today.year, today.month, today.day);

      const card = document.createElement('div');
      card.className = 'fiveyr-card';
      if (entry.trim()) card.classList.add('has-entry');
      if (isToday) card.classList.add('is-today');
      if (isFuture) card.classList.add('is-future');
      card.style.animationDelay = `${(year - START_YEAR) * 60}ms`;

      card.innerHTML = `
        <div class="fiveyr-year-label">${year}년</div>
        <div class="fiveyr-dow">${fiveYrMonth + 1}월 ${fiveYrDay}일 ${dayLabel}요일</div>
        ${entry.trim()
          ? `<div class="fiveyr-preview">${escapeHtml(entry)}</div>`
          : `<div class="fiveyr-empty">아직 작성된 일기가 없습니다</div>`
        }
      `;

      card.addEventListener('click', () => openModal(key));
      fiveYrEntries.appendChild(card);
    }
  }

  function fiveYrNavigate(delta) {
    // Navigate by day
    const maxDay = getDaysInMonth(START_YEAR, fiveYrMonth); // use a reference year
    fiveYrDay += delta;

    if (fiveYrDay > maxDay) {
      fiveYrMonth++;
      if (fiveYrMonth > 11) {
        fiveYrMonth = 0;
      }
      fiveYrDay = 1;
    } else if (fiveYrDay < 1) {
      fiveYrMonth--;
      if (fiveYrMonth < 0) {
        fiveYrMonth = 11;
      }
      fiveYrDay = getDaysInMonth(START_YEAR, fiveYrMonth);
    }

    renderFiveYearView();
  }

  // --- Modal ---
  function openModal(key) {
    currentEditKey = key;
    modalDateEl.textContent = formatDateKR(key);
    modalTextarea.value = entries[key] || '';
    updateCharCount();
    saveStatusEl.classList.remove('visible');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => modalTextarea.focus(), 300);
  }

  function closeModal() {
    if (currentEditKey) {
      const val = modalTextarea.value;
      if ((entries[currentEditKey] || '') !== val) {
        if (val.trim()) {
          entries[currentEditKey] = val;
        } else {
          delete entries[currentEditKey];
        }
        saveEntries();
        if (viewMode === 'calendar') {
          renderMonthTabs();
          renderDiaryGrid();
        } else {
          renderFiveYearView();
        }
      }
    }
    currentEditKey = null;
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function saveCurrentEntry() {
    if (!currentEditKey) return;
    const val = modalTextarea.value;
    if (val.trim()) {
      entries[currentEditKey] = val;
    } else {
      delete entries[currentEditKey];
    }
    saveEntries();

    if (viewMode === 'calendar') {
      renderMonthTabs();
      renderDiaryGrid();
    } else {
      renderFiveYearView();
    }

    saveStatusEl.textContent = '✓ 저장됨';
    saveStatusEl.classList.add('visible');
    setTimeout(() => saveStatusEl.classList.remove('visible'), 2000);
    showToast('일기가 저장되었습니다 ✓');
  }

  function deleteCurrentEntry() {
    if (!currentEditKey) return;
    if (!entries[currentEditKey]?.trim()) {
      showToast('삭제할 내용이 없습니다');
      return;
    }
    if (confirm('이 날의 일기를 삭제하시겠습니까?')) {
      delete entries[currentEditKey];
      saveEntries();
      modalTextarea.value = '';
      updateCharCount();
      if (viewMode === 'calendar') {
        renderMonthTabs();
        renderDiaryGrid();
      } else {
        renderFiveYearView();
      }
      showToast('일기가 삭제되었습니다');
    }
  }

  function updateCharCount() {
    const len = modalTextarea.value.length;
    charCountEl.textContent = `${len.toLocaleString()}자`;
  }

  // --- Export / Import ---
  function exportDiaryEntries() {
    if (Object.keys(entries).length === 0) {
      showToast('내보낼 일기가 없습니다');
      return;
    }

    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `diary_backup_${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('백업 파일이 다운로드되었습니다 ✓');
  }

  function importDiaryEntries() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          
          // Basic validation
          if (typeof imported !== 'object' || Array.isArray(imported)) {
            throw new Error('올바른 백업 파일 형식이 아닙니다.');
          }

          if (confirm(`일기를 불러오시겠습니까? 현재 데이터와 합쳐집니다.`)) {
            entries = { ...entries, ...imported };
            saveEntries();
            
            if (viewMode === 'calendar') {
              renderMonthTabs();
              renderDiaryGrid();
            } else {
              renderFiveYearView();
            }
            
            showToast('일기를 성공적으로 불러왔습니다 ✓');
          }
        } catch (err) {
          console.error(err);
          alert('파일을 읽는 중에 오류가 발생했습니다: ' + err.message);
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }

  // --- Toast ---
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('visible');
    setTimeout(() => toastEl.classList.remove('visible'), 2500);
  }

  // --- Event Listeners ---
  prevYearBtn.addEventListener('click', () => {
    if (currentYear > START_YEAR) {
      currentYear--;
      renderYearNav();
      renderMonthTabs();
      renderWeekdayHeader();
      renderDiaryGrid();
    }
  });

  nextYearBtn.addEventListener('click', () => {
    if (currentYear < END_YEAR) {
      currentYear++;
      renderYearNav();
      renderMonthTabs();
      renderWeekdayHeader();
      renderDiaryGrid();
    }
  });

  // 5-Year View toggle
  fiveYearBtn.addEventListener('click', () => {
    if (viewMode === 'calendar') {
      // Set 5yr view to today's month/day
      const today = getToday();
      fiveYrMonth = today.month;
      fiveYrDay = today.day;
      switchView('fiveYear');
    } else {
      switchView('calendar');
    }
  });

  fiveYrPrevDay.addEventListener('click', () => fiveYrNavigate(-1));
  fiveYrNextDay.addEventListener('click', () => fiveYrNavigate(1));

  modalSaveBtn.addEventListener('click', saveCurrentEntry);
  modalDeleteBtn.addEventListener('click', deleteCurrentEntry);
  modalCloseBtn.addEventListener('click', closeModal);

  exportBtn.addEventListener('click', exportDiaryEntries);
  importBtn.addEventListener('click', importDiaryEntries);

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  modalTextarea.addEventListener('input', updateCharCount);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (modalOverlay.classList.contains('active')) {
      if (e.key === 'Escape') closeModal();
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentEntry();
      }
    }
    // Navigate 5-year view with arrow keys
    if (viewMode === 'fiveYear' && !modalOverlay.classList.contains('active')) {
      if (e.key === 'ArrowLeft') fiveYrNavigate(-1);
      if (e.key === 'ArrowRight') fiveYrNavigate(1);
    }
  });

  // --- Init ---
  function init() {
    loadEntries();

    const today = getToday();
    if (today.year >= START_YEAR && today.year <= END_YEAR) {
      currentYear = today.year;
      currentMonth = today.month;
    }

    renderHeader();
    renderYearNav();
    renderMonthTabs();
    renderWeekdayHeader();
    renderDiaryGrid();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => console.log('Service Worker registered.', reg))
          .catch((err) => console.log('Service Worker registration failed.', err));
      });
    }
  }

  init();
})();
