/**
 * Created by wangyong on 28/2/2017.
 */
var items = [
    {x: 50, y: 50, label: 'interesting label'},
    {x: 100, y: 120, label: 'some arb example'},
    {x: 300, y: 100, label: 'the last block'}
];

var glyph_items = [
    {'id': 'aaaa', 'price': 2, 'rating': [10, 20, 42, 20, 50], 'avg_rate': 3.5, 'pos': [100, 100]},
    {'id': 'bbbb', 'price': 1, 'rating': [4, 20, 12, 32, 190], 'avg_rate': 4.5, 'pos': [540, 340]},
    {'id': 'cccc', 'price': 3, 'rating': [20, 10, 10, 20, 42], 'avg_rate': 3.0, 'pos': [490, 90]}
];

var link_items = [
    {'start_id': 'aaaa', 'end_id': 'bbbb', 'start': 0, 'end': 1, 'weight': 20},
    {'start_id': 'aaaa', 'end_id': 'cccc', 'start': 0, 'end': 2, 'weight': 40},
    {'start_id': 'bbbb', 'end_id': 'cccc', 'start': 1, 'end': 2, 'weight': 10}
];

// we can increase this, everything will scale up with us
var w = 960, h = 500,
    svg = d3.select("#chart")
        .append("svg")
        .attr("width", w)
        .attr("height", h);

d3.myLink = function () {

    function my(selection) {
        selection.each(function (d, i) {
            console.log('link: d, i: ', d, i);
            var element = d3.select(this);

            //get the data
            var s_id = d['start'], e_id = d['end'];
            var start = glyph_items[s_id]['pos'], end = glyph_items[e_id]['pos'];
            var line_attributes = {
                'x1': start[0],
                'y1': start[1],
                'x2': end[0],
                'y2': end[1]
            }

            //draw the lines
            element.append('line')
                .attr(line_attributes)
                .classed('start_' + d['start_id'] + ' end_' + d['end_id'], true)
                .style('stroke', 'gray')
                .style('stroke-width', d['weight'] / 2);

        });
    }

    return my;
}

d3.myGlyph = function () {
    // var my_color = ['red', 'green', 'blue', 'brown', 'yellow'];
    var my_color = ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'];
    var min_r = 8, max_r = 60;
    var outer_radius_scale = d3.scale.linear().domain([40, 200]).range([min_r, max_r]);
    var central_color_scale = d3.scale.linear().domain([1.0, 5.0]).range([my_color[0], my_color[my_color.length - 1]]);

    function my(selection) {
        selection.each(function (d, i) {
            console.log('d,i', d, i);
            var element = d3.select(this);

            //calculate params
            var outer_radius = 0, inner_radius = min_r;
            for (var k = 0; k < d.rating.length; k++) {
                outer_radius += d.rating[k];
            }
            outer_radius = outer_radius_scale(outer_radius);


            //central circle
            element.append('circle')
                .attr('r', inner_radius)
                .style('fill', function () {
                    return central_color_scale(d.avg_rate);
                });

            //pie chart
            var arc = d3.svg.arc()
                .outerRadius(outer_radius)
                .innerRadius(inner_radius);
            var pie = d3.layout.pie()
                .sort(null)
                .value(function (d, i) {
                    return d;
                });
            var g_arc = element.selectAll('.arc')
                .data(pie(d.rating))
                .enter()
                .append('g')
                .attr('class', 'arc')
                .append('path')
                .attr('d', arc)
                .style('fill', function (item, j) {
                    return my_color[j];
                })
                .style('stroke', 'black')
                .style('stroke-width', '2px');

            //draw price bar
            var rect_size = 12, l_shift = 0, bars = [1, 1, 1, 1];
            var g_price_bars = element.append('g')
                .attr('class', '.price_bars')
                .selectAll('rect')
                .data(bars)
                .enter()
                .append('rect')
                .attr('x', function (item, j) {
                    return (j - d.price) * rect_size;
                })
                .attr('y', -(outer_radius + 15 + rect_size))
                .attr('width', rect_size)
                .attr('height', rect_size)
                .style('fill', function (item, j) {
                    if (j < d.price) {
                        return 'green';
                    }
                    else {
                        return 'white';
                    }
                })
                .style('stroke', 'brown')
                .style('stroke-width', '2px');

            //draw the arrow pointing to the price bars
            var arrow = [[0, -inner_radius / 2 - 4], [0, -(outer_radius + 13)]];
            console.log('arrow: ', arrow);
            var line = d3.svg.line()
                .x(function (d, j) {
                    return d[0];
                })
                .y(function (d, j) {
                    return d[1];
                });
            var g_arrow = element.append('g') //line
                .attr('class', 'arrow_line')
                .selectAll('path')
                .data([arrow])
                .enter()
                .append('path')
                .attr('d', line)
                .style('stroke', 'black')
                .style('stroke-width', '2px');

            var triangle_size = 20;
            var triangle = d3.svg.symbol().type('triangle-up').size(triangle_size);
            var g_triangle = element.append('g') //triangle
                .attr('class', 'arrow_triangle')
                .attr('transform', function () {
                    return 'translate(0,' + (-(outer_radius + 15 - 3)) + ')';
                })
                .selectAll('path')
                .data([1])
                .enter()
                .append('path')
                .attr('d', triangle)
                .style('fill', 'black');


            // //drag event that works on a transparent circle
            // var active_class_name = 'active_d3_item';
            // var drag = d3.behavior.drag()
            //     .on('dragstart', function (item, j) {
            //         console.log('drag start!');
            //         d3.select(this.parentNode).classed(active_class_name, true);
            //     })
            //     .on('dragend', function (item, j) {
            //         console.log('drag end!');
            //         d3.select(this.parentNode).classed(active_class_name, false);
            //     })
            //     .on('drag', function (item, j) { //item is still a row of glyph_items
            //         console.log('item: ', item);
            //         var cur_x = d3.transform(d3.select(this.parentNode).attr('transform')).translate[0],
            //             cur_y = d3.transform(d3.select(this.parentNode).attr('transform')).translate[1];
            //         var x = cur_x + d3.event.x;
            //         var y = cur_y + d3.event.y;
            //         console.log('x, y vs d3.event.dx, d3.event.dy, d3.event.x, d3.event.y:', x, y, d3.event.dx, d3.event.dy, d3.event.x, d3.event.y);
            //
            //         //move current group
            //         d3.select(this.parentNode).attr('transform', function () {
            //             return 'translate(' + x + ',' + y + ')';
            //         });
            //
            //         //move the links between glyphs
            //         var cur_id = item.id;
            //         d3.selectAll('line.' + 'start_' + cur_id)
            //             .attr('x1', x)
            //             .attr('y1', y);
            //         d3.selectAll('line.' + 'end_' + cur_id)
            //             .attr('x2', x)
            //             .attr('y2', y);
            //     });
            //
            // element.append('circle')
            //     .attr('r', outer_radius)
            //     .style('opacity', 0.1)
            //     .call(drag);

            //drag event can work on groups
            var active_class_name = 'active_d3_item';
            var drag = d3.behavior.drag()
                .on('dragstart', function (item, j) {
                    console.log('drag start!');
                    d3.select(this).classed(active_class_name, true);
                })
                .on('dragend', function (item, j) {
                    console.log('drag end!');
                    d3.select(this).classed(active_class_name, false);
                })
                .on('drag', function (item, j) { //item is still a row of glyph_items
                    console.log('item: ', item);
                    var cur_x = d3.transform(d3.select(this).attr('transform')).translate[0],
                        cur_y = d3.transform(d3.select(this).attr('transform')).translate[1];
                    var x = cur_x + d3.event.dx;
                    var y = cur_y + d3.event.dy;

                    //move current group
                    d3.select(this).attr('transform', function () {
                        return 'translate(' + x + ',' + y + ')';
                    });

                    //move the link
                    var cur_id = item.id;
                    d3.selectAll('line.' + 'start_' + cur_id)
                        .attr('x1', x)
                        .attr('y1', y);
                    d3.selectAll('line.' + 'end_' + cur_id)
                        .attr('x2', x)
                        .attr('y2', y);
                });

            element.call(drag);
        });
    }

    return my;
}


var glyph = d3.myGlyph();
var interLink = d3.myLink();
var draw_link = svg.selectAll('yyyy')
    .data(link_items)
    .enter()
    .append('g')
    .attr('class', 'interLink')
    .call(interLink);

var draw_glyph = svg.selectAll('xxxx')
    .data(glyph_items)
    .enter()
    .append('g')
    .attr('transform', function (d, i) {
        return "translate(" + d.pos[0] + ',' + d.pos[1] + ')';
    })
    .call(glyph);

