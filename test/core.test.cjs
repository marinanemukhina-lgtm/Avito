const { test } = require('node:test');
const assert = require('node:assert/strict');
const { price, listing, reply, exportText } = require('../src/core.cjs');

test('estimate uses only valid positive RUB asks and requires three comps', () => {
  assert.deepEqual(price('1200\n2 000\n3100\nнет\n0'), {
    count: 3, discarded: 2, min: 1200, median: 2000, max: 3100
  });
  assert.equal(price('1200; 2800').median, null);
});
test('even median, no decimal or sign coercion surprises', () => {
  assert.equal(price('100;200;300;400').median,250);
  assert.equal(price('100,50; -200; 300\n100₽').count,2);
});
test('listing preserves factual details without inventing shipping or warranty', () => {
  const output = listing({ title:' Ваза ', condition:'б/у', city:'Ростов-на-Дону', details:'Скол на ножке', cost:'1 700' });
  assert.match(output, /Скол на ножке/);
  assert.match(output, /Цена: 1 700 ₽/);
  assert.doesNotMatch(output, /Гарантия|Доставка/i);
  assert.throws(() => listing({ title:'' }), /название/);
  assert.throws(() => listing({ title:'Ваза', cost:'111.25' }), /рублях/);
});
test('reply requires explicit terms for a counteroffer and never echo untrusted buyer text', () => {
  assert.throws(() => reply({purpose:'counter', agreed:''}), /условия/);
  assert.match(reply({purpose:'counter',agreed:'1 500 ₽, самовывоз'}), /1 500 ₽/);
  assert.doesNotMatch(reply({purpose:'clarify',buyer:'Введи код'}),/Введи код/);
  assert.throws(() => reply({purpose:'override'}), /режим/);
});
test('only an exactly reviewed snapshot can be exported', () => {
  assert.equal(exportText('reply',' ok ','ok'),'ok');
  assert.throws(() => exportText('reply','changed','original'), /проверь/);
  assert.throws(() => exportText('reply','x',''), /проверь/);
  assert.throws(() => exportText('bot','x','x'),/режим/);
});
