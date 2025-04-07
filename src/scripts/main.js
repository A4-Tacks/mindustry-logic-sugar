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

  write(b) {
    let action = sugars[this.op];
    let s;
    if (typeof action.body == "string" || action.body instanceof String) {
      s = action.body;
    } else {
      s = action.body(this);
    }
    debug(()=>"load snippet: "+s);
    let regexp = /\$[^ \t\n"]*/g;
    s = s.replace(regexp, v => this.args[v.substr(1)]);
    debug(()=>"snippet expanded: "+s);
    b.append(s)
  },
  copy() {
    let b = NAME+" "+this.op;
    for (let k in sugars[this.op].args) {
      b += " "+this.args[k];
    }
    debug(()=>"copy from: "+b);
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
