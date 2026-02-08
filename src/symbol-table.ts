class SymbolTable<T> {
    private values: Map<string, T> = new Map()

    constructor (private parent?: SymbolTable<T>) {}
    
    define(name:string, value:T) {this.values.set(name, value);}

    lookup(name:string) : T | undefined {
        if (this.values.has(name)) {return this.values.get(name);}
        return this.parent?.lookup(name);
    }

    lookupCurrentScope(name:string) : T | undefined {
        if (this.values.has(name)) 
        {return this.values.get(name);}
    }
}

export { SymbolTable }
