/**
 * 272梯 陸軍步兵第153旅 步兵第一營第三連 (153R 1B3C) 紀念冊系統
 * 系統組態設定檔 config.js
 */

const CONFIG = {
  // 系統基本資訊
  UNIT_TITLE: '272梯 陸軍153旅 1B3C (宜蘭金六結)',
  UNIT_SUBTITLE: '步兵第一營第三連 結訓紀念冊',
  ADMIN_CONTACT_ID: '13055', // 忘記密碼聯繫窗口
  
  // Google Apps Script (GAS) 部署 Web App URL
  DEFAULT_GAS_API_URL: 'https://script.google.com/macros/s/AKfycbzyykbxjA4xYxCAo2XWy3BRdMN-dwiiOzSRCmq6X5KXBdXD0kf2J7x0xCRVIvBePm4seQ/exec',

  // 各班建制公差與任務對照表 (一班打飯、二班兵工、三班器材、四班資收、五班內掃、六班洗衣、七班外掃、八班公差、九班公差)
  SQUAD_DUTIES: {
    1: '打飯班',
    2: '兵工班',
    3: '器材班',
    4: '資收班',
    5: '內掃班',
    6: '洗衣班',
    7: '外掃班',
    8: '公差班',
    9: '公差班'
  },

  SQUAD_DUTY_ICONS: {
    1: '🍚',
    2: '🛠️',
    3: '🏋️',
    4: '♻️',
    5: '🧹',
    6: '👕',
    7: '🌿',
    8: '⚡',
    9: '⚡'
  },

  // LocalStorage 鍵名
  STORAGE_KEYS: {
    GAS_URL: '153r1b3c_gas_api_url',
    AUTH_USER: '153r1b3c_auth_user',
    MEMBERS_CACHE: '153r1b3c_members_data',
    LEGENDS_CACHE: '153r1b3c_legends_data',
    DIARIES_CACHE: '153r1b3c_diaries_data',
    CADRES_CACHE: '153r1b3c_cadres_data',
    LEGEND_LIKES: '153r1b3c_legend_likes',
    DIARY_LIKES: '153r1b3c_diary_likes',
    TIMELINE_CACHE: '153r1b3c_timeline_data',
    REPORTS_CACHE: '153r1b3c_reports_data'
  },

  // 取得目前有效的 GAS API 網址
  getGasApiUrl() {
    const saved = localStorage.getItem(this.STORAGE_KEYS.GAS_URL);
    if (saved && !saved.includes('AKfycbzyykbxjA4xYxCAo2XWy3BRdMN-dwiiOzSRCmq6X5KXBdXD0kf2J7x0xCRVIvBePm4seQ')) {
      localStorage.setItem(this.STORAGE_KEYS.GAS_URL, this.DEFAULT_GAS_API_URL);
      return this.DEFAULT_GAS_API_URL;
    }
    return saved || this.DEFAULT_GAS_API_URL || '';
  },

  // 設定 GAS API 網址
  setGasApiUrl(url) {
    if (url) {
      localStorage.setItem(this.STORAGE_KEYS.GAS_URL, url.trim());
    } else {
      localStorage.removeItem(this.STORAGE_KEYS.GAS_URL);
    }
  },

  // 取得目前登入使用者
  getCurrentUser() {
    const userJson = localStorage.getItem(this.STORAGE_KEYS.AUTH_USER);
    if (!userJson) return null;
    try {
      const user = JSON.parse(userJson);
      if (user && user.id != null) {
        user.id = String(user.id).trim();
      }
      return user;
    } catch (e) {
      return null;
    }
  },

  // 儲存登入使用者
  setCurrentUser(userData) {
    if (userData) {
      const safeData = {
        ...userData,
        id: String(userData.id != null ? userData.id : '').trim()
      };
      localStorage.setItem(this.STORAGE_KEYS.AUTH_USER, JSON.stringify(safeData));
    } else {
      localStorage.removeItem(this.STORAGE_KEYS.AUTH_USER);
    }
  },

  // 清除登入狀態
  clearCurrentUser() {
    localStorage.removeItem(this.STORAGE_KEYS.AUTH_USER);
  }
};

window.CONFIG = CONFIG;
