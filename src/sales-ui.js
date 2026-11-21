'use strict';
if (typeof document.createElement === 'function') {
  (() => {
    const listing = $('#demo-listing'), form = $('#demo-form'), message = $('#demo-message');
    const log = $('#demo-log'), refs = $('#demo-evidence'), handoff = $('#demo-handoff');
    const handoffText = $('#demo-handoff-text'), state = $('#demo-status');
    const scenarios = {
      '#demo-price':'Сколько стоит?',
      '#demo-stock':'Есть в наличии?',
      '#demo-forward':'Нужно 2 штуки, доставка в Ростов-на-Дону',
    };
    const options = [...salesDemo.listings].sort((a,b) => Number(a.stock !== null) - Number(b.stock !== null));
    let session;
    for (const item of options) {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.title;
      listing.append(opt);
    }
    listing.value = options[0].id;
    function note(label, value) {
      const item = document.createElement('li');
      item.textContent = label ? label + ': ' + value : value;
      refs.append(item);
    }
    function reset() {
      session = salesDemo.createSession(listing.value);
      log.replaceChildren();
      refs.replaceChildren();
      note('', 'Пока нет ответа.');
      handoff.hidden = true;
      handoffText.textContent = '';
      message.value = '';
      state.textContent = '';
    }
    function append(role, speaker, text) {
      const line = document.createElement('li');
      line.dataset.speaker = speaker;
      const name = document.createElement('strong');
      name.textContent = role;
      line.append(name, document.createTextNode(text));
      log.append(line);
    }
    function run(input) {
      const trimmed = input.trim();
      if (!trimmed) return;
      const result = salesDemo.reply(session, trimmed);
      session = result.session;
      append('Покупатель', 'buyer', trimmed);
      append('Демо-консультант', 'consultant', result.text);
      while (log.childElementCount > 24) log.firstElementChild.remove();
      log.scrollTop = log.scrollHeight;
      refs.replaceChildren();
      for (const {label,value} of result.evidence) note(label, String(value));
      if (!result.evidence.length) note('', 'В каталоге нет подтверждения для этого ответа.');
      handoff.hidden = !result.handoff;
      if (result.handoff) {
        const product = options.find(x => x.id === result.handoff.listingId);
        handoffText.textContent = [product?.title, result.handoff.quantity + ' ед.', result.handoff.city].filter(Boolean).join(' · ');
      } else {
        handoffText.textContent = '';
      }
      message.value = '';
      state.textContent = result.handoff ? 'Собран черновик заявки.' : '';
    }
    for (const [selector, text] of Object.entries(scenarios)) $(selector).onclick = () => run(text);
    listing.onchange = reset;
    $('#demo-reset').onclick = reset;
    form.onsubmit = event => { event.preventDefault(); run(message.value); };
    reset();
  })();
}
