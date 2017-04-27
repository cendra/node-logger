require('extend');

var levels = {
  debug: false,
  info: false,
  notice: false,
  warn: true,
  error: true,
  critical: true,
  alert: true,
  emergency: true
};

var format = ':timestamp :level :message';
var formatSetted = false;
var baseMetadata = {};
var myConsole = Object.create(console, {
  log: {
    value: function log(...args) {
      if(!args.length) return;
      var metadata = {};
      if(typeof args[0] == 'object') {
        metadata = args.shift();
      }
      for(let j in baseMetadata) {
        if(typeof baseMetadata[j] == 'function') metadata[j] = baseMetadata[j](metadata);
        else metadata[j] = baseMetadata[j];
      }
      if(!metadata.level) metadata.level = 'info';
      console.log(format.replace(/:\w+|\(:\w+\)/g, function(key) {
        key = key[0]==':'?key.substr(1):key.substring(2, key.length-1);
        switch(key) {
          case 'timestamp':
            return new Date().toISOString();
          case 'message':
            return args.join(' ');
          default:
            if(metadata.hasOwnProperty(key)) return metadata[key];
            else return '-';
        }
      }));
    },
    configurable: true,
    enumerable: true,
    writable: true
  },
  error: {
    value: function error(...args) {
      if(!args.length) return;
      var metadata = {};
      if(typeof args[0] == 'object') {
        metadata = args.shift();
      }
      for(let j in baseMetadata) {
        if(typeof baseMetadata[j] == 'function') metadata[j] = baseMetadata[j](metadata);
        else metadata[j] = baseMetadata[j];
      }
      if(!metadata.level) metadata.level = 'error';
      console.error(format.replace(/:\w+|\(:\w+\)/g, function(key) {
        key = key[0]==':'?key.substr(1):key.substring(2, key.length-1);
        switch(key) {
          case 'timestamp':
            return new Date().toISOString();
          case 'message':
            return args.join(' ');
          default:
            if(metadata.hasOwnProperty(key)) return metadata[key];
            else return '-';
        }
      }));
    },
    configurable: true,
    enumerable: true,
    writable: true
  },
  metadata: {
    value: function setMetadata(newMetadata){
      if(newMetadata) baseMetadata = newMetadata;
      return baseMetadata;
    },
    configurable: true,
    enumerable: true,
    writable: true
  },
  levels: {
    value: function setLevels(newLevels){
      if(newLevels) levels = newLevels;
      return levels;
    },
    configurable: true,
    enumerable: true,
    writable: true
  },
  format: {
    value: function setFormat(newFormat) {
      if(newFormat) {
        format = newFormat;
        formatSetted = true;
      }
      return format;
    },
    configurable: true,
    enumerable: true,
    writable: true
  },
  middleware: {
    value: function middleware(options) {
      if(options.format) {
        format = options.format;
        formatSetted = true;
      }
      if(!formatSetted) format = ':timestamp :origin => :host :url :level :message';
      return function(req, res, next) {
        for(let level in levels) {
          req[level] = function(...args) {
            if(!args.length) return;
            var metadata = {};
            if(typeof args[0] == 'object') {
              metadata = args.shift();
            }
            metadata.level = level;
            for(let j in options.metadata||{}) {
              if(typeof options.metadata[j] == 'function') metadata[j] = options.metadata[j](req);
              else metadata[j] = options.metadata[j];
            }
            args.unshift(metadata);
            if(levels[level]) myConsole.error(args);
            else myConsole.log(args);
          };
        }
      };
    },
    configurable: true,
    enumerable: true,
    writable: true
  }
});

module.exports = new Proxy(myConsole, {
  get: function(target, name, receiver) {
    if(levels.hasOwnProperty(name)) return function(...args) {
      if(!args.length) return;
      var metadata = {};
      if(typeof args[0] == 'object') {
        metadata = args.shift();
      }
      metadata.level = level;
      args.unshift(metadata);
      if(levels[level]) myConsole.error(args);
      else myConsole.log(args);
    };
    if(target.hasOwnProperty(name)) return target[name];
  }
});
