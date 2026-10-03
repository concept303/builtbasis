import PostalMime from 'postal-mime';
import MsgModule from '@kenjiuno/msgreader';
import { Parser } from 'htmlparser2';
import { burn } from '@kenjiuno/msgreader/lib/Burner.js';
const MsgReader = MsgModule.default ?? MsgModule;
const check = (ok, message) => { if (!ok) throw Error(message); };
function plain(html) {
 let skip = 0, text = '';
 const hidden = new Set(['script', 'style', 'template']);
 const breaks = new Set(['p','div','br','li','tr']);
 const p = new Parser({
  onopentag(name) { if (hidden.has(name)) skip++; if (!skip && breaks.has(name)) text += '\n'; },
  ontext(value) { if (!skip) text += value; },
  onclosetag(name) { if (hidden.has(name)) skip--; if (!skip && breaks.has(name)) text += '\n'; }
 }, { decodeEntities: true });
 p.write(html); p.end(); return text.trim();
}
const raw = [
 'From: Sender <sender@example.test>',
 'To: Recipient <recipient@example.test>',
 'Subject: =?UTF-8?B?U3ludGhldGljIOKckw==?=',
 'MIME-Version: 1.0',
 'Content-Type: multipart/mixed; boundary=outer', '',
 '--outer', 'Content-Type: text/html; charset=utf-8', '',
 '<p>Hello &amp; safe</p><img src="https://tracker.invalid/pixel"><script>evil()</script>',
 '--outer', 'Content-Type: message/rfc822', 'Content-Disposition: attachment; filename="nested.eml"', '',
 'Subject: Nested synthetic', 'Content-Type: text/plain', '', 'Nested body',
 '--outer--', ''
].join('\r\n');
const email = await PostalMime.parse(new TextEncoder().encode(raw), {forceRfc822Attachments:true,maxRfc822NestingDepth:0,maxNestingDepth:32,maxHeadersSize:262144});
check(email.subject === 'Synthetic ✓', 'decoded EML subject');
check(plain(email.html) === 'Hello & safe', 'HTML-only safe text');
check(email.attachments.length === 1 && email.attachments[0].filename === 'nested.eml', 'nested email attachment');
check(new TextDecoder().decode(email.attachments[0].content).includes('Nested body'), 'nested local download bytes');
const utf16 = s => { const out = new Uint8Array((s.length+1)*2); const v=new DataView(out.buffer); for(let i=0;i<s.length;i++)v.setUint16(i*2,s.charCodeAt(i),true);return out; };
const values = [['__substg1.0_0037001F','Synthetic MSG ✓'],['__substg1.0_1000001F','Synthetic plain body'],['__substg1.0_0C1A001F','Synthetic sender']];
const entries = [{name:'Root Entry',type:5,children:[1,2,3],length:0},...values.map(([name,value])=>{const bytes=utf16(value);return {name,type:2,length:bytes.length,binaryProvider:()=>bytes};})];
const bytes = burn(entries);
const msg = new MsgReader(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)).getFileData();
check(msg.subject === 'Synthetic MSG ✓','MSG unicode subject');
check(msg.body === 'Synthetic plain body','MSG plain body');
check(msg.senderName === 'Synthetic sender','MSG sender');
console.log(JSON.stringify({emlSubject:email.subject,htmlText:plain(email.html),nestedAttachment:email.attachments[0].filename,msgSubject:msg.subject,msgBody:msg.body,msgBytes:bytes.length,networkRequests:0}));
