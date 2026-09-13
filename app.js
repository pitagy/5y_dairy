/* ===== 5-Year Diary App ===== */
(function () {
  'use strict';

  // --- Config & Constants ---
  const STORAGE_KEY = '5y_diary_entries';
  const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];
  const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);

  // --- State ---
  const today = getToday();
  let currentYear = today.year;
  let currentMonth = today.month; // 0-indexed
  let entries = {};
  let currentEditKey = null;
  let viewMode = 'calendar'; // 'calendar' | 'fiveYear'

  // Multi-Year View State (기본: 현재 기준 5년 전 ~ 올해, 예: 2022~2026)
  let fiveYrMonth = today.month; // 0-indexed
  let fiveYrDay = today.day;
  let fiveYrStartYear = today.year - 4;
  let fiveYrEndYear = today.year;
  let currentPreset = '5'; // '3' | '5' | '10' | 'all' | 'custom'

  // --- DOM Elements ---
  const $ = (id) => document.getElementById(id);
  const dateRangeEl = $('dateRange');
  const currentYearEl = $('currentYear');
  const prevYearBtn = $('prevYear');
  const nextYearBtn = $('nextYear');
  const yearSelectBtn = $('yearSelectBtn');
  const yearDropdownMenu = $('yearDropdownMenu');
  const calTodayBtn = $('calTodayBtn');
  const monthTabsEl = $('monthTabs');
  const diaryGridEl = $('diaryGrid');
  const weekdayHeaderEl = $('weekdayHeader');

  // Modal
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

  // Views & Controls
  const calendarView = $('calendarView');
  const fiveYearView = $('fiveYearView');
  const fiveYearBtn = $('fiveYearBtn');
  const fiveYrDateTitle = $('fiveYrDateTitle');
  const fiveYrEntries = $('fiveYrEntries');
  const fiveYrPrevDay = $('fiveYrPrevDay');
  const fiveYrNextDay = $('fiveYrNextDay');
  const fiveYrTodayBtn = $('fiveYrTodayBtn');
  const fiveYrDatePickerBtn = $('fiveYrDatePickerBtn');
  const datePickerPopup = $('datePickerPopup');
  const datePickerMonth = $('datePickerMonth');
  const datePickerDay = $('datePickerDay');
  const datePickerApply = $('datePickerApply');

  // Multi-Year Controls
  const presetChips = $('presetChips');
  const startYearSelect = $('startYearSelect');
  const endYearSelect = $('endYearSelect');

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

  // --- Recorded Years Helpers ---
  function getRecordedYears() {
    const years = new Set();
    years.add(today.year);
    Object.keys(entries).forEach(key => {
      const parts = key.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => a - b);
  }

  function getYearRangeOptions() {
    const recorded = getRecordedYears();
    const minRecorded = Math.min(...recorded, today.year - 10);
    const maxRecorded = Math.max(...recorded, today.year + 10);
    const min = Math.min(minRecorded, 2015);
    const max = Math.max(maxRecorded, 2035);

    const list = [];
    for (let y = min; y <= max; y++) {
      list.push(y);
    }
    return list;
  }

  // --- Populate Year Dropdowns ---
  function updateYearDropdowns() {
    const yearOptions = getYearRangeOptions();

    // 1. Start / End Year Selects in 5-Year View
    startYearSelect.innerHTML = '';
    endYearSelect.innerHTML = '';

    yearOptions.forEach(y => {
      const opt1 = document.createElement('option');
      opt1.value = y;
      opt1.textContent = `${y}년`;
      if (y === fiveYrStartYear) opt1.selected = true;
      startYearSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = y;
      opt2.textContent = `${y}년`;
      if (y === fiveYrEndYear) opt2.selected = true;
      endYearSelect.appendChild(opt2);
    });

    // 2. Calendar Year Jump Menu
    yearDropdownMenu.innerHTML = '';
    const calMin = Math.min(currentYear - 6, today.year - 8, 2018);
    const calMax = Math.max(currentYear + 6, today.year + 8, 2032);

    for (let y = calMin; y <= calMax; y++) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'year-dropdown-item' + (y === currentYear ? ' active' : '');
      if (y === today.year) {
        item.innerHTML = `<span>${y}년</span><span class="year-badge">올해</span>`;
      } else {
        item.textContent = `${y}년`;
      }
      item.addEventListener('click', () => {
        currentYear = y;
        yearDropdownMenu.classList.add('hidden');
        renderYearNav();
        renderMonthTabs();
        renderWeekdayHeader();
        renderDiaryGrid();
        renderHeader();
      });
      yearDropdownMenu.appendChild(item);
    }
  }

  // --- Month has entries check ---
  function monthHasEntries(year, month) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    return Object.keys(entries).some(k => k.startsWith(prefix) && entries[k].trim());
  }

  // --- Header Render ---
  function renderHeader() {
    if (viewMode === 'calendar') {
      dateRangeEl.textContent = `${currentYear}년 ${currentMonth + 1}월 달력`;
    } else {
      const count = Math.max(0, fiveYrEndYear - fiveYrStartYear + 1);
      dateRangeEl.textContent = `${fiveYrStartYear}년 ~ ${fiveYrEndYear}년 (${count}개년 기록 보기)`;
    }
  }

  // --- Calendar Navigation ---
  function renderYearNav() {
    currentYearEl.textContent = `${currentYear}년`;
    prevYearBtn.disabled = false;
    nextYearBtn.disabled = false;
  }

  function renderMonthTabs() {
    monthTabsEl.innerHTML = '';
    MONTHS.forEach((label, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'month-tab' + (i === currentMonth ? ' active' : '');
      btn.innerHTML = label;
      if (monthHasEntries(currentYear, i)) {
        btn.innerHTML += '<span class="entry-dot" title="작성된 일기 있음"></span>';
      }
      btn.addEventListener('click', () => {
        currentMonth = i;
        renderMonthTabs();
        renderWeekdayHeader();
        renderDiaryGrid();
        renderHeader();
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

  // --- Calendar Grid ---
  function renderDiaryGrid() {
    const days = getDaysInMonth(currentYear, currentMonth);
    const curToday = getToday();
    const firstDow = getDayOfWeek(currentYear, currentMonth, 1);
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
      const isToday = currentYear === curToday.year && currentMonth === curToday.month && d === curToday.day;
      const isFuture = new Date(currentYear, currentMonth, d) > new Date(curToday.year, curToday.month, curToday.day);

      const card = document.createElement('div');
      card.className = 'diary-card';
      if (entry.trim()) card.classList.add('has-entry');
      if (isToday) card.classList.add('today');
      if (isFuture) card.classList.add('future');

      card.style.animationDelay = `${(d - 1) * 12}ms`;

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
  // ===== Multi-Year (5-Year) View =====
  // ===================================

  function switchView(mode) {
    viewMode = mode;
    if (mode === 'calendar') {
      calendarView.classList.remove('hidden');
      fiveYearView.classList.add('hidden');
      fiveYearBtn.classList.remove('active');
      fiveYearBtn.querySelector('span').textContent = '5년간 일기';
      renderHeader();
      renderMonthTabs();
      renderDiaryGrid();
    } else {
      calendarView.classList.add('hidden');
      fiveYearView.classList.remove('hidden');
      fiveYearBtn.classList.add('active');
      fiveYearBtn.querySelector('span').textContent = '달력 보기';
      renderFiveYearView();
    }
  }

  // Preset Selector Logic
  function applyPreset(preset) {
    currentPreset = preset;
    const curToday = getToday();

    if (preset === '3') {
      fiveYrEndYear = curToday.year;
      fiveYrStartYear = curToday.year - 2;
    } else if (preset === '5') {
      fiveYrEndYear = curToday.year;
      fiveYrStartYear = curToday.year - 4;
    } else if (preset === '10') {
      fiveYrEndYear = curToday.year;
      fiveYrStartYear = curToday.year - 9;
    } else if (preset === 'all') {
      const rec = getRecordedYears();
      fiveYrStartYear = Math.min(...rec, curToday.year - 4);
      fiveYrEndYear = Math.max(...rec, curToday.year);
    }

    updatePresetChipsUI();
    updateYearDropdowns();
    renderFiveYearView();
  }

  function updatePresetChipsUI() {
    presetChips.querySelectorAll('.preset-chip').forEach(btn => {
      if (btn.dataset.preset === currentPreset) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function setCustomYearRange(start, end) {
    if (start > end) {
      // Swap if user selected start > end
      const temp = start;
      start = end;
      end = temp;
    }
    fiveYrStartYear = start;
    fiveYrEndYear = end;
    currentPreset = 'custom';
    updatePresetChipsUI();
    updateYearDropdowns();
    renderFiveYearView();
  }

  function renderFiveYearView() {
    // Validate day of month for current fiveYrMonth
    const maxDaysAcrossYears = Math.max(
      getDaysInMonth(fiveYrStartYear, fiveYrMonth),
      getDaysInMonth(fiveYrEndYear, fiveYrMonth),
      getDaysInMonth(2024, fiveYrMonth) // leap year check
    );
    if (fiveYrDay > maxDaysAcrossYears) {
      fiveYrDay = maxDaysAcrossYears;
    }

    fiveYrDateTitle.textContent = `${fiveYrMonth + 1}월 ${fiveYrDay}일 일기`;
    renderHeader();
    fiveYrEntries.innerHTML = '';

    const curToday = getToday();
    let hasAnyCard = false;

    for (let year = fiveYrStartYear; year <= fiveYrEndYear; year++) {
      const daysInThisMonth = getDaysInMonth(year, fiveYrMonth);
      
      // If this day doesn't exist in this year's month (e.g., Feb 29 in non-leap year)
      if (fiveYrDay > daysInThisMonth) {
        const card = document.createElement('div');
        card.className = 'fiveyr-card fiveyr-card-disabled';
        card.innerHTML = `
          <div class="fiveyr-card-header">
            <div class="fiveyr-year-label">${year}년</div>
            <div class="fiveyr-dow">${fiveYrMonth + 1}월 ${fiveYrDay}일 (존재하지 않는 날짜)</div>
          </div>
          <div class="fiveyr-empty">윤년이 아니므로 해당 날짜가 없습니다.</div>
        `;
        fiveYrEntries.appendChild(card);
        hasAnyCard = true;
        continue;
      }

      hasAnyCard = true;
      const key = getEntryKey(year, fiveYrMonth, fiveYrDay);
      const entry = entries[key] || '';
      const dow = getDayOfWeek(year, fiveYrMonth, fiveYrDay);
      const dayLabel = DAYS_KR[dow];
      const isToday = year === curToday.year && fiveYrMonth === curToday.month && fiveYrDay === curToday.day;
      const isFuture = new Date(year, fiveYrMonth, fiveYrDay) > new Date(curToday.year, curToday.month, curToday.day);

      const card = document.createElement('div');
      card.className = 'fiveyr-card';
      if (entry.trim()) card.classList.add('has-entry');
      if (isToday) card.classList.add('is-today');
      if (isFuture) card.classList.add('is-future');
      card.style.animationDelay = `${(year - fiveYrStartYear) * 35}ms`;

      card.innerHTML = `
        <div class="fiveyr-card-header">
          <div class="fiveyr-year-label">${year}년</div>
          <div class="fiveyr-dow">${fiveYrMonth + 1}월 ${fiveYrDay}일 (${dayLabel}) ${isToday ? '<span class="today-badge">오늘</span>' : ''}</div>
        </div>
        ${entry.trim()
          ? `<div class="fiveyr-preview">${escapeHtml(entry)}</div>`
          : `<div class="fiveyr-empty">✏️ 이 날의 이야기를 적어보세요</div>`
        }
      `;

      card.addEventListener('click', () => openModal(key));
      fiveYrEntries.appendChild(card);
    }

    if (!hasAnyCard) {
      fiveYrEntries.innerHTML = '<div class="no-entries-notice">선택된 연도 범위가 없습니다. 연도를 다시 선택해주세요.</div>';
    }
  }

  function fiveYrNavigate(delta) {
    // Navigate by day across months
    const refYear = 2024; // leap year reference
    const currentMaxDays = getDaysInMonth(refYear, fiveYrMonth);

    fiveYrDay += delta;

    if (fiveYrDay > currentMaxDays) {
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
      fiveYrDay = getDaysInMonth(refYear, fiveYrMonth);
    }

    renderFiveYearView();
  }

  // --- Date Picker Popup Logic ---
  function setupDatePickerPopup() {
    // Populate month options
    datePickerMonth.innerHTML = '';
    MONTHS.forEach((m, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = m;
      datePickerMonth.appendChild(opt);
    });

    function updateDayOptions() {
      const selectedM = parseInt(datePickerMonth.value, 10);
      const maxDays = getDaysInMonth(2024, selectedM);
      const curSelectedD = parseInt(datePickerDay.value, 10) || fiveYrDay;
      
      datePickerDay.innerHTML = '';
      for (let d = 1; d <= maxDays; d++) {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = `${d}일`;
        if (d === Math.min(curSelectedD, maxDays)) opt.selected = true;
        datePickerDay.appendChild(opt);
      }
    }

    datePickerMonth.addEventListener('change', updateDayOptions);

    fiveYrDatePickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      datePickerMonth.value = fiveYrMonth;
      updateDayOptions();
      datePickerDay.value = fiveYrDay;
      datePickerPopup.classList.toggle('hidden');
    });

    datePickerApply.addEventListener('click', () => {
      fiveYrMonth = parseInt(datePickerMonth.value, 10);
      fiveYrDay = parseInt(datePickerDay.value, 10);
      datePickerPopup.classList.add('hidden');
      renderFiveYearView();
    });
  }

  // --- Modal (Edit Diary) ---
  function openModal(key) {
    currentEditKey = key;
    modalDateEl.textContent = formatDateKR(key);
    modalTextarea.value = entries[key] || '';
    updateCharCount();
    saveStatusEl.classList.remove('visible');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => modalTextarea.focus(), 250);
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
        updateYearDropdowns();
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
    updateYearDropdowns();

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
      updateYearDropdowns();
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
    const curToday = getToday();
    const dateStr = `${curToday.year}-${String(curToday.month + 1).padStart(2, '0')}-${String(curToday.day).padStart(2, '0')}`;
    const filename = `5y_diary_backup_${dateStr}.json`;

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
          
          if (typeof imported !== 'object' || Array.isArray(imported)) {
            throw new Error('올바른 백업 파일 형식이 아닙니다.');
          }

          if (confirm('일기를 불러오시겠습니까? 기존 데이터와 합쳐집니다.')) {
            entries = { ...entries, ...imported };
            saveEntries();
            updateYearDropdowns();
            
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

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Calendar View Year Navigation
    prevYearBtn.addEventListener('click', () => {
      currentYear--;
      renderYearNav();
      renderMonthTabs();
      renderWeekdayHeader();
      renderDiaryGrid();
      renderHeader();
      updateYearDropdowns();
    });

    nextYearBtn.addEventListener('click', () => {
      currentYear++;
      renderYearNav();
      renderMonthTabs();
      renderWeekdayHeader();
      renderDiaryGrid();
      renderHeader();
      updateYearDropdowns();
    });

    // Year Dropdown Menu toggle
    yearSelectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      yearDropdownMenu.classList.toggle('hidden');
    });

    // Calendar "Today" button
    calTodayBtn.addEventListener('click', () => {
      const curToday = getToday();
      currentYear = curToday.year;
      currentMonth = curToday.month;
      renderYearNav();
      renderMonthTabs();
      renderWeekdayHeader();
      renderDiaryGrid();
      renderHeader();
      showToast('오늘 달력으로 이동했습니다 📅');
    });

    // 5-Year View toggle button
    fiveYearBtn.addEventListener('click', () => {
      if (viewMode === 'calendar') {
        const curToday = getToday();
        fiveYrMonth = curToday.month;
        fiveYrDay = curToday.day;
        switchView('fiveYear');
      } else {
        switchView('calendar');
      }
    });

    // 5-Year View Day Navigation
    fiveYrPrevDay.addEventListener('click', () => fiveYrNavigate(-1));
    fiveYrNextDay.addEventListener('click', () => fiveYrNavigate(1));

    // 5-Year View "Today" button
    fiveYrTodayBtn.addEventListener('click', () => {
      const curToday = getToday();
      fiveYrMonth = curToday.month;
      fiveYrDay = curToday.day;
      renderFiveYearView();
      showToast('오늘 날짜로 이동했습니다 📅');
    });

    // Preset Chips
    presetChips.addEventListener('click', (e) => {
      const target = e.target.closest('.preset-chip');
      if (!target) return;
      applyPreset(target.dataset.preset);
    });

    // Custom Year Range Selects
    startYearSelect.addEventListener('change', () => {
      const s = parseInt(startYearSelect.value, 10);
      const e = parseInt(endYearSelect.value, 10);
      setCustomYearRange(s, e);
    });

    endYearSelect.addEventListener('change', () => {
      const s = parseInt(startYearSelect.value, 10);
      const e = parseInt(endYearSelect.value, 10);
      setCustomYearRange(s, e);
    });

    // Modal Events
    modalSaveBtn.addEventListener('click', saveCurrentEntry);
    modalDeleteBtn.addEventListener('click', deleteCurrentEntry);
    modalCloseBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
    modalTextarea.addEventListener('input', updateCharCount);

    // Header Actions
    exportBtn.addEventListener('click', exportDiaryEntries);
    importBtn.addEventListener('click', importDiaryEntries);

    // Global click for closing dropdowns
    document.addEventListener('click', (e) => {
      if (!yearDropdownMenu.classList.contains('hidden') && !yearSelectBtn.contains(e.target) && !yearDropdownMenu.contains(e.target)) {
        yearDropdownMenu.classList.add('hidden');
      }
      if (!datePickerPopup.classList.contains('hidden') && !fiveYrDatePickerBtn.contains(e.target) && !datePickerPopup.contains(e.target)) {
        datePickerPopup.classList.add('hidden');
      }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (modalOverlay.classList.contains('active')) {
        if (e.key === 'Escape') closeModal();
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          saveCurrentEntry();
        }
      } else {
        if (e.key === 'Escape') {
          yearDropdownMenu.classList.add('hidden');
          datePickerPopup.classList.add('hidden');
        }
        // Navigate 5-year view with arrow keys
        if (viewMode === 'fiveYear') {
          if (e.key === 'ArrowLeft') fiveYrNavigate(-1);
          if (e.key === 'ArrowRight') fiveYrNavigate(1);
        }
      }
    });

    setupDatePickerPopup();
  }

  // --- Initialization ---
  function init() {
    loadEntries();

    const curToday = getToday();
    currentYear = curToday.year;
    currentMonth = curToday.month;
    fiveYrMonth = curToday.month;
    fiveYrDay = curToday.day;
    fiveYrStartYear = curToday.year - 4;
    fiveYrEndYear = curToday.year;

    updateYearDropdowns();
    renderHeader();
    renderYearNav();
    renderMonthTabs();
    renderWeekdayHeader();
    renderDiaryGrid();
    setupEventListeners();

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
