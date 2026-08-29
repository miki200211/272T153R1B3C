/**
 * 272梯 陸軍步兵第153旅 步兵第一營第三連 (153R 1B3C) 紀念冊系統
 * 預設展示資料庫 mockData.js (清空弟兄預設假資料，由弟兄登入後自行填寫)
 */

const MOCK_DATA = {
  // 各班帶班幹部名冊 (共 14 位，涵蓋第一班至第九班 班長與副班長)
  getInitialCadres() {
    const squadCadres = [
      // 一排幹部 (第一班 ~ 第三班)
      { id: 'CADRE-01-1', squad: 1, name: '潘品濬', nickname: '品濬班長', rank_level: '上士', duty: '一排 第一班 班長', bio: '精實第一班，紀律嚴明、同甘共苦！' },
      { id: 'CADRE-01-2', squad: 1, name: '劉映祥', nickname: '映祥副班長', rank_level: '中士', duty: '一排 第一班 副班長', bio: '第一班副班長，生活自律，互助合作！' },
      { id: 'CADRE-02-1', squad: 2, name: '陳明德', nickname: '明德班長', rank_level: '中士', duty: '一排 第二班 班長', bio: '第二班兄弟團結一致，爭取榮譽！' },
      { id: 'CADRE-03-1', squad: 3, name: '鄭仁河', nickname: '仁河班長', rank_level: '中士', duty: '一排 第三班 班長', bio: '積極進取，第三班全力以赴！' },
      { id: 'CADRE-03-2', squad: 3, name: '林晉丞', nickname: '晉丞副班長', rank_level: '中士', duty: '一排 第三班 副班長', bio: '第三班副班長，親愛精誠，圓滿結訓！' },

      // 二排幹部 (第四班 ~ 第六班)
      { id: 'CADRE-04-1', squad: 4, name: '陳臺紳', nickname: '臺紳班長', rank_level: '上士', duty: '二排 第四班 班長', bio: '二排先鋒，第四班頂天立地！' },
      { id: 'CADRE-04-2', squad: 4, name: '陳皓軒', nickname: '皓軒副班長', rank_level: '下士', duty: '二排 第四班 副班長', bio: '第四班副班長，團結合作，共創佳績！' },
      { id: 'CADRE-05-1', squad: 5, name: '魏國書', nickname: '國書班長', rank_level: '上士', duty: '二排 第五班 班長', bio: '穩紮穩打，第五班勇往直前！' },
      { id: 'CADRE-06-1', squad: 6, name: '陳家倫', nickname: '家倫班長', rank_level: '上士', duty: '二排 第六班 班長', bio: '齊心協力，第六班無懈可擊！' },
      { id: 'CADRE-06-2', squad: 6, name: '林昱辰', nickname: '昱辰副班長', rank_level: '一兵', duty: '二排 第六班 副班長', bio: '第六班副班長，用心服務，同甘共苦！' },

      // 三排幹部 (第七班 ~ 第九班)
      { id: 'CADRE-07-1', squad: 7, name: '鄧兆凱', nickname: '兆凱士官長', rank_level: '士官長', duty: '三排 第七班 班長', bio: '三排榮譽，第七班精益求精！' },
      { id: 'CADRE-08-1', squad: 8, name: '程祖儀', nickname: '祖儀班長', rank_level: '上士', duty: '三排 第八班 班長', bio: '堅持到底，第八班追求卓越！' },
      { id: 'CADRE-09-1', squad: 9, name: '王韋傑', nickname: '韋傑班長', rank_level: '上士', duty: '三排 第九班 班長', bio: '全力衝刺，第九班榮耀同行！' },
      { id: 'CADRE-09-2', squad: 9, name: '顏仕庭', nickname: '仕庭副班長', rank_level: '下士', duty: '三排 第九班 副班長', bio: '第九班副班長，堅持到底，榮譽結訓！' }
    ];

    return squadCadres.map((c, i) => ({
      id: c.id || `CADRE-${String(i + 1).padStart(2, '0')}`,
      name: c.name,
      nickname: c.nickname,
      squad: c.squad,
      rank_level: c.rank_level,
      duty: c.duty,
      enlist_date: '',
      interests: '',
      dream: '',
      ig: '',
      line: '',
      bio: c.bio,
      self_intro: '',
      avatar_military: '',
      avatar_civilian: '',
      is_cadre: true,
      updated_at: ''
    }));
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

  // 軍旅役期重要里程碑時間軸 (依國軍官方公文：8/12 入伍 ~ 12/02 零時結訓退伍，8/21 懇親日，9/30 抽籤，10/5~8 鑑測，10/14 撥交/10/15 下部隊)
  timeline: [
    {
      id: 1,
      date: '2026-08-12',
      display_date: '08/12',
      title: '入伍入營・金六結報到',
      badge: '入伍日',
      description: '272梯新兵抵達宜蘭金六結營區，步兵第一營第三連正式成軍！',
      icon: '🪖',
      type: 'start'
    },
    {
      id: 2,
      date: '2026-08-21',
      display_date: '08/21',
      title: '軍民同樂・家屬懇親日',
      badge: '懇親日',
      description: '入伍首週家屬懇親探訪，感謝家人溫暖陪伴與支持！',
      icon: '👨‍👩‍👧‍👦',
      type: 'event'
    },
    {
      id: 3,
      date: '2026-09-30',
      display_date: '09/30',
      title: '部隊抽籤・分發籤筒',
      badge: '部隊抽籤',
      description: '第二階段部隊訓練抽籤，決定下部隊服役單位與專長！',
      icon: '🎲',
      type: 'milestone'
    },
    {
      id: 4,
      date: '2026-10-05',
      display_date: '10/05',
      title: '入伍結訓鑑測・總驗收',
      badge: '結訓鑑測',
      description: '入伍結訓鑑測 (10/5~10/8)：刺槍術、手榴彈投擲、三千公尺跑步與實彈射擊總驗收！',
      icon: '🎯',
      type: 'milestone'
    },
    {
      id: 5,
      date: '2026-10-15',
      display_date: '10/15',
      title: '下部隊撥交・二階段戰訓',
      badge: '下部隊實務',
      description: '金六結第一階段入伍訓練圓滿結業 (10/14撥交)！10/15起進入第二階段部隊訓練！',
      icon: '⚔️',
      type: 'training'
    },
    {
      id: 6,
      date: '2026-12-02',
      display_date: '12/02',
      title: '光榮結訓・結訓令生效',
      badge: '光榮退伍',
      description: '常備兵役軍事訓練圓滿達成！115年12月2日零時生效，三連兄弟江湖再見！',
      icon: '🎖️',
      type: 'end'
    }
  ],

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
          bio: '',        // 💬 結訓感言 (原本的 bio 欄位，外層名冊卡片展示)
          self_intro: '', // 📝 個人自我介紹 (新增在 Excel 的 self_intro 欄位，點進完整檔案才展示)
          avatar_military: '', // 大兵軍裝照
          avatar_civilian: '', // 私人便服照
          updated_at: ''
        });

        currentIdNum++;
      }
    }

    return members;
  },

  // 取得預設問題回報與忘記密碼清單
  getInitialReports() {
    return [
      {
        report_id: 1,
        type: 'forgot_password',
        author_id: '13008',
        author_name: '陳小豪',
        title: '【忘記密碼申請】學號 #13008 (陳小豪)',
        content: '之前自訂的新密碼忘記了，請求管理員協助將密碼重設為預設學號，謝謝！',
        status: 'pending',
        admin_reply: '',
        created_at: '2026-08-28 15:30',
        updated_at: '2026-08-28 15:30'
      },
      {
        report_id: 2,
        type: 'feedback',
        author_id: '13024',
        author_name: '林俊宇',
        title: '紀念冊介面超讚！建議大兵日記可以增加表情符號',
        content: '紀念冊操作很流暢，雙面翻轉照片也很帥！希望莒光日記心得留言也能支援更多貼圖表情！',
        status: 'resolved',
        admin_reply: '感謝建議！已於最新版本持續優化介面與互動功能！',
        created_at: '2026-08-27 19:20',
        updated_at: '2026-08-27 20:00'
      }
    ];
  }
};

window.MOCK_DATA = MOCK_DATA;
