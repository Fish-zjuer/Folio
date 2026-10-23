const {test}=require('node:test'),assert=require('node:assert/strict'),A=require('./relationship-archive.js'),C=require('./relationship-core.js');
function data(count,capacity){const s=C.empty();s.capacity=capacity;for(let i=1;i<count;i++)s.nodes.push({id:'node-'+i,parent:i%5===0?null:'self',name:'节点'+i,note:'中文备注'+i,expanded:i%3!==0,tone:'plum',dx:i,dy:-i});return C.restore(s);}
test('ZIP roundtrip preserves capacity, independent branches, notes, positions and folded state across segments',async()=>{const s=data(751,1000),bytes=A.pack(s),r=await A.unpack(bytes);assert.equal(new DataView(bytes.buffer).getUint32(0,true),0x04034b50);assert.deepEqual(r.state,s);assert.equal(r.state.capacity,1000);});
test('maximum 2000-node capacity and full-length non-ASCII notes roundtrip without truncation',async()=>{const s=data(2000,2000);for(const n of s.nodes)n.note='备'.repeat(3000);const bytes=A.pack(s);assert.ok(bytes.length>5*1024*1024);const r=await A.unpack(bytes);assert.equal(r.state.nodes.length,2000);assert.equal(r.state.nodes.at(-1).note.length,3000);});
test('damaged and truncated ZIP files reject before any store can be changed',async()=>{const bytes=A.pack(data(260,500)),copy=bytes.slice();copy[100]^=255;await assert.rejects(()=>A.unpack(copy),/校验|损坏/);await assert.rejects(()=>A.unpack(bytes.subarray(0,bytes.length-10)),/ZIP/);await assert.rejects(()=>A.unpack(new Uint8Array(A.LIMIT+1)),/32MB/);});
test('invalid capacity and dangling parents cannot be exported as a valid backup',()=>{const s=data(5,250);s.nodes[1].parent='unknown';assert.throws(()=>A.pack(s),/父节点/);s.nodes[1].parent='self';s.capacity=1001;assert.throws(()=>A.pack(s),/容量/);});

test('standard Python ZIP reader validates our archive, and its deflated repack imports correctly',async()=>{const {execFileSync}=require('node:child_process'),state=data(260,500),bytes=A.pack(state);const output=execFileSync('python',['-c',`import sys,zipfile,io,base64
raw=base64.b64decode(sys.stdin.read());source=zipfile.ZipFile(io.BytesIO(raw));assert source.testzip() is None
target=io.BytesIO()
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
 for name in source.namelist():z.writestr(name,source.read(name))
print(base64.b64encode(target.getvalue()).decode())`],{input:Buffer.from(bytes).toString('base64'),encoding:'utf8'});const imported=await A.unpack(new Uint8Array(Buffer.from(output.trim(),'base64')));assert.deepEqual(imported.state,state);});
