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

var _format = [':timestamp', ':level', ':message'];
var formatSetted = false;
var baseMetadata = {};
var logger = {
  console: console,
  config: function config(config) {
    for(let i in config) {
      this[i] = config[i];
    }
    return module.exports;
  },
  log: function log(...args) {
    if(!args.length) return;
    var metadata = {};
    if(typeof args[0] == 'object') {
      metadata = args.shift();
      if(metadata instanceof Error) {
        metadata = {message: metadata.message};
      }
      if(!metadata.message && !args.length) {
        args.push(JSON.stringify(metadata));
      }
    }
    for(let j in baseMetadata) {
      if(metadata.hasOwnProperty(j)) continue;
      if(typeof baseMetadata[j] == 'function') metadata[j] = baseMetadata[j](metadata);
      else metadata[j] = baseMetadata[j];
    }
    if(!metadata.level) metadata.level = 'info';
    this.console.log(this.format.join(' ').replace(/:\w+|\(:\w+\)/g, (key) => {
      key = key[0]==':'?key.substr(1):key.substring(2, key.length-1);
      switch(key) {
        case 'timestamp':
          return new Date().toISOString();
        case 'message':
          return metadata.message||args.join(' ');
        default:
          if(metadata.hasOwnProperty(key)) return metadata[key];
          else return '-';
      }
    }));
  },
  error: function error(...args) {
    if(!args.length) return;
    var metadata = {};
    if(typeof args[0] == 'object') {
      metadata = args.shift();
      if(metadata instanceof Error) {
        metadata = {message: metadata.message};
      }
      if(!metadata.message && !args.length) {
        args.push(JSON.stringify(metadata));
      }
    }
    for(let j in baseMetadata) {
      if(metadata.hasOwnProperty(j)) continue;
      if(typeof baseMetadata[j] == 'function') metadata[j] = baseMetadata[j](metadata);
      else metadata[j] = baseMetadata[j];
    }
    if(!metadata.level) metadata.level = 'error';
    this.console.error(this.format.join(' ').replace(/:\w+|\(:\w+\)/g, (key) => {
      key = key[0]==':'?key.substr(1):key.substring(2, key.length-1);
      switch(key) {
        case 'timestamp':
          return new Date().toISOString();
        case 'message':
          return metadata.message||args.join(' ');
        default:
          if(metadata.hasOwnProperty(key)) return metadata[key];
          else return '-';
      }
    }));
  },
  metadata: function setMetadata(newMetadata){
    if(newMetadata) {
      baseMetadata = newMetadata;
      return module.exports;
    }
    return baseMetadata;
  },
  levels: function setLevels(newLevels){
      if(newLevels) {
        levels = newLevels;
        return module.exports;
      }
      return levels;
  },
  get format() {
    return _format;
  },
  set format(newFormat) {
      if(newFormat) {
        if(!Array.isArray(newFormat)) newFormat = (newFormat+'').split(' ');
        _format = newFormat;
        formatSetted = true;
      }
  },
  middleware: function middleware(options) {
    if(!options) options = {};
    if(options.format) {
      this.format = options.format;
      formatSetted = true;
    }
    options.metadata = Object.assign({
      origin: req => req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      host: req => req.headers.host,
      url: req => req.originalUrl||req.url,
      method: req => req.method
    }, options.metadata||{});
    if(!formatSetted) this.format = [':timestamp', ':level', ':origin', '=>', ':host', ':method', ':url', ':message'];
    return (req, res, next) => {
      for(let level in levels) {
        req[level] = (...args) => {
          if(!args.length) return;
          var metadata = {};
          if(typeof args[0] == 'object') {
            metadata = args.shift();
            if(metadata instanceof Error) {
              metadata = {message: metadata.message};
            }
          }
          metadata.level = level;
          for(let j in options.metadata) {
            if(typeof options.metadata[j] == 'function') metadata[j] = options.metadata[j](req);
            else metadata[j] = options.metadata[j];
          }
          args.unshift(metadata);
          if(levels[level]) logger.error.apply(logger, args);
          else logger.log.apply(logger, args);
        };
      }
      next();
    };
  }
};

module.exports = new Proxy(logger, {
  get: function(target, name, receiver) {
    if(levels.hasOwnProperty(name)) return function(...args) {
      if(!args.length) return;
      var metadata = {};
      if(typeof args[0] == 'object') {
        metadata = args.shift();
      }
      metadata.level = name;
      args.unshift(metadata);
      if(levels[name]) logger.error.apply(logger, args);
      else logger.log.apply(logger, args);
    };
    if(target.hasOwnProperty(name)) return target[name];
  }
});
