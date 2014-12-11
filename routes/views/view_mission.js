var keystone = require('keystone');
var async = require('async');

exports.init = module.exports.init = function(req, res) {

	var locals = res.locals, view = new keystone.View(req, res);

	// locals.section is used to set the currently selected
	// item in the header navigation.
	locals.section = 'Missions';
	var mission_slug = req.params.mid;
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
      for (var i = 0; i < caps.length; i++) {
      	caps[i] = caps[i].toObject();
        caps[i].header = outcome.mission.CAPHeader;
      }
      outcome.cap_descs = caps;
      
      return callback(null, 'done');
    });
  };

  function asyncFinally(err, results){
  	keystone.list('CAP').model.where('ID').regex(/CAP_\d+/).sort('ID').exec(function(err, caps){
      if (err) {
        return callback(err, null);
      }
      caps.sort(function(a,b){
        return a.toObject().ID.split('_')[1] - b.toObject().ID.split('_')[1];
      });
      for (var i = 0; i < caps.length; i++) {
      	caps[i] = caps[i].toObject();
        caps[i].header = outcome.mission.CAPHeader;
      }
      outcome.cap_descs = caps;
      view.render('view_mission', { 
      	data: outcome
    	});
    });
    
  }

  async.parallel([getMissionInfo, getTAPDescriptors], asyncFinally);
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
    for (var i = 0; i < results.length; i++) {
      if(results[i]) { output[results[i]._t.split('_')[1]] = results[i]; } // filters out a null result
    }
    res.send(output);
  }
  if(req.params.t === 'all') {
  	console.log("ALL");
    keystone.db.models('TAPlog').distinct( '_t', { 'h.mid': req.params.mid } ).sort( { '_t': 1 } ).exec( function(err, taps) {
      async.map(taps, function(tap, callback){
        keystone.db.models('TAPlog').findOne( { 'h.mid': req.params.mid, '_t': req.params.mid + '-TAP_' + tap } ).sort( { '_t': -1 } ).exec( function(err, doc) {
          callback(null, doc);
        });
      }, tapFinally);
    });
  } else {
    var taplist = req.params.t;
    async.map(taplist, function(tap, callback){
      keystone.db.models[req.params.mid + '-TAP_' + tap].findOne({}).sort( { 'h.Sequence Number': -1 } ).exec( function(err, doc) {
        console.log(doc);
        callback(null, doc);
      });
    }, tapFinally);
  }
};

exports.cap = function(req, res, next){
  //var workflow = req.app.utility.workflow(req, res);
	//console.log(workflow);
  //workflow.on('validate', function() {
  //  workflow.emit('findTAP');
  //});

  //workflow.on('findTAP', function() {
  function findTAP() {
    var outcome = {};

    function getNextCAPSeq(callback) {
    	keystone.db.models.CAPlog.findOne( { 'h.mid': parseInt(req.params.mid) }, {}, {sort: { 'h.Sequence Number': -1 } } ).exec( function(err, cap) {
        if (err) {
          return callback(err, null);
        }
        outcome.s = (cap ? cap.toObject().h.s + 1 : 1);
        return callback(null, 'done');

      });
    }

    function getLastTAPSNAP(callback) {
      keystone.db.models.TAPlog.findOne({ 'h.mid': parseInt(req.params.mid) }, {}, {sort: { 'h.Sequence Number': -1 } } ).exec( function(err, tap) {
        if (err) {
          return callback(err, null);
        }
        //console.log('tap', tap);
        outcome.xt_snap = (tap ? tap.getNewSNAPTime(req.body.cap.h.xt) : 0);
        return callback(null, 'done');
      });
    }

    function asyncFinally(err, results){
      if(err) {
        console.log(err);
      }
      return logCAP(outcome);
    }
    async.parallel([getNextCAPSeq, getLastTAPSNAP], asyncFinally);
  };

  function logCAP(newdata) {
    var cap = req.body.cap;
    cap.h.s = newdata.s;
    cap.td = null;
    cap.h["Sequence Number"] = newdata.s;
    cap.h["Execution Time"] = newdata.xt_snap;
    cap.h.mid = parseInt(req.params.mid);
    keystone.db.models[req.params.mid + '-CAP_'+ cap.h.t].create(cap, function(err, newcap) {
      if (err) {
        console.log(err);
      }
			//console.log("about to send out socket.emit", newcap);
			//keystone.listener.of('/gs').emit('cap', newcap);
            
      //workflow.outcome.cap = newcap;
      //if(req.app.httpio)  req.app.httpio.of('/gs').emit('cap', newcap);
      //if(req.app.httpsio) req.app.httpsio.of('/gs').emit('cap', newcap);
      //return workflow.emit('response');
    });
  };

  findTAP();
};
