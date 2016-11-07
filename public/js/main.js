
var svg, path, grid, background, lands, landunits, points, projection, λ, φ, mSc, colSc, zoom, mp, angle = [-9,-22,0], width, height, zoom0, tooltip, legend, legBtn, modal, spin, t0=Date.now(), err;

queue()
	.defer(d3.json, "./res/world-110m.json")
	.defer(d3.json, "./res/meteorite.json")
	.await(init);

function init(err, datamap, datarock) {
	if (err) throw error;

	// Format filter data
	var data = datarock.features.filter(function(d) {
		if(d.geometry && d.geometry.coordinates[0] && d.geometry.coordinates[1] && d.properties.mass !== null) return d;
	});

	data.sort(function(a,b) {
		return +b.properties.mass - +a.properties.mass
	});

	data.forEach(function(d) {
		d.properties.mass = +d.properties.mass / 1000;
	});

	// Initialize scales
	λ = d3.scale.linear().range([0, 180]);
	φ = d3.scale.linear().range([0, 180]);
	mSc = d3.scale.pow().exponent(1 / 3).range([.5, 25])
		.domain(d3.extent(data, function(d) {return +d.properties.mass}));
	colSc = d3.scale.threshold()
		.domain([.05, .15, .3, 1, 10, 100, 1000])
		.range(['#b15928', '#ff7f00', '#ffff99', '#cab2d6', '#6a3d9a', '#9f28b4', '#fb5a99', '#e31a1c']);

	// Initialize svg and html elements
	landunits = topojson.feature(datamap, datamap.objects.land);

	svg = d3.select("body").append("svg").attr('class', 'globe');
	background = svg.append("circle").attr('class', 'bgglobe');

	grat = svg.append("path")
		.attr("class", "grat")
		.datum(d3.geo.graticule());

	lands = svg.append("path")
		.attr("class", "lands")
		.datum(landunits);

	points = svg.append('g').attr('class', 'points')
		.selectAll('g')
		.data(data)
		.enter()
			.append('path')
			.attr('class', 'symbol');

	tooltip = d3.select('body')
		.append('div').attr('class', 'tooltip')
	tooltip.append("h4");
	tooltip.append("p").attr("class", "mass");
	tooltip.append("p").attr("class", "clas");
	tooltip.append("p").attr("class", "lat");
	tooltip.append("p").attr("class", "lon");
	tooltip.append("p").attr("class", "date");

	legBtn = d3.select('body')
		.append('div').attr('class', 'btn-wrap')
		.append('h2');

	svg.append("g")
		.attr("class", "legendQuant")
		.attr("transform", "translate(35,65)");

	legend = d3.legend.color()
		.labels(['Less than 50 g.','50 to 150 g.','150 to 300 g.','300 to 1000 g.','1 to 10 Kg.', '10 to 100 Kg.','100 to 1000 Kg.','More than 1000 Kg.'])
		.labelFormat(d3.format(",.2r"))
		.labelOffset(5)
		.shape("circle")
		.scale(colSc);

	modal = d3.select('body')
		.append('div').attr('id', 'modal');
	modal.append('div').attr("class", "wrap")
		.append('h1').text('meteorite earth strikes map');
	modal.select('.wrap').append('p').text('click to hide');

	// Define projection
	projection = d3.geo.orthographic();

	draw();
};

function draw() {
	width = window.innerWidth;
	height = window.innerHeight;

	// Compute scales
	λ.domain([0, width]);
	φ.domain([0, height]);
	zoom0 = Math.min(width, height) / 2 - 20;

	// Define projection attributes and path
	projection
		.clipAngle(90)
		.rotate(angle)
		.precision(.5);

	path = d3.geo.path()
		.projection(projection);

	// Draw svg and html elements
	background
		.attr('cx', width / 2)
	    .attr('cy', height / 2)
		.attr("filter", "url(#glow)");

	points
		.attr("fill", function(d) { return colSc(d.properties.mass); })
		.on('mouseover', showTtip)
		.on('mouseout', hideTtip);

	svg
		.select(".legendQuant")
		.call(legend).selectAll('.swatch').attr('r', function(d,i) { return 3 + i;});

	legBtn
		.html('≡ <span>legend:</span>');

	d3.select('.btn-wrap').on('click', function(d) {
		var btn = d3.select('.btn-wrap').classed('active');
		var bool = btn ? false : true;

		d3.select('.btn-wrap').classed('active', bool)
			.select('span').classed('active', bool);
		d3.select('.legendQuant').classed('active', bool);
	});

	modal.on('click', function(d) {
		lands.attr("fill", '#111');
		modal.classed('hidden', true);
	});

	// Set autorotation :)
	spin = setInterval(function() {
	    var dt = Date.now() - t0;
	    projection.rotate([.01 * dt + 0, 0 * dt + 0]);
		lands.attr("d", path);
		grat.attr("d", path);
		points.attr("d", function(d) {
			path.pointRadius(mSc(d.properties.mass) * zoom.scale() / zoom0);
			return path(d);
		})
	}, 30);

	// Define zoon behavior
	zoom = d3.behavior.zoom()
		.translate([width / 2, height / 2])
		.scale(zoom0)
	    .scaleExtent([zoom0 / 4, 20 * zoom0])
		.on("zoomstart", zoomstart)
	    .on("zoom", zoom)
		.on("zoomend", zoomend);

	// Draw the world
	svg
		.attr("width", width)
		.attr("height", height)
		.call(zoom)
	    .call(zoom.event)
		.on("dblclick.zoom", null);
};

// Let's make it pan
function zoomstart() {
	mp = d3.mouse(svg.node().parentNode);
	angle = projection.rotate();
	if (mp[0]) { clearInterval(spin); }
	background.attr("fill", "url(#orthographic-fill)");
	lands.attr("fill", null);

}

function zoom() {
	// Calculate drag distance
	var mpz = d3.mouse(svg.node().parentNode);
	var dx = mpz[0] - mp[0];
	var dy = mp[1] - mpz[1];
	var ax = dx ? (λ(dx) * zoom0 / zoom.scale() + angle[0]) : angle[0];
	var ay = dy ? (φ(dy) * zoom0 / zoom.scale() + angle[1]) : angle[1];

	projection
		.translate([width / 2, height / 2])
		.rotate([ ax, ay, 0])
		.scale(zoom.scale());

	lands.attr("d", path);
	grat.attr("d", path);
	background.attr('r', zoom.scale());

	points
		.attr("d", function(d) {
			path.pointRadius(mSc(d.properties.mass) * zoom.scale() / zoom0);
			return path(d);
		});
}

function zoomend() {
	background.attr("fill", "url(#gradBlue)");
	lands.attr("fill", function() {
		if(modal.classed('hidden')) return '#111';
		return null;
	});
}

// Tooltips
function showTtip(d) {
	var mp = d3.mouse(this);
	var c = d3.select(this).attr("fill");
	var lat = (+d.properties.reclat).toFixed(2);
	var lon = (+d.properties.reclong).toFixed(2);

	d3.select(this).style("stroke", '#1dff00').style('fill-opacity', 1);
	tooltip.style("left", mp[0] + 10 + "px").style("top", mp[1] + 10 + "px")
		.style("box-shadow", '0 0 6px 0 ' + c)
	tooltip.select("h4").text(d.properties.name);
	tooltip.select(".mass").text('mass: ' + d.properties.mass + " Kg.");
	tooltip.select(".clas").text('class: ' + d.properties.recclass);
	tooltip.select(".lat").text('lat: ' + lat + '° N');
	tooltip.select(".lon").text('lon: ' + lon + '° E');
	tooltip.select(".date").text('year: ' + d.properties.year.match(/^\d{4}/));
	tooltip.style("display", "block");
}

function hideTtip(d) {
	d3.select(this).style("stroke", '#fff').style('fill-opacity', .8);
	tooltip.style("display", "none");
}
