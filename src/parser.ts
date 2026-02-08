import { AST } from "./ast";
import { throwError } from "./helper";
import { Token } from "./token";
import { TokenType } from "./token-type";
import { NameTypePair, Type } from "./type";

class Parser {
    current: number
    previous: number
    constructor (public tokens:Token[]) {
        this.current = 0;
        this.previous = 0;
    }

    parse() {
        let stmts: AST.Stmt[] = [];
        while (!this.match([TokenType.Eof])) {
            stmts.push(this.statement());
        }
        return stmts;
    }

    private statement() : AST.Stmt {
        if (this.match([TokenType.If])) {return this.if_statement();}
        if (this.match([TokenType.While])) {return this.while_statement();}
        if (this.match([TokenType.Fn])) {return this.fn_decl();}
        if (this.match([TokenType.Return])) {return this.return_statement();}
        if (this.match([TokenType.Break])) {return this.break_statement();}
        if (this.match([TokenType.Continue])) {return this.continue_statement();}
        if (this.match([TokenType.Let])) {return this.vardecl_statement();}
        if (this.match([TokenType.LBrace])) {return this.block_statement();}
        return this.expression_statement();
    }

    private vardecl_statement(): AST.Stmt {
        this.eat(TokenType.Identifier);
        let var_name = this.peekPrevious().value;
        if (typeof var_name !== "string") {throwError(this.peekPrevious().lineNum, `Invalid variable name ${var_name}`);}
        this.eat(TokenType.Colon);
        let type = this.type();
        this.eat(TokenType.Equal);
        let expr = this.expression();
        this.eat(TokenType.Semicolon);
        return AST.VarDecl(this.peekPrevious().lineNum, NameTypePair(var_name, type), expr);
    }

    private if_statement() : AST.Stmt {
        let cond = this.expression();
        let condLineNum = this.peekPrevious().lineNum;
        let true_arm = this.statement();
        if (this.match([TokenType.Else])) {
            let false_arm = this.statement();
            return AST.If(condLineNum, cond, true_arm, false_arm);
        }
        return AST.If(condLineNum, cond, true_arm, AST.ExprStmt(this.peekPrevious().lineNum, AST.Const(this.peekPrevious().lineNum, 0)));
    }

    private while_statement() : AST.Stmt {
        let cond = this.expression();
        let condLineNum = this.peekPrevious().lineNum;
        let body = this.statement();
        return AST.While(condLineNum, cond, body);
    }

    private fn_decl() : AST.Stmt {
        this.eat(TokenType.Identifier);
        let lineNum = this.peekPrevious().lineNum;
        let callee_name = this.peekPrevious().value;
        if (typeof callee_name !== "string") {throwError(this.peekPrevious().lineNum, `Invalid function name ${callee_name}`);}

        this.eat(TokenType.LParen);
        let args = this.fn_args();
        this.eat(TokenType.Colon);
        let return_type = this.type();
        let body = this.statement();
        return AST.FnDecl(lineNum, callee_name, args, body, return_type);
    }

    private fn_args() : NameTypePair[] {
        if (this.match([TokenType.RParen])) {return [];}
        this.eat(TokenType.Identifier);
        let first_name = this.peekPrevious().value;
        if (typeof first_name !== "string") {throwError(this.peekPrevious().lineNum,`Invalid parameter name ${first_name}`)}

        this.eat(TokenType.Colon);
        let first_type = this.type();

        let args = [NameTypePair(first_name, first_type)];
        while (this.match([TokenType.Comma])) {
            this.eat(TokenType.Identifier);
            let name = this.peekPrevious().value;
            if (typeof name !== "string") {throwError(this.peekPrevious().lineNum, `Invalid parameter name ${name}`);}

            this.eat(TokenType.Colon);
            let type = this.type();
            args.push(NameTypePair(name, type));
        }
        this.eat(TokenType.RParen);
        return args;
    }

    private block_statement() : AST.Stmt {
        let stmts: AST.Stmt[] = []
        while (!this.match([TokenType.RBrace, TokenType.Eof])) {
            stmts.push(this.statement())
        }
        if (this.peekPrevious().type !== TokenType.RBrace) {throwError(this.peekPrevious().lineNum, `Couldn't close braces`);}
        return AST.Block(this.peekPrevious().lineNum, stmts);
    }

    private return_statement() {
        let e = this.expression();
        this.eat(TokenType.Semicolon);
        return AST.Return(this.peekPrevious().lineNum, e);
    }

    private break_statement() {
        this.eat(TokenType.Semicolon);
        return AST.Break(this.peekPrevious().lineNum);
    }

    private continue_statement() {
        this.eat(TokenType.Semicolon);
        return AST.Continue(this.peekPrevious().lineNum);
    }

    private expression_statement() {
        let e = this.expression();
        this.eat(TokenType.Semicolon);
        return AST.ExprStmt(this.peekPrevious().lineNum, e)
    }

    private expression() : AST.Expr {return this.assignment();}

    private assignment() : AST.Expr {
        let e = this.logical();
        if (this.match([TokenType.Equal])) {
            if (e.kind === "Var") {e = AST.Assign(this.peekPrevious().lineNum, e.name, this.assignment());}
            else if (e.kind === "Deref") {e = AST.PtrUpdate(this.peekPrevious().lineNum, e.operand, this.assignment());}
            else {throwError(this.peekPrevious().lineNum, `Invalid target for assignment ${AST.stringOfExpr(e)}.`);}
        }
        return e;
    }

    private logical() : AST.Expr {
        let e = this.equality();
        while (this.match([TokenType.AmpAmp, TokenType.VertBarVertBar])) {
            e = AST.BinOp(this.peekPrevious().lineNum, e, this.peekPrevious().type, this.equality());
        }
        return e;
    }

    private equality() : AST.Expr {
        let e = this.comparison();
        while (this.match([TokenType.EqualEqual, TokenType.BangEqual])) {
            e = AST.BinOp(this.peekPrevious().lineNum, e, this.peekPrevious().type, this.comparison());
        }
        return e;
    }

    private comparison() : AST.Expr {
        let e = this.term();
        while (this.match([TokenType.Less, TokenType.LessEqual, TokenType.Greater, TokenType.GreaterEqual])) {
            e = AST.BinOp(this.peekPrevious().lineNum, e, this.peekPrevious().type, this.term());
        }
        return e;
    }

    private term() : AST.Expr {
        let e = this.factor();
        while (this.match([TokenType.Plus, TokenType.Minus])) {
            e = AST.BinOp(this.peekPrevious().lineNum, e, this.peekPrevious().type, this.factor());
        }
        return e;
    }

    private factor() : AST.Expr {
        let e = this.cast();
        while (this.match([TokenType.Star, TokenType.Slash])) {
            e = AST.BinOp(this.peekPrevious().lineNum, e, this.peekPrevious().type, this.cast());
        }
        return e;
    }

    private cast() : AST.Expr {
        let e = this.unary();
        while (this.match([TokenType.As])) {
            let type = this.type();
            e = AST.Cast(this.peekPrevious().lineNum, e, type)
        }
        return e;
    }

    private unary() : AST.Expr {
        if (this.match([TokenType.Minus, TokenType.Plus, TokenType.Bang, TokenType.Alloc])) {
            let e = AST.UnOp(this.peekPrevious().lineNum, this.peekPrevious().type, this.unary());
            return e;
        }
        if (this.match([TokenType.Star])) {
            let e = AST.Deref(this.peekPrevious().lineNum, this.unary());
            return e;
        }
        if (this.match([TokenType.Ampersan])) {
            this.eat(TokenType.Identifier);
            let var_name = this.peekPrevious().value;
            if (typeof var_name !== "string") {
                throwError(this.peekPrevious().lineNum, `Expected variable name as operand of & but got ${var_name}`);
            }
            return AST.AddrOf(this.peekPrevious().lineNum, var_name);
        }
        return this.call();
    }

    private call() : AST.Expr {
        let e = this.primary();
        if (this.match([TokenType.LParen])) {
            if (e.kind === "Var") {e = AST.Call(this.peekPrevious().lineNum, e.name, this.callArgs());}
            else {throwError(this.peekPrevious().lineNum, `Invalid target to call ${AST.stringOfExpr(e)}.`);}
        }
        return e;
    }

    private callArgs() : AST.Expr[] {
        if (this.match([TokenType.RParen])) {return [];}
        let exprs = [this.expression()];
        while (this.match([TokenType.Comma])) {
            let e = this.expression();
            exprs.push(e);
        }
        this.eat(TokenType.RParen);
        return exprs;
    }

    private primary() : AST.Expr {
        if (this.match([TokenType.True])) {return AST.Const(this.peekPrevious().lineNum, true);}
        if (this.match([TokenType.False])) {return AST.Const(this.peekPrevious().lineNum, false);}
        if (this.match([TokenType.Number])) {
            let value = this.peekPrevious().value;
            if (typeof value !== "number") {
                throwError(this.peekPrevious().lineNum, `Number expected to have value of number but has ${value}`)
            }
            return AST.Const(this.peekPrevious().lineNum, value);
        }
        if (this.match([TokenType.Identifier])) {
            let varName = this.peekPrevious().value;
            if (typeof varName !== "string") {
                throwError(this.peekPrevious().lineNum, `Identifier expected to have value of string but has ${varName}`);
            }
            return AST.Var(this.peekPrevious().lineNum, varName);
        }
        if (this.match([TokenType.LParen])) {
            let e = this.expression();
            this.eat(TokenType.RParen);
            return e;
        }
        throwError(this.peek().lineNum, `Unexpected symbol ${this.peek()}`)
    }

    type(): Type.Type {return this.type_ptr();}

    type_ptr(): Type.Type {
        if (this.match([TokenType.Ptr])) {
            this.eat(TokenType.Less);
            let t = this.type();
            this.eat(TokenType.Greater);
            return Type.Ptr(t);
        }
        return this.type_primary();
    }

    type_primary(): Type.Type {
        if (this.match([TokenType.Int])) {return Type.Int;}
        if (this.match([TokenType.Bool])) {return Type.Bool;}
        throwError(this.peek().lineNum, `Invalid type symbol ${this.peek()}`);
    }
    

    advance() : Token {return this.tokens[this.current++];}
    peek() : Token {return this.tokens[this.current];}
    peekPrevious() : Token {return this.tokens[this.current-1];}
    
    match(types:TokenType[]) : boolean {
        for (const type of types) {
            if (this.peek().type === type) 
            {this.advance(); return true;}
        }
        return false;
    }

    eat(type:TokenType) : void {
        if (this.peek().type === type) {this.advance(); return;}
        throwError(this.peek().lineNum, `Expected ${type}, but got ${this.peek()}`)
    }
}

export { Parser }