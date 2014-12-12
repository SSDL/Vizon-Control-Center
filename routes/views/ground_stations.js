var keystone = require('keystone');

exports = module.exports = function(req, res) {

	var locals = res.locals,
		view = new keystone.View(req, res);

	// locals.section is used to set the currently selected
	// item in the header navigation.
	view.query('ground_stations', keystone.list('GroundStation').model.find().where('authorizedUsers').equals(req.user));
	locals.section = 'Ground Station';
	// Render the view
	view.render('ground_stations', {title: 'Ground Stations'});
};
