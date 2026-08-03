/* NewsToons globe chooser — drag/swipe to spin, tap a country to visit its
   edition. Works with mouse and touch (pointer events). Requires d3 v7 +
   topojson-client + countries-110m.json, all vendored. */
(function () {
  var mount = document.getElementById('globe');
  if (!mount || typeof d3 === 'undefined') return;

  // Editions registry: numeric ISO id -> edition info. `path` empty = coming soon.
  var EDITIONS = window.NEWSTOONS_EDITIONS || {
    840: { name: 'United States', label: 'English 🇺🇸', path: './', live: true },
    158: { name: 'Taiwan', label: '中文 🇹🇼', path: '', live: false },
  };

  var size = Math.min(mount.clientWidth || 340, 420);
  var radius = size / 2 - 6;
  var svg = d3.select(mount).append('svg')
    .attr('viewBox', '0 0 ' + size + ' ' + size)
    .attr('width', '100%').style('max-width', size + 'px')
    .style('touch-action', 'none').style('cursor', 'grab');

  var projection = d3.geoOrthographic()
    .scale(radius).translate([size / 2, size / 2]).rotate([100, -25]);
  var path = d3.geoPath(projection);

  svg.append('circle')
    .attr('cx', size / 2).attr('cy', size / 2).attr('r', radius)
    .attr('fill', '#7ec8ff').attr('stroke', '#1d5fd6').attr('stroke-width', 3);

  var landG = svg.append('g');
  var toast = d3.select('#globe-toast');

  d3.json('vendor/countries-110m.json').then(function (world) {
    var countries = topojson.feature(world, world.objects.countries).features;
    var sel = landG.selectAll('path').data(countries).enter().append('path')
      .attr('fill', function (d) {
        var e = EDITIONS[+d.id];
        return e ? (e.live ? '#ff7a1a' : '#ffd94d') : '#8fd48f';
      })
      .attr('stroke', '#ffffff').attr('stroke-width', 0.6)
      .style('cursor', 'pointer')
      .on('click', function (event, d) {
        if (dragged) return;
        var e = EDITIONS[+d.id];
        var msg;
        if (e && e.live && e.path) { window.location.href = e.path; return; }
        if (e) msg = e.name + ' NewsToons is sprouting — coming soon! 🌱';
        else msg = (d.properties && d.properties.name ? d.properties.name : 'That country') +
                   ' has no NewsToons yet — maybe you’ll make it one day! ✏️';
        if (!toast.empty()) {
          toast.text(msg).style('opacity', 1);
          clearTimeout(toast.node()._t);
          toast.node()._t = setTimeout(function () { toast.style('opacity', 0); }, 2600);
        }
      });
    sel.append('title').text(function (d) {
      return (d.properties && d.properties.name) || '';
    });
    render();

    function render() { landG.selectAll('path').attr('d', path); }

    // Drag to rotate (pointer events cover mouse + touch).
    var dragging = false, dragged = false, last = null;
    var node = svg.node();
    node.addEventListener('pointerdown', function (ev) {
      dragging = true; dragged = false; last = [ev.clientX, ev.clientY];
      node.setPointerCapture(ev.pointerId);
      svg.style('cursor', 'grabbing');
    });
    node.addEventListener('pointermove', function (ev) {
      if (!dragging) return;
      var dx = ev.clientX - last[0], dy = ev.clientY - last[1];
      if (Math.abs(dx) + Math.abs(dy) > 3) dragged = true;
      last = [ev.clientX, ev.clientY];
      var r = projection.rotate();
      var k = 75 / radius;
      projection.rotate([r[0] + dx * k, Math.max(-90, Math.min(90, r[1] - dy * k)), r[2]]);
      render();
    });
    ['pointerup', 'pointercancel'].forEach(function (t) {
      node.addEventListener(t, function () {
        dragging = false; svg.style('cursor', 'grab');
        setTimeout(function () { dragged = false; }, 0);
      });
    });

    // Gentle idle spin until first touch.
    var idle = d3.interval(function () {
      if (dragging || dragged) { idle.stop(); return; }
      var r = projection.rotate();
      projection.rotate([r[0] + 0.15, r[1], r[2]]);
      render();
    }, 40);
  });
})();
