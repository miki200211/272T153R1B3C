/**
 * 272梯 陸軍步兵第153旅 步1營第3連 (153R 1B3C) 紀念冊系統
 * 預設展示資料庫 mockData.js (清空弟兄預設假資料，由弟兄登入後自行填寫)
 */

const MOCK_DATA = {
  // 產生 100 位長官與班長帳號 (前 14 位已依職等順序填妥，1B3C015~1B3C100 為空白卡位)
  getInitialCadres() {
    const defaultCadres = [
      { id: '1B3C001', name: '鄧兆凱', nickname: '兆凱士官長', rank_level: '士官長', duty: '三排 第七班 班長', bio: '三排榮譽，第七班精益求精！' },
      { id: '1B3C002', name: '潘品濬', nickname: '品濬班長', rank_level: '上士', duty: '一排 第一班 班長', bio: '精實第一班，紀律嚴明、同甘共苦！' },
      { id: '1B3C003', name: '陳臺紳', nickname: '臺紳班長', rank_level: '上士', duty: '二排 第四班 班長', bio: '二排先鋒，第四班頂天立地！' },
      { id: '1B3C004', name: '魏國書', nickname: '國書班長', rank_level: '上士', duty: '二排 第五班 班長', bio: '穩紮穩打，第五班勇往直前！' },
      { id: '1B3C005', name: '陳家倫', nickname: '家倫班長', rank_level: '上士', duty: '二排 第六班 班長', bio: '齊心協力，第六班無懈可擊！' },
      { id: '1B3C006', name: '程祖儀', nickname: '祖儀班長', rank_level: '上士', duty: '三排 第八班 班長', bio: '堅持到底，第八班追求卓越！' },
      { id: '1B3C007', name: '王韋傑', nickname: '韋傑班長', rank_level: '上士', duty: '三排 第九班 班長', bio: '全力衝刺，第九班榮耀同行！' },
      { id: '1B3C008', name: '劉映祥', nickname: '映祥副班長', rank_level: '中士', duty: '一排 第一班 副班長', bio: '第一班副班長，生活自律，互助合作！' },
      { id: '1B3C009', name: '陳明德', nickname: '明德班長', rank_level: '中士', duty: '一排 第二班 班長', bio: '第二班兄弟團結一致，爭取榮譽！' },
      { id: '1B3C010', name: '鄭仁河', nickname: '仁河班長', rank_level: '中士', duty: '一排 第三班 班長', bio: '積極進取，第三班全力以赴！' },
      { id: '1B3C011', name: '林晉丞', nickname: '晉丞副班長', rank_level: '中士', duty: '一排 第三班 副班長', bio: '第三班副班長，親愛精誠，圓滿結訓！' },
      { id: '1B3C012', name: '陳皓軒', nickname: '皓軒副班長', rank_level: '下士', duty: '二排 第四班 副班長', bio: '第四班副班長，團結合作，共創佳績！' },
      { id: '1B3C013', name: '顏仕庭', nickname: '仕庭副班長', rank_level: '下士', duty: '三排 第九班 副班長', bio: '第九班副班長，堅持到底，榮譽結訓！' },
      { id: '1B3C014', name: '林昱辰', nickname: '昱辰副班長', rank_level: '一兵', duty: '二排 第六班 副班長', bio: '第六班副班長，用心服務，同甘共苦！' }
    ];

    const cadres = [];
    for (let i = 1; i <= 100; i++) {
      const id = `1B3C${String(i).padStart(3, '0')}`;
      const existing = defaultCadres.find(c => c.id === id);
      cadres.push({
        id: id,
        password: id, // 預設密碼同帳號
        name: existing ? existing.name : '',
        nickname: existing ? existing.nickname : '',
        rank_level: existing ? existing.rank_level : '', // 職等/階級
        duty: existing ? existing.duty : '',             // 職務
        enlist_date: '',
        interests: '',
        dream: '',
        ig: '',
        line: '',
        bio: existing ? existing.bio : '',
        avatar_military: '',
        avatar_civilian: '',
        is_cadre: true,
        updated_at: ''
      });
    }
    return cadres;
  },

  // 第一~九 班帶班班長與副班長資訊
  squadLeaders: {
    1: { name: '潘品濬', rank: '上士', duty: '一排 第一班 班長', assistant: { name: '劉映祥', rank: '中士', duty: '副班長' }, quote: '精實第一班，紀律嚴明、同甘共苦！' },
    2: { name: '陳明德', rank: '中士', duty: '一排 第二班 班長', assistant: null, quote: '第二班兄弟團結一致，爭取榮譽！' },
    3: { name: '鄭仁河', rank: '中士', duty: '一排 第三班 班長', assistant: { name: '林晉丞', rank: '中士', duty: '副班長' }, quote: '積極進取，第三班全力以赴！' },
    4: { name: '陳臺紳', rank: '上士', duty: '二排 第四班 班長', assistant: { name: '陳皓軒', rank: '下士', duty: '副班長' }, quote: '二排先鋒，第四班頂天立地！' },
    5: { name: '魏國書', rank: '上士', duty: '二排 第五班 班長', assistant: null, quote: '穩紮穩打，第五班勇往直前！' },
    6: { name: '陳家倫', rank: '上士', duty: '二排 第六班 班長', assistant: { name: '林昱辰', rank: '一兵', duty: '副班長' }, quote: '齊心協力，第六班無懈可擊！' },
    7: { name: '鄧兆凱', rank: '士官長', duty: '三排 第七班 班長', assistant: null, quote: '三排榮譽，第七班精益求精！' },
    8: { name: '程祖儀', rank: '上士', duty: '三排 第八班 班長', assistant: null, quote: '堅持到底，第八班追求卓越！' },
    9: { name: '王韋傑', rank: '上士', duty: '三排 第九班 班長', assistant: { name: '顏仕庭', rank: '下士', duty: '副班長' }, quote: '全力衝刺，第九班榮耀同行！' },
    10: { name: '劉映祥', rank: '中士', duty: '一排 第一班 副班長 (第十寢帶班幹部)', assistant: null, quote: '第一班副班長，生活自律，互助合作！' },
    11: { name: '林晉丞', rank: '中士', duty: '一排 第三班 副班長 (第十一寢帶班幹部)', assistant: null, quote: '第三班副班長，親愛精誠，圓滿結訓！' }
  },

  // 傳奇版初始資料 (清空由弟兄自行爆料)
  legends: [],

  // 大兵日記初始資料 (清空由弟兄自行撰寫)
  diaries: [],

  // 產生 98 位弟兄空白資料 (13001 ~ 13098)
  getInitialMembers() {
    const members = [];
    let currentIdNum = 13001;
    let roomIndex = 1;
    let inRoomCount = 0;

    for (let squad = 1; squad <= 9; squad++) {
      // 1~7班 11人, 8班 10人, 9班 11人 = 98人
      const squadCount = (squad === 8) ? 10 : 11;

      for (let i = 0; i < squadCount; i++) {
        const id = String(currentIdNum);

        // 計算寢室 (1~10寢每寢9人，第11寢8人)
        const room = roomIndex;
        inRoomCount++;
        if (roomIndex <= 10 && inRoomCount === 9) {
          roomIndex++;
          inRoomCount = 0;
        }

        // 所有個人資料留空，待弟兄登入後自行填寫與上傳
        members.push({
          id: id,
          password: id, // 預設密碼同學號
          name: '',      // 姓名待填寫
          nickname: '',  // 綽號待填寫
          squad: squad,
          room: room,
          duty: (i === 0) ? '班頭' : '一般兵',
          interests: '', // 個人興趣/專長
          dream: '',     // 未來夢想/目標
          ig: '',
          line: '',
          bio: '',
          avatar_military: '', // 大兵軍裝照
          avatar_civilian: '', // 私人便服照
          updated_at: ''
        });

        currentIdNum++;
      }
    }

    return members;
  }
};

window.MOCK_DATA = MOCK_DATA;
