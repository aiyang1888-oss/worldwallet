/* WorldWallet — word lists (loaded before inline app script) */
var SINGLE_CHARS = {
  zh: '龙凤虎鹤福寿禄喜财春夏秋冬金木水火土山川云月星日风雨雪',
  ja: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほやゆよアイウエオカキクケコ',
  ko: 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ',
  ar: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي',
  ru: 'абвгдежзийклмнопрстуфхцчшщыьэюя',
  hi: 'अआइउएओकखगघचजटडतथदधनपफबभमयरलवशसह',
  th: 'กขคงจชซณดตถทนบปผพฟภมยรลวสหอ',
  vi: 'àáâèéêìíòóôùúýăđơư',
  es: 'áéíóúüñ',
  fr: 'àâçéèêëîïôùûü',
  de: 'äöüÄÖÜ',
  pt: 'áàãâçéêíóõôú',
  it: 'àèéìíòóùú',
  tr: 'çğışöüÇĞİŞÖÜ',
  pl: 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ',
  uk: 'абвгєжзийіїйклмнопрстуфхцчшщьюя',
  ro: 'âăîșț',
  sv: 'åäöÅÄÖ',
  el: 'αβγδεζηθικλμνξοπρστυφχψω',
  fa: 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی',
  bn: 'অআইউএওকখগঘচজটডতথদধনপবভমযরলশসহ',
  nl: 'abcdefghijklmnopqrstuvwxyz',
};

var SAMPLE_KEYS = {
  zh:['北京','东京','巴黎','伦敦','柏林','罗马','马德里','首尔','开罗','悉尼','孟买','多伦多'],
  en:['abandon','ability','about','above','absent','absorb','abstract','absurd','abuse','access','accident','account'],
  ja:['北京','東京','パリ','ロンドン','ベルリン','ローマ','マドリード','ソウル','カイロ','シドニー','ムンバイ','トロント'],
  ko:['베이징','도쿄','파리','런던','베를린','로마','마드리드','서울','카이로','시드니','뭄바이','토론토'],
  es:['Pekín','Tokio','París','Londres','Berlín','Roma','Madrid','Seúl','El Cairo','Sídney','Bombay','Toronto'],
  fr:['Pékin','Tokyo','Paris','Londres','Berlin','Rome','Madrid','Séoul','Le Caire','Sydney','Bombay','Toronto'],
  ar:['بكين','طوكيو','باريس','لندن','برلين','روما','مدريد','سيول','القاهرة','سيدني','مومباي','تورنتو'],
  ru:['Пекин','Токио','Париж','Лондон','Берлин','Рим','Мадрид','Сеул','Каир','Сидней','Мумбаи','Торонто'],
  pt:['Pequim','Tóquio','Paris','Londres','Berlim','Roma','Madri','Seul','Cairo','Sydney','Mumbai','Toronto'],
  hi:['बीजिंग','टोक्यो','पेरिस','लंदन','बर्लिन','रोम','मैड्रिड','सियोल','काहिरा','सिडनी','मुंबई','टोरंटो'],
  de:['Peking','Tokio','Paris','London','Berlin','Rom','Madrid','Seoul','Kairo','Sydney','Mumbai','Toronto'],
  tr:['Pekin','Tokyo','Paris','Londra','Berlin','Roma','Madrid','Seul','Kahire','Sidney','Mumbai','Toronto'],
  vi:['Bắc Kinh','Tokyo','Paris','London','Berlin','Rome','Madrid','Seoul','Cairo','Sydney','Mumbai','Toronto'],
  id:['Beijing','Tokyo','Paris','London','Berlin','Roma','Madrid','Seoul','Kairo','Sydney','Mumbai','Toronto'],
  th:['ปักกิ่ง','โตเกียว','ปารีส','ลอนดอน','เบอร์ลิน','โรม','มาดริด','โซล','ไคโร','ซิดนีย์','มุมไบ','โตรอนโต'],
  it:['Pechino','Tokyo','Parigi','Londra','Berlino','Roma','Madrid','Seul','Il Cairo','Sydney','Mumbai','Toronto'],
  pl:['Pekin','Tokio','Paryż','Londyn','Berlin','Rzym','Madryt','Seul','Kair','Sydney','Bombaj','Toronto'],
  nl:['Peking','Tokio','Parijs','Londen','Berlijn','Rome','Madrid','Seoul','Caïro','Sydney','Mumbai','Toronto'],
  uk:['Пекін','Токіо','Париж','Лондон','Берлін','Рим','Мадрид','Сеул','Каїр','Сідней','Мумбаї','Торонто'],
  sv:['Peking','Tokyo','Paris','London','Berlin','Rom','Madrid','Seoul','Kairo','Sydney','Mumbai','Toronto'],
  el:['Πεκίνο','Τόκιο','Παρίσι','Λονδίνο','Βερολίνο','Ρώμη','Μαδρίτη','Σεούλ','Κάιρο','Σίδνεϊ','Μουμπάι','Τορόντο'],
  fa:['پکن','توکیو','پاریس','لندن','برلین','رم','مادرید','سئول','قاهره','سیدنی','بمبئی','تورنتو'],
  ur:['بیجنگ','ٹوکیو','پیرس','لندن','برلن','روم','میڈرڈ','سیول','قاہرہ','سڈنی','ممبئی','ٹورنٹو'],
  bn:['বেইজিং','টোকিও','প্যারিস','লন্ডন','বার্লিন','রোম','মাদ্রিদ','সিউল','কায়রো','সিডনি','মুম্বাই','টরন্টো'],
  ms:['Beijing','Tokyo','Paris','London','Berlin','Rom','Madrid','Seoul','Kairo','Sydney','Mumbai','Toronto'],
  sw:['Beijing','Tokyo','Paris','London','Berlin','Roma','Madrid','Seoul','Cairo','Sydney','Mumbai','Toronto'],
  ro:['Beijing','Tokyo','Paris','Londra','Berlin','Roma','Madrid','Seoul','Cairo','Sydney','Mumbai','Toronto'],
};

var KEYWORDS_ZH = ['举头望明月','春风得意马蹄','柳暗花明又一村','山重水复疑无路','千里江陵一日还','轻舟已过万重山','飞流直下三千尺','春色满园关不住','接天莲叶无穷碧','万紫千红总是春'];

var KEYWORDS_EN = ['Fortune smiles today','Golden harvest comes','Every cloud has silver','Stars align tonight','Good luck flows now'];

// ══ 礼物口令系统 ══
var KW_ZH = ['举头望明月','春风得意马蹄','柳暗花明又一村','飞流直下三千尺','万紫千红总是春','轻舟已过万重山','千里江陵一日还','接天莲叶无穷碧','春色满园关不住','山重水复疑无路','白日依山尽黄河','烟花三月下扬州','孤帆远影碧空尽','不识庐山真面目','停车坐爱枫林晚'];
var KW_EN = ['Fortune smiles today','Golden harvest comes','Every cloud silver lining','Stars align tonight','Lucky winds blow now'];
var KW_JA = ['古池や蛙飛び込む','春の海終日のたり','菜の花や月は東に','五月雨を集めて早し','閑さや岩にしみ入る'];
var KW_AR = ['الصبر مفتاح الفرج','نور وبركة وسعادة','خير وأمل وفرحة'];
var KW_RU = ['Я помню чудное мгновенье','Белеет парус одинокой','Мороз и солнце день чудесный'];
var KW_ES = ['Quien madruga Dios le ayuda','No hay mal que por bien no venga','A buen entendedor pocas palabras'];
var KW_FR = ['La vie en rose toujours','Tout vient à point qui sait attendre','Mieux vaut tard que jamais'];


var LANG_KW = {zh:KW_ZH,en:KW_EN,ja:KW_JA,ar:KW_AR,ru:KW_RU,es:KW_ES,fr:KW_FR};

var BLESSINGS = ['恭喜发财，万事如意','岁岁平安，事事顺心','吉祥如意，福气满满','财源广进，好运连连','心想事成，大吉大利'];
