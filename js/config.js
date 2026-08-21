/**
 * 272梯 陸軍步兵第153旅 步1營第3連 (153R 1B3C) 紀念冊系統
 * 系統組態設定檔 config.js
 */

const CONFIG = {
  // 系統基本資訊
  UNIT_TITLE: '272T 陸軍153旅 1B3C (宜蘭金六結)',
  UNIT_SUBTITLE: '步兵第一營第三連 結訓紀念冊',
  ADMIN_CONTACT_ID: '13055', // 忘記密碼聯繫窗口
  
  // Google Apps Script (GAS) 部署 Web App URL
  DEFAULT_GAS_API_URL: 'https://script.google.com/macros/s/AKfycbws9Zi0PCME8g99PIKENYUMEzGCENTFXU1T3FPk1GEUzcsAK-aUZtHDL8x9bvpISYv3cw/exec',

  // LocalStorage 鍵名
  STORAGE_KEYS: {
    GAS_URL: '153r1b3c_gas_api_url',
    AUTH_USER: '153r1b3c_auth_user',
    MEMBERS_CACHE: '153r1b3c_members_data',
    LEGENDS_CACHE: '153r1b3c_legends_data',
    DIARIES_CACHE: '153r1b3c_diaries_data',
    CADRES_CACHE: '153r1b3c_cadres_data',
  },

  // 取得目前有效的 GAS API 網址
  getGasApiUrl() {
    return localStorage.getItem(this.STORAGE_KEYS.GAS_URL) || this.DEFAULT_GAS_API_URL || '';
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
      return JSON.parse(userJson);
    } catch (e) {
      return null;
    }
  },

  // 儲存登入使用者
  setCurrentUser(userData) {
    if (userData) {
      localStorage.setItem(this.STORAGE_KEYS.AUTH_USER, JSON.stringify(userData));
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
