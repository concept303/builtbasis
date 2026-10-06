import {expect,it} from 'vitest';
function luminance(hex:string){const channels=hex.match(/[a-f\d]{2}/gi)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return channels[0]!*.2126+channels[1]!*.7152+channels[2]!*.0722;}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
it.each([['27313f','ffffff'],['616b78','f5f6f8'],['315dc8','ffffff'],['8a2f6e','f8ebf3'],['a3322c','fdeeec'],['264da0','eaf0fd'],['86520c','fff3d9'],['326843','e9f4eb'],['505b69','edf0f3'],['74491c','fff5e5'],['5e4413','ffffff']])('approved foreground %s on %s meets normal-text contrast',(foreground,background)=>{expect(contrast(foreground,background)).toBeGreaterThanOrEqual(4.5);});
it('blue focus ring meets non-text contrast on the page',()=>{expect(contrast('315dc8','f5f6f8')).toBeGreaterThanOrEqual(3);});
