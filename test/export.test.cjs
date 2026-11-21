'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {test} = require('node:test');
const vm = require('node:vm');

test('portable export has one integrity-bound script and no network/forms', () => {
  const html = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html, /Демо: консультант по продажам/);
  assert.match(html, /id="demo-handoff"/);
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(script.length,1);
  const hash = crypto.createHash('sha256').update(script[0][1]).digest('base64');
  assert.match(html, /connect-src 'none'; form-action 'none'/);
  assert.ok(html.includes("script-src 'sha256-" + hash + "'"));
  assert.doesNotMatch(html,/<script[^>]+src=|<iframe|<(?:img|link)[^>]+https?:/i);
  const map = new Map();
  const document = {
    querySelector: k => {
      if (!map.has(k)) map.set(k,{value:'',disabled:false,textContent:''});
      return map.get(k);
    },
    querySelectorAll: () => [],
  };
  const el = name => document.querySelector('#'+name);
  el('mode').value='listing';
  vm.runInNewContext(script[0][1],{document});
  assert.equal(el('download').disabled,true);
  el('title').value='Ваза';
  el('inputs').onsubmit({preventDefault(){}});
  assert.equal(el('output').value,'Ваза');
  el('verify').onclick();
  assert.equal(el('download').disabled,false);
  el('output').value='Новая версия';
  el('output').oninput();
  assert.equal(el('download').disabled,true);
});
