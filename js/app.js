/**
 * 272梯 陸軍步兵第153旅 步1營第3連 (153R 1B3C) 紀念冊系統
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

  // 計算幹部入伍年資 (幾年幾個月)
  calculateServiceTime(dateStr) {
    if (!dateStr) return null;
    const start = new Date(dateStr);
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

  // 狀態變數
  currentUser: null,
  currentView: 'home',
  selectedSquad: 1,
  selectedRoom: 1,
  allMembers: [],
  cadres: [],
  legends: [],
  diaries: [],
  searchQuery: '',
  tempMilitaryAvatarBase64: null,
  tempCivilianAvatarBase64: null,

  // 初始化應用程式
  async init() {
    console.log('🎖️ 272T 153R 1B3C 紀念冊系統啟動中...');
    this.currentUser = CONFIG.getCurrentUser();
    this.updateAuthUI();

    // 載入資料 (優先從 API / LocalStorage 載入)
    await this.loadAllData();

    // 預設導航至首頁
    this.navigate('home');

    // 註冊鍵盤快捷鍵 (如 Esc 關閉彈窗)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  },

  // 載入所有資料庫資料
  async loadAllData() {
    try {
      const response = await API.getAllData();
      if (response && response.success && response.data) {
        this.allMembers = response.data.members || [];
        this.cadres = response.data.cadres || [];
        this.legends = response.data.legends || [];
        this.diaries = response.data.diaries || [];
      } else {
        // 降級為 MOCK_DATA
        this.allMembers = MOCK_DATA.getInitialMembers();
        this.cadres = MOCK_DATA.getInitialCadres();
        this.legends = MOCK_DATA.legends;
        this.diaries = MOCK_DATA.diaries;
      }
    } catch (e) {
      console.warn('載入資料異常，啟用預設資料庫:', e);
      this.allMembers = MOCK_DATA.getInitialMembers();
      this.cadres = MOCK_DATA.getInitialCadres();
      this.legends = MOCK_DATA.legends;
      this.diaries = MOCK_DATA.diaries;
    }

    // 更新首頁統計數字
    const memberCountEl = document.getElementById('stat-members-count');
    if (memberCountEl) memberCountEl.textContent = this.allMembers.length;
    const cadreCountEl = document.getElementById('stat-cadres-count');
    if (cadreCountEl) cadreCountEl.textContent = this.cadres.length;
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

    // 更新手機版底部快捷導覽 active 樣式
    document.querySelectorAll('.mobile-bottom-btn').forEach(btn => btn.classList.remove('active'));
    const bottomBtn = document.querySelector(`.mobile-bottom-btn[data-bottom-nav="${viewName}"]`);
    if (bottomBtn) bottomBtn.classList.add('active');

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
      const roomSec = document.getElementById('view-room') || document.getElementById('view-rooms');
      if (roomSec) roomSec.classList.add('active');
      this.setActiveNavBtn(`room-${this.selectedRoom}`);
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
  // 畫面渲染邏輯 (View Renderers)
  // =========================================================================

  // 1. 首頁渲染
  renderHomeView() {
    const homeCadresGrid = document.getElementById('home-cadres-grid');
    if (homeCadresGrid) {
      const topCadres = this.cadres.slice(0, 3);
      homeCadresGrid.innerHTML = topCadres.map(c => this.createCadreCardHtml(c)).join('');
    }

    // 最新傳奇預覽
    const latestLegendEl = document.getElementById('home-latest-legend');
    if (latestLegendEl) {
      if (this.legends && this.legends.length > 0) {
        const topLegend = this.legends[0];
        const targetMember = this.allMembers.find(m => String(m.id) === String(topLegend.target_id));
        const targetName = targetMember && targetMember.name ? `${targetMember.name}` : `#${topLegend.target_id}`;
        latestLegendEl.innerHTML = `
          <div class="legend-card" style="height: 100%;">
            <div class="legend-header">
              <div class="legend-title-group">
                <h3>⚡ 最新傳奇：${this.escapeHtml(topLegend.title)}</h3>
                <div class="legend-tags">
                  <span class="tag-target">主角: @${topLegend.target_id} ${targetName}</span>
                  <span class="tag-author">爆料: #${topLegend.author_id}</span>
                </div>
              </div>
              <span class="legend-date">${topLegend.created_at || ''}</span>
            </div>
            <div class="legend-content">${this.escapeHtml(topLegend.content)}</div>
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

    // 最新大兵日記預覽
    const latestDiaryEl = document.getElementById('home-latest-diary');
    if (latestDiaryEl) {
      if (this.diaries && this.diaries.length > 0) {
        const topDiary = this.diaries[0];
        const authorMember = this.allMembers.find(m => String(m.id) === String(topDiary.author_id));
        const authorName = authorMember && authorMember.name ? authorMember.name : `弟兄 #${topDiary.author_id}`;
        latestDiaryEl.innerHTML = `
          <div class="jukuang-notebook-card" style="height: 100%;">
            <div class="jukuang-header">
              <span class="jukuang-title-badge">📖 莒光精選：${this.escapeHtml(topDiary.title)}</span>
              <span class="jukuang-meta">${topDiary.created_at || ''}</span>
            </div>
            <div class="jukuang-page" style="max-height: 140px; overflow: hidden;">
              <p class="jukuang-entry-content">${this.escapeHtml(topDiary.content)}</p>
            </div>
            <div class="jukuang-footer">
              <span class="jukuang-author-info">✍️ 作者：#${topDiary.author_id} (${authorName})</span>
              <div class="official-seal"><span>連長</span><span>閱</span></div>
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

  // 2. 幹部專區渲染 (支援 100 位長官與班長)
  renderCadresView() {
    const cadresListGrid = document.getElementById('cadres-list-grid');
    if (cadresListGrid) {
      if (!this.cadres || this.cadres.length === 0) {
        cadresListGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #94a3b8;">
            <p style="font-size: 1.1rem; font-weight: 700;">目前尚無幹部資料</p>
          </div>
        `;
      } else {
        cadresListGrid.innerHTML = this.cadres.map(c => this.createCadreCardHtml(c)).join('');
      }
    }
  },

  createCadreCardHtml(cadre) {
    const isMe = Boolean(this.currentUser && String(this.currentUser.id).toUpperCase() === String(cadre.id).toUpperCase());
    const isAdmin = this.isAdmin();
    const hasName = Boolean(cadre.name && cadre.name.trim());
    const displayName = hasName ? cadre.name : `幹部 #${cadre.id}`;
    const initials = hasName ? cadre.name.substring(cadre.name.length - 2) : cadre.id.substring(4);

    // 正面：軍裝照
    const milPhoto = cadre.avatar_military || cadre.avatar_url || cadre.photo_url;
    const milAvatarHtml = milPhoto 
      ? `<img src="${milPhoto}" alt="軍裝照" onerror="this.onerror=null; this.parentElement.innerHTML='🪖 ${initials}'">` 
      : `<span>🪖 ${initials}</span>`;

    // 背面：私人便服照
    const civPhoto = cadre.avatar_civilian;
    const civAvatarHtml = civPhoto 
      ? `<img src="${civPhoto}" alt="便服照" onerror="this.onerror=null; this.parentElement.innerHTML='🕶️ ${initials}'">` 
      : `<span>🕶️ ${initials}</span>`;

    const igButton = cadre.ig 
      ? `<button class="btn-social btn-ig" onclick="APP.openInstagram('${this.escapeHtml(cadre.ig)}')" title="查看 Instagram: @${this.escapeHtml(cadre.ig)}">
          <span>📸 IG: @${this.escapeHtml(cadre.ig)}</span>
         </button>` 
      : `<button class="btn-social btn-ig" style="opacity: 0.45; cursor: not-allowed;" title="未填寫 IG">📸 未填寫</button>`;

    const lineButton = cadre.line 
      ? `<button class="btn-social btn-line" onclick="APP.copyToClipboard('${this.escapeHtml(cadre.line)}', 'LINE ID')" title="點擊複製 LINE ID">
          <span>💬 LINE: ${this.escapeHtml(cadre.line)}</span>
         </button>` 
      : `<button class="btn-social btn-line" style="opacity: 0.45; cursor: not-allowed;" title="未填寫 LINE">💬 未填寫</button>`;

    // 只有該幹部本人可以編輯自己的資料與照片
    const editSelfBtn = isMe 
      ? `<button class="btn-edit-self" onclick="APP.openEditProfileModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>編輯我的幹部資料與照片</span>
        </button>` 
      : '';

    // 13055 管理員專屬：可將幹部密碼恢復為預設帳號
    const adminResetBtn = (isAdmin && !isMe)
      ? `<button class="btn-admin-reset" onclick="APP.handleAdminResetPassword('${cadre.id}')" title="管理員權限：將此幹部密碼恢復為預設">
          <span>🔑 恢復預設密碼</span>
         </button>`
      : '';

    return `
      <div class="member-card cadre-member-card ${isMe ? 'is-current-user' : ''}" id="card-${cadre.id}">
        <div class="member-card-header">
          <!-- 3D 翻轉頭像容器 -->
          <div class="avatar-flip-container" onclick="APP.toggleCardFlip(this, event, '${cadre.id}')" title="點擊 3D 翻轉切換照片 (軍裝 ⇋ 便服)">
            <div class="avatar-flip-card" id="flip-card-${cadre.id}">
              <div class="avatar-face avatar-face-front">${milAvatarHtml}</div>
              <div class="avatar-face avatar-face-back">${civAvatarHtml}</div>
            </div>
            <span class="flip-tag-badge flip-tag-front" id="flip-tag-${cadre.id}">🪖 軍裝</span>
          </div>

          <div class="member-header-text">
            <div class="member-id-row">
              <span class="member-id-badge">#${cadre.id}</span>
              <span class="badge-admin" style="background:var(--primary-dark); color:var(--gold); font-size:0.7rem;">⭐ 長官幹部</span>
            </div>
            <h3 class="member-name" title="${this.escapeHtml(displayName)}" onclick="APP.showCadreDetail('${cadre.id}')" style="cursor:pointer;">
              ${this.escapeHtml(displayName)}
              ${isMe ? '<span style="color: var(--gold); font-size: 0.75rem; font-weight: 800;">(我)</span>' : ''}
              ${!hasName ? '<span style="font-size:0.75rem; color:#94a3b8; font-weight:normal;">(待填寫)</span>' : ''}
            </h3>
            <div class="member-nickname">稱呼: ${this.escapeHtml(cadre.nickname || '未填寫')}</div>
            <div class="flip-hint-text" onclick="APP.toggleCardFlip(this.closest('.member-card').querySelector('.avatar-flip-container'), event, '${cadre.id}')">
              <span>🔄 點擊照片翻轉 (軍裝 ⇋ 便服)</span>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.25rem;">
          <span class="member-duty-tag" style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a;">🎖️ 職等：${this.escapeHtml(cadre.rank_level || '幹部階級')}</span>
          <span class="member-duty-tag">⚔️ 職務：${this.escapeHtml(cadre.duty || '連隊幹部')}</span>
          ${cadre.enlist_date ? `<span class="member-duty-tag" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;" title="入伍日期：${this.escapeHtml(cadre.enlist_date)}">📅 年資：${this.calculateServiceTime(cadre.enlist_date)}</span>` : ''}
          ${cadre.interests ? `<span class="member-interest-tag" title="個人興趣">🎨 興趣：${this.escapeHtml(cadre.interests)}</span>` : ''}
          ${cadre.dream ? `<span class="member-dream-tag" title="未來夢想">🌟 夢想：${this.escapeHtml(cadre.dream)}</span>` : ''}
        </div>

        <div class="member-bio">
          ${this.escapeHtml(cadre.bio || (hasName ? '金六結 153R 1B3C 精實連隊！' : '（尚未填寫自我介紹與期勉感言...）'))}
        </div>

        <div class="member-social-actions">
          ${igButton}
          ${lineButton}
          ${editSelfBtn}
          ${adminResetBtn}
        </div>
      </div>
    `;
  },

  // 3. 班級名冊渲染
  renderSquadView() {
    const squadNum = this.selectedSquad;
    const titleEl = document.getElementById('squad-view-title');
    if (titleEl) titleEl.textContent = `第 ${this.toChineseNum(squadNum)} 班 成員名冊`;

    // 更新帶班班長資訊
    const leaderInfo = MOCK_DATA.squadLeaders[squadNum] || { name: '帶班班長', rank: '帶班幹部', quote: '（待幹部填寫帶班期勉）' };
    const rankEl = document.getElementById('squad-leader-rank');
    const nameEl = document.getElementById('squad-leader-name');
    const quoteEl = document.getElementById('squad-leader-quote');
    if (rankEl) rankEl.textContent = leaderInfo.rank || '帶班幹部';
    if (nameEl) nameEl.textContent = leaderInfo.name || '帶班班長';
    if (quoteEl) quoteEl.textContent = leaderInfo.quote || '（待幹部填寫帶班期勉）';

    // 篩選本班成員
    let members = this.allMembers.filter(m => Number(m.squad) === squadNum);

    // 搜尋過濾
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      members = members.filter(m => 
        String(m.id).toLowerCase().includes(q) ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.nickname && m.nickname.toLowerCase().includes(q)) ||
        (m.duty && m.duty.toLowerCase().includes(q)) ||
        (m.bio && m.bio.toLowerCase().includes(q))
      );
    }

    const countTag = document.getElementById('squad-member-count-tag');
    if (countTag) countTag.textContent = `${members.length} 人`;

    const membersGrid = document.getElementById('squad-members-grid');
    if (membersGrid) {
      if (members.length === 0) {
        membersGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #94a3b8;">
            <p style="font-size: 1.1rem; font-weight: 700;">查無符合「${this.escapeHtml(this.searchQuery)}」的弟兄資料</p>
            <p style="font-size: 0.85rem; margin-top: 0.5rem;">請嘗試搜尋其他關鍵字或學號</p>
          </div>
        `;
      } else {
        membersGrid.innerHTML = members.map(m => this.createMemberCardHtml(m)).join('');
      }
    }
  },

  handleSearch(query) {
    this.searchQuery = query.trim();
    this.renderSquadView();
  },

  // 判斷當前登入者是否為 13055 系統管理員
  isAdmin() {
    return Boolean(this.currentUser && String(this.currentUser.id) === '13055');
  },

  // 建立成員卡片 (含 3D 雙照片翻轉結構)
  createMemberCardHtml(member) {
    const isMe = Boolean(this.currentUser && String(this.currentUser.id) === String(member.id));
    const isAdmin = this.isAdmin();
    const hasName = Boolean(member.name && member.name.trim());
    const displayName = hasName ? member.name : `弟兄 #${member.id}`;
    const initials = hasName ? member.name.substring(member.name.length - 2) : member.id.substring(3);

    // 正面：大兵軍裝照
    const milPhoto = member.avatar_military || member.avatar_url;
    const milAvatarHtml = milPhoto 
      ? `<img src="${milPhoto}" alt="大兵照" onerror="this.onerror=null; this.parentElement.innerHTML='🪖 ${initials}'">` 
      : `<span>🪖 ${initials}</span>`;

    // 背面：私人便服照
    const civPhoto = member.avatar_civilian;
    const civAvatarHtml = civPhoto 
      ? `<img src="${civPhoto}" alt="私人照" onerror="this.onerror=null; this.parentElement.innerHTML='🕶️ ${initials}'">` 
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

    // 只有自己可以編輯自己的資料與照片
    const editSelfBtn = isMe 
      ? `<button class="btn-edit-self" onclick="APP.openEditProfileModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>編輯我的個人資料與照片</span>
        </button>` 
      : '';

    // 13055 管理員專屬：可將其他人的密碼恢復為預設學號
    const adminResetBtn = (isAdmin && !isMe)
      ? `<button class="btn-admin-reset" onclick="APP.handleAdminResetPassword('${member.id}')" title="管理員權限：將此弟兄密碼恢復為預設學號">
          <span>🔑 恢復預設密碼</span>
         </button>`
      : '';

    return `
      <div class="member-card ${isMe ? 'is-current-user' : ''}" id="card-${member.id}">
        <div class="member-card-header">
          <!-- 3D 翻轉頭像容器 -->
          <div class="avatar-flip-container" onclick="APP.toggleCardFlip(this, event, '${member.id}')" title="點擊 3D 翻轉切換照片 (大兵 ⇋ 便服)">
            <div class="avatar-flip-card" id="flip-card-${member.id}">
              <div class="avatar-face avatar-face-front">${milAvatarHtml}</div>
              <div class="avatar-face avatar-face-back">${civAvatarHtml}</div>
            </div>
            <span class="flip-tag-badge flip-tag-front" id="flip-tag-${member.id}">🪖 大兵</span>
          </div>

          <div class="member-header-text">
            <div class="member-id-row">
              <span class="member-id-badge">#${member.id}</span>
              <span class="member-room-badge">第 ${this.toChineseNum(member.room)} 寢</span>
            </div>
            <h3 class="member-name" title="${this.escapeHtml(displayName)}" onclick="APP.showMemberDetail('${member.id}')" style="cursor:pointer;">
              ${this.escapeHtml(displayName)}
              ${isMe ? '<span style="color: var(--gold); font-size: 0.75rem; font-weight: 800;">(我)</span>' : ''}
              ${!hasName ? '<span style="font-size:0.75rem; color:#94a3b8; font-weight:normal;">(待填寫)</span>' : ''}
            </h3>
            <div class="member-nickname">綽號: ${this.escapeHtml(member.nickname || '未填寫')}</div>
            <div class="flip-hint-text" onclick="APP.toggleCardFlip(this.closest('.member-card').querySelector('.avatar-flip-container'), event, '${member.id}')">
              <span>🔄 點擊照片翻轉 (大兵 ⇋ 便服)</span>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.25rem;">
          <span class="member-duty-tag">🎖️ ${this.escapeHtml(member.duty || '一般兵')}</span>
          ${member.interests ? `<span class="member-interest-tag" title="個人興趣">🎨 興趣：${this.escapeHtml(member.interests)}</span>` : ''}
          ${member.dream ? `<span class="member-dream-tag" title="未來夢想">🌟 夢想：${this.escapeHtml(member.dream)}</span>` : ''}
        </div>

        <div class="member-bio">
          ${this.escapeHtml(member.bio || (hasName ? '結訓快樂！歡迎常保持聯絡！' : '（尚未填寫自我介紹與感言...）'))}
        </div>

        <div class="member-social-actions">
          ${igButton}
          ${lineButton}
          ${editSelfBtn}
          ${adminResetBtn}
        </div>
      </div>
    `;
  },

  // 3D 照片翻轉觸發
  toggleCardFlip(container, event, memberId) {
    if (event) event.stopPropagation();
    const flipCard = document.getElementById(`flip-card-${memberId}`);
    const flipTag = document.getElementById(`flip-tag-${memberId}`);

    if (flipCard) {
      const isFlipped = flipCard.classList.toggle('is-flipped');
      if (flipTag) {
        if (isFlipped) {
          flipTag.textContent = '🕶️ 便服';
          flipTag.className = 'flip-tag-badge flip-tag-back';
        } else {
          flipTag.textContent = '🪖 大兵';
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

  // 4. 寢室配置圖渲染 (10人房標準上下鋪，1號下鋪固定為帶班班長)
  renderRoomView() {
    const roomNum = this.selectedRoom;
    const titleEl = document.getElementById('room-view-title');
    if (titleEl) titleEl.textContent = `第 ${this.toChineseNum(roomNum)} 寢 床位配置圖 (10人標準房)`;

    // 取得該寢室 9 位弟兄
    const roomMembers = this.allMembers.filter(m => Number(m.room) === roomNum);
    const bunksGrid = document.getElementById('room-bunks-grid');
    if (!bunksGrid) return;

    // 帶班班長資訊 (對應班長)
    const leaderInfo = MOCK_DATA.squadLeaders[roomNum] || { name: '帶班班長', rank: '帶班幹部', quote: '（待幹部填寫帶班期勉）' };

    let bunksHtml = `
      <!-- A 棟雙層床 (1號下鋪固定為班長) -->
      <div class="bunk-unit">
        <div class="bunk-unit-title">🛏️ A 棟雙層床 (幹部房位)</div>
        <div class="bunk-slots">
          <!-- 上鋪：2號床 (弟兄) -->
          ${this.createBedSlotHtml(roomMembers[0], 2, '上鋪 (Upper)')}
          <!-- 下鋪：1號床 (帶班班長專屬) -->
          ${this.createLeaderBedSlotHtml(leaderInfo, 1)}
        </div>
      </div>

      <!-- B 棟雙層床 -->
      <div class="bunk-unit">
        <div class="bunk-unit-title">🛏️ B 棟雙層床</div>
        <div class="bunk-slots">
          ${this.createBedSlotHtml(roomMembers[2], 4, '上鋪 (Upper)')}
          ${this.createBedSlotHtml(roomMembers[1], 3, '下鋪 (Lower)')}
        </div>
      </div>

      <!-- C 棟雙層床 -->
      <div class="bunk-unit">
        <div class="bunk-unit-title">🛏️ C 棟雙層床</div>
        <div class="bunk-slots">
          ${this.createBedSlotHtml(roomMembers[4], 6, '上鋪 (Upper)')}
          ${this.createBedSlotHtml(roomMembers[3], 5, '下鋪 (Lower)')}
        </div>
      </div>

      <!-- D 棟雙層床 -->
      <div class="bunk-unit">
        <div class="bunk-unit-title">🛏️ D 棟雙層床</div>
        <div class="bunk-slots">
          ${this.createBedSlotHtml(roomMembers[6], 8, '上鋪 (Upper)')}
          ${this.createBedSlotHtml(roomMembers[5], 7, '下鋪 (Lower)')}
        </div>
      </div>

      <!-- E 棟雙層床 -->
      <div class="bunk-unit">
        <div class="bunk-unit-title">🛏️ E 棟雙層床</div>
        <div class="bunk-slots">
          ${this.createBedSlotHtml(roomMembers[8], 10, '上鋪 (Upper)')}
          ${this.createBedSlotHtml(roomMembers[7], 9, '下鋪 (Lower)')}
        </div>
      </div>
    `;

    bunksGrid.innerHTML = bunksHtml;
  },

  // 渲染班長專屬 1 號下鋪 (已清除錯誤假名)
  createLeaderBedSlotHtml(leader, bedNo) {
    return `
      <div class="bed-card bed-leader" onclick="APP.showToast('🪖 帶班班長床位（幹部名冊填寫後自動連動）', 'info')" title="帶班班長床位">
        <span class="bed-label-pill">🎖️ ${bedNo} 號床 (下鋪)</span>
        <div class="bed-occupant-info">
          <div class="bed-occupant-name" style="color: #92400e; font-weight: 800;">
            🪖 帶班班長
          </div>
          <div class="bed-occupant-id" style="color: #b45309; font-weight: 600;">
            帶班幹部床位 (待幹部填寫)
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

  // 5. 傳奇版渲染
  renderLegendsView() {
    const listContainer = document.getElementById('legends-list-container');
    if (!listContainer) return;

    if (this.legends.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 3.5rem 1.5rem; background: #fff; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">⚡</div>
          <p style="font-size: 1.15rem; font-weight: 800; color: var(--primary-dark);">三連傳奇榜目前尚無事蹟</p>
          <p style="font-size: 0.88rem; color: #64748b; margin-top: 0.5rem;">快點擊右上角「+ 爆料新傳奇」分享三連弟兄在金六結的爆笑與熱血回憶！</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = this.legends.map(l => {
      const targetMember = this.allMembers.find(m => String(m.id) === String(l.target_id));
      const targetName = targetMember && targetMember.name ? `${targetMember.name} (第${this.toChineseNum(targetMember.squad)}班)` : `#${l.target_id}`;

      const authorMember = this.allMembers.find(m => String(m.id) === String(l.author_id));
      const authorName = authorMember && authorMember.name ? authorMember.name : `#${l.author_id}`;

      return `
        <div class="legend-card" id="legend-${l.legend_id}">
          <div class="legend-header">
            <div class="legend-title-group">
              <h3>⚡ ${this.escapeHtml(l.title)}</h3>
              <div class="legend-tags">
                <span class="tag-target" onclick="APP.showMemberDetail('${l.target_id}')" style="cursor: pointer;" title="查看傳奇主角檔案">
                  🎯 傳奇主角: @${l.target_id} ${this.escapeHtml(targetName)}
                </span>
                <span class="tag-author">✍️ 爆料者: #${l.author_id} (${this.escapeHtml(authorName)})</span>
              </div>
            </div>
            <span class="legend-date">📅 ${l.created_at || ''}</span>
          </div>
          <div class="legend-content">
            ${this.escapeHtml(l.content)}
          </div>
        </div>
      `;
    }).join('');
  },

  // 6. 大兵日記渲染 (莒光作文簿風格)
  renderDiariesView() {
    const listContainer = document.getElementById('diaries-list-container');
    if (!listContainer) return;

    if (this.diaries.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 3.5rem 1.5rem; background: #fff; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📖</div>
          <p style="font-size: 1.15rem; font-weight: 800; color: var(--primary-dark);">國軍莒光作文簿目前尚無心得</p>
          <p style="font-size: 0.88rem; color: #64748b; margin-top: 0.5rem;">快點擊右上角「✍️ 寫大兵日記」寫下你在金六結的心情、結訓感言或軍旅生活回顧！</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = this.diaries.map(d => {
      const authorMember = this.allMembers.find(m => String(m.id) === String(d.author_id));
      const authorName = authorMember && authorMember.name ? `${authorMember.name} (第${this.toChineseNum(authorMember.squad)}班)` : `弟兄 #${d.author_id}`;

      return `
        <div class="jukuang-notebook-card" id="diary-${d.diary_id}">
          <div class="jukuang-header">
            <span class="jukuang-title-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
              國軍莒光作文簿・生活心得
            </span>
            <span class="jukuang-meta">📅 發表時間：${d.created_at || ''}</span>
          </div>

          <div class="jukuang-page">
            <h3 class="jukuang-entry-title">題目：${this.escapeHtml(d.title)}</h3>
            <div class="jukuang-entry-content">${this.escapeHtml(d.content)}</div>
          </div>

          <div class="jukuang-footer">
            <span class="jukuang-author-info">
              ✍️ 撰寫人：#${d.author_id} ${this.escapeHtml(authorName)}
            </span>
            <div class="official-seal" title="輔導長 / 連長 官方評閱章">
              <span>輔導長</span>
              <span>批閱</span>
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
      const displayName = this.currentUser.name || `學號 ${this.currentUser.id}`;
      const initials = this.currentUser.name ? this.currentUser.name.substring(this.currentUser.name.length - 1) : '我';
      const userPhoto = this.currentUser.avatar_military || this.currentUser.avatar_url || this.currentUser.avatar_civilian;
      const avatarHtml = userPhoto 
        ? `<img src="${userPhoto}" alt="${displayName}">` 
        : initials;

      const adminBadgeHtml = this.isAdmin() ? '<span class="badge-admin">👑 管理員</span>' : '';

      container.innerHTML = `
        <div class="user-status-bar">
          <div class="user-avatar-mini">${avatarHtml}</div>
          <span>目前登入：<strong>${this.currentUser.id}</strong> (${this.escapeHtml(displayName)}) ${adminBadgeHtml}</span>
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
      this.currentUser = result.user;
      CONFIG.setCurrentUser(result.user);
      this.updateAuthUI();
      this.closeModal('modal-login');
      
      const isCadre = Boolean(result.user.is_cadre || String(result.user.id).toUpperCase().startsWith('1B3C'));
      const welcomeName = result.user.name ? `${result.user.name} ${isCadre ? '幹部' : '弟兄'}` : `${isCadre ? '幹部' : '弟兄'} #${result.user.id}`;
      this.showToast(`歡迎回來，${welcomeName}！正在為您定位卡片...`, 'success');

      if (isCadre) {
        // 幹部自動切換至幹部專區
        this.navigate('cadres');
      } else {
        // 弟兄自動切換至所屬班級
        const userSquad = Number(result.user.squad) || 1;
        this.navigate('squad', userSquad);
      }

      // 平滑滾動至個人卡片並聚焦高亮
      setTimeout(() => {
        const myCard = document.getElementById(`card-${result.user.id}`);
        if (myCard) {
          myCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          myCard.classList.add('highlight-pulse');
          setTimeout(() => myCard.classList.remove('highlight-pulse'), 5000);
        }

        // 若尚未填寫姓名，自動彈出編輯視窗引導填寫自介與雙照片
        if (!result.user.name) {
          setTimeout(() => {
            this.openEditProfileModal();
          }, 600);
        }
      }, 350);

    } else {
      this.showToast(result ? result.message : '登入失敗，請確認學號密碼', 'error');
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
      titleEl.textContent = isCadre ? `編輯長官幹部基本資料 (#${this.currentUser.id})` : `編輯個人基本資料 (#${this.currentUser.id})`;
    }

    const cadreGroup = document.getElementById('profile-cadre-fields-group');
    if (cadreGroup) cadreGroup.style.display = isCadre ? 'block' : 'none';
    const rankInput = document.getElementById('profile-rank-level');
    if (rankInput) rankInput.value = member.rank_level || member.rank || '';
    const enlistInput = document.getElementById('profile-enlist-date');
    if (enlistInput) {
      enlistInput.value = member.enlist_date || '';
      this.handleEnlistDateChange(member.enlist_date || '');
    }

    document.getElementById('profile-name').value = member.name || '';
    document.getElementById('profile-nickname').value = member.nickname || '';
    document.getElementById('profile-duty').value = member.duty || '';
    document.getElementById('profile-interests').value = member.interests || '';
    document.getElementById('profile-dream').value = member.dream || '';
    document.getElementById('profile-ig').value = member.ig || '';
    document.getElementById('profile-line').value = member.line || '';
    document.getElementById('profile-bio').value = member.bio || '';

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

    const newPwdEl = document.getElementById('profile-new-password');
    const confirmPwdEl = document.getElementById('profile-confirm-password');
    if (newPwdEl) newPwdEl.value = '';
    if (confirmPwdEl) confirmPwdEl.value = '';

    const modal = document.getElementById('modal-edit-profile');
    if (modal) modal.classList.add('active');
  },

  handleMilitaryAvatarSelect(input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 3 * 1024 * 1024) {
        this.showToast('圖片過大，請選擇 3MB 以下的軍裝照', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        this.tempMilitaryAvatarBase64 = e.target.result;
        const preview = document.getElementById('profile-military-avatar-preview');
        if (preview) preview.innerHTML = `<img src="${e.target.result}" alt="軍裝照預覽">`;
      };
      reader.readAsDataURL(file);
    }
  },

  handleCivilianAvatarSelect(input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 3 * 1024 * 1024) {
        this.showToast('圖片過大，請選擇 3MB 以下的私人照', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        this.tempCivilianAvatarBase64 = e.target.result;
        const preview = document.getElementById('profile-civilian-avatar-preview');
        if (preview) preview.innerHTML = `<img src="${e.target.result}" alt="私人照預覽">`;
      };
      reader.readAsDataURL(file);
    }
  },

  async handleSaveProfile(e) {
    e.preventDefault();
    if (!this.currentUser) return;

    const isCadre = Boolean(this.currentUser.is_cadre || String(this.currentUser.id).toUpperCase().startsWith('1B3C'));
    const name = document.getElementById('profile-name').value.trim();
    const nickname = document.getElementById('profile-nickname').value.trim();
    const duty = document.getElementById('profile-duty').value.trim();
    const interests = document.getElementById('profile-interests').value.trim();
    const dream = document.getElementById('profile-dream').value.trim();
    const ig = document.getElementById('profile-ig').value.trim();
    const line = document.getElementById('profile-line').value.trim();
    const bio = document.getElementById('profile-bio').value.trim();

    const rankLevelInput = document.getElementById('profile-rank-level');
    const rank_level = rankLevelInput ? rankLevelInput.value.trim() : '';

    const enlistDateInput = document.getElementById('profile-enlist-date');
    const enlist_date = (isCadre && enlistDateInput) ? enlistDateInput.value.trim() : '';

    // 密碼變更檢查
    const newPwdInput = document.getElementById('profile-new-password');
    const confirmPwdInput = document.getElementById('profile-confirm-password');
    const newPassword = newPwdInput ? newPwdInput.value.trim() : '';
    const confirmPassword = confirmPwdInput ? confirmPwdInput.value.trim() : '';

    if (newPassword) {
      if (newPassword.length < 4) {
        this.showToast('新密碼長度建議至少 4 個字元', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        this.showToast('兩次輸入的新密碼不一致，請重新檢查！', 'error');
        return;
      }
    }

    const saveBtn = document.getElementById('btn-save-profile');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = '資料與照片儲存中...';
    }

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
      newPassword: newPassword || undefined,
      avatarMilitaryBase64: this.tempMilitaryAvatarBase64,
      avatarCivilianBase64: this.tempCivilianAvatarBase64
    };

    const result = await API.updateProfile(payload);

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '儲存更新';
    }

    if (result && result.success) {
      this.currentUser = result.user || { ...this.currentUser, ...payload };
      CONFIG.setCurrentUser(this.currentUser);

      if (isCadre) {
        const cIdx = this.cadres.findIndex(c => String(c.id).toUpperCase() === String(this.currentUser.id).toUpperCase());
        if (cIdx !== -1) {
          this.cadres[cIdx] = { ...this.cadres[cIdx], ...this.currentUser };
        }
        this.renderCadresView();
        this.renderHomeView();
      } else {
        const mIdx = this.allMembers.findIndex(m => String(m.id) === String(this.currentUser.id));
        if (mIdx !== -1) {
          this.allMembers[mIdx] = { ...this.allMembers[mIdx], ...this.currentUser };
        }
        if (this.currentView === 'squad') this.renderSquadView();
        if (this.currentView === 'room') this.renderRoomView();
      }

      this.updateAuthUI();
      this.closeModal('modal-edit-profile');
      
      if (newPassword) {
        this.showToast('個人資料、雙照片與新密碼已成功設定！請牢記您的新密碼。', 'success');
      } else {
        this.showToast('個人資料與雙照片已成功儲存！', 'success');
      }
    } else {
      this.showToast(result ? result.message : '更新失敗，請稍後再試', 'error');
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

    const targetId = document.getElementById('legend-target-id').value.trim();
    const title = document.getElementById('legend-title').value.trim();
    const content = document.getElementById('legend-content').value.trim();

    if (!targetId || !title || !content) {
      this.showToast('請填寫完整傳奇內容', 'error');
      return;
    }

    const payload = {
      target_id: targetId,
      author_id: this.currentUser.id,
      title,
      content
    };

    const result = await API.addLegend(payload);
    if (result && result.success) {
      if (result.data) this.legends.unshift(result.data);
      this.closeModal('modal-add-legend');
      this.showToast('傳奇事蹟發布成功！', 'success');
      this.renderLegendsView();
    } else {
      this.showToast(result ? result.message : '發布失敗', 'error');
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

    const title = document.getElementById('diary-title').value.trim();
    const content = document.getElementById('diary-content').value.trim();

    if (!title || !content) {
      this.showToast('請填寫篇名與心得內文', 'error');
      return;
    }

    const payload = {
      author_id: this.currentUser.id,
      title,
      content
    };

    const result = await API.addDiary(payload);
    if (result && result.success) {
      if (result.data) this.diaries.unshift(result.data);
      this.closeModal('modal-add-diary');
      this.showToast('大兵日記已送交輔導長批閱！', 'success');
      this.renderDiariesView();
    } else {
      this.showToast(result ? result.message : '發布失敗', 'error');
    }
  },

  // =========================================================================
  // 弟兄檔案名片彈窗 (Member Detail Card Modal)
  // =========================================================================

  showMemberDetail(memberId) {
    const member = this.allMembers.find(m => String(m.id) === String(memberId));
    if (!member) return;

    const hasName = Boolean(member.name && member.name.trim());
    const displayName = hasName ? member.name : `弟兄 #${member.id}`;
    const initials = hasName ? member.name.substring(member.name.length - 2) : member.id.substring(3);

    const titleEl = document.getElementById('detail-modal-title');
    if (titleEl) titleEl.textContent = `弟兄檔案 #${member.id} ${displayName}`;

    const bodyEl = document.getElementById('detail-modal-body');
    if (bodyEl) {
      const milPhoto = member.avatar_military || member.avatar_url;
      const milHtml = milPhoto ? `<img src="${milPhoto}" alt="大兵照">` : `<span>🪖 ${initials}</span>`;

      const civPhoto = member.avatar_civilian;
      const civHtml = civPhoto ? `<img src="${civPhoto}" alt="私人照">` : `<span>🕶️ ${initials}</span>`;

      bodyEl.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:0.75rem;">
          <!-- 3D 翻轉證件照容器 -->
          <div class="avatar-flip-container" style="width:96px; height:128px;" onclick="APP.toggleCardFlip(this, event, 'detail-${member.id}')" title="點擊 3D 翻轉 (大兵 ⇋ 便服)">
            <div class="avatar-flip-card" id="flip-card-detail-${member.id}">
              <div class="avatar-face avatar-face-front">${milHtml}</div>
              <div class="avatar-face avatar-face-back">${civHtml}</div>
            </div>
            <span class="flip-tag-badge flip-tag-front" id="flip-tag-detail-${member.id}">🪖 大兵</span>
          </div>

          <div style="font-size:0.75rem; color:#64748b; cursor:pointer;" onclick="APP.toggleCardFlip(this.previousElementSibling, event, 'detail-${member.id}')">
            🔄 點擊證件照體驗 3D 翻轉 (大兵 ⇋ 便服)
          </div>

          <div>
            <h3 style="font-size:1.3rem; font-weight:800;">${this.escapeHtml(displayName)}</h3>
            <div style="font-size:0.85rem; color:#64748b;">綽號：${this.escapeHtml(member.nickname || '未填寫')}</div>
          </div>

          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;">
            <span class="tag" style="background:var(--primary-light); color:#fff; padding:3px 8px; border-radius:4px; font-size:0.75rem;">第 ${this.toChineseNum(member.squad)} 班</span>
            <span class="tag" style="background:var(--primary-accent); color:#fff; padding:3px 8px; border-radius:4px; font-size:0.75rem;">第 ${this.toChineseNum(member.room)} 寢</span>
            <span class="tag" style="background:var(--gold); color:var(--primary-dark); font-weight:800; padding:3px 8px; border-radius:4px; font-size:0.75rem;">🎖️ ${this.escapeHtml(member.duty || '一般兵')}</span>
          </div>

          ${(member.interests || member.dream) ? `
            <div style="display:flex; flex-direction:column; gap:0.35rem; width:100%; margin-top:0.4rem; text-align:left; background:#fff; border:1px solid #e2e8f0; border-radius:var(--radius-sm); padding:0.65rem 0.85rem; font-size:0.82rem;">
              ${member.interests ? `<div><strong style="color:var(--primary-dark);">🎨 個人興趣：</strong>${this.escapeHtml(member.interests)}</div>` : ''}
              ${member.dream ? `<div><strong style="color:#b45309;">🌟 未來夢想：</strong>${this.escapeHtml(member.dream)}</div>` : ''}
            </div>
          ` : ''}
        </div>

        <div style="margin-top:1rem; background:#f8faf9; border-left:3px solid var(--primary-accent); padding:0.85rem; border-radius:var(--radius-sm); font-size:0.88rem; color:#334155; line-height:1.5;">
          ${this.escapeHtml(member.bio || (hasName ? '結訓快樂！' : '（尚未填寫自我介紹與感言...）'))}
        </div>

        <div style="margin-top:1rem; display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
          ${member.ig ? `<button class="btn-social btn-ig" onclick="APP.openInstagram('${this.escapeHtml(member.ig)}')">📸 IG: @${this.escapeHtml(member.ig)}</button>` : ''}
          ${member.line ? `<button class="btn-social btn-line" onclick="APP.copyToClipboard('${this.escapeHtml(member.line)}', 'LINE ID')">💬 複製 LINE ID</button>` : ''}
          ${(this.isAdmin() && String(member.id) !== '13055') ? `<button class="btn-admin-reset" onclick="APP.handleAdminResetPassword('${member.id}')">🔑 恢復此弟兄密碼為預設 (學號)</button>` : ''}
        </div>
      `;
    }

    const modal = document.getElementById('modal-member-detail');
    if (modal) modal.classList.add('active');
  },

  // 長官幹部詳細名片彈窗 (Cadre Detail Modal)
  showCadreDetail(cadreId) {
    const cadre = this.cadres.find(c => String(c.id).toUpperCase() === String(cadreId).toUpperCase());
    if (!cadre) return;

    const hasName = Boolean(cadre.name && cadre.name.trim());
    const displayName = hasName ? cadre.name : `幹部 #${cadre.id}`;
    const initials = hasName ? cadre.name.substring(cadre.name.length - 2) : cadre.id.substring(4);

    const titleEl = document.getElementById('detail-modal-title');
    if (titleEl) titleEl.textContent = `幹部檔案 #${cadre.id} ${displayName}`;

    const bodyEl = document.getElementById('detail-modal-body');
    if (bodyEl) {
      const milPhoto = cadre.avatar_military || cadre.avatar_url || cadre.photo_url;
      const milHtml = milPhoto ? `<img src="${milPhoto}" alt="軍裝照">` : `<span>🪖 ${initials}</span>`;

      const civPhoto = cadre.avatar_civilian;
      const civHtml = civPhoto ? `<img src="${civPhoto}" alt="便服照">` : `<span>🕶️ ${initials}</span>`;

      bodyEl.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:0.75rem;">
          <!-- 3D 翻轉證件照容器 -->
          <div class="avatar-flip-container" style="width:96px; height:128px;" onclick="APP.toggleCardFlip(this, event, 'detail-${cadre.id}')" title="點擊 3D 翻轉 (軍裝 ⇋ 便服)">
            <div class="avatar-flip-card" id="flip-card-detail-${cadre.id}">
              <div class="avatar-face avatar-face-front">${milHtml}</div>
              <div class="avatar-face avatar-face-back">${civHtml}</div>
            </div>
            <span class="flip-tag-badge flip-tag-front" id="flip-tag-detail-${cadre.id}">🪖 軍裝</span>
          </div>

          <div style="font-size:0.75rem; color:#64748b; cursor:pointer;" onclick="APP.toggleCardFlip(this.previousElementSibling, event, 'detail-${cadre.id}')">
            🔄 點擊證件照體驗 3D 翻轉 (軍裝 ⇋ 便服)
          </div>

          <div>
            <h3 style="font-size:1.3rem; font-weight:800;">${this.escapeHtml(displayName)}</h3>
            <div style="font-size:0.85rem; color:#64748b;">稱呼：${this.escapeHtml(cadre.nickname || '未填寫')}</div>
          </div>

          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;">
            <span class="tag" style="background:#fef3c7; color:#92400e; font-weight:800; padding:3px 8px; border-radius:4px; font-size:0.75rem;">🎖️ 職等：${this.escapeHtml(cadre.rank_level || '幹部階級')}</span>
            <span class="tag" style="background:var(--primary-light); color:#fff; padding:3px 8px; border-radius:4px; font-size:0.75rem;">⚔️ 職務：${this.escapeHtml(cadre.duty || '連隊幹部')}</span>
            ${cadre.enlist_date ? `<span class="tag" style="background:#e0f2fe; color:#0369a1; font-weight:800; padding:3px 8px; border-radius:4px; font-size:0.75rem;">📅 入伍：${this.escapeHtml(cadre.enlist_date)} (${this.calculateServiceTime(cadre.enlist_date)})</span>` : ''}
          </div>

          ${(cadre.interests || cadre.dream) ? `
            <div style="display:flex; flex-direction:column; gap:0.35rem; width:100%; margin-top:0.4rem; text-align:left; background:#fff; border:1px solid #e2e8f0; border-radius:var(--radius-sm); padding:0.65rem 0.85rem; font-size:0.82rem;">
              ${cadre.interests ? `<div><strong style="color:var(--primary-dark);">🎨 個人興趣：</strong>${this.escapeHtml(cadre.interests)}</div>` : ''}
              ${cadre.dream ? `<div><strong style="color:#b45309;">🌟 未來夢想：</strong>${this.escapeHtml(cadre.dream)}</div>` : ''}
            </div>
          ` : ''}
        </div>

        <div style="margin-top:1rem; background:#f8faf9; border-left:3px solid var(--primary-accent); padding:0.85rem; border-radius:var(--radius-sm); font-size:0.88rem; color:#334155; line-height:1.5;">
          ${this.escapeHtml(cadre.bio || (hasName ? '金六結 153R 1B3C 精實連隊！' : '（尚未填寫自我介紹與期勉感言...）'))}
        </div>

        <div style="margin-top:1rem; display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
          ${cadre.ig ? `<button class="btn-social btn-ig" onclick="APP.openInstagram('${this.escapeHtml(cadre.ig)}')">📸 IG: @${this.escapeHtml(cadre.ig)}</button>` : ''}
          ${cadre.line ? `<button class="btn-social btn-line" onclick="APP.copyToClipboard('${this.escapeHtml(cadre.line)}', 'LINE ID')">💬 複製 LINE ID</button>` : ''}
          ${(this.isAdmin() && String(cadre.id) !== '13055') ? `<button class="btn-admin-reset" onclick="APP.handleAdminResetPassword('${cadre.id}')">🔑 恢復此幹部密碼為預設</button>` : ''}
        </div>
      `;
    }

    const modal = document.getElementById('modal-member-detail');
    if (modal) modal.classList.add('active');
  },

  // 管理員專屬：重設弟兄/幹部密碼為預設 (僅限 13055)
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
      this.showToast(result ? result.message : '重設失敗，請稍後再試', 'error');
    }
  },

  // =========================================================================
  // 系統設定彈窗 (Settings Modal)


  // =========================================================================
  // 通用輔助工具 (Helpers)
  // =========================================================================

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
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

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : '🎖️'}</span>
      <span>${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
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
