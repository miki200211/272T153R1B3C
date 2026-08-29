/**
 * 272梯 陸軍步兵第153旅 步兵第一營第三連 (153R 1B3C) 紀念冊系統
 * Google Apps Script API 通訊模組 api.js
 */

const API = {
  // 初始化本機快取資料庫（當尚未連接 GAS 或離線時使用）
  initLocalStore(forceReset = false) {
    const versionKey = '153r1b3c_data_v7_99_members';
    const isVersionMatch = localStorage.getItem(versionKey) === 'true';

    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.MEMBERS_CACHE) || forceReset || !isVersionMatch) {
      const initialMembers = MOCK_DATA.getInitialMembers();
      localStorage.setItem(CONFIG.STORAGE_KEYS.MEMBERS_CACHE, JSON.stringify(initialMembers));
      localStorage.setItem(versionKey, 'true');
    }
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.CADRES_CACHE) || forceReset || !isVersionMatch) {
      const initialCadres = MOCK_DATA.getInitialCadres();
      localStorage.setItem(CONFIG.STORAGE_KEYS.CADRES_CACHE, JSON.stringify(initialCadres));
    }
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.LEGENDS_CACHE) || forceReset || !isVersionMatch) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.LEGENDS_CACHE, JSON.stringify(MOCK_DATA.legends || []));
    }
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.DIARIES_CACHE) || forceReset || !isVersionMatch) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.DIARIES_CACHE, JSON.stringify(MOCK_DATA.diaries || []));
    }
  },

  // 發送請求到 GAS Web App (含 25 秒超時控制與標準化錯誤代碼回傳)
  async sendGasRequest(action, payload = {}) {
    const apiUrl = CONFIG.getGasApiUrl();
    if (!apiUrl) {
      // 未設定 GAS 網址，走本機 LocalStorage 模擬模式
      return this.handleLocalAction(action, payload);
    }

    const requestData = { action, ...payload };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      // 使用 text/plain 發送 POST 以避免 GAS Web App 的 CORS preflight OPTIONS 攔截
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          code: `ERR-HTTP-${response.status}`,
          message: `[ERR-HTTP-${response.status}] 雲端伺服器回應異常 (HTTP ${response.status})`
        };
      }

      const result = await response.json();
      if (result && result.message) {
        result.message = this.sanitizeText(result.message);
      }
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(`[API-ERR] GAS 請求失敗 (${action}):`, error);

      if (error.name === 'AbortError') {
        return {
          success: false,
          code: 'ERR-NET-TIMEOUT',
          message: '[ERR-NET-TIMEOUT] 雲端伺服器請求超時 (逾 25 秒)，請確認網路連線'
        };
      }

      // 嘗試本機降級並附帶警告資訊
      const fallbackResult = this.handleLocalAction(action, payload);
      if (fallbackResult && fallbackResult.success) {
        return {
          ...fallbackResult,
          code: 'WARN-LOCAL-FALLBACK',
          message: `${this.sanitizeText(fallbackResult.message || '操作成功')} (已先暫存於本機瀏覽器)`
        };
      }

      const rawErrMsg = error && error.message ? error.message : String(error);
      const errMessage = this.sanitizeText(rawErrMsg);
      return {
        success: false,
        code: 'ERR-NET-FAIL',
        message: `[ERR-NET-FAIL] 網路連線或跨域請求異常 (${errMessage})`
      };
    }
  },

  sanitizeText(str) {
    if (!str) return '';
    return String(str)
      .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '')
      .replace(/nkust\.edu\.tw/gi, '')
      .replace(/c110170106/gi, '')
      .trim();
  },

  // 本機 LocalStorage 模擬邏輯 (離線與 Demo 支援)
  handleLocalAction(action, payload) {
    this.initLocalStore();

    switch (action) {
      case 'login': {
        const { id, password } = payload;
        const cleanId = String(id).trim();
        const cleanPwd = String(password).trim();
        const isCadre = cleanId.toUpperCase().startsWith('1B3C');

        if (isCadre) {
          const cadres = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CADRES_CACHE) || '[]');
          const user = cadres.find(c => String(c.id).toUpperCase() === cleanId.toUpperCase());
          if (!user) {
            return { success: false, message: `查無此幹部帳號 (${cleanId})，請確認後重新輸入` };
          }
          if (String(user.password || user.id) !== cleanPwd) {
            return { success: false, message: '密碼錯誤！預設密碼為幹部帳號，忘記請聯繫 13055' };
          }
          const safeUser = { ...user, is_cadre: true, needs_password_change: Boolean(cleanPwd === cleanId) };
          delete safeUser.password;
          return { success: true, user: safeUser, message: '登入成功' };
        } else {
          const members = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.MEMBERS_CACHE) || '[]');
          const user = members.find(m => String(m.id) === cleanId);
          if (!user) {
            return { success: false, message: '查無此學號，請確認後重新輸入' };
          }
          if (String(user.password || user.id) !== cleanPwd) {
            return { success: false, message: '密碼錯誤！預設密碼為學號，忘記請聯繫 13055' };
          }
          const safeUser = { ...user, is_cadre: false, needs_password_change: Boolean(cleanPwd === cleanId) };
          delete safeUser.password;
          return { success: true, user: safeUser, message: '登入成功' };
        }
      }

      case 'getAllData': {
        const userId = (payload && payload.user_id) ? String(payload.user_id).trim() : (CONFIG.getCurrentUser() ? String(CONFIG.getCurrentUser().id) : '');
        const allReports = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.REPORTS_CACHE) || '[]');
        const visibleReports = (userId === '13055') 
          ? allReports 
          : (userId ? allReports.filter(r => String(r.author_id).trim() === userId) : []);

        return {
          success: true,
          data: {
            members: members.map(m => {
              const copy = { ...m };
              delete copy.password;
              return copy;
            }),
            cadres: cadres.map(c => {
              const copy = { ...c, is_cadre: true };
              delete copy.password;
              return copy;
            }),
            legends,
            diaries,
            reports: visibleReports
          }
        };
      }

      case 'updateProfile': {
        const { id, name, nickname, rank_level, duty, enlist_date, interests, dream, ig, line, bio, self_intro, graduation_quote, avatarMilitaryBase64, avatarCivilianBase64, newPassword } = payload;
        const cleanId = String(id).trim();
        const isCadre = cleanId.toUpperCase().startsWith('1B3C');

        const finalBio = (bio !== undefined) ? bio : graduation_quote;

        if (isCadre) {
          const cadres = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CADRES_CACHE) || '[]');
          const index = cadres.findIndex(c => String(c.id).toUpperCase() === cleanId.toUpperCase());
          if (index === -1) {
            return { success: false, message: `找不到該幹部資料 (${cleanId})` };
          }

          if (name !== undefined) cadres[index].name = name;
          if (nickname !== undefined) cadres[index].nickname = nickname;
          if (rank_level !== undefined) cadres[index].rank_level = rank_level;
          if (duty !== undefined) cadres[index].duty = duty;
          if (enlist_date !== undefined) cadres[index].enlist_date = enlist_date;
          if (interests !== undefined) cadres[index].interests = interests;
          if (dream !== undefined) cadres[index].dream = dream;
          if (ig !== undefined) cadres[index].ig = ig;
          if (line !== undefined) cadres[index].line = line;
          if (finalBio !== undefined) cadres[index].bio = finalBio;
          if (self_intro !== undefined) cadres[index].self_intro = self_intro;
          if (newPassword) cadres[index].password = String(newPassword).trim();
          
          if (avatarMilitaryBase64) {
            cadres[index].avatar_military = avatarMilitaryBase64;
          }
          if (avatarCivilianBase64) {
            cadres[index].avatar_civilian = avatarCivilianBase64;
          }
          cadres[index].updated_at = new Date().toISOString().replace('T', ' ').substring(0, 16);

          localStorage.setItem(CONFIG.STORAGE_KEYS.CADRES_CACHE, JSON.stringify(cadres));

          const updatedCadre = { ...cadres[index], is_cadre: true };
          delete updatedCadre.password;
          return { success: true, user: updatedCadre, message: '幹部個人資料與照片更新成功！' };
        } else {
          const members = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.MEMBERS_CACHE) || '[]');
          const index = members.findIndex(m => String(m.id) === cleanId);

          if (index === -1) {
            return { success: false, message: '找不到該成員資料' };
          }

          if (name !== undefined) members[index].name = name;
          if (nickname !== undefined) members[index].nickname = nickname;
          if (duty !== undefined) members[index].duty = duty;
          if (interests !== undefined) members[index].interests = interests;
          if (dream !== undefined) members[index].dream = dream;
          if (ig !== undefined) members[index].ig = ig;
          if (line !== undefined) members[index].line = line;
          if (finalBio !== undefined) members[index].bio = finalBio;
          if (self_intro !== undefined) members[index].self_intro = self_intro;
          if (newPassword) members[index].password = String(newPassword).trim();
          
          if (avatarMilitaryBase64) {
            members[index].avatar_military = avatarMilitaryBase64;
            members[index].avatar_url = avatarMilitaryBase64;
          }
          if (avatarCivilianBase64) {
            members[index].avatar_civilian = avatarCivilianBase64;
          }

          members[index].updated_at = new Date().toISOString().replace('T', ' ').substring(0, 16);

          localStorage.setItem(CONFIG.STORAGE_KEYS.MEMBERS_CACHE, JSON.stringify(members));

          const updatedUser = { ...members[index], is_cadre: false };
          delete updatedUser.password;
          return { success: true, user: updatedUser, message: '個人資料與照片更新成功！' };
        }
      }

      case 'getLegends': {
        const legends = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.LEGENDS_CACHE) || '[]');
        return { success: true, data: legends };
      }

      case 'addLegend': {
        const { target_id, author_id, title, content } = payload;
        const legends = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.LEGENDS_CACHE) || '[]');
        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const newLegend = {
          legend_id: legends.length > 0 ? Math.max(...legends.map(l => Number(l.legend_id) || 0)) + 1 : 1,
          target_id: String(target_id),
          author_id: String(author_id),
          title: title.trim(),
          content: content.trim(),
          created_at: formattedDate
        };

        legends.unshift(newLegend);
        localStorage.setItem(CONFIG.STORAGE_KEYS.LEGENDS_CACHE, JSON.stringify(legends));
        return { success: true, data: newLegend, message: '傳奇事蹟發布成功！' };
      }

      case 'getDiaries': {
        const diaries = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.DIARIES_CACHE) || '[]');
        return { success: true, data: diaries };
      }

      case 'addDiary': {
        const { author_id, title, content } = payload;
        const diaries = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.DIARIES_CACHE) || '[]');
        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const newDiary = {
          diary_id: diaries.length > 0 ? Math.max(...diaries.map(d => Number(d.diary_id) || 0)) + 1 : 1,
          author_id: String(author_id),
          title: title.trim(),
          content: content.trim(),
          created_at: formattedDate
        };

        diaries.unshift(newDiary);
        localStorage.setItem(CONFIG.STORAGE_KEYS.DIARIES_CACHE, JSON.stringify(diaries));
        return { success: true, data: newDiary, message: '大兵日記發布成功！' };
      }

      case 'likeLegend': {
        const { id, userId } = payload;
        const likesMap = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.LEGEND_LIKES) || '{}');
        const key = String(id);
        if (!likesMap[key]) {
          likesMap[key] = { count: 0, userIds: [] };
        }
        const uid = String(userId || 'guest');
        const userIndex = likesMap[key].userIds.indexOf(uid);
        let isLiked = false;
        if (userIndex >= 0) {
          likesMap[key].userIds.splice(userIndex, 1);
          likesMap[key].count = Math.max(0, likesMap[key].count - 1);
          isLiked = false;
        } else {
          likesMap[key].userIds.push(uid);
          likesMap[key].count += 1;
          isLiked = true;
        }
        localStorage.setItem(CONFIG.STORAGE_KEYS.LEGEND_LIKES, JSON.stringify(likesMap));
        return { success: true, isLiked, count: likesMap[key].count, message: isLiked ? '點讚成功！' : '已收回點讚' };
      }

      case 'likeDiary': {
        const { id, userId } = payload;
        const likesMap = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.DIARY_LIKES) || '{}');
        const key = String(id);
        if (!likesMap[key]) {
          likesMap[key] = { count: 0, userIds: [] };
        }
        const uid = String(userId || 'guest');
        const userIndex = likesMap[key].userIds.indexOf(uid);
        let isLiked = false;
        if (userIndex >= 0) {
          likesMap[key].userIds.splice(userIndex, 1);
          likesMap[key].count = Math.max(0, likesMap[key].count - 1);
          isLiked = false;
        } else {
          likesMap[key].userIds.push(uid);
          likesMap[key].count += 1;
          isLiked = true;
        }
        localStorage.setItem(CONFIG.STORAGE_KEYS.DIARY_LIKES, JSON.stringify(likesMap));
        return { success: true, isLiked, count: likesMap[key].count, message: isLiked ? '點讚成功！' : '已收回點讚' };
      }

      case 'getTimeline': {
        const timeline = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TIMELINE_CACHE) || 'null') || MOCK_DATA.timeline || [];
        return { success: true, data: timeline };
      }

      case 'resetPassword': {
        const { admin_id, target_id } = payload;
        if (String(admin_id) !== '13055') {
          return { success: false, message: '權限不足！只有 13055 管理員可重設密碼。' };
        }
        const cleanTarget = String(target_id).trim();
        const isCadre = cleanTarget.toUpperCase().startsWith('1B3C');

        if (isCadre) {
          const cadres = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CADRES_CACHE) || '[]');
          const index = cadres.findIndex(c => String(c.id).toUpperCase() === cleanTarget.toUpperCase());
          if (index === -1) {
            return { success: false, message: `查無帳號 ${cleanTarget} 的幹部資料` };
          }
          cadres[index].password = cleanTarget;
          localStorage.setItem(CONFIG.STORAGE_KEYS.CADRES_CACHE, JSON.stringify(cadres));
          return { success: true, message: `已成功將幹部帳號 ${cleanTarget} 的密碼恢復為預設！` };
        } else {
          const members = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.MEMBERS_CACHE) || '[]');
          const index = members.findIndex(m => String(m.id) === cleanTarget);
          if (index === -1) {
            return { success: false, message: `查無學號 ${cleanTarget} 的弟兄資料` };
          }
          members[index].password = cleanTarget;
          localStorage.setItem(CONFIG.STORAGE_KEYS.MEMBERS_CACHE, JSON.stringify(members));
          return { success: true, message: `已成功將學號 ${cleanTarget} 的密碼恢復為預設學號！` };
        }
      }

      case 'getReports': {
        const userId = (payload && payload.user_id) ? String(payload.user_id).trim() : (CONFIG.getCurrentUser() ? String(CONFIG.getCurrentUser().id) : '');
        const reports = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.REPORTS_CACHE) || '[]');
        reports.sort((a, b) => (b.report_id || 0) - (a.report_id || 0));
        const visibleReports = (userId === '13055') 
          ? reports 
          : (userId ? reports.filter(r => String(r.author_id).trim() === userId) : []);
        return { success: true, data: visibleReports };
      }

      case 'submitReport': {
        const { type, author_id, author_name, title, content } = payload;
        const reports = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.REPORTS_CACHE) || '[]');
        const now = new Date();
        const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const newReport = {
          report_id: reports.length + 1,
          type: type || 'feedback',
          author_id: author_id || '',
          author_name: author_name || '',
          title: title || '',
          content: content || '',
          status: 'pending',
          admin_reply: '',
          created_at: nowStr,
          updated_at: nowStr
        };
        reports.unshift(newReport);
        localStorage.setItem(CONFIG.STORAGE_KEYS.REPORTS_CACHE, JSON.stringify(reports));
        return { success: true, data: newReport, message: '問題回報/密碼申請已成功送出！' };
      }

      case 'replyReport': {
        const { report_id, admin_reply, status } = payload;
        const reports = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.REPORTS_CACHE) || '[]');
        const target = reports.find(r => String(r.report_id) === String(report_id));
        if (!target) return { success: false, message: `查無此回報 #${report_id}` };
        const now = new Date();
        const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        target.admin_reply = admin_reply || '';
        target.status = status || 'resolved';
        target.updated_at = nowStr;
        localStorage.setItem(CONFIG.STORAGE_KEYS.REPORTS_CACHE, JSON.stringify(reports));
        return { success: true, data: target, message: `已成功回覆回報 #${report_id}！` };
      }

      case 'resetPasswordByReport': {
        const { report_id, target_id } = payload;
        const members = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.MEMBERS_CACHE) || '[]');
        const mIdx = members.findIndex(m => String(m.id) === String(target_id));
        if (mIdx !== -1) {
          members[mIdx].password = target_id;
          localStorage.setItem(CONFIG.STORAGE_KEYS.MEMBERS_CACHE, JSON.stringify(members));
        }
        const reports = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.REPORTS_CACHE) || '[]');
        const target = reports.find(r => String(r.report_id) === String(report_id));
        const now = new Date();
        const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        if (target) {
          target.admin_reply = `已於 ${nowStr} 由管理員重設密碼為預設學號 #${target_id}，請重新登入！`;
          target.status = 'resolved';
          target.updated_at = nowStr;
          localStorage.setItem(CONFIG.STORAGE_KEYS.REPORTS_CACHE, JSON.stringify(reports));
        }
        return { success: true, message: `已成功將學號 #${target_id} 密碼重設為預設！` };
      }

      default:
        return { success: false, message: `未知的操作類型: ${action}` };
    }
  },

  // 記憶體快取 (優化 100+ 人同時訪問時的連線效率，避免頻繁發送 API)
  _allDataCache: null,
  _allDataCacheTime: 0,
  _cacheTtlMs: 20000, // 20 秒記憶體快取

  // 封裝的高階 API 方法
  async login(id, password) {
    return this.sendGasRequest('login', { id, password });
  },

  async getAllData(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this._allDataCache && (now - this._allDataCacheTime < this._cacheTtlMs)) {
      return this._allDataCache;
    }
    const currentUser = CONFIG.getCurrentUser();
    const res = await this.sendGasRequest('getAllData', { user_id: currentUser ? currentUser.id : '' });
    if (res && res.success) {
      this._allDataCache = res;
      this._allDataCacheTime = Date.now();
    }
    return res;
  },

  // 寫入操作成功時主動使快取失效
  invalidateCache() {
    this._allDataCache = null;
    this._allDataCacheTime = 0;
  },

  async updateProfile(profileData) {
    this.invalidateCache();
    return this.sendGasRequest('updateProfile', profileData);
  },

  async resetPassword(targetId, adminId) {
    this.invalidateCache();
    return this.sendGasRequest('resetPassword', { target_id: targetId, admin_id: adminId });
  },

  async getLegends() {
    return this.sendGasRequest('getLegends');
  },

  async addLegend(legendData) {
    this.invalidateCache();
    return this.sendGasRequest('addLegend', legendData);
  },

  async getDiaries() {
    return this.sendGasRequest('getDiaries');
  },

  async addDiary(diaryData) {
    this.invalidateCache();
    return this.sendGasRequest('addDiary', diaryData);
  },

  async likeLegend(legendId, userId) {
    return this.sendGasRequest('likeLegend', { id: legendId, userId: userId });
  },

  async likeDiary(diaryId, userId) {
    return this.sendGasRequest('likeDiary', { id: diaryId, userId: userId });
  },

  async getTimeline() {
    return this.sendGasRequest('getTimeline');
  },

  async getReports() {
    const currentUser = CONFIG.getCurrentUser();
    return this.sendGasRequest('getReports', { user_id: currentUser ? currentUser.id : '' });
  },

  async submitReport(reportData) {
    this.invalidateCache();
    return this.sendGasRequest('submitReport', reportData);
  },

  async replyReport(replyData) {
    this.invalidateCache();
    return this.sendGasRequest('replyReport', replyData);
  },

  async resetPasswordByReport(resetData) {
    this.invalidateCache();
    return this.sendGasRequest('resetPasswordByReport', resetData);
  }
};

window.API = API;
