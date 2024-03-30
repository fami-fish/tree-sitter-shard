const PREC = {
  offset: 20,
  program: 19,
  data: 18,
  paren: 16,
  /* ++ and -- (post)
   * .  array index
   * -> member access
   * { } struct/array declaration
   */
  postfix: 14,
  /* ++ and -- (pre)
   * unary - and +
   * ~ logical NOT
   * ~~ bitwize NOT
   * & adress of
   * size <shit>
   */
  prefix: 13,
  multiplicative: 12,
  additive: 11,
  bitshift: 10,
  relational: 9,
  equality: 8,
  bitand: 7,
  bitxor: 6,
  bitor: 5,
  logical_and: 4,
  logical_xor: 3,
  logical_or: 2,
  assignment: 1,
};

const LEFT = [
  /* multiplicative arithmetic */
  ["*", PREC.multiplicative],
  ["/", PREC.multiplicative],
  ["%", PREC.multiplicative],

  /* additive arithemetic */
  ["-", PREC.additive],
  ["+", PREC.additive],

  /* bitwise shift */
  [">>", PREC.bitshift],
  ["<<", PREC.bitshift],

  /* relational comparison */
  ["<=", PREC.relational],
  [">=", PREC.relational],
  ["<", PREC.relational],
  [">", PREC.relational],

  /* equality */
  ["==", PREC.equality],
  ["~=", PREC.equality],

  /* bitwise logic */
  ["&", PREC.bitand],
  ["^", PREC.bitxor],
  ["|", PREC.bitor],

  /* logical operators */
  ["&&", PREC.logical_and],
  ["^^", PREC.logical_xor],
  ["||", PREC.logical_or],
];

const RIGHT = [
  /* assignment */
  ["*=", PREC.assignment],
  ["/=", PREC.assignment],
  ["%=", PREC.assignment],
  ["+=", PREC.assignment],
  ["-=", PREC.assignment],
  ["<<=", PREC.assignment],
  [">>=", PREC.assignment],
  ["&=", PREC.assignment],
  ["^=", PREC.assignment],
  ["|=", PREC.assignment],
];

module.exports = grammar({
  name: "shard",

  extras: ($) => [/ |\t|\r/, $.comment],
  // word: ($) => $.ident,
  conflicts: ($) => [[$.binary_expr], [$.function_call]],
  rules: {
    program: ($) =>
      seq(
        repeat("\n"),
        seq(repeat(seq($.statement, repeat1("\n"))), optional($.statement)),
      ),
    statement: ($) =>
      choice(
        $.loop,
        $.if,
        // $.function_declaration,
        // $.function_call,
        $.macro_declaration,
        $.data,
        $.assign,
        $.label,
        $.org,
        $.expr,
      ),

    loop: ($) => seq("loop", $._block, repeat(seq("then", $._block))),
    if: ($) => seq("(", $.expr, ")", $._block, repeat(seq("?", $._block))),

    data: ($) =>
      prec.left(
        PREC.data,
        choice(
          seq(
            choice("static", "const"),
            field("name", $.ident),
            choice(
              seq(
                "{",
                repeat("\n"),
                repeat(seq($.static_assign, repeat1("\n"))),
                optional($.static_assign),
                "}",
              ),
              $.ident,
            ),
          ),

          seq(
            choice("init", "struct"),
            field("name", $.ident),
            choice(
              seq(
                "{",
                repeat("\n"),
                repeat(seq($.static_alloc, repeat1("\n"))),
                optional($.static_alloc),
                "}",
              ),
              $.static_alloc,
            ),
          ),
        ),
      ),

    static_assign: ($) =>
      seq(
        field("name", $.ident),
        field("type", choice($.ident, $.p_ident)),
        "=",
        $.expr,
      ),

    static_alloc: ($) =>
      seq(field("name", $.ident), field("type", choice($.ident, $.p_ident))),

    // function_declaration: ($) =>
    //   prec(
    //     0,
    //     seq(
    //         field("name", $.ident),
    //         repeat(field("parameter", $.ident)),
    //         "->",
    //         field("return", $.type),
    //         $._function,
    //     ),
    //   ),

    function_call: ($) =>
      seq(
        field("name", /[$!][a-zA-Z_][a-zA-Z0-9_]*/),
        repeat(seq(field("arg", $.expr))),
        optional(field("arg", $.expr)),
        ",",
      ),

    macro_declaration: ($) =>
      seq(
        /#/,
        field("name", /[a-zA-Z][a-zA-Z0-9_]*/),
        field("type", choice($.ident, $.p_ident)),
        "=",
        $.expr,
      ),

    _block: ($) =>
      seq(
        "{",
        repeat("\n"),
        repeat(seq($.statement, repeat1("\n"))),
        optional($.statement),
        "}",
      ),

    org: ($) => seq("---", field("address", $.hex), "---"),
    label: ($) =>
      seq(
        field("label", $.ident),
        optional(seq("@", field("address", $.hex))),
        ":",
      ),

    assign: ($) =>
      seq(
        field("name", /[%;][a-zA-Z_][a-zA-Z0-9_]*/),
        field("type", choice($.ident, $.p_ident)),
        token.immediate("="),
        $.expr,
      ),

    ident: () => /[a-zA-Z_][a-zA-Z0-9_]*/,
    p_ident: ($) => seq("[", $.ident, "]"),
    expr: ($) =>
      choice(
        seq("(", $.expr, ")"),
        seq("[", $.expr, "]"),
        $.ident,
        $.string,
        $.int,
        $.float,

        $.binary_expr,
        $.unary_expr,
        $.function_call,
      ),

    unary_expr: ($) =>
      choice(
        ...["++", "--", "+", "-", "~", "~~", "&", "size"].map((operator) =>
          prec.right(PREC.prefix, seq(operator, $.expr)),
        ),
        ...["++", "--"].map((operator) =>
          prec.right(PREC.postfix, seq($.expr, operator)),
        ),
      ),

    binary_expr: ($) =>
      choice(
        prec.left(PREC.postfix, seq($.expr, token.immediate("->"), $.ident)),
        prec.left(PREC.postfix, seq($.expr, token.immediate("."), /\d+/)),
        ...LEFT.map(([operator, precedence]) =>
          prec.left(
            precedence,
            seq($.expr, $.ident, token.immediate(operator), $.expr),
          ),
        ),
        ...RIGHT.map(([operator, precedence]) =>
          prec.right(
            precedence,
            seq($.expr, $.ident, token.immediate(operator), $.expr),
          ),
        ),
      ),

    hex: ($) => /0x[0-9a-f_]*/,
    int: ($) => choice($.hex, /0b[01][01_]*/, /[0-9][0-9_]*/),
    float: ($) => /[0-9][0-9_]*(\.[0-9_]*)f/,

    string: ($) => /"[^"]*?"/,

    comment: () =>
      choice(seq("//", /.*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
  },
});
