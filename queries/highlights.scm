"-" @operator
"--" @operator
"-=" @operator
"=" @operator
"*" @operator
"+" @operator
"++" @operator
"+=" @operator
"~~" @operator
"<" @operator
"<=" @operator
"==" @operator
"~=" @operator
">" @operator
">=" @operator
"&" @operator
"&&" @operator
"|" @operator
"||" @operator
"^" @operator
"^^" @operator

(p_ident
  (ident) @type
)

(
 (ident) @type.constant 
 (#match? @type.constant "^[fs]?[1248]$")
)

(ident) @variable


(
    (function_call 
      name: (_) @function.method
    )
    (#eq? @function.method "\$[a-zA-Z_][a-zA-Z0-9_]*")
)

(
    (function_call 
      name: (_) @function
    )
    (#eq? @function "![a-zA-Z_][a-zA-Z0-9_]*")
)

(comment) @comment

(int) @number
(float) @number
(string) @string
"size" @function.builtin

; (assign 
;     name: (_) @variable
; )
;
; (static_assign 
;   name: (_) @constant
; )

(static_alloc
  name: (_) @constant
  type: [(ident) (p_ident (ident) @type)] @type
)

(data
    [
     "const"
     "init"
     "static"
     "struct"
    ]
    @keyword
    name: (ident) @type
    (static_assign 
      name: (ident) @constant.builtin)*    
)

; (macro_declaration
;   name: (_) @constant
;   type: (ident) @type
; )

; (binary_expr
;   op: _ @operator
;   [
;     type: (ident) @type
;     type: (#match? /^[fs]?[1248]$/) @type.builtin
;   ]
; )

; (label
;   name: (ident) @label
; )


[ "(" ")" "{" "}" ] @punctuation.bracket
[ "---" "@" ":" "," ] @punctuation.delimiter

"->" @constant.builtin
"." @constant
[ "[" "]" ] @constant.builtin
