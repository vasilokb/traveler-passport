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
  visitedCities: {},
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.currentTab = saved.currentTab || "catalog";
      state.travelerName = saved.travelerName || "Белорусский путешественник";
      state.visitedCities = saved.visitedCities || {};
    }
  } catch (e) {
    state = {
      currentTab: "catalog",
      travelerName: "Белорусский путешественник",
      visitedCities: {},
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

  if (state.visitedCities[cityId]) {
    delete state.visitedCities[cityId];
  } else {
    state.visitedCities[cityId] = { date: getTodayLocal() };
  }

  saveState();
  renderCatalog();
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

  renderCatalog();
  switchTab(state.currentTab);
}

document.addEventListener("DOMContentLoaded", init);
