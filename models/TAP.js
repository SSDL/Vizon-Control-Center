var keystone = require('keystone'),
	Types = keystone.Field.Types;
	

/**
 * TAP Model
 * ==========
 */

var TAP = new keystone.List('TAP', {
	track: true,
	map: { name: 'ID' },
	autokey: { path: 'slug', from: 'ID missionId ', unique: true }
});

TAP.add({
	ID: { type: String, required: true, match: [/TAP_\d+$/, 'ID Format must be TAP_#'] },
	missionId: { type: Types.Relationship, ref: 'Mission', index: true, many: true, initial: true , required: true},
	name: { type: String, required: true, initial: true },
	length: { type: Number, required: true, initial: true },
	package: {type: Types.TextArray, required: false, initial: false}
});

TAP.schema.pre('save', function(next) {
	tap = this;
	TAP.model.find({'ID' : tap.ID, 'missionId': {$in:tap.missionId}} , function(err, taps) {
		console.log(taps);
		for (var k in taps) {
			if (!taps[k]._id.equals(tap._id)) {
				var err = new Error(tap.ID + ' already exists for the specified Mission');
				next(err);
			}
		}
		next();
	});
});

TAP.schema.post('save', function(tap) {
	TAP.model.populate(tap, 'missionId', function(err, data) {
		data = data.toObject();
		for (var k in data.missionId) {
			delete keystone.mongoose.connection.models[data.missionId[k].missionId + '-' + data.ID];
		}
		for (var i in data.missionId) {
			keystone.mongoose.connection.funcs.loadPacketModel(data.missionId[i].missionId + '-' + data.ID);
		}
	});
});

function validator (val, callback) {
	console.log(val);
	callback(true);
}

TAP.schema.path('missionId').validate( validator, 'validation of `{PATH}` failed with value `{VALUE}`');

TAP.defaultColumns = 'ID, name, length, missionId|20%';
TAP.register();
