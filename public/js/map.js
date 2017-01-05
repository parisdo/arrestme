(function(d3) {
  "use strict";

  var communityData = d3.json("/communities", function(err, data) {
    if (err) {
      console.log(err);
      return;
    }
    makeMap(data);
  });
})(d3);

$.fn.scrollView = function () {
  return this.each(function () {
    $('html, body').animate({
      scrollTop: $(this).offset().top
    }, 500);
  });
}

getCommunityCrimes = function(community) {
  d3.json('/communities/' + community, function(err, data) {
    if (err) {
      console.log(err);
      return;
    }
    makeDonutChart(data);
    if(data.length > 0)
      $("#donutChartModal").modal()
  });
}

makeDonutChart = function(data) {
  var width = 1200,
      height = 600,
      radius = Math.min(width, height) / 2;

  var max = d3.max( data.map(function(d){ return parseInt(d.total); }) );
  var sum = d3.sum( data.map(function(d){ return parseInt(d.total); }) );

  var color = d3.scale.category20b();

/*
  var color = d3.scale.ordinal()
    .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
*/
  var remove = d3
    .select(".chart2")
    .select("svg")
    .remove()


  var arc = d3.svg.arc()
    .innerRadius(radius - 125)
    .outerRadius(radius - 50);

  var pie = d3.layout.pie()
    .sort(null)
    .startAngle(1.1 * Math.PI)
    .endAngle(3.1 * Math.PI)
    .value(function(d) { return d.total; });

  var chart = d3.select(".chart2")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 4 + "," + (radius)  + ")");

  var g = chart
    .selectAll(".arc")
    .data( pie(data) )
    .enter()
    .append("g")
    .attr("class", "arc");

  g.append("path")
    .attr("d", arc)
    .style("fill", function(d, i) { return donutColor(i); })
    .transition()
      .ease("exp")
      .duration(1200)
      .attrTween("d", tweenPie);

  function tweenPie(b) {
    var i = d3.interpolate({startAngle: 1.1 * Math.PI, endAngle: 1.1 * Math.PI}, b);
    return function(t) { return arc(i(t));};
  }

  var xCoor = -60;
  var yCoor = 20;

  var legendRectSize = 50;
  var legendSpacing = 4;

  var legend = chart.selectAll('.legend')
    .data( data )
    /*(function(d){ console.log(d); return d.crimes_description; }) )*/
    .enter()
    .append('g')
    .attr('class', 'legend')
    .attr('transform', function(d, i) {
      var height = legendRectSize + legendSpacing;
      var offset =  height * color.domain().length / 2;
      var horz = 6 * legendRectSize;
      var vert = i * height - offset - 150;
      return 'translate(' + horz + ',' + vert + ')';
    })
    .style('float', 'right');


    legend.append('rect')                                     // NEW
      .attr('width', legendRectSize)                          // NEW
      .attr('height', legendRectSize)                         // NEW
      .style('fill', function(d, i) { return donutColor(i); })                                   // NEW
      .style('stroke', color);                               // NEW

    legend.append('text')                                     // NEW
      .attr('x', legendRectSize + legendSpacing)              // NEW
      .attr('y', legendRectSize - legendSpacing)              // NEW
      .text(function(d) { return d.charge_description; })
      .attr("transform", "translate(" + 10 + "," + -15  + ")");

   g.append("text")
     .attr("transform", function(d) { return "translate(" + xCoor + "," + yCoor + ")"; })
     .style("opacity", "0")
     .style("font-size", "5em")
     .text(function(d) { return (Math.round(d.value/sum * 100) + "% "); });

};

function makeMap(data) {
  // console.log(data);

  var max = d3.max( data.map(function(d){ return parseInt(d.total); }) );

  // console.log(max);

  var map = L.map('mapid', { zoomControl: false }).setView([32.969, -116.9], 9);


  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    maxZoom: 18,
    id: 'p9kim.ppgijk1l',
    accessToken: 'pk.eyJ1IjoicDlraW0iLCJhIjoiY2luaGkweGh5MHZwMnU4a2p4aXAxaTh3ayJ9.v238swAmvFaC86OpYv7HXA'
  }).addTo(map);

  map.dragging.disable();
  map.touchZoom.disable();
  map.doubleClickZoom.disable();
  map.scrollWheelZoom.disable();
  map.keyboard.disable();

  var svg = d3.select(map.getPanes().overlayPane).append("svg"),
      g = svg.append("g").attr("class", "leaflet-zoom-hide");

d3.json("https://raw.githubusercontent.com/Saebyuckbaan/cogs121-sp16-ass2/master/sdcounty.json", function(error, collection) {
  if (error) throw error;

  // console.log(collection);

  var transform = d3.geo.transform({point: projectPoint}),
      path = d3.geo.path().projection(transform);

  var feature = g.selectAll("path")
    .data(collection.features)
    .enter()
    .append("path")
    .attr("id", function(d){ return d.properties.NAME; } )
    .attr("class", "map_piece")
    .on("click", function(d){ getCommunityCrimes(d.properties.NAME); } )
    .on("mouseover", function(d){ printInfo(d.properties.NAME, data); } );


  map.on("viewreset", reset);
  reset();

  // Reposition the SVG to cover the features.
  function reset() {
    var bounds = path.bounds(collection),
        topLeft = bounds[0],
        bottomRight = bounds[1];

    svg .attr("width", bottomRight[0] - topLeft[0])
        .attr("height", bottomRight[1] - topLeft[1])
        .style("left", topLeft[0] + "px")
        .style("top", topLeft[1] + "px");

    g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

    feature.attr("d", path)
    .style("fill", function(d, i){ return mapColor(d.properties.NAME, data, max); } );
  }

  // Use Leaflet to implement a D3 geometric transformation.
  function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
  }
});
};

function printInfo(name, data) {
  for(var i in data) {
    if( data[i].community == name ) {
      $('#initialText').css('display', 'none');
      $('#crimeInfoText').css('display', 'block');
      $('.communityName').text(name);
      $('#numberOfCrimes').text(data[i].total);
    }
  }
}

function mapColor(name, data, max) {
  var color = d3.scale.linear()
  .domain([0, .02, .2])
  .range(["white", "orange", "darkred"]);

  for(var i in data) {
    if( data[i].community == name ) {
      return color(data[i].total/max);
    }
  }

  return "black";
}

function donutColor(data) {
  var color = d3.scale.linear()
  .domain([0, 4])
  .range(["orange", "brown"]);
  return color(data);
}
