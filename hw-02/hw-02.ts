type emitterTypes = {
  events?: object;
  on?: (type: string, handler: () => void) => emitterTypes;
  off?: (type: string, handler: () => void) => emitterTypes | void;
  trigger?: (event: any, args: any[]) => emitterTypes | void;
  _dispatch?: (event: any, args: any[]) => emitterTypes | void;
  _offAll?: () => emitterTypes;
  _offByType?: (type: string) => emitterTypes;
  _offByHandler?: (type: string, handler: () => void) => emitterTypes | void;
};

var emitter: emitterTypes = {};

class Emitter {
  constructor() {
    var e = Object.create(emitter);
    e.events = {};
    return e;
  }

  static myEvent: object;

  static mixin: (obj: object, arr: []) => void;
}

class MyEvent {
  type: any;
  timeStamp: Date;

  constructor(type: any) {
    this.type = type;
    this.timeStamp = new Date();
  }
}

emitter.on = function (type, handler) {
  if (this.events?.hasOwnProperty(type)) {
    (this.events as any)[type].push(handler);
  } else {
    (this.events as any)[type] = [handler];
  }
  return this;
};

emitter.off = function (type, handler) {
  if (arguments.length === 0 && this._offAll) {
    return this._offAll();
  }
  if (handler === undefined && this._offByType) {
    return this._offByType(type);
  }
  if (this._offByHandler) {
    return this._offByHandler(type, handler);
  }
};

emitter.trigger = function (event, args) {
  if (!(event instanceof MyEvent)) {
    event = new MyEvent(event);
  }
  if (this._dispatch) {
    return this._dispatch(event, args);
  }
};

emitter._dispatch = function (event, args) {
  if (!(this.events as any).hasOwnProperty(event.type)) return;
  args = args || [];
  args.unshift(event);

  var handlers = (this.events as any)[event.type] || [];
  handlers.forEach((handler: any) => handler.apply(null, args));
  return this;
};

emitter._offByHandler = function (type, handler) {
  if (!this.events?.hasOwnProperty(type)) return;
  var i = (this.events as any)[type].indexOf(handler);
  if (i > -1) {
    (this.events as any)[type].splice(i, 1);
  }
  return this;
};

emitter._offByType = function (type) {
  if (this.events?.hasOwnProperty(type)) {
    delete (this.events as any)[type];
  }
  return this;
};

emitter._offAll = function () {
  this.events = {};
  return this;
};

Emitter.myEvent = MyEvent;

Emitter.mixin = function (obj, arr) {
  var emitter = new Emitter();
  arr.map(function (name) {
    (obj as any)[name] = function () {
      return (emitter as any)[name].apply(emitter, arguments);
    };
  });
};
