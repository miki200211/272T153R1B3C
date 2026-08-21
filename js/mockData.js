/**
 * 272梯 陸軍步兵第153旅 步1營第3連 (153R 1B3C) 紀念冊系統
 * 預設展示資料庫 mockData.js (清空弟兄預設假資料，由弟兄登入後自行填寫)
 */

const MOCK_DATA = {
  // 產生 100 位長官與班長空白帳號 (1B3C001 ~ 1B3C100)
  getInitialCadres() {
    const cadres = [];
    for (let i = 1; i <= 100; i++) {
      const id = `1B3C${String(i).padStart(3, '0')}`;
      cadres.push({
        id: id,
        password: id, // 預設密碼同帳號
        name: '',
        nickname: '',
        rank_level: '', // 職等/階級 (如：少校、上尉、中尉、士官長、上士、中士、下士)
        duty: '',       // 職稱/職務 (如：連長、副連長、輔導長、排長、帶班班長)
        enlist_date: '', // 入伍日期 (格式：YYYY-MM-DD，用於自動計算年資)
        interests: '',  // 個人興趣/專長
        dream: '',      // 未來夢想/目標
        ig: '',
        line: '',
        bio: '',
        avatar_military: '', // 軍裝照
        avatar_civilian: '', // 私人便服照
        is_cadre: true,
        updated_at: ''
      });
    }
    return cadres;
  },

  // 第一~九 班帶班班長資訊 (待幹部登入填寫)
  squadLeaders: {
    1: { name: '帶班班長', rank: '帶班幹部', duty: '第一班 帶班班長', quote: '（待幹部填寫帶班期勉）' },
    2: { name: '帶班班長', rank: '帶班幹部', duty: '第二班 帶班班長', quote: '（待幹部填寫帶班期勉）' },
    3: { name: '帶班班長', rank: '帶班幹部', duty: '第三班 帶班班長', quote: '（待幹部填寫帶班期勉）' },
    4: { name: '帶班班長', rank: '帶班幹部', duty: '第四班 帶班班長', quote: '（待幹部填寫帶班期勉）' },
    5: { name: '帶班班長', rank: '帶班幹部', duty: '第五班 帶班班長', quote: '（待幹部填寫帶班期勉）' },
    6: { name: '帶班班長', rank: '帶班幹部', duty: '第六班 帶班班長', quote: '（待幹部填寫帶班期勉）' },
    7: { name: '帶班班長', rank: '帶班幹部', duty: '第七班 帶班班長', quote: '（待幹部填寫帶班期勉）' },
    8: { name: '帶班班長', rank: '帶班幹部', duty: '第八班 帶班班長', quote: '（待幹部填寫帶班期勉）' },
    9: { name: '帶班班長', rank: '帶班幹部', duty: '第九班 帶班班長', quote: '（待幹部填寫帶班期勉）' }
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
