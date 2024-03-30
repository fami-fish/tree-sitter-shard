const Associativity = {
  Right: 0,
  Left: 1,
};

const PREC = {
  paren: [16, Associativity.Left],
  calls: [15, Associativity.Left],
  /* ++ and -- (post)
   * .  array index
   * -> member access
   * { } struct/array declaration
   */
  postfix: [14, Associativity.Left],
  /* ++ and -- (pre)
   * unary - and +
   * ~ logical NOT
   * ~~ bitwize NOT
   * & adress of
   * size <shit>
   */
  prefix: [13, Associativity.Right],
  multiplicative: [12, Associativity.Left],
  additive: [11, Associativity.Left],
  bitshift: [10, Associativity.Left],
  relational: [9, Associativity.Left],
  equality: [8, Associativity.Left],
  bitand: [7, Associativity.Left],
  bitxor: [6, Associativity.Left],
  bitor: [5, Associativity.Left],
  logical_and: [4, Associativity.Left],
  logical_xor: [3, Associativity.Left],
  logical_or: [2, Associativity.Left],
  assignment: [1, Associativity.Right],
};

module.exports = grammar({
  name: "shard",

  extras: ($) => [/ |\t|\r/, $.comment],
  rules: {
    program: ($) => sep(repeat1("\n"), $._statement),
    _statement: ($) =>
      prec(
        17,
        choice(
          $.ident,
          $.float,
          $.intager,
          $.label,
          $.string,

          $.label,
          $.assignment,
          $._data,
          $._expr,
        ),
      ),

    _value: ($) => sep(",", choice($._literal, $.ident, "0*")),
    _literal: ($) => choice($.intager, $.float, $.string),
    _args: ($) => sep(",", seq($.ident, $.type)),
    type: ($) =>
      choice(seq(/[fs]?/, $._size), seq("[", $.type, "]")) /*!TODO: cry */,
    _size: ($) => /[1248]/,

    deref: ($) => seq("[", $._expr, "]"),

    _expr: ($) =>
      prec(
        18,
        choice(
          $._value,
          /* prioritize brackets first */
          prec.left(PREC.paren[0], seq("(", $._expr, ")")),
          unary_op($, "!", PREC.calls, false),

          prec.left(PREC.postfix[0], $._arrow_and_array),

          unary_op($, "++", PREC.postfix, false),
          unary_op($, "--", PREC.postfix, false),

          $._prefix,
          unary_op($, "+", PREC.prefix, true),
          unary_op($, "-", PREC.prefix, true),
          unary_op($, "~", PREC.prefix, true),

          binary_op($, "*", PREC.multiplicative),
          binary_op($, "/", PREC.multiplicative),
          binary_op($, "%", PREC.multiplicative),

          binary_op($, "+", PREC.additive),
          binary_op($, "-", PREC.additive),

          binary_op($, "<<", PREC.bitshift),
          binary_op($, "<<", PREC.bitshift),

          binary_op($, "<", PREC.relational),
          binary_op($, "<=", PREC.relational),
          binary_op($, ">", PREC.relational),
          binary_op($, ">=", PREC.relational),

          binary_op($, "==", PREC.equality),
          binary_op($, "~=", PREC.equality),

          binary_op($, "&", PREC.bitand),
          binary_op($, "^", PREC.bitxor),
          binary_op($, "|", PREC.bitor),

          binary_op($, "&&", PREC.bitand),
          binary_op($, "^^", PREC.bitxor),
          binary_op($, "||", PREC.bitor),

          $._assignment_op,
        ),
      ),
    _prefix: ($) =>
      choice(
        unary_op($, "++", PREC.prefix, true),
        unary_op($, "--", PREC.prefix, true),
        unary_op($, "~~", PREC.prefix, true),
      ),
    _assignment_op: ($) =>
      choice(
        assignment_op($, "/=", PREC.assignment),
        assignment_op($, "*=", PREC.assignment),
        assignment_op($, "%=", PREC.assignment),
        assignment_op($, ">>=", PREC.assignment),
        assignment_op($, "<<=", PREC.assignment),
        assignment_op($, "&=", PREC.assignment),
        assignment_op($, "^=", PREC.assignment),
        assignment_op($, "|=", PREC.assignment),
        assignment_op($, "+=", PREC.assignment),
        assignment_op($, "-=", PREC.assignment),
        assignment_op($, "=", PREC.assignment),
      ),
    _arrow_and_array: ($) =>
      repeat1(choice(seq("->", $.ident), seq(".", $._decimal))),

    label: ($) => seq($.ident, ":"),
    ident: ($) => /[a-zA-Z][a-zA-Z0-9_]+/,
    c_ident: ($) => /[A-Z][A-Z0-9_]+/,

    _decimal: ($) => /[0-9][0-9_]*/,
    _s_decimal: ($) => seq(/[+-]?/, $._decimal),
    intager: ($) =>
      choice(/0x[0-9a-fA-F][0-9a-fA-F_]*/, /0b[01][01_]*/, $._s_decimal),
    float: ($) => seq($._s_decimal, /\.[0-9_]*/),
    string: ($) => /"[^"]*?"/,

    comment: ($) => choice(/\/\/.*/, /\/\*[\S\s]*?\*\//),

    _data: ($) => choice($.const, $.init, $.static),
    static: ($) => block("static", $.c_assignment),
    const: ($) => block("const", $.c_assignment),
    init: ($) => block("init", $.declaration),

    c_assignment: ($) => seq($.c_ident, cast($, "="), $._value),
    declaration: ($) => seq($.c_ident, $.type),

    assignment: ($) => seq(/[;%]/, $.ident, cast($, "="), $._value),
    mutation: ($) =>
      seq(
        choice(
          seq($.ident, maybe_cast($, $._assignment_op), $._expr),
          seq($._prefix, $.ident),
        ),
      ),

    reg: ($) => seq(/[hbwdq]/, $._decimal), //TODO: add macro things
    macro: ($) =>
      seq(
        "#",
        $.ident,
        choice(
          seq(
            $._args,
            optional(seq("->", choice($.type, "0"))),
            "{",
            /* $.func_scope, */
            "}",
          ),
          seq("=", $._value),
        ),
      ),
  },
});

function sep(separator, rule) {
  return seq(rule, repeat(seq(separator, rule)), optional(separator));
}

function block(name, rule) {
  return choice(seq(name, "{", sep("\n", rule), "}"), seq(name, rule));
}

function cast($, op) {
  return seq($.type, op);
}

function maybe_cast($, op) {
  return seq(optional($.type), op);
}

function binary_op($, op, p) {
  return p[1]
    ? prec.left(p[0], seq($._expr, maybe_cast($, op), $._expr))
    : prec.right(p[0], seq($._expr, maybe_cast($, op), $._expr));
}

function assignment_op($, op, p) {
  return p[1]
    ? prec.left(p[0], seq($._expr, cast($, op), $._expr))
    : prec.right(p[0], seq($._expr, cast($, op), $._expr));
}

function unary_op($, op, p, on_left) {
  let side = on_left ? seq($._expr, op) : seq(op, $._expr);
  return p[1] ? prec.left(p[0], side) : prec.right(p[0], side);
}
