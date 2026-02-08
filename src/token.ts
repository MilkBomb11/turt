import { TokenType } from "./token-type";

class Token {
    constructor(public lineNum:number, public type:TokenType, public value?:boolean|number|string) {}

    toString() {
        if (this.value !== undefined) {return `${this.type}(${this.value})`}
        else {return this.type;}
    }
}

export { Token }