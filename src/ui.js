'use strict';
const $ = (selector, el = document) => el.querySelector(selector);
const select = $('#mode'), output = $('#output'), status = $('#status');
const verify = $('#verify'), download = $('#download');
let reviewed = '';
function resetReview() {
  reviewed = '';
  verify.disabled = !output.value.trim();
  download.disabled = true;
}
function markStale() {
  if (!output.value) return;
  output.value = '';
  resetReview();
  status.textContent = 'Данные изменились. Собери черновик заново.';
}
function changeMode() {
  for (const p of document.querySelectorAll('[data-mode]')) p.hidden = p.dataset.mode !== select.value;
  output.value = '';
  resetReview();
  status.textContent = '';
}
select.onchange = changeMode;
$('#inputs').oninput = e => { if (e.target !== select) markStale(); };
$('#inputs').onsubmit = e => {
  e.preventDefault();
  resetReview();
  output.value = '';
  const val = name => $('#' + name).value;
  try {
    switch (select.value) {
      case 'listing': output.value = core.listing({
        title: val('title'), condition: val('condition'), city: val('city'), details: val('details'), cost: val('cost'),
      }); break;
      case 'price': {
        const p = core.price(val('comparables'));
        if (!p.count) throw Error('Добавь хотя бы одну подходящую цену в рублях.');
        output.value = [
          'Ориентир по ценам объявлений, не оценка сделок.',
          'Учитывались только предоставленные тобой данные.',
          'Подходящих строк: ' + p.count + '. Пропущено: ' + p.discarded + '.',
          'Диапазон: ' + core.fmt(p.min) + '–' + core.fmt(p.max) + ' ₽.',
          p.median === null ? 'Для медианы нужно минимум три цены.' : 'Медиана: ' + core.fmt(p.median) + ' ₽.',
        ].join('\n'); break;
      }
      case 'reply': output.value = core.reply({purpose: val('purpose'), agreed: val('agreed')}); break;
    }
    status.textContent = 'Черновик готов. Проверь и при необходимости отредактируй текст.';
  } catch(e) { status.textContent = e.message; }
  resetReview();
};
output.oninput = () => { resetReview(); status.textContent = 'Текст изменился. Проверь новую версию.'; };
verify.onclick = () => {
  reviewed = output.value.trim();
  download.disabled = !reviewed;
  status.textContent = reviewed ? 'Версия проверена. Можно скачать текст.' : 'Текст пуст.';
};
download.onclick = () => {
  try {
    const value = core.exportText(select.value, output.value, reviewed);
    const url = URL.createObjectURL(new Blob([value + '\n'], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url; link.download = 'marketplace-' + select.value + '.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Текст передан браузеру для скачивания. На Авито ничего не отправлено.';
  } catch(e) { status.textContent = e.message; }
};
changeMode();
