/* 小型离线 Markdown：所有原文先转义，只允许显式 HTTP(S)/邮件链接，不执行 HTML。 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioMarkdown=api;})(typeof globalThis==='undefined'?this:globalThis,()=>{
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeLink(url){return /^(?:https?:\/\/|mailto:)[^\s<>]+$/i.test(url)&&!/[\u0000-\u001f]/.test(url)?url:null;}
  function inline(text,depth=0){
    if(depth>5)return esc(text);let out='',cursor=0;const tokens=/(`+)([^`\n]+)\1|\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^\n]+?)\*\*|__([^\n]+?)__|~~([^\n]+?)~~|\*([^*\n]+?)\*/g;let m;
    while((m=tokens.exec(text))){out+=esc(text.slice(cursor,m.index));if(m[1])out+='<code>'+esc(m[2])+'</code>';else if(m[3]){const url=safeLink(m[4]);out+=url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+inline(m[3],depth+1)+'</a>':esc(m[0]);}else if(m[5]||m[6])out+='<strong>'+inline(m[5]||m[6],depth+1)+'</strong>';else if(m[7])out+='<del>'+inline(m[7],depth+1)+'</del>';else out+='<em>'+inline(m[8],depth+1)+'</em>';cursor=tokens.lastIndex;}return out+esc(text.slice(cursor));
  }
  function render(value){
    const lines=String(value||'').replace(/\r\n?/g,'\n').split('\n'),out=[];let i=0;
    const cells=s=>s.trim().replace(/^\||\|$/g,'').split('|').map(v=>v.trim());
    while(i<lines.length){const line=lines[i];if(!line.trim()){i++;continue;}
      const fence=line.match(/^\s*(`{3,}|~{3,})([\w+-]*)\s*$/);if(fence){const content=[];i++;while(i<lines.length&&!lines[i].trim().startsWith(fence[1]))content.push(lines[i++]);i++;out.push('<pre><code>'+esc(content.join('\n'))+'</code></pre>');continue;}
      const heading=line.match(/^(#{1,6})\s+(.+)$/);if(heading){const level=Math.min(6,heading[1].length+1);out.push('<h'+level+'>'+inline(heading[2])+'</h'+level+'>');i++;continue;}
      if(/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)){out.push('<hr>');i++;continue;}
      if(i+1<lines.length&&line.includes('|')&&/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i+1])){const headers=cells(line);i+=2;const rows=[];while(i<lines.length&&lines[i].includes('|')&&lines[i].trim())rows.push(cells(lines[i++]));out.push('<div class="chat-table-scroll"><table><thead><tr>'+headers.map(c=>'<th>'+inline(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+headers.map((_,n)=>'<td>'+inline(row[n]||'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');continue;}
      if(/^\s*>/.test(line)){const quote=[];while(i<lines.length&&/^\s*>/.test(lines[i]))quote.push(lines[i++].replace(/^\s*>\s?/,''));out.push('<blockquote>'+render(quote.join('\n'))+'</blockquote>');continue;}
      const item=line.match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/);if(item){const ordered=Boolean(item[2]),tag=ordered?'ol':'ul',items=[];while(i<lines.length){const next=lines[i].match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/);if(!next||Boolean(next[2])!==ordered)break;items.push('<li>'+inline(next[3])+'</li>');i++;}out.push('<'+tag+(ordered?' start="'+Number(item[2])+'"':'')+'>'+items.join('')+'</'+tag+'>');continue;}
      const paragraph=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^(?:#{1,6}\s|\s*>|\s*[-+*]\s|\s*\d+[.)]\s|\s*`{3}|\s*~{3})/.test(lines[i]))paragraph.push(lines[i++]);out.push('<p>'+paragraph.map(v=>inline(v)).join('<br>')+'</p>');
    }return out.join('');
  }
  return {render,inline,safeLink};
});
