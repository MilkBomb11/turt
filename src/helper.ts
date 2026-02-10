function assertUnreachable(x: never): never {
  throw new Error(`Did not expect to get here with value: ${x}`);
}

function throwError(lineNum:number, msg:string): never {
  throw new Error(`line[${lineNum}]: ${msg}.`);
} 

function bool2Int (b:boolean) : number {
        if (b) {return 1;}
        return 0;
}

let regNum = 0;
let createReg = () => {return `%r${regNum++}`;}
let resetRegNum = () => {regNum = 0;}
let labelNum = 0;
let createLabel = () => {return `.L${labelNum++}`;}
let resetLabelNum = () => {labelNum = 0;}


export { throwError, assertUnreachable, createReg, createLabel, resetRegNum, resetLabelNum, bool2Int }