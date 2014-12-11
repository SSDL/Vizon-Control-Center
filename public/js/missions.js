/* global app:true, EventEmitter, io */
  'use strict';
  //var $ = require('jquery-browserify');

$(function() {
  var EventEmitter = require('events').EventEmitter;
  //var moment = require('moment');
  //var _ = require('underscore');
  //var app = require('keystone');
  //var Backbone = require('backbone');
  var ee = new EventEmitter();
  var socket;
  //app = false;
  //app = app || {};
	var app = {};

  app.MissionData = Backbone.Model.extend({
    defaults: {
      status: 'Disconnected'
    },
    url: function() {
      return '/mission/'+app.mainView.model.get('mission').missionId+'/';
    }
  });

  app.TAP = Backbone.Model.extend({
    parse: function(response) {
      if (response[this.get('tapId')]) {
        response.tap = response[this.get('tapId')];
        response.tap_desc = app.mainView.model.get('tap_descs')['TAP_'+this.get('tapId')];
        delete response[this.get('tapId')];
      } else {
        // this is required to make the template happy. if a tap type has not been recorded, the
        // response data is {}. to make the template skip this tap type, we have to set the desc field to false
        response.tap_desc = false;
      }
      return response;
    },
    url: function() {
      return '/mission/'+app.mainView.model.get('mission').missionId+'/tap/' + this.get('tapId') + '/';
    }
  });

  app.CAP = Backbone.Model.extend({
    defaults: {
      cap: {
        h: {},
        p: {}
      }
    },
    url: function() {
      return '/mission/'+app.mainView.model.get('mission').missionId+'/cap/';
    }
  });

  app.CAPCollection = Backbone.Collection.extend({
    model: app.CAP
  });
  app.HeaderView = Backbone.View.extend({
    el: '#header',
    template: _.template( $('#tmpl-header').html() ),
    initialize: function() {
      this.model = app.mainView.model;
      this.listenTo(this.model, 'change', this.render);
      this.render();
    },
    render: function() {
      this.$el.html(this.template( this.model.attributes ));
    }
  });

  app.TAPView = Backbone.View.extend({
    template: _.template( $('#tmpl-raw').html() ),
    initialize: function() {
      var _this = this;
      this.listenTo(this.model, 'sync', this.render);
      ee.addListener('new-TAP_'+this.model.get('tapId'), function(){
        _this.model.fetch();
      });
      this.model.fetch();
    },
    render: function() {
      this.$el.html(this.template( this.model.attributes ));
    }
  });

  app.CAPView = Backbone.View.extend({
    tagName: 'div',
    //el: '#cap',
    template: _.template( $('#tmpl-cap').html() ),
    events: {
      "click .btn-send": "send"
    },
    initialize: function() {
      this.model = new app.CAP();
    },
    render: function() {
      // because of the headers in the cap list, we have to subtract the number of headers above the
      // current selection (stored in data-offset at template runtime) from the selectedIndex of the list
      this.cap_desc = app.capCollectionView.collection.models[$('#cap_selector').prop('selectedIndex')-$('#cap_selector').find('option:selected').data('offset')].attributes;
      var attrs = {
        tap_descs: app.mainView.model.get('tap_descs'),
        tap_opts_template: _.template( $('#tmpl-tap-dropdown').html() )
      };
      _.extend(attrs,this.cap_desc);
      this.$el.html(this.template( attrs ));
      var picker = $('.datetimepicker',this.$el);
      console.log(picker);
      picker.datetimepicker({
        format: 'yyyy-mm-ddThh:ii:ss', // datepicker format found at http://www.malot.fr/bootstrap-datetimepicker/
        autoclose: 1,
        todayBtn:  1,
        todayHighlight: 1,
        minuteStep: 1,
        startView: 2,
        forceParse: 0,
        pickerPosition: 'bottom-left',
        keyboardNavigation: 0
      })
      .on('changeDate', function(){
        var elem = $(this).children('input');
        elem.val(moment(elem.val()).seconds(0).toISOString());
      });

      picker.children('input')
      .mouseover(function(){
        $(this).data('holder',$(this).prop('placeholder'));
        $(this).attr('placeholder', 'Enter datetime string. End with \'Z\' for UTC, otherwise Local');
      })
      .mouseout(function() {
        $(this).prop('placeholder', $(this).data('holder'));
      })
      .change(function() {
        if ($(this).val() === '') { return; }
        var time = moment( $(this).val() );
        if(!time.isValid()) {
          var num = parseInt($(this).val());
          if(num < moment('Jan 1, 1980').utc()) { time = moment(num * 1000); }
          else { time = moment.utc(num); }
        }
        $(this).val( time.isValid() ? time.toISOString() : 'Invalid Entry');
      });

      picker.children('.pickerbutton')
      .mouseover(function() {
        $(this).prevAll('input').data('holder', $(this).prevAll('input').prop('placeholder'));
        $(this).prevAll('input').attr('placeholder', 'Select a UTC datetime');
      })
      .mouseout(function() {
        $(this).prevAll('input').prop('placeholder', $(this).prevAll('input').data('holder'));
      });

      $('input.interval',this.$el).keyup(function(){
        $('span.output').html(($(this).val() === '' || (parseInt($(this).val()) === 0) ? 'never' : moment().add('seconds',parseInt($(this).val())).fromNow()));
      });

      return this;
    },
    send: function() {
      var _this = this;
      var val = '';
      console.log(this);
      var cap = { h: {}, p: {}};
      _.each(this.cap_desc.package, function(elem) {
      	var f = elem.split(',')[0];
        if ( f !== "") {
					var field =  _this.$el.find('[name="'+ f +'"]');
					if(field.size()) { val = field.val(); }
					if(val === '') { val = 0; }
					if(field.data('isdate')) { cap.p[f] = (new Date(val)).valueOf()/1000; }
					else { cap.p[f] = parseInt(val); }
				}
      });
      console.log(this)
      cap.h.t = this.cap_desc.ID.split('_')[1];
      var field =  _this.$el.find('[name="xt"]');
      val = (field.val() === '' ? moment() : moment(field.val())); // moment format not used but found at http://momentjs.com/docs/#/parsing/string-format/
      if(!val.isValid()) { val = moment(field.val()); }
      cap.h.xt = val.valueOf();
      this.model.set('cap', cap);
      this.model.save();
    }
  });

  app.CAPCollectionView = Backbone.View.extend({
    el: '#caps',
    template: _.template( $('#tmpl-cap-dropdown').html() ),
    events: {
      "change #cap_selector": "show"
    },
    initialize: function() {
      this.views = [];
      this.collection = new app.CAPCollection( app.mainView.model.get('cap_descs') );
      this.listenTo(this.collection, 'reset', this.render);
      this.collection.each(function() {
        this.views.push(new app.CAPView());
      }, this);
      this.render();
      $('#cap_selector').prop('selectedIndex',-1);
    },
    render: function() {
    	console.log(this);
      this.$el.html( this.template({ cap_descs: this.collection.models }));
    },
    show: function() {
    	console.log(this.views[1]);
    	console.log(this.views);
    	console.log(this.views[0]);
      $('#cap').empty().append(this.views[$('#cap_selector').prop('selectedIndex')-1].render().el);
    }
  });

  app.MainView = Backbone.View.extend({
    el: ('.page .container'),
    initialize: function() {
      app.mainView = this;
      this.model = new app.MissionData( JSON.parse( unescape($('#data-mission').html()) ) );
      if(this.model.get('tap_descs').TAP_1) { app.beaconView = new app.TAPView({el: '#beacon', model: new app.TAP({tap: {}, tapId: 1})}); }
      if(this.model.get('tap_descs').TAP_2) { app.bustelemView = new app.TAPView({el: '#cmdecho', model: new app.TAP({tap: {}, tapId: 2})}); }
      if(this.model.get('tap_descs').TAP_3) { app.bustelemView = new app.TAPView({el: '#bustelem', model: new app.TAP({tap: {}, tapId: 3})}); }
      if(this.model.get('tap_descs').TAP_4) { app.lmrsttelemView = new app.TAPView({el: '#lmrsttelem', model: new app.TAP({tap: {}, tapId: 4})}); }
      if(this.model.get('tap_descs').TAP_5) { app.lmrsttelemView = new app.TAPView({el: '#config', model: new app.TAP({tap: {}, tapId: 5})}); }
      if(this.model.get('tap_descs').TAP_13) { app.gpsView = new app.TAPView({el: '#gps', model: new app.TAP({tap: {}, tapId: 13})}); }
    }
  });

  $(document).ready(function() {
    app.mainView = new app.MainView();
    app.headerView = new app.HeaderView();
    app.capCollectionView = new app.CAPCollectionView();
		});
    socket = io.connect('/web');
    socket.on('connect', function () {
      socket.emit('join-mid',app.mainView.model.get('mission').missionId);
      app.headerView.model.set('status','Live');
    });
    socket.on('disconnect', function () {
      app.headerView.model.set('status','Disconnected');
    });
    socket.on('reconnect', function () {
      app.headerView.model.set('status','Live');
    });
    socket.on('error', function () {
      app.headerView.model.set('status','Unauthorized');
    });
    socket.on('new-tap', function (data) {
      ee.emitEvent('new-'+data);
    });
  });