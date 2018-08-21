/**
 * Created by wangyong on 2/3/2017.
 */

d3.myLink = function (outer_leaflet_map, link_color_config) {
    var init_zoom_level = 15;
    var zoom_scale = Math.pow(1.3, init_zoom_level - outer_leaflet_map.getZoom()); //zoom scaling

    function my(selection) {
        selection.each(function (d, i) {
            // console.log('link: d, i: ', d, i);
            var element = d3.select(this);

            //get the data
            var start = d['start_pos'], end = d['end_pos'];
            start = JSON.parse(start);
            end = JSON.parse(end);
            var start_latlng = new L.LatLng(start[0], start[1]), end_latlng = new L.LatLng(end[0], end[1]);

            var line_attributes = {
                'x1': outer_leaflet_map.latLngToLayerPoint(start_latlng).x,
                'y1': outer_leaflet_map.latLngToLayerPoint(start_latlng).y,
                'x2': outer_leaflet_map.latLngToLayerPoint(end_latlng).x,
                'y2': outer_leaflet_map.latLngToLayerPoint(end_latlng).y,
            };

            //draw the lines
            element.append('line')
                .attr(line_attributes)
                .classed('start_' + d['start'] + ' end_' + d['end'], true)
                .style('stroke', link_color_config.link_color)
                .style('opacity', link_color_config.link_opacity)
                .style('stroke-width', d['weight'] / (3 * zoom_scale)); //zoom scaling

        });
    }

    return my;
}

d3.myGlyph = function (outer_leaflet_map, glyph_color_config) {
    var my_color = glyph_color_config.glyph_color_list;
    // var my_color = ['#fc8d59', '#fee090', '#ffffbf', '#e0f3f8', '#91bfdb'];// so so
    // var my_color = ['#d7191c', '#fdae61', '#ffffbf', '#abd9e9', '#2c7bb6'];  //looks good
    // var my_color = ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641']; //so so
    // var my_color = [ '#fc8d59', '#fee08b', '#ffffbf', '#d9ef8b', '#91cf60']; //looks good
    // var my_color = ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'];//sequential/
    var min_r = 1.5, max_r = 8;
    // var outer_radius_scale = d3.scale.linear().domain([40, 200]).range([min_r, max_r]);
    // var central_color_scale = d3.scale.linear().domain([1.0, 5.0]).range([my_color[0], my_color[my_color.length - 1]]);
    var central_color_scale = d3.scale.ordinal().domain([1, 2, 3, 4, 5]).range(my_color);


    //handle the zoom-in/out operation
    var init_zoom_level = 15;
    var zoom_scale = Math.pow(1.5, init_zoom_level - outer_leaflet_map.getZoom());
    // circles.attr('r', radius / zoom_scale);

    //record the selected glyphs
    var selected_glyphs_counting = [];

    function my(selection) {
        //find the max and min review number
        var max_review_num = -1, min_review_num = 1000000000;
        selection.each(function (d, i) {
            var review_counter = 0;
            for (var k = 0; k < d.rating.length; k++) {
                review_counter += d.rating[k];
            }

            if (review_counter > max_review_num)
                max_review_num = review_counter;
            if (review_counter < min_review_num)
                min_review_num = review_counter;
        });

        //draw the glyphs
        selection.each(function (d, i) {
            // console.log('d,i', d, i);
            var element = d3.select(this).attr('class', 'glyph_group');
            var outer_radius_scale = d3.scale.linear().domain([min_review_num, max_review_num]).range([min_r + 1, max_r]);

            //calculate params
            var outer_radius = 0, inner_radius = min_r;
            inner_radius = inner_radius / zoom_scale; //zoom scaling
            for (var k = 0; k < d.rating.length; k++) {
                outer_radius += d.rating[k];
            }
            outer_radius = outer_radius_scale(outer_radius);
            outer_radius = outer_radius / zoom_scale; //zoom scaling
            if (outer_radius < inner_radius + 5) {
                console.log('outer, inner radius: ', outer_radius, inner_radius);
                console.log('radius is too small!');
            }

            //central circle
            element.append('circle')
                .attr('r', inner_radius)
                .style('fill', function () {
                    var rating = d.stars;
                    if (rating >= 4)
                        rating = 5;
                    else if (rating >= 3.5 && rating < 4)
                        rating = 4;
                    else if (rating >= 2.5 && rating < 3.5)
                        rating = 3;
                    else if (rating >= 1.5 && rating < 2.5)
                        rating = 2;
                    else
                        rating = 1;
                    return central_color_scale(rating);
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
                .style('stroke', glyph_color_config.pie_stroke_color)
                .style('stroke-width', glyph_color_config.pie_stroke_width)
                .style('opacity', glyph_color_config.pie_stroke_opacity);

            //draw price bar
            var rect_size = 3, l_shift = 0, bars = [1, 1, 1, 1];
            rect_size = rect_size / zoom_scale; //zoom scaling
            var padding_bar_to_circle = 3 / zoom_scale;//zoom scaling
            var g_price_bars = element.append('g')
                .attr('class', 'price_bars')
                .selectAll('rect')
                .data(bars)
                .enter()
                .append('rect')
                .attr('x', function (item, j) {
                    // d.price_range = 3; //待修改
                    return (j - d.price_range) * rect_size;
                })
                .attr('y', -(outer_radius + padding_bar_to_circle + rect_size))
                .attr('width', rect_size)
                .attr('height', rect_size)
                .style('fill', function (item, j) {
                    if (j < d.price_range) {
                        return glyph_color_config.price_rect_fill;
                    }
                    else {
                        return 'white';
                    }
                })
                .style('stroke', glyph_color_config.price_rect_stroke_color)
                .style('stroke-width', glyph_color_config.price_rect_stroke_width)
                .style('opacity', glyph_color_config.price_rect_opacity);

            //draw the arrow pointing to the price bars
            var arrow = [[0, -inner_radius / 2 - 1 / zoom_scale], [0, -(outer_radius + padding_bar_to_circle)]]; //need to scale the padding
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
                .style('stroke', glyph_color_config.arrow_stroke_color)
                .style('stroke-width', glyph_color_config.arrow_stroke_width)
                .style('opacity', glyph_color_config.arrow_stroke_opacity);

            var triangle_size = glyph_color_config.arrow_triangle_size;
            triangle_size = triangle_size / zoom_scale; //zoom scaling
            var triangle = d3.svg.symbol().type('triangle-up').size(triangle_size);
            var g_triangle = element.append('g') //triangle
                .attr('class', 'arrow_triangle')
                .attr('transform', function () {
                    return 'translate(0,' + (-(outer_radius + padding_bar_to_circle - 3)) + ')';
                })
                .selectAll('path')
                .data([1])
                .enter()
                .append('path')
                .attr('d', triangle)
                .style('fill', glyph_color_config.arrow_triangle_fill)
                .style('opacity', glyph_color_config.arrow_triangle_opacity);

            // //drag event that works on a transparent circle
            // var active_class_name = 'active_d3_item';
            // var drag = d3.behavior.drag()
            //     .origin(function () {
            //         var cur_x = d3.transform(d3.select(this.parentNode).attr('transform')).translate[0],
            //             cur_y = d3.transform(d3.select(this.parentNode).attr('transform')).translate[1];
            //         return {'x': cur_x, 'y': cur_y};
            //     })
            //     .on('dragstart', function (item, j) {
            //         console.log('drag start!    ', d3.mouse(this)[0], d3.mouse(this)[1]);
            //         d3.select(this.parentNode).classed(active_class_name, true);
            //         outer_leaflet_map.dragging.disable();
            //
            //     })
            //     .on('dragend', function (item, j) {
            //         console.log('drag end!');
            //         d3.select(this.parentNode).classed(active_class_name, false);
            //         outer_leaflet_map.dragging.enable();
            //     })
            //     .on('drag', function (item, j) { //item is still a row of glyph_items
            //         console.log('item: ', item);
            //         var cur_x = d3.transform(d3.select(this.parentNode).attr('transform')).translate[0],
            //             cur_y = d3.transform(d3.select(this.parentNode).attr('transform')).translate[1];
            //         // var x = cur_x + d3.event.dx;
            //         // var y = cur_y + d3.event.dy;
            //         var x = cur_x + d3.mouse(this)[0];
            //         var y = cur_y + d3.mouse(this)[1];
            //         // console.log('x, y: ', x, y, d3.mouse(this));
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
            //     .style('opacity', 0.9)
            //     .call(drag);

            //drag event can work on groups
            var active_class_name = 'active_d3_item';
            var drag = d3.behavior.drag()
                .on('dragstart', function (item, j) {
                    console.log('drag start!');
                    d3.select(this).classed(active_class_name, true);
                    outer_leaflet_map.dragging.disable();
                })
                .on('dragend', function (item, j) {
                    console.log('drag end!');
                    d3.select(this).classed(active_class_name, false);
                    outer_leaflet_map.dragging.enable();
                })
                .on('drag', function (item, j) { //item is still a row of glyph_items
                    // console.log('item: ', item);
                    var cur_x = d3.transform(d3.select(this).attr('transform')).translate[0],
                        cur_y = d3.transform(d3.select(this).attr('transform')).translate[1];
                    var x = cur_x + d3.event.dx;
                    var y = cur_y + d3.event.dy;

                    //move current group
                    d3.select(this).attr('transform', function () {
                        return 'translate(' + x + ',' + y + ')';
                    });

                    //move the link
                    var cur_id = item['business_id'];
                    d3.selectAll('line.' + 'start_' + cur_id)
                        .attr('x1', x)
                        .attr('y1', y);
                    d3.selectAll('line.' + 'end_' + cur_id)
                        .attr('x2', x)
                        .attr('y2', y);
                });
            element.append('circle') //Because of the bug of leaflet, we should make the whole area respond to dragging event!
                .attr('r', outer_radius)
                .attr('class', 'hidden_circle')
                .style('opacity', 0.0);

            //handle the event of dragging elements
            element.on('touchmove', function () { //for distinguishing the click event and dragging event
                d3.event.preventDefault();
            }).call(drag);

            //handle the event of clicking
            //click circles to select glyph
            element.select('circle.hidden_circle')
                .on('click', function (item, j) {

                    if (d3.event.defaultPrevented == false) { //it is click event
                        console.log('let us select this glyph!');
                        console.log('clicked hidden_circles: ', item, j);

                        var glyph_group = this.parentNode;
                        if (d3.select(glyph_group).select('g.highlight_rectangles')[0][0] == null) { //we need to highlight it
                            //check if we have selected two venues or not
                            if (selected_glyphs_counting.length >= 2) {
                                alert('You have already selected two venues! Please de-select one!');
                                return;
                            }

                            //otherwise
                            var highlight_group = d3.select(glyph_group).append('g').classed('highlight_rectangles', true);
                            var r = d3.select(glyph_group).select('circle.hidden_circle').attr('r');
                            r = parseInt(r) + 1;
                            var d = 'M' + (-r - 2) + ' ' + (-r)
                                + ' L' + (r) + ' ' + (-r)
                                + ' L' + (r) + ' ' + (r)
                                + ' L' + (-r) + ' ' + (r)
                                + ' L' + (-r) + ' ' + (-r);
                            highlight_group.append('path').attr('d', d)
                            .attr('stroke', 'blue')
                            //     .attr('stroke', '#d73027')
                            //     .attr('stroke', '#4575b4')
                                .attr('stroke-width', '3px')
                                .attr('fill', 'none');

                            //save it
                            selected_glyphs_counting.push(glyph_data_item);
                        }
                        else {
                            d3.select(glyph_group).select('g.highlight_rectangles').remove(); //we need to remove it

                            var tmp = []; //update the selection list
                            for (var k = 0; k < selected_glyphs_counting.length; k++) {
                                if (selected_glyphs_counting[k]['business_id'] != glyph_data_item['business_id']) {
                                    tmp.push(selected_glyphs_counting[k]);
                                }
                            }
                            selected_glyphs_counting = tmp;
                        }

                        //check the number of selected glyphs
                        if (selected_glyphs_counting.length == 2) {
                            console.log('Selection is done! ', selected_glyphs_counting);
                            pipService.emitVenueSelectionIsReady(selected_glyphs_counting);
                        }
                        else if (selected_glyphs_counting.length < 2) {
                            console.log('remove common customer comparison view!');
                            pipService.emitRemoveCommonCustomerCompView(selected_glyphs_counting);
                        }

                    }

                });

            //click price rectangles to delete a glyph
            var glyph_data_item = d;
            element.select('g.price_bars')
                .selectAll('rect')
                .on('click', function (item, j) {
                    if (d3.event.defaultPrevented == false) { //it is click event
                        console.log('let us remove this glyph!');
                        console.log('clicked glyph-price-rects: ', glyph_data_item, j);

                        //remove the glyph
                        d3.select(this.parentNode.parentNode).remove();
                        //remove the links
                        var start_class = 'start_' + glyph_data_item['business_id'], end_class = 'end_' + glyph_data_item['business_id'];
                        d3.selectAll('line.' + start_class).remove();
                        d3.selectAll('line.' + end_class).remove();
                    }


                });


            // //click circles to delete glyph
            // element.select('circle.hidden_circle')
            //     .on('click', function (item, j) {
            //         if (d3.event.defaultPrevented == false) { //it is click event
            //             console.log('let us remove this glyph!');
            //             console.log('clicked glyph-circle: ', item, j);
            //
            //             //remove the glyph
            //             d3.select(this.parentNode).remove();
            //             //remove the links
            //             var start_class = 'start_' + item['business_id'], end_class = 'end_' + item['business_id'];
            //             d3.selectAll('line.' + start_class).remove();
            //             d3.selectAll('line.' + end_class).remove();
            //         }
            //     });
            //
            // //click price rectangles to select a glyph
            // var glyph_data_item = d;
            // element.select('g.price_bars')
            //     .selectAll('rect')
            //     .on('click', function (item, j) {
            //         if (d3.event.defaultPrevented == false) { //it is click event
            //             console.log('let us select this glyph!');
            //             console.log('clicked glyph-price_rectangles: ', glyph_data_item);
            //
            //             var glyph_group = this.parentNode.parentNode;
            //             if (d3.select(glyph_group).select('g.highlight_rectangles')[0][0] == null) { //we need to highlight it
            //                 //check if we have selected two venues or not
            //                 if (selected_glyphs_counting.length >= 2) {
            //                     alert('You have already selected two venues! Please de-select one!');
            //                     return;
            //                 }
            //
            //                 //otherwise
            //                 var highlight_group = d3.select(glyph_group).append('g').classed('highlight_rectangles', true);
            //                 var r = d3.select(glyph_group).select('circle.hidden_circle').attr('r');
            //                 r = parseInt(r) + 1;
            //                 var d = 'M' + (-r-2) + ' ' + (-r)
            //                     + ' L' + (r) + ' ' + (-r)
            //                     + ' L' + (r) + ' ' + (r)
            //                     + ' L' + (-r) + ' ' + (r)
            //                     + ' L' + (-r) + ' ' + (-r);
            //                 highlight_group.append('path').attr('d', d)
            //                     .attr('stroke', 'blue')
            //                     .attr('stroke-width', '3px')
            //                     .attr('fill', 'none');
            //
            //                 //save it
            //                 selected_glyphs_counting.push(glyph_data_item);
            //             }
            //             else {
            //                 d3.select(glyph_group).select('g.highlight_rectangles').remove(); //we need to remove it
            //
            //                 var tmp = []; //update the selection list
            //                 for (var k = 0; k < selected_glyphs_counting.length; k++) {
            //                     if (selected_glyphs_counting[k]['business_id'] != glyph_data_item['business_id']) {
            //                         tmp.push(selected_glyphs_counting[k]);
            //                     }
            //                 }
            //                 selected_glyphs_counting = tmp;
            //             }
            //
            //             //check the number of selected glyphs
            //             if (selected_glyphs_counting.length == 2) {
            //                 console.log('Selection is done! ', selected_glyphs_counting);
            //                 pipService.emitVenueSelectionIsReady(selected_glyphs_counting);
            //             }
            //             else if (selected_glyphs_counting.length < 2) {
            //                 console.log('remove common customer comparison view!');
            //                 pipService.emitRemoveCommonCustomerCompView(selected_glyphs_counting);
            //             }
            //
            //         }
            //
            //     });


        });
    }

    return my;
}

