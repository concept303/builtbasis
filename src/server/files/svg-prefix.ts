/** UTF-8 XML prolog recognition only, not document validation. Constant memory;
 * no decoding of entities, DTD loading, or buffering of comments/declarations.
 * Once the first root is identified, the rest of the file is not inspected.
 */
export class SvgPrefix {
  private state = 'start';
  private token = '';
  private quote = 0;
  private depth = 0;
  private declared = false;
  private returnState = 'space';
  private result: boolean | undefined;

  get isSvg(): boolean { return this.result === true; }

  write(bytes: Uint8Array): void {
    for (const byte of bytes) {
      if (this.result !== undefined) break;
      this.consume(byte);
    }
  }

  private consume(b: number): void {
    const c = String.fromCharCode(b);
    const whitespace = b === 32 || b === 9 || b === 10 || b === 13;
    const fail = () => { this.result = false; };
    switch (this.state) {
      case 'start':
        this.state = b === 0xef ? 'bom2' : 'space';
        if (b !== 0xef) this.consume(b);
        break;
      case 'bom2': if (b === 0xbb) this.state = 'bom3'; else fail(); break;
      case 'bom3': if (b === 0xbf) this.state = 'space'; else fail(); break;
      case 'space': if (b === 60) this.state = 'open'; else if (!whitespace) fail(); break;
      case 'open':
        this.token = '';
        this.returnState = 'space';
        if (b === 33) this.state = 'bang';
        else if (b === 63) this.state = 'piTarget';
        else { this.state = 'root'; this.consume(b); }
        break;
      case 'bang':
        this.token += c;
        if (this.token === '--') this.state = 'comment';
        else if (this.token === 'DOCTYPE' && !this.declared) { this.state = 'doctypeSpace'; this.declared = true; }
        else if (!'--'.startsWith(this.token) && !'DOCTYPE'.startsWith(this.token)) fail();
        else if (this.token.length >= 7) fail();
        break;
      case 'comment': if (b === 45) this.state = 'commentDash'; break;
      case 'commentDash': this.state = b === 45 ? 'commentEnd' : 'comment'; break;
      case 'commentEnd': if (b === 62) this.state = this.returnState; else fail(); break;
      case 'piTarget':
        if (/[A-Za-z_:]/.test(c)) this.state = 'piName'; else fail();
        break;
      case 'piName':
        if (whitespace) this.state = 'pi';
        else if (b === 63) this.state = 'piEnd';
        else if (!/[A-Za-z0-9_.:-]/.test(c)) fail();
        break;
      case 'pi': if (b === 63) this.state = 'piEnd'; break;
      case 'piEnd': this.state = b === 62 ? this.returnState : b === 63 ? 'piEnd' : 'pi'; break;
      case 'doctypeSpace':
        if (whitespace) { this.token = ''; this.state = 'doctypeName'; } else fail();
        break;
      case 'doctypeName':
        if (whitespace && !this.token) break;
        if (whitespace || b === 91 || b === 62) {
          if (this.token !== 'svg') { fail(); break; }
          this.state = 'doctype'; this.consume(b);
        } else { this.token += c; if (!'svg'.startsWith(this.token)) fail(); }
        break;
      case 'doctype':
        if (this.quote) { if (b === this.quote) this.quote = 0; break; }
        if (b === 34 || b === 39) this.quote = b;
        else if (b === 60) this.state = 'doctypeOpen';
        else if (b === 91) this.depth++;
        else if (b === 93) { if (!this.depth) fail(); else this.depth--; }
        else if (b === 62 && this.depth === 0) this.state = 'space';
        break;
      case 'doctypeOpen':
        this.returnState = 'doctype';
        if (b === 63) this.state = 'piTarget';
        else if (b === 33) this.state = 'doctypeBang';
        else { this.state = 'doctype'; this.consume(b); }
        break;
      case 'doctypeBang':
        if (b === 45) this.state = 'doctypeDash';
        else { this.state = 'doctype'; this.consume(b); }
        break;
      case 'doctypeDash': if (b === 45) this.state = 'comment'; else fail(); break;
      case 'root':
        if (whitespace || b === 62 || b === 47) {
          if (this.token !== 'svg') fail();
          else if (b === 47) this.state = 'rootSlash';
          else this.result = true;
        } else { this.token += c; if (!'svg'.startsWith(this.token)) fail(); }
        break;
      case 'rootSlash': this.result = b === 62; break;
    }
  }
}

export function hasSvgRoot(bytes: Uint8Array): boolean {
  const scanner = new SvgPrefix();
  scanner.write(bytes);
  return scanner.isSvg;
}
