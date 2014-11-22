$(function () {
	
	var socket = io.connect('/web');
	console.log(socket);
	socket.emit('querytaps', "works");
	socket.on('querytaps', function(data) {
		console.log(data);
	  data.forEach(function(data) {
	    var $newli = $( "<li role=presentation class=dropdown-header>");
	    $newli.text(data._id.toString() + ", " + data.n.toString());
	    for ( var i = 2; i < data.p.length; i++) {
	      var $newa = $( "<a class=variable role=menuitem tabindex=-1 href=#>");
	      $newa.text(data.p[i].n.toString());
	      $newli.append($newa);
        }
        $("#dropdown1").append($newli);
      });
	  
	});
	
	socket.on('querytimedata', function(data) {
	  data.series.sort(function(a, b) { 
    	return a[0] > b[0] ? 1 : -1;
 	  });
	  chart1.addSeries({
	    name: data.name,
	    data: data.series
	  });
	});
	
	$("#dropdown1").on('click', '.variable', function() {
	  var variable = $(this).text();
	  var tap = $(this).parent().contents()[0].wholeText.split(",")[0];
	  var $newl = $( "<li class=list-group-item>" );
	  $newl.text(variable);
	  var $newb = $( "<button class=rmvbutton ><span class=\"glyphicon glyphicon-remove\">" );
	  $newl.append($newb);
	  $("#selectedlist").append($newl);
	  socket.emit('querytimedata', [tap, variable]);
	});
	
	$("#selectedlist").on('click', '.rmvbutton', function() {
	  for(var i = chart1.series.length - 1; i > -1; i--)
	  {
		if(chart1.series[i].name == $(this).parent().contents()[0].wholeText )
		chart1.series[i].remove();
	  }
	  $(this).parent().remove();
	});
	  
	var chart1 = new Highcharts.Chart({
		chart: {
			renderTo: 'graphcontainer'
		},
		
		
		xAxis: {
			type: 'datetime',
			labels: {
				overflow: 'justify'
			}
		},
		title: {
			text: 'Battery Voltage'
		},
		
		series: [],/*[{
			name: 'Main Battery',
			data: (function () {
				var data = [], time = (new Date()).getTime(), i;
				for (i = -999; i <= 0; i += 1) {
					data.push([
						time + i *1000000,
						Math.random()*0.3 + 3.9
					]);
				}
				return data;
			}()),
			tooltip: {
				valueDecimals: 2,
				valueSuffix: 'V'
			}}],*/
		rangeSelector: {
			enabled: true,
			buttons: [{
				count: 1,
				type: 'hour',
				text: '1h'
			}, {
				count: 1,
				type: 'day',
				text: '24h'
			}, {
				count: 1,
				type: 'week',
				text: '1w'
			}],
			inputDateFormat: '%Y-%m-%d'
		},
		xAxis: {
			type: 'datetime',
			minRange: 60*60*1000
		},
		yAxis: {
			title: {
				text: 'Battery Voltage (V)'
			}/*,
			minorGridLineWidth: 0,
			gridLineWidth: 0,
			tickWidth: 1,
			alternateGridColor: null,
			plotBands: [{ // Dead
				from: 2,
				to: 2.9,
				color: 'rgba(255, 0, 0, 0.2)',
				label: {
					text: 'Dead',
					style: {
						color: '#606060'
					}
				}
			}, { // Nearly Dead
				from: 2.9,
				to: 3.65,
				color: 'rgba(255, 150, 0, 0.2)',
				label: {
					text: 'Nearly Dead',
					style: {
						color: '#606060'
					}
				}
			}, { // Partially Charged
				from: 3.65,
				to: 4.13,
				color: 'rgba(255, 255, 0, 0.2)',
				label: {
					text: 'Partially Charged',
					style: {
						color: '#606060'
					}
				}
			}, { // Fully Charged
				from: 4.13,
				to: 4.3,
				color: 'rgba(0, 255, 0, 0.2)',
				label: {
					text: 'Fully Charged',
					style: {
						color: '#606060'
					}
				}
			}]*/
		},
		navigator: {
			enabled: true
		}

	});
	
	$('#exportbutton').click(function() {
		if ( this.innerHTML == 'Scatter') {
			this.innerHTML = 'Line';
			for (var i = 0; i < chart1.series.length; i++) {
				chart1.series[i].update({
					type: 'scatter'       	
				});	
			}
		} else {
			this.innerHTML = 'Scatter';
			for (var i = 0; i < chart1.series.length; i++) {
				chart1.series[i].update({
					type: 'line'       	
				});	
			}
		}
	});
});