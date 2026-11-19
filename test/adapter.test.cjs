'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readAvito } = require('../src/avito-read.cjs');
const env = {AVITO_CLIENT_ID:'test-client',AVITO_CLIENT_SECRET:'test-secret'};
const ok = payload => new Response(JSON.stringify(payload),{headers:{'content-type':'application/json'}});
test('items: only token POST and official scoped GET; never sends token in URL', async () => {
  const seen = [];
  const result = await readAvito('items',{env, request:async (url,o) => {
    seen.push([url.href,o]);
    return seen.length===1 ? ok({access_token:'not-real'}) : ok({resources:[]});
  }});
  assert.deepEqual(result,{resources:[]});
  assert.deepEqual(seen.map(([u,o])=>[u,o.method,o.redirect]),[
    ['https://api.avito.ru/token','POST','error'],
    ['https://api.avito.ru/core/v1/items?page=1&per_page=25','GET','error'],
  ]);
  assert.equal(seen[0][1].body.get('grant_type'),'client_credentials');
  assert.equal(seen[1][1].headers.Authorization,'Bearer not-real');
});
test('chats resolve account self, refuse an untrusted id and make no further request', async () => {
  const seen = [];
  await assert.rejects(readAvito('chats',{env,request:async(url)=>{
    seen.push(url.pathname);
    return ok(seen.length===1 ? {access_token:'token'} : {id:'../../another-account'});
  }}),/идентификатор/);
  assert.deepEqual(seen,['/token','/core/v1/accounts/self']);
});
test('unsupported writes and missing credentials fail before any request', async () => {
  let calls=0;
  const request=async()=>{calls++; return ok({});};
  await assert.rejects(readAvito('publish',{env,request}),/не поддерживается/);
  await assert.rejects(readAvito('items',{env:{},request}),/переменных окружения/);
  assert.equal(calls,0);
});
test('chats with verified account ID use API only, no response body leaks on failure', async () => {
  const urls = [];
  const request = async url => {
    urls.push(url.href);
    if(urls.length===1) return ok({access_token:'token'});
    if(urls.length===2) return ok({id:123});
    return new Response('confidential response',{status:403});
  };
  await assert.rejects(readAvito('chats',{env,request}),e=>e.message==='Авито API: HTTP 403 на шаге «чаты».');
  assert.equal(urls.at(-1),'https://api.avito.ru/messenger/v2/accounts/123/chats?limit=25&offset=0');
});
