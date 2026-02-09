import { TokenType } from "./token-type"
import { Token } from "./token"
import { throwError } from "./helper"

class Tokenizer {
    current:number
    start:number
    tokens:Token[]
    line:number

    static keywords = new Map([
        ["int", TokenType.Int],
        ["bool", TokenType.Bool],
        ["ptr", TokenType.Ptr],
        ["let", TokenType.Let],
        ["as", TokenType.As],
        ["alloc", TokenType.Alloc],
        ["if", TokenType.If],
        ["else", TokenType.Else],
        ["fn", TokenType.Fn],
        ["true", TokenType.True],
        ["false", TokenType.False],
        ["while", TokenType.While],
        ["return", TokenType.Return],
        ["break", TokenType.Break],
        ["continue", TokenType.Continue],
    ])

    constructor (public source:string) {
        this.current = 0;
        this.start = 0;
        this.line = 1;
        this.tokens = [];
    }

    tokenizeAll() : Token[] {
        while (!this.isEnd()) {
            this.start = this.current;
            this.tokenize()
        }
        this.appendToken(TokenType.Eof);
        return this.tokens;
    }

    tokenize() {
        let c = this.advance()
        switch (c) {
            case '(': this.appendToken(TokenType.LParen); break;
            case ')': this.appendToken(TokenType.RParen); break;
            case '{': this.appendToken(TokenType.LBrace); break;
            case '}': this.appendToken(TokenType.RBrace); break;
            case ',': this.appendToken(TokenType.Comma); break;
            case ';': this.appendToken(TokenType.Semicolon); break;
            case ':': this.appendToken(TokenType.Colon); break;
            case '+': this.appendToken(TokenType.Plus); break;
            case '-': this.appendToken(TokenType.Minus); break;
            case '*': this.appendToken(TokenType.Star); break;
            case '\n': this.line++; break;
            case '\t': case ' ': case'\r' : break;
            case '!': this.match('=') ? this.appendToken(TokenType.BangEqual) : this.appendToken(TokenType.Bang); break;
            case '=': this.match('=') ? this.appendToken(TokenType.EqualEqual) : this.appendToken(TokenType.Equal); break;
            case '<': this.match('=') ? this.appendToken(TokenType.LessEqual) : this.appendToken(TokenType.Less); break;
            case '>': this.match('=') ? this.appendToken(TokenType.GreaterEqual) : this.appendToken(TokenType.Greater); break;
            case '/': 
                if (this.match ('*')) {
                    while (!this.isEnd() && !(this.match('*') && this.match('/'))) 
                    {this.advance();}
                }
                else if (this.match('/')) {
                    while (!this.isEnd() && !this.match('\n')) 
                    {this.advance();}
                }
                else {this.appendToken(TokenType.Slash);}
                break;
            case '&': this.match('&') ? this.appendToken(TokenType.AmpAmp) : this.appendToken(TokenType.Ampersan); break;
            case '|': 
                if (this.match('|')) {this.appendToken(TokenType.VertBarVertBar);}
                else {throwError(this.line, "Expected '|' after '|'.")}
                break;
            default:
                if (this.isDigit(c!)) {
                    while (!this.isEnd() && this.isDigit(this.peek()!)) {this.current++;}
                    let slice = this.source.slice(this.start, this.current);
                    let num = parseInt(slice)!
                    this.appendToken(TokenType.Number, num);
                }
                else if (this.isAlpha(c!)) {
                    while (!this.isEnd() && this.isAlphaNumeric(this.peek()!)) {this.current++;}
                    let slice = this.source.slice(this.start, this.current);
                    if (Tokenizer.keywords.has(slice)) {this.appendToken(Tokenizer.keywords.get(slice)!)}
                    else {this.appendToken(TokenType.Identifier, slice)}
                }
                else { throwError(this.line, `Unexpected character ${this.peek()}.`);}
                break;
        }
    }

    advance() : string | undefined {return this.source[this.current++];}
    peek() : string | undefined {return this.source[this.current];}
    isEnd() : boolean {return this.current >= this.source.length;}

    isDigit(c:string) : boolean {return c.charCodeAt(0) >= '0'.charCodeAt(0) && c.charCodeAt(0) <= '9'.charCodeAt(0)}
    isAlpha(c:string) : boolean {
        let charCode = c.charCodeAt(0);
        return charCode >= 'a'.charCodeAt(0) && charCode <= 'z'.charCodeAt(0) ||
               charCode >= 'A'.charCodeAt(0) && charCode <= 'Z'.charCodeAt(0) ||
               charCode === '_'.charCodeAt(0);
    }
    isAlphaNumeric(c:string) : boolean {return this.isDigit(c) || this.isAlpha(c);}

    match(c:string) : boolean {
        if (this.peek() === c) {this.advance(); return true;}
        return false;
    }

    eat(c:string) : void {
        if (this.peek() === c) {this.advance(); return;}
        throwError(this.line, `Expected ${c} but got ${this.peek()}`);
    }

    appendToken(type:TokenType, value?:boolean|number|string) : void {
        if (value === undefined) {this.tokens.push(new Token(this.line, type));}
        else {this.tokens.push(new Token(this.line, type, value));}
    }

    printTokens() : void {
        for (let i = 0; i < this.tokens.length; i++) {
            const element = this.tokens[i];
            console.log(element!.toString());
        }
    }
}

export { Tokenizer }


