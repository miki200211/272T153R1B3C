/**
 * 272梯 陸軍步兵第153旅 步兵第一營第三連 (153R 1B3C) 紀念冊系統
 * 前端核心應用程式邏輯 app.js
 */

const APP = {
  // 數字轉國字輔助函式 (1~11 轉 一~十一)
  toChineseNum(num) {
    const n = Number(num);
    const mapping = {
      1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
      6: '六', 7: '七', 8: '八', 9: '九', 10: '十', 11: '十一'
    };
    return mapping[n] || String(num);
  },

  // 輔助函式：標準化日期為 YYYY-MM-DD (防止 ISO 格式或斜線破壞 input[type=date])
  formatDateToYMD(dateVal) {
    if (!dateVal) return '';
    if (typeof dateVal === 'object' && dateVal instanceof Date) {
      if (isNaN(dateVal.getTime())) return '';
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, '0');
      const d = String(dateVal.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    let str = String(dateVal).trim();
    if (!str) return '';
    if (str.includes('T')) {
      const dObj = new Date(str);
      if (!isNaN(dObj.getTime())) {
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        const d = String(dObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return str.split('T')[0];
    }
    if (str.includes('/')) {
      str = str.replace(/\//g, '-');
    }
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = parts[0].padStart(4, '20');
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return str;
  },

  // 計算幹部入伍年資 (幾年幾個月)
  calculateServiceTime(dateStr) {
    if (!dateStr) return null;
    const ymd = this.formatDateToYMD(dateStr);
    if (!ymd) return null;
    const parts = ymd.split('-');
    if (parts.length < 3) return null;
    const start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (isNaN(start.getTime())) return null;
    const now = new Date();
    if (now < start) return '尚未入伍';

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    if (years <= 0 && months <= 0) {
      return '未滿 1 個月';
    }
    if (years <= 0) {
      return `${months} 個月`;
    }
    if (months === 0) {
      return `${years} 年`;
    }
    return `${years} 年 ${months} 個月`;
  },

  // 編輯視窗即時入伍年資計算預覽
  handleEnlistDateChange(dateStr) {
    const previewEl = document.getElementById('profile-service-years-preview');
    if (!previewEl) return;
    if (!dateStr) {
      previewEl.style.display = 'none';
      previewEl.textContent = '';
      return;
    }
    const serviceTime = this.calculateServiceTime(dateStr);
    if (serviceTime) {
      previewEl.style.display = 'block';
      previewEl.textContent = `✨ 自動計算年資：已服役 ${serviceTime} (入伍日期：${dateStr})`;
    } else {
      previewEl.style.display = 'none';
    }
  },

  // 輔助函式：格式化檔案大小 (KB / MB)
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  // 輔助函式：美化日期時間顯示 (例如 2026-08-21 09:09)
  formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const s = String(dateStr).trim();
    if (s.includes('T')) {
      return s.replace('T', ' ').substring(0, 16);
    }
    return s.substring(0, 16);
  },

  // 輔助函式：將 Google Drive 圖片連結轉為公開直連 Google CDN 網址 (突破跨域阻擋與 Cookie 限制，秒速載入)
  formatImageUrl(url) {
    if (!url) return '';
    const clean = String(url).trim();
    if (!clean) return '';
    if (clean.startsWith('data:image/')) return clean; // Base64 直接回傳
    
    // 擷取 Google Drive File ID (支援 uc?id=, file/d/, open?id= 等各種格式)
    const match = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/) || clean.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return clean;
  },

  // 智慧圖片等比縮圖與壓縮機制 (Canvas Resizer & Compressor)
  // 將任意大圖 (例如手機拍的 5~20MB 照片) 自動等比縮圖至最適證件照尺寸 (預設寬 600px, 高 800px)
  // 並壓縮為高品質 JPEG (品質 0.82)，大幅縮小檔案大小 (~60KB~120KB) 同時保有清晰畫質，徹底解決上傳過大問題！
  compressImage(file, maxWidth = 600, maxHeight = 800, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        return reject(new Error('請選擇有效的圖片檔案 (JPG, PNG, WebP)'));
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // 計算等比例縮放尺寸 (維持原圖長寬比)
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          // 開啟高品質雙線性平滑縮放
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 繪製縮圖
          ctx.drawImage(img, 0, 0, width, height);

          // 導出輕量化 JPEG Base64
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          
          // 計算壓縮後近似位元組大小
          const approxCompressedSize = Math.round((compressedBase64.length * 3) / 4);

          resolve({
            base64: compressedBase64,
            originalSize: file.size,
            compressedSize: approxCompressedSize,
            width,
            height
          });
        };
        img.onerror = () => reject(new Error('圖片載入失敗，檔案可能已損毀或格式不支援'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsDataURL(file);
    });
  },

  // 狀態變數
  currentUser: null,
  currentView: 'home',
  selectedSquad: 1,
  selectedRoom: 1,
  allMembers: [],
  cadres: [],
  legends: [],
  diaries: [],
  timeline: [],
  reports: [],
  currentReportFilter: 'all',
  searchQuery: '',
  tempMilitaryAvatarBase64: null,
  tempCivilianAvatarBase64: null,
  isSubmitting: false, // 防重複連點與並發鎖旗標

  // 初始化應用程式
  async init() {
    console.log('🎖️ 272T 153R 1B3C 紀念冊系統啟動中...');
    this.currentUser = CONFIG.getCurrentUser();
    this.updateAuthUI();
    this.updateServiceStatusUI();

    // 載入資料 (優先從 API / LocalStorage 載入)
    await this.loadAllData();

    // 預設導航至首頁
    this.navigate('home');
    this.updateServiceStatusUI();

    // 檢查目前登入者是否處於首次登入未修改密碼狀態 (強制要求設定密碼)
    if (this.currentUser && this.currentUser.needs_password_change) {
      setTimeout(() => {
        this.openForcePasswordModal();
      }, 500);
    }

    // 註冊鍵盤快捷鍵 (如 Esc 關閉彈窗)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  },

  // 資料型別安全正規化處理 (確保 id 為字串、squad/room 為數字，避免 GAS 數值型別導致呼叫 substring 錯誤)
  normalizeMembers(rawMembers) {
    const squadDutyMap = (typeof CONFIG !== 'undefined' && CONFIG.SQUAD_DUTIES) ? CONFIG.SQUAD_DUTIES : {
      1: '打飯班', 2: '兵工班', 3: '器材班', 4: '資收班', 5: '內掃班',
      6: '洗衣班', 7: '外掃班', 8: '公差班', 9: '公差班'
    };

    return (rawMembers || []).map(m => {
      const squadNum = Number(m.squad) || 1;
      const defaultSquadDuty = squadDutyMap[squadNum] || '一般兵';
      let dutyStr = String(m.duty ?? '').trim();
      if (!dutyStr || dutyStr === '一般兵' || dutyStr === '士兵') {
        dutyStr = defaultSquadDuty;
      } else if (dutyStr === '班頭') {
        dutyStr = `班頭 / ${defaultSquadDuty}`;
      }

      return {
        ...m,
        id: String(m.id ?? '').trim(),
        name: String(m.name ?? '').trim(),
        nickname: String(m.nickname ?? '').trim(),
        squad: squadNum,
        room: Number(m.room) || 1,
        duty: dutyStr,
        interests: String(m.interests ?? '').trim(),
        dream: String(m.dream ?? '').trim(),
        ig: String(m.ig ?? '').trim(),
        line: String(m.line ?? '').trim(),
        bio: String(m.bio ?? m.graduation_quote ?? '').trim(), // 💬 結訓感言 (原本的 bio 欄位，外層卡片展示)
        self_intro: String(m.self_intro ?? m.intro ?? m.dossier_bio ?? '').trim(), // 📝 個人自我介紹 (新增在 Excel 的 self_intro 欄位，點進檔案才展示)
        avatar_military: this.formatImageUrl(m.avatar_military || m.avatar_url || ''),
        avatar_civilian: this.formatImageUrl(m.avatar_civilian || '')
      };
    });
  },

  normalizeCadres(rawCadres) {
    if (!Array.isArray(rawCadres) || rawCadres.length === 0) {
      rawCadres = MOCK_DATA.getInitialCadres();
    }
    // 過濾掉無名無職的空白假帳號
    const validCadres = rawCadres.filter(c => c && (c.name || c.duty || c.nickname));
    const listToUse = validCadres.length > 0 ? validCadres : MOCK_DATA.getInitialCadres();

    return listToUse.map((c, idx) => {
      // 智慧推算所屬班級 (若未帶 squad 欄位則從 duty 解析)
      let squadNum = Number(c.squad) || 0;
      if (!squadNum && c.duty) {
        const match = c.duty.match(/第([一二三四五六七八九十\d]+)班/);
        if (match) {
          const numMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
          squadNum = numMap[match[1]] || Number(match[1]) || 0;
        }
      }

      return {
        ...c,
        id: String(c.id || `CADRE-${idx + 1}`).trim(),
        name: String(c.name ?? '').trim(),
        nickname: String(c.nickname ?? '').trim(),
        squad: squadNum,
        rank_level: String(c.rank_level ?? c.rank ?? '').trim(),
        duty: String(c.duty ?? '連隊幹部').trim(),
        enlist_date: this.formatDateToYMD(c.enlist_date),
        interests: String(c.interests ?? '').trim(),
        dream: String(c.dream ?? '').trim(),
        ig: String(c.ig ?? '').trim(),
        line: String(c.line ?? '').trim(),
        bio: String(c.bio ?? c.graduation_quote ?? '').trim(), // 💬 幹部期勉座右銘 (原本的 bio 欄位，外層卡片展示)
        self_intro: String(c.self_intro ?? c.intro ?? c.dossier_bio ?? '').trim(), // 📝 幹部自我介紹 (新增在 Excel 的 self_intro 欄位，點進檔案才展示)
        avatar_military: this.formatImageUrl(c.avatar_military || c.avatar_url || c.photo_url || ''),
        avatar_civilian: this.formatImageUrl(c.avatar_civilian || ''),
        is_cadre: true
      };
    });
  },

  // 時間軸資料安全正規化與排序處理 (支援後台 Google Sheet / Excel 同步自訂)
  normalizeTimeline(rawTimeline) {
    if (!Array.isArray(rawTimeline) || rawTimeline.length === 0) {
      rawTimeline = MOCK_DATA.timeline || [];
    }

    return rawTimeline.map((item, idx) => {
      let dateStr = String(item.date || item.date_str || '').trim();
      if (dateStr.includes('T')) {
        const dObj = new Date(dateStr);
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        const d = String(dObj.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${d}`;
      }
      if (dateStr && !dateStr.includes('-') && !dateStr.includes('/')) {
        dateStr = `2026-${dateStr}`;
      }
      dateStr = dateStr.replace(/\//g, '-');
      if (dateStr.length <= 5 && dateStr.includes('-')) {
        dateStr = `2026-${dateStr}`;
      }

      let displayDate = String(item.display_date || '').trim();
      if (!displayDate || displayDate.includes('T') || displayDate.length > 8) {
        if (dateStr.length >= 10) {
          displayDate = dateStr.substring(5).replace('-', '/');
        } else {
          displayDate = dateStr;
        }
      }

      let title = String(item.title || item.name || `軍旅里程碑 #${idx + 1}`).trim();
      let badge = String(item.badge || item.category || '重要日程').trim();
      let description = String(item.description || item.desc || '').trim();
      let icon = String(item.icon || (idx === 0 ? '🪖' : (idx === rawTimeline.length - 1 ? '🎖️' : '🎯'))).trim();
      let type = String(item.type || (idx === 0 ? 'start' : (idx === rawTimeline.length - 1 ? 'end' : 'milestone'))).trim();

      // 智慧校正：若 Google 試算表歷史資料仍殘留舊版 12/13 / 10/12 / 09/15 日程，自動對齊國軍官方公文標準日期
      if (dateStr === '2026-12-13' || displayDate === '12/13') {
        dateStr = '2026-12-02';
        displayDate = '12/02';
        title = '光榮結訓・結訓令生效';
        badge = '光榮退伍';
        description = '常備兵役軍事訓練圓滿達成！115年12月2日零時生效，三連兄弟江湖再見！';
        icon = '🎖️';
        type = 'end';
      } else if (dateStr === '2026-10-12' || dateStr === '2026-10-10' || displayDate === '10/12' || displayDate === '10/10') {
        dateStr = '2026-10-15';
        displayDate = '10/15';
        title = '下部隊撥交・二階段戰訓';
        badge = '下部隊實務';
        description = '金六結第一階段入伍訓練圓滿結業 (10/14撥交)！10/15起進入第二階段部隊訓練！';
        icon = '⚔️';
        type = 'training';
      } else if ((dateStr === '2026-09-15' || displayDate === '09/15') && title.includes('鑑測')) {
        dateStr = '2026-10-05';
        displayDate = '10/05';
        title = '入伍結訓鑑測・總驗收';
        badge = '結訓鑑測';
        description = '入伍結訓鑑測 (10/5~10/8)：刺槍術、手榴彈投擲、三千公尺跑步與實彈射擊總驗收！';
        icon = '🎯';
        type = 'milestone';
      }

      return {
        id: item.id || idx + 1,
        date: dateStr,
        display_date: displayDate,
        title,
        badge,
        description,
        icon,
        type
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  // 載入所有資料庫資料
  async loadAllData() {
    try {
      const response = await API.getAllData();
      if (response && response.success && response.data) {
        this.allMembers = this.normalizeMembers(response.data.members);
        this.cadres = this.normalizeCadres(response.data.cadres);
        this.legends = response.data.legends || [];
        this.diaries = response.data.diaries || [];
        this.timeline = this.normalizeTimeline(response.data.timeline || response.data.milestones || MOCK_DATA.timeline);
        this.reports = response.data.reports || MOCK_DATA.getInitialReports();
      } else {
        // 降級為 MOCK_DATA
        this.allMembers = this.normalizeMembers(MOCK_DATA.getInitialMembers());
        this.cadres = this.normalizeCadres(MOCK_DATA.getInitialCadres());
        this.legends = MOCK_DATA.legends || [];
        this.diaries = MOCK_DATA.diaries || [];
        this.timeline = this.normalizeTimeline(MOCK_DATA.timeline);
        this.reports = MOCK_DATA.getInitialReports();
      }
    } catch (e) {
      console.warn('載入資料異常，啟用預設資料庫:', e);
      this.allMembers = this.normalizeMembers(MOCK_DATA.getInitialMembers());
      this.cadres = this.normalizeCadres(MOCK_DATA.getInitialCadres());
      this.legends = MOCK_DATA.legends || [];
      this.diaries = MOCK_DATA.diaries || [];
      this.timeline = this.normalizeTimeline(MOCK_DATA.timeline);
      this.reports = MOCK_DATA.getInitialReports();
    }

    // 更新首頁統計數字與役期階段狀態
    const memberCountEl = document.getElementById('stat-members-count');
    if (memberCountEl) memberCountEl.textContent = this.allMembers.length;
    const cadreCountEl = document.getElementById('stat-cadres-count');
    if (cadreCountEl) cadreCountEl.textContent = this.cadres.length;
    this.updateServiceStatusUI();
  },

  // 手動 / 即時同步最新雲端資料庫
  async refreshData() {
    this.showToast('🔄 正在同步最新雲端資料庫與照片...', 'info');
    API.invalidateCache();
    await this.loadAllData();
    this.navigate(this.currentView, this.currentView === 'squad' ? this.selectedSquad : (this.currentView === 'room' ? this.selectedRoom : null));
    this.showToast('✨ 雲端資料庫同步完成，已是最新狀態！', 'success');
  },

  // =========================================================================
  // 導覽切換 (Navigation Router)
  // =========================================================================
  navigate(viewName, param = null) {
    this.currentView = viewName;
    this.closeMobileDrawer();

    // 隱藏所有視圖
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

    // 更新側邊欄按鈕 active 樣式
    document.querySelectorAll('.nav-item-btn').forEach(btn => btn.classList.remove('active'));

    // 更新手機版底部快捷導覽 active 樣式 (傳奇版與大兵日記均對應「互動區」)
    document.querySelectorAll('.mobile-bottom-btn').forEach(btn => btn.classList.remove('active'));
    let bottomNavTarget = viewName;
    if (viewName === 'legends' || viewName === 'diaries' || viewName === 'reports') {
      bottomNavTarget = 'interaction';
    }
    const bottomBtn = document.querySelector(`.mobile-bottom-btn[data-bottom-nav="${bottomNavTarget}"]`);
    if (bottomBtn) bottomBtn.classList.add('active');

    if (viewName !== 'squad' || param !== null) {
      this.searchQuery = '';
      const searchInput = document.getElementById('member-search-input');
      if (searchInput) searchInput.value = '';
    }

    if (viewName === 'home') {
      const homeSec = document.getElementById('view-home');
      if (homeSec) homeSec.classList.add('active');
      this.setActiveNavBtn('home');
      this.renderHomeView();
    } else if (viewName === 'cadres') {
      const cadresSec = document.getElementById('view-cadres');
      if (cadresSec) cadresSec.classList.add('active');
      this.setActiveNavBtn('cadres');
      this.renderCadresView();
    } else if (viewName === 'squad') {
      this.selectedSquad = param !== null ? Number(param) : (this.selectedSquad || 1);
      const squadSec = document.getElementById('view-squad');
      if (squadSec) squadSec.classList.add('active');
      this.setActiveNavBtn(`squad-${this.selectedSquad}`);
      this.renderSquadView();
    } else if (viewName === 'room') {
      this.selectedRoom = param !== null ? Number(param) : (this.selectedRoom || 1);
      const roomSec = document.getElementById('view-room');
      if (roomSec) roomSec.classList.add('active');
      const suiteNavId = Math.floor((this.selectedRoom - 1) / 2) * 2 + 1;
      this.setActiveNavBtn(`room-${suiteNavId}`);
      this.renderRoomView();
    } else if (viewName === 'legends') {
      const legendsSec = document.getElementById('view-legends');
      if (legendsSec) legendsSec.classList.add('active');
      this.setActiveNavBtn('legends');
      this.renderLegendsView();
    } else if (viewName === 'diaries') {
      const diariesSec = document.getElementById('view-diaries');
      if (diariesSec) diariesSec.classList.add('active');
      this.setActiveNavBtn('diaries');
      this.renderDiariesView();
    } else if (viewName === 'reports') {
      const reportsSec = document.getElementById('view-reports');
      if (reportsSec) reportsSec.classList.add('active');
      this.setActiveNavBtn('reports');
      this.renderReportsView();
    }

    // 滾動回頂部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  setActiveNavBtn(navDataAttr) {
    const btn = document.querySelector(`.nav-item-btn[data-nav="${navDataAttr}"]`);
    if (btn) btn.classList.add('active');
  },

  toggleMobileDrawer() {
    const sidebar = document.getElementById('sidebar-nav');
    const backdrop = document.getElementById('drawer-backdrop');
    if (sidebar) {
      sidebar.classList.toggle('drawer-open');
      const isOpen = sidebar.classList.contains('drawer-open');
      if (backdrop) backdrop.classList.toggle('active', isOpen);
    }
  },

  closeMobileDrawer() {
    const sidebar = document.getElementById('sidebar-nav');
    const backdrop = document.getElementById('drawer-backdrop');
    if (sidebar) sidebar.classList.remove('drawer-open');
    if (backdrop) backdrop.classList.remove('active');
  },

  // =========================================================================
  // 手機版與快速選單：班級與寢室彈出選擇清單 (Squad & Room Selectors)
  // =========================================================================

  handleMobileSquadNav() {
    this.openSquadSelector();
  },

  handleMobileRoomNav() {
    this.openRoomSelector();
  },

  openSquadSelector() {
    const grid = document.getElementById('squad-selector-grid');
    if (grid) {
      const squads = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      grid.innerHTML = squads.map(num => {
        const isActive = (this.currentView === 'squad' && this.selectedSquad === num);
        const leader = MOCK_DATA.squadLeaders[num] || { name: '帶班班長', rank: '帶班幹部' };
        const dutyName = (typeof CONFIG !== 'undefined' && CONFIG.SQUAD_DUTIES && CONFIG.SQUAD_DUTIES[num]) || '';
        const dutyIcon = (typeof CONFIG !== 'undefined' && CONFIG.SQUAD_DUTY_ICONS && CONFIG.SQUAD_DUTY_ICONS[num]) || '👥';
        const leaderText = `🎖️ 班長：${leader.rank || ''} ${leader.name || ''}`;
        const countText = (num === 8) ? '10 人' : '11 人';
        return `
          <div class="selector-card-item ${isActive ? 'active' : ''}" onclick="APP.selectSquad(${num})">
            <div class="selector-card-title">${dutyIcon} 第 ${this.toChineseNum(num)} 班・${dutyName}</div>
            <div class="selector-card-subtitle" style="font-size:0.75rem;">${this.escapeHtml(leaderText)}</div>
            <div class="selector-card-badge">${countText}滿編</div>
          </div>
        `;
      }).join('');
    }
    const modal = document.getElementById('modal-select-squad');
    if (modal) modal.classList.add('active');
  },

  selectSquad(squadNum) {
    this.closeModal('modal-select-squad');
    this.navigate('squad', squadNum);
  },

  openRoomSelector() {
    const grid = document.getElementById('room-selector-grid');
    if (grid) {
      const suites = [
        { roomA: 1, roomB: 2, title: '🏢 第 1 & 2 寢套房', subtitle: '第 1 寢 (10人) ⇋ 🚿 衛浴 ⇋ 第 2 寢 (10人)', count: '共 20 人' },
        { roomA: 3, roomB: 4, title: '🏢 第 3 & 4 寢套房', subtitle: '第 3 寢 (10人) ⇋ 🚿 衛浴 ⇋ 第 4 寢 (10人)', count: '共 20 人' },
        { roomA: 5, roomB: 6, title: '🏢 第 5 & 6 寢套房', subtitle: '第 5 寢 (10人) ⇋ 🚿 衛浴 ⇋ 第 6 寢 (10人)', count: '共 20 人' },
        { roomA: 7, roomB: 8, title: '🏢 第 7 & 8 寢套房', subtitle: '第 7 寢 (10人) ⇋ 🚿 衛浴 ⇋ 第 8 寢 (10人)', count: '共 20 人' },
        { roomA: 9, roomB: 10, title: '🏢 第 9 & 10 寢套房', subtitle: '第 9 寢 (10人) ⇋ 🚿 衛浴 ⇋ 第 10 寢 (10人)', count: '共 20 人' },
        { roomA: 11, roomB: 12, title: '🏢 第 11 & 12 寢套房', subtitle: '第 11 寢 (9人) ⇋ 🚿 衛浴 ⇋ 第 12 寢 (備用空寢)', count: '共 9 人 (12未住人)' }
      ];

      grid.innerHTML = suites.map(s => {
        const isActive = (this.currentView === 'room' && (this.selectedRoom === s.roomA || this.selectedRoom === s.roomB));
        return `
          <div class="selector-card-item ${isActive ? 'active' : ''}" onclick="APP.selectRoom(${s.roomA})">
            <div class="selector-card-title">${s.title}</div>
            <div class="selector-card-subtitle" style="font-size:0.75rem;">${s.subtitle}</div>
            <div class="selector-card-badge">${s.count}</div>
          </div>
        `;
      }).join('');
    }
    const modal = document.getElementById('modal-select-room');
    if (modal) modal.classList.add('active');
  },

  selectRoom(roomNum) {
    this.closeModal('modal-select-room');
    this.navigate('room', roomNum);
  },

  handleMobileInteractionNav() {
    this.openInteractionSelector();
  },

  openInteractionSelector() {
    const grid = document.getElementById('interaction-selector-grid');
    if (grid) {
      const items = [
        {
          view: 'legends',
          icon: '⚡',
          title: '傳奇版',
          subtitle: '三連英雄事蹟・狂讚排行榜',
          badge: `${this.legends.length} 則事蹟`
        },
        {
          view: 'diaries',
          icon: '📖',
          title: '大兵日記',
          subtitle: '軍旅心得隨筆・真摯圖文紀錄',
          badge: `${this.diaries.length} 篇日記`
        },
        {
          view: 'reports',
          icon: '📬',
          title: '問題回報與密碼處理',
          subtitle: '忘記密碼申請・系統建議與回覆',
          badge: `${this.reports.length} 則回報`
        }
      ];

      grid.innerHTML = items.map(item => {
        const isActive = (this.currentView === item.view);
        return `
          <div class="selector-card-item interaction-selector-card ${isActive ? 'active' : ''}" onclick="APP.selectInteraction('${item.view}')">
            <div class="interaction-selector-icon">${item.icon}</div>
            <div class="selector-card-title">${item.title}</div>
            <div class="selector-card-subtitle" style="font-size:0.78rem; margin: 0.2rem 0; color: #55695a;">${item.subtitle}</div>
            <div class="selector-card-badge">${item.badge}</div>
          </div>
        `;
      }).join('');
    }
    const modal = document.getElementById('modal-select-interaction');
    if (modal) modal.classList.add('active');
  },

  selectInteraction(viewName) {
    this.closeModal('modal-select-interaction');
    this.navigate(viewName);
  },

  handleSelectorOverlayClick(event, modalId) {
    if (event.target.id === modalId) {
      this.closeModal(modalId);
    }
  },

  // =========================================================================
  // 傳奇榜與大兵日記按讚系統 (Likes & Ranking System)
  // =========================================================================

  // 取得裝置或登入者唯一辨識 ID (用於按讚去重)
  getVisitorId() {
    if (this.currentUser && this.currentUser.id) return String(this.currentUser.id).trim();
    let visitorId = localStorage.getItem('153r1b3c_visitor_id');
    if (!visitorId) {
      visitorId = 'visitor_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('153r1b3c_visitor_id', visitorId);
    }
    return visitorId;
  },

  // 取得傳奇項目唯一 Key
  getLegendKey(legend) {
    if (!legend) return '';
    if (legend.legend_id) return `legend_${legend.legend_id}`;
    return `legend_${String(legend.target_id || '').trim()}_${String(legend.author_id || '').trim()}_${String(legend.title || '').trim()}`;
  },

  // 取得大兵日記項目唯一 Key
  getDiaryKey(diary) {
    if (!diary) return '';
    if (diary.diary_id) return `diary_${diary.diary_id}`;
    return `diary_${String(diary.author_id || '').trim()}_${String(diary.title || '').trim()}`;
  },

  // 取得傳奇按讚數與當前使用者是否已讚
  getLegendLikes(legend) {
    const key = this.getLegendKey(legend);
    const likesMap = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.LEGEND_LIKES) || '{}');
    const item = likesMap[key] || { count: 0, userIds: [] };
    const visitorId = this.getVisitorId();
    const isLiked = Array.isArray(item.userIds) && item.userIds.includes(visitorId);
    return { count: Number(item.count) || 0, isLiked, key };
  },

  // 取得日記按讚數與當前使用者是否已讚
  getDiaryLikes(diary) {
    const key = this.getDiaryKey(diary);
    const likesMap = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.DIARY_LIKES) || '{}');
    const item = likesMap[key] || { count: 0, userIds: [] };
    const visitorId = this.getVisitorId();
    const isLiked = Array.isArray(item.userIds) && item.userIds.includes(visitorId);
    return { count: Number(item.count) || 0, isLiked, key };
  },

  // 傳奇按讚 / 收回讚
  async toggleLikeLegend(key, event) {
    if (event) event.stopPropagation();
    const visitorId = this.getVisitorId();
    const likesMap = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.LEGEND_LIKES) || '{}');
    if (!likesMap[key]) {
      likesMap[key] = { count: 0, userIds: [] };
    }
    if (!Array.isArray(likesMap[key].userIds)) {
      likesMap[key].userIds = [];
    }
    const idx = likesMap[key].userIds.indexOf(visitorId);
    let isLiked = false;
    if (idx >= 0) {
      likesMap[key].userIds.splice(idx, 1);
      likesMap[key].count = Math.max(0, (likesMap[key].count || 1) - 1);
      isLiked = false;
      this.showToast('已收回對這篇傳奇的讚 👍', 'info');
    } else {
      likesMap[key].userIds.push(visitorId);
      likesMap[key].count = (likesMap[key].count || 0) + 1;
      isLiked = true;
      this.showToast('🔥 弟兄狂讚！已為這篇傳奇灌入 1 票！', 'success');
    }
    localStorage.setItem(CONFIG.STORAGE_KEYS.LEGEND_LIKES, JSON.stringify(likesMap));

    try {
      API.likeLegend(key, visitorId);
    } catch (e) {}

    if (this.currentView === 'home') {
      this.renderHomeView();
    } else if (this.currentView === 'legends') {
      this.renderLegendsView();
    }
  },

  // 大兵日記按讚 / 收回讚
  async toggleLikeDiary(key, event) {
    if (event) event.stopPropagation();
    const visitorId = this.getVisitorId();
    const likesMap = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.DIARY_LIKES) || '{}');
    if (!likesMap[key]) {
      likesMap[key] = { count: 0, userIds: [] };
    }
    if (!Array.isArray(likesMap[key].userIds)) {
      likesMap[key].userIds = [];
    }
    const idx = likesMap[key].userIds.indexOf(visitorId);
    let isLiked = false;
    if (idx >= 0) {
      likesMap[key].userIds.splice(idx, 1);
      likesMap[key].count = Math.max(0, (likesMap[key].count || 1) - 1);
      isLiked = false;
      this.showToast('已收回對這篇日記的讚 ❤️', 'info');
    } else {
      likesMap[key].userIds.push(visitorId);
      likesMap[key].count = (likesMap[key].count || 0) + 1;
      isLiked = true;
      this.showToast('❤️ 讚賞心得！輔導長與全連弟兄感謝你的真摯點讚！', 'success');
    }
    localStorage.setItem(CONFIG.STORAGE_KEYS.DIARY_LIKES, JSON.stringify(likesMap));

    try {
      API.likeDiary(key, visitorId);
    } catch (e) {}

    if (this.currentView === 'home') {
      this.renderHomeView();
    } else if (this.currentView === 'diaries') {
      this.renderDiariesView();
    }
  },

  // =========================================================================
  // 畫面渲染邏輯 (View Renderers)
  // =========================================================================

  // 役期兩階段與時間動態狀態計算 (依官方公文：8/12~10/14 金六結新訓第一階段，10/15~12/01 下部隊二階段，12/02 零時結訓生效)
  getServiceStageData() {
    const now = new Date();
    // 歸零時分秒以進行準確日數比較
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startDate = new Date(2026, 7, 12);  // 2026-08-12 (月從0起算，7代表8月)
    const phase2Date = new Date(2026, 9, 15); // 2026-10-15 (9代表10月，下部隊撥交)
    const endDate = new Date(2026, 11, 2);    // 2026-12-02 (11代表12月，12/2 零時結訓生效)

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = 113; // 8/12 ~ 12/02 總役期 113 天 (115/12/02 零時生效)

    if (today < startDate) {
      const daysUntil = Math.ceil((startDate - today) / msPerDay);
      return {
        stageCode: 'PRE_ENLIST',
        headerBadge: '[ 蓄勢待發・即將入伍 ]',
        heroBadge: '[ 階段：入伍集結準備 ]',
        badgeClass: 'stage-pre',
        heroTitle: '蓄勢待發・金六結即將成軍',
        heroDesc: '272梯 步兵第一營第三連即將成軍！準備迎接金六結精實淬鍊與迷彩青春！',
        mottoTag: `🎖️ 陸軍272梯・倒數 ${daysUntil} 天入伍`,
        stageName: '入伍準備期',
        stageSublabel: 'PRE-ENLISTMENT',
        daysServed: 0,
        daysTotal: totalDays,
        daysRemaining: totalDays,
        progressPercent: 0,
        statDaysValue: `${daysUntil}<span class="stat-unit" style="font-size:0.9rem; margin-left:2px;">天後</span>`,
        statDaysLabel: '入伍倒數 (8/12報到)',
        statDaysSub: 'COUNTDOWN',
        statStageValue: '入伍準備',
        statStageLabel: '當前訓練階段',
        statStageSub: 'STAGE 0'
      };
    } else if (today >= startDate && today < phase2Date) {
      // 第一階段：宜蘭金六結新訓受訓中 (8/12 ~ 10/14，10/14撥交)
      const daysServed = Math.max(1, Math.round((today - startDate) / msPerDay) + 1);
      const daysRemaining = Math.max(0, totalDays - daysServed);
      const progressPercent = Math.min(100, Math.max(0, Math.round((daysServed / totalDays) * 100)));

      return {
        stageCode: 'PHASE1_JINLIUJIE',
        headerBadge: '[ 宜蘭金六結・新訓受訓中 ]',
        heroBadge: '[ 階段一：金六結入伍受訓 ]',
        badgeClass: 'stage-jinliujie',
        heroTitle: '精實鍛鍊・金六結新訓中',
        heroDesc: `目前正於宜蘭金六結營區進行第一階段新兵入伍訓練 (08/12~10/14)，揮灑汗水、同甘共苦！<br>軍事訓練役已完成 ${progressPercent}%（已服役 ${daysServed}/${totalDays} 天），距離 12/02 零時光榮結訓還有 ${daysRemaining} 天！`,
        mottoTag: `🎖️ 金六結新訓・第 ${daysServed} 天`,
        stageName: '金六結新訓 (08/12~10/14)',
        stageSublabel: 'PHASE 1 // JINLIUJIE',
        daysServed: daysServed,
        daysTotal: totalDays,
        daysRemaining: daysRemaining,
        progressPercent: progressPercent,
        statDaysValue: `${daysServed}<span class="stat-unit" style="font-size:0.9rem; margin-left:2px;">/${totalDays}天</span>`,
        statDaysLabel: `役期進度 (剩 ${daysRemaining} 天)`,
        statDaysSub: `PROGRESS ${progressPercent}%`,
        statStageValue: '金六結新訓',
        statStageLabel: '當前階段 (第一階段)',
        statStageSub: 'PHASE 1 // JINLIUJIE'
      };
    } else if (today >= phase2Date && today < endDate) {
      // 第二階段：下部隊專精戰訓實務 (10/15 ~ 12/01)
      const daysServed = Math.max(1, Math.round((today - startDate) / msPerDay) + 1);
      const daysRemaining = Math.max(0, totalDays - daysServed);
      const progressPercent = Math.min(100, Math.max(0, Math.round((daysServed / totalDays) * 100)));
      const phase2DaysServed = Math.max(1, Math.round((today - phase2Date) / msPerDay) + 1);

      return {
        stageCode: 'PHASE2_TROOP',
        headerBadge: '[ 下部隊實務・二階段戰訓中 ]',
        heroBadge: '[ 階段二：下部隊實務戰訓 ]',
        badgeClass: 'stage-troops',
        heroTitle: '戰力堅強・下部隊實務階段',
        heroDesc: `已圓滿完成金六結第一階段新訓 (10/14撥交)，目前進入第二階段部隊訓練實務戰訓！<br>總役期已達成 ${progressPercent}%，倒數 ${daysRemaining} 天 12/02 零時光榮結訓生效！`,
        mottoTag: `🎖️ 下部隊實務・第 ${phase2DaysServed} 天`,
        stageName: '部隊訓練實務 (10/15~12/01)',
        stageSublabel: 'PHASE 2 // ACTIVE UNIT',
        daysServed: daysServed,
        daysTotal: totalDays,
        daysRemaining: daysRemaining,
        progressPercent: progressPercent,
        statDaysValue: `${daysServed}<span class="stat-unit" style="font-size:0.9rem; margin-left:2px;">/${totalDays}天</span>`,
        statDaysLabel: `役期進度 (剩 ${daysRemaining} 天)`,
        statDaysSub: `PROGRESS ${progressPercent}%`,
        statStageValue: '部隊訓練',
        statStageLabel: '當前階段 (第二階段)',
        statStageSub: 'PHASE 2 // TROOPS'
      };
    } else {
      // 結訓/光榮退伍 (>= 2026/12/02)
      return {
        stageCode: 'DISCHARGED',
        headerBadge: '[ 光榮退伍・任務達成 ]',
        heroBadge: '[ 任務圓滿達成・光榮退伍 ]',
        badgeClass: 'stage-discharged',
        heroTitle: '光榮退伍・任務達成',
        heroDesc: '紀念我們在宜蘭金六結與部隊共同揮灑汗水、鑑測行軍、打靶刺槍的迷彩歲月。<br>115年12月2日零時結訓令正式生效！四個月的革命情感，一輩子的真摯兄弟！結訓快樂，江湖再見！',
        mottoTag: '🎖️ 陸軍272梯・全連結訓',
        stageName: '光榮退伍',
        stageSublabel: 'MISSION ACCOMPLISHED',
        daysServed: totalDays,
        daysTotal: totalDays,
        daysRemaining: 0,
        progressPercent: 100,
        statDaysValue: `${totalDays}<span class="stat-unit" style="font-size:0.9rem; margin-left:2px;">天</span>`,
        statDaysLabel: '役期總日數 (8/12~12/02)',
        statDaysSub: 'MISSION ACCOMPLISHED',
        statStageValue: '光榮退伍',
        statStageLabel: '結訓任務狀態',
        statStageSub: 'HONORABLE DISCHARGE'
      };
    }
  },

  // 動態更新頂部狀態列、英雄橫幅與統計數據
  updateServiceStatusUI() {
    const stage = this.getServiceStageData();

    // 1. 頂部導覽列狀態徽章
    const headerBadge = document.getElementById('header-tactical-status-badge');
    if (headerBadge) {
      headerBadge.textContent = stage.headerBadge;
      headerBadge.className = `tactical-status-badge ${stage.badgeClass}`;
    }

    // 2. 英雄橫幅狀態徽章與標題
    const heroBadge = document.getElementById('hero-tactical-badge-status');
    if (heroBadge) {
      heroBadge.innerHTML = `<span class="status-pulse-dot"></span>${stage.heroBadge}`;
      heroBadge.className = `tactical-badge-status ${stage.badgeClass}`;
    }

    const heroMotto = document.getElementById('hero-tactical-motto');
    if (heroMotto) heroMotto.textContent = stage.mottoTag;

    const heroTitle = document.getElementById('hero-main-title');
    if (heroTitle) heroTitle.textContent = stage.heroTitle;

    const heroDesc = document.getElementById('hero-main-desc');
    if (heroDesc) heroDesc.innerHTML = stage.heroDesc;

    // 3. 統計卡片數值與標籤
    const statDaysNum = document.getElementById('hero-stat-days-num');
    if (statDaysNum) statDaysNum.innerHTML = stage.statDaysValue;

    const statDaysLabel = document.getElementById('hero-stat-days-label');
    if (statDaysLabel) statDaysLabel.textContent = stage.statDaysLabel;

    const statDaysSub = document.getElementById('hero-stat-days-sub');
    if (statDaysSub) statDaysSub.textContent = stage.statDaysSub;

    const statStageNum = document.getElementById('hero-stat-stage-num');
    if (statStageNum) statStageNum.textContent = stage.statStageValue;

    const statStageLabel = document.getElementById('hero-stat-stage-label');
    if (statStageLabel) statStageLabel.textContent = stage.statStageLabel;

    const statStageSub = document.getElementById('hero-stat-stage-sub');
    if (statStageSub) statStageSub.textContent = stage.statStageSub;
  },

  // 0. 軍旅役期時光軸渲染 (依國軍官方公文：入伍 8/12 ~ 結訓退伍 12/02，懇親 8/21，抽籤 9/30，鑑測 10/5~8，下部隊 10/15)
  renderTimeline() {
    const container = document.getElementById('military-timeline-section');
    if (!container) return;

    if (!this.timeline || this.timeline.length === 0) {
      this.timeline = this.normalizeTimeline(MOCK_DATA.timeline);
    }

    // 計算今日日期 (以 YYYY-MM-DD 比較)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startDate = new Date(2026, 7, 12);  // 2026-08-12 (入伍)
    const phase2Date = new Date(2026, 9, 15); // 2026-10-15 (下部隊)
    const endDate = new Date(2026, 11, 2);    // 2026-12-02 (退伍結訓令生效)

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = 113; // 8/12 ~ 12/02 總役期 113 天 (115/12/02 零時生效)
    
    let daysServed = 0;
    let daysRemaining = totalDays;
    let progressPercent = 0;

    if (today < startDate) {
      daysServed = 0;
      daysRemaining = totalDays;
      progressPercent = 0;
    } else if (today >= endDate) {
      daysServed = totalDays;
      daysRemaining = 0;
      progressPercent = 100;
    } else {
      daysServed = Math.max(1, Math.round((today - startDate) / msPerDay) + 1);
      daysRemaining = Math.max(0, totalDays - daysServed);
      progressPercent = Math.min(100, Math.max(0, Math.round((daysServed / totalDays) * 100)));
    }

    // 役期兩階段狀態判斷 (第一階段金六結新訓 08/12~10/14 ➔ 第二階段部隊訓練 10/15~12/01 ➔ 光榮退伍 12/02)
    const isP1Active = today >= startDate && today < phase2Date;
    const isP1Done = today >= phase2Date;
    const isP2Active = today >= phase2Date && today < endDate;
    const isP2Done = today >= endDate;
    const isDischarged = today >= endDate;

    // 役期起迄日
    const startItem = this.timeline[0] || { date: '2026-08-12', display_date: '08/12' };
    const endItem = this.timeline[this.timeline.length - 1] || { date: '2026-12-02', display_date: '12/02' };

    // 里程碑 HTML
    const milestonesHtml = this.timeline.map((m, index) => {
      const parts = String(m.date).split('-');
      let mDate;
      if (parts.length === 3) {
        mDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        mDate = new Date(m.date);
        mDate.setHours(0, 0, 0, 0);
      }

      let statusBadge = '';
      let statusClass = 'status-upcoming';

      if (today > mDate) {
        statusBadge = '<span class="milestone-status-tag tag-completed">✅ 已達成</span>';
        statusClass = 'status-completed';
      } else if (today.getTime() === mDate.getTime()) {
        statusBadge = '<span class="milestone-status-tag tag-today">🔥 今日進行中</span>';
        statusClass = 'status-today';
      } else {
        const daysDiff = Math.ceil((mDate - today) / msPerDay);
        statusBadge = `<span class="milestone-status-tag tag-upcoming">⏳ 倒數 ${daysDiff} 天</span>`;
        statusClass = 'status-upcoming';
      }

      return `
        <div class="timeline-step-item ${statusClass}" data-step="${index + 1}">
          <div class="timeline-node-marker">
            <div class="timeline-node-icon">${m.icon}</div>
          </div>
          <div class="timeline-card">
            <div class="timeline-card-header">
              <div class="timeline-date-capsule">
                <span class="date-num">📅 ${this.escapeHtml(m.display_date)}</span>
                <span class="milestone-badge">${this.escapeHtml(m.badge)}</span>
              </div>
              ${statusBadge}
            </div>
            <h4 class="timeline-card-title">${this.escapeHtml(m.title)}</h4>
            <p class="timeline-card-desc">${this.escapeHtml(m.description)}</p>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="timeline-panel">
        <div class="timeline-header-bar">
          <div class="timeline-title-wrap">
            <div class="timeline-flag-badge">🎖️ 272梯・軍旅役期時光軸</div>
            <h3 class="timeline-main-title">從金六結入伍到光榮退伍・重要里程碑動態</h3>
          </div>
          <div class="timeline-date-range">
            <span>入伍 <strong>${startItem.display_date || '08/12'}</strong></span>
            <span class="range-arrow">➔</span>
            <span>懇親 <strong>08/21</strong></span>
            <span class="range-arrow">➔</span>
            <span>抽籤 <strong>09/30</strong></span>
            <span class="range-arrow">➔</span>
            <span>下部隊 <strong>10/15</strong></span>
            <span class="range-arrow">➔</span>
            <span>退伍 <strong>${endItem.display_date || '12/02'}</strong></span>
          </div>
        </div>

        <!-- 役期兩階段戰術受訓歷程 (合併展示於時光軸模組) -->
        <div class="timeline-stage-stepper">
          <div class="timeline-stage-pill ${isP1Done ? 'completed' : (isP1Active ? 'active' : 'upcoming')}">
            <span class="stage-pill-icon">${isP1Done ? '✅' : (isP1Active ? '🪖' : '⏳')}</span>
            <div class="stage-pill-text">
              <span class="stage-pill-name">第一階段・金六結新訓</span>
              <span class="stage-pill-date">08/12 ~ 10/14 ${isP1Active ? '・進行中' : (isP1Done ? '・已結訓' : '')}</span>
            </div>
          </div>
          <div class="stage-flow-arrow">➔</div>
          <div class="timeline-stage-pill ${isP2Done ? 'completed' : (isP2Active ? 'active' : 'upcoming')}">
            <span class="stage-pill-icon">${isP2Done ? '✅' : (isP2Active ? '⚔️' : '⏳')}</span>
            <div class="stage-pill-text">
              <span class="stage-pill-name">第二階段・部隊訓練</span>
              <span class="stage-pill-date">10/15 ~ 12/01 ${isP2Active ? '・進行中' : (isP2Done ? '・已結業' : '')}</span>
            </div>
          </div>
          <div class="stage-flow-arrow">➔</div>
          <div class="timeline-stage-pill ${isDischarged ? 'completed active' : 'upcoming'}">
            <span class="stage-pill-icon">${isDischarged ? '🎖️' : '🏁'}</span>
            <div class="stage-pill-text">
              <span class="stage-pill-name">光榮結訓・領結訓令</span>
              <span class="stage-pill-date">12/02 零時生效</span>
            </div>
          </div>
        </div>

        <!-- 役期動態進度儀表板 -->
        <div class="service-progress-card">
          <div class="service-stats-row">
            <div class="service-stat-box">
              <span class="service-stat-label">📅 入伍日期</span>
              <strong class="service-stat-val">${startItem.date.replace(/-/g, '/')}</strong>
            </div>
            <div class="service-stat-box highlight-box">
              <span class="service-stat-label">⏰ 役期倒數</span>
              <strong class="service-stat-val text-gold">${daysRemaining === 0 ? '🎉 光榮結訓' : `剩餘 ${daysRemaining} 天`}</strong>
            </div>
            <div class="service-stat-box">
              <span class="service-stat-label">🎖️ 退伍日期</span>
              <strong class="service-stat-val">${endItem.date.replace(/-/g, '/')}</strong>
            </div>
            <div class="service-stat-box">
              <span class="service-stat-label">📊 役期進度</span>
              <strong class="service-stat-val">${progressPercent}% (${daysServed}/${totalDays}天)</strong>
            </div>
          </div>
          <div class="service-progress-track">
            <div class="service-progress-fill" style="width: ${progressPercent}%;">
              <span class="service-progress-glow"></span>
            </div>
          </div>
        </div>

        <!-- 時間軸節點列表 -->
        <div class="timeline-steps-track">
          ${milestonesHtml}
        </div>
      </div>
    `;
  },

  // 1. 首頁渲染 (含時光軸、人氣按讚最高傳奇與最高大兵日記排版)
  renderHomeView() {
    // 更新首頁與頂部役期階段動態狀態
    this.updateServiceStatusUI();

    // 渲染軍旅役期時光軸
    this.renderTimeline();

    const homeCadresGrid = document.getElementById('home-cadres-grid');
    if (homeCadresGrid) {
      const sortedCadres = [...this.cadres].sort((a, b) => {
        const sA = Number(a.squad) || 99;
        const sB = Number(b.squad) || 99;
        if (sA !== sB) return sA - sB;
        const isAsstA = String(a.duty || '').includes('副');
        const isAsstB = String(b.duty || '').includes('副');
        if (!isAsstA && isAsstB) return -1;
        if (isAsstA && !isAsstB) return 1;
        return 0;
      });
      homeCadresGrid.innerHTML = sortedCadres.map(c => this.createCadreCardHtml(c)).join('');
    }

    // 依按讚數高低排序傳奇（若按讚數相同則依最新時間排序）
    const latestLegendEl = document.getElementById('home-latest-legend');
    if (latestLegendEl) {
      const seenLegendKeys = new Set();
      const uniqueLegends = [];
      for (const l of this.legends) {
        const key = `${String(l.target_id).trim()}_${String(l.author_id).trim()}_${String(l.title).trim()}_${String(l.content).trim()}`;
        if (!seenLegendKeys.has(key)) {
          seenLegendKeys.add(key);
          uniqueLegends.push(l);
        }
      }

      uniqueLegends.sort((a, b) => {
        const likesA = this.getLegendLikes(a).count;
        const likesB = this.getLegendLikes(b).count;
        if (likesB !== likesA) return likesB - likesA;
        return (b.legend_id || 0) - (a.legend_id || 0);
      });

      if (uniqueLegends.length > 0) {
        const topLegend = uniqueLegends[0];
        const likesInfo = this.getLegendLikes(topLegend);
        const targetMember = this.allMembers.find(m => String(m.id) === String(topLegend.target_id));
        const targetName = targetMember && targetMember.name ? `${targetMember.name} (第${this.toChineseNum(targetMember.squad)}班)` : `#${topLegend.target_id}`;

        latestLegendEl.innerHTML = `
          <div class="legend-card top-legend-home-card" style="height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="legend-header">
                <div class="legend-title-group">
                  <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
                    <span class="top-ranked-badge">🏆 弟兄狂讚榜首</span>
                    <h3 style="margin-bottom: 0;">⚡ ${this.escapeHtml(topLegend.title)}</h3>
                  </div>
                  <div class="legend-tags">
                    <span class="tag-target" onclick="APP.showMemberDetail('${topLegend.target_id}')" style="cursor: pointer;" title="查看傳奇主角檔案">
                      🎯 主角: @${topLegend.target_id} ${this.escapeHtml(targetName)}
                    </span>
                    <span class="tag-author">✍️ 爆料: #${topLegend.author_id}</span>
                  </div>
                </div>
                <span class="legend-date">📅 ${this.formatDateDisplay(topLegend.created_at)}</span>
              </div>
              <div class="legend-content">${this.escapeHtml(topLegend.content)}</div>
            </div>
            <div class="legend-card-footer">
              <span style="font-size: 0.78rem; color: #64748b; font-weight: 700;">🔥 全連獲讚第一名傳奇</span>
              <button class="btn-like-action ${likesInfo.isLiked ? 'is-liked' : ''}" onclick="APP.toggleLikeLegend('${likesInfo.key}', event)" title="為這篇傳奇點讚">
                <span class="like-icon">${likesInfo.isLiked ? '🔥' : '👍'}</span>
                <span class="like-label">${likesInfo.isLiked ? '已狂讚' : '狂讚'}</span>
                <span class="like-count">(${likesInfo.count})</span>
              </button>
            </div>
          </div>
        `;
      } else {
        latestLegendEl.innerHTML = `
          <div class="legend-card" style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 2.25rem 1.5rem; background: #fff;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚡</div>
            <p style="font-size: 1.05rem; font-weight: 800; color: var(--primary-dark);">三連傳奇榜尚無爆料</p>
            <p style="font-size: 0.82rem; color: #64748b; margin-top: 0.35rem;">歡迎點擊上方「傳奇版」成為第一個爆料者！</p>
          </div>
        `;
      }
    }

    // 依按讚數高低排序大兵日記（若按讚數相同則依最新時間排序）
    const latestDiaryEl = document.getElementById('home-latest-diary');
    if (latestDiaryEl) {
      const seenDiaryKeys = new Set();
      const uniqueDiaries = [];
      for (const d of this.diaries) {
        const key = `${String(d.author_id).trim()}_${String(d.title).trim()}_${String(d.content).trim()}`;
        if (!seenDiaryKeys.has(key)) {
          seenDiaryKeys.add(key);
          uniqueDiaries.push(d);
        }
      }

      uniqueDiaries.sort((a, b) => {
        const likesA = this.getDiaryLikes(a).count;
        const likesB = this.getDiaryLikes(b).count;
        if (likesB !== likesA) return likesB - likesA;
        return (b.diary_id || 0) - (a.diary_id || 0);
      });

      if (uniqueDiaries.length > 0) {
        const topDiary = uniqueDiaries[0];
        const likesInfo = this.getDiaryLikes(topDiary);
        const authorMember = this.allMembers.find(m => String(m.id) === String(topDiary.author_id));
        const authorName = authorMember && authorMember.name ? authorMember.name : `弟兄 #${topDiary.author_id}`;

        latestDiaryEl.innerHTML = `
          <div class="jukuang-notebook-card top-diary-home-card" style="height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="jukuang-header">
                <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                  <span class="top-ranked-badge" style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);">🏆 莒光熱門第一</span>
                  <span class="jukuang-title-badge">📖 莒光精選：${this.escapeHtml(topDiary.title)}</span>
                </div>
                <span class="jukuang-meta">📅 ${this.formatDateDisplay(topDiary.created_at)}</span>
              </div>
              <div class="jukuang-page" style="max-height: 140px; overflow: hidden;">
                <p class="jukuang-entry-content">${this.escapeHtml(topDiary.content)}</p>
              </div>
            </div>
            <div class="jukuang-footer">
              <span class="jukuang-author-info">✍️ 作者：#${topDiary.author_id} (${this.escapeHtml(authorName)})</span>
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <button class="btn-like-action ${likesInfo.isLiked ? 'is-liked' : ''}" onclick="APP.toggleLikeDiary('${likesInfo.key}', event)" title="為這篇日記點讚">
                  <span class="like-icon">${likesInfo.isLiked ? '❤️' : '🤍'}</span>
                  <span class="like-label">${likesInfo.isLiked ? '已點讚' : '點讚'}</span>
                  <span class="like-count">(${likesInfo.count})</span>
                </button>
                <div class="official-seal"><span>連長</span><span>閱</span></div>
              </div>
            </div>
          </div>
        `;
      } else {
        latestDiaryEl.innerHTML = `
          <div class="jukuang-notebook-card" style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 2.25rem 1.5rem; background: #fdfbf7;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📖</div>
            <p style="font-size: 1.05rem; font-weight: 800; color: var(--primary-dark);">大兵日記尚無心得記錄</p>
            <p style="font-size: 0.82rem; color: #64748b; margin-top: 0.35rem;">歡迎點擊上方「大兵日記」寫下你的真摯感言！</p>
          </div>
        `;
      }
    }
  },

  // 計算幹部職等排序權重 (將官 > 校官 > 尉官 > 士官長 > 士官 > 士兵)
  getRankOrderWeight(rank) {
    const r = String(rank || '').trim();
    if (!r) return 0;

    // 將官
    if (r.includes('一級上將') || r.includes('四星')) return 240;
    if (r.includes('二級上將') || r.includes('三星')) return 230;
    if (r.includes('中將') || r.includes('二星')) return 220;
    if (r.includes('少將') || r.includes('一星')) return 210;

    // 校官
    if (r.includes('上校') || r.includes('兩條三') || r.includes('2條3')) return 190;
    if (r.includes('中校') || r.includes('兩條二') || r.includes('2條2')) return 180;
    if (r.includes('少校') || r.includes('兩條一') || r.includes('2條1')) return 170;

    // 尉官
    if (r.includes('上尉') || r.includes('一條三') || r.includes('1條3')) return 150;
    if (r.includes('中尉') || r.includes('一條二') || r.includes('1條2')) return 140;
    if (r.includes('少尉') || r.includes('一條一') || r.includes('1條1')) return 130;

    // 士官長
    if (r.includes('一等士官長') || r.includes('一等長')) return 110;
    if (r.includes('二等士官長') || r.includes('二等長')) return 100;
    if (r.includes('三等士官長') || r.includes('三等長')) return 90;
    if (r.includes('士官長')) return 95;

    // 士官
    if (r.includes('上士')) return 80;
    if (r.includes('中士')) return 70;
    if (r.includes('下士')) return 60;
    if (r.includes('士官')) return 65;

    // 士兵
    if (r.includes('上等兵') || r.includes('上兵')) return 40;
    if (r.includes('一等兵') || r.includes('一兵')) return 30;
    if (r.includes('二等兵') || r.includes('二兵')) return 20;
    if (r.includes('兵')) return 25;

    return 10;
  },

  // 2. 各班幹部專區渲染 (依排組與班級順序 第一班 ~ 第九班 班長與副班長)
  renderCadresView() {
    const cadresListGrid = document.getElementById('cadres-list-grid');
    if (!cadresListGrid) return;

    if (!this.cadres || this.cadres.length === 0) {
      this.cadres = MOCK_DATA.getInitialCadres();
    }

    // 排組篩選條
    const filterContainer = document.getElementById('cadre-platoon-filter-bar');
    if (filterContainer) {
      const activePlatoon = this.currentCadrePlatoon || 'all';
      filterContainer.innerHTML = `
        <button class="duty-pill ${activePlatoon === 'all' ? 'active' : ''}" onclick="APP.setCadrePlatoonFilter('all')">🎖️ 全部各班幹部 (14)</button>
        <button class="duty-pill ${activePlatoon === '1' ? 'active' : ''}" onclick="APP.setCadrePlatoonFilter('1')">🥇 一排幹部 (1~3班)</button>
        <button class="duty-pill ${activePlatoon === '2' ? 'active' : ''}" onclick="APP.setCadrePlatoonFilter('2')">🥈 二排幹部 (4~6班)</button>
        <button class="duty-pill ${activePlatoon === '3' ? 'active' : ''}" onclick="APP.setCadrePlatoonFilter('3')">🥉 三排幹部 (7~9班)</button>
      `;
    }

    let filtered = [...this.cadres];
    if (this.currentCadrePlatoon && this.currentCadrePlatoon !== 'all') {
      const pNum = Number(this.currentCadrePlatoon);
      filtered = filtered.filter(c => {
        const squadNum = Number(c.squad) || 0;
        if (pNum === 1) return squadNum >= 1 && squadNum <= 3;
        if (pNum === 2) return squadNum >= 4 && squadNum <= 6;
        if (pNum === 3) return squadNum >= 7 && squadNum <= 9;
        return true;
      });
    }

    // 依班級順序與班長/副班長排列 (第1班 ➔ 第9班，同班班長在副班長前)
    filtered.sort((a, b) => {
      const sA = Number(a.squad) || 99;
      const sB = Number(b.squad) || 99;
      if (sA !== sB) return sA - sB;
      const isAsstA = String(a.duty || '').includes('副');
      const isAsstB = String(b.duty || '').includes('副');
      if (!isAsstA && isAsstB) return -1;
      if (isAsstA && !isAsstB) return 1;
      return 0;
    });

    cadresListGrid.innerHTML = filtered.map(c => this.createCadreCardHtml(c)).join('');
  },

  setCadrePlatoonFilter(platoon) {
    this.currentCadrePlatoon = platoon;
    this.renderCadresView();
  },

  createCadreCardHtml(cadre) {
    const cadreName = String(cadre.name ?? '').trim();
    const displayName = cadreName || (cadre.duty || cadre.rank_level || '連隊幹部');

    // 所屬班級與排組標籤
    const squadNum = Number(cadre.squad) || 0;
    let platoonName = '連部';
    if (squadNum >= 1 && squadNum <= 3) platoonName = '一排';
    else if (squadNum >= 4 && squadNum <= 6) platoonName = '二排';
    else if (squadNum >= 7 && squadNum <= 9) platoonName = '三排';
    
    const squadDuty = (typeof CONFIG !== 'undefined' && CONFIG.SQUAD_DUTIES && CONFIG.SQUAD_DUTIES[squadNum]) ? ` (${CONFIG.SQUAD_DUTIES[squadNum]})` : '';
    const squadName = squadNum > 0 ? `第${this.toChineseNum(squadNum)}班${squadDuty}` : '連部';
    const isAssistant = String(cadre.duty || '').includes('副');
    const roleTag = isAssistant ? '🛡️ 副班長' : '⚔️ 班長';
    const rankTitle = cadre.rank_level || '幹部';

    return `
      <div class="cadre-simple-card" id="card-${cadre.id}">
        <div class="cadre-card-top">
          <span class="cadre-tag-squad">🎖️ ${platoonName}・${squadName}</span>
          <span class="cadre-tag-role ${isAssistant ? 'asst' : 'leader'}">${roleTag}</span>
        </div>
        <div class="cadre-card-main">
          <div class="cadre-name-text">${this.escapeHtml(displayName)}</div>
          <div class="cadre-rank-row">
            <span class="cadre-rank-lbl">官階</span>
            <span class="cadre-rank-val">⭐ ${this.escapeHtml(rankTitle)}</span>
          </div>
        </div>
      </div>
    `;
  },

  // 3. 班級名冊渲染 (支援全連 1~9 班 98 位弟兄跨班級即時搜尋)
  renderSquadView() {
    const isSearching = Boolean(this.searchQuery && this.searchQuery.length > 0);
    const query = (this.searchQuery || '').toLowerCase();
    const titleEl = document.getElementById('squad-view-title');
    const squadNum = this.selectedSquad;
    const squadPillBar = document.getElementById('squad-quick-pill-bar');
    const leaderBannerEl = document.getElementById('squad-leader-banner');
    const countTag = document.getElementById('squad-member-count-tag');
    const membersGrid = document.getElementById('squad-members-grid');

    let displayMembers = [];

    if (isSearching) {
      // 全連跨班級搜尋 (包含 1~9 班所有弟兄)
      displayMembers = this.allMembers.filter(m => {
        const id = String(m.id || '').toLowerCase();
        const name = String(m.name || '').toLowerCase();
        const nickname = String(m.nickname || '').toLowerCase();
        const duty = String(m.duty || '').toLowerCase();
        const interests = String(m.interests || '').toLowerCase();
        const dream = String(m.dream || '').toLowerCase();
        const bio = String(m.bio || '').toLowerCase();
        const selfIntro = String(m.self_intro || '').toLowerCase();
        const ig = String(m.ig || '').toLowerCase();
        const line = String(m.line || '').toLowerCase();
        const squadStr = `第${this.toChineseNum(m.squad)}班 ${m.squad}班`;
        const roomStr = `第${this.toChineseNum(m.room)}寢 ${m.room}寢`;

        return id.includes(query) ||
               name.includes(query) ||
               nickname.includes(query) ||
               duty.includes(query) ||
               interests.includes(query) ||
               dream.includes(query) ||
               bio.includes(query) ||
               selfIntro.includes(query) ||
               ig.includes(query) ||
               line.includes(query) ||
               squadStr.includes(query) ||
               roomStr.includes(query);
      });

      if (titleEl) {
        titleEl.innerHTML = `🔍 全連搜尋：「<span style="color:var(--tactical-amber);">${this.escapeHtml(this.searchQuery)}</span>」`;
      }

      if (countTag) {
        countTag.textContent = `找到 ${displayMembers.length} 位弟兄 (全連)`;
      }

      if (leaderBannerEl) {
        leaderBannerEl.innerHTML = `
          <div class="squad-leader-info" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; width: 100%;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span class="badge" style="background:var(--tactical-charcoal-dark); color:var(--tactical-amber); padding: 3px 8px; border-radius: 4px; font-weight:800; font-family:var(--font-mono);">🌐 全連跨班級搜尋模式</span>
              <strong style="color:#ffffff;">已為您搜尋第 1 ~ 9 班全部 98 位同袍資料</strong>
            </div>
            <button onclick="APP.clearSquadSearch()" style="background:#ef4444; color:#fff; border:none; border-radius:4px; padding:4px 10px; font-size:0.75rem; font-weight:800; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.3);" title="清除搜尋並返回班級名冊">
              ✖ 清除搜尋
            </button>
          </div>
        `;
      }
    } else {
      // 正常指定班級瀏覽模式
      displayMembers = this.allMembers.filter(m => Number(m.squad) === squadNum);

      if (titleEl) {
        const squadDuty = (typeof CONFIG !== 'undefined' && CONFIG.SQUAD_DUTIES && CONFIG.SQUAD_DUTIES[squadNum]) ? `・${CONFIG.SQUAD_DUTIES[squadNum]}` : '';
        titleEl.textContent = `第 ${this.toChineseNum(squadNum)} 班${squadDuty} 成員名冊`;
      }

      if (countTag) {
        countTag.textContent = `${displayMembers.length} 人`;
      }

      const leader = MOCK_DATA.squadLeaders[squadNum] || { name: '帶班班長', rank: '帶班幹部', quote: '（待幹部填寫帶班期勉）' };
      if (leaderBannerEl) {
        let leaderInfoHtml = `
          <span class="badge" style="background:var(--tactical-amber); color:var(--tactical-charcoal-dark); padding: 2px 7px; border-radius: 4px; font-weight:900;">🎖️ ${this.escapeHtml(leader.rank || '帶班幹部')}</span>
          <strong style="color:#ffffff;">班長：${this.escapeHtml(leader.name || '帶班班長')}</strong>
        `;
        if (leader.assistant) {
          leaderInfoHtml += `
            <span style="display: inline-block; width: 12px;"></span>
            <span class="badge" style="background:#0284c7; color:#fff; padding: 2px 7px; border-radius: 4px; font-weight:800;">⚔️ ${this.escapeHtml(leader.assistant.rank || '副班長')}</span>
            <strong style="color:#ffffff;">副班長：${this.escapeHtml(leader.assistant.name || '帶班幹部')}</strong>
          `;
        }
        leaderBannerEl.innerHTML = `
          <div class="squad-leader-info" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            ${leaderInfoHtml}
          </div>
          <div class="squad-leader-quote" style="margin-top: 0.25rem; color:#cbd5cb;">
            ${this.escapeHtml(leader.quote || '（待幹部填寫帶班期勉）')}
          </div>
        `;
      }
    }

    // 班級快捷橫條更新
    if (squadPillBar) {
      squadPillBar.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
        const isActive = (!isSearching && num === squadNum);
        const dutyName = (typeof CONFIG !== 'undefined' && CONFIG.SQUAD_DUTIES && CONFIG.SQUAD_DUTIES[num]) || '';
        const dutyIcon = (typeof CONFIG !== 'undefined' && CONFIG.SQUAD_DUTY_ICONS && CONFIG.SQUAD_DUTY_ICONS[num]) || '🎖️';
        return `
          <button class="quick-pill-item ${isActive ? 'active' : ''}" onclick="APP.selectSquadFromPill(${num})" title="切換至第${this.toChineseNum(num)}班 (${dutyName})">
            <span>第${this.toChineseNum(num)}班</span>
            <span class="pill-badge">${dutyIcon} ${dutyName}</span>
          </button>
        `;
      }).join('');
      if (!isSearching) {
        const activePill = squadPillBar.querySelector('.quick-pill-item.active');
        if (activePill) activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    if (membersGrid) {
      if (displayMembers.length === 0) {
        membersGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1.5rem; background:var(--tactical-charcoal-card); border-radius:var(--radius-md); border:1.5px dashed var(--tactical-olive-border);">
            <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔍</div>
            <p style="font-size: 1.15rem; font-weight: 800; color: #ffffff;">查無符合條件之弟兄同袍資料</p>
            <p style="font-size: 0.85rem; color: #cbd5cb; margin-top: 0.35rem;">請嘗試搜尋其他學號、姓名或綽號關鍵字</p>
            <div style="display:flex; gap:0.5rem; justify-content:center; margin-top:1rem; flex-wrap:wrap;">
              ${isSearching ? `<button onclick="APP.clearSquadSearch()" class="btn-primary" style="padding:6px 14px; font-size:0.85rem; cursor:pointer;">✖ 清除搜尋關鍵字</button>` : ''}
            </div>
          </div>
        `;
      } else {
        membersGrid.innerHTML = displayMembers.map(m => this.createMemberCardHtml(m)).join('');
      }
    }
  },

  handleSearch(query) {
    this.searchQuery = (query || '').trim();
    this.renderSquadView();
  },

  clearSquadSearch() {
    this.searchQuery = '';
    const searchInput = document.getElementById('member-search-input');
    if (searchInput) searchInput.value = '';
    this.renderSquadView();
  },

  selectSquadFromPill(num) {
    this.searchQuery = '';
    const searchInput = document.getElementById('member-search-input');
    if (searchInput) searchInput.value = '';
    this.navigate('squad', num);
  },

  // 判斷當前登入者是否為 13055 系統管理員
  isAdmin() {
    return Boolean(this.currentUser && String(this.currentUser.id) === '13055');
  },

  createMemberCardHtml(member) {
    const cleanId = String(member.id ?? '').trim();
    const isMe = Boolean(this.currentUser && String(this.currentUser.id).trim() === cleanId);
    const isAdmin = this.isAdmin();
    const memberName = String(member.name ?? '').trim();
    const displayName = memberName ? memberName : `弟兄 #${cleanId}`;
    const initials = memberName 
      ? memberName.substring(Math.max(0, memberName.length - 2)) 
      : (cleanId ? cleanId.substring(Math.max(0, cleanId.length - 2)) : '弟兄');

    // 正面：大兵軍裝照
    const milPhoto = member.avatar_military || member.avatar_url;
    const milAvatarHtml = milPhoto 
      ? `<img src="${milPhoto}" alt="大兵照" onerror="this.onerror=null; this.parentElement.innerHTML='🪖 ${initials}'">` 
      : `<span>🪖 ${initials}</span>`;

    // 背面：私人便服照
    const civPhoto = member.avatar_civilian;
    const civAvatarHtml = civPhoto 
      ? `<img src="${civPhoto}" alt="便服照" onerror="this.onerror=null; this.parentElement.innerHTML='🕶️ ${initials}'">` 
      : `<span>🕶️ ${initials}</span>`;

    const igButton = member.ig 
      ? `<button class="btn-social btn-ig" onclick="APP.openInstagram('${this.escapeHtml(member.ig)}')" title="查看 Instagram: @${this.escapeHtml(member.ig)}">
          <span>📸 IG: @${this.escapeHtml(member.ig)}</span>
         </button>` 
      : `<button class="btn-social btn-ig" style="opacity: 0.45; cursor: not-allowed;" title="未填寫 IG">📸 未填寫</button>`;

    const lineButton = member.line 
      ? `<button class="btn-social btn-line" onclick="APP.copyToClipboard('${this.escapeHtml(member.line)}', 'LINE ID')" title="點擊複製 LINE ID">
          <span>💬 LINE: ${this.escapeHtml(member.line)}</span>
         </button>` 
      : `<button class="btn-social btn-line" style="opacity: 0.45; cursor: not-allowed;" title="未填寫 LINE">💬 未填寫</button>`;

    const editSelfBtn = isMe 
      ? `<button class="btn-edit-self" onclick="APP.openEditProfileModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>編輯個人檔案</span>
        </button>` 
      : '';

    const adminResetBtn = (isAdmin && !isMe)
      ? `<button class="btn-admin-reset" onclick="APP.handleAdminResetPassword('${member.id}')" title="管理員權限：將此弟兄密碼恢復為預設學號">
          <span>🔑 恢復密碼</span>
         </button>`
      : '';

    return `
      <div class="member-card tactical-dossier-card ${isMe ? 'is-current-user' : ''}" id="card-${member.id}">
        <!-- Tactical HUD Corner Accents -->
        <div class="dossier-corner corner-tl"></div>
        <div class="dossier-corner corner-tr"></div>
        <div class="dossier-corner corner-bl"></div>
        <div class="dossier-corner corner-br"></div>

        <!-- Dossier Top Status Strip -->
        <div class="dossier-top-strip">
          <div class="dossier-id-chips">
            <span class="dossier-code-chip">ID #${member.id}</span>
            <span class="dossier-squad-chip">SQD 0${member.squad}・第${this.toChineseNum(member.squad)}班</span>
            <span class="dossier-room-chip">RM 0${member.room}・第${this.toChineseNum(member.room)}寢</span>
          </div>
          <span class="dossier-duty-tag">🎖️ ${this.escapeHtml(member.duty || '一般兵')}</span>
        </div>

        <div class="member-card-header">
          <!-- 3D 翻轉頭像容器 (包含四角戰術十字標 Crosshairs +) -->
          <div class="avatar-flip-container tactical-avatar-frame" onclick="APP.toggleCardFlip(this, event, '${member.id}')" title="點擊 3D 翻轉切換照片 (大兵 ⇋ 便服)">
            <!-- 4 Corner Tactical Crosshairs (+) -->
            <span class="tactical-crosshair crosshair-tl">+</span>
            <span class="tactical-crosshair crosshair-tr">+</span>
            <span class="tactical-crosshair crosshair-bl">+</span>
            <span class="tactical-crosshair crosshair-br">+</span>

            <div class="avatar-flip-card" id="flip-card-${member.id}">
              <div class="avatar-face avatar-face-front">${milAvatarHtml}</div>
              <div class="avatar-face avatar-face-back">${civAvatarHtml}</div>
            </div>
            <span class="flip-tag-badge flip-tag-front" id="flip-tag-${member.id}">🪖 大兵</span>
          </div>

          <div class="member-header-text">
            <h3 class="member-name" title="${this.escapeHtml(displayName)}" onclick="APP.showMemberDetail('${member.id}')" style="cursor:pointer;">
              ${this.escapeHtml(displayName)}
              ${isMe ? '<span class="tag-me-badge">(我)</span>' : ''}
              ${!member.name ? '<span class="tag-pending-badge">(待填寫)</span>' : ''}
            </h3>
            <div class="member-callsign-box">
              <span class="callsign-label">CALLSIGN // 綽號:</span>
              <strong class="callsign-val">${this.escapeHtml(member.nickname || '未填寫')}</strong>
            </div>
            <div class="flip-hint-text" onclick="APP.toggleCardFlip(this.closest('.member-card').querySelector('.avatar-flip-container'), event, '${member.id}')">
              <span>🔄 點擊照片翻轉 (大兵 ⇋ 便服)</span>
            </div>
          </div>
        </div>

        <!-- Bento Grid Specs Row -->
        <div class="dossier-bento-grid">
          <div class="bento-cell bento-duty">
            <span class="bento-cell-label">🎖️ RANK / DUTY 職責</span>
            <span class="bento-cell-val">${this.escapeHtml(member.duty || '一般兵')}</span>
          </div>
          ${member.interests ? `
          <div class="bento-cell bento-interests">
            <span class="bento-cell-label">🎨 SPECS 專長興趣</span>
            <span class="bento-cell-val">${this.escapeHtml(member.interests)}</span>
          </div>` : ''}
          ${member.dream ? `
          <div class="bento-cell bento-dream">
            <span class="bento-cell-label">🌟 TARGET 未來目標</span>
            <span class="bento-cell-val">${this.escapeHtml(member.dream)}</span>
          </div>` : ''}
        </div>

        <!-- Dossier Transcript / 結訓感言 (外層卡片展示原本的 bio 欄位) -->
        <div class="member-bio dossier-transcript">
          <div class="transcript-tag">💬 TRANSCRIPT // 結訓感言</div>
          <div class="transcript-body">${this.escapeHtml(member.bio || (member.name ? '金六結 153R 1B3C 結訓快樂！' : '（尚未填寫結訓感言...）'))}</div>
        </div>

        <!-- Direct Action Buttons & View Dossier Drawer Trigger -->
        <div class="member-dossier-action-bar">
          <button class="btn-view-dossier" onclick="APP.showMemberDetail('${member.id}')" title="開啟完整同袍戰術檔案 (Bottom Sheet / Drawer)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>檢視完整檔案 (View Dossier)</span>
          </button>
        </div>

        <!-- Social Actions Deck -->
        <div class="member-social-actions">
          ${igButton}
          ${lineButton}
          ${editSelfBtn}
          ${adminResetBtn}
        </div>
      </div>
    `;
  },

  // 3D 照片翻轉觸發 (修復 ID 衝突，優先使用 DOM 階層選取)
  toggleCardFlip(container, event, memberId) {
    if (event) event.stopPropagation();
    let flipCard = null;
    let flipTag = null;
    
    if (container && container.querySelector) {
      flipCard = container.querySelector('.avatar-flip-card');
      flipTag = container.querySelector('.flip-tag-badge');
    }
    
    if (!flipCard && memberId) {
      flipCard = document.getElementById(`flip-card-${memberId}`);
      flipTag = document.getElementById(`flip-tag-${memberId}`);
    }

    if (flipCard) {
      const isFlipped = flipCard.classList.toggle('is-flipped');
      if (flipTag) {
        if (isFlipped) {
          flipTag.textContent = '🕶️ 便服';
          flipTag.className = 'flip-tag-badge flip-tag-back';
        } else {
          const isCadre = (String(memberId).includes('1B3C') || String(memberId).includes('cadre') || (container && container.closest('.cadre-member-card, .cadre-card')));
          flipTag.textContent = isCadre ? '🪖 軍裝' : '🪖 大兵';
          flipTag.className = 'flip-tag-badge flip-tag-front';
        }
      }
    }
  },

  // 側邊欄分類選單收放切換 (班級名冊 / 寢室配置)
  toggleNavSection(sectionKey) {
    const listEl = document.getElementById(`nav-${sectionKey}-list`);
    const iconEl = document.getElementById(`collapse-icon-${sectionKey}`);
    if (listEl) {
      const isCollapsed = listEl.classList.toggle('is-collapsed');
      if (iconEl) {
        if (isCollapsed) {
          iconEl.classList.add('collapsed');
        } else {
          iconEl.classList.remove('collapsed');
        }
      }
    }
  },

  // 4. 寢室套房配置圖渲染 (兩寢一套房模組：左寢 ⇋ 中間獨立衛浴 ⇋ 右寢)
  renderRoomView() {
    let roomNum = Number(this.selectedRoom) || 1;
    if (roomNum < 1 || roomNum > 12) roomNum = 1;
    this.selectedRoom = roomNum;

    // 計算套房分組 (1&2, 3&4, 5&6, 7&8, 9&10, 11&12)
    const pairIndex = Math.floor((roomNum - 1) / 2);
    const roomA = pairIndex * 2 + 1;
    const roomB = pairIndex * 2 + 2;

    const titleEl = document.getElementById('room-view-title');
    if (titleEl) {
      titleEl.textContent = `第 ${this.toChineseNum(roomA)} ＆ ${this.toChineseNum(roomB)} 寢 雙寢套房 (中間獨立衛浴)`;
    }

    // 渲染寢室快捷切換橫條 (6 組套房膠囊按鈕)
    const roomPillBar = document.getElementById('room-quick-pill-bar');
    if (roomPillBar) {
      const suitePairs = [
        { a: 1, b: 2, label: '第 1 & 2 寢', badge: '20人套房' },
        { a: 3, b: 4, label: '第 3 & 4 寢', badge: '20人套房' },
        { a: 5, b: 6, label: '第 5 & 6 寢', badge: '20人套房' },
        { a: 7, b: 8, label: '第 7 & 8 寢', badge: '20人套房' },
        { a: 9, b: 10, label: '第 9 & 10 寢', badge: '20人套房' },
        { a: 11, b: 12, label: '第 11 & 12 寢', badge: '9人 (12空寢)' }
      ];

      roomPillBar.innerHTML = suitePairs.map(s => {
        const isActive = (roomNum === s.a || roomNum === s.b);
        return `
          <button class="quick-pill-item ${isActive ? 'active' : ''}" onclick="APP.navigate('room', ${s.a})" title="切換至 ${s.label}">
            <span>${s.label}</span>
            <span class="pill-badge">${s.badge}</span>
          </button>
        `;
      }).join('');
      const activePill = roomPillBar.querySelector('.quick-pill-item.active');
      if (activePill) activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    const bunksGrid = document.getElementById('room-bunks-grid');
    if (!bunksGrid) return;

    // 渲染雙寢一套房（橫向 3 欄 / 手機上下排版）
    bunksGrid.innerHTML = `
      <div class="dorm-suite-container">
        <!-- 左翼：第 ${roomA} 寢 (10人房標準配置) -->
        ${this.createRoomWingHtml(roomA, roomNum === roomA)}

        <!-- 中間：兩寢共用專屬獨立衛浴與廁所 -->
        ${this.createSharedBathroomWingHtml(roomA, roomB)}

        <!-- 右翼：第 ${roomB} 寢 (10人房，若第12寢則為備用空寢) -->
        ${roomB === 12 ? this.createEmptyRoomWingHtml(12, roomNum === 12) : this.createRoomWingHtml(roomB, roomNum === roomB)}
      </div>
    `;
  },

  // 渲染單間 10 人寢室 (5 組雙層鋼床 = 10 個床位，1號下鋪為帶班班長)
  createRoomWingHtml(roomNum, isSelected) {
    const roomMembers = this.allMembers.filter(m => Number(m.room) === roomNum);
    const leaderInfo = MOCK_DATA.squadLeaders[roomNum] || { name: '帶班班長', rank: '帶班幹部', quote: '（待幹部填寫帶班期勉）' };
    const capacityText = roomNum === 11 ? '9 人滿編 (含班長)' : '10 人滿編 (含班長)';

    return `
      <div class="dorm-room-wing ${isSelected ? 'is-selected-room' : ''}">
        <div class="dorm-wing-header">
          <div class="dorm-wing-title-group">
            <span class="dorm-wing-badge">🛏️ 第 ${this.toChineseNum(roomNum)} 寢</span>
            <h3 class="dorm-wing-name">步三連・第 ${this.toChineseNum(roomNum)} 寢室</h3>
          </div>
          <span class="dorm-capacity-tag">${capacityText}</span>
        </div>

        <div class="dorm-leader-brief">
          <span class="badge">🎖️ 1號下鋪</span>
          <strong>帶班幹部：${this.escapeHtml(leaderInfo.rank ? `${leaderInfo.rank} ${leaderInfo.name}` : leaderInfo.name || '帶班班長')}</strong>
        </div>

        <div class="dorm-bunks-list">
          <!-- A 棟雙層床 (1號下鋪班長，2號上鋪弟兄) -->
          <div class="bunk-unit">
            <div class="bunk-unit-title">
              <span>🛏️ A 棟雙層床 (靠房門與衛浴)</span>
              <span class="bunk-tag">1~2 號床位</span>
            </div>
            <div class="bunk-slots">
              ${this.createBedSlotHtml(roomMembers[0], 2, '上鋪 (Upper)')}
              ${this.createLeaderBedSlotHtml(leaderInfo, 1)}
            </div>
          </div>

          <!-- B 棟雙層床 (3號下鋪，4號上鋪) -->
          <div class="bunk-unit">
            <div class="bunk-unit-title">
              <span>🛏️ B 棟雙層床</span>
              <span class="bunk-tag">3~4 號床位</span>
            </div>
            <div class="bunk-slots">
              ${this.createBedSlotHtml(roomMembers[2], 4, '上鋪 (Upper)')}
              ${this.createBedSlotHtml(roomMembers[1], 3, '下鋪 (Lower)')}
            </div>
          </div>

          <!-- C 棟雙層床 (5號下鋪，6號上鋪) -->
          <div class="bunk-unit">
            <div class="bunk-unit-title">
              <span>🛏️ C 棟雙層床</span>
              <span class="bunk-tag">5~6 號床位</span>
            </div>
            <div class="bunk-slots">
              ${this.createBedSlotHtml(roomMembers[4], 6, '上鋪 (Upper)')}
              ${this.createBedSlotHtml(roomMembers[3], 5, '下鋪 (Lower)')}
            </div>
          </div>

          <!-- D 棟雙層床 (7號下鋪，8號上鋪) -->
          <div class="bunk-unit">
            <div class="bunk-unit-title">
              <span>🛏️ D 棟雙層床</span>
              <span class="bunk-tag">7~8 號床位</span>
            </div>
            <div class="bunk-slots">
              ${this.createBedSlotHtml(roomMembers[6], 8, '上鋪 (Upper)')}
              ${this.createBedSlotHtml(roomMembers[5], 7, '下鋪 (Lower)')}
            </div>
          </div>

          <!-- E 棟雙層床 (9號下鋪，10號上鋪) -->
          <div class="bunk-unit">
            <div class="bunk-unit-title">
              <span>🛏️ E 棟雙層床</span>
              <span class="bunk-tag">9~10 號床位</span>
            </div>
            <div class="bunk-slots">
              ${this.createBedSlotHtml(roomMembers[8], 10, '上鋪 (Upper)')}
              ${this.createBedSlotHtml(roomMembers[7], 9, '下鋪 (Lower)')}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // 渲染兩寢共用獨立衛浴模組
  createSharedBathroomWingHtml(roomA, roomB) {
    return `
      <div class="dorm-bathroom-module">
        <div class="bathroom-header">
          <div class="bathroom-icon-badge">🚿</div>
          <h4 class="bathroom-title">專用套房衛浴</h4>
          <span class="bathroom-desc">第 ${roomA} 寢 ＆ 第 ${roomB} 寢 兩寢專用</span>
        </div>

        <div class="bathroom-facility-list">
          <div class="facility-item">
            <span class="facility-icon">🚿</span>
            <div class="facility-info">
              <strong>乾濕分離淋浴隔間</strong>
              <small>獨立熱水供應系統</small>
            </div>
          </div>

          <div class="facility-item">
            <span class="facility-icon">🚽</span>
            <div class="facility-info">
              <strong>獨立衛生隔間</strong>
              <small>定時清消維護</small>
            </div>
          </div>

          <div class="facility-item">
            <span class="facility-icon">🚰</span>
            <div class="facility-info">
              <strong>超大洗手台</strong>
              <small>有肥皂</small>
            </div>
          </div>
        </div>

        <div class="bathroom-doors-indicator">
          <div class="door-tag door-left">🚪 ⇦ 第 ${roomA} 寢房門</div>
          <div class="door-tag door-right">第 ${roomB} 寢房門 ⇨ 🚪</div>
        </div>
      </div>
    `;
  },

  // 渲染第 12 寢 (備用空寢・庫房整備・未住人)
  createEmptyRoomWingHtml(roomNum, isSelected) {
    return `
      <div class="dorm-room-wing dorm-empty-room-wing ${isSelected ? 'is-selected-room' : ''}">
        <div class="dorm-wing-header">
          <div class="dorm-wing-title-group">
            <span class="dorm-wing-badge" style="background: rgba(100, 116, 139, 0.15); color: #475569;">🏢 第十二寢</span>
            <h3 class="dorm-wing-name">步三連・第十二寢室 (備用)</h3>
          </div>
          <span class="dorm-capacity-tag" style="background: #f1f5f9; color: #64748b; border-color: #cbd5cb;">📦 272梯未住人</span>
        </div>

        <div class="empty-room-hero-box">
          <div style="font-size: 2.5rem; margin-bottom: 0.35rem;">📦</div>
          <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--primary-dark); margin-bottom: 0.35rem;">連隊備用空寢・庫房整備區</h4>
          <p style="font-size: 0.84rem; color: #64748b; line-height: 1.6; max-width: 300px; margin: 0 auto;">
            本連 272 梯次全連 98 位弟兄已完整編配於第一至十一寢。第十二寢作為連隊預備寢室與軍品裝備庫房整備空間，無人員進駐。
          </p>
        </div>

        <div class="empty-bunks-placeholder">
          <div class="empty-bunk-slot"><span>🛏️ A 棟雙層床（備用 / 庫房區）</span></div>
          <div class="empty-bunk-slot"><span>🛏️ B 棟雙層床（備用 / 庫房區）</span></div>
          <div class="empty-bunk-slot"><span>🛏️ C 棟雙層床（備用 / 庫房區）</span></div>
          <div class="empty-bunk-slot"><span>🛏️ D 棟雙層床（備用 / 庫房區）</span></div>
          <div class="empty-bunk-slot"><span>🛏️ E 棟雙層床（備用 / 庫房區）</span></div>
        </div>
      </div>
    `;
  },

  // 渲染班長專屬 1 號下鋪
  createLeaderBedSlotHtml(leader, bedNo) {
    const leaderName = leader && leader.name ? leader.name : '帶班班長';
    const leaderRank = leader && leader.rank ? leader.rank : '帶班幹部';
    const leaderDuty = leader && leader.duty ? leader.duty : '帶班幹部床位';
    return `
      <div class="bed-card bed-leader" onclick="APP.showToast('🪖 帶班幹部床位：${this.escapeHtml(leaderRank)} ${this.escapeHtml(leaderName)}', 'info')" title="帶班幹部床位：${this.escapeHtml(leaderRank)} ${this.escapeHtml(leaderName)}">
        <span class="bed-label-pill">🎖️ ${bedNo} 號床 (下鋪)</span>
        <div class="bed-occupant-info">
          <div class="bed-occupant-name" style="color: #92400e; font-weight: 800;">
            🎖️ ${this.escapeHtml(leaderRank)} ${this.escapeHtml(leaderName)}
          </div>
          <div class="bed-occupant-id" style="color: #b45309; font-weight: 600;">
            ${this.escapeHtml(leaderDuty)}
          </div>
        </div>
      </div>
    `;
  },

  // 渲染一般弟兄床位
  createBedSlotHtml(member, bedNo, bunkType) {
    if (!member) {
      return `
        <div class="bed-card bed-upper" style="opacity: 0.45;">
          <span class="bed-label-pill">${bedNo} 號床</span>
          <div class="bed-occupant-info">
            <div class="bed-occupant-name">空床位 / 備用床</div>
          </div>
        </div>
      `;
    }

    const isUpper = bunkType.includes('上鋪');
    const isMe = Boolean(this.currentUser && String(this.currentUser.id) === String(member.id));
    const displayName = member.name ? member.name : `弟兄 #${member.id}`;

    return `
      <div class="bed-card ${isUpper ? 'bed-upper' : 'bed-lower'}" onclick="APP.showMemberDetail('${member.id}')" title="點擊查看弟兄名片">
        <span class="bed-label-pill">${bedNo} 號床 (${isUpper ? '上鋪' : '下鋪'})</span>
        <div class="bed-occupant-info">
          <div class="bed-occupant-name">
            ${this.escapeHtml(displayName)}
            ${isMe ? '<strong style="color: var(--gold); font-size: 0.75rem;">(我)</strong>' : ''}
          </div>
          <div class="bed-occupant-id">#${member.id}・${this.escapeHtml(member.duty || '一般兵')}</div>
        </div>
      </div>
    `;
  },

  // 5. 傳奇版渲染 (依讚數排行榜呈現，含點讚互動)
  renderLegendsView() {
    const listContainer = document.getElementById('legends-list-container');
    if (!listContainer) return;

    // 前端即時去重處理 (避免因網路重試或歷史資料產生重複卡片)
    const seenLegendKeys = new Set();
    const uniqueLegends = [];
    for (const l of this.legends) {
      const key = `${String(l.target_id).trim()}_${String(l.author_id).trim()}_${String(l.title).trim()}_${String(l.content).trim()}`;
      if (!seenLegendKeys.has(key)) {
        seenLegendKeys.add(key);
        uniqueLegends.push(l);
      }
    }

    // 依讚數高低降序排列 (若讚數相同則依最新時間排序)
    uniqueLegends.sort((a, b) => {
      const likesA = this.getLegendLikes(a).count;
      const likesB = this.getLegendLikes(b).count;
      if (likesB !== likesA) return likesB - likesA;
      return (b.legend_id || 0) - (a.legend_id || 0);
    });

    if (uniqueLegends.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 3.5rem 1.5rem; background: #fff; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">⚡</div>
          <p style="font-size: 1.15rem; font-weight: 800; color: var(--primary-dark);">三連傳奇榜目前尚無事蹟</p>
          <p style="font-size: 0.88rem; color: #64748b; margin-top: 0.5rem;">快點擊右上角「+ 爆料新傳奇」分享三連弟兄在金六結的爆笑與熱血回憶！</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = uniqueLegends.map((l, index) => {
      const likesInfo = this.getLegendLikes(l);
      const targetMember = this.allMembers.find(m => String(m.id) === String(l.target_id));
      const targetName = targetMember && targetMember.name ? `${targetMember.name} (第${this.toChineseNum(targetMember.squad)}班)` : `#${l.target_id}`;

      const authorMember = this.allMembers.find(m => String(m.id) === String(l.author_id));
      const authorName = authorMember && authorMember.name ? authorMember.name : `#${l.author_id}`;

      let rankBadgeHtml = '';
      if (index === 0 && likesInfo.count > 0) {
        rankBadgeHtml = `<span class="top-ranked-badge rank-badge-top1">🥇 狂讚榜首</span>`;
      } else if (index === 1 && likesInfo.count > 0) {
        rankBadgeHtml = `<span class="top-ranked-badge rank-badge-top2">🥈 人氣亞軍</span>`;
      } else if (index === 2 && likesInfo.count > 0) {
        rankBadgeHtml = `<span class="top-ranked-badge rank-badge-top3">🥉 人氣季軍</span>`;
      }

      return `
        <div class="legend-card" id="legend-${l.legend_id}">
          <div class="legend-header">
            <div class="legend-title-group">
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
                ${rankBadgeHtml}
                <h3 style="margin-bottom: 0;">⚡ ${this.escapeHtml(l.title)}</h3>
              </div>
              <div class="legend-tags">
                <span class="tag-target" onclick="APP.showMemberDetail('${l.target_id}')" style="cursor: pointer;" title="查看傳奇主角檔案">
                  🎯 傳奇主角: @${l.target_id} ${this.escapeHtml(targetName)}
                </span>
                <span class="tag-author">✍️ 爆料者: #${l.author_id}</span>
              </div>
            </div>
            <span class="legend-date">📅 ${this.formatDateDisplay(l.created_at)}</span>
          </div>
          <div class="legend-content">
            ${this.escapeHtml(l.content)}
          </div>
          <div class="legend-card-footer">
            <span style="font-size: 0.78rem; color: #64748b; font-weight: 700;">
              ${likesInfo.count > 0 ? `🔥 獲得 ${likesInfo.count} 位弟兄狂讚認證` : '💬 覺得很神？快點擊狂讚！'}
            </span>
            <button class="btn-like-action ${likesInfo.isLiked ? 'is-liked' : ''}" onclick="APP.toggleLikeLegend('${likesInfo.key}', event)" title="為這篇傳奇點讚">
              <span class="like-icon">${likesInfo.isLiked ? '🔥' : '👍'}</span>
              <span class="like-label">${likesInfo.isLiked ? '已狂讚' : '狂讚'}</span>
              <span class="like-count">(${likesInfo.count})</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // 6. 大兵日記渲染 (莒光作文簿風格，依讚數排行榜呈現，含點讚互動)
  renderDiariesView() {
    const listContainer = document.getElementById('diaries-list-container');
    if (!listContainer) return;

    // 前端即時去重處理
    const seenDiaryKeys = new Set();
    const uniqueDiaries = [];
    for (const d of this.diaries) {
      const key = `${String(d.author_id).trim()}_${String(d.title).trim()}_${String(d.content).trim()}`;
      if (!seenDiaryKeys.has(key)) {
        seenDiaryKeys.add(key);
        uniqueDiaries.push(d);
      }
    }

    // 依讚數高低降序排列
    uniqueDiaries.sort((a, b) => {
      const likesA = this.getDiaryLikes(a).count;
      const likesB = this.getDiaryLikes(b).count;
      if (likesB !== likesA) return likesB - likesA;
      return (b.diary_id || 0) - (a.diary_id || 0);
    });

    if (uniqueDiaries.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 3.5rem 1.5rem; background: #fff; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📖</div>
          <p style="font-size: 1.15rem; font-weight: 800; color: var(--primary-dark);">國軍莒光作文簿目前尚無心得</p>
          <p style="font-size: 0.88rem; color: #64748b; margin-top: 0.5rem;">快點擊右上角「✍️ 寫大兵日記」寫下你在金六結的心情、結訓感言或軍旅生活回顧！</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = uniqueDiaries.map((d, index) => {
      const likesInfo = this.getDiaryLikes(d);
      const authorMember = this.allMembers.find(m => String(m.id) === String(d.author_id));
      const authorName = authorMember && authorMember.name ? `${authorMember.name} (第${this.toChineseNum(authorMember.squad)}班)` : `弟兄 #${d.author_id}`;

      let rankBadgeHtml = '';
      if (index === 0 && likesInfo.count > 0) {
        rankBadgeHtml = `<span class="top-ranked-badge" style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);">🥇 莒光榜首</span>`;
      } else if (index === 1 && likesInfo.count > 0) {
        rankBadgeHtml = `<span class="top-ranked-badge" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);">🥈 熱門心得</span>`;
      } else if (index === 2 && likesInfo.count > 0) {
        rankBadgeHtml = `<span class="top-ranked-badge" style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%);">🥉 弟兄精選</span>`;
      }

      return `
        <div class="jukuang-notebook-card" id="diary-${d.diary_id}">
          <div class="jukuang-header">
            <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
              ${rankBadgeHtml}
              <span class="jukuang-title-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                國軍莒光作文簿・生活心得
              </span>
            </div>
            <span class="jukuang-meta">📅 發表時間：${this.formatDateDisplay(d.created_at)}</span>
          </div>

          <div class="jukuang-page">
            <h3 class="jukuang-entry-title">題目：${this.escapeHtml(d.title)}</h3>
            <div class="jukuang-entry-content">${this.escapeHtml(d.content)}</div>
          </div>

          <div class="jukuang-footer">
            <span class="jukuang-author-info">
              ✍️ 撰寫人：#${d.author_id} ${this.escapeHtml(authorName)}
            </span>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <button class="btn-like-action ${likesInfo.isLiked ? 'is-liked' : ''}" onclick="APP.toggleLikeDiary('${likesInfo.key}', event)" title="為這篇心得點讚">
                <span class="like-icon">${likesInfo.isLiked ? '❤️' : '🤍'}</span>
                <span class="like-label">${likesInfo.isLiked ? '已點讚' : '點讚'}</span>
                <span class="like-count">(${likesInfo.count})</span>
              </button>
              <div class="official-seal" title="輔導長 / 連長 官方評閱章">
                <span>輔導長</span>
                <span>批閱</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // =========================================================================
  // 使用者認證與登入狀態管理 (Auth & Profile)
  // =========================================================================

  updateAuthUI() {
    const container = document.getElementById('auth-status-container');
    if (!container) return;

    if (this.currentUser) {
      const cleanId = String(this.currentUser.id ?? '').trim();
      const userName = String(this.currentUser.name ?? '').trim();
      const displayName = userName || `學號 #${cleanId}`;
      const initials = userName 
        ? userName.substring(Math.max(0, userName.length - 2)) 
        : (cleanId ? cleanId.substring(Math.max(0, cleanId.length - 2)) : '我');
      const rawPhoto = this.currentUser.avatar_military || this.currentUser.avatar_url || this.currentUser.avatar_civilian;
      const userPhoto = this.formatImageUrl(rawPhoto);
      const avatarHtml = userPhoto 
        ? `<img src="${userPhoto}" alt="${this.escapeHtml(displayName)}" onerror="this.onerror=null; this.parentElement.innerHTML='${initials}'">` 
        : initials;

      const adminBadgeHtml = this.isAdmin() ? '<span class="badge-admin admin-badge-header">👑 管理員</span>' : '';
      const statusIdText = `#${cleanId}`;

      container.innerHTML = `
        <div class="user-status-bar">
          <div class="user-avatar-mini" onclick="APP.openEditProfileModal()" style="cursor:pointer;" title="點擊編輯個人資料">${avatarHtml}</div>
          <div class="user-status-text" onclick="APP.openEditProfileModal()" style="cursor:pointer;" title="點擊編輯個人資料">
            <span class="user-status-prefix">目前登入：</span><strong class="user-status-id">${statusIdText}</strong><span class="user-status-name"> (${this.escapeHtml(displayName)})</span>
          </div>
          ${adminBadgeHtml}
          <button class="btn-edit-header" onclick="APP.openEditProfileModal()" title="編輯我的個人檔案與照片">✏️ 編輯</button>
          <button class="btn-logout" onclick="APP.handleLogout()">登出</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button id="btn-show-login" class="btn-auth" onclick="APP.openLoginModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
          </svg>
          <span>登入</span>
        </button>
      `;
    }
  },

  openLoginModal() {
    const modal = document.getElementById('modal-login');
    if (modal) {
      modal.classList.add('active');
      const idInput = document.getElementById('login-id');
      if (idInput) idInput.focus();
    }
  },

  // 登入處理 (登入後自動切換至所屬班級並平滑滾動定位至個人卡片)
  async handleLogin(e) {
    e.preventDefault();
    const idInput = document.getElementById('login-id');
    const pwdInput = document.getElementById('login-password');

    const id = idInput ? idInput.value.trim() : '';
    const password = pwdInput ? pwdInput.value.trim() : '';

    if (!id || !password) {
      this.showToast('請輸入學號與密碼', 'error');
      return;
    }

    this.showToast('登入驗證中...', 'info');

    const result = await API.login(id, password);
    if (result && result.success && result.user) {
      // 確保字串與數值型別完整安全
      const user = {
        ...result.user,
        id: String(result.user.id ?? '').trim(),
        name: String(result.user.name ?? '').trim(),
        nickname: String(result.user.nickname ?? '').trim(),
        squad: Number(result.user.squad) || 1,
        room: Number(result.user.room) || 1,
        duty: String(result.user.duty ?? '一般兵').trim(),
        interests: String(result.user.interests ?? '').trim(),
        dream: String(result.user.dream ?? '').trim(),
        ig: String(result.user.ig ?? '').trim(),
        line: String(result.user.line ?? '').trim(),
        bio: String(result.user.bio ?? result.user.graduation_quote ?? '').trim(), // 💬 結訓感言 (原本的 bio 欄位)
        self_intro: String(result.user.self_intro ?? result.user.intro ?? '').trim(), // 📝 自我介紹 (新增的 self_intro 欄位)
        is_cadre: false,
        needs_password_change: Boolean(result.user.needs_password_change)
      };

      this.currentUser = user;
      CONFIG.setCurrentUser(user);
      this.updateAuthUI();
      this.closeModal('modal-login');
      
      const welcomeName = user.name ? `${user.name} 弟兄` : `弟兄 #${user.id}`;

      // 首次登入檢查：若密碼尚未自訂修改，強制彈出設定新密碼視窗且無法跳過
      if (user.needs_password_change) {
        this.showToast(`歡迎 ${welcomeName}！首次登入請先設定自訂密碼以保障安全。`, 'warning');
        setTimeout(() => {
          this.openForcePasswordModal();
        }, 300);
        return;
      }

      this.showToast(`歡迎回來，${welcomeName}！正在為您定位卡片...`, 'success');

      // 弟兄自動切換至所屬班級
      const userSquad = Number(user.squad) || 1;
      this.navigate('squad', userSquad);

      setTimeout(() => {
        const card = document.getElementById(`card-${user.id}`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.transition = 'transform 0.4s ease, box-shadow 0.4s ease';
          card.style.transform = 'scale(1.03)';
          card.style.boxShadow = '0 0 25px rgba(255, 183, 3, 0.6)';
          setTimeout(() => {
            card.style.transform = '';
            card.style.boxShadow = '';
          }, 1800);
        }
      }, 500);
    } else {
      const errCode = (result && result.code) || 'ERR-AUTH-FAILED';
      const errMsg = (result && result.message) || '登入失敗，請確認學號與密碼';
      this.showToast(`❌ [${errCode}] ${errMsg}`, 'error');
    }
  },

  // =========================================================================
  // 首次登入強制設定新密碼 (Force Password Change)
  // =========================================================================

  openForcePasswordModal() {
    if (!this.currentUser) return;
    const cleanId = String(this.currentUser.id ?? '').trim();
    const accountDisplay = document.getElementById('force-pwd-account-display');
    if (accountDisplay) {
      const nameLabel = this.currentUser.name ? ` (${this.currentUser.name})` : '';
      accountDisplay.value = `弟兄學號 #${cleanId}${nameLabel}`;
    }
    const newPwd = document.getElementById('force-new-password');
    const confirmPwd = document.getElementById('force-confirm-password');
    if (newPwd) newPwd.value = '';
    if (confirmPwd) confirmPwd.value = '';
    const modal = document.getElementById('modal-force-password-change');
    if (modal) {
      modal.classList.add('active');
      setTimeout(() => {
        if (newPwd) newPwd.focus();
      }, 200);
    }
  },

  async handleForcePasswordChange(e) {
    e.preventDefault();
    if (!this.currentUser) return;
    if (this.isSubmitting) return;

    const newPwdInput = document.getElementById('force-new-password');
    const confirmPwdInput = document.getElementById('force-confirm-password');
    const newPassword = newPwdInput ? newPwdInput.value.trim() : '';
    const confirmPassword = confirmPwdInput ? confirmPwdInput.value.trim() : '';

    if (newPassword.length < 4) {
      this.showToast('❌ [ERR-PWD-LEN] 新密碼長度至少需要 4 個字元！', 'error');
      return;
    }

    if (newPassword.toUpperCase() === String(this.currentUser.id).trim().toUpperCase()) {
      this.showToast('❌ [ERR-PWD-SAME] 新密碼不能與原本的預設學號相同，請自訂專屬密碼！', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showToast('❌ [ERR-PWD-MISMATCH] 兩次輸入的新密碼不一致，請重新檢查！', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-force-pwd');
    const originalBtnText = submitBtn ? submitBtn.textContent : '確認設定並啟用帳號';

    this.isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ 設定中，請稍候...';
    }

    this.showToast('⏳ 正在為您設定專屬新密碼並同步雲端...', 'info');

    try {
      const payload = {
        id: this.currentUser.id,
        newPassword
      };

      const result = await API.updateProfile(payload);
      if (result && result.success) {
        this.currentUser.needs_password_change = false;
        this.currentUser.password_changed = true;
        CONFIG.setCurrentUser(this.currentUser);

        const modal = document.getElementById('modal-force-password-change');
        if (modal) modal.classList.remove('active');

        this.showToast('🎉 自訂新密碼設定成功！帳號已正式啟用，歡迎使用紀念冊系統！', 'success');
        
        const userSquad = Number(this.currentUser.squad) || 1;
        this.navigate('squad', userSquad);

        // 若尚未填寫姓名，貼心自動引導填寫基本資料與上傳照片
        if (!this.currentUser.name) {
          setTimeout(() => {
            this.openEditProfileModal();
            this.showToast('📸 歡迎填寫個人檔案與上傳迷彩軍裝/私服便服照！', 'info');
          }, 800);
        }
      } else {
        const errCode = (result && result.code) || 'ERR-PWD-FAILED';
        const errMsg = (result && result.message) || '設定失敗，請稍後重試';
        this.showToast(`❌ [${errCode}] ${errMsg}`, 'error');
      }
    } catch (err) {
      console.error('[ERR-JS-PWD] 設定新密碼異常:', err);
      const errDetail = err && err.message ? err.message : String(err);
      this.showToast(`❌ [ERR-JS-PWD] 設定異常 (${errDetail})，請稍後重試`, 'error');
    } finally {
      this.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  },

  handleLogout() {
    this.currentUser = null;
    CONFIG.clearCurrentUser();
    this.updateAuthUI();
    this.showToast('已安全登出', 'info');

    if (this.currentView === 'squad') this.renderSquadView();
    if (this.currentView === 'room') this.renderRoomView();
  },

  // =========================================================================
  // 編輯個人資料與雙照片上傳 (Edit Profile)
  // =========================================================================

  openEditProfileModal() {
    if (!this.currentUser) {
      this.openLoginModal();
      return;
    }

    const isCadre = Boolean(this.currentUser.is_cadre || String(this.currentUser.id).toUpperCase().startsWith('1B3C'));
    const member = isCadre 
      ? (this.cadres.find(c => String(c.id).toUpperCase() === String(this.currentUser.id).toUpperCase()) || this.currentUser)
      : (this.allMembers.find(m => String(m.id) === String(this.currentUser.id)) || this.currentUser);

    const titleEl = document.getElementById('edit-profile-modal-title');
    if (titleEl) {
      titleEl.textContent = isCadre ? '編輯長官幹部基本資料' : `編輯個人基本資料 (#${this.currentUser.id})`;
    }

    const cadreGroup = document.getElementById('profile-cadre-fields-group');
    if (cadreGroup) cadreGroup.style.display = isCadre ? 'block' : 'none';
    const rankInput = document.getElementById('profile-rank-level');
    if (rankInput) {
      const currentRank = String(member.rank_level || member.rank || '').trim();
      rankInput.value = currentRank;
      if (currentRank && !rankInput.value) {
        for (let i = 0; i < rankInput.options.length; i++) {
          const optVal = rankInput.options[i].value;
          if (optVal && (currentRank.includes(optVal) || optVal.includes(currentRank))) {
            rankInput.selectedIndex = i;
            break;
          }
        }
      }
    }
    const enlistInput = document.getElementById('profile-enlist-date');
    if (enlistInput) {
      const formattedEnlistDate = this.formatDateToYMD(member.enlist_date);
      enlistInput.value = formattedEnlistDate;
      this.handleEnlistDateChange(formattedEnlistDate);
    }

    document.getElementById('profile-name').value = member.name || '';
    document.getElementById('profile-nickname').value = member.nickname || '';
    document.getElementById('profile-duty').value = member.duty || '';
    document.getElementById('profile-interests').value = member.interests || '';
    document.getElementById('profile-dream').value = member.dream || '';
    document.getElementById('profile-ig').value = member.ig || '';
    document.getElementById('profile-line').value = member.line || '';
    
    const bioInput = document.getElementById('profile-bio');
    if (bioInput) bioInput.value = member.bio || '';
    
    const selfIntroInput = document.getElementById('profile-self-intro');
    if (selfIntroInput) selfIntroInput.value = member.self_intro || '';

    // 軍裝照片預覽
    const milPreview = document.getElementById('profile-military-avatar-preview');
    const milPhoto = member.avatar_military || member.avatar_url;
    milPreview.innerHTML = milPhoto 
      ? `<img src="${milPhoto}" alt="軍裝照">` 
      : `<span>🪖</span>`;

    // 私人照片預覽
    const civPreview = document.getElementById('profile-civilian-avatar-preview');
    const civPhoto = member.avatar_civilian;
    civPreview.innerHTML = civPhoto 
      ? `<img src="${civPhoto}" alt="私人照">` 
      : `<span>🕶️</span>`;

    this.tempMilitaryAvatarBase64 = null;
    this.tempCivilianAvatarBase64 = null;
    document.getElementById('profile-military-file').value = '';
    document.getElementById('profile-civilian-file').value = '';

    const modal = document.getElementById('modal-edit-profile');
    if (modal) modal.classList.add('active');
  },

  async handleMilitaryAvatarSelect(input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const preview = document.getElementById('profile-military-avatar-preview');
      if (preview) {
        preview.innerHTML = `<span style="font-size:0.72rem; color:#0369a1; font-weight:700; text-align:center; padding:2px;">縮圖優化中...</span>`;
      }

      try {
        const result = await this.compressImage(file, 600, 800, 0.82);
        this.tempMilitaryAvatarBase64 = result.base64;
        if (preview) {
          preview.innerHTML = `<img src="${result.base64}" alt="軍裝照預覽">`;
        }
        this.showToast(`✨ 軍裝照智慧壓縮完成 (${this.formatFileSize(result.originalSize)} ➔ ${this.formatFileSize(result.compressedSize)})`, 'success');
      } catch (err) {
        console.error('軍裝照處理失敗:', err);
        this.showToast(err.message || '照片處理失敗，請重試', 'error');
        if (preview) {
          preview.innerHTML = `<span>🪖</span>`;
        }
      }
    }
  },

  async handleCivilianAvatarSelect(input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const preview = document.getElementById('profile-civilian-avatar-preview');
      if (preview) {
        preview.innerHTML = `<span style="font-size:0.72rem; color:#0369a1; font-weight:700; text-align:center; padding:2px;">縮圖優化中...</span>`;
      }

      try {
        const result = await this.compressImage(file, 600, 800, 0.82);
        this.tempCivilianAvatarBase64 = result.base64;
        if (preview) {
          preview.innerHTML = `<img src="${result.base64}" alt="私人照預覽">`;
        }
        this.showToast(`✨ 私人照智慧壓縮完成 (${this.formatFileSize(result.originalSize)} ➔ ${this.formatFileSize(result.compressedSize)})`, 'success');
      } catch (err) {
        console.error('私人照處理失敗:', err);
        this.showToast(err.message || '照片處理失敗，請重試', 'error');
        if (preview) {
          preview.innerHTML = `<span>🕶️</span>`;
        }
      }
    }
  },

  async handleSaveProfile(e) {
    e.preventDefault();
    if (!this.currentUser) return;
    if (this.isSubmitting) return;

    const isCadre = Boolean(this.currentUser.is_cadre || String(this.currentUser.id).toUpperCase().startsWith('1B3C'));
    const name = document.getElementById('profile-name').value.trim();
    const nickname = document.getElementById('profile-nickname').value.trim();
    const duty = document.getElementById('profile-duty').value.trim();
    const interests = document.getElementById('profile-interests').value.trim();
    const dream = document.getElementById('profile-dream').value.trim();
    const ig = document.getElementById('profile-ig').value.trim();
    const line = document.getElementById('profile-line').value.trim();
    
    const bioInput = document.getElementById('profile-bio');
    const bio = bioInput ? bioInput.value.trim() : '';

    const selfIntroInput = document.getElementById('profile-self-intro');
    const self_intro = selfIntroInput ? selfIntroInput.value.trim() : '';

    const rankLevelInput = document.getElementById('profile-rank-level');
    const rank_level = rankLevelInput ? rankLevelInput.value.trim() : '';

    const enlistDateInput = document.getElementById('profile-enlist-date');
    const rawEnlistDate = (isCadre && enlistDateInput) ? enlistDateInput.value.trim() : '';
    const enlist_date = this.formatDateToYMD(rawEnlistDate);

    const saveBtn = document.getElementById('btn-save-profile');
    const originalSaveText = saveBtn ? saveBtn.textContent : '儲存更新';

    this.isSubmitting = true;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = '⏳ 資料與照片上傳中...';
    }

    this.showToast('⏳ 個人資料與照片儲存中，請稍候...', 'info');

    try {
      const payload = {
        id: this.currentUser.id,
        name,
        nickname,
        rank_level: isCadre ? rank_level : undefined,
        duty,
        enlist_date: isCadre ? enlist_date : undefined,
        interests,
        dream,
        ig,
        line,
        bio,
        self_intro,
        avatarMilitaryBase64: this.tempMilitaryAvatarBase64,
        avatarCivilianBase64: this.tempCivilianAvatarBase64
      };

      const result = await API.updateProfile(payload);

      if (result && result.success) {
        const cleanResultUser = { ...(result.user || payload) };
        if (cleanResultUser.enlist_date) {
          cleanResultUser.enlist_date = this.formatDateToYMD(cleanResultUser.enlist_date);
        }
        const updatedUser = {
          ...this.currentUser,
          ...cleanResultUser,
          id: String(this.currentUser.id).trim()
        };
        this.currentUser = updatedUser;
        CONFIG.setCurrentUser(updatedUser);

        if (isCadre) {
          const cIdx = this.cadres.findIndex(c => String(c.id).trim().toUpperCase() === String(this.currentUser.id).trim().toUpperCase());
          if (cIdx !== -1) {
            this.cadres[cIdx] = { ...this.cadres[cIdx], ...updatedUser };
          }
          this.renderCadresView();
          this.renderHomeView();
        } else {
          const mIdx = this.allMembers.findIndex(m => String(m.id).trim() === String(this.currentUser.id).trim());
          if (mIdx !== -1) {
            this.allMembers[mIdx] = { ...this.allMembers[mIdx], ...updatedUser };
          }
          if (this.currentView === 'squad') this.renderSquadView();
          if (this.currentView === 'room') this.renderRoomView();
        }

        this.updateAuthUI();
        this.closeModal('modal-edit-profile');
        this.showToast('✨ 個人資料與雙面照片已成功儲存同步！', 'success');
      } else {
        const errCode = (result && result.code) || 'ERR-SAVE-FAILED';
        const errMsg = (result && result.message) || '儲存失敗，請稍後再試';
        this.showToast(`❌ [${errCode}] ${errMsg}`, 'error');
      }
    } catch (err) {
      console.error('[ERR-JS-SAVE] 儲存個人檔案異常:', err);
      const errDetail = err && err.message ? err.message : String(err);
      this.showToast(`❌ [ERR-JS-SAVE] 儲存異常 (${errDetail})，請稍後重試`, 'error');
    } finally {
      this.isSubmitting = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalSaveText;
      }
    }
  },

  // =========================================================================
  // 傳奇版操作 (Legends Actions)
  // =========================================================================

  openAddLegendModal() {
    if (!this.currentUser) {
      this.showToast('請先登入後再發布傳奇事蹟！', 'info');
      this.openLoginModal();
      return;
    }
    const form = document.getElementById('form-add-legend');
    if (form) form.reset();
    const modal = document.getElementById('modal-add-legend');
    if (modal) modal.classList.add('active');
  },

  async handleAddLegend(e) {
    e.preventDefault();
    if (!this.currentUser) return;
    if (this.isSubmitting) return;

    const targetId = document.getElementById('legend-target-id').value.trim();
    const title = document.getElementById('legend-title').value.trim();
    const content = document.getElementById('legend-content').value.trim();

    if (!targetId || !title || !content) {
      this.showToast('請填寫完整傳奇內容', 'error');
      return;
    }

    const form = e.target;
    const submitBtn = form ? form.querySelector('button[type="submit"]') : document.querySelector('#modal-add-legend button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : '發布傳奇';

    this.isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ 上傳發布中，請稍候...';
    }

    this.showToast('⏳ 傳奇事蹟上傳中，請稍候...', 'info');

    try {
      const payload = {
        target_id: targetId,
        author_id: this.currentUser.id,
        title,
        content
      };

      const result = await API.addLegend(payload);
      if (result && result.success) {
        if (result.data) {
          const exists = this.legends.some(l => 
            String(l.target_id).trim() === String(result.data.target_id).trim() &&
            String(l.author_id).trim() === String(result.data.author_id).trim() &&
            String(l.title).trim() === String(result.data.title).trim() &&
            String(l.content).trim() === String(result.data.content).trim()
          );
          if (!exists) {
            this.legends.unshift(result.data);
          }
        }
        this.closeModal('modal-add-legend');
        this.showToast('✨ 傳奇事蹟發布成功！', 'success');
        this.renderLegendsView();
      } else {
        const errCode = (result && result.code) || 'ERR-LEGEND-FAIL';
        const errMsg = (result && result.message) || '發布失敗，請稍後重試';
        this.showToast(`❌ [${errCode}] ${errMsg}`, 'error');
      }
    } catch (err) {
      console.error('[ERR-JS-LEGEND] 發布傳奇異常:', err);
      const errDetail = err && err.message ? err.message : String(err);
      this.showToast(`❌ [ERR-JS-LEGEND] 發布異常 (${errDetail})，請稍後重試`, 'error');
    } finally {
      this.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  },

  // =========================================================================
  // 大兵日記操作 (Diaries Actions)
  // =========================================================================

  openAddDiaryModal() {
    if (!this.currentUser) {
      this.showToast('請先登入後再撰寫莒光作文簿！', 'info');
      this.openLoginModal();
      return;
    }
    const form = document.getElementById('form-add-diary');
    if (form) form.reset();
    const modal = document.getElementById('modal-add-diary');
    if (modal) modal.classList.add('active');
  },

  async handleAddDiary(e) {
    e.preventDefault();
    if (!this.currentUser) return;
    if (this.isSubmitting) return;

    const title = document.getElementById('diary-title').value.trim();
    const content = document.getElementById('diary-content').value.trim();

    if (!title || !content) {
      this.showToast('❌ [ERR-DIARY-EMPTY] 請填寫篇名與心得內文', 'error');
      return;
    }

    const form = e.target;
    const submitBtn = form ? form.querySelector('button[type="submit"]') : document.querySelector('#modal-add-diary button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : '發布日記';

    this.isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ 上傳發布中，請稍候...';
    }

    this.showToast('⏳ 莒光作文簿上傳中，請稍候...', 'info');

    try {
      const payload = {
        author_id: this.currentUser.id,
        title,
        content
      };

      const result = await API.addDiary(payload);
      if (result && result.success) {
        if (result.data) {
          const exists = this.diaries.some(d => 
            String(d.author_id).trim() === String(result.data.author_id).trim() &&
            String(d.title).trim() === String(result.data.title).trim() &&
            String(d.content).trim() === String(result.data.content).trim()
          );
          if (!exists) {
            this.diaries.unshift(result.data);
          }
        }
        this.closeModal('modal-add-diary');
        this.showToast('✨ 大兵日記已送交輔導長批閱！', 'success');
        this.renderDiariesView();
      } else {
        const errCode = (result && result.code) || 'ERR-DIARY-FAIL';
        const errMsg = (result && result.message) || '發布失敗，請稍後重試';
        this.showToast(`❌ [${errCode}] ${errMsg}`, 'error');
      }
    } catch (err) {
      console.error('[ERR-JS-DIARY] 發布日記異常:', err);
      const errDetail = err && err.message ? err.message : String(err);
      this.showToast(`❌ [ERR-JS-DIARY] 發布異常 (${errDetail})，請稍後重試`, 'error');
    } finally {
      this.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  },

  // =========================================================================
  // 7. 問題回報與密碼處理中心 (Reports & Feedback Actions)
  // =========================================================================

  // 取得回報類別中文與圖示
  getReportTypeInfo(type) {
    const map = {
      'forgot_password': { label: '忘記密碼申請', icon: '🔒', colorClass: 'badge-forgot-pwd' },
      'feedback': { label: '系統建議', icon: '💡', colorClass: 'badge-feedback' },
      'bug': { label: '錯誤回報', icon: '🐛', colorClass: 'badge-bug' },
      'profile_fix': { label: '個資修正', icon: '📝', colorClass: 'badge-profile-fix' },
      'other': { label: '其他問題', icon: '💬', colorClass: 'badge-other' }
    };
    return map[type] || { label: '連隊回報', icon: '📬', colorClass: 'badge-other' };
  },

  // 設定篩選標籤
  setReportFilter(filter) {
    this.currentReportFilter = filter;
    this.renderReportsView();
  },

  // 渲染問題回報與密碼處理中心頁面
  renderReportsView() {
    const sectionEl = document.getElementById('view-reports');
    if (!sectionEl) return;

    const isAdmin = this.isAdmin();
    const allReports = this.reports || [];
    const myId = this.currentUser ? String(this.currentUser.id).trim() : '';
    const mySessionReports = JSON.parse(localStorage.getItem('153r1b3c_my_submitted_reports') || '[]');

    if (!isAdmin) {
      // ==========================================
      // 【一般弟兄 / 訪客視圖】
      // 只能提交回報與查看自己提交的項目，嚴格隱藏其他人的回報與忘記密碼
      // ==========================================
      const myReports = allReports.filter(r => (myId && String(r.author_id).trim() === myId) || mySessionReports.includes(Number(r.report_id)));

      sectionEl.innerHTML = `
        <div class="section-header">
          <div class="section-header-title">
            <h2>📬 連隊問題與意見回報</h2>
            <span class="tag" style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;">🔒 隱私保護・僅管理員可見</span>
          </div>
        </div>

        <p class="section-desc" style="color: #64748b; font-size: 0.88rem; margin-top: -0.5rem; margin-bottom: 1.25rem;">
          本表單供連隊弟兄回報系統問題、操作疑問、忘記密碼或提出改善建議。<br>
          <strong>所有回報僅有系統管理員（13055）於後台可見並協助處理</strong>，其他弟兄無法看到您的回報內容與忘記密碼資訊，請安心填寫！
        </p>

        <!-- 直接內嵌回報表單 -->
        <div class="report-form-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: var(--radius-md); padding: 1.5rem; box-shadow: 0 4px 14px rgba(0,0,0,0.04); margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; color: #0f172a; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>✍️</span> 填寫問題回報 / 忘記密碼申請
          </h3>

          <form id="form-direct-report" onsubmit="APP.handleDirectReportSubmit(event)">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-bottom: 0.85rem;">
              <div class="form-group" style="margin-bottom: 0;">
                <label for="direct-report-type" style="font-weight: 700; font-size: 0.84rem; color: #334155;">回報類別 <span style="color: #ef4444;">*</span></label>
                <select id="direct-report-type" class="form-control" onchange="APP.handleDirectReportTypeChange(this.value)">
                  <option value="forgot_password">🔒 忘記密碼申請 (申請恢復為預設學號)</option>
                  <option value="feedback" selected>💡 系統建議與回饋</option>
                  <option value="bug">🐛 系統錯誤回報 (Bug Report)</option>
                  <option value="profile_fix">📝 個人資料修正申請</option>
                  <option value="other">💬 其他問題</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label for="direct-report-author-id" style="font-weight: 700; font-size: 0.84rem; color: #334155;">您的學號 (ID) <span style="color: #ef4444;">*</span></label>
                <input type="text" id="direct-report-author-id" class="form-control" placeholder="例：13008" value="${myId}" required ${myId ? 'readonly style="background:#f8fafc;"' : ''}>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-bottom: 0.85rem;">
              <div class="form-group" style="margin-bottom: 0;">
                <label for="direct-report-author-name" style="font-weight: 700; font-size: 0.84rem; color: #334155;">您的姓名 / 稱呼</label>
                <input type="text" id="direct-report-author-name" class="form-control" placeholder="例：陳小豪" value="${this.currentUser ? (this.currentUser.name || '') : ''}">
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label for="direct-report-title" style="font-weight: 700; font-size: 0.84rem; color: #334155;">回報標題 <span style="color: #ef4444;">*</span></label>
                <input type="text" id="direct-report-title" class="form-control" placeholder="簡短描述問題主旨" required>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0.85rem;">
              <label for="direct-report-content" style="font-weight: 700; font-size: 0.84rem; color: #334155;">詳細說明與內文 <span style="color: #ef4444;">*</span></label>
              <textarea id="direct-report-content" class="form-control" rows="4" placeholder="請詳細說明遇到的問題、忘記密碼原因或改善建議..." required></textarea>
            </div>

            <div id="direct-forgot-pwd-tip" style="display: none; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); padding: 0.65rem 0.85rem; font-size: 0.8rem; color: #b91c1c; line-height: 1.4; margin-bottom: 0.85rem;">
              💡 <strong>忘記密碼處理說明：</strong> 管理員收到申請後，會將您的密碼恢復為「預設學號」，您便可重新登入並自訂新密碼。
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <button type="submit" class="btn-primary" id="btn-direct-submit-report" style="padding: 0.65rem 1.4rem; font-size: 0.92rem;">
                🚀 確認送出回報 / 申請
              </button>
            </div>
          </form>
        </div>

        <!-- 我的回報紀錄清單 -->
        <div style="margin-top: 1.5rem;">
          <h3 style="font-size: 1.15rem; color: #0f172a; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📋</span> 我的回報與處理進度 (僅本人可見)
          </h3>

          <div class="reports-list-grid" id="my-reports-list-container">
            ${myReports.length > 0 ? myReports.map(report => {
              const typeInfo = this.getReportTypeInfo(report.type);
              const isResolved = (report.status === 'resolved');
              const isForgotPassword = (report.type === 'forgot_password');
              const timeDisplay = this.formatDateDisplay(report.created_at || report.updated_at);

              return `
                <div class="report-card ${isForgotPassword ? 'card-forgot-pwd' : ''}">
                  <div class="report-card-header">
                    <div class="report-tags-row">
                      <span class="report-type-badge ${typeInfo.colorClass}">${typeInfo.icon} ${typeInfo.label}</span>
                      <span class="report-status-badge ${isResolved ? 'status-resolved' : 'status-pending'}">
                        ${isResolved ? '✅ 管理員已處理' : '⏳ 管理員處理中'}
                      </span>
                    </div>
                    <div class="report-meta-time">📅 ${timeDisplay}</div>
                  </div>

                  <div class="report-card-title-row">
                    <h3 class="report-title">${this.escapeHtml(report.title || '無標題回報')}</h3>
                  </div>

                  <div class="report-content-body">
                    ${this.escapeHtml(report.content || '')}
                  </div>

                  ${report.admin_reply ? `
                    <div class="report-admin-reply-box">
                      <div class="reply-header">
                        <span class="badge-admin" style="font-size: 0.75rem;">👑 連隊管理員 (13055) 官方回覆</span>
                        <span class="reply-time" style="font-size: 0.75rem; color: #64748b;">${this.formatDateDisplay(report.updated_at)}</span>
                      </div>
                      <div class="reply-content">${this.escapeHtml(report.admin_reply)}</div>
                    </div>
                  ` : `
                    <div style="font-size: 0.8rem; color: #64748b; font-style: italic; padding: 0.4rem 0;">
                      ⏳ 管理員正在處理中，處理完畢後將於此處顯示官方回覆與通知...
                    </div>
                  `}
                </div>
              `;
            }).join('') : `
              <div class="empty-state-box" style="text-align: center; padding: 2.5rem 1.5rem; background: #ffffff; border-radius: var(--radius-md); border: 1.5px dashed #cbd5e1;">
                <div style="font-size: 2.2rem; margin-bottom: 0.4rem;">📬</div>
                <h4 style="font-size: 1.05rem; color: #334155; margin-bottom: 0.25rem;">您目前尚無提交過回報紀錄</h4>
                <p style="font-size: 0.82rem; color: #64748b;">若有任何操作疑問、忘記密碼或連隊建議，請填寫上方表單送出！</p>
              </div>
            `}
          </div>
        </div>
      `;
      return;
    }

    // ==========================================
    // 【13055 系統管理員後台視圖】
    // 可以看到全連所有人提交的回報、忘記密碼名單、一鍵重設密碼與官方回覆
    // ==========================================
    const forgotCount = allReports.filter(r => r.type === 'forgot_password').length;
    const feedbackCount = allReports.filter(r => r.type === 'feedback').length;
    const bugCount = allReports.filter(r => r.type === 'bug').length;
    const resolvedCount = allReports.filter(r => r.status === 'resolved').length;
    const pendingCount = allReports.filter(r => r.status !== 'resolved').length;

    let filteredReports = allReports;
    if (this.currentReportFilter === 'resolved') {
      filteredReports = allReports.filter(r => r.status === 'resolved');
    } else if (this.currentReportFilter !== 'all') {
      filteredReports = allReports.filter(r => r.type === this.currentReportFilter);
    }

    sectionEl.innerHTML = `
      <div class="section-header">
        <div class="section-header-title">
          <h2>👑 連隊問題回報與密碼處理後台</h2>
          <span class="tag" style="background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;">
            共 ${allReports.length} 則 (待處理 ${pendingCount} / 🔒 忘記密碼 ${forgotCount})
          </span>
        </div>
        <div class="toolbar-actions">
          <button class="btn-primary" onclick="APP.openReportModal()">✍️ 手動新增回報項目</button>
        </div>
      </div>

      <p class="section-desc" style="color: #64748b; font-size: 0.88rem; margin-top: -0.5rem; margin-bottom: 1.25rem;">
        👑 <strong>管理員後台專屬控制台：</strong> 僅有您（13055）能看見全連弟兄的忘記密碼申請與問題回報名單，可針對忘記密碼弟兄直接「一鍵重設密碼」並撰寫官方回覆。
      </p>

      <!-- 類別篩選膠囊 -->
      <div class="duty-filter-bar" id="reports-filter-bar" style="margin-bottom: 1.25rem;">
        <button class="duty-pill ${this.currentReportFilter === 'all' ? 'active' : ''}" onclick="APP.setReportFilter('all')">全部 (${allReports.length})</button>
        <button class="duty-pill ${this.currentReportFilter === 'forgot_password' ? 'active' : ''}" onclick="APP.setReportFilter('forgot_password')">🔒 忘記密碼申請 (${forgotCount})</button>
        <button class="duty-pill ${this.currentReportFilter === 'feedback' ? 'active' : ''}" onclick="APP.setReportFilter('feedback')">💡 系統建議 (${feedbackCount})</button>
        <button class="duty-pill ${this.currentReportFilter === 'bug' ? 'active' : ''}" onclick="APP.setReportFilter('bug')">🐛 錯誤回報 (${bugCount})</button>
        <button class="duty-pill ${this.currentReportFilter === 'resolved' ? 'active' : ''}" onclick="APP.setReportFilter('resolved')">✅ 已處理回覆 (${resolvedCount})</button>
      </div>

      <!-- 回報清單列表容器 -->
      <div class="reports-list-grid" id="reports-list-container">
        ${filteredReports.length > 0 ? filteredReports.map(report => {
          const typeInfo = this.getReportTypeInfo(report.type);
          const isResolved = (report.status === 'resolved');
          const isForgotPassword = (report.type === 'forgot_password');
          const authorId = String(report.author_id || '').trim();
          const authorName = String(report.author_name || '').trim();
          const authorDisplay = authorName ? `${authorName} (學號 #${authorId})` : (authorId ? `弟兄 #${authorId}` : '匿名弟兄');
          const timeDisplay = this.formatDateDisplay(report.created_at || report.updated_at);

          // 管理員一鍵重設密碼按鈕
          const adminResetBtn = (isForgotPassword && !isResolved) 
            ? `<button class="btn-admin-reset-pwd" onclick="APP.handleQuickResetPasswordFromReport('${report.report_id}', '${authorId}')" title="一鍵將學號 #${authorId} 密碼恢復為預設">
                🔑 一鍵重設 #${authorId} 密碼為預設
               </button>`
            : '';

          // 管理員回覆按鈕
          const adminReplyBtn = `
            <button class="btn-admin-reply" onclick="APP.openAdminReplyModal('${report.report_id}')" title="管理員官方回覆">
              💬 ${isResolved ? '修改官方回覆' : '官方回覆 / 標示處理'}
            </button>
          `;

          return `
            <div class="report-card ${isForgotPassword ? 'card-forgot-pwd' : ''}" id="report-${report.report_id}">
              <div class="report-card-header">
                <div class="report-tags-row">
                  <span class="report-type-badge ${typeInfo.colorClass}">${typeInfo.icon} ${typeInfo.label}</span>
                  <span class="report-status-badge ${isResolved ? 'status-resolved' : 'status-pending'}">
                    ${isResolved ? '✅ 已完成處理' : '⏳ 處理中 / 待確認'}
                  </span>
                </div>
                <div class="report-meta-time">📅 ${timeDisplay}</div>
              </div>

              <div class="report-card-title-row">
                <h3 class="report-title">${this.escapeHtml(report.title || '無標題回報')}</h3>
                <div class="report-author-chip">👤 ${this.escapeHtml(authorDisplay)}</div>
              </div>

              <div class="report-content-body">
                ${this.escapeHtml(report.content || '')}
              </div>

              ${report.admin_reply ? `
                <div class="report-admin-reply-box">
                  <div class="reply-header">
                    <span class="badge-admin" style="font-size: 0.75rem;">👑 連隊管理員 (13055) 官方回覆</span>
                    <span class="reply-time" style="font-size: 0.75rem; color: #64748b;">${this.formatDateDisplay(report.updated_at)}</span>
                  </div>
                  <div class="reply-content">${this.escapeHtml(report.admin_reply)}</div>
                </div>
              ` : ''}

              <div class="report-admin-actions">
                ${adminResetBtn}
                ${adminReplyBtn}
              </div>
            </div>
          `;
        }).join('') : `
          <div class="empty-state-box" style="text-align: center; padding: 3rem 1.5rem; background: #ffffff; border-radius: var(--radius-md); border: 1.5px dashed #cbd5e1;">
            <div style="font-size: 2.8rem; margin-bottom: 0.6rem;">📬</div>
            <h4 style="font-size: 1.15rem; color: #334155; margin-bottom: 0.35rem;">目前尚無此類別的回報紀錄</h4>
            <p style="font-size: 0.85rem; color: #64748b;">目前沒有任何待處理項目。</p>
          </div>
        `}
      </div>
    `;
  },

  handleDirectReportTypeChange(type) {
    const tipBox = document.getElementById('direct-forgot-pwd-tip');
    const titleInput = document.getElementById('direct-report-title');
    const authorIdInput = document.getElementById('direct-report-author-id');
    const authorNameInput = document.getElementById('direct-report-author-name');

    if (type === 'forgot_password') {
      if (tipBox) tipBox.style.display = 'block';
      if (titleInput && (!titleInput.value || titleInput.value.includes('【忘記密碼申請】') || titleInput.value.includes('系統建議'))) {
        const idVal = authorIdInput ? authorIdInput.value.trim() : '';
        const nameVal = authorNameInput ? authorNameInput.value.trim() : '';
        titleInput.value = idVal ? `【忘記密碼申請】學號 #${idVal}${nameVal ? ' (' + nameVal + ')' : ''}` : '【忘記密碼申請】請求重設為預設學號密碼';
      }
    } else {
      if (tipBox) tipBox.style.display = 'none';
    }
  },

  async handleDirectReportSubmit(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    const type = document.getElementById('direct-report-type').value;
    const authorId = document.getElementById('direct-report-author-id').value.trim();
    const authorName = document.getElementById('direct-report-author-name').value.trim();
    const title = document.getElementById('direct-report-title').value.trim();
    const content = document.getElementById('direct-report-content').value.trim();

    if (!authorId || !title || !content) {
      this.showToast('請填寫完整學號、標題與內文！', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-direct-submit-report');
    const originalBtnText = submitBtn ? submitBtn.textContent : '確認送出回報 / 申請';

    this.isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ 上傳送出中，請稍候...';
    }

    this.showToast('⏳ 正在送出回報/申請至雲端...', 'info');

    try {
      const payload = {
        type,
        author_id: authorId,
        author_name: authorName,
        title,
        content
      };

      const result = await API.submitReport(payload);
      if (result && result.success) {
        if (result.data) {
          this.reports.unshift(result.data);
          const mySubmissions = JSON.parse(localStorage.getItem('153r1b3c_my_submitted_reports') || '[]');
          if (result.data.report_id && !mySubmissions.includes(Number(result.data.report_id))) {
            mySubmissions.push(Number(result.data.report_id));
            localStorage.setItem('153r1b3c_my_submitted_reports', JSON.stringify(mySubmissions));
          }
        }
        this.closeModal('modal-submit-report');
        if (type === 'forgot_password') {
          this.showToast('✅ 忘記密碼申請已成功送出！管理員（13055）將盡快為您重設密碼。', 'success');
        } else {
          this.showToast('✨ 問題回報已成功送出！感謝您的寶貴反饋。', 'success');
        }
        this.renderReportsView();
      } else {
        const errCode = (result && result.code) || 'ERR-REPORT-FAIL';
        const errMsg = (result && result.message) || '送出失敗，請稍後重試';
        this.showToast(`❌ [${errCode}] ${errMsg}`, 'error');
      }
    } catch (err) {
      console.error('[ERR-JS-REPORT] 送出回報異常:', err);
      const errDetail = err && err.message ? err.message : String(err);
      this.showToast(`❌ 送出異常 (${errDetail})，請稍後重試`, 'error');
    } finally {
      this.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  },

  // 開啟問題回報 / 忘記密碼申請彈窗
  openReportModal(prefillType = null, prefillId = null) {
    const form = document.getElementById('form-submit-report');
    if (form) form.reset();

    const typeSelect = document.getElementById('report-type');
    const authorIdInput = document.getElementById('report-author-id');
    const authorNameInput = document.getElementById('report-author-name');
    const titleInput = document.getElementById('report-title');

    const currentUser = this.currentUser;

    if (prefillType && typeSelect) {
      typeSelect.value = prefillType;
    } else if (typeSelect) {
      typeSelect.value = 'feedback';
    }

    if (prefillId && authorIdInput) {
      authorIdInput.value = prefillId;
      const m = this.allMembers.find(item => String(item.id) === String(prefillId));
      if (m && m.name && authorNameInput) authorNameInput.value = m.name;
    } else if (currentUser) {
      if (authorIdInput) authorIdInput.value = currentUser.id;
      if (authorNameInput) authorNameInput.value = currentUser.name || '';
    }

    this.handleReportTypeChange(typeSelect ? typeSelect.value : 'feedback');

    const modal = document.getElementById('modal-submit-report');
    if (modal) modal.classList.add('active');
  },

  // 回報類別切換即時提示
  handleReportTypeChange(type) {
    const tipBox = document.getElementById('forgot-password-tip-box');
    const titleInput = document.getElementById('report-title');
    const authorIdInput = document.getElementById('report-author-id');
    const authorNameInput = document.getElementById('report-author-name');

    if (type === 'forgot_password') {
      if (tipBox) tipBox.style.display = 'block';
      if (titleInput && (!titleInput.value || titleInput.value.includes('【忘記密碼申請】') || titleInput.value.includes('系統建議'))) {
        const idVal = authorIdInput ? authorIdInput.value.trim() : '';
        const nameVal = authorNameInput ? authorNameInput.value.trim() : '';
        titleInput.value = idVal ? `【忘記密碼申請】學號 #${idVal}${nameVal ? ' (' + nameVal + ')' : ''}` : '【忘記密碼申請】請求重設為預設學號密碼';
      }
    } else {
      if (tipBox) tipBox.style.display = 'none';
    }
  },

  // 登入視窗點擊忘記密碼
  handleForgotPasswordClick() {
    this.closeModal('modal-login');
    const loginIdInput = document.getElementById('login-id');
    const loginId = loginIdInput ? loginIdInput.value.trim() : '';
    this.openReportModal('forgot_password', loginId);
  },

  // 提交問題回報 / 忘記密碼申請
  async handleSubmitReport(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    const type = document.getElementById('report-type').value;
    const authorId = document.getElementById('report-author-id').value.trim();
    const authorName = document.getElementById('report-author-name').value.trim();
    const title = document.getElementById('report-title').value.trim();
    const content = document.getElementById('report-content').value.trim();

    if (!authorId || !title || !content) {
      this.showToast('請填寫完整學號、標題與內文！', 'error');
      return;
    }

    const form = e.target;
    const submitBtn = form ? form.querySelector('button[type="submit"]') : document.getElementById('btn-submit-report');
    const originalBtnText = submitBtn ? submitBtn.textContent : '確認送出申請';

    this.isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ 上傳送出中，請稍候...';
    }

    this.showToast('⏳ 正在送出回報/申請至雲端...', 'info');

    try {
      const payload = {
        type,
        author_id: authorId,
        author_name: authorName,
        title,
        content
      };

      const result = await API.submitReport(payload);
      if (result && result.success) {
        if (result.data) {
          this.reports.unshift(result.data);
        }
        this.closeModal('modal-submit-report');
        if (type === 'forgot_password') {
          this.showToast('✅ 忘記密碼申請已成功送出！管理員（13055）將盡快為您重設密碼。', 'success');
        } else {
          this.showToast('✨ 問題回報已成功送出！感謝您的寶貴反饋。', 'success');
        }
        this.navigate('reports');
      } else {
        const errCode = (result && result.code) || 'ERR-REPORT-FAIL';
        const errMsg = (result && result.message) || '送出失敗，請稍後重試';
        this.showToast(`❌ [${errCode}] ${errMsg}`, 'error');
      }
    } catch (err) {
      console.error('[ERR-JS-REPORT] 送出回報異常:', err);
      const errDetail = err && err.message ? err.message : String(err);
      this.showToast(`❌ 送出異常 (${errDetail})，請稍後重試`, 'error');
    } finally {
      this.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  },

  // 開啟管理員回覆彈窗
  openAdminReplyModal(reportId) {
    if (!this.isAdmin()) {
      this.showToast('權限不足！只有 13055 管理員可執行此操作。', 'error');
      return;
    }

    const report = this.reports.find(r => String(r.report_id) === String(reportId));
    if (!report) return;

    document.getElementById('admin-reply-report-id').value = report.report_id;
    const summaryEl = document.getElementById('admin-reply-target-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <strong>回報項目 #${report.report_id}：</strong> ${this.escapeHtml(report.title)}<br>
        <span style="color:#64748b;">提出者：${this.escapeHtml(report.author_name || '弟兄')} (#${report.author_id})</span>
      `;
    }

    const statusSelect = document.getElementById('admin-reply-status');
    if (statusSelect) statusSelect.value = report.status || 'resolved';

    const replyText = document.getElementById('admin-reply-text');
    if (replyText) replyText.value = report.admin_reply || '';

    const modal = document.getElementById('modal-admin-reply-report');
    if (modal) modal.classList.add('active');
  },

  // 保存管理員回覆
  async handleSaveAdminReply(e) {
    e.preventDefault();
    if (!this.isAdmin()) return;
    if (this.isSubmitting) return;

    const reportId = document.getElementById('admin-reply-report-id').value;
    const status = document.getElementById('admin-reply-status').value;
    const adminReply = document.getElementById('admin-reply-text').value.trim();

    if (!reportId || !adminReply) {
      this.showToast('請填寫官方回覆內容！', 'error');
      return;
    }

    const form = e.target;
    const submitBtn = form ? form.querySelector('button[type="submit"]') : document.getElementById('btn-save-admin-reply');
    const originalBtnText = submitBtn ? submitBtn.textContent : '確認送出回覆';

    this.isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ 保存回覆中...';
    }

    try {
      const payload = {
        admin_id: '13055',
        report_id: reportId,
        admin_reply: adminReply,
        status: status
      };

      const result = await API.replyReport(payload);
      if (result && result.success) {
        const target = this.reports.find(r => String(r.report_id) === String(reportId));
        if (target) {
          target.admin_reply = adminReply;
          target.status = status;
          target.updated_at = new Date().toISOString();
        }
        this.closeModal('modal-admin-reply-report');
        this.showToast('✅ 已成功保存管理員官方回覆！', 'success');
        this.renderReportsView();
      } else {
        const errMsg = (result && result.message) || '保存回覆失敗';
        this.showToast(`❌ ${errMsg}`, 'error');
      }
    } catch (err) {
      console.error('[ERR-JS-REPLY] 保存回覆異常:', err);
      this.showToast('❌ 保存回覆異常，請稍後重試', 'error');
    } finally {
      this.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  },

  // 管理員專屬：一鍵由回報卡片重設弟兄密碼為預設
  async handleQuickResetPasswordFromReport(reportId, targetId) {
    if (!this.isAdmin()) {
      this.showToast('權限不足！只有 13055 管理員可執行此操作。', 'error');
      return;
    }

    const targetObj = this.allMembers.find(m => String(m.id) === String(targetId));
    const targetName = targetObj && targetObj.name ? `${targetObj.name} (#${targetId})` : `學號 #${targetId}`;

    const confirmed = window.confirm(`【👑 管理員一鍵重設確認】\n\n確定要將「${targetName}」的密碼恢復為預設學號 (${targetId}) 嗎？\n\n系統將自動重設密碼並在回報項目中標示為已處理！`);
    if (!confirmed) return;

    this.showToast(`正在為學號 #${targetId} 恢復密碼...`, 'info');

    try {
      const result = await API.resetPasswordByReport({
        admin_id: '13055',
        report_id: reportId,
        target_id: targetId
      });

      if (result && result.success) {
        const target = this.reports.find(r => String(r.report_id) === String(reportId));
        if (target) {
          const nowStr = new Date().toISOString().substring(0, 16).replace('T', ' ');
          target.status = 'resolved';
          target.admin_reply = `已於 ${nowStr} 由管理員重設密碼為預設學號 #${targetId}，請重新登入！`;
          target.updated_at = nowStr;
        }
        this.showToast(result.message || `已成功恢復帳號 #${targetId} 密碼為預設！`, 'success');
        this.renderReportsView();
      } else {
        const errMsg = (result && result.message) || '重設失敗，請稍後重試';
        this.showToast(`❌ ${errMsg}`, 'error');
      }
    } catch (err) {
      console.error('[ERR-JS-QUICK-RESET] 一鍵重設密碼異常:', err);
      this.showToast('❌ 重設異常，請稍後重試', 'error');
    }
  },

  // =========================================================================
  // 弟兄檔案名片彈窗 (Member Detail Card Modal)
  // =========================================================================

  showMemberDetail(memberId) {
    const member = this.allMembers.find(m => String(m.id).trim() === String(memberId).trim());
    if (!member) return;

    const cleanId = String(member.id ?? '').trim();
    const memberName = String(member.name ?? '').trim();
    const hasName = Boolean(memberName);
    const displayName = hasName ? memberName : `弟兄 #${cleanId}`;
    const initials = hasName 
      ? memberName.substring(Math.max(0, memberName.length - 2)) 
      : cleanId.substring(Math.max(0, cleanId.length - 2));

    const titleEl = document.getElementById('detail-modal-title');
    if (titleEl) titleEl.innerHTML = `<span style="font-family:var(--font-mono); color:var(--tactical-amber);">DOSSIER //</span> #${cleanId} ${this.escapeHtml(displayName)}`;

    const bodyEl = document.getElementById('detail-modal-body');
    if (bodyEl) {
      const milPhoto = member.avatar_military || member.avatar_url;
      const milHtml = milPhoto ? `<img src="${milPhoto}" alt="大兵照">` : `<span>🪖 ${initials}</span>`;

      const civPhoto = member.avatar_civilian;
      const civHtml = civPhoto ? `<img src="${civPhoto}" alt="便服照">` : `<span>🕶️ ${initials}</span>`;

      bodyEl.innerHTML = `
        <div class="bottom-sheet-dossier-wrapper">
          <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:0.65rem;">
            <!-- 3D 翻轉證件照容器 (含四角十字標) -->
            <div class="avatar-flip-container tactical-avatar-frame" style="width:105px; height:140px;" onclick="APP.toggleCardFlip(this, event, 'detail-${cleanId}')" title="點擊 3D 翻轉切換照片 (大兵 ⇋ 便服)">
              <span class="tactical-crosshair crosshair-tl">+</span>
              <span class="tactical-crosshair crosshair-tr">+</span>
              <span class="tactical-crosshair crosshair-bl">+</span>
              <span class="tactical-crosshair crosshair-br">+</span>

              <div class="avatar-flip-card" id="flip-card-detail-${cleanId}">
                <div class="avatar-face avatar-face-front">${milHtml}</div>
                <div class="avatar-face avatar-face-back">${civHtml}</div>
              </div>
              <span class="flip-tag-badge flip-tag-front" id="flip-tag-detail-${cleanId}">🪖 大兵</span>
            </div>

            <div class="flip-hint-text" style="cursor:pointer;" onclick="APP.toggleCardFlip(this.previousElementSibling, event, 'detail-${cleanId}')">
              <span>🔄 點擊照片體驗 3D 翻轉 (大兵 ⇋ 便服)</span>
            </div>

            <div style="margin-top:0.25rem;">
              <h3 style="font-size:1.45rem; font-weight:900; color:#ffffff; letter-spacing:0.5px;">${this.escapeHtml(displayName)}</h3>
              <div class="member-callsign-box" style="margin-top:0.25rem; display:inline-flex;">
                <span class="callsign-label">CALLSIGN // 綽號:</span>
                <strong class="callsign-val">${this.escapeHtml(member.nickname || '未填寫')}</strong>
              </div>
            </div>

            <!-- 戰術中繼徽章 -->
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center; margin-top:0.35rem;">
              <span class="dossier-code-chip" style="font-size:0.75rem;">ID #${cleanId}</span>
              <span class="dossier-squad-chip" style="font-size:0.75rem;">SQD 0${member.squad}・第${this.toChineseNum(member.squad)}班 (${(typeof CONFIG !== 'undefined' && CONFIG.SQUAD_DUTIES && CONFIG.SQUAD_DUTIES[member.squad]) || ''})</span>
              <span class="dossier-room-chip" style="font-size:0.75rem;">RM 0${member.room}・第${this.toChineseNum(member.room)}寢</span>
              <span class="dossier-duty-tag" style="font-size:0.75rem;">🎖️ ${this.escapeHtml(member.duty || '一般兵')}</span>
            </div>

            <!-- Bento Specs -->
            <div class="dossier-bento-grid" style="width:100%; margin-top:0.6rem;">
              <div class="bento-cell bento-duty">
                <span class="bento-cell-label">🎖️ RANK / DUTY 職責</span>
                <span class="bento-cell-val">${this.escapeHtml(member.duty || '一般兵')}</span>
              </div>
              ${member.interests ? `
              <div class="bento-cell bento-interests">
                <span class="bento-cell-label">🎨 SPECS 專長興趣</span>
                <span class="bento-cell-val">${this.escapeHtml(member.interests)}</span>
              </div>` : ''}
              ${member.dream ? `
              <div class="bento-cell bento-dream">
                <span class="bento-cell-label">🌟 TARGET 未來目標</span>
                <span class="bento-cell-val">${this.escapeHtml(member.dream)}</span>
              </div>` : ''}
            </div>
          </div>

          <!-- 結訓感言與自我介紹 (點進去才看得到自我介紹) -->
          <div class="dossier-details-section" style="margin-top:1rem; display:flex; flex-direction:column; gap:0.75rem;">
            <!-- 結訓感言 (原本的 bio 欄位) -->
            <div class="member-bio dossier-transcript">
              <div class="transcript-tag">💬 TRANSCRIPT // 結訓感言</div>
              <div class="transcript-body" style="font-size:0.92rem; line-height:1.6;">
                ${this.escapeHtml(member.bio || (hasName ? '金六結 153R 1B3C 結訓快樂！江湖相見！' : '（尚未填寫結訓感言...）'))}
              </div>
            </div>

            <!-- 個人自我介紹 (Excel 新增的 self_intro 欄位，點進來完整檔案才展示) -->
            <div class="member-bio dossier-transcript" style="border-left-color: var(--tactical-green-light); background: rgba(34, 197, 94, 0.07);">
              <div class="transcript-tag" style="color: var(--tactical-green-light);">📝 DOSSIER BIO // 個人自我介紹</div>
              <div class="transcript-body" style="font-size:0.92rem; line-height:1.6; color:#f1f5f2;">
                ${this.escapeHtml(member.self_intro || '（尚未填寫個人自我介紹與詳細自傳...）')}
              </div>
            </div>
          </div>

          <!-- 社群聯絡與動作 -->
          <div style="margin-top:1.15rem; display:grid; grid-template-columns:1fr 1fr; gap:0.6rem;">
            ${member.ig ? `<button class="btn-social btn-ig" onclick="APP.openInstagram('${this.escapeHtml(member.ig)}')">📸 IG: @${this.escapeHtml(member.ig)}</button>` : `<button class="btn-social btn-ig" style="opacity:0.45; cursor:not-allowed;">📸 未填寫 IG</button>`}
            ${member.line ? `<button class="btn-social btn-line" onclick="APP.copyToClipboard('${this.escapeHtml(member.line)}', 'LINE ID')">💬 複製 LINE ID</button>` : `<button class="btn-social btn-line" style="opacity:0.45; cursor:not-allowed;">💬 未填寫 LINE</button>`}
            ${(this.currentUser && String(this.currentUser.id) === String(cleanId)) ? `<button class="btn-primary" style="grid-column:1/-1; padding:0.6rem;" onclick="APP.closeModal('modal-member-detail'); APP.openEditProfileModal();">✏️ 編輯我的個人檔案與照片</button>` : ''}
            ${(this.isAdmin() && String(member.id) !== '13055') ? `<button class="btn-admin-reset" style="grid-column:1/-1;" onclick="APP.handleAdminResetPassword('${member.id}')">🔑 管理員重設此弟兄密碼</button>` : ''}
          </div>
        </div>
      `;
    }

    const modal = document.getElementById('modal-member-detail');
    if (modal) modal.classList.add('active');
  },

  // 管理員專屬：重設弟兄密碼為預設 (僅限 13055)
  async handleAdminResetPassword(targetId) {
    if (!this.isAdmin()) {
      this.showToast('權限不足！只有 13055 管理員可執行此操作。', 'error');
      return;
    }

    const isCadre = String(targetId).toUpperCase().startsWith('1B3C');
    const targetObj = isCadre 
      ? this.cadres.find(c => String(c.id).toUpperCase() === String(targetId).toUpperCase())
      : this.allMembers.find(m => String(m.id) === String(targetId));

    const targetName = targetObj && targetObj.name ? `${targetObj.name} (#${targetId})` : `帳號 #${targetId}`;

    const confirmed = window.confirm(`【👑 管理員權限確認】\n\n確定要將「${targetName}」的登入密碼恢復為預設帳號 (${targetId}) 嗎？\n\n重設後該人員將可直接使用帳號 ${targetId} 登入並重新修改密碼。`);
    if (!confirmed) return;

    this.showToast(`正在恢復帳號 #${targetId} 的密碼...`, 'info');

    const result = await API.resetPassword(targetId, this.currentUser.id);
    if (result && result.success) {
      this.showToast(result.message || `已成功恢復帳號 #${targetId} 密碼為預設！`, 'success');
      this.closeModal('modal-member-detail');
    } else {
      const errCode = (result && result.code) || 'ERR-ADMIN-RESET-FAIL';
      const errMsg = (result && result.message) || '重設失敗，請稍後再試';
      this.showToast(`❌ [${errCode}] ${errMsg}`, 'error');
    }
  },

  // =========================================================================
  // 系統設定彈窗 (Settings Modal)


  // =========================================================================
  // 通用輔助工具 (Helpers)
  // =========================================================================

  closeModal(modalId) {
    if (modalId === 'modal-force-password-change' && this.currentUser && this.currentUser.needs_password_change) {
      this.showToast('🔒 首次登入請務必先設定自訂新密碼！', 'warning');
      return;
    }
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
      // 若處於強制設定新密碼狀態，禁止透過 Esc 關閉此彈窗
      if (m.id === 'modal-force-password-change' && this.currentUser && this.currentUser.needs_password_change) {
        return;
      }
      m.classList.remove('active');
    });
  },

  copyToClipboard(text, label = '內容') {
    if (!text) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(`${label}「${text}」已複製到剪貼簿！`, 'success');
      }).catch(() => {
        this.fallbackCopy(text, label);
      });
    } else {
      this.fallbackCopy(text, label);
    }
  },

  fallbackCopy(text, label) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.showToast(`${label}「${text}」已複製到剪貼簿！`, 'success');
    } catch (err) {
      this.showToast(`複製失敗，請手動複製: ${text}`, 'error');
    }
    document.body.removeChild(textArea);
  },

  openInstagram(handle) {
    if (!handle) return;
    const clean = handle.replace('@', '').trim();
    window.open(`https://instagram.com/${clean}`, '_blank');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const safeMessage = this.sanitizeText(message);
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : '🎖️'}</span>
      <span>${this.escapeHtml(safeMessage)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  sanitizeText(str) {
    if (!str) return '';
    return String(str)
      .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '')
      .replace(/nkust\.edu\.tw/gi, '')
      .replace(/c110170106/gi, '')
      .trim();
  },

  escapeHtml(str) {
    if (!str) return '';
    const sanitized = this.sanitizeText(str);
    return String(sanitized)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

// 頁面加載完成時初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
  APP.init();
});

window.APP = APP;
