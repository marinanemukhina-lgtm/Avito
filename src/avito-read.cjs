'use strict';

const origin = 'https://api.avito.ru';
const getPaths = {
  self: '/core/v1/accounts/self',
  items: '/core/v1/items?page=1&per_page=25',
};
async function readAvito(kind, {env = process.env, request = globalThis.fetch} = {}) {
  if (!['self','items','chats'].includes(kind)) throw Error('Действие не поддерживается: адаптер только для чтения.');
  const {AVITO_CLIENT_ID:id, AVITO_CLIENT_SECRET:secret} = env;
  if (!id || !secret) throw Error('Нужны AVITO_CLIENT_ID и AVITO_CLIENT_SECRET из переменных окружения.');
  async function json(route, step, init) {
    const url = new URL(route, origin);
    if (url.origin !== origin) throw Error('Неразрешённый адрес API.');
    let res;
    try { res = await request(url,{...init,redirect:'error',signal:AbortSignal.timeout(10000)}); }
    catch { throw Error('Авито API недоступен на шаге «' + step + '».'); }
    if (!res.ok) throw Error('Авито API: HTTP ' + res.status + ' на шаге «' + step + '».');
    try { return await res.json(); } catch { throw Error('Авито API: некорректный ответ на шаге «' + step + '».'); }
  }
  const {access_token:token} = await json('/token','авторизация',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded', Accept:'application/json'},
    body:new URLSearchParams({grant_type:'client_credentials',client_id:id,client_secret:secret}),
  });
  if (typeof token !== 'string' || !/^[\x21-\x7e]+$/.test(token)) throw Error('Авито API не вернул корректный токен.');
  const get = (url,step)=>json(url,step,{method:'GET',headers:{Authorization:'Bearer '+token, Accept:'application/json'}});
  if (kind==='self') return get(getPaths.self,'профиль');
  if (kind==='items') return get(getPaths.items,'объявления');
  const {id:account} = await get(getPaths.self,'профиль');
  if ((typeof account!=='number' && typeof account!=='string') ||
      (typeof account==='number' && !Number.isSafeInteger(account)) ||
      !/^[1-9][0-9]{0,19}$/.test(String(account))) throw Error('Авито API вернул непригодный идентификатор аккаунта.');
  return get('/messenger/v2/accounts/'+account+'/chats?limit=25&offset=0','чаты');
}
module.exports = {readAvito};

if (require.main===module) {
  readAvito(process.argv[2]).then(result=>{
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
  }).catch(e=>{
    process.stderr.write(e.message+'\n');
    process.exitCode=1;
  });
}
