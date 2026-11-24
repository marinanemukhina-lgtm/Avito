'use strict';

(function install(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  else root.AvitoSalesDemo = api;
})(globalThis, function createApi() {
  const source = 'Учебный каталог';
  const listings = Object.freeze([
    { id: 'chairs', title: 'Стулья для кафе «Линия»', price: 4900, stock: null, unit: 'шт.', source },
    { id: 'tables', title: 'Столы для кафе «Контур»', price: 8900, stock: 8, unit: 'шт.', source },
    { id: 'racks', title: 'Торговые стеллажи «Ритм»', price: null, stock: null, unit: 'шт.', source },
  ].map(Object.freeze));

  const cities = Object.freeze([
    ['Ростов-на-Дону', /ростов(?:е|а)?(?:[ -]на[ -]дону)?/u],
    ['Москва', /москв(?:а|у|е|ы)/u],
    ['Санкт-Петербург', /санкт[ -]петербург(?:е|а)?|петербург(?:е|а)?|спб/u],
    ['Казань', /казан(?:ь|и)/u],
    ['Краснодар', /краснодар(?:е|а)?/u],
    ['Екатеринбург', /екатеринбург(?:е|а)?/u],
    ['Новосибирск', /новосибирск(?:е|а)?/u],
    ['Нижний Новгород', /нижн(?:ий|ем|его) новгород(?:е|а)?/u],
    ['Минск', /минск(?:е|а)?/u],
  ]);
  const findListing = id => {
    const result = listings.find(item => item.id === id);
    if (!result) throw Error('Неизвестная позиция учебного каталога.');
    return result;
  };
  const sessionToken = Symbol('demo-session');
  const makeSession = (id, qty = null, city = null, pending = false) =>
    Object.freeze({ listingId: id, quantity: qty, city, pending, [sessionToken]: true });
  const createSession = listingId => makeSession(findListing(listingId).id);
  const fmt = new Intl.NumberFormat('ru-RU');
  const norm = text => (typeof text === 'string' ? text : '').normalize('NFKC').trim().toLowerCase()
    .replace(/ё/g,'е').replace(/[–—‑−]/g,'-').replace(/[\u200b-\u200d\ufeff]/g,'').replace(/\s+/gu,' ');
  const numberWords = {один:1,одну:1,одна:1,два:2,две:2,три:3,четыре:4,пять:5,шесть:6,семь:7,
    восемь:8,девять:9,десять:10,двенадцать:12,пятнадцать:15,двадцать:20,тридцать:30,сорок:40,пятьдесят:50,сто:100};
  const numberPattern = '(?:[0-9]+|' + Object.keys(numberWords).join('|') + ')';
  const unitPattern = String.raw`(?:шт(?:\s*\.|ук(?:а|и|у)?)?|стул(?:а|ьев|ы)?|стол(?:а|ов|ы)?|стеллаж(?:а|ей|и)?|единиц(?:а|ы|у)?)`;
  const quantityUnits = new RegExp('(?<![\\p{L}\\d,.+-])(' + numberPattern + ')\\s*' + unitPattern + '(?![\\p{L}\\d])','gu');
  const quantityCue = String.raw`(?:нужно|нужны|берем|беру|возьму|закажу|хотим|количество|кол-во)\s*[:=]?\s*`;
  const quantityLead = new RegExp(quantityCue + '(' + numberPattern + ')(?![\\p{L}\\d,.+-])','u');
  const extendedNumber = '(?:[0-9]+(?:[.,][0-9]+)?|' + Object.keys(numberWords).join('|') +
    '|одного|одной|двух|трех|четырех|пяти|шести|семи|восьми|девяти|десяти|двенадцати|пятнадцати|двадцати|тридцати|сорока|пятидесяти|ста)';
  const startWord = String.raw`(?:^|[^\p{L}\d,.+-])`;
  const endWord = String.raw`(?![\p{L}\d])`;
  const bounds = String.raw`(?:(?:не\s+)?(?:больше|меньше|более|менее)|как\s+минимум|по\s+меньшей\s+мере|минимум|максимум|примерно|приблизительно|ориентировочно|около|порядка|плюс-минус|до|от)`;
  const between = String.raw`(?:или|либо|до|[-/]|,)\s*`;
  const uncertain = bounds + '\\s+' + extendedNumber + '|' + extendedNumber + '\\s*' + between + extendedNumber + '|' + extendedNumber + '\\s*\\+';
  const boundWithUnits = new RegExp(startWord + '(?:' + uncertain + ')\\s*' + unitPattern + endWord,'u');
  const rangeWithFirstUnit = new RegExp(startWord + extendedNumber + '\\s*' + unitPattern + endWord +
    '\\s*(?:' + between + extendedNumber + '|(?:и|или)\\s+(?:больше|меньше|более|менее))' + endWord,'u');
  const boundWithCue = new RegExp(startWord + quantityCue + '(?:' + uncertain +
    ')(?=\\s*(?:[.!?]?\\s*$|[,;]\\s*(?:доставк|самовывоз|город|в\\s+)))','u');
  const bareBound = new RegExp('^(?:' + uncertain + ')\\s*[.!?]?$','u');
  const unrelatedUnits = String.raw`(?:₽|руб(?:ль|лей|ля|\.)?|тысяч(?:а|и)?|тыс\.?|коп(?:еек|\.)?|кг|метр(?:а|ов)?|час(?:а|ов)?|день|дня|дней|минут(?:а|ы)?|недел(?:я|и|ь)|месяц(?:а|ев)?)`;
  const numericOther = new RegExp(startWord + extendedNumber + '(?:\\s*' + between + extendedNumber + ')?\\s*' + unrelatedUnits + endWord,'u');
  const startsWithOtherUnit = new RegExp('^\\s*' + unrelatedUnits + endWord,'u');
  const quantityAsNumber = value => {
    const result = /^[0-9]+$/.test(value) ? Number(value) : numberWords[value];
    return Number.isSafeInteger(result) && result >= 1 && result <= 100000 ? result : null;
  };
  function parseQuantity(s, pending) {
    if (boundWithUnits.test(s) || rangeWithFirstUnit.test(s) || boundWithCue.test(s) || (pending && bareBound.test(s)) ||
        /[0-9]+[.,][0-9]+\s*шт/u.test(s)) return {value:null,ambiguous:true};
    const found = [...s.matchAll(quantityUnits)].map(match => match[1]);
    const lead = s.match(quantityLead);
    if (!found.length && lead && !startsWithOtherUnit.test(s.slice(lead.index + lead[0].length))) found.push(lead[1]);
    if (!found.length && pending && new RegExp('^' + numberPattern + '[.!?]?$', 'u').test(s)) found.push(s.replace(/[.!?]$/, ''));
    if (found.length === 0) return {value:null,ambiguous:false};
    const values = [...new Set(found.map(quantityAsNumber))];
    return {value:values.length === 1 ? values[0] : null, ambiguous:values.length !== 1 || values[0] === null};
  }
  function parseCities(s) {
    return cities.filter(([,p]) => new RegExp('(?:^|[^\\p{L}])(?:' + p.source + ')(?!\\p{L})','u').test(s)).map(([name])=>name);
  }
  function wrap(session,text,status,evidence=[],handoff=null) {
    return { session,text,status,evidence,handoff };
  }
  const unsafe = /игнориру(?:й|йте)|системн(?:ый|ые|ое|ого) (?:промпт|инструкц)|предыдущие инструкции|system prompt|ignore (?:all|previous)|(?:отправь|скажи|сообщи|продиктуй)\s+(?:мне\s+)?(?:смс|код|пароль|токен)|(?:password|token|secret)\s*[:=]/u;
  const priceIntent = /цен(?:а|е|у|ы|ник)(?!\p{L})|сколько\s+(?:стоит|за|будет стоить)|стоимост/u;
  const stockIntent = /наличи|остатк|осталось|\bavailable\b/u;
  const purchaseIntent = /достав|заказ|куп(?:ить|лю|им)|беру|берем|возьм|нужно|нужн[аыя]|забрать|самовывоз|партия|количество/u;
  const mutationRequest = /перекинь|оплат[аиу]|оплатить|скидк|рассроч|гарант|сертификат|артикул|размер|материал|возврат|банков/u;
  const cancelIntent = /(?:^|[^\p{L}])(?:отмен(?:а|ите|и|яем|яю)|передумал(?:а|и)?|не (?:нужн[аоы]|беру|берем|покупаю))(?!\p{L})/u;
  const deliveryQuote = /сколько (?:стоит|будет стоить|обойдется) доставк|(?:цен[аыу]|стоимост[ьи]|срок[аи]?) (?:на )?(?:за )?доставк|(?:приблизительные )?срок[аи] (?:и стоимость )?доставк|когда (?:сможете )?достав/u;
  const clearsQuantity = new RegExp(startWord + 'не\\s+' + numberPattern + endWord +
    '(?!\\s*' + unrelatedUnits + endWord + ')(?:\\s*' + unitPattern + ')?(?=\\s|[,.!?]|$)', 'u');
  const nonCityPrefix = extendedNumber + endWord + '|(?:наличии|комплекте|понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)' + endWord;
  const clearsCity = new RegExp(startWord + 'не\\s+(?:(?:в|из)\\s+(?!(?:' + nonCityPrefix + '))|(?:' +
    cities.map(([,pattern])=>pattern.source).join('|') + ')' + endWord + ')', 'u');

  function reply(session,text) {
    if (!session || session[sessionToken] !== true) throw Error('Начни новый учебный диалог.');
    const item = findListing(session.listingId);
    if (typeof text !== 'string' || text.length > 2000 || !text.trim()) return wrap(session,
      'Напишите короткий вопрос о цене или наличии либо укажите количество и город.', 'needs-detail');
    const s = norm(text);
    if (unsafe.test(s)) return wrap(session,
      'Этот запрос находится за рамками демо. Работаю только с карточкой товара и данными для черновика заявки.', 'out-of-scope');
    if (cancelIntent.test(s)) return wrap(createSession(item.id),
      'Данные черновика сброшены. Заявка не отправлялась.', 'needs-detail');
    const cityCorrection=clearsCity.test(s), quantityCorrection=clearsQuantity.test(s);
    if (cityCorrection || quantityCorrection) {
      const cityChoices=parseCities(s), parsed=parseQuantity(s,session.pending);
      const city=cityCorrection?null:(cityChoices.length===1?cityChoices[0]:cityChoices.length>1?null:session.city);
      const quantity=quantityCorrection||parsed.ambiguous?null:parsed.value??session.quantity;
      const missing=[quantity===null?'точное количество':'',city===null?'один город':''].filter(Boolean).join(' и ');
      return wrap(makeSession(item.id,quantity,city,true),
        'Уточните '+missing+' отдельным сообщением. Прежнее значение для исправленного поля сброшено.', 'needs-detail');
    }
    if (deliveryQuote.test(s)) return wrap(session,
      'Цена и сроки доставки в учебном каталоге не указаны. Их нужно уточнить у менеджера.', 'needs-detail');
    const askingPrice = priceIntent.test(s);
    const askingStock = stockIntent.test(s);
    const request = purchaseIntent.test(s);
    const qty = parseQuantity(s,session.pending);
    const namedCities = parseCities(s);
    if (numericOther.test(s) && !qty.ambiguous && qty.value===null && namedCities.length===0 && !askingPrice && !askingStock) {
      return wrap(session,'Сроки и дополнительные условия в учебном каталоге не подтверждены. Количество не изменено.', 'needs-detail');
    }
    const salesIntent = request || qty.value !== null || qty.ambiguous || (!askingPrice && !askingStock && namedCities.length > 0);
    const evidence = [], lines = [];
    if (askingPrice && item.price !== null) {
      evidence.push({label:'Цена за единицу',value:item.price,source:item.source});
      lines.push('По учебному каталогу цена за единицу: ' + fmt.format(item.price) + ' ₽.');
    }
    if (askingPrice && item.price === null) lines.push('Цена по этой позиции в учебном каталоге не указана. Нужна проверка менеджером.');
    if (askingStock && item.stock !== null) {
      evidence.push({label:'Остаток в учебном каталоге',value:item.stock,source:item.source});
      lines.push('В учебном каталоге указан остаток: ' + fmt.format(item.stock) + ' шт. Фактическое наличие нужно подтвердить.');
    }
    if (askingStock && item.stock === null) lines.push('Наличие в каталоге не подтверждено. Менеджеру нужно проверить остаток.');
    if (mutationRequest.test(s)) {
      if (lines.length) return wrap(session,lines.join(' ') + ' Остальные условия нужно отдельно уточнить у менеджера.', 'needs-detail', evidence);
      return wrap(session,'Таких подтверждённых данных в учебном каталоге нет. Необходимо уточнение менеджера.', 'out-of-scope');
    }
    if (!salesIntent) {
      if (lines.length) return wrap(session,lines.join(' '), (askingPrice && item.price === null) || (askingStock && item.stock === null) ? 'needs-detail' : 'answered',evidence);
      return wrap(session,'Могу проверить цену и наличие по учебному каталогу или собрать черновик для менеджера. Уточните вопрос.', 'out-of-scope');
    }

    const changingCity = namedCities.length !== 1 &&
      /(?:достав(?:ка|ку|ить|ьте)|отправ(?:ить|ьте)|город)\s*(?:в\s+|[-:])/u.test(s);
    const city = namedCities.length === 1 ? namedCities[0] : (namedCities.length > 1 || changingCity ? null : session.city);
    const quantity = qty.ambiguous ? null : qty.value ?? session.quantity;
    const complete = city !== null && quantity !== null;
    const next = makeSession(item.id,quantity,city,true);
    if (complete) {
      if (item.stock === null && !askingStock) lines.push('Наличие в каталоге не подтверждено.');
      if (item.stock !== null && quantity > item.stock) lines.push('Запрошенное количество выше остатка в учебном каталоге.');
      lines.push('Черновик для менеджера: ' + fmt.format(quantity) + ' шт., ' + city + '. Наличие, сроки и доставку нужно подтвердить. Черновик не отправлен.');
      return wrap(next,lines.join(' '),'handoff',evidence,{quantity,city,listingId:item.id});
    }
    if (quantity === null && city === null) lines.push('Укажите точное количество и один город доставки или самовывоза.');
    else if (quantity === null) lines.push('Укажите точное количество.');
    else if (namedCities.length > 1) lines.push('Уточните один город.');
    else if (changingCity) lines.push('Не удалось подтвердить город по учебному списку. Укажите город из списка демо или передайте его менеджеру отдельно.');
    else lines.push('В каком городе нужна доставка или самовывоз?');
    return wrap(next,lines.join(' '),'needs-detail',evidence);
  }
  return Object.freeze({listings,createSession,reply});
});
