'use strict';

const modes = ['listing', 'price', 'reply'];
const normalize = (value, max = 2000) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max);
};

function rubles(str) {
  const trimmed = normalize(str, 80).replace(/\s*(?:₽|руб\.?|RUB)\s*$/iu, '');
  if (!/^(?:[0-9]+|[0-9]{1,3}(?:[ \u00a0\u202f][0-9]{3})+)$/u.test(trimmed)) return null;
  const amount = Number(trimmed.replace(/\s/g, ''));
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 1e9 ? amount : null;
}
const fmt = number => new Intl.NumberFormat('ru-RU').format(number);

function price(raw) {
  const rows = normalize(raw, 15000).split(/[\n;]+/).map(x => x.trim()).filter(Boolean);
  const values = rows.map(rubles).filter(x => x !== null).sort((a,b) => a-b);
  const count = values.length;
  const mid = Math.floor(count / 2);
  return {
    count, discarded: rows.length - count, min: values[0] ?? null,
    median: count < 3 ? null : count % 2 ? values[mid] : (values[mid-1] + values[mid]) / 2,
    max: values[count-1] ?? null,
  };
}

function listing({ title, condition, city, details, cost } = {}) {
  const name = normalize(title, 120);
  const facts = normalize(details);
  const money = normalize(cost, 80);
  if (!name) throw new Error('Укажи название товара.');
  if (money && rubles(money) === null) throw new Error('Укажи целую положительную цену в рублях.');
  return [name, normalize(condition, 100) && 'Состояние: ' + normalize(condition,100),
    normalize(city,100) && 'Город: ' + normalize(city,100), facts,
    money && 'Цена: ' + fmt(rubles(money)) + ' ₽'].filter(Boolean).join('\n\n');
}

function reply({ purpose, agreed } = {}) {
  const terms = normalize(agreed, 500);
  switch(purpose) {
    case 'clarify': return 'Здравствуйте! Уточните, пожалуйста, что именно вы хотели бы узнать о товаре.';
    case 'counter':
      if (!terms) throw new Error('Укажи условия встречного предложения.');
      return 'Здравствуйте! Могу предложить такие условия: ' + terms + '. Если вам подходит, давайте договоримся о деталях здесь.';
    case 'decline': return 'Здравствуйте! Спасибо за предложение. На таких условиях не готов(а) продолжить сделку.';
    case 'safe': return 'Здравствуйте! Предлагаю продолжить общение в чате Авито. По внешним ссылкам не перехожу и коды подтверждения не передаю.';
    default: throw new Error('Неизвестный режим ответа.');
  }
}

function exportText(mode, current, reviewed) {
  if (!modes.includes(mode)) throw new Error('Неизвестный режим экспорта.');
  if (typeof current !== 'string' || typeof reviewed !== 'string' ||
      !current.trim() || current.trim() !== reviewed.trim()) throw new Error('Сначала проверь актуальную версию.');
  return reviewed.trim();
}

module.exports = { price, listing, reply, exportText, fmt };
