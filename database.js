module.exports = function(ks){
  
  var app = ks.express()
  	,	mongoose = ks.mongoose
    , extend = require('mongoose-schema-extend')
    , config = require('./routes/config')
    , utils = require('./routes/utils')
    , db = ks.db = mongoose.createConnection(config.mongodb.uri);

  // create the mongodb connection through mongoose.
  // attach basic event handlers to the connection for logging purposes
  db.mongoose = mongoose;
  db.on('error', function dberror(){
    utils.logText('Database ' + 'error'.red, 'ERR'.red);
  });
  db.on('close', function dberror(){
    utils.logText('Database ' + 'closed'.yellow, 'ERR'.red);
  });
  db.on('open', function dberror(){
    utils.logText('Database ' + 'opened'.green);
  });
  db.once('open', function callback () {});
  
  // create namespace placeholder objects for utility functions and dynamically created schemas and models
  db.funcs = {};
  db.schemas = {};
  // load static database models
  //require('./models/User')(app, mongoose);
  //require('./models/Mission')(app, mongoose);
  //require('./models/Groundstation')(app, mongoose);
  
  // determine SNAP time (seconds since 0000h 1/1/2000 UTC). if a reference
  // UTC millisecond value is not given, assume the current time
  function getNewSNAPTime(msUTC) {
    if(!msUTC) msUTC = (new Date()).valueOf();
    var obj = this.toObject({getters: false});
    return (obj.h.Timestamp ? obj.h.Timestamp : obj.h["Execution Time"]) + Math.floor((msUTC - (new Date(this.d)).valueOf())/1000);
  }
  
  // this function dynamically crates the literal for a given TAP descriptor property.
  // the property literal consists of a type and a getter function. the type is set
  // according to a conversion type if it exists. the getter function performs on-the-fly
  // conversions, formatting, etc. most importantly, the output of the getter takes the
  // original stored value and returns an object literal that can include the property
  // name, unit string, and formatted/converted value. this is chosen as default get action
  // for all TAPS because TAPs are most often fetched for display on the web rather than 
  // for server-side manipulation.
  function setupTAPSchemaLiteral(desc_prop) {
    function getValueProperty(val) {
      var literal = {v: val}
      if(desc_prop.n) literal.n = desc_prop.n;
      if(desc_prop.u) literal.u = desc_prop.u;
      if(desc_prop.c instanceof Array) { // verify that the property conv is an array
        literal.v = desc_prop.c[0]; // the first element of conv is the linear shift
        for(var i = 1; i < desc_prop.c.length; i++) { // for the rest of the elements in conv
          literal.v += desc_prop.c[i] * Math.pow(val, i) // determine the power and constant
        }
      } else if(desc_prop.c == 'hex') { // hex string
        literal.v = '0x' + literal.v;
      } else if(desc_prop.c == 'snap') { // SNAP time
        literal.v = new Date((literal.v * 1000) + (new Date('Jan 1, 2000')).getTime());
      }
      return literal;
    }
    //console.log(desc_prop);
    var propertyliteral = { type: Number, get: getValueProperty }; // create new schema property literal for plain number
    if(desc_prop.c == 'string' || desc_prop.c == 'hex') // hex string or regular string
      propertyliteral.type = String;
    return propertyliteral;
  }
  
  function setupTAPSchemaLiteral2(desc_prop) {
  	var desc = desc_prop.split(',');
    function getValueProperty(val) {
      var literal = {v: val}
      if(desc[0]) literal.n = desc[0];
      //if(desc_prop.u) literal.u = desc_prop.u;
      if(desc.length > 3) { // verify that the property conv is an array
        literal.v = Number(desc[2]); // the first element of conv is the linear shift
        for(var i = 3; i < desc.length; i++) { // for the rest of the elements in conv
          literal.v += Number(desc[i]) * Math.pow(val, i) // determine the power and constant
        }
      } else if(desc[2] == 'hex') { // hex string
        literal.v = '0x' + literal.v;
      } else if(desc[2] == 'snap') { // SNAP time
        literal.v = new Date((literal.v * 1000) + (new Date('Jan 1, 2000')).getTime());
      }
      return literal;
    }
    //console.log(desc_prop);
    var propertyliteral = { type: Number, get: getValueProperty }; // create new schema property literal for plain number
    if(desc[2] == 'string' || desc[2] == 'hex') // hex string or regular string
      propertyliteral.type = String;
    return propertyliteral;
  }
  
  // this function dynamically crates the literal for a given CAP descriptor property.
  // the property literal consists of a type, and for particular conversion types, a getter.
  // the only conversion type for which a getter is defined now is SNAP time. this function
  // converts a stored value of 0 into the current SNAP time.
  function setupCAPSchemaLiteral(desc_prop) {
  	var desc = desc_prop.split(',');
    var propertyliteral = { type: Number }; // create new schema property literal for plain number
    if(desc[2] == 'snap') {// snap time
      propertyliteral.get = function(val) {
        var output = val;
        if((val == 0) && (desc[3] == 'snapnow')) {// secondary conversion type
          output = Math.floor(((new Date()).getTime() - (new Date('Jan 1, 2000')).getTime())/1000);
        }
        else if(val == 0)
          output = this.getNewSNAPTime();
        return output;
      };
    }
    return propertyliteral;
  }
  
  db.schemas.Descriptor = mongoose.Schema({
    _id: String,
    n: String,
    h: [{
      n: String,
      l: Number,
      f: String,
      c: String,
      }],
    p: [{
      n: String,
      l: Number,
      f: String,
      c: [Number, Number],
      u: String
      }]
  },{ versionKey: false, id: false });
  db.model('Descriptor', db.schemas.Descriptor, 'descriptors');
  
  db.schemas.Descriptor2 = mongoose.Schema({
    _id: String,
    n: String,
    h: [{
      n: String,
      l: Number,
      f: String,
      c: String,
      }],
    p: [{
      n: String,
      l: Number,
      f: String,
      c: [Number, Number],
      u: String
      }]
  },{ versionKey: false, id: false });
  db.model('Descriptor2', db.schemas.Descriptor2, 'descriptors2');  
  // TAP setup
  db.schemas.TAP = mongoose.Schema({}, { collection : 'taplog', versionKey: false, id: false, discriminatorKey : '_t' });
  db.schemas.TAP.virtual('d').get(function(){ return this._id.getTimestamp(); });
  db.schemas.TAP.methods.getNewSNAPTime = getNewSNAPTime;
  db.schemas.TAP.set('toObject', { getters: true, virtuals: true });
  db.schemas.TAP.set('toJSON', { getters: true, virtuals: true });
  db.model('TAP', db.schemas.TAP);
  
  // CAP setup
  db.schemas.CAP = mongoose.Schema({ 
    td: { type: Date } // transmit date
  }, { collection : 'caplog', versionKey: false, id: false, discriminatorKey : '_t' });
  db.schemas.CAP.virtual('d').get(function(){ return this._id.getTimestamp(); });
  db.schemas.CAP.methods.getNewSNAPTime = getNewSNAPTime;
  db.schemas.CAP.set('toObject', { getters: true, virtuals: true });
  db.schemas.CAP.set('toJSON', { getters: true, virtuals: true });
  db.model('CAP', db.schemas.CAP);
  
  
  // this database function returns the descriptor for a given packet descriptor typeid.
  // if the descriptor is not cached, it is retrieved from the database and passed to a
  // callback. if no descriptor typeid is provided, the default regex match will retrieve
  // all possible descriptors from the database.
  db.funcs.loadPacketDescriptors = function(desc_typeid, callback){
    var regex = /.+_\d+/; // match all xxx_###
    if(typeof desc_typeid === 'function') callback = desc_typeid
    else if(desc_typeid) regex = new RegExp('^'+desc_typeid + '$') // matches the descriptor typeid specified
    db.models.Descriptor.where('_id').regex(regex).sort('_id').exec(callback);
  }
  db.funcs.loadPacketDescriptors2 = function(desc_typeid, callback){
    var regex = /.+_\d+/; // match all xxx_###
    if(typeof desc_typeid === 'function') callback = desc_typeid
    else if(desc_typeid) regex = new RegExp('^'+desc_typeid + '$') // matches the descriptor typeid specified
    ks.list('TAP').model.where('ID').regex(regex).sort('ID').populate('missionId').exec(callback);
    ks.list('CAP').model.where('ID').regex(regex).sort('ID').populate('missionId').exec(callback);
  }
  // this database function loads a packet model based on a descriptor typeid. if the model
  // for the typeid is cached, that model is passed to the callback. otherwise, the above 
  // loadPacketDescriptors() function is called on the typeid with a callback to generate
  // a packet model from the resulting array of descriptors. TAP anc CAP models are processed
  // slightly differently in terms of schema literal generation for each field descriptor,
  // but both consist of the same general schema structure extended from the base TAP/CAP
  // schemas above. the final models are cached for future use.
  db.funcs.loadPacketModel2 = function(desc_typeid, callback) {
    if(db.models[desc_typeid]) callback(db.model(desc_typeid)) // if the descriptor typeid is already in the cache, use it
    else {
      db.funcs.loadPacketDescriptors(desc_typeid, function (err, descriptors) { // fetch regex-matched descriptors from the database
        if (err) {
          utils.log(err);
        }
        else {
          for(var k in descriptors) { // for each retrieved descriptor, even if 1
            var descriptor = descriptors[k].toObject(); // call toObject to only get "descriptor elements", not the extra Mongoose stuff
            console.log(descriptor);
            console.log(hello);
            var isTAP = /^TAP_.*/.test(descriptor._id);
            var isCAP = /^CAP_.*/.test(descriptor._id);
            var headerliteral = { mid: { type: Number } }
            var payloadliteral = {}
            var namesliteral = {}
            for(var prop in descriptor.h) {
              if(descriptor.h[prop].f == 't') continue;
              if(descriptor.h[prop].f && isTAP) // if the property is an object with a fieldname property of its own
                headerliteral[descriptor.h[prop].f] = setupTAPSchemaLiteral(descriptor.h[prop]);
              else if(descriptor.h[prop].f && isCAP)
                headerliteral[descriptor.h[prop].f] = setupCAPSchemaLiteral(descriptor.h[prop]);
            }
            for(var prop in descriptor.p) {
              if (descriptor.p[prop].f && isTAP) // if the property is an object with a fieldname property of its own
                payloadliteral[descriptor.p[prop].f] = setupTAPSchemaLiteral(descriptor.p[prop]);
              else if (descriptor.p[prop].f && isCAP)
                payloadliteral[descriptor.p[prop].f] = setupCAPSchemaLiteral(descriptor.p[prop]);
            }
            var newSchema = db.schemas[ descriptor._id.split('_')[0] ].extend( { // extend the descriptor base type (TAP, CAP, etc)
              h: headerliteral,
              p: payloadliteral
            } );
            newSchema.virtual('h.t').get(function(){ return parseInt(this._t.split('_')[1]); });
            newSchema.index({ '_t': 1, 'h.s': -1, 'h.mid':1}, { unique: true });
            db.model(descriptor._id, newSchema);
            
            utils.logText(descriptor._id + ' ' + descriptor.n, 'LOAD'.cyan);
          }
          if(callback) callback(db.model(desc_typeid)); // return the model if available, otherwise will be undefined so make sure it's handled in callback
        }
      });
    }
  }
 
 	db.funcs.loadPacketModel = function(desc_typeid, callback) {
    if(db.models[desc_typeid]) callback(db.model(desc_typeid)) // if the descriptor typeid is already in the cache, use it
    else {
      db.funcs.loadPacketDescriptors2(desc_typeid, function (err, descriptors) { // fetch regex-matched descriptors from the database
        if (err) {
          utils.log(err);
        }
        else {
          for(var k in descriptors) { // for each retrieved descriptor, even if 1
            var descriptor = descriptors[k].toObject(); // call toObject to only get "descriptor elements", not the extra Mongoose stuff
						//console.log(m);
						for (var m in descriptor.missionId) {
							var mission = descriptor.missionId[m];
							var isTAP = /^TAP_.*/.test(descriptor.ID);
							var isCAP = /^CAP_.*/.test(descriptor.ID);
							var headerliteral = { mid: { type: Number } };
							var payloadliteral = {}
							var namesliteral = {}
							var header;
							if (isTAP)
								header = mission.TAPHeader;
							else if (isCAP)
								header = mission.CAPHeader;
							for(var prop in header) {
								if(header[prop].split(',')[0] == 'TAP ID') continue;
								else if(header[prop].split(',')[0] == 'CAP ID') continue;
								if(header[prop].split(',')[0]) // if the property is an object with a fieldname property of its own
									headerliteral[header[prop].split(',')[0]] = setupTAPSchemaLiteral2(header[prop]);
							}
							for(var prop in descriptor.package) {
								if (descriptor.package[prop].split(',')[0] && isTAP) // if the property is an object with a fieldname property of its own
									payloadliteral[descriptor.package[prop].split(',')[0]] = setupTAPSchemaLiteral2(descriptor.package[prop]);
								else if (descriptor.package[prop].split(',')[0] && isCAP)
									payloadliteral[descriptor.package[prop].split(',')[0]] = setupCAPSchemaLiteral2(descriptor.package[prop]);
							}
							var newSchema = db.schemas[ descriptor.ID.split('_')[0] ].extend( { // extend the descriptor base type (TAP, CAP, etc)
								h: headerliteral,
								p: payloadliteral
							} );
							newSchema.virtual('h.t').get(function(){ return parseInt(this._t.split('_')[1]); });
							newSchema.index({ '_t': 1, 'h.s': -1, 'h.mid':1}, { unique: true });
							
							db.model(descriptor.missionId[m].missionId + '-' + descriptor.ID, newSchema);
							utils.logText(descriptor.missionId[m].missionId + '-' + descriptor.ID + ' ' + descriptor.name, 'LOAD'.cyan);
						}
          }
          if(callback) callback(db.model(desc_typeid)); // return the model if available, otherwise will be undefined so make sure it's handled in callback
        }
      });
    }
  }
  
  // generate and cache models from all available descriptors
  db.funcs.loadPacketModel();
  
}
