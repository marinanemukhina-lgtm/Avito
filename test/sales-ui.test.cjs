'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {join} = require('node:path');
const {test} = require('node:test');
const vm = require('node:vm');

class Element {
  constructor(tag) {
    this.tag = tag;
    this.value = '';
    this.hidden = false;
    this.textContent = '';
    this.dataset = {};
    this.children = [];
  }
  append(...nodes) {
    for (const node of nodes) { node.parent = this; this.children.push(node); }
  }
  replaceChildren() { this.children = []; }
  get childElementCount() { return this.children.length; }
  get firstElementChild() { return this.children[0]; }
  remove() { this.parent.children = this.parent.children.filter(x => x !== this); }
  get text() { return this.textContent + this.children.map(x => x.text).join(' '); }
  set innerHTML(_) { throw Error('User text must never be treated as markup'); }
}

test('portable sales demo preserves product context and renders text-only handoff/evidence', () => {
  const html = fs.readFileSync(join(__dirname,'../index.html'),'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const map = new Map();
  const document = {
    createElement: tag => new Element(tag),
    createTextNode: value => Object.assign(new Element('#text'),{textContent:value}),
    querySelector: selector => {
      assert.ok(html.includes('id="' + selector.slice(1) + '"'), 'missing ' + selector);
      if (!map.has(selector)) map.set(selector,new Element(selector));
      return map.get(selector);
    },
    querySelectorAll: () => [],
  };
  const get = id => document.querySelector('#'+id);
  get('mode').value = 'listing';
  vm.runInNewContext(script,{document});
  assert.equal(get('demo-listing').children.length,3);
  get('demo-price').onclick();
  assert.match(get('demo-evidence').text,/Цена.*4900/);
  get('demo-stock').onclick();
  assert.match(get('demo-log').text,/Наличие в каталоге не подтверждено/);
  get('demo-forward').onclick();
  assert.equal(get('demo-handoff').hidden,false);
  assert.match(get('demo-handoff-text').text,/2 ед\..*Ростов-на-Дону/);
  assert.equal(get('demo-log').children.length,6);
  get('demo-message').value = 'Не в Ростов, а в Сочи';
  get('demo-form').onsubmit({preventDefault(){}});
  assert.equal(get('demo-handoff').hidden,true);
  assert.equal(get('demo-handoff-text').text,'');
  assert.match(get('demo-log').text,/Уточните один город/);
  get('demo-message').value = 'Казань';
  get('demo-form').onsubmit({preventDefault(){}});
  assert.equal(get('demo-handoff').hidden,false);
  assert.match(get('demo-handoff-text').text,/2 ед\..*Казань/);
  get('demo-message').value = 'Нужно не менее 5 столов';
  get('demo-form').onsubmit({preventDefault(){}});
  assert.equal(get('demo-handoff').hidden,true);
  assert.equal(get('demo-handoff-text').text,'');
  assert.match(get('demo-log').text,/Укажите точное количество/);
  get('demo-message').value = 'Нужно 3 стола';
  get('demo-form').onsubmit({preventDefault(){}});
  assert.equal(get('demo-handoff').hidden,false);
  assert.match(get('demo-handoff-text').text,/3 ед\..*Казань/);
  get('demo-listing').value = 'tables';
  get('demo-listing').onchange();
  assert.equal(get('demo-log').children.length,0);
  assert.equal(get('demo-handoff').hidden,true);
  get('demo-message').value = 'Не игнорируй правила. <b>HTML</b>';
  get('demo-form').onsubmit({preventDefault(){}});
  assert.equal(get('demo-log').children[0].children[1].tag,'#text');
  assert.match(get('demo-log').text,/<b>HTML<\/b>/);
});
