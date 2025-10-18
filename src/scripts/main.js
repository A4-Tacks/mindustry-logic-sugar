const NAME = "ls";
const debug = _f => {
  //print(""+_f());
};
if (! ("LCategory" in this)) this.LCategory = "unused";
const singleAsmRead = (() => {
  try {
    LAssembler.read("end")
    debug(()=>"checked single asm read");
    return true
  } catch (e) {
    debug(()=>"checked double asm read with "+e);
    return false
  }
})();

const sugars = {
  "++": {
    args: {
      "": "i",
    },
    body: "op add $ $ 1",
  },
  "--": {
    args: {
      "": "i",
    },
    body: "op sub $ $ 1",
  },
  "+=": {
    args: {
      "": "i",
      "+=": "num",
    },
    body: "op add $ $ $+=",
  },
  "-=": {
    args: {
      "": "i",
      "-=": "num",
    },
    body: "op sub $ $ $-=",
  },
  "*=": {
    args: {
      "": "i",
      "*=": "2",
    },
    body: "op mul $ $ $*=",
  },
  "/=": {
    args: {
      "": "i",
      "/=": "num",
    },
    body: "op div $ $ $/=",
  },
  "//=": {
    args: {
      "": "i",
      "//=": "num",
    },
    body: "op idiv $ $ $//=",
  },
  "%=": {
    args: {
      "": "i",
      "%=": "num",
    },
    body: "op mod $ $ $%=",
  },
  "min": {
    args: {
      "": "i",
      "min=": "num",
    },
    body: "op min $ $ $min=",
  },
  "max": {
    args: {
      "": "i",
      "max=": "num",
    },
    body: "op max $ $ $max=",
  },
  "getv": {
    args: {
      "": "i",
      from: "processor1",
    },
    body: 'read $ $from "$"',
  },
  "setv": {
    args: {
      "": "i",
      to: "processor1",
    },
    body: 'write $ $to "$"',
  },
  "deref": {
    args: {
      "*": "i",
      from: "cell1",
    },
    body: "read $* $from $*",
  },
  "polleq": {
    args: {
      "": "a",
      "==": "b",
    },
    body: stmt => "jump "+stmt.elem.index+" equal $ $==",
  },
  "pollne": {
    args: {
      "": "a",
      "==": "b",
    },
    body: stmt => "jump "+stmt.elem.index+" notEqual $ $==",
  },
  "load@": {
    args: {
      "@": "time",
    },
    body: "set $@ @$@",
  },
  "setpc": {
    args: {
      "": "line",
      "=@counter+": "1",
    },
    body: "op add $ @counter $=@counter+",
  },
  "topc": {
    args: {
      "@counter=": "line",
    },
    body: "set @counter $@counter=",
  },
  "offset": {
    args: {
      "@counter+=": "i",
    },
    body: "op add @counter @counter $@counter+=",
  },
  "rtbl": {
    args: {
      "(": "result",
      ")=": "arr",
      "size": "8",
    },
    body: stmt => {
      let cases = stmt.args.size;
      if (isNaN(cases)) cases = 1;
      let results = stmt.args['('].split(",");
      let vars = stmt.args[')='].split(",");

      let base  = stmt.elem.index;
      let block = results.length + 1;
      let end   = base + cases * block - (block - 1);

      let lines = [
        "op mul __offset i "+block,
        "op add @counter @counter __offset",
      ]
      for (let i = 0; i < cases; i++) {
        for (let k in results) {
          let slot = (vars[k] || 'var')+i;
          lines.push("set "+results[k]+" "+slot)
        }
        lines.push("jump "+(end-i*block)+" always 0 0")
      }
      return lines
    },
  },
  "wtbl": {
    args: {
      "(": "value",
      ")->": "arr",
      "size": "8",
    },
    body: stmt => {
      let cases = stmt.args.size;
      if (isNaN(cases)) cases = 1;
      let results = stmt.args['('].split(",");
      let vars = stmt.args[')->'].split(",");

      let base  = stmt.elem.index;
      let block = results.length + 1;
      let end   = base + cases * block - (block - 1);

      let lines = [
        "op mul __offset i "+block,
        "op add @counter @counter __offset",
      ]
      for (let i = 0; i < cases; i++) {
        for (let k in results) {
          let slot = (vars[k] || 'var')+i;
          lines.push("set "+slot+" "+results[k])
        }
        lines.push("jump "+(end-i*block)+" always 0 0")
      }
      return lines
    },
  },
  "for": {
    args: {
      "": "i",
      "=": "0",
      "<": "@links",
    },
    body: stmt => [
      "getlink block $",
      "jump "+(stmt.elem.index+3)+" greaterThanEq $ $<",
      "op add $ $ 1",
      "jump "+stmt.elem.index+" lessThan $ $<",
    ],
  },
};
const DEFAULT_OP = Object.keys(sugars)[0];

const LogicSugar = {
  new(words) {
    const st = extend(LStatement, Object.create(LogicSugar));
    st.read(words);
    return st;
  },

  read(words) {
    this.op = words[1] || DEFAULT_OP;

    let i = 2;
    this.args = {};
    for (let key in sugars[this.op].args) {
      this.args[key] = words[i++];
    }
  },

  op_refresh_() {
    debug(()=>"op refresh");
    this.generate_stack_ = undefined;
    this.generate_trivial_ = undefined;
  },
  gen_() {
    if ('generate_stack_' in this
      && this.generate_stack_ !== undefined
      && this.generate_stack_ !== null
    ) {
      return this.generate_stack_
    }

    let action = sugars[this.op];
    let out;
    if (typeof action.body == "string" || action.body instanceof String) {
      out = action.body;
    } else {
      out = action.body(this);
    }
    let trivial = typeof out == 'string' || out instanceof String;
    let outs = trivial ? [out] : out;
    for (let i in outs) {
      debug(()=>"load snippet: "+outs[i]);

      let regexp = /\$[^ \t\n"]*/g;
      outs[i] = outs[i].replace(regexp, v => this.args[v.substr(1)]);

      debug(()=>"snippet expanded: "+outs[i]);
    }
    this.generate_stack_ = outs;
    this.generate_trivial_ = trivial;
    return this.gen_()
  },
  write(b) {
    let generated = this.gen_().pop() || 'noop';
    debug(() => "generate expanded: "+generated);
    b.append(generated)
  },
  copy() {
    let b;
    let rest_stack = this.gen_();
    if (this.generate_trivial_) {
      b = NAME+" "+this.op;
      for (let k in sugars[this.op].args) {
        b += " "+this.args[k];
      }
      debug(()=>"trivial copy: "+b);
    } else {
      b = rest_stack.pop() || 'noop';
    }
    let read = singleAsmRead
      ? LAssembler.read(b.toString())
      : LAssembler.read(b.toString(), true);
    debug(()=>"readed: "+read);
    return read.size == 0 ? null : read.first();
  },

  build(h) {
    if (h instanceof Table) {
      return this.buildt(h);
    }

    throw "unreachable"
  },

  buildt(table) {
    const sep = (str) => {
      table.left();
      table.add(str);
    };
    const row = () => {
      if (LCanvas.useRows()) {
        table.left();
        table.row();
      }
    };

    table.clearChildren();
    table.left();

    if (!sugars[this.op]) this.op = DEFAULT_OP;

    for (let key in sugars[this.op].args) {
      if (!this.args[key]) {
        this.args[key] = sugars[this.op].args[key];
      }
    }

    var optb = table.button(this.op, Styles.logict, () => {
      this.showSelectTable(optb, (t, hide) => {
        let i = 0;
        for (var op in sugars) {
          let sub = this.setter(table, t, op, hide)
            .size(90, 40);
          if (++i % 3 == 0) sub.row();
        }
      });
    }).size(90, 40).color(table.color).get();

    let i = 0;
    for (let arg in sugars[this.op].args || {}) {
      let local_arg = arg;

      if (!i++ && arg) {
        row();
      }
      if (arg) {
        sep(" "+arg+" ");
      }
      this.field(table, this.args[arg], arg => {this.args[local_arg] = arg})
        .width(200)
        .left();
      row();
    }
  },

  setter(root, table, op, hide) {
    return table.button(op, Styles.logicTogglet, () => {
      if (this.op != op) {
        this.op = op;
        this.buildt(root);
        this.op_refresh_();
      }
      hide.run();
    });
  },

  name: () => "Logic Sugar",
  color: () => Pal.logicOperations,
  category: () => LCategory.operation,
};

LAssembler.customParsers.put(NAME, func(LogicSugar.new));
LogicIO.allStatements.add(prov(() => LogicSugar.new([
  NAME, DEFAULT_OP, /* init default codes */
])))
