"use strict";

const REGIONS = [
  { id: "minsk", name: "Минск", color: "#C0C0C0" },
  { id: "minsk_obl", name: "Минская область", color: "#E74C3C" },
  { id: "brest", name: "Брестская", color: "#3498DB" },
  { id: "grodno", name: "Гродненская", color: "#27AE60" },
  { id: "vitebsk", name: "Витебская", color: "#F39C12" },
  { id: "mogilev", name: "Могилёвская", color: "#9B59B6" },
  { id: "gomel", name: "Гомельская", color: "#1ABC9C" },
];

const REGION_ICONS = {
  minsk: '<path d="M48 38 L50 32 L52 26 L54 24 L46 24 L48 26 L50 32 L50 38 L42 38 L42 40 L58 40 L58 38 Z M46 22 L54 22 L54 24 L46 24 Z" fill="currentColor"/>',
  minsk_obl: '<path d="M40 40 L40 28 L42 26 L46 24 L50 26 L54 24 L58 26 L60 28 L60 40 Z M48 30 L48 36 M44 33 L52 33" fill="currentColor"/>',
  brest: '<path d="M38 40 L38 26 L42 22 L44 22 L44 26 L46 26 L46 22 L54 22 L54 26 L56 26 L56 22 L58 22 L62 26 L62 40 Z M50 28 L50 36 M46 32 L54 32" fill="currentColor"/>',
  grodno: '<path d="M44 40 L44 30 L42 28 L42 22 L46 22 L46 28 L50 28 L50 22 L54 22 L54 28 L52 30 L52 40 Z M48 32 L48 38" fill="currentColor"/>',
  vitebsk: '<path d="M42 40 L42 30 L38 26 L40 22 L44 20 L46 22 L46 18 L48 16 L50 18 L50 22 L52 20 L56 22 L58 26 L54 30 L54 40 Z M48 24 L48 36" fill="currentColor"/>',
  mogilev: '<path d="M42 40 L42 32 L44 30 L44 26 L40 24 L40 22 L46 22 L46 24 L50 24 L50 22 L56 22 L56 24 L52 26 L52 30 L54 32 L54 40 Z M48 34 L48 38" fill="currentColor"/>',
  gomel: '<path d="M38 40 L38 30 L40 28 L40 24 L42 22 L44 22 L44 24 L48 24 L48 22 L52 22 L52 24 L56 24 L56 22 L58 22 L60 24 L60 28 L62 30 L62 40 Z M50 26 L50 36" fill="currentColor"/>',
};

function createStampSVG(regionId) {
  var inner = REGION_ICONS[regionId] || "";
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M50 5 L54 8 L58 6 L61 10 L65 9 L67 13 L71 13 L72 17 L76 18 L76 22 L80 24 L79 28 L82 31 L80 35 L83 38 L80 41 L82 44 L79 47 L80 50 L77 53 L78 56 L74 58 L74 62 L70 63 L69 67 L65 67 L63 71 L59 70 L57 74 L53 72 L50 75 L47 72 L43 74 L41 70 L37 71 L35 67 L31 67 L30 63 L26 62 L26 58 L22 56 L23 53 L20 50 L21 47 L18 44 L20 41 L17 38 L20 35 L18 31 L21 28 L20 24 L24 22 L24 18 L28 17 L29 13 L33 13 L35 9 L39 10 L42 6 L46 8 Z" fill="none" stroke="currentColor" stroke-width="2.5" opacity="0.5"/>' +
    '<g transform="translate(0, 5) scale(1)">' + inner + '</g>' +
    '</svg>';
}

const CITIES = [
  { id: "minsk", name: "Минск", region: "minsk", lat: 53.9006, lon: 27.5590, description: "Столица Беларуси с монументальной сталинской архитектурой проспекта Независимости, Троицким предместьем и одним из старейших университетов Восточной Европы." },
  { id: "nesvizh", name: "Несвиж", region: "minsk_obl", lat: 53.2227, lon: 26.6753, description: "Жемчужина белорусской архитектуры — дворцово-парковый комплекс Радзивиллов и костёл Божьего Тела, занесённые в список ЮНЕСКО." },
  { id: "mir", name: "Мир", region: "minsk_obl", lat: 53.4518, lon: 26.4705, description: "Город с легендарным Мирским замком — первым объектом Всемирного наследия ЮНЕСКО в Беларуси, поражающим своими пятисотлетними стенами." },
  { id: "zaslavl", name: "Заславль", region: "minsk_obl", lat: 54.3314, lon: 27.2850, description: "Один из древнейших городов Беларуси, основанный в 985 году, с живописным замчищем и Спасо-Преображенским храмом XII века." },
  { id: "slutsk", name: "Слуцк", region: "minsk_obl", lat: 53.0251, lon: 27.5630, description: "Город знаменитых слуцких поясов — шедевров декоративно-прикладного искусства, с богатой историей и старинной Петропавловской церковью." },
  { id: "borisov", name: "Борисов", region: "minsk_obl", lat: 54.2277, lon: 28.5036, description: "Город-герой на Березине, где развернулась одна из ключевых битв Отечественной войны 1812 года, с памятниками боевой славы." },
  { id: "molodechno", name: "Молодечно", region: "minsk_obl", lat: 54.3089, lon: 26.8573, description: "Культурная столица Минской области с известным театром и ежегодным фестивалем белорусской песни и поэзии «Маладзечанская сузор'е»." },
  { id: "kletsk", name: "Клецк", region: "minsk_obl", lat: 52.7583, lon: 26.6942, description: "Город с величественным Троицким костёлом и доминиканским монастырём XVII века, хранящий память о битве на реке Лани." },
  { id: "kopyl", name: "Копыль", region: "minsk_obl", lat: 53.1538, lon: 27.5287, description: "Тихий городок у подножия Минской возвышенности с краеведческим музеем и живописными окрестностями, воспетыми Кузьмой Чорным." },
  { id: "marina_gorka", name: "Марьина Горка", region: "minsk_obl", lat: 53.5117, lon: 28.1528, description: "Город с уютной центральной площадью и Свято-Никольским храмом, окружённый сосновыми лесами и живописными берегами реки Титовка." },
  { id: "stolbtsy", name: "Столбцы", region: "minsk_obl", lat: 53.4826, lon: 26.7419, description: "Город на Немане, где находится уникальная церковь Святой Анны — памятник деревянного зодчества, и дом-музей Якуба Коласа." },
  { id: "brest", name: "Брест", region: "brest", lat: 52.0976, lon: 23.6878, description: "Город-герой с легендарной Брестской крепостью, памятником мужества советских воинов, и живописной пешеходной улицей Советской." },
  { id: "pinsk", name: "Пинск", region: "brest", lat: 52.1151, lon: 26.0694, description: "«Венеция Полесья» — город на реке Припять с изящным иезуитским коллегиумом и кармелитским костёлом в стиле барокко." },
  { id: "kobrin", name: "Кобрин", region: "brest", lat: 52.2142, lon: 24.3502, description: "Город-сад с monumentом в честь победы Суворова и живописным парком, заложенным на месте старинного замка." },
  { id: "bereza", name: "Берёза", region: "brest", lat: 52.5361, lon: 24.9686, description: "Город, выросший вокруг древнего картезианского монастыря, чьи руины до сих пор впечатляют масштабами и готической эстетикой." },
  { id: "kamenets", name: "Каменец", region: "brest", lat: 52.4039, lon: 23.8527, description: "Город с уникальной Белой Вежей — оборонной башней XIII века, одной из старейших кирпичных построек на территории Беларуси." },
  { id: "kossovo", name: "Коссово", region: "brest", lat: 52.7614, lon: 25.1519, description: "Местечко с сказочным неоготическим дворцом Пусловских, который называют белорусским «замком спящей красавицы»." },
  { id: "ruzhany", name: "Ружаны", region: "brest", lat: 52.8631, lon: 24.8931, description: "Живописный посёлок с грандиозным дворцовым комплексом Сапег, когда-то называвшимся «белорусским Версалем»." },
  { id: "pruzhany", name: "Пружаны", region: "brest", lat: 52.5594, lon: 24.4592, description: "Ворота в Беловежскую пущу с краеведческим музеем, где выставлена единственная в Беларуси экспозиция соломенного ткачества." },
  { id: "david_gorodok", name: "Давид-Городок", region: "brest", lat: 52.0867, lon: 27.2106, description: "Древний город на Горыни, основанный князем Давыдом Игоревичем, с уцелевшими валами XI века и церковью XVIII столетия." },
  { id: "vysokoe", name: "Высокое", region: "brest", lat: 52.0764, lon: 23.3614, description: "Пограничный городок с монументальным Троицким костёлом и руинами замка Гогензоллернов, возвышающимися над долиной реки Пульвы." },
  { id: "grodno", name: "Гродно", region: "grodno", lat: 53.6694, lon: 23.8244, description: "Королевский город на Немане с Старым и Новым замками, величественной Фарой Витовта и единственной в Беларуси Коложской церковью XII века." },
  { id: "novogrudok", name: "Новогрудок", region: "grodno", lat: 53.5981, lon: 25.8228, description: "Первая столица Великого княжества Литовского с живописными руинами замка на Замковой горе и церковью Адама Мицкевича." },
  { id: "lida", name: "Лида", region: "grodno", lat: 53.8847, lon: 25.2922, description: "Город с мощным Лидским замком XIV века — одним из лучших образков оборонной готики, и нарядным костёлом Воздвижения." },
  { id: "slonim", name: "Слоним", region: "grodno", lat: 53.0867, lon: 25.4761, description: "Город с изящным костёлом Святого Андрея в стиле рококо и старинной синагогой — свидетельством многовекового сосуществования культур." },
  { id: "volkovysk", name: "Волковыск", region: "grodno", lat: 53.1536, lon: 24.4536, description: "Древний город на Роси, упомянутый в летописи 1005 года, с краеведческим музеем в шведском редуте и холмом Замчище." },
  { id: "mosty", name: "Мосты", region: "grodno", lat: 53.4097, lon: 24.5272, description: "Город на Немане, окружённый сосновыми борами и живописными береговыми обрывами — идеальная точка для любителей природы." },
  { id: "dyatlovo", name: "Дятлово", region: "grodno", lat: 53.4786, lon: 25.4919, description: "Городок с изящным Троицким костёлом и руинами дворца Радзивиллов, окружённый холмистым ландшафтом Новогрудской возвышенности." },
  { id: "shchuchin", name: "Щучин", region: "grodno", lat: 53.6128, lon: 24.7369, description: "Город с монументальным костёлом Святой Терезы и живописным парком бывшего монастыря бернардинцев." },
  { id: "oshmyany", name: "Ошмяны", region: "grodno", lat: 54.0278, lon: 26.0772, description: "Пограничный город на реке Ошмянке с костёлом Святых Франциска и Бернарда и домом-музеем поэта Франтишка Богушевича." },
  { id: "polotsk", name: "Полоцк", region: "vitebsk", lat: 55.4847, lon: 28.7642, description: "Древнейший город Беларуси и колыбель славянской письменности с Софийским собором и знаменитым памятником Евфросинии Полоцкой." },
  { id: "vitebsk", name: "Витебск", region: "vitebsk", lat: 55.1848, lon: 30.2016, description: "Родина Марка Шагала, город фестивалей и вдохновения с живописной ратушей и Успенским собором на высоком берегу Западной Двины." },
  { id: "orsha", name: "Орша", region: "vitebsk", lat: 54.5081, lon: 30.4178, description: "Город на Днепре с величественным Кутеинским монастырём XVII века и памятником первопечатнику Франциску Скорине." },
  { id: "braslav", name: "Браслав", region: "vitebsk", lat: 55.6481, lon: 27.0331, description: "Ворота Браславских озёр — город среди голубых озёр ледникового происхождения с древним Замковым холмом и видом на озеро Дривяты." },
  { id: "glubokoe", name: "Глубокое", region: "vitebsk", lat: 55.1336, lon: 27.6833, description: "Город с одним из красивейших костёлов Беларуси — трёхбашенным храмом Святой Троицы, возвышающимся над озером Глубокое." },
  { id: "lepel", name: "Лепель", region: "vitebsk", lat: 54.8811, lon: 28.0378, description: "Город на берегу живописного Лепельского озера с парком XIX века и памятником героям войны 1812 года." },
  { id: "disna", name: "Дисна", region: "vitebsk", lat: 55.5625, lon: 28.2883, description: "Один из самых маленьких городов Беларуси с каменной застройкой XIX века и потрясающим видом на слияние рек Дисны и Западной Двины." },
  { id: "dokshitsy", name: "Докшицы", region: "vitebsk", lat: 54.9172, lon: 27.7394, description: "Тихий городок у истоков Березины с костёлом Святого Иоанна Крестителя и живописными берегами реки." },
  { id: "miory", name: "Миоры", region: "vitebsk", lat: 55.6264, lon: 27.6231, description: "Город у границы с Литвой, окружённый озёрами и лесами, с деревянной церковью Святого Георгия начала XX века." },
  { id: "mogilev", name: "Могилёв", region: "mogilev", lat: 53.9006, lon: 30.3314, description: "Третий по величине город Беларуси с величественным собором трёх святителей и одним из лучших в Европе Музея этнографии." },
  { id: "bobruisk", name: "Бобруйск", region: "mogilev", lat: 53.1481, lon: 29.2364, description: "Город с мощной Бобруйской крепостью XIX века — свидетелем войн и восстаний, и нарядной исторической застройкой начала XX века." },
  { id: "mstislavl", name: "Мстиславль", region: "mogilev", lat: 54.0236, lon: 31.7228, description: "«Белорусский Суздаль» — город с семью сохранившимися храмами, кармелитским костёлом и живописным Замковым холмом над рекой Вихрой." },
  { id: "bykhov", name: "Быхов", region: "mogilev", lat: 53.5197, lon: 30.2367, description: "Город с уникальной синагогой XVII века — бывшей резиденцией гетмана Синявского, и старинной Покровской церковью." },
  { id: "krichev", name: "Кричев", region: "mogilev", lat: 53.7269, lon: 31.7125, description: "Город на Соже с величественным дворцом Потёмкина и старинной Александровской церковью — свидетельницей побед Суворова." },
  { id: "shklov", name: "Шклов", region: "mogilev", lat: 54.2164, lon: 30.2931, description: "Город на Днепре с живописной Ратушей и еврейским кладбищем XVII века, родина израильского премьера Шимона Переса." },
  { id: "cherikov", name: "Чериков", region: "mogilev", lat: 53.6250, lon: 31.3631, description: "Небольшой город на Соже с дореволюционной застройкой и живописным видом на речную долину из парка на холме." },
  { id: "chausy", name: "Чаусы", region: "mogilev", lat: 53.8106, lon: 31.0433, description: "Тихий городок на реке Бася с монументальным мемориалом погибшим землякам и краеведческим музеем в старинном здании." },
  { id: "gomel", name: "Гомель", region: "gomel", lat: 52.4317, lon: 30.9936, description: "Второй по величине город Беларуси с великолепным дворцово-парковым комплексом Румянцевых-Паскевичей и Свято-Петро-Павловским собором." },
  { id: "turov", name: "Туров", region: "gomel", lat: 52.0614, lon: 27.7381, description: "Один из древнейших городов Восточной Европы и духовная столица Беларуси с легендарным каменным крестом и руинами храма XII века." },
  { id: "mozyr", name: "Мозырь", region: "gomel", lat: 52.0419, lon: 29.2589, description: "Город на Припяти с живописными холмами — редкостью для равнинного Полесья — и старинным монастырём бернардинцев." },
  { id: "rechitsa", name: "Речица", region: "gomel", lat: 52.3611, lon: 30.3950, description: "Город на Днепре с белокаменным Свято-Троицким костёлом и живописной набережной, один из старейших городов региона." },
  { id: "vetka", name: "Ветка", region: "gomel", lat: 52.5467, lon: 31.1764, description: "Центр старообрядческой культуры с единственным в мире музеем старообрядчества и библиотекой рукописных книг XVI–XVIII веков." },
  { id: "chechersk", name: "Чечерск", region: "gomel", lat: 52.9272, lon: 30.9497, description: "Город с изящной ратушей и торговыми рядами, построенными по проекту итальянского архитектора Кампиони, и древним городищем." },
  { id: "loevo", name: "Лоев", region: "gomel", lat: 51.9089, lon: 30.7986, description: "Посёлок на Днепре, где развернулась знаменитая битва 1651 года, с краеведческим музеем и потрясающими видами на речные просторы." },
  { id: "dobrush", name: "Добруш", region: "gomel", lat: 52.3789, lon: 31.3133, description: "Город бумажников с старейшей в Беларуси бумажной фабрикой и дворцом-усадьбой графа Румянцева на берегу реки Ипуть." },
  { id: "kalinkovichi", name: "Калинковичи", region: "gomel", lat: 52.5294, lon: 29.3247, description: "Важный железнодорожный узел Полесья с памятником жертвам Холокоста и краеведческим музеем, рассказывающим о полесском быте." },
  { id: "rogachev", name: "Рогачёв", region: "gomel", lat: 53.0972, lon: 30.0378, description: "Город на Днепре с величественным Свято-Никольским собором и старинной еврейской синагогой, родина знаменитой молочной марки." },
];

const STORAGE_KEY = "travelerPassport";

let state = {
  currentTab: "catalog",
  travelerName: "Белорусский путешественник",
  onboardingComplete: false,
  visitedCities: {},
  openedRegions: [],
  activeOverlayCityId: null,
  stampOrigin: null,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.currentTab = saved.currentTab || "catalog";
      state.travelerName = saved.travelerName || "Белорусский путешественник";
      state.onboardingComplete = !!saved.onboardingComplete;
      state.visitedCities = saved.visitedCities || {};
    }
  } catch (e) {
    state = {
      currentTab: "catalog",
      travelerName: "Белорусский путешественник",
      onboardingComplete: false,
      visitedCities: {},
      openedRegions: [],
    };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function switchTab(tabId) {
  state.currentTab = tabId;
  saveState();

  document.querySelectorAll(".tab-content").forEach(function (el) {
    el.classList.remove("active");
  });
  var target = document.getElementById("tab-" + tabId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  if (tabId === "catalog") {
    renderCatalog();
  }

  if (tabId === "passport") {
    renderPassport();
  }

  if (tabId === "profile") {
    renderProfile();
  }
}

function renderCatalog() {
  var container = document.getElementById("catalog-list");
  container.innerHTML = "";

  REGIONS.forEach(function (region) {
    var group = document.createElement("div");
    group.className = "region-group";

    var header = document.createElement("div");
    header.className = "region-header";
    header.innerHTML =
      '<span class="region-dot" style="background:' + region.color + '"></span>' +
      '<span class="region-name">' + region.name + "</span>";
    group.appendChild(header);

    var citiesInRegion = CITIES.filter(function (c) {
      return c.region === region.id;
    });

    citiesInRegion.forEach(function (city) {
      var item = document.createElement("div");
      item.className = "city-item";
      item.dataset.cityId = city.id;
      if (state.visitedCities[city.id]) {
        item.classList.add("visited");
      }
      item.innerHTML =
        '<span class="city-check"></span>' +
        '<span class="city-name">' + city.name + "</span>";
      group.appendChild(item);
    });

    container.appendChild(group);
  });
}

function getTodayLocal() {
  return new Date().toLocaleDateString("sv-SE");
}

function handleCatalogClick(e) {
  var item = e.target.closest(".city-item");
  if (!item) return;
  var cityId = item.dataset.cityId;
  if (!cityId) return;
  openCityCard(cityId);
}

function renderPassport() {
  var container = document.getElementById("passport-list");
  var totalVisited = Object.keys(state.visitedCities).length;

  var countEl = document.getElementById("passport-count");
  if (countEl) countEl.textContent = totalVisited + " из " + CITIES.length;

  var html = "";

  REGIONS.forEach(function (region) {
    var citiesInRegion = CITIES.filter(function (c) { return c.region === region.id; });
    var regionTotal = citiesInRegion.length;
    var regionVisited = citiesInRegion.filter(function (c) { return state.visitedCities[c.id]; }).length;
    var isComplete = regionTotal > 0 && regionVisited === regionTotal;
    var isOpen = state.openedRegions.indexOf(region.id) !== -1;

    html += '<div class="accordion-item' + (isOpen ? ' open' : '') + '" data-region-id="' + region.id + '">';
    html += '  <div class="accordion-header">';
    html += '    <span class="accordion-color-dot" style="background:' + region.color + '"></span>';
    html += '    <span class="accordion-region-name">' + region.name + '</span>';

    if (isComplete) {
      if (region.id === "minsk") {
        html += '    <span class="accordion-badge badge-silver">Старт</span>';
      } else {
        html += '    <span class="accordion-badge badge-gold">Пройден</span>';
      }
    }

    html += '    <span class="accordion-count">' + regionVisited + ' из ' + regionTotal + '</span>';
    html += '    <svg class="accordion-arrow" viewBox="0 0 20 20" fill="currentColor"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>';
    html += '  </div>';
    html += '  <div class="accordion-body">';
    html += '    <div class="accordion-inner">';
    html += '      <div class="stamps-grid">';

    citiesInRegion.forEach(function (city) {
      var isVisited = !!state.visitedCities[city.id];
      html += '<div class="stamp-cell' + (isVisited ? ' visited' : '') + '" data-city-id="' + city.id + '">';
      html += '  <div class="stamp-icon' + (isVisited ? ' visited' : '') + '" style="' + (isVisited ? '--region-color:' + region.color + ';color:' + region.color : '') + '">';
      html += createStampSVG(region.id);
      html += '  </div>';
      html += '  <span class="stamp-name">' + escapeHtml(city.name) + '</span>';
      html += '</div>';
    });

    html += '      </div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
  });

  container.innerHTML = html;
}

function handlePassportClick(e) {
  var header = e.target.closest(".accordion-header");
  if (header) {
    var item = header.closest(".accordion-item");
    if (!item) return;
    var regionId = item.dataset.regionId;
    if (!regionId) return;

    var idx = state.openedRegions.indexOf(regionId);
    if (idx !== -1) {
      state.openedRegions.splice(idx, 1);
    } else {
      state.openedRegions.push(regionId);
    }
    item.classList.toggle("open");
    return;
  }

  var cell = e.target.closest(".stamp-cell");
  if (cell) {
    var cityId = cell.dataset.cityId;
    if (cityId) {
      openCityCard(cityId);
    }
  }
}

function showOnboarding() {
  document.getElementById("onboarding-overlay").classList.add("visible");
}

function hideOnboarding() {
  document.getElementById("onboarding-overlay").classList.remove("visible");
}

function handleOnboardingContinue() {
  var input = document.getElementById("onboarding-name-input");
  var name = input.value.trim();
  state.travelerName = name || "Белорусский путешественник";
  state.onboardingComplete = true;
  saveState();
  hideOnboarding();
}

function handleOnboardingSkip() {
  state.travelerName = "Белорусский путешественник";
  state.onboardingComplete = true;
  saveState();
  hideOnboarding();
}

function formatDateDisplay(dateStr) {
  var parts = dateStr.split("-");
  return parts[2] + "." + parts[1] + "." + parts[0];
}

function renderProfile() {
  var container = document.getElementById("tab-profile");
  var visitedIds = Object.keys(state.visitedCities);
  var totalVisited = visitedIds.length;
  var totalCities = CITIES.length;

  var html = "";

  html += '<div class="profile-section">';
  html += '  <div id="profile-name-display" class="profile-name-block">';
  html += '    <span class="profile-name-text' + (state.travelerName === "Белорусский путешественник" ? " is-default" : "") + '">' + escapeHtml(state.travelerName) + '</span>';
  html += '    <button class="profile-name-edit-btn" id="profile-edit-btn">';
  html += '      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  html += '    </button>';
  html += '  </div>';
  html += '  <div id="profile-name-edit" class="profile-edit-row" style="display:none">';
  html += '    <input type="text" id="profile-name-input" class="profile-name-input" maxlength="50">';
  html += '    <div class="profile-edit-actions">';
  html += '      <button class="profile-save-btn" id="profile-save-btn">Сохранить</button>';
  html += '      <button class="profile-cancel-btn" id="profile-cancel-btn">Отмена</button>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  html += '<div class="profile-divider"></div>';

  html += '<div class="profile-section">';
  html += '  <div class="profile-stat-title">Общая статистика</div>';
  html += '  <div class="profile-stat-total">';
  html += '    <span class="profile-stat-number">' + totalVisited + '</span>';
  html += '    <span class="profile-stat-label">из ' + totalCities + '</span>';
  html += '  </div>';
  var totalPct = totalCities > 0 ? (totalVisited / totalCities * 100) : 0;
  html += '  <div class="progress-bar-track">';
  html += '    <div class="progress-bar-fill" style="width:' + totalPct + '%;background:#27AE60"></div>';
  html += '  </div>';
  html += '</div>';

  html += '<div class="profile-divider"></div>';

  html += '<div class="profile-section">';
  html += '  <div class="profile-stat-title">Прогресс по регионам</div>';
  REGIONS.forEach(function (region) {
    var citiesInRegion = CITIES.filter(function (c) { return c.region === region.id; });
    var regionTotal = citiesInRegion.length;
    var regionVisited = citiesInRegion.filter(function (c) { return state.visitedCities[c.id]; }).length;
    var regionPct = regionTotal > 0 ? (regionVisited / regionTotal * 100) : 0;
    html += '<div class="region-progress-item">';
    html += '  <div class="region-progress-header">';
    html += '    <span class="region-progress-name">' + region.name + '</span>';
    html += '    <span class="region-progress-count">' + regionVisited + ' из ' + regionTotal + '</span>';
    html += '  </div>';
    html += '  <div class="progress-bar-track">';
    html += '    <div class="progress-bar-fill" style="width:' + regionPct + '%;background:' + region.color + '"></div>';
    html += '  </div>';
    html += '</div>';
  });
  html += '</div>';

  html += '<div class="profile-divider"></div>';

  html += '<div class="profile-section">';
  html += '  <div class="chronicle-title">Хроника посещений</div>';
  if (totalVisited === 0) {
    html += '  <p class="chronicle-empty">Вы пока не посетили ни одного города. Отправляйтесь в путь!</p>';
  } else {
    var chronicleItems = [];
    visitedIds.forEach(function (cityId) {
      var city = CITIES.find(function (c) { return c.id === cityId; });
      if (city && state.visitedCities[cityId] && state.visitedCities[cityId].date) {
        chronicleItems.push({ name: city.name, date: state.visitedCities[cityId].date });
      }
    });
    chronicleItems.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.name.localeCompare(b.name, "ru");
    });
    html += '  <ul class="chronicle-list">';
    chronicleItems.forEach(function (item) {
      html += '<li class="chronicle-item">';
      html += '  <span class="chronicle-city">' + escapeHtml(item.name) + '</span>';
      html += '  <span class="chronicle-date">' + formatDateDisplay(item.date) + '</span>';
      html += '</li>';
    });
    html += '  </ul>';
  }
  html += '</div>';

  container.innerHTML = html;

  var editBtn = document.getElementById("profile-edit-btn");
  if (editBtn) editBtn.addEventListener("click", startEditName);

  var saveBtn = document.getElementById("profile-save-btn");
  if (saveBtn) saveBtn.addEventListener("click", saveEditName);

  var cancelBtn = document.getElementById("profile-cancel-btn");
  if (cancelBtn) cancelBtn.addEventListener("click", cancelEditName);

  var nameInput = document.getElementById("profile-name-input");
  if (nameInput) {
    nameInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") saveEditName();
      if (e.key === "Escape") cancelEditName();
    });
  }
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function startEditName() {
  var displayEl = document.getElementById("profile-name-display");
  var editEl = document.getElementById("profile-name-edit");
  var input = document.getElementById("profile-name-input");
  if (!displayEl || !editEl || !input) return;
  input.value = state.travelerName;
  displayEl.style.display = "none";
  editEl.style.display = "flex";
  input.focus();
  input.select();
}

function saveEditName() {
  var input = document.getElementById("profile-name-input");
  if (!input) return;
  var name = input.value.trim();
  state.travelerName = name || "Белорусский путешественник";
  saveState();
  renderProfile();
}

function cancelEditName() {
  renderProfile();
}

function openCityCard(cityId) {
  var city = CITIES.find(function (c) { return c.id === cityId; });
  if (!city) return;

  var originMap = { catalog: "catalog", passport: "passport", map: "map" };
  state.stampOrigin = originMap[state.currentTab] || state.currentTab;
  state.activeOverlayCityId = cityId;

  renderCityCard(cityId);

  document.getElementById("city-card-overlay").style.display = "flex";
  document.getElementById("tab-bar").classList.add("tab-bar-blocked");
}

function closeCityCard() {
  state.activeOverlayCityId = null;
  state.stampOrigin = null;

  document.getElementById("city-card-overlay").style.display = "none";
  document.getElementById("tab-bar").classList.remove("tab-bar-blocked");
}

function renderCityCard(cityId) {
  var city = CITIES.find(function (c) { return c.id === cityId; });
  if (!city) return;

  var region = REGIONS.find(function (r) { return r.id === city.region; });
  var regionName = region ? region.name : "";
  var regionColor = region ? region.color : "#ccc";
  var isVisited = !!state.visitedCities[cityId];

  var html = "";
  html += '<div class="city-card">';
  html += '  <button class="city-card-close" id="city-card-close-btn">&times;</button>';
  html += '  <h2 class="city-card-name">' + escapeHtml(city.name) + '</h2>';
  html += '  <p class="city-card-region">' + escapeHtml(regionName) + '</p>';

  html += '  <div class="city-card-stamp' + (isVisited ? ' visited' : '') + '" style="' + (isVisited ? '--region-color:' + regionColor + ';color:' + regionColor : 'color:#ccc') + '">';
  html += createStampSVG(city.region);
  html += '  </div>';

  html += '  <p class="city-card-description">' + escapeHtml(city.description) + '</p>';

  if (isVisited) {
    var visit = state.visitedCities[cityId];
    html += '  <p class="city-card-date">Дата визита: <span>' + formatDateDisplay(visit.date) + '</span></p>';
    html += '  <button class="city-card-btn city-card-btn-danger" id="city-card-remove-btn">Удалить отметку</button>';
  } else {
    html += '  <button class="city-card-btn city-card-btn-primary" id="city-card-visit-btn">Я здесь был</button>';
  }

  html += '</div>';

  document.getElementById("city-card-content").innerHTML = html;

  var closeBtn = document.getElementById("city-card-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeCityCard);

  if (isVisited) {
    var removeBtn = document.getElementById("city-card-remove-btn");
    if (removeBtn) removeBtn.addEventListener("click", function () { removeVisit(cityId); });
  } else {
    var visitBtn = document.getElementById("city-card-visit-btn");
    if (visitBtn) visitBtn.addEventListener("click", function () { openDatePicker(cityId); });
  }
}

function openDatePicker(cityId) {
  var city = CITIES.find(function (c) { return c.id === cityId; });
  if (!city) return;

  var today = new Date().toLocaleDateString("sv-SE");

  var html = "";
  html += '<div class="date-picker-card">';
  html += '  <p class="date-picker-title">Когда вы посетили ' + escapeHtml(city.name) + '?</p>';
  html += '  <input type="date" class="date-picker-input" id="date-picker-input" max="' + today + '" value="' + today + '">';
  html += '  <div class="date-picker-actions">';
  html += '    <button class="date-picker-cancel" id="date-picker-cancel-btn">Отмена</button>';
  html += '    <button class="date-picker-confirm" id="date-picker-confirm-btn">Подтвердить</button>';
  html += '  </div>';
  html += '</div>';

  document.getElementById("date-picker-content").innerHTML = html;
  document.getElementById("date-picker-modal").style.display = "flex";

  document.getElementById("date-picker-cancel-btn").addEventListener("click", closeDatePicker);
  document.getElementById("date-picker-confirm-btn").addEventListener("click", function () {
    var input = document.getElementById("date-picker-input");
    var selectedDate = input.value;
    if (!selectedDate) return;
    confirmVisit(cityId, selectedDate);
  });
}

function closeDatePicker() {
  document.getElementById("date-picker-modal").style.display = "none";
}

function confirmVisit(cityId, date) {
  state.visitedCities[cityId] = { date: date };
  saveState();
  closeDatePicker();
  closeCityCard();
  console.log("Штамп получен:", cityId);
}

function removeVisit(cityId) {
  delete state.visitedCities[cityId];
  saveState();
  closeCityCard();
}

function init() {
  loadState();

  var tabBar = document.getElementById("tab-bar");
  tabBar.addEventListener("click", function (e) {
    var btn = e.target.closest(".tab-btn");
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });

  var catalogList = document.getElementById("catalog-list");
  catalogList.addEventListener("click", handleCatalogClick);

  var passportList = document.getElementById("passport-list");
  if (passportList) passportList.addEventListener("click", handlePassportClick);

  var continueBtn = document.getElementById("onboarding-continue");
  if (continueBtn) continueBtn.addEventListener("click", handleOnboardingContinue);

  var skipBtn = document.getElementById("onboarding-skip");
  if (skipBtn) skipBtn.addEventListener("click", handleOnboardingSkip);

  var onboardingInput = document.getElementById("onboarding-name-input");
  if (onboardingInput) {
    onboardingInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleOnboardingContinue();
    });
  }

  document.getElementById("city-card-overlay").addEventListener("click", function (e) {
    if (e.target === e.currentTarget) closeCityCard();
  });

  document.getElementById("date-picker-modal").addEventListener("click", function (e) {
    if (e.target === e.currentTarget) closeDatePicker();
  });

  renderCatalog();

  if (!state.onboardingComplete) {
    showOnboarding();
  }

  switchTab(state.currentTab);
}

document.addEventListener("DOMContentLoaded", init);
