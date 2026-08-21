/**
 * 272梯 陸軍步兵第153旅 步1營第3連 (153R 1B3C) 紀念冊系統
 * Google Apps Script 後端程式碼 Code.gs
 * 
 * 部署指引：
 * 1. 在 Google Drive 建立名為「153R1B3C_Database」的試算表
 * 2. 點選「擴充功能」->「Apps Script」，將本檔案內容全部貼入
 * 3. 初次執行時可先執行「setupDatabase」函式自動初始化 4 張工作表與預設資料
 * 4. 點選右上角「部署」->「新增部署作業」-> 選擇「網頁應用程式 (Web App)」
 * 5. 設定：執行身分為「我 (您的帳號)」，誰可以存取為「所有人 (Anyone)」
 * 6. 將複製到的 Web App 網址貼入前端設定中即可！
 */

// 設定 Google Drive 主資料夾 ID 與相片資料夾名稱
const PARENT_FOLDER_ID = '18i6AGAwU9ntTZwQEP6dfCTMOlBJivObv'; // 272T153R1B3C 雲端資料夾 ID
const FOLDER_MAIN_NAME = '272T153R1B3C';
const FOLDER_AVATAR_NAME = 'Avatars';

/**
 * 處理 POST 請求 (API 核心入口)
 */
function doPost(e) {
  try {
    let requestData = {};
    if (e && e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    }

    const action = requestData.action || '';
    let result = { success: false, message: '未指定動作' };

    switch (action) {
      case 'login':
        result = handleLogin(requestData);
        break;
      case 'getAllData':
        result = handleGetAllData();
        break;
      case 'updateProfile':
        result = handleUpdateProfile(requestData);
        break;
      case 'getLegends':
        result = handleGetLegends();
        break;
      case 'addLegend':
        result = handleAddLegend(requestData);
        break;
      case 'getDiaries':
        result = handleGetDiaries();
        break;
      case 'addDiary':
        result = handleAddDiary(requestData);
        break;
      case 'resetPassword':
        result = handleResetPassword(requestData);
        break;
      default:
        result = { success: false, message: '未知的 Action: ' + action };
        break;
    }

    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: '伺服器端發生錯誤: ' + err.toString()
    });
  }
}

/**
 * 處理 GET 請求 (健康檢查與狀態查詢)
 */
function doGet(e) {
  return createJsonResponse({
    status: 'online',
    system: '272T 153R 1B3C Memorial Yearbook API',
    timestamp: new Date().toISOString()
  });
}

/**
 * 產生 JSON 格式輸出回應 (含 CORS 支援)
 */
function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * 智慧取得或建立試算表資料庫 (完美相容容器綁定與獨立 Apps Script 專案)
 */
function getDatabaseSpreadsheet() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    return ss;
  }

  // 獨立 Apps Script 模式：自動從 Google Drive 資料夾搜尋或自動建立
  try {
    const folder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    const files = folder.getFilesByName('153R1B3C_Database');
    if (files.hasNext()) {
      const file = files.next();
      return SpreadsheetApp.openById(file.getId());
    } else {
      const newSs = SpreadsheetApp.create('153R1B3C_Database');
      const newFile = DriveApp.getFileById(newSs.getId());
      newFile.moveTo(folder);
      // 自動初始化結構
      setupDatabase(newSs);
      return newSs;
    }
  } catch (e) {
    Logger.log('取得試算表失敗: ' + e.toString());
    return null;
  }
}

// =========================================================================
// API 處理常式
// =========================================================================

/**
 * 1. 登入驗證 (支援弟兄學號 13001~13098 與 長官幹部 1B3C001~1B3C100)
 */
function handleLogin(data) {
  const { id, password } = data;
  if (!id || !password) {
    return { success: false, code: 'ERR-AUTH-EMPTY', message: '[ERR-AUTH-EMPTY] 請輸入帳號/學號與密碼' };
  }

  const ss = getDatabaseSpreadsheet();
  if (!ss) return { success: false, code: 'ERR-DB-CONNECT', message: '[ERR-DB-CONNECT] 無法連接試算表資料庫' };

  const cleanId = String(id).trim();
  const cleanPwd = String(password).trim();

  // 判斷是否為長官幹部帳號 (1B3C 開頭)
  const isCadreId = cleanId.toUpperCase().startsWith('1B3C');
  const targetSheetName = isCadreId ? 'Cadres' : 'Members';
  const sheet = ss.getSheetByName(targetSheetName);

  if (!sheet) {
    return { success: false, code: 'ERR-DB-NOTFOUND', message: `[ERR-DB-NOTFOUND] ${targetSheetName} 資料表不存在` };
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idColIdx = headers.indexOf('id');
  const pwdColIdx = headers.indexOf('password');

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (String(row[idColIdx]).toUpperCase() === cleanId.toUpperCase()) {
      const storedPwd = String(row[pwdColIdx] || row[idColIdx]);
      if (storedPwd === cleanPwd) {
        const userObj = rowToObject(headers, row);
        delete userObj.password; // 安全考量不回傳密碼
        userObj.is_cadre = isCadreId;
        // 首次登入檢查：若目前密碼與帳號/學號相同，代表尚未設定自訂密碼，強制要求修改
        userObj.needs_password_change = Boolean(storedPwd.toUpperCase() === cleanId.toUpperCase());
        return { success: true, user: userObj, message: '登入成功' };
      } else {
        return { success: false, code: 'ERR-AUTH-PWD', message: '[ERR-AUTH-PWD] 密碼錯誤！忘記密碼請聯繫 13055' };
      }
    }
  }

  return { success: false, code: 'ERR-AUTH-NOUSER', message: `[ERR-AUTH-NOUSER] 查無此帳號 (${cleanId})，請確認後重新輸入` };
}

/**
 * 2. 取得全站基礎資料 (包含所有成員、長官幹部、傳奇、日記)
 */
function handleGetAllData() {
  const ss = getDatabaseSpreadsheet();
  if (!ss) return { success: false, message: '無法連接試算表資料庫' };
  
  if (!ss.getSheetByName('Members')) {
    setupDatabase(ss);
  }

  // 自動清理試算表中重複發布的傳奇與日記
  cleanSheetDuplicates(ss.getSheetByName('Legends'), [1, 2, 3, 4]);
  cleanSheetDuplicates(ss.getSheetByName('Diaries'), [1, 2, 3]);

  const members = getSheetDataAsObjects(ss.getSheetByName('Members')).map(m => {
    delete m.password;
    return m;
  });

  const cadres = getSheetDataAsObjects(ss.getSheetByName('Cadres')).map(c => {
    delete c.password;
    c.is_cadre = true;
    return c;
  });

  const legends = getSheetDataAsObjects(ss.getSheetByName('Legends')).map(l => {
    if (l.created_at && String(l.created_at).includes('T')) {
      l.created_at = String(l.created_at).replace('T', ' ').substring(0, 16);
    }
    return l;
  });

  const diaries = getSheetDataAsObjects(ss.getSheetByName('Diaries')).map(d => {
    if (d.created_at && String(d.created_at).includes('T')) {
      d.created_at = String(d.created_at).replace('T', ' ').substring(0, 16);
    }
    return d;
  });

  // 依照發布時間倒序排列
  legends.sort((a, b) => (b.legend_id || 0) - (a.legend_id || 0));
  diaries.sort((a, b) => (b.diary_id || 0) - (a.diary_id || 0));

  return {
    success: true,
    data: {
      members,
      cadres,
      legends,
      diaries
    }
  };
}

/**
 * 3. 更新個人資料 (含雙照片上傳 Drive，支援弟兄與幹部)
 */
function handleUpdateProfile(data) {
  const { id, name, nickname, rank_level, duty, enlist_date, interests, dream, ig, line, bio, avatarMilitaryBase64, avatarCivilianBase64, newPassword } = data;
  if (!id) return { success: false, code: 'ERR-PROFILE-NOID', message: '[ERR-PROFILE-NOID] 缺少帳號 id' };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // 等待最多 15 秒鎖定，防範 100 人同時寫入碰撞

    const ss = getDatabaseSpreadsheet();
    if (!ss) return { success: false, code: 'ERR-DB-CONNECT', message: '[ERR-DB-CONNECT] 無法連接試算表資料庫' };

    const cleanId = String(id).trim();
    const isCadreId = cleanId.toUpperCase().startsWith('1B3C');
    const targetSheetName = isCadreId ? 'Cadres' : 'Members';
    const sheet = ss.getSheetByName(targetSheetName);

    if (!sheet) return { success: false, code: 'ERR-DB-NOTFOUND', message: `[ERR-DB-NOTFOUND] ${targetSheetName} 資料表不存在` };

    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const idColIdx = headers.indexOf('id');

    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][idColIdx]).toUpperCase() === cleanId.toUpperCase()) {
        rowIndex = i + 1; // 轉為 1-based 列號
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, code: 'ERR-PROFILE-NOUSER', message: `[ERR-PROFILE-NOUSER] 查無此帳號 (${cleanId})` };
    }

    // 軍裝照上傳 Drive
    let avatarMilUrl = null;
    if (avatarMilitaryBase64 && avatarMilitaryBase64.includes('base64,')) {
      try {
        avatarMilUrl = saveAvatarToDrive(`${cleanId}_mil`, avatarMilitaryBase64);
      } catch (e) {
        Logger.log('軍裝照上傳失敗: ' + e.toString());
      }
    }

    // 私人便服照上傳 Drive
    let avatarCivUrl = null;
    if (avatarCivilianBase64 && avatarCivilianBase64.includes('base64,')) {
      try {
        avatarCivUrl = saveAvatarToDrive(`${cleanId}_civ`, avatarCivilianBase64);
      } catch (e) {
        Logger.log('私人便服照上傳失敗: ' + e.toString());
      }
    }

    const nowStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm');

    // 依欄位名稱寫入對應儲存格
    function updateCell(colName, val) {
      if (val !== undefined && val !== null && val !== '') {
        const colIdx = headers.indexOf(colName);
        if (colIdx !== -1) {
          sheet.getRange(rowIndex, colIdx + 1).setValue(val);
        }
      }
    }

    if (name !== undefined) updateCell('name', name);
    if (nickname !== undefined) updateCell('nickname', nickname);
    if (rank_level !== undefined) updateCell('rank_level', rank_level);
    if (duty !== undefined) updateCell('duty', duty);
    if (enlist_date !== undefined) updateCell('enlist_date', enlist_date);
    if (interests !== undefined) updateCell('interests', interests);
    if (dream !== undefined) updateCell('dream', dream);
    if (ig !== undefined) updateCell('ig', ig);
    if (line !== undefined) updateCell('line', line);
    if (bio !== undefined) updateCell('bio', bio);
    if (newPassword) updateCell('password', String(newPassword).trim()); // 更新登入密碼
    if (avatarMilUrl) {
      updateCell('avatar_military', avatarMilUrl);
      updateCell('avatar_url', avatarMilUrl);
    }
    if (avatarCivUrl) {
      updateCell('avatar_civilian', avatarCivUrl);
    }
    updateCell('updated_at', nowStr);

    // 取得更新後的完整物件
    const updatedRow = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    const userObj = rowToObject(headers, updatedRow);
    delete userObj.password;
    userObj.is_cadre = isCadreId;

    return { success: true, user: userObj, message: '個人資料、照片與設定更新成功！' };
  } catch (err) {
    return { success: false, code: 'ERR-PROFILE-LOCK', message: '[ERR-PROFILE-LOCK] 伺服器並發繁忙: ' + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 4. 傳奇版操作 (含後端並發鎖與防重複提交機制)
 */
function handleGetLegends() {
  const ss = getDatabaseSpreadsheet();
  if (!ss) return { success: false, message: '無法連接試算表資料庫' };

  const sheet = ss.getSheetByName('Legends');
  cleanSheetDuplicates(sheet, [1, 2, 3, 4]);

  const legends = sheet ? getSheetDataAsObjects(sheet) : [];
  legends.sort((a, b) => (b.legend_id || 0) - (a.legend_id || 0));
  return { success: true, data: legends };
}

function handleAddLegend(data) {
  const { target_id, author_id, title, content } = data;
  if (!target_id || !title || !content) {
    return { success: false, message: '請填寫完整傳奇資訊' };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // 並發防碰撞

    const ss = getDatabaseSpreadsheet();
    if (!ss) return { success: false, message: '無法連接試算表資料庫' };

    const sheet = ss.getSheetByName('Legends');
    if (!sheet) return { success: false, message: 'Legends 資料表不存在' };

    const values = sheet.getDataRange().getValues();
    const cleanTarget = String(target_id).trim();
    const cleanAuthor = String(author_id || '').trim();
    const cleanTitle = String(title).trim();
    const cleanContent = String(content).trim();

    // 防重複提交檢查：若最近 15 筆內已存在完全相同的爆料，直接返回該記錄避免連點產生重複
    for (let i = values.length - 1; i >= Math.max(1, values.length - 15); i--) {
      const r = values[i];
      if (String(r[1]).trim() === cleanTarget &&
          String(r[2]).trim() === cleanAuthor &&
          String(r[3]).trim() === cleanTitle &&
          String(r[4]).trim() === cleanContent) {
        return {
          success: true,
          data: {
            legend_id: r[0],
            target_id: cleanTarget,
            author_id: cleanAuthor,
            title: cleanTitle,
            content: cleanContent,
            created_at: String(r[5] || '').replace('T', ' ').substring(0, 16)
          },
          message: '傳奇事蹟發布成功！'
        };
      }
    }

    const legendId = values.length; // 自動累加編號
    const nowStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm');

    sheet.appendRow([legendId, cleanTarget, cleanAuthor, cleanTitle, cleanContent, nowStr]);

    return {
      success: true,
      data: {
        legend_id: legendId,
        target_id: cleanTarget,
        author_id: cleanAuthor,
        title: cleanTitle,
        content: cleanContent,
        created_at: nowStr
      },
      message: '傳奇事蹟發布成功！'
    };
  } catch (err) {
    return { success: false, message: '伺服器繁忙，請稍後重試: ' + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 5. 大兵日記操作 (含後端並發鎖與防重複提交機制)
 */
function handleGetDiaries() {
  const ss = getDatabaseSpreadsheet();
  if (!ss) return { success: false, message: '無法連接試算表資料庫' };

  const sheet = ss.getSheetByName('Diaries');
  cleanSheetDuplicates(sheet, [1, 2, 3]);

  const diaries = sheet ? getSheetDataAsObjects(sheet) : [];
  diaries.sort((a, b) => (b.diary_id || 0) - (a.diary_id || 0));
  return { success: true, data: diaries };
}

function handleAddDiary(data) {
  const { author_id, title, content } = data;
  if (!author_id || !title || !content) {
    return { success: false, message: '請填寫完整日記資訊' };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // 並發防碰撞

    const ss = getDatabaseSpreadsheet();
    if (!ss) return { success: false, message: '無法連接試算表資料庫' };

    const sheet = ss.getSheetByName('Diaries');
    if (!sheet) return { success: false, message: 'Diaries 資料表不存在' };

    const values = sheet.getDataRange().getValues();
    const cleanAuthor = String(author_id).trim();
    const cleanTitle = String(title).trim();
    const cleanContent = String(content).trim();

    // 防重複提交檢查
    for (let i = values.length - 1; i >= Math.max(1, values.length - 15); i--) {
      const r = values[i];
      if (String(r[1]).trim() === cleanAuthor &&
          String(r[2]).trim() === cleanTitle &&
          String(r[3]).trim() === cleanContent) {
        return {
          success: true,
          data: {
            diary_id: r[0],
            author_id: cleanAuthor,
            title: cleanTitle,
            content: cleanContent,
            created_at: String(r[4] || '').replace('T', ' ').substring(0, 16)
          },
          message: '大兵日記發布成功！'
        };
      }
    }

    const diaryId = values.length; // 自動累加編號
    const nowStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm');

    sheet.appendRow([diaryId, cleanAuthor, cleanTitle, cleanContent, nowStr]);

    return {
      success: true,
      data: {
        diary_id: diaryId,
        author_id: cleanAuthor,
        title: cleanTitle,
        content: cleanContent,
        created_at: nowStr
      },
      message: '大兵日記發布成功！'
    };
  } catch (err) {
    return { success: false, message: '伺服器繁忙，請稍後重試: ' + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 6. 管理員重設密碼為預設 (僅限 13055)
 */
function handleResetPassword(data) {
  const { admin_id, target_id } = data;
  if (String(admin_id) !== '13055') {
    return { success: false, message: '權限不足！只有 13055 管理員可重設弟兄與幹部密碼。' };
  }
  if (!target_id) {
    return { success: false, message: '缺少目標帳號 target_id' };
  }

  const ss = getDatabaseSpreadsheet();
  if (!ss) return { success: false, message: '無法連接試算表資料庫' };

  const cleanTarget = String(target_id).trim();
  const isCadre = cleanTarget.toUpperCase().startsWith('1B3C');
  const targetSheetName = isCadre ? 'Cadres' : 'Members';
  const sheet = ss.getSheetByName(targetSheetName);

  if (!sheet) return { success: false, message: `${targetSheetName} 資料表不存在` };

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idColIdx = headers.indexOf('id');
  const pwdColIdx = headers.indexOf('password');

  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idColIdx]).toUpperCase() === cleanTarget.toUpperCase()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, message: `查無帳號 ${cleanTarget} 的資料` };
  }

  // 將密碼重設為預設帳號
  sheet.getRange(rowIndex, pwdColIdx + 1).setValue(cleanTarget);

  return {
    success: true,
    message: `已成功將帳號 ${cleanTarget} 的密碼恢復為預設！`
  };
}

// =========================================================================
// Google Drive 圖片上傳輔助函式
// =========================================================================

/**
 * 儲存 Base64 大頭貼至 Google Drive Avatars 資料夾並設為公開
 */
function saveAvatarToDrive(memberId, base64Data) {
  const splitData = base64Data.split('base64,');
  const contentType = splitData[0].split(':')[1].split(';')[0];
  const decodedData = Utilities.base64Decode(splitData[1]);
  const blob = Utilities.newBlob(decodedData, contentType, `avatar_${memberId}_${new Date().getTime()}.jpg`);

  // 搜尋或建立 Avatars 資料夾 (優先於指定之 272T153R1B3C 資料夾中建立)
  let avatarFolder;
  try {
    if (PARENT_FOLDER_ID) {
      const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
      const subFolders = parentFolder.getFoldersByName(FOLDER_AVATAR_NAME);
      if (subFolders.hasNext()) {
        avatarFolder = subFolders.next();
      } else {
        avatarFolder = parentFolder.createFolder(FOLDER_AVATAR_NAME);
      }
    }
  } catch (e) {
    Logger.log('無法透過 PARENT_FOLDER_ID 取得父資料夾，改用全域搜尋: ' + e.toString());
  }

  if (!avatarFolder) {
    const folders = DriveApp.getFoldersByName(FOLDER_AVATAR_NAME);
    if (folders.hasNext()) {
      avatarFolder = folders.next();
    } else {
      avatarFolder = DriveApp.createFolder(FOLDER_AVATAR_NAME);
    }
  }

  // 設定資料夾為任何知道連結的人皆可檢視
  try {
    avatarFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}

  const file = avatarFolder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}

  // 回傳公開可檢視之 Google CDN 直連圖片網址 (無跨域與 Cookie 限制，完美顯示於網頁)
  return `https://lh3.googleusercontent.com/d/${file.getId()}`;
}

// =========================================================================
// 試算表資料讀取與去重輔助函式
// =========================================================================

/**
 * 自動清除指定工作表中的重複資料列（保留第一筆與標頭）
 */
function cleanSheetDuplicates(sheet, keyIndices) {
  if (!sheet) return;
  try {
    const values = sheet.getDataRange().getValues();
    if (values.length <= 2) return;

    const seen = new Set();
    const uniqueRows = [values[0]]; // 保留第 1 列標頭

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      // 依指定欄位組合出唯一指紋
      const key = keyIndices.map(idx => String(row[idx] || '').trim()).join('|||');
      if (key && !seen.has(key)) {
        seen.add(key);
        // 重新編號 ID (第 1 欄)
        row[0] = uniqueRows.length;
        uniqueRows.push(row);
      }
    }

    // 若有重複項目則進行覆蓋清理
    if (uniqueRows.length < values.length) {
      sheet.clear();
      sheet.getRange(1, 1, uniqueRows.length, uniqueRows[0].length).setValues(uniqueRows);
      formatHeaderRow(sheet);
      SpreadsheetApp.flush();
    }
  } catch (e) {
    Logger.log('去重清理略過: ' + e.toString());
  }
}

function getSheetDataAsObjects(sheet) {
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const result = [];
  for (let i = 1; i < values.length; i++) {
    result.push(rowToObject(headers, values[i]));
  }
  return result;
}

function rowToObject(headers, row) {
  const obj = {};
  for (let j = 0; j < headers.length; j++) {
    obj[headers[j]] = row[j];
  }
  return obj;
}

// =========================================================================
// 試算表一鍵初始化腳本 (Setup Database)
// =========================================================================

/**
 * 執行此函式可自動在試算表中建立 Members, Cadres, Legends, Diaries 四張工作表並填入預設資料
 */
function setupDatabase(targetSs) {
  const ss = targetSs || getDatabaseSpreadsheet();
  if (!ss) {
    Logger.log('❌ 找不到有效的試算表資料庫');
    return;
  }

  // 1. 初始化 Members 表 (清空預設姓名與自介，由弟兄登入後自行填寫)
  let memberSheet = ss.getSheetByName('Members');
  if (!memberSheet) memberSheet = ss.insertSheet('Members');
  memberSheet.clear();
  const memberHeaders = ['id', 'password', 'name', 'nickname', 'squad', 'room', 'duty', 'interests', 'dream', 'ig', 'line', 'bio', 'avatar_military', 'avatar_civilian', 'updated_at'];
  memberSheet.appendRow(memberHeaders);
  formatHeaderRow(memberSheet);

  let idNum = 13001;
  let roomIdx = 1;
  let inRoom = 0;
  const memberRows = [];

  for (let sq = 1; sq <= 9; sq++) {
    const count = (sq === 8) ? 10 : 11;
    for (let i = 0; i < count; i++) {
      const id = String(idNum);
      const room = roomIdx;
      inRoom++;
      if (roomIdx <= 10 && inRoom === 9) {
        roomIdx++;
        inRoom = 0;
      }

      // 全部空白，由弟兄登入後填寫與上傳雙照片 (含 interests 與 dream)
      memberRows.push([id, id, '', '', sq, room, (i === 0) ? '班頭' : '一般兵', '', '', '', '', '', '', '', '']);
      idNum++;
    }
  }
  if (memberRows.length > 0) {
    memberSheet.getRange(2, 1, memberRows.length, memberHeaders.length).setValues(memberRows);
  }

  // 2. 初始化 Cadres 表 (產生 100 位幹部/班長空白帳號 1B3C001 ~ 1B3C100)
  let cadreSheet = ss.getSheetByName('Cadres');
  if (!cadreSheet) cadreSheet = ss.insertSheet('Cadres');
  cadreSheet.clear();
  const cadreHeaders = ['id', 'password', 'name', 'nickname', 'rank_level', 'duty', 'enlist_date', 'interests', 'dream', 'ig', 'line', 'bio', 'avatar_military', 'avatar_civilian', 'updated_at'];
  cadreSheet.appendRow(cadreHeaders);
  formatHeaderRow(cadreSheet);

  const cadreRows = [];
  for (let c = 1; c <= 100; c++) {
    const cid = `1B3C${String(c).padStart(3, '0')}`;
    cadreRows.push([cid, cid, '', '', '', '', '', '', '', '', '', '', '', '', '']);
  }
  if (cadreRows.length > 0) {
    cadreSheet.getRange(2, 1, cadreRows.length, cadreHeaders.length).setValues(cadreRows);
  }

  // 3. 初始化 Legends 表 (清空預設資料)
  let legendSheet = ss.getSheetByName('Legends');
  if (!legendSheet) legendSheet = ss.insertSheet('Legends');
  legendSheet.clear();
  const legendHeaders = ['legend_id', 'target_id', 'author_id', 'title', 'content', 'created_at'];
  legendSheet.appendRow(legendHeaders);
  formatHeaderRow(legendSheet);

  // 4. 初始化 Diaries 表 (清空預設資料)
  let diarySheet = ss.getSheetByName('Diaries');
  if (!diarySheet) diarySheet = ss.insertSheet('Diaries');
  diarySheet.clear();
  const diaryHeaders = ['diary_id', 'author_id', 'title', 'content', 'created_at'];
  diarySheet.appendRow(diaryHeaders);
  formatHeaderRow(diarySheet);

  SpreadsheetApp.flush();
  Logger.log('✅ 資料庫已成功初始化完成！');
}

function formatHeaderRow(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setBackground('#1e3323').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
}
