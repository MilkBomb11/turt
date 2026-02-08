class JumpContext {
    public condLabel?:string;
    public exitLabel?:string;
    constructor(public parent?:JumpContext) {}

    defineCondLabel(condLabel:string) {this.condLabel = condLabel;}
    defineExitLabel(exitLabel:string) {this.exitLabel = exitLabel;}
    getCondLabel() : string | undefined {
        if (this.condLabel !== undefined) {return this.condLabel;}
        return this.parent?.getCondLabel();
    }
    getExitLabel() : string | undefined {
        if (this.exitLabel !== undefined) {return this.exitLabel;}
        return this.parent?.getExitLabel();
    }
}

export { JumpContext }