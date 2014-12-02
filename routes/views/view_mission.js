var keystone = require('keystone');
var Mission = keystone.list('Mission').model;

exports = module.exports = function(req, res) {

	var locals = res.locals, view = new keystone.View(req, res);

	// locals.section is used to set the currently selected
	// item in the header navigation.
	locals.section = 'Missions';

	var mission_slug = req.params.mission;
	Mission.findOne({slug : mission_slug}).exec(function(err, mission) {
		if (err || !mission) {
			console.error(err);
			res.redirect('errors/404');
			next(err);
			return;
		}
		//view.query('TAPS', keystone.list('TAPS').model.find().sort('name').limit(3));
		view.render('view_mission', {
			mission : mission
		});
	});
};
