var keystone = require('keystone'),
	Types = keystone.Field.Types;
	

/**
 * TAP Model
 * ==========
 */

var TAP = new keystone.List('TAP', {
	map: { name: 'ID' },
	autokey: { path: 'slug', from: 'ID missionId ', unique: true }
});

TAP.add({
	ID: { type: String, required: true },
	missionId: { type: Types.Relationship, ref: 'Mission', index: true, many: true, initial: true , required: true},
	name: { type: String, required: true, initial: true },
	length: { type: Number, required: true, initial: true },
	package: {type: Types.TextArray, required: true, initial: true}
});

TAP.schema.post('save', function(tap) {
	TAP.model.populate(tap, 'missionId', function(err, data) {
		//console.log(keystone.db);
		delete keystone.mongoose.connection.models[data.missionId[0].missionId + '-' + data.ID];
		console.log(keystone.mongoose.connection.models);
		keystone.mongoose.connection.funcs.loadPacketModel(data.missionId[0].missionId + '-' + data.ID);
		console.log(keystone.mongoose.connection.models);
	});
});

TAP.defaultColumns = 'ID, name, length, missionId|20%';
TAP.register();
