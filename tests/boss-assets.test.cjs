'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const ids=['qilin','wolf','ape','snake','sword','fox','ghost','bird','emperor'];
test('V2.1.4: đủ 9 PNG boss độc lập, không trùng hình, kích thước hợp lệ',()=>{
  const sha=[];
  for(const id of ids){
    const file=path.join(root,'assets','cinematic','bosses_v214',`${id}.png`);
    assert.ok(fs.existsSync(file),`Thiếu file boss ${file}`);
    const buf=fs.readFileSync(file);
    assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`PNG không hợp lệ: ${id}`);
    const w=buf.readUInt32BE(16), h=buf.readUInt32BE(20);
    assert.ok(w>=300&&h>=300,`Ảnh ${id} quá nhỏ: ${w}x${h}`);
    assert.ok(buf.length>50_000,`Ảnh ${id} có vẻ là icon/placeholder quá nhỏ`);
    sha.push(crypto.createHash('sha256').update(buf).digest('hex'));
  }
  assert.equal(new Set(sha).size,9,'Có boss dùng chung một file ảnh');
});
test('V2.1.4: renderer luôn chọn PNG boss mới khi đổi đồ họa',()=>{
  const source=fs.readFileSync(path.join(root,'renderer.js'),'utf8');
  assert.ok(source.includes('bosses_v214/${b.id}.png'));
  assert.ok(!source.includes('bosses_v213/${b.id}.png'));
  assert.ok(source.includes('refreshBossAssetStatus'));
});
