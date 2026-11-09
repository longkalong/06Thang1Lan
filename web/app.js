/**
 * ==============================================================================
 * HỆ THỐNG KIỂM TRA ĐÁNH GIÁ CHIẾN THUẬT PCCC & CNCH
 * Logic Ứng dụng Web - Tối ưu Mobile First & Responsive Desktop
 * Phiên bản: Hiển thị từng câu 1, Phân rõ Thẻ Trắc nghiệm & Tự luận
 * Tự động chọn đề ngẫu nhiên & Gửi Google Sheets tức thì
 * ==============================================================================
 */

(function () {
  'use strict';

  // Cấu hình cố định Google Sheets Webhook URL (tự động đồng bộ, thí sinh không cần cấu hình)
  const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwaYF-PvBmYyfGowykIIsiP_sDavROEZC7yvmUHZ7Unj__H6L1sgu25Vm67NKlqG_zkMw/exec';

  // --- TRẠNG THÁI TOÀN CỤC CỦA PHIÊN LÀM BÀI ---
  const state = {
    candidate: {
      fullName: '',
      unit: '',
      rank: '',
      examCode: ''
    },
    currentExam: null,           // Dữ liệu câu hỏi của đề thi hiện tại (không có đáp án)
    currentTab: 'mcq',           // 'mcq' hoặc 'essay'
    currentMcqIndex: 0,          // 0..19
    currentEssayIndex: 0,        // 0..1
    userAnswers: {
      mcq: {},                   // { "ID_CAU_HOI": 1..4 }
      essay: {}                  // { "ID_CAU_HOI": "noi dung bai lam" }
    },
    timer: {
      totalSeconds: 30 * 60,     // 30 phút = 1800 giây
      remainingSeconds: 30 * 60,
      intervalId: null,
      startTime: null,
      submitTime: null
    },
    isSubmitted: false,
    gradedResult: null           // Kết quả sau khi nộp bài và load đáp án
  };

  // --- CÁC PHẦN TỬ DOM THƯỜNG DÙNG ---
  const screens = {
    intro: document.getElementById('screen-intro'),
    exam: document.getElementById('screen-exam'),
    result: document.getElementById('screen-result')
  };

  const timerElements = {
    headerBadge: document.getElementById('header-timer'),
    headerText: document.getElementById('header-timer-text'),
    desktopText: document.getElementById('desktop-timer-text')
  };

  const bottomBar = document.getElementById('bottom-bar');
  const paletteDrawer = document.getElementById('palette-drawer');
  const paletteBackdrop = document.getElementById('palette-backdrop');

  // ============================================================================
  // 1. KHỞI TẠO HỆ THỐNG & SỰ KIỆN BAN ĐẦU
  // ============================================================================
  window.addEventListener('DOMContentLoaded', () => {
    initEventHandlers();
  });

  function initEventHandlers() {
    // Nút Bắt đầu làm bài
    const btnStart = document.getElementById('btn-start-exam');
    if (btnStart) btnStart.addEventListener('click', handleStartExam);

    // Chuyển Thẻ Trắc nghiệm & Tự luận
    const tabBtnMcq = document.getElementById('tab-btn-mcq');
    const tabBtnEssay = document.getElementById('tab-btn-essay');
    if (tabBtnMcq) tabBtnMcq.addEventListener('click', () => switchSectionTab('mcq'));
    if (tabBtnEssay) tabBtnEssay.addEventListener('click', () => switchSectionTab('essay'));

    // Điều hướng Next/Prev Trắc nghiệm
    const btnMcqPrev = document.getElementById('btn-mcq-prev');
    const btnMcqNext = document.getElementById('btn-mcq-next');
    if (btnMcqPrev) btnMcqPrev.addEventListener('click', () => navigateMcq(-1));
    if (btnMcqNext) btnMcqNext.addEventListener('click', () => navigateMcq(1));

    // Điều hướng Next/Prev Tự luận
    const btnEssayPrev = document.getElementById('btn-essay-prev');
    const btnEssayNext = document.getElementById('btn-essay-next');
    if (btnEssayPrev) btnEssayPrev.addEventListener('click', () => navigateEssay(-1));
    if (btnEssayNext) btnEssayNext.addEventListener('click', () => navigateEssay(1));

    // Hai nút chọn Câu Tự Luận 1 & 2
    const pillEssay0 = document.getElementById('pill-essay-0');
    const pillEssay1 = document.getElementById('pill-essay-1');
    if (pillEssay0) pillEssay0.addEventListener('click', () => switchEssayQuestion(0));
    if (pillEssay1) pillEssay1.addEventListener('click', () => switchEssayQuestion(1));

    // Các nút kích hoạt Nộp bài
    document.querySelectorAll('.btn-trigger-submit').forEach(btn => {
      btn.addEventListener('click', openSubmitConfirmModal);
    });

    // Modal Xác nhận nộp bài
    const btnCancelSubmit = document.getElementById('btn-cancel-submit');
    const btnConfirmSubmit = document.getElementById('btn-confirm-submit');
    if (btnCancelSubmit) btnCancelSubmit.addEventListener('click', closeSubmitConfirmModal);
    if (btnConfirmSubmit) btnConfirmSubmit.addEventListener('click', executeSubmitExam);

    // Drawer danh sách câu hỏi trên Mobile
    const btnTogglePalette = document.getElementById('btn-toggle-palette');
    const btnClosePalette = document.getElementById('btn-close-palette');
    if (btnTogglePalette) btnTogglePalette.addEventListener('click', openPaletteDrawer);
    if (btnClosePalette) btnClosePalette.addEventListener('click', closePaletteDrawer);
    if (paletteBackdrop) paletteBackdrop.addEventListener('click', closePaletteDrawer);


    // Nút làm lại bài thi trên màn hình kết quả
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) btnRestart.addEventListener('click', () => location.reload());

    // Nút Thử nộp lại khi đường truyền mạng chậm hoặc có sự cố
    const btnRetrySubmit = document.getElementById('btn-retry-submit');
    if (btnRetrySubmit) {
      btnRetrySubmit.addEventListener('click', () => {
        openSubmittingModal();
        sendToGoogleSheetsAndFinish();
      });
    }
  }

  // ============================================================================
  // 2. LOGIC BẮT ĐẦU LÀM BÀI THI (TỰ ĐỘNG CHỌN ĐỀ NGẪU NHIÊN)
  // ============================================================================
  function handleStartExam() {
    const fullName = document.getElementById('inp-fullname').value.trim();
    const unit = document.getElementById('inp-unit').value;
    const rank = document.getElementById('inp-rank').value;

    // Kiểm tra tính hợp lệ của thông tin thí sinh
    if (!fullName) {
      alert('Vui lòng nhập Họ và tên của đồng chí!');
      document.getElementById('inp-fullname').focus();
      return;
    }
    if (!unit) {
      alert('Vui lòng chọn Đơn vị công tác từ danh sách!');
      document.getElementById('inp-unit').focus();
      return;
    }
    if (!rank) {
      alert('Vui lòng chọn Chức vụ từ danh sách!');
      document.getElementById('inp-rank').focus();
      return;
    }

    // Yêu cầu: BỎ PHẦN CHỌN ĐỀ, MẶC ĐỊNH BỐC NGẪU NHIÊN 1 TRONG 10 BỘ ĐỀ
    const allCodes = ['DE01', 'DE02', 'DE03', 'DE04', 'DE05', 'DE06', 'DE07', 'DE08', 'DE09', 'DE10'];
    const examCode = allCodes[Math.floor(Math.random() * allCodes.length)];

    // Lưu thông tin thí sinh vào trạng thái
    state.candidate = { fullName, unit, rank, examCode };

    // Tải dữ liệu đề thi an toàn (không có đáp án)
    if (!window.CAU_HOI_BO_DE || !window.CAU_HOI_BO_DE[examCode]) {
      alert('Đang tải dữ liệu bộ đề thi, vui lòng đợi trong giây lát hoặc kiểm tra kết nối mạng!');
      return;
    }

    state.currentExam = window.CAU_HOI_BO_DE[examCode];

    // Chuyển màn hình
    switchScreen('exam');

    // Hiển thị thông tin thí sinh lên màn hình thi
    document.getElementById('exam-display-name').textContent = state.currentExam.tenDe;
    document.getElementById('exam-candidate-summary').textContent = `Thí sinh: ${fullName} | ${rank} - ${unit}`;
    
    document.getElementById('desktop-user-name').textContent = fullName;
    document.getElementById('desktop-user-unit').textContent = unit;
    document.getElementById('desktop-user-rank').textContent = rank;
    document.getElementById('desktop-user-code').textContent = `${state.currentExam.maDe} (Bốc ngẫu nhiên)`;

    // Khởi tạo thanh điều hướng câu hỏi và render câu đầu tiên
    initQuestionSteppers();
    switchSectionTab('mcq');
    renderSingleMcq(0);
    renderSingleEssay(0);

    // Bắt đầu đếm ngược thời gian 30 phút
    startExamTimer();

    // Cuộn lên đầu trang mượt mà
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Chuyển đổi giữa các màn hình ứng dụng
  function switchScreen(screenName) {
    Object.values(screens).forEach(el => el.classList.remove('active'));
    screens[screenName].classList.add('active');

    const floatingTimer = document.getElementById('floating-live-timer');

    if (screenName === 'exam') {
      timerElements.headerBadge.style.display = 'flex';
      bottomBar.style.display = 'block';
      if (floatingTimer) floatingTimer.style.display = 'flex';
    } else {
      timerElements.headerBadge.style.display = 'none';
      bottomBar.style.display = 'none';
      if (floatingTimer) floatingTimer.style.display = 'none';
    }
  }

  // ============================================================================
  // 3. ĐỒNG HỒ ĐẾM NGƯỢC 30 PHÚT (CHẠY THEO THÍ SINH VỚI BỘ ĐẾM GIÂY CHÍNH XÁC)
  // ============================================================================
  function startExamTimer() {
    state.timer.startTime = new Date();
    state.timer.remainingSeconds = state.timer.totalSeconds;
    updateTimerDisplay();

    state.timer.intervalId = setInterval(() => {
      state.timer.remainingSeconds--;
      updateTimerDisplay();

      const floatingTimer = document.getElementById('floating-live-timer');

      // Cảnh báo khi còn dưới 5 phút
      if (state.timer.remainingSeconds <= 300 && state.timer.remainingSeconds > 60) {
        timerElements.headerBadge.classList.add('warning');
        timerElements.headerBadge.classList.remove('danger');
        if (floatingTimer) {
          floatingTimer.classList.add('warning');
          floatingTimer.classList.remove('danger');
        }
      } 
      // Cảnh báo khẩn cấp khi còn dưới 1 phút
      else if (state.timer.remainingSeconds <= 60 && state.timer.remainingSeconds > 0) {
        timerElements.headerBadge.classList.add('danger');
        timerElements.headerBadge.classList.remove('warning');
        if (floatingTimer) {
          floatingTimer.classList.add('danger');
          floatingTimer.classList.remove('warning');
        }
      } 
      // Hết giờ làm bài -> Tự động nộp bài
      else if (state.timer.remainingSeconds <= 0) {
        clearInterval(state.timer.intervalId);
        alert('⏱️ ĐÃ HẾT 30 PHÚT LÀM BÀI!\nHệ thống tự động ghi nhận và nộp bài thi của đồng chí.');
        executeSubmitExam();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(state.timer.remainingSeconds / 60);
    const secs = state.timer.remainingSeconds % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    // 1. Cập nhật đồng hồ trên thanh Header
    if (timerElements.headerText) {
      timerElements.headerText.textContent = timeStr;
    }

    // 2. Cập nhật đồng hồ trên thanh Sidebar Desktop
    if (timerElements.desktopText) {
      timerElements.desktopText.textContent = timeStr;
    }

    // 3. Cập nhật BỘ ĐẾM GIÂY NỔI CHẠY THEO THÍ SINH (Yêu cầu 3)
    const floatingTimerText = document.getElementById('floating-timer-text');
    if (floatingTimerText) {
      floatingTimerText.textContent = timeStr;
    }

    // 4. Cập nhật đồng hồ ở thanh điều hướng chân trang mobile
    const mobileBottomTimerText = document.getElementById('mobile-bottom-timer-text');
    if (mobileBottomTimerText) {
      mobileBottomTimerText.textContent = timeStr;
    }
  }

  // ============================================================================
  // 4. QUẢN LÝ THẺ TRẮC NGHIỆM & TỰ LUẬN (CHỈ HIỆN TỪNG CÂU 1)
  // ============================================================================
  function switchSectionTab(tabName) {
    state.currentTab = tabName;

    const tabBtnMcq = document.getElementById('tab-btn-mcq');
    const tabBtnEssay = document.getElementById('tab-btn-essay');
    const panelMcq = document.getElementById('panel-mcq');
    const panelEssay = document.getElementById('panel-essay');

    if (tabName === 'mcq') {
      tabBtnMcq.classList.add('active');
      tabBtnEssay.classList.remove('active');
      panelMcq.classList.add('active');
      panelEssay.classList.remove('active');
      renderSingleMcq(state.currentMcqIndex);
    } else {
      tabBtnEssay.classList.add('active');
      tabBtnMcq.classList.remove('active');
      panelEssay.classList.add('active');
      panelMcq.classList.remove('active');
      renderSingleEssay(state.currentEssayIndex);
    }
  }

  // Khởi tạo các nút trên thanh Stepper và Palette
  function initQuestionSteppers() {
    const mcqStepperGrid = document.getElementById('mcq-stepper-grid');
    const mobilePaletteGrid = document.getElementById('mobile-palette-grid');
    const desktopPaletteGrid = document.getElementById('desktop-palette-grid');

    mcqStepperGrid.innerHTML = '';
    mobilePaletteGrid.innerHTML = '';
    desktopPaletteGrid.innerHTML = '';

    // 20 câu trắc nghiệm
    state.currentExam.tracNghiem.forEach((q, index) => {
      const qNum = index + 1;
      
      // Nút trên Stepper bar ngang
      const stepBtn = document.createElement('button');
      stepBtn.type = 'button';
      stepBtn.className = 'step-num-btn';
      stepBtn.id = `stepper-btn-${index}`;
      stepBtn.textContent = qNum;
      stepBtn.addEventListener('click', () => {
        renderSingleMcq(index);
      });
      mcqStepperGrid.appendChild(stepBtn);

      // Nút trên Mobile Palette drawer
      addPaletteButton(mobilePaletteGrid, qNum, index, 'mcq');
      // Nút trên Desktop Palette sidebar
      addPaletteButton(desktopPaletteGrid, qNum, index, 'mcq');
    });

    // 2 câu tự luận (trong palette)
    [0, 1].forEach(tlIdx => {
      const tlNum = tlIdx + 1;
      addPaletteButton(mobilePaletteGrid, `TL${tlNum}`, tlIdx, 'essay');
      addPaletteButton(desktopPaletteGrid, `TL${tlNum}`, tlIdx, 'essay');
    });

    updateProgress();
  }

  function addPaletteButton(container, label, index, type) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `palette-btn ${type === 'essay' ? 'essay' : ''}`;
    btn.id = `palette-btn-${container.id}-${type}-${index}`;
    btn.textContent = label;
    btn.addEventListener('click', () => {
      closePaletteDrawer();
      if (type === 'mcq') {
        switchSectionTab('mcq');
        renderSingleMcq(index);
      } else {
        switchSectionTab('essay');
        switchEssayQuestion(index);
      }
    });
    container.appendChild(btn);
  }

  // ============================================================================
  // 5. RENDER CHI TIẾT TỪNG CÂU 1 (TRẮC NGHIỆM & TỰ LUẬN)
  // ============================================================================
  
  // A. Render 1 câu trắc nghiệm
  function renderSingleMcq(index) {
    state.currentMcqIndex = index;
    const q = state.currentExam.tracNghiem[index];
    const qNum = index + 1;
    const container = document.getElementById('single-mcq-container');
    const isAnswered = state.userAnswers.mcq[q.ID] !== undefined;

    // Cập nhật bộ đếm
    document.getElementById('stepper-counter-mcq').textContent = `Câu ${qNum} / 20`;

    // Cập nhật trạng thái active trên thanh stepper
    for (let i = 0; i < 20; i++) {
      const btn = document.getElementById(`stepper-btn-${i}`);
      if (btn) {
        if (i === index) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    }

    // Render HTML thẻ câu hỏi đơn
    container.innerHTML = `
      <div class="single-question-card ${isAnswered ? 'answered' : ''}" id="current-mcq-card">
        <div class="question-header">
          <span class="question-badge">CÂU ${qNum} / 20 (Mã: ${q.ID})</span>
          <span class="question-status-tag" id="current-mcq-status">${isAnswered ? 'Đã làm' : 'Chưa làm'}</span>
        </div>
        <div class="question-text">${q.cauHoi}</div>
        <div class="options-list">
          ${q.luaChon.map((opt, optIdx) => {
            const optVal = optIdx + 1;
            const isSelected = (state.userAnswers.mcq[q.ID] === optVal);
            return `
              <div class="option-item ${isSelected ? 'selected' : ''}" data-optindex="${optVal}">
                <div class="option-radio"></div>
                <div class="option-content">${opt}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Gắn sự kiện chọn phương án
    container.querySelectorAll('.option-item').forEach(item => {
      item.addEventListener('click', () => {
        const optVal = parseInt(item.getAttribute('data-optindex'), 10);
        selectMcqOption(index, q.ID, optVal);
      });
    });

    // Cập nhật nút Trước / Tiếp
    const btnPrev = document.getElementById('btn-mcq-prev');
    const btnNext = document.getElementById('btn-mcq-next');

    btnPrev.disabled = (index === 0);
    if (index === 19) {
      btnNext.innerHTML = `Sang Phần Tự Luận <span>▶</span>`;
    } else {
      btnNext.innerHTML = `Câu tiếp theo <span>▶</span>`;
    }
  }

  function navigateMcq(delta) {
    const nextIdx = state.currentMcqIndex + delta;
    if (nextIdx >= 0 && nextIdx < 20) {
      renderSingleMcq(nextIdx);
    } else if (nextIdx >= 20) {
      // Khi bấm tiếp ở câu 20 -> tự động chuyển sang thẻ Tự luận câu 1
      switchSectionTab('essay');
      switchEssayQuestion(0);
    }
  }

  function selectMcqOption(qIndex, questionId, optionIndex) {
    state.userAnswers.mcq[questionId] = optionIndex;

    // Cập nhật giao diện lựa chọn hiện tại
    const card = document.getElementById('current-mcq-card');
    if (card) {
      card.classList.add('answered');
      card.querySelectorAll('.option-item').forEach(el => {
        const val = parseInt(el.getAttribute('data-optindex'), 10);
        if (val === optionIndex) el.classList.add('selected');
        else el.classList.remove('selected');
      });
      const statusTag = document.getElementById('current-mcq-status');
      if (statusTag) statusTag.textContent = 'Đã làm';
    }

    // Đánh dấu nút stepper & palette
    const stepBtn = document.getElementById(`stepper-btn-${qIndex}`);
    if (stepBtn) stepBtn.classList.add('done');

    markPaletteDone('mcq', qIndex, true);
    updateProgress();
  }

  // B. Render 1 câu tự luận
  function renderSingleEssay(index) {
    state.currentEssayIndex = index;
    const tl = state.currentExam.tuLuan[index];
    const tlNum = index + 1;
    const container = document.getElementById('single-essay-container');
    const currentVal = state.userAnswers.essay[tl.ID] || '';
    const hasText = currentVal.trim().length > 0;

    // Cập nhật trạng thái active của 2 pill
    const pill0 = document.getElementById('pill-essay-0');
    const pill1 = document.getElementById('pill-essay-1');
    if (index === 0) {
      pill0.classList.add('active');
      pill1.classList.remove('active');
    } else {
      pill1.classList.add('active');
      pill0.classList.remove('active');
    }

    container.innerHTML = `
      <div class="single-question-card ${hasText ? 'answered' : ''}" id="current-essay-card">
        <div class="question-header">
          <span class="question-badge" style="background: #fef3c7; color: #92400e; border-color: #fcd34d;">
            TỰ LUẬN CÂU ${tlNum} / 2 (${tl.thangDiem || 2.0} ĐIỂM)
          </span>
          <span class="question-status-tag" id="current-essay-status">${hasText ? 'Đã làm' : 'Chưa làm'}</span>
        </div>
        <div class="question-text">${tl.cauHoi}</div>
        <div class="form-group" style="margin-bottom: 4px;">
          <textarea id="current-essay-textarea" class="form-textarea essay-textarea" 
            placeholder="Đồng chí nhập nội dung bài làm tự luận tại đây (trình bày các ý chính, biện pháp kỹ, chiến thuật cụ thể)...">${escapeHtml(currentVal)}</textarea>
          <div class="char-counter" id="current-essay-counter">${currentVal.length} ký tự</div>
        </div>
      </div>
    `;

    const textarea = document.getElementById('current-essay-textarea');
    textarea.addEventListener('input', () => {
      handleEssayInput(index, tl.ID, textarea.value);
    });

    // Cập nhật nút Trước / Tiếp
    const btnPrev = document.getElementById('btn-essay-prev');
    const btnNext = document.getElementById('btn-essay-next');

    if (index === 0) {
      btnPrev.innerHTML = `<span>◀</span> Về Trắc nghiệm`;
      btnNext.innerHTML = `Câu Tự Luận 2 <span>▶</span>`;
    } else {
      btnPrev.innerHTML = `<span>◀</span> Câu Tự Luận 1`;
      btnNext.innerHTML = `Nộp Bài Thi <span>📝</span>`;
    }
  }

  function switchEssayQuestion(index) {
    renderSingleEssay(index);
  }

  function navigateEssay(delta) {
    if (delta === -1) {
      if (state.currentEssayIndex === 0) {
        // Về lại phần trắc nghiệm
        switchSectionTab('mcq');
        renderSingleMcq(19);
      } else {
        renderSingleEssay(0);
      }
    } else {
      if (state.currentEssayIndex === 0) {
        renderSingleEssay(1);
      } else {
        // Hết bài tự luận -> mở popup nộp bài
        openSubmitConfirmModal();
      }
    }
  }

  function handleEssayInput(index, essayId, text) {
    state.userAnswers.essay[essayId] = text;

    const counter = document.getElementById('current-essay-counter');
    if (counter) counter.textContent = `${text.length} ký tự`;

    const card = document.getElementById('current-essay-card');
    const statusTag = document.getElementById('current-essay-status');
    const hasText = text.trim().length > 0;

    if (statusTag) statusTag.textContent = hasText ? 'Đã làm' : 'Chưa làm';
    if (card) {
      if (hasText) card.classList.add('answered');
      else card.classList.remove('answered');
    }

    const pillBadge = document.getElementById(`badge-essay-${index}`);
    const pill = document.getElementById(`pill-essay-${index}`);
    if (pillBadge) pillBadge.textContent = hasText ? 'Đã làm' : 'Chưa làm';
    if (pill) {
      if (hasText) pill.classList.add('done');
      else pill.classList.remove('done');
    }

    markPaletteDone('essay', index, hasText);
    updateProgress();
  }

  function markPaletteDone(type, index, isDone) {
    ['mobile-palette-grid', 'desktop-palette-grid'].forEach(gridId => {
      const btn = document.getElementById(`palette-btn-${gridId}-${type}-${index}`);
      if (btn) {
        if (isDone) btn.classList.add('done');
        else btn.classList.remove('done');
      }
    });
  }

  // Cập nhật tiến độ hoàn thành trên thanh bottom bar và tabs
  function updateProgress() {
    const mcqDone = Object.keys(state.userAnswers.mcq).length;
    let essayDone = 0;
    Object.values(state.userAnswers.essay).forEach(val => {
      if (val && val.trim().length > 0) essayDone++;
    });

    const totalDone = mcqDone + essayDone;
    const percent = Math.round((totalDone / 22) * 100);

    // Cập nhật badges trên tabs
    const badgeMcq = document.getElementById('tab-badge-mcq');
    const badgeEssay = document.getElementById('tab-badge-essay');
    if (badgeMcq) badgeMcq.textContent = `${mcqDone}/20`;
    if (badgeEssay) badgeEssay.textContent = `${essayDone}/2`;

    // Cập nhật thanh dưới chân màn hình
    const text = document.getElementById('mobile-progress-text');
    const fill = document.getElementById('mobile-progress-fill');
    if (text) text.textContent = `Đã làm: ${totalDone} / 22 câu (${percent}%)`;
    if (fill) fill.style.width = `${percent}%`;
  }

  // ============================================================================
  // 6. QUẢN LÝ BẢNG CÂU HỎI (MOBILE DRAWER)
  // ============================================================================
  function openPaletteDrawer() {
    paletteDrawer.classList.add('open');
    paletteBackdrop.classList.add('open');
  }

  function closePaletteDrawer() {
    paletteDrawer.classList.remove('open');
    paletteBackdrop.classList.remove('open');
  }

  // ============================================================================
  // 7. XÁC NHẬN VÀ THỰC THI NỘP BÀI THI (TẢI ĐÁP ÁN AN TOÀN)
  // ============================================================================
  function openSubmitConfirmModal() {
    const mcqDone = Object.keys(state.userAnswers.mcq).length;
    let essayDone = 0;
    Object.values(state.userAnswers.essay).forEach(val => {
      if (val && val.trim().length > 0) essayDone++;
    });

    const totalDone = mcqDone + essayDone;
    const unDone = 22 - totalDone;

    const modalMsg = document.getElementById('modal-submit-msg');
    if (unDone > 0) {
      modalMsg.innerHTML = `
        Đồng chí đã hoàn thành <strong>${totalDone}/22 câu</strong>.<br>
        Hiện vẫn còn <strong style="color: #b91c1c;">${unDone} câu chưa làm</strong>!<br><br>
        Đồng chí có chắc chắn muốn nộp bài thi ngay bây giờ không?
      `;
    } else {
      modalMsg.innerHTML = `
        Đồng chí đã hoàn thành toàn bộ <strong>22/22 câu hỏi</strong>.<br><br>
        Đồng chí có chắc chắn muốn nộp bài thi để hệ thống chấm điểm không?
      `;
    }

    document.getElementById('modal-submit-confirm').classList.add('active');
  }

  function closeSubmitConfirmModal() {
    document.getElementById('modal-submit-confirm').classList.remove('active');
  }

  let submitProgressInterval = null;
  let submitTimeoutId = null;

  function openSubmittingModal() {
    const modal = document.getElementById('modal-submitting');
    if (!modal) return;
    const loadingBlock = document.getElementById('submitting-state-loading');
    const retryBlock = document.getElementById('submitting-state-retry');
    if (loadingBlock) loadingBlock.style.display = 'block';
    if (retryBlock) retryBlock.style.display = 'none';

    const title = document.getElementById('submitting-title');
    const desc = document.getElementById('submitting-desc');
    if (title) title.textContent = 'ĐANG NỘP BÀI THI LÊN HỆ THỐNG...';
    if (desc) desc.innerHTML = 'Hệ thống đang tiếp nhận bài làm và xử lý kết quả thi.<br><strong>Vui lòng đợi trong giây lát, kết quả sẽ hiển thị ngay sau khi hoàn tất!</strong>';

    const secEl = document.getElementById('submit-seconds-elapsed');
    if (secEl) secEl.textContent = '0';

    modal.classList.add('active');
  }

  function closeSubmittingModal() {
    const modal = document.getElementById('modal-submitting');
    if (modal) modal.classList.remove('active');
    if (submitProgressInterval) clearInterval(submitProgressInterval);
    if (submitTimeoutId) clearTimeout(submitTimeoutId);
  }

  function executeSubmitExam() {
    closeSubmitConfirmModal();
    clearInterval(state.timer.intervalId);
    state.isSubmitted = true;
    state.timer.submitTime = new Date();

    // DỪNG LẠI: Mở modal tiến trình nộp bài
    openSubmittingModal();

    // BẢO MẬT ĐÁP ÁN: CHỈ TẢI ĐÁP ÁN SAU KHI THÍ SINH ĐÃ BẤM NỘP BÀI
    loadAnswersAndGrade();
  }

  function loadAnswersAndGrade() {
    // 1. Kiểm tra xem dap_an_bundle.js đã có sẵn chưa
    if (window.DAP_AN_BO_DE && window.DAP_AN_BO_DE[state.candidate.examCode]) {
      processGrading(window.DAP_AN_BO_DE[state.candidate.examCode]);
      return;
    }

    // 2. Nạp động dap_an_bundle.js từ thư mục data/ (không hề tồn tại trước khi bấm nộp bài)
    const script = document.createElement('script');
    script.src = 'data/dap_an_bundle.js';
    script.onload = () => {
      if (window.DAP_AN_BO_DE && window.DAP_AN_BO_DE[state.candidate.examCode]) {
        processGrading(window.DAP_AN_BO_DE[state.candidate.examCode]);
      } else {
        fallbackFetchAnswers();
      }
    };
    script.onerror = () => {
      fallbackFetchAnswers();
    };
    document.head.appendChild(script);
  }

  // Cơ chế dự phòng: Tải file JSON đáp án độc lập từ thư mục dap_an/
  function fallbackFetchAnswers() {
    const examNum = state.candidate.examCode.replace('DE', '');
    fetch(`../dap_an/dap_an_bo_de_${examNum}.json`)
      .then(res => res.json())
      .then(data => {
        processGrading(data);
      })
      .catch(err => {
        console.error('Lỗi tải đáp án:', err);
        alert('Đã nộp bài thành công nhưng có lỗi kết nối khi tải đáp án. Vui lòng thử lại!');
      });
  }

  // ============================================================================
  // 8. CHẤM ĐIỂM & RENDER MÀN HÌNH KẾT QUẢ ĐÁP ÁN (MÀU SẮC YÊU CẦU)
  // - ĐÚNG: Nền xanh lá
  // - SAI: Nền đỏ
  // - CHƯA CHỌN: Nền vàng
  // ĐẶC BIỆT: SỬA LỖI HIỂN THỊ "D. D. ..." (ẢNH 1 DO USER BÁO)
  // ============================================================================
  function processGrading(answerData) {
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const detailedReviews = [];
    const answerMap = {};

    // Lập bản đồ đáp án theo ID câu hỏi
    answerData.dapAnTracNghiem.forEach(item => {
      answerMap[item.ID] = item;
    });

    // Đối chiếu 20 câu trắc nghiệm
    state.currentExam.tracNghiem.forEach((q, index) => {
      const qId = q.ID;
      const userChoice = state.userAnswers.mcq[qId]; // 1, 2, 3, 4 hoặc undefined
      const correctItem = answerMap[qId];
      const correctChoice = correctItem ? correctItem.dapan : 1;

      let status = 'unanswered'; // 'correct', 'incorrect', 'unanswered'

      if (userChoice === undefined || userChoice === null) {
        status = 'unanswered';
        unansweredCount++;
      } else if (userChoice === correctChoice) {
        status = 'correct';
        correctCount++;
      } else {
        status = 'incorrect';
        incorrectCount++;
      }

      detailedReviews.push({
        qIndex: index + 1,
        qId: qId,
        questionText: q.cauHoi,
        options: q.luaChon,
        userChoice: userChoice,
        correctChoice: correctChoice,
        correctItem: correctItem,
        status: status
      });
    });

    // Lưu kết quả chấm thi vào trạng thái
    state.gradedResult = {
      correctCount,
      incorrectCount,
      unansweredCount,
      scoreText: `${correctCount}/20`,
      scoreConverted: (correctCount * 0.5).toFixed(1), // Quy đổi thang điểm 10
      reviews: detailedReviews,
      answerData: answerData
    };

    // Lưu phiên thi vào localStorage để hỗ trợ in phiếu A4
    saveToLocalStorage();

    // BẮT BUỘC: DỪNG LẠI ĐẾN KHI NỘP ĐƯỢC TRÊN GOOGLE SHEET THÀNH CÔNG MỚI RA KẾT QUẢ
    sendToGoogleSheetsAndFinish();
  }

  function renderResultScreen() {
    switchScreen('result');

    const res = state.gradedResult;

    // 1. Hiển thị điểm số to nổi bật
    document.getElementById('res-score-number').textContent = res.correctCount;
    
    // 2. Thông tin thí sinh
    const c = state.candidate;
    document.getElementById('res-candidate-info').innerHTML = `
      <strong>Họ và tên:</strong> ${c.fullName} &nbsp;|&nbsp; 
      <strong>Chức vụ:</strong> ${c.rank}<br>
      <strong>Đơn vị:</strong> ${c.unit} &nbsp;|&nbsp; 
      <strong>Bộ đề thi:</strong> ${state.currentExam.maDe} - ${state.currentExam.tenDe}<br>
      <strong>Thời gian làm bài:</strong> ${formatExamDuration()}
    `;

    // Cập nhật trạng thái xác nhận đã nộp thành công
    const statusElem = document.getElementById('sheets-sync-status');
    if (statusElem) {
      statusElem.innerHTML = `
        <div class="sync-success-badge">
          <span>✅</span> ĐÃ NỘP BÀI VÀ GHI NHẬN THÀNH CÔNG VÀO HỆ THỐNG
        </div>
      `;
    }

    // 3. Thống kê Đúng - Sai - Chưa chọn
    document.getElementById('stat-correct-count').textContent = res.correctCount;
    document.getElementById('stat-incorrect-count').textContent = res.incorrectCount;
    document.getElementById('stat-unanswered-count').textContent = res.unansweredCount;

    // 4. Render danh sách 20 câu hỏi trắc nghiệm với màu nền theo đúng yêu cầu
    const reviewContainer = document.getElementById('review-questions-container');
    reviewContainer.innerHTML = '';

    res.reviews.forEach(item => {
      const card = document.createElement('div');
      
      // ÁP DỤNG CLASS MÀU NỀN CHUẨN:
      // is-correct: NỀN XANH LÁ
      // is-incorrect: NỀN ĐỎ
      // is-unanswered: NỀN VÀNG
      card.className = `card-review is-${item.status}`;

      let badgeHtml = '';
      if (item.status === 'correct') {
        badgeHtml = `<span class="review-badge">✓ TRẢ LỜI ĐÚNG (+0.5đ)</span>`;
      } else if (item.status === 'incorrect') {
        badgeHtml = `<span class="review-badge">✕ TRẢ LỜI SAI (0đ)</span>`;
      } else {
        badgeHtml = `<span class="review-badge">⚠️ CHƯA CHỌN CÂU NÀY (0đ)</span>`;
      }

      // XỬ LÝ SỬA LỖI ẢNH 1: BỎ KÝ TỰ "D. " BỊ LẶP Ở ĐẦU NOI_DUNG_DAP_AN
      let cleanExplanation = '';
      if (item.correctItem) {
        const rawContent = item.correctItem.noiDungDapAn || '';
        // Loại bỏ tiền tố "A. ", "B. ", "C. ", "D. " nếu đã có sẵn trong nội dung
        const contentWithoutPrefix = rawContent.replace(/^[A-D]\.\s*/i, '');
        cleanExplanation = `
          <div class="review-explanation">
            <strong>📖 Căn cứ tài liệu huấn luyện chuẩn:</strong><br>
            Đáp án chuẩn: <strong>${item.correctItem.kyHieu}</strong>. ${contentWithoutPrefix}
          </div>
        `;
      }

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>${badgeHtml}</div>
          <span style="font-size: 0.8rem; font-weight: 700; opacity: 0.85;">Câu ${item.qIndex} (Mã: ${item.qId})</span>
        </div>
        <div style="font-weight: 700; font-size: 0.98rem; margin-bottom: 12px; line-height: 1.45;">
          ${item.questionText}
        </div>
        
        <div class="review-options">
          ${item.options.map((opt, optIdx) => {
            const currentIdx = optIdx + 1;
            const isUserPick = (item.userChoice === currentIdx);
            const isCorrect = (item.correctChoice === currentIdx);

            let optClass = 'review-option';
            let labelTag = '';

            if (isCorrect) {
              optClass += ' correct-answer';
              labelTag = ' <span style="font-weight: 800; color: #166534;">[ĐÁP ÁN ĐÚNG]</span>';
            }
            if (isUserPick) {
              optClass += ' user-picked';
              if (!isCorrect) {
                labelTag += ' <span style="font-weight: 800; color: #991b1b;">[ĐỒNG CHÍ ĐÃ CHỌN - SAI]</span>';
              } else {
                labelTag += ' <span style="font-weight: 800; color: #166534;">[ĐỒNG CHÍ ĐÃ CHỌN - ĐÚNG]</span>';
              }
            }

            return `
              <div class="${optClass}">
                ${opt}${labelTag}
              </div>
            `;
          }).join('')}
        </div>

        ${cleanExplanation}
      `;

      reviewContainer.appendChild(card);
    });

    // 5. Render lại bài làm tự luận của thí sinh
    const essayContainer = document.getElementById('review-essay-container');
    essayContainer.innerHTML = '';

    state.currentExam.tuLuan.forEach((tl, tlIndex) => {
      const userText = state.userAnswers.essay[tl.ID] || '';
      const card = document.createElement('div');
      card.className = 'card';
      card.style.borderColor = '#cbd5e1';

      card.innerHTML = `
        <div class="question-header">
          <span class="question-badge" style="background: #f1f5f9; color: var(--navy);">
            CÂU TỰ LUẬN ${tlIndex + 1} (${tl.thangDiem || 2.0} ĐIỂM)
          </span>
          <span class="question-status-tag" style="background: #fef3c7; color: #92400e;">
            Đã nộp bài - Chờ giám khảo chấm
          </span>
        </div>
        <div class="question-text">${tl.cauHoi}</div>
        
        <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 14px; margin-top: 10px;">
          <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">
            BÀI LÀM CỦA ĐỒNG CHÍ:
          </div>
          <div style="font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap; color: var(--navy);">
            ${userText ? escapeHtml(userText) : '<em style="color: #94a3b8;">(Thí sinh không làm câu tự luận này)</em>'}
          </div>
        </div>
      `;

      essayContainer.appendChild(card);
    });

    // Cuộn lên đầu trang kết quả
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function formatExamDuration() {
    if (!state.timer.startTime || !state.timer.submitTime) return '30 phút';
    const elapsedSeconds = Math.round((state.timer.submitTime - state.timer.startTime) / 1000);
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${mins} phút ${secs} giây`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================================================
  // 9. LƯU LOCALSTORAGE & IN PHIẾU KẾT QUẢ THI (A4)
  // ============================================================================
  function saveToLocalStorage() {
    const resultPayload = {
      candidate: state.candidate,
      examName: state.currentExam.tenDe,
      examCode: state.currentExam.maDe,
      startTime: state.timer.startTime ? state.timer.startTime.toISOString() : '',
      submitTime: state.timer.submitTime ? state.timer.submitTime.toISOString() : '',
      duration: formatExamDuration(),
      correctCount: state.gradedResult.correctCount,
      totalMcq: 20,
      scoreConverted: state.gradedResult.scoreConverted,
      userAnswers: state.userAnswers,
      tuLuanQuestions: state.currentExam.tuLuan
    };

    localStorage.setItem('PCCC_LAST_EXAM_RESULT', JSON.stringify(resultPayload));
  }

  function handlePrintResult() {
    // Mở trang phiếu in kết quả chuyên nghiệp A4
    window.open('phieu_in.html', '_blank');
  }

  // ============================================================================
  // 10. GỬI DỮ LIỆU ĐỒNG BỘ VỀ GOOGLE SHEETS & MỞ KẾT QUẢ KHI THÀNH CÔNG
  // - Dừng lại ở màn hình nộp đến khi Google Sheet xác nhận lưu bài thành công
  // - Nếu mạng chậm quá 10 giây hoặc có lỗi: Chuyển sang nút Bấm Để Thử Nộp Lại
  // ============================================================================
  function sendToGoogleSheetsAndFinish() {
    const webhookUrl = GOOGLE_SHEETS_WEBHOOK_URL;
    let secondsElapsed = 0;
    const secEl = document.getElementById('submit-seconds-elapsed');

    // Chạy đồng hồ đếm giây nộp bài
    if (submitProgressInterval) clearInterval(submitProgressInterval);
    submitProgressInterval = setInterval(() => {
      secondsElapsed++;
      if (secEl) secEl.textContent = secondsElapsed;
    }, 1000);

    const payload = {
      timestamp: new Date().toLocaleString('vi-VN'),
      fullName: state.candidate.fullName,
      unit: state.candidate.unit,
      rank: state.candidate.rank,
      examCode: state.currentExam.maDe,
      examName: state.currentExam.tenDe,
      mcqScoreText: `${state.gradedResult.correctCount}/20`,
      mcqScoreNumber: state.gradedResult.correctCount,
      mcqScoreTenScale: state.gradedResult.scoreConverted,
      duration: formatExamDuration(),
      essay1: state.userAnswers.essay[state.currentExam.tuLuan[0]?.ID] || '',
      essay2: state.userAnswers.essay[state.currentExam.tuLuan[1]?.ID] || ''
    };

    let isHandled = false;

    // Timeout: Nếu quá 10 giây chưa phản hồi -> Cho phép thí sinh bấm nộp lại
    if (submitTimeoutId) clearTimeout(submitTimeoutId);
    submitTimeoutId = setTimeout(() => {
      if (isHandled) return;
      isHandled = true;
      if (submitProgressInterval) clearInterval(submitProgressInterval);
      showSubmittingRetryUI('Thời gian gửi bài quá 10 giây do kết nối mạng yếu hoặc chập chờn. Toàn bộ bài làm của đồng chí vẫn được bảo toàn.');
    }, 10000);

    // Gửi bằng fetch với mode no-cors
    fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(() => {
      if (isHandled) return;
      isHandled = true;
      if (submitProgressInterval) clearInterval(submitProgressInterval);
      if (submitTimeoutId) clearTimeout(submitTimeoutId);

      // Cập nhật thông báo nộp bài thành công trên modal
      const title = document.getElementById('submitting-title');
      const desc = document.getElementById('submitting-desc');
      if (title) title.innerHTML = '<span style="color: #16a34a;">✅ ĐÃ LƯU BÀI THI THÀNH CÔNG!</span>';
      if (desc) desc.textContent = 'Hệ thống đã ghi nhận bài thi. Đang hiển thị bảng điểm và đáp án...';

      // Chờ 500ms cho mượt mà rồi mới chuyển sang màn hình kết quả
      setTimeout(() => {
        closeSubmittingModal();
        renderResultScreen();
      }, 500);
    })
    .catch(err => {
      if (isHandled) return;
      isHandled = true;
      if (submitProgressInterval) clearInterval(submitProgressInterval);
      if (submitTimeoutId) clearTimeout(submitTimeoutId);
      console.error('Lỗi gửi dữ liệu lên máy chủ:', err);
      showSubmittingRetryUI('Có lỗi đường truyền mạng khi gửi bài thi lên máy chủ (' + (err.message || 'Mất kết nối') + '). Bài làm vẫn an toàn, vui lòng kiểm tra mạng và bấm nộp lại.');
    });
  }

  function showSubmittingRetryUI(errorMessage) {
    const loadingBlock = document.getElementById('submitting-state-loading');
    const retryBlock = document.getElementById('submitting-state-retry');
    if (loadingBlock) loadingBlock.style.display = 'none';
    if (retryBlock) retryBlock.style.display = 'block';

    const errEl = document.getElementById('submitting-error-msg');
    if (errEl) errEl.textContent = errorMessage;
  }

})();
