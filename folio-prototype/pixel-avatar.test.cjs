const test=require('node:test'),assert=require('node:assert/strict');
const P=require('./pixel-avatar-core.js');
test('保存形象只接受统一规格和安全色值，损坏或旧版数据回到书本',()=>{
  const draft=P.blank();draft.pixels[255]='#d97757';
  const state=P.read(JSON.stringify({version:1,active:draft,custom:draft}));
  assert.equal(state.active.pixels[255],'#D97757');assert.equal(state.custom.pixels.length,256);
  for(const invalid of ['not-json',JSON.stringify({version:0,active:draft}),JSON.stringify({version:1,active:{...draft,size:8}}),JSON.stringify({version:1,active:{...draft,pixels:['red']}})])
    assert.equal(P.read(invalid).active.id,'book');
  assert.equal(P.normalize({...draft,pixels:Array(256).fill('url(bad)')}),null);
});
test('预设和自绘规格相同，编辑副本不改变预设或已应用的数据',()=>{
  for(const preset of P.presets) {assert.ok(P.normalize(preset));assert.equal(preset.pixels.length,256);assert.ok(preset.pixels.some(Boolean));}
  const saved=P.clone(P.presets[0]),draft=P.clone(saved);draft.pixels[0]='#000000';
  assert.equal(saved.pixels[0],null);assert.equal(P.presets[0].pixels[0],null);
  assert.equal(P.DISPLAY_SIZE,24);
});
