/**
 * PEGA 二手匿名交易空間 - 長期刊登與離線保護示範資料庫 (js/sample_items.js)
 * 用途：
 * 1. 提供常態展示之優質示範好物（涵蓋想賣、想買、免費送、尾牙專區、以物易物）。
 * 2. 當 Supabase 雲端處於休眠（Paused）或網路連線異常時，提供保底安全網，確保市集絕不掛零（不出現 0 件）。
 */

const DEFAULT_SAMPLE_ITEMS = [
  {
    id: "sample-item-001",
    created_at: "2026-09-10T10:00:00.000Z",
    title: "Logitech 羅技 MX Master 3S 旗艦無線智能滑鼠 (95成新)",
    description: "【規格特色】靜音點擊、MagSpeed 電磁滾輪、8000 DPI 高精準感應，支援跨裝置 Flow。\n【成色狀況】辦公室升級換下，平時愛惜使用，外觀約 95 成新，按鍵滾輪功能皆正常。\n【配件說明】附原廠 Logi Bolt 接收器、Type-C 充電線與原廠外盒。\n【面交取件】立德大樓 / 自強大樓同仁皆可當面交貨確認。[EXP:permanent]",
    price: "1800",
    type: "sell",
    image_url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80",
    nickname: "立德硬體同仁",
    device_id: "OFFICIAL_SAMPLE",
    contact_info: "分機: 35123 / Teams: 同仁"
  },
  {
    id: "sample-item-002",
    created_at: "2026-09-10T09:30:00.000Z",
    title: "Apple AirPods Pro 3 主動降噪無線耳機 (全新未拆)",
    description: "【物品來源】尾牙抽中全新原廠正品，膠膜完整未拆封。\n【規格特色】最新一代主動降噪、空間音訊、USB-C 充電盒。\n【保固說明】連線啟動後享有 Apple 原廠完整一年保固。\n【面交地點】關渡園區各棟皆可約面交點收。[EXP:permanent]",
    price: "6500",
    type: "sell",
    image_url: "./images/airpods_pro_3.webp",
    nickname: "軟體研發部",
    device_id: "OFFICIAL_SAMPLE",
    contact_info: "分機: 33831 / Teams: Jer"
  },
  {
    id: "sample-item-003",
    created_at: "2026-09-09T16:20:00.000Z",
    title: "Nintendo Switch 2 瑪利歐賽車豪華主機同捆組 (全新品)",
    description: "【物品來源】尾牙大獎抽中，全套盒裝全新未拆。\n【同捆內容】主機組 + NS2 PRO 控制器 + 瑪利歐賽車豪華遊戲 + 256G 記憶卡 + 便攜收納包。\n【面交方式】園區內面交優先，當場確認盒裝封條。[EXP:permanent]",
    price: "11500",
    type: "sell",
    image_url: "./images/switch2_mario_kart.webp",
    nickname: "Jerry",
    device_id: "OFFICIAL_SAMPLE",
    contact_info: "分機: 36174 / Teams: Jerry"
  },
  {
    id: "sample-item-004",
    created_at: "2026-09-09T14:15:00.000Z",
    title: "童顏有機 經典極致修護保養禮盒 (尾牙全新未拆)",
    description: "【規格說明】有機植萃修護精華與乳霜禮盒，天然無添加溫和保濕。\n【效期說明】保存期限至 2028 年，全新品附精美禮品紙袋，送禮自用皆合適。\n【交貨地點】立德大樓 1F 或地下街可隨時面交。[EXP:permanent]",
    price: "1200",
    type: "sell",
    image_url: "./images/beauty_tongyan.webp",
    nickname: "品保處同仁",
    device_id: "OFFICIAL_SAMPLE",
    contact_info: "分機: 32095 / Teams: 同仁"
  },
  {
    id: "sample-item-005",
    created_at: "2026-09-08T18:00:00.000Z",
    title: "Dyson Supersonic 經典桃紅吹風機 (原廠盒裝全配件)",
    description: "【商品狀態】功能完全正常，風力強勁，附 4 款原廠磁吸吹嘴與防滑墊。\n【使用狀況】使用約一年，定期清理濾網，機身無重摔痕跡。\n【面交資訊】立德 / 自強面交，可當場測試風速與溫控。[EXP:permanent]",
    price: "6800",
    type: "sell",
    image_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
    nickname: "關渡小資女",
    device_id: "OFFICIAL_SAMPLE",
    contact_info: "分機: 35600 / Teams: 同仁"
  },
  {
    id: "sample-item-006",
    created_at: "2026-09-08T15:30:00.000Z",
    title: "BenQ ScreenBar 螢幕智能掛燈 (辦公桌護眼良品)",
    description: "【特色說明】非對稱光學設計不反光，自動調光，USB 供電即插即用。\n【成色】約 9 成新，功能按鍵靈敏，辦公室必備神器。\n【交貨方式】立德大樓各樓層皆可面交點交。[EXP:permanent]",
    price: "1900",
    type: "sell",
    image_url: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=80",
    nickname: "機構設計師",
    device_id: "OFFICIAL_SAMPLE",
    contact_info: "分機: 38822 / Teams: 同仁"
  },
  {
    id: "sample-item-007",
    created_at: "2026-09-08T11:00:00.000Z",
    title: "【PEGA 專屬】關渡園區文康禮券 2,000 面額 (95折轉讓)",
    description: "【票券面額】500 元面額共 4 張（總值 NT$ 2,000），95 折 NT$ 1,900 出清。\n【適用地點】園區特約商店、合作餐飲及福利社均可折抵使用，無使用期限。\n【面交地點】園區內各棟面交點交現金或轉帳。[EXP:permanent]",
    price: "1900",
    type: "sell",
    image_url: "./images/voucher_pega.svg",
    nickname: "福利委員會同仁",
    device_id: "OFFICIAL_SAMPLE",
    contact_info: "分機: 31200 / Teams: 福委會"
  },
  {
    id: "sample-item-008",
    created_at: "2026-09-07T14:40:00.000Z",
    title: "【以物易物】Switch 薩爾達傳說 王國之淚 遊戲卡匣 (想換瑪利歐派對)",
    description: "【換物說明】已破關保存良好，外盒完整無損，金手指明亮乾淨。\n【想換項目】想交換 Nintendo Switch《瑪利歐派對 空前盛會》或《寶可夢 朱/紫》。\n【面交地點】立德大樓午休時間面交換片。[EXP:permanent]",
    price: "swap:瑪利歐派對空前盛會",
    type: "sell",
    image_url: "https://images.unsplash.com/photo-1612287233207-6b45ba0e012e?w=800&auto=format&fit=crop&q=80",
    nickname: "電玩愛好者",
    device_id: "OFFICIAL_SAMPLE",
    contact_info: "分機: 34188 / Teams: 同仁"
  },
  {
    id: "sample-item-009",
    created_at: "2026-09-07T10:15:00.000Z",
    title: "【徵求】Type-C 65W GaN 氮化鎵筆電快充頭 (求立德/自強面交)",
    description: "【需求描述】原廠變壓器留在老家，徵求二手良品 65W 以上 PD 快充頭（Anker、綠聯、小米皆可）。\n【預算金額】NT$ 400 ~ 500（視成色而定）。\n【面交地點】關渡立德、自強大樓隨時可面交。[EXP:permanent]",
    price: "450",
    type: "buy",
    image_url: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80",
    nickname: "專案經理",
    device_id: "OFFICIAL_SAMPLE",
    contact_info: "分機: 37765 / Teams: PM_同仁"
  },
  {
    id: "sample-item-010",
    created_at: "2026-09-06T17:00:00.000Z",
    title: "【徵求】威秀影城 / 國賓電影優待票 2~4 張 (無期限優先)",
    description: "【需求描述】週末規劃與家人看電影，誠徵公司福委會或個人未使用的全台通用電影票。\n【收購價格】每張 NT$ 220 收，徵求 2 到 4 張。\n【面交地點】立德地下街午休或下班後捷運站面交。[EXP:permanent]",
    price: "220",
    type: "buy",
    image_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
    nickname: "採購處同仁",
    device_id: "OFFICIAL_SAMPLE",
    contact_info: "分機: 36690 / Teams: 同仁"
  },
  {
    id: "sample-item-011",
    created_at: "2026-09-06T12:00:00.000Z",
    title: "【免費贈送】辦公桌多肉療癒盆栽 3 盆 (限立德自取)",
    description: "【贈送緣由】辦公座位調整，出清手邊健康綠植（石蓮花、玉露），附底盤小陶盆。\n【領取條件】免任何費用！歡迎喜愛植物的同仁直接領回照顧。\n【取件地點】立德大樓 3 樓茶水間附近自取。[EXP:permanent]",
    price: "0",
    type: "free",
    image_url: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&auto=format&fit=crop&q=80",
    nickname: "綠手指工程師",
    device_id: "OFFICIAL_SAMPLE",
    contact_info: "分機: 39100 / Teams: 同仁"
  },
  {
    id: "sample-item-012",
    created_at: "2026-09-05T14:30:00.000Z",
    title: "【免費贈送】Type-C 轉 USB-A OTG 鋁合金轉接頭 2 顆 (全新未拆)",
    description: "【物品說明】買配件多送的小轉接頭，支援 USB 3.0 高速傳輸，金屬外殼質感佳。\n【贈送方式】完全免費贈送，有需要的同仁歡迎敲 Teams 或分機索取。[EXP:permanent]",
    price: "0",
    type: "free",
    image_url: "https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?w=800&auto=format&fit=crop&q=80",
    nickname: "MIS 支援部",
    device_id: "OFFICIAL_SAMPLE",
    contact_info: "分機: 31088 / Teams: MIS_同仁"
  },
  {
    id: "sample-item-013",
    created_at: "2026-09-05T10:00:00.000Z",
    title: "【免費贈送】Python 與深度學習技術經典書籍 3 本 (良品贈送)",
    description: "【書籍清單】包含《Python 程式設計入門》、《TensorFlow 與 Keras 深度學習實戰》等。\n【書況說明】內頁乾淨無塗鴉缺頁，八成新以上，贈送給想自我進修的同仁。\n【領取方式】自強大樓面交或立德大樓送達。[EXP:permanent]",
    price: "0",
    type: "free",
    image_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80",
    nickname: "AI 研發處",
    device_id: "OFFICIAL_SAMPLE",
    contact_info: "分機: 33456 / Teams: 同仁"
  }
];

/**
 * 取得長期刊登示範商品列表副本
 */
function getFallbackSampleItems() {
  return JSON.parse(JSON.stringify(DEFAULT_SAMPLE_ITEMS));
}

// 掛載至全域
window.DEFAULT_SAMPLE_ITEMS = DEFAULT_SAMPLE_ITEMS;
window.getFallbackSampleItems = getFallbackSampleItems;
