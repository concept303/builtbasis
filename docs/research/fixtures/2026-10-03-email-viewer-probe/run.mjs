import vm from 'node:vm';
import { readFileSync } from 'node:fs';
let requests=0;
const context=vm.createContext({console,TextEncoder,TextDecoder,Blob,ReadableStream,Uint8Array,ArrayBuffer,DataView,setTimeout,clearTimeout,fetch(){requests++;throw Error('Unexpected network request');}});
const module=new vm.SourceTextModule(readFileSync(new URL('./browser-probe.mjs',import.meta.url),'utf8'),{context});
await module.link(()=>{throw Error('Unexpected external import');});
await module.evaluate();
if(requests)throw Error('Network attempted');
console.log('PASS browser-target bundle executed without Node globals, DOM, or network requests');
