/* Portable relationship ZIP. Standard stored entries; bounded import also accepts deflated entries. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./relationship-core.js'));else root.FolioRelationshipArchive=factory(root.FolioRelationshipCore);})(globalThis,C=>{
 'use strict';const LIMIT=32*1024*1024,enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
 const table=Array.from({length:256},(_,v)=>{for(let j=0;j<8;j++)v=v&1?0xedb88320^(v>>>1):v>>>1;return v>>>0;});
 const crc=bytes=>{let v=0xffffffff;for(const b of bytes)v=table[(v^b)&255]^(v>>>8);return (v^0xffffffff)>>>0;};
 const uint=(view,offset,value,size=4)=>size===2?view.setUint16(offset,value,true):view.setUint32(offset,value,true);
 function pack(raw){const state=C.restore(raw),parts=[];for(let i=0;i<state.nodes.length;i+=C.STEP)parts.push({name:`segments/${String(parts.length).padStart(3,'0')}.json`,data:enc.encode(JSON.stringify(state.nodes.slice(i,i+C.STEP)))});
  const {nodes,...header}=state,manifest={format:'folio-relationships',version:1,createdAt:new Date().toISOString(),state:header,nodeCount:nodes.length,segments:parts.map(p=>p.name)};
  parts.unshift({name:'manifest.json',data:enc.encode(JSON.stringify(manifest,null,2))});
  let offset=0;const local=[],central=[];
  for(const p of parts){const name=enc.encode(p.name),sum=crc(p.data),a=new Uint8Array(30+name.length),v=new DataView(a.buffer);uint(v,0,0x04034b50);uint(v,4,20,2);uint(v,6,0x800,2);uint(v,14,sum);uint(v,18,p.data.length);uint(v,22,p.data.length);uint(v,26,name.length,2);a.set(name,30);local.push(a,p.data);
   const b=new Uint8Array(46+name.length),w=new DataView(b.buffer);uint(w,0,0x02014b50);uint(w,4,20,2);uint(w,6,20,2);uint(w,8,0x800,2);uint(w,16,sum);uint(w,20,p.data.length);uint(w,24,p.data.length);uint(w,28,name.length,2);uint(w,42,offset);b.set(name,46);central.push(b);offset+=a.length+p.data.length;
  }
  const size=central.reduce((n,p)=>n+p.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);uint(v,0,0x06054b50);uint(v,8,parts.length,2);uint(v,10,parts.length,2);uint(v,12,size);uint(v,16,offset);
  const total=offset+size+22;if(total>LIMIT)throw Error('关系网ZIP超过32MB，未导出');const result=new Uint8Array(total);let at=0;for(const part of [...local,...central,end]){result.set(part,at);at+=part.length;}return result;
 }
 async function inflate(bytes,size){if(typeof DecompressionStream==='undefined')throw Error('此设备暂不支持这种压缩方式，请使用Folio导出的ZIP');let stream;try{stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));}catch{throw Error('此设备暂不支持这种压缩方式，请使用Folio导出的ZIP');}const reader=stream.getReader(),out=[];let total=0;try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>size||total>LIMIT)throw Error('ZIP解压长度异常');out.push(value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}if(total!==size)throw Error('ZIP分段长度不一致');const result=new Uint8Array(total);let at=0;for(const b of out){result.set(b,at);at+=b.length;}return result;}
 async function unpack(input){try{return await parse(input);}catch(e){if(e instanceof RangeError||e instanceof SyntaxError||e instanceof TypeError)throw Error('关系网ZIP损坏或格式不兼容，未覆盖本机数据');throw e;}}
 async function parse(input){const bytes=input instanceof Uint8Array?input:new Uint8Array(input);if(bytes.length<22||bytes.length>LIMIT)throw Error('关系网ZIP为空或超过32MB');const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u16=o=>v.getUint16(o,true),u32=o=>v.getUint32(o,true);let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(u32(i)===0x06054b50&&i+22+u16(i+20)===bytes.length){end=i;break;}
  if(end<0||u16(end+4)||u16(end+6)||u16(end+8)!==u16(end+10))throw Error('不是支持的单卷ZIP');const count=u16(end+10),start=u32(end+16),centralSize=u32(end+12);if(count<2||count>9||start+centralSize!==end)throw Error('关系网ZIP目录无效');
  let at=start,total=0;const files=new Map(),spans=[];
  for(let i=0;i<count;i++){
   if(at+46>end||u32(at)!==0x02014b50)throw Error('ZIP目录损坏');const flags=u16(at+8),method=u16(at+10),sum=u32(at+16),packed=u32(at+20),size=u32(at+24),n=u16(at+28),extra=u16(at+30),comment=u16(at+32),local=u32(at+42);if(at+46+n+extra+comment>end||flags&1||![0,8].includes(method)||size>LIMIT||(total+=size)>LIMIT)throw Error('ZIP包含不支持或过大的内容');
   const name=dec.decode(bytes.subarray(at+46,at+46+n));if(!/^(manifest\.json|segments\/\d{3}\.json)$/.test(name)||files.has(name))throw Error('ZIP包含重复或不支持的文件');
   if(local+30>start||u32(local)!==0x04034b50||u16(local+8)!==method||u16(local+6)!==flags)throw Error('ZIP分段头损坏');const ln=u16(local+26),le=u16(local+28),data=local+30+ln+le,finish=data+packed;if(finish>start||dec.decode(bytes.subarray(local+30,local+30+ln))!==name||spans.some(([a,b])=>local<b&&finish>a))throw Error('ZIP分段位置无效');spans.push([local,finish]);let value=bytes.subarray(data,finish);if(method===8)value=await inflate(value,size);else if(packed!==size)throw Error('ZIP分段长度无效');if(crc(value)!==sum)throw Error('ZIP校验失败，文件可能已损坏');files.set(name,JSON.parse(dec.decode(value)));at+=46+n+extra+comment;
  }
  if(at!==end)throw Error('ZIP目录长度不一致');const m=files.get('manifest.json');if(m?.format!=='folio-relationships'||m.version!==1||!Array.isArray(m.segments)||m.segments.length!==count-1||new Set(m.segments).size!==m.segments.length)throw Error('不是Folio关系网备份');const nodes=[];
  for(let i=0;i<m.segments.length;i++){const name=`segments/${String(i).padStart(3,'0')}.json`,part=files.get(name);if(m.segments[i]!==name||!Array.isArray(part)||part.length>C.STEP||i<m.segments.length-1&&part.length!==C.STEP)throw Error('关系网分段缺失或顺序错误');nodes.push(...part);}
  if(nodes.length!==m.nodeCount)throw Error('关系网节点数不一致');return {state:C.restore({...m.state,nodes}),createdAt:m.createdAt};
 }
 return {LIMIT,pack,unpack};
});
