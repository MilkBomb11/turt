function toHex32(n: number): string {
    const unsigned32 = n >>> 0;     
    const hex = unsigned32.toString(16);
    return hex.padStart(8, '0');
}

function toHex8(n:number) : string {
    const unsigned32 = (n & 0xFF) >>> 0;     
    const hex = unsigned32.toString(16);
    return hex.padStart(2, '0');
}

class Memory {
    memory: string[]
    constructor() {this.memory = []}

    allocate(n:number) : number {
        const res = this.memory.length;
        for (let i = 0; i < n; i++) {this.memory.push("00");}
        return res;
    }

    storeByte (idx:number, val:number) : void {this.memory[idx] = toHex8(val);}
    loadByte (idx:number) : number {
        const val = parseInt(this.memory[idx], 16);
        return (val << 24) >> 24;
    }
    storeWord (idx:number, val:number) : void {
        const bigEndian = toHex32(val);
        const littleEndian = [bigEndian.slice(6, 8),bigEndian.slice(4, 6),bigEndian.slice(2, 4),bigEndian.slice(0, 2)];
        for (let i = 0; i < 4; i++) {this.memory[idx+i] = littleEndian[i];}
    }
    loadWord (idx:number) : number {
        let littleEndian: string = "";
        for (let i = 0; i < 4; i++) {littleEndian += this.memory[idx+i];}
        const bigEndian = littleEndian.slice(6, 8) + littleEndian.slice(4,6) + littleEndian.slice(2,4) + littleEndian.slice(0,2);
        return parseInt(bigEndian, 16) | 0;
    }
}

export { Memory }