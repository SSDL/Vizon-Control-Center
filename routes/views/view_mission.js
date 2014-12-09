var keystone = require('keystone');
var async = require('async');

exports = module.exports = function(req, res) {

	var locals = res.locals, view = new keystone.View(req, res);

	// locals.section is used to set the currently selected
	// item in the header navigation.
	locals.section = 'Missions';
	console.log(locals.page.path.split('/').slice(-1)[0]);
	var mission_slug = locals.page.path.split('/').slice(-1)[0];
	console.log(mission_slug);
	
	var locals = res.locals,
			view = new keystone.View(req, res);
  var outcome = {};
	mid = mission_slug;
  var getMissionInfo = function(callback) {
    keystone.list('Mission').model.findOne({ 'missionId': mid }).exec(function(err, mission){
      if (err) {
        return callback(err, null);
      }
      outcome.mission = mission;
      return callback(null, 'done');
    });
  };

  var getTAPDescriptors = function(callback) {
    keystone.list('TAP').model.where('ID').regex(/TAP_\d+/).sort('ID').select('name ID').exec(function(err, taps){
      if (err) {
        return callback(err, null);
      }
      taps.sort(function(a,b){
        return a.toObject().ID.split('_')[1] - b.toObject().ID.split('_')[1];
      });
      console.log(taps);
      var temp = {};
      for (var i = 0; i < taps.length; i++) {
        temp[taps[i].ID] = taps[i].toObject();
      }
      outcome.tap_descs = temp;
      return callback(null, 'done');
    });
  };
    var getCAPDescriptors = function(callback) {
    keystone.list('CAP').model.where('ID').regex(/CAP_\d+/).sort('ID').exec(function(err, caps){
      if (err) {
        return callback(err, null);
      }
      caps.sort(function(a,b){
        return a.toObject().ID.split('_')[1] - b.toObject().ID.split('_')[1];
      });
      console.log(caps);
      outcome.cap_descs = caps;
      return callback(null, 'done');
    });
  };

  function asyncFinally(err, results){
    view.render('view_mission', { 
      data: outcome
    });
  }

  async.parallel([getMissionInfo, getCAPDescriptors, getTAPDescriptors], asyncFinally);
}
/*var keystone = require('keystone');

exports = module.exports = function(req, res) {

	var locals = res.locals,
		view = new keystone.View(req, res);

	// locals.section is used to set the currently selected
	// item in the header navigation.
	view.query('missions', keystone.list('Mission').model.find());
	locals.section = 'missions';
	// Render the view
	view.render('missions', {title: 'Missions'});
};
*/


exports.tap = function(req, res){
  function tapFinally(err, results){
    var output = {};
    console.log(results);
    for (var i = 0; i < results.length; i++) {
      if(results[i]) { output[results[i].h.t] = results[i]; } // filters out a null result
    }
    res.send(output);
  }

  if(req.params.t === 'all') {
    req.app.db.models.TAP.distinct( '_t', { 'h.mid': parseInt(req.params.mid) } ).sort( { '_t': 1 } ).exec( function(err, taps) {
      async.map(taps, function(tap, callback){
      	console.log(tap);
        keystone.list('TAP').model.findOne( { 'h.mid': parseInt(req.params.mid), '_t': tap } ).sort( { '_t': -1 } ).exec( function(err, doc) {
          callback(null, doc);
        });
      }, tapFinally);
    });
  } else {
    var taplist = req.params.t;
    console.log(req.params);
    //console.log(keystone.db.models);
    console.log(req.params.mid + '-TAP_' + req.params.t);
    //console.log(keystone.db.models[req.params.mid + '-TAP_' + req.params.t]);
    console.log("break1");
    //console.log(keystone.db.models);
    console.log("break2");
    keystone.db.models[req.params.mid + '-TAP_' + req.params.t].findOne({}).exec(function(err,doc) {// { 'h.mid': req.params.mid } ).sort( { 'h.s': -1 } ).exec( function(err, doc) {
        console.log("hello");
        console.log(doc);
        console.log("hello2");
      });
    async.map(req.params, function(tap, callback){
    	console.log("hello");
      keystone.db.models[tap.mid + '-TAP_' + tap.t].findOne( { 'h.mid': parseInt(tap.mid), 'ID': tap } ).sort( { 'h.s': -1 } ).exec( function(err, doc) {
        callback(null, doc);
      });
    }, tapFinally);
  }
};

exports.cap = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    workflow.emit('findTAP');
  });

  workflow.on('findTAP', function() {
    var outcome = {};

    function getNextCAPSeq(callback) {
      req.app.db.models.CAP.findOne( { 'h.mid': parseInt(req.params.mid) }, {}, {sort: { '_id': -1 } } ).exec( function(err, cap) {
        if (err) {
          return callback(err, null);
        }
        outcome.s = (cap ? cap.toObject().h.s + 1 : 1);
        return callback(null, 'done');

      });
    }

    function getLastTAPSNAP(callback) {
      req.app.db.models.TAP.findOne( { 'h.mid': parseInt(req.params.mid) }, {}, {sort: { '_id': -1 } } ).exec( function(err, tap) {
        if (err) {
          return callback(err, null);
        }
        outcome.xt_snap = (tap ? tap.getNewSNAPTime(req.body.cap.h.xt) : 0);
        return callback(null, 'done');
      });
    }

    function asyncFinally(err, results){
      if(err) {
        return workflow.emit('exception', err);
      }

      return workflow.emit('logCAP', outcome);
    }

    async.parallel([getNextCAPSeq, getLastTAPSNAP], asyncFinally);
  });

  workflow.on('logCAP', function(newdata) {
    var cap = req.body.cap;
    cap.h.s = newdata.s;
    cap.h.xt = newdata.xt_snap;
    cap.h.mid = parseInt(req.params.mid);

    req.app.db.models['CAP_'+cap.h.t].create(cap, function(err, newcap) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.cap = newcap;
      //if(req.app.httpio)  req.app.httpio.of('/gs').emit('cap', newcap);
      //if(req.app.httpsio) req.app.httpsio.of('/gs').emit('cap', newcap);
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};
