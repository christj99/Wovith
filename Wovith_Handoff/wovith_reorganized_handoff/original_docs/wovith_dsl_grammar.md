# Wovith DSL Grammar
### Formal grammar (PEG style) and parser test corpus

---

## 0. About this document

The DSL doc (`wovith_dsl.md`) explains the language in prose with examples. This document is the *implementation reference* for the parser. It contains:

1. A formal grammar in PEG (Parsing Expression Grammar) style
2. Lexical rules (whitespace, comments, identifiers, literals)
3. AST shape produced by each grammar rule (cross-referenced to `wovith_schemas.ts`)
4. A test corpus of ~80 input strings paired with their expected ASTs (abbreviated)
5. Negative cases — inputs that must fail with specific error codes

The parser is in `src/domain/dsl/parser.ts`. The test corpus in this doc is the authoritative regression suite. Any future grammar change requires updating the corpus, and the parser must keep all existing corpus cases green.

---

## 1. The grammar (PEG)

```peg
# -----------------------------------------------------------------------------
# Top-level: a cell expression
# -----------------------------------------------------------------------------

CellExpression  <- _ Form _ EOF

Form            <- KeywordForm / PipeForm

# Keyword-prefix form: `from drive.files where ... show as list`
KeywordForm     <- 'from' _+ Source (_+ Step)* (_+ RenderClause)? (_+ Enrichment)*

# Pipe form: `drive.files | where ... | show as list`
# Note: the first `where` after the source may omit its pipe (sugar).
PipeForm        <- Source (_* (PipeWhere / ('|' _* Step))) * (_* '|' _* RenderClause)? (_* '|' _* Enrichment)*

PipeWhere       <- _+ 'where' _+ Predicate    # sugar: no leading pipe required

# -----------------------------------------------------------------------------
# Sources
# -----------------------------------------------------------------------------

Source          <- UnionSource / JoinSource / SimpleSource

SimpleSource    <- ConnectorSource / CellRefSource / VariableRefSource / LiteralCollection

ConnectorSource <- ConnectorName '.' ResourceName SourceParams?
ConnectorName   <- Identifier
ResourceName    <- Identifier
SourceParams    <- '(' _* SourceParamList _* ')'
SourceParamList <- SourceParam (_* ',' _* SourceParam)*
SourceParam     <- Identifier _* '=' _* Value

CellRefSource   <- '@' Identifier
VariableRefSource <- '$' Identifier

LiteralCollection <- '[' _* (Value (_* ',' _* Value)*)? _* ']'

UnionSource     <- 'union' _+ SimpleSource (_* ',' _* SimpleSource)+
JoinSource      <- 'join' _+ SimpleSource _+ 'with' _+ SimpleSource _+ 'on' _+ Predicate

# -----------------------------------------------------------------------------
# Steps (filter, sort, take, group, distinct, map)
# -----------------------------------------------------------------------------

Step            <- FilterStep / SortStep / TakeStep / GroupStep / DistinctStep / MapStep

FilterStep      <- 'where' _+ Predicate
SortStep        <- 'sort' _+ 'by' _+ SortFields
SortFields      <- SortField (_* ',' _* SortField)*
SortField       <- FieldRef _+ ('asc' / 'desc' / 'ascending' / 'descending')?
                 / FieldRef                # default direction: asc

TakeStep        <- 'take' _+ Integer
                 / 'first' _+ Integer      # synonym
                 / 'top' _+ Integer        # synonym

GroupStep       <- 'group' _+ 'by' _+ FieldRef (_+ 'with' _+ AggregationList)?
AggregationList <- Aggregation (_* ',' _* Aggregation)*
Aggregation     <- AggOp '(' FieldRef ')'  ('as' _+ Identifier)?
AggOp           <- 'count' / 'sum' / 'avg' / 'min' / 'max'

DistinctStep    <- 'distinct' (_+ 'by' _+ FieldRef)?
MapStep         <- 'map' _+ '{' _* MapBody _* '}'      # power-user; v2+

# -----------------------------------------------------------------------------
# Predicates
# -----------------------------------------------------------------------------

Predicate       <- OrPredicate
OrPredicate     <- AndPredicate (_+ 'or' _+ AndPredicate)*
AndPredicate    <- NotPredicate (_+ 'and' _+ NotPredicate)*
NotPredicate    <- 'not' _+ AtomicPredicate
                 / AtomicPredicate

AtomicPredicate <- ParenPredicate / Comparison / InSet / TimeRelative / Exists

ParenPredicate  <- '(' _* Predicate _* ')'
Comparison      <- FieldRef _+ ComparisonOp _+ Value
InSet           <- FieldRef _+ 'in' _+ SetExpr
TimeRelative    <- FieldRef _+ TimeRelOp _+ TimeWindow
Exists          <- 'exists' _+ FieldRef
                 / FieldRef _+ 'exists'

ComparisonOp    <- 'is'           # equality
                 / 'is not'       # inequality
                 / '=' / '==' / '!='
                 / '>' / '>=' / '<' / '<='
                 / 'contains'
                 / 'starts with'
                 / 'matches'      # regex

TimeRelOp       <- 'in' / 'within' / 'after' / 'before' / 'between'

TimeWindow      <- 'last' _+ Integer _+ TimeUnit ('s')?       # "last 7 days"
                 / 'this' _+ TimePeriod                       # "this week"
                 / Integer _+ TimeUnit ('s')? _+ 'ago'        # "5 days ago"
                 / TimeLiteral                                # "today"
                 / Value _+ 'and' _+ Value                    # range for 'between'

TimePeriod      <- 'day' / 'week' / 'month' / 'quarter' / 'year'
TimeUnit        <- 'minute' / 'hour' / 'day' / 'week' / 'month' / 'year'

TimeLiteral     <- 'now' / 'today' / 'yesterday' / 'tomorrow'
                 / 'this_week' / 'this_month' / 'this_year' / 'this_quarter'
                 / 'last_week' / 'last_month' / 'last_year'

SetExpr         <- VariableRefSource / LiteralCollection / Identifier  # "vip_contacts"

# -----------------------------------------------------------------------------
# Render clause
# -----------------------------------------------------------------------------

RenderClause    <- 'show' _+ 'as' _+ RendererId (_+ 'with' _+ RenderOptions)?
RendererId      <- 'list' / 'feed' / 'card' / 'cards' / 'timeline' / 'grid'
                 / 'chart' / 'table' / 'kanban' / 'map' / 'text' / 'count'
                 / 'raw' / Identifier   # last fallback: custom renderer name

RenderOptions   <- '{' _* OptionList? _* '}'
OptionList      <- Option (_* ',' _* Option)*
Option          <- Identifier _* ':' _* Value

# -----------------------------------------------------------------------------
# Enrichment (agent calls)
# -----------------------------------------------------------------------------

Enrichment      <- 'enrich' _+ 'each' _+ 'with' _+ AgentCall
                   (_+ 'as' _+ Identifier)?                # output field name
                   (_+ 'using' _+ ModelClass)?
                   (_+ 'required')?
                   (_+ 'max' _+ Integer _+ 'units')?

AgentCall       <- 'agent' '(' _* StringLiteral _* ')'
ModelClass      <- 'haiku' / 'sonnet' / 'opus'

# -----------------------------------------------------------------------------
# Values, identifiers, literals
# -----------------------------------------------------------------------------

Value           <- StringLiteral / NumberLiteral / BooleanLiteral / NullLiteral
                 / TimeLiteral / FieldRef / VariableRefSource / LiteralCollection

FieldRef        <- DottedIdentifier
DottedIdentifier<- Identifier ('.' Identifier)*

Identifier      <- [a-zA-Z_] [a-zA-Z0-9_-]*

StringLiteral   <- '"' StringContent '"'
                 / "'" StringContent "'"
StringContent   <- (EscapeSequence / [^"\\])*
EscapeSequence  <- '\\' .

NumberLiteral   <- '-'? Integer ('.' [0-9]+)? (Exp)?
Integer         <- [0-9]+
Exp             <- ('e' / 'E') ('+' / '-')? [0-9]+

BooleanLiteral  <- 'true' / 'false'
NullLiteral     <- 'null' / 'nothing'

# -----------------------------------------------------------------------------
# Whitespace and comments
# -----------------------------------------------------------------------------

_               <- WS / Comment
WS              <- [ \t\r\n]
Comment         <- LineComment / BlockComment
LineComment     <- '#' [^\n]*
BlockComment    <- '/*' (!'*/' .)* '*/'

EOF             <- !.
```

## 2. Lexical notes

- **Case sensitivity**: identifiers and keywords are case-sensitive. `from` is a keyword; `From` is an identifier.
- **Keywords are reserved**: `from`, `where`, `and`, `or`, `not`, `in`, `is`, `sort`, `by`, `asc`, `desc`, `take`, `first`, `top`, `group`, `with`, `distinct`, `show`, `as`, `enrich`, `each`, `using`, `required`, `max`, `units`, `agent`, `union`, `join`, `on`, `now`, `today`, `yesterday`, `tomorrow`, `this`, `last`, `ago`, `between`, `after`, `before`, `within`, `exists`, `contains`, `starts`, `matches`, `true`, `false`, `null`, `nothing`, `haiku`, `sonnet`, `opus`, `count`, `sum`, `avg`, `min`, `max`, `day`, `week`, `month`, `year`, `quarter`, `minute`, `hour`, `day`, `days`, `weeks`, `months`, `years`, `minutes`, `hours`, `ascending`, `descending`.
- **Single-quote and double-quote strings** behave identically.
- **Numbers** support integers and floats; no hex, no octal.
- **Comments** are stripped by the lexer; do not appear in the AST.
- **Whitespace is significant only as separator**; line breaks within an expression are equivalent to single spaces.

## 3. Disambiguation rules

When the grammar admits multiple parses:

1. **Operator precedence in predicates**: `not` > `and` > `or`. Parens override. `a or b and c` parses as `a or (b and c)`.
2. **Comparison vs in-set**: `field is in set` is in-set, not comparison-then-? — `is` followed by `in` triggers the InSet rule before Comparison.
3. **`take` vs `first` vs `top`**: all synonyms; produce the same TakeStep AST.
4. **`is` vs `=` vs `==`**: synonyms for equality. `is not` is inequality.
5. **`ascending`/`descending` vs `asc`/`desc`**: synonyms.
6. **The `where`-after-source sugar in pipe form**: `drive.files where x | sort by y` is equivalent to `drive.files | where x | sort by y`. Both parse to the same AST.
7. **Keyword form requires `from`**: `gmail.threads where unread show as feed` (without `from`) is a syntax error in keyword form. Pipe form does not require `from`.

## 4. Error reporting

When parsing fails, the parser produces a `ParseError`:

```typescript
type ParseError = {
  kind: 'parse-error'
  code: ParseErrorCode
  line: number
  column: number
  message: string
  context: string          // a few chars before/after the failure
  suggestion?: string
}
```

Error codes:

| Code | Meaning |
|---|---|
| `E001_UNEXPECTED_TOKEN` | Token doesn't match what the grammar expects at this position |
| `E002_UNTERMINATED_STRING` | Opening quote without closing quote |
| `E003_UNKNOWN_KEYWORD` | Looks like a keyword (lowercase identifier in keyword position) but isn't one |
| `E004_INVALID_NUMBER` | Number literal failed to parse |
| `E005_UNKNOWN_RENDERER` | `show as X` where X isn't a known renderer |
| `E006_MISSING_FROM` | Keyword-form expression doesn't start with `from` |
| `E007_DANGLING_PIPE` | Trailing `|` with nothing after |
| `E008_UNBALANCED_PARENS` | More `(` than `)` or vice versa |
| `E009_UNBALANCED_BRACES` | Same for `{}` |
| `E010_UNBALANCED_BRACKETS` | Same for `[]` |
| `E011_DUPLICATE_RENDER` | More than one `show as` in an expression |
| `E012_INVALID_TIME_UNIT` | Time unit isn't one of the allowed values |
| `E013_INVALID_AGG_FUNC` | Aggregation function isn't recognized |
| `E014_INVALID_MODEL_CLASS` | `using <model>` where model isn't haiku/sonnet/opus |
| `E015_NESTED_RENDER` | Renderer specified inside a sub-expression |
| `E016_EMPTY_EXPRESSION` | Empty or whitespace-only input |

---

## 5. Test corpus

The corpus is `{ input, expectedAst | expectedError }`. Each entry is canonical — the parser MUST produce exactly the listed AST (modulo identity ULIDs not shown), and MUST produce the listed error for the negative cases.

Abbreviation conventions for the AST column:
- `CE` = CellExpression
- `S(c,r)` = ConnectorSource with connector `c`, resource `r`
- `F(...)` = FilterStep, with predicate inside
- `cmp(field, op, value)` = Comparison
- `and(a, b)` = And of predicates
- `sort(f, dir)` = SortStep
- `take(n)` = TakeStep
- `R(id)` = RenderClause with rendererId

### 5.1 Minimal valid expressions

| # | Input | Expected AST (abbreviated) |
|---|---|---|
| 1 | `drive.files` | `CE { source: S(drive, files), steps: [], renderer: null }` |
| 2 | `from drive.files` | Same as #1 |
| 3 | `drive.files show as list` | (parse error E006 in keyword form; valid in pipe form without `from` — see note*) |
| 4 | `from drive.files show as list` | `CE { source: S(drive, files), steps: [], renderer: R(list) }` |
| 5 | `drive.files \| show as list` | Same as #4 |
| 6 | `gmail.threads` | `CE { source: S(gmail, threads), steps: [], renderer: null }` |

*Note on #3: Pipe form allows expressions without `from`; an expression `drive.files show as list` (no pipe, no `from`) is ambiguous. The parser treats it as pipe form with implicit pipe before `show as` — valid, equivalent to #5.

### 5.2 Single filter

| # | Input | Expected AST (abbreviated) |
|---|---|---|
| 7 | `from gmail.threads where unread is true` | `CE { source: S(gmail, threads), steps: [F(cmp(unread, is, true))], renderer: null }` |
| 8 | `gmail.threads where unread is true` | Same as #7 (pipe sugar) |
| 9 | `gmail.threads \| where unread is true` | Same as #7 |
| 10 | `gmail.threads where unread = true` | Same as #7 (`=` synonym for `is`) |
| 11 | `gmail.threads where unread is not true` | `F(cmp(unread, is-not, true))` |
| 12 | `gmail.threads where not unread is true` | `F(not(cmp(unread, is, true)))` |

### 5.3 Composite predicates

| # | Input | Expected AST |
|---|---|---|
| 13 | `gmail.threads where unread is true and starred is true` | `F(and(cmp(unread,is,true), cmp(starred,is,true)))` |
| 14 | `gmail.threads where unread is true or starred is true` | `F(or(cmp(unread,is,true), cmp(starred,is,true)))` |
| 15 | `gmail.threads where unread is true and (starred is true or important is true)` | `F(and(cmp(unread,is,true), or(...)))` |
| 16 | `gmail.threads where a is 1 and b is 2 and c is 3` | `F(and(cmp(a,is,1), cmp(b,is,2), cmp(c,is,3)))` (flattened) |
| 17 | `gmail.threads where a is 1 or b is 2 and c is 3` | `F(or(cmp(a,is,1), and(cmp(b,is,2), cmp(c,is,3))))` (and > or) |

### 5.4 Time predicates

| # | Input | Expected AST |
|---|---|---|
| 18 | `gmail.threads where received in last 7 days` | `F(timeRel(received, in, {lastN: 7, unit: day}))` |
| 19 | `gmail.threads where received in this_week` | `F(timeRel(received, in, {thisPeriod: week}))` |
| 20 | `gmail.threads where received in this week` | Same as #19 |
| 21 | `gmail.threads where received after yesterday` | `F(timeRel(received, after, today literal))` |
| 22 | `gmail.threads where received between yesterday and today` | `F(timeRel(received, between, {start, end}))` |
| 23 | `gmail.threads where age is more than 5 days` | `F(cmp(age, gt, {n:5, unit:day}))` (compares to duration) |

### 5.5 In-set predicates

| # | Input | Expected AST |
|---|---|---|
| 24 | `gmail.threads where from is in vip_contacts` | `F(inSet(from, ref(vip_contacts)))` |
| 25 | `gmail.threads where from is in ["a@x.com", "b@x.com"]` | `F(inSet(from, literal-list))` |
| 26 | `gmail.threads where from in $contacts` | `F(inSet(from, variable-ref))` |

### 5.6 Sort and take

| # | Input | Expected AST |
|---|---|---|
| 27 | `gmail.threads sort by received` | `steps: [sort([{received, asc}])]` |
| 28 | `gmail.threads sort by received desc` | `steps: [sort([{received, desc}])]` |
| 29 | `gmail.threads sort by received descending` | Same as #28 |
| 30 | `gmail.threads sort by priority desc, name asc` | `steps: [sort([{priority,desc},{name,asc}])]` |
| 31 | `gmail.threads take 10` | `steps: [take(10)]` |
| 32 | `gmail.threads first 10` | Same as #31 |
| 33 | `gmail.threads top 10` | Same as #31 |
| 34 | `from gmail.threads sort by received desc take 10` | `steps: [sort, take(10)]` |
| 35 | `gmail.threads where unread is true sort by received desc take 10` | filter, sort, take |

### 5.7 Group and distinct

| # | Input | Expected AST |
|---|---|---|
| 36 | `gmail.threads group by from` | `steps: [group(from, [])]` |
| 37 | `gmail.threads group by from with count(id) as total` | `steps: [group(from, [{count(id) as total}])]` |
| 38 | `gmail.threads group by from with count(id), avg(size)` | two aggregations |
| 39 | `drive.files distinct` | `steps: [distinct(null)]` |
| 40 | `drive.files distinct by owner` | `steps: [distinct(owner)]` |

### 5.8 Renderers

| # | Input | Expected AST |
|---|---|---|
| 41 | `from gmail.threads show as feed` | `renderer: R(feed)` |
| 42 | `from gmail.threads show as cards` | `renderer: R(cards)` |
| 43 | `from gmail.threads show as kanban` | `renderer: R(kanban)` |
| 44 | `from drive.files show as grid with {density: compact}` | `renderer: R(grid, {density: compact})` |
| 45 | `from gmail.threads show as feed with {group_by: "day", compact: true}` | Multiple options |
| 46 | `from gmail.threads show as feed with {expand_on_click: true, show_avatar: false}` | Options |

### 5.9 Enrichment

| # | Input | Expected AST |
|---|---|---|
| 47 | `from gmail.threads enrich each with agent("draft a reply")` | `agentEnrichments: [{prompt: "draft a reply", required: false}]` |
| 48 | `from gmail.threads enrich each with agent("summarize") as summary` | `agentEnrichments: [{... outputField: "summary"}]` |
| 49 | `from gmail.threads enrich each with agent("draft") using haiku` | `{... model: haiku}` |
| 50 | `from gmail.threads enrich each with agent("send a reply") required` | `{... required: true}` |
| 51 | `from gmail.threads enrich each with agent("deep analysis") using opus max 50 units` | All options set |

### 5.10 Compound sources

| # | Input | Expected AST |
|---|---|---|
| 52 | `union gmail.threads, gmail.drafts` | `source: union([S(gmail,threads), S(gmail,drafts)])` |
| 53 | `join gmail.threads with calendar.events on thread.subject contains event.title` | `source: join(left, right, predicate)` |
| 54 | `@dropped_threads where age is more than 14 days` | `source: cellRef("dropped_threads")` |
| 55 | `$starred_contacts sort by name` | `source: variableRef("starred_contacts")` |

### 5.11 Comments

| # | Input | Expected AST |
|---|---|---|
| 56 | `from gmail.threads # filter unread\n  where unread is true` | Comment stripped, two clauses |
| 57 | `/* multi\nline */ from gmail.threads` | Comment stripped |

### 5.12 String and number edge cases

| # | Input | Expected AST |
|---|---|---|
| 58 | `gmail.threads where subject contains "hello \"world\""` | Escaped quote in string |
| 59 | `gmail.threads where subject contains 'single quotes'` | Single-quoted strings allowed |
| 60 | `drive.files where size > 1000000` | Large integer |
| 61 | `drive.files where ratio > 0.5` | Float |
| 62 | `drive.files where score > -3.14` | Negative number |
| 63 | `drive.files where x > 1.5e6` | Scientific notation |

### 5.13 Full realistic examples

| # | Input | Expected AST summary |
|---|---|---|
| 64 | `from gmail.threads where i_started is true and they_replied is false and age is more than 5 days sort by age descending show as list` | Full chain: source, filter, sort, render |
| 65 | `from drive.files where touched in last 7 days and folder is "Active Projects" sort by touched desc take 10 show as cards with {density: compact}` | Drive lens example |
| 66 | `from calendar.events where start is in next 24 hours sort by start asc show as timeline` | Calendar timeline |
| 67 | `from gmail.threads where from is in $vip_contacts and state is unread enrich each with agent("draft a brief reply") as draft using sonnet show as feed with {expand_on_click: true}` | Full enrichment chain |
| 68 | `union (from gmail.threads where unread is true), (from calendar.events where start is in next 1 hour) sort by timestamp desc show as feed` | Union from two sources |

### 5.14 Negative cases (must produce specific errors)

| # | Input | Expected error |
|---|---|---|
| 69 | `` (empty) | E016_EMPTY_EXPRESSION |
| 70 | `   \n   ` (whitespace) | E016_EMPTY_EXPRESSION |
| 71 | `from` | E001_UNEXPECTED_TOKEN (expected source) |
| 72 | `from gmail.threads where` | E001_UNEXPECTED_TOKEN (expected predicate) |
| 73 | `from gmail.threads sort` | E001_UNEXPECTED_TOKEN (expected `by`) |
| 74 | `from gmail.threads show as` | E001_UNEXPECTED_TOKEN (expected renderer id) |
| 75 | `from gmail.threads show as bogusrenderer` | E005_UNKNOWN_RENDERER |
| 76 | `from gmail.threads show as feed show as list` | E011_DUPLICATE_RENDER |
| 77 | `from gmail.threads where "unterminated` | E002_UNTERMINATED_STRING |
| 78 | `from gmail.threads \|` | E007_DANGLING_PIPE |
| 79 | `from gmail.threads where (unread is true` | E008_UNBALANCED_PARENS |
| 80 | `from gmail.threads enrich each with agent("x") using bogus` | E014_INVALID_MODEL_CLASS |
| 81 | `from gmail.threads where received in last 7 fortnights` | E012_INVALID_TIME_UNIT |
| 82 | `from gmail.threads group by from with bogus(id)` | E013_INVALID_AGG_FUNC |
| 83 | `gmail.threads where unread is true show as list` | Valid — pipe form (#3 note applies); NOT an error |

---

## 6. Implementation notes for the parser

- **Parser combinator vs hand-rolled recursive descent**: hand-rolled recursive descent is recommended. The grammar is small enough (~50 rules) that a parser combinator adds dependency weight without saving meaningful code.
- **Lookahead**: bounded; typically 1-2 tokens. No backtracking beyond the current rule.
- **Tokenizer**: a separate lexer produces a token stream with line/column info. The parser consumes tokens. This makes error reporting precise.
- **AST nodes**: every AST node has `{ start: SourcePos, end: SourcePos }` for editor integration (squiggly underlines in the DSL editor).
- **Performance target**: parse a 100-line cell expression in <5ms on a modest device.

## 7. Coverage commitment

The 83 test cases above are a *minimum*. The parser implementation must pass all 83, and additional cases should be added as new patterns are discovered in user-authored DSL.

A small fuzzing harness (10,000 random near-grammar inputs) should run weekly to catch parser crashes; any crash on a random input is a P0 bug.

## 8. Versioning

The grammar version is encoded in the parser's exported `GRAMMAR_VERSION` constant. Cells stored with an older grammar version may need migration:

```typescript
const GRAMMAR_VERSION = 1
```

When the grammar changes in a way that breaks existing valid expressions (rare), the version is bumped and a migration step parses old cells with the old grammar and rewrites them to the new form. Adding new keywords or relaxing rules does NOT require a version bump.

---

## 9. Cross-references

- DSL doc: `wovith_dsl.md` (prose explanation and worked examples)
- AST types: `wovith_schemas.ts` (section 4, DSL AST TYPES)
- Cell runtime: `wovith_cell_runtime.md` section 4 (Expression evaluation)
- NL-to-DSL bridge: `wovith_nl_to_dsl_bridge.md` (the LLM produces DSL strings that must parse against this grammar)
