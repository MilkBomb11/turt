# turt

turt is a statically typed imperative toy language. <br>
It supports pointers, int, bool, and functions.

You can play around with it <a href="https://milkbomb11.github.io/turt/">here</a>.

Here are some snippets of valid turt code.
```
fn add(x:int, y:int) : int {
    return x + y;
}

let i: int = 0;
while (i < 10) {
    i = i + 1;
    print (add(i, i+1));
}
```

```
let x: ptr<int> = alloc(4*5) as ptr<int>;
let i: int = 0;
while (i < 5) {
  *(x + i) = i * i;
  i = i + 1;
}

let p: ptr<int> = x;
while (p < x + 5) {
  print(*p);
  p = p + 1;
}
```

```
fn fib(n:int) : int {
  if (n <= 1) {return 1;}
  return fib(n - 1) + fib(n - 2);
}

print(fib(5));
```

```
fn is_odd(n:int) : bool {
  if (n == 1) {return true;}
  else if (n == 2) {return false;}
  else {return is_even(n-1); }  
}

fn is_even(n:int) : bool {
  if (n == 1) {return false;}
  else if (n == 2) {return true;}
  else {return is_odd(n-1);}
}

print(is_even(6));
```

The EBNF is as below.
```
<program>    ::= <stmts>
<stmt>       ::= <if> 
                | <block> 
                | <while> 
                | <break> 
                | <continue> 
                | <var_decl> 
                | <fn_decl> 
                | <return> 
                | <expr_stmt>
<stmts>      ::= <stmt>* 

<if>         ::= 'if' <expr> <stmt> | 'if' <expr> <stmt> 'else' <stmt> 
<while>      ::= 'while' <expr> <stmt>
<block>      ::= '{' <stmts> '}'
<break>      ::= 'break' ';'
<continue>   ::= 'continue' ';'
<expr_stmt>  ::= <expr> ';'
<return>     ::= 'return' <expr> ';'
<var_decl>   ::= 'let' <ntp> '=' <expr> ';'
<fn_decl>    ::= 'fn' <name> '(' <params>? ')' ':' <type> <stmt>
<params>     ::= <ntp> (',' <ntp>)*

<expr>       ::= <assignment>
<assignment> ::= <name> '=' <assignment> | '*'<atom> '=' <assignment> | <logical>
<logcial>    ::= <equality> (<lop> <equality>)*
<equality>   ::= <comparison> (<eop> <comparison>)*
<comparison> ::= <term> (<cop> <term>)*
<term>       ::= <factor> (<top> <factor>)*
<factor>     ::= <factor> (<fop> <cast>)*
<cast>       ::= <unary> ('as' <type>)*
<unary>      ::= <unop> <unary> | '&' <name> | <call>
<call>       ::= <name> '(' <call_args>? ')'  | <atom>
<call_args>  ::= <expr> (',' <expr>)*
<atom>       ::= '(' <expr> ')' | <name> | <number> | 'true' | 'false'

<lop>        ::= '&&' | '||'
<eop>        ::= '==' | '!='
<cop>        ::= '<' | '<=' | '>' | '>='
<top>        ::= '+' | '-'
<fop>        ::= '*' | '/'
<unop>       ::= '-' | '!' | '*' | 'alloc'

<digit>      ::= [0-9]
<alpha>      ::= [a-zA-Z_]
<number>     ::= digit+
<name>       ::= <alpha>(<alpha>|<digit>)*

<ntp>        ::= <name> ':' <type>
<type>       ::= 'ptr' '<' <type> '>' | <type_atom>
<type_atom>  ::= 'int' | 'bool'
```
