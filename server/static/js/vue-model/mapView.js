/**
 * Created by yiding on 2017/1/1.
 */

var navbar = new Vue({
        el: '#mapViewRealMap',
        delimiters: ['{{', '}}'],
        data: {
            my_map: undefined, //the map
            locations: [{'city': 'tempe', 'focus_location': [33.4230242165, -111.940247586]},
                {'city': 'las_vegas', 'focus_location': [36.2162287, -115.2446964]}],
            selected_venues: null, //selected venues
            area_coordinate: {
                'start': {'lat': '#', 'lng': '#'},
                'end': {'lat': '#', 'lng': '#'}
            }, //init it as non-number
            area_selection_mode: false,
            focus_location: [33.4230242165, -111.940247586],
            counter_of_mouse_event_adding: 0,
            current_city: 'tempe',
            current_type: 'all',
            glyph_items: undefined, //the list for all  the glyphs
            link_items: undefined, //the list for all the links between glyphs

            //color for glyphs
            glyph_color_config: {
                glyph_color_list: ['#d73027', '#fdae61', '#EFFF9A', '#abd9e9', '#4575b4'],
                pie_stroke_color: '#4d4d4d',
                pie_stroke_width: '1px',
                pie_stroke_opacity: 1.0,

                price_rect_fill: '#c994c7',//'#f0027f', //考虑灰一点的颜色,'#F0C1FF'
                price_rect_stroke_color: '#4d4d4d',
                price_rect_stroke_width: '1px',
                price_rect_opacity: 1.0,

                arrow_stroke_color: '#4d4d4d',
                arrow_stroke_width: '1px',
                arrow_stroke_opacity: 0.9,

                arrow_triangle_size: 6,
                arrow_triangle_fill: '#4d4d4d',
                arrow_triangle_opacity: 0.9,
            },
            // ['#f46d43', '#fdae61', '#ffffbf', '#abd9e9', '#74add1'], 淡蓝色,看起来稍好点
            // ['#fc8d59', '#fee090', '#ffffbf', '#e0f3f8', '#91bfdb'],延宏推荐用至少看起来像diverging的颜色,但是我感觉看上去太淡了一点
            // ['#E42536', '#FEB169', '#EFFF9A', '#AAD9E9', '#2F7CB7'] //改变下一行选择的颜色的纯度,根据qing的建议,延宏觉得颜色像categorical, link颜色 '#39C664'
            // ['#d7191c', '#fdae61', '#ffffbf', '#abd9e9', '#2c7bb6'];  //looks good, Qing suggested.
            // ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#39C664'] //looks better, green color. Improved based on Qing's suggestion, blue for links
            // ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641'] //Qing suggested, blue for links, but too much green
            // ['#ca0020', '#f4a582', '#f7f7f7', '#92c5de', '#0571b0'] //Qing suggested, yellow for links, but not good
            // ['#fc8d59', '#fee090', '#ffffbf', '#e0f3f8', '#91bfdb'];// so so
            // ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641']; //so so
            // [ '#fc8d59', '#fee08b', '#ffffbf', '#d9ef8b', '#91cf60']; //looks good
            // ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'];//sequential

            link_color_config: {
                link_color: '#969696', //'#39C664',
                link_opacity: 0.4
            },
            // '#39C664', looks good by Qing, ranking second for links
            //'#4BFFA0', not good
            //'#a6d96a', not good

        },
        methods: {
            drawInitMap: function () {
                var init_zoom_level = 18; //16;
                var map_url = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
                // var map_url = 'https://api.mapbox.com/styles/v1/jiayouwyhit/cj0v7h4by01112rt841x4wfkw/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiamlheW91d3loaXQiLCJhIjoiaG4waHJqbyJ9.AliGaDqqU-3jDFxsqLljew';

                this.my_map = L.map('mapViewRealMap');
                L.tileLayer(map_url, {
                    maxZoom: 22,
                    id: 'mapbox.streets'
                }).addTo(this.my_map);

                /////////////////===================== First Try ===================== ////////////////////
                // var streets = L.tileLayer(map_url,
                //     {
                //         maxZoom: 22,
                //         id: 'mapbox.streets'
                //     });
                // var grayscale = L.tileLayer(map_url,
                //     {
                //         maxZoom: 22,
                //         id: 'mapbox.light'
                //     });
                // var cities = new L.LayerGroup();
                //
                // this.my_map = L.map('mapViewRealMap', {
                //     layers: [grayscale, streets]
                // });
                // var baseLayers = {
                //     "Grayscale": grayscale,
                //     "Streets": streets
                // };
                // var overlays = {
                //     "Cities": cities
                // };
                // L.control.layers(baseLayers, overlays).addTo(this.my_map);

                /////////////////===================== Second Try ===================== ////////////////////
                // var cities = new L.LayerGroup();
                // var mbAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                //         '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                //         'Imagery © <a href="http://mapbox.com">Mapbox</a>',
                //     mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
                //
                // var grayscale = L.tileLayer(mbUrl, {id: 'mapbox.light', attribution: mbAttr}),
                //     streets = L.tileLayer(mbUrl, {id: 'mapbox.streets', attribution: mbAttr});
                //
                // this.my_map = L.map('mapViewRealMap', {
                //     center: [39.73, -104.99],
                //     zoom: 18,
                //     layers: [grayscale, cities],
                //     // layers: [cities]
                // });
                //
                // var baseLayers = {
                //     // "Grayscale": grayscale,
                //     "Streets": streets
                // };
                //
                // var overlays = {
                //     "Cities": cities
                // };
                // L.control.layers(baseLayers, overlays).addTo(this.my_map);

                this.my_map.setView([33.4230242165, -111.940247586], init_zoom_level);
            }
            ,
            drawGraph: function (locs, focus) {
                var init_zoom_level = 15, radius = 3;
                var _this = this;
                this.my_map.setView(focus, init_zoom_level);

                //remove the whole svg
                console.log('=================begin to draw graph================');
                var svg_handler = d3.select('#mapViewRealMap').select('svg');
                if (svg_handler[0][0] != null) {
                    console.log('################## removed!!!! ###########');
                    svg_handler.remove();
                }
                var svgLayer = L.svg();
                svgLayer.addTo(this.my_map);

                //check the area_selection_mode, and do corresponding mode-setting
                if (_this.area_selection_mode == true) {
                    d3.select('#mapViewRealMap').select('svg').classed('areaSelectionPointer', true);
                }
                else {
                    d3.select('#mapViewRealMap').select('svg').classed('areaSelectionPointer', false);
                }

                //draw all the circles of the whole city for initial brushing selection
                var svg_group = d3.select('#mapViewRealMap').select('svg').select('g').classed('venue_circles', true);
                var circle_handler = svg_group.selectAll('circle').data(locs);
                var circles = circle_handler.enter()
                    .append('circle')
                    .attr('id', function (d, i) {
                        return d['business_id'];
                    })
                    .attr('r', radius)
                    .attr('opacity', function (d, i) {
                        return 1.0;
                        // if (d.review_count < 30)
                        //     return 0.1;
                        // else if (d.review_count >= 300)
                        //     return 1.0;
                        // else
                        //     return d.review_count / 300;
                    })
                    .attr('fill', '#f03')
                    .on('click', function (d, i) {
                        console.log('circle is clicked!', d, d['review_count']);

                        var color = d3.select(this).attr('fill');
                        if (color == '#f03') {
                            if (_this.selected_venues.size < 2) {
                                d3.select(this).attr('fill', 'blue');
                                _this.selected_venues.add(d['business_id']);
                            }
                            if (_this.selected_venues.size == 2) {
                                //get and show the common graph
                                var selected_venues_list = Array.from(_this.selected_venues);
                                dataService.getSocialNetworkOfTwoBusiness(selected_venues_list[0], selected_venues_list[1]);
                                console.log('Two venues are selected: ', selected_venues_list[0], selected_venues_list[1]);
                            }
                        }
                        else {
                            d3.select(this).attr('fill', '#f03');
                            _this.selected_venues.delete(d['business_id']);
                        }
                    });
                svg_group.selectAll('circle')
                    .append('title')
                    .text(function (d, i) {
                        return 'Name: ' + d['name'] + '\n' + 'Review Count: ' + d['review_count'] + '\n'
                            + 'Stars: ' + d['stars'] + '\n' + 'Business ID: ' + d['business_id'];
                    });

                this.my_map.on('zoom', update);
                update();

                function update() {
                    console.log('zoom: ', _this.my_map.getZoom());

                    //handle all the initial circles
                    circles.attr('transform', function (d) {
                        var latlng = new L.LatLng(d['latitude'], d['longitude']);
                        return "translate(" + _this.my_map.latLngToLayerPoint(latlng).x + ',' + _this.my_map.latLngToLayerPoint(latlng).y + ')';
                    });
                    var zoom_scale = Math.pow(2, init_zoom_level - _this.my_map.getZoom());
                    circles.attr('r', radius / zoom_scale);

                    //handle the glyphs and their links
                    if (_this.glyph_items != undefined && _this.link_items != undefined) {
                        _this.drawLinkedGlyphs(_this.my_map, _this.glyph_items, _this.link_items);
                    }

                    //handle the area selection rectangle
                    var brush_rect = d3.select('#brush_rect_id');
                    if (brush_rect[0][0] != null) {
                        // console.log('update brush_rect: ', _this.area_coordinate, brush_rect);
                        var x = _this.my_map.latLngToLayerPoint(_this.area_coordinate.start).x;
                        var y = _this.my_map.latLngToLayerPoint(_this.area_coordinate.start).y;
                        var width = _this.my_map.latLngToLayerPoint(_this.area_coordinate.end).x - _this.my_map.latLngToLayerPoint(_this.area_coordinate.start).x;
                        var height = _this.my_map.latLngToLayerPoint(_this.area_coordinate.end).y - _this.my_map.latLngToLayerPoint(_this.area_coordinate.start).y;

                        d3.select('rect#brush_rect_id')
                            .attr('x', x)
                            .attr('y', y)
                            .attr('width', width)
                            .attr('height', height);
                    }

                }
            }
            ,
            drawLinkedGlyphs: function (my_map, glyph_items, link_items) {
                //remove existing one if it exists
                if (d3.select('#mapViewRealMap').select('svg').select('g.linked_glyphs')[0][0] != null) {
                    d3.select('#mapViewRealMap').select('svg').select('g.linked_glyphs').remove();
                }
                var svg = d3.select('#mapViewRealMap').select('svg').append('g').attr('class', 'linked_glyphs');

                var glyph = d3.myGlyph(my_map, this.glyph_color_config);
                var interLink = d3.myLink(my_map, this.link_color_config);
                var draw_link = svg.selectAll('xx')
                    .data(link_items)
                    .enter()
                    .append('g')
                    .attr('class', 'interLink')
                    .call(interLink);

                var draw_glyph = svg.selectAll('xxx')
                    .data(glyph_items)
                    .enter()
                    .append('g')
                    .attr('transform', function (d, i) {
                        var latlng = new L.LatLng(d['latitude'], d['longitude']);
                        return "translate(" + my_map.latLngToLayerPoint(latlng).x + ',' + my_map.latLngToLayerPoint(latlng).y + ')'; //transformation
                    })
                    .call(glyph);

                //append text
                svg.selectAll('g.glyph_group')
                    .append('title')
                    .text(function (d, i) {
                        return 'Name: ' + d['name'] + '\n' + 'Review Count: ' + d['review_count'] + '\n'
                            + 'Stars: ' + d['stars'] + '\n' + 'Price Level: ' + d['price_range'] + '\n'
                            + 'Business ID: ' + d['business_id'];
                    });
            }
            ,
            removeBrushRect: function () {
                var svg = d3.select('#mapViewRealMap').select('svg');
                var brush_rect = svg.select('#brush_rect_id');
                if (brush_rect[0][0] != null) {
                    brush_rect.remove();
                }
            }
            ,
            clearAreaCoordinate: function () {
                this.area_coordinate = {
                    'start': {'lat': '#', 'lng': '#'},
                    'end': {'lat': '#', 'lng': '#'}
                };
            }
            ,

        }
        ,

        created: function () {
            console.log('Map view is created!');
            this.selected_venues = new Set();
        }
        ,

        mounted: function () {
            var _this = this;
            console.log('Map view is mounted!');

            this.drawInitMap();//draw the initial map
            pipService.onCityOrTypeIsChanged(function (msg) {
                _this.current_city = msg.city, _this.current_type = msg.type, _this.focus_location = msg.focus;
                dataService.getVenueInfoOfOneCityAndType(_this.current_city, _this.current_type);
            });

            // dataService.getVenueInfoOfOneCityAndType(_this.locations[0].city);
            pipService.onBusinessDataIsReady(function (msg) {
                //remove the existing selected area and corresponding glyphs
                _this.glyph_items = undefined;
                _this.link_items = undefined;
                _this.drawGraph(dataService.business_of_one_city_type, _this.focus_location);

                console.log('business_of_one_city_type: ', dataService.business_of_one_city_type);

                //monitor the selection of a region
                if (_this.counter_of_mouse_event_adding < 1) {
                    _this.counter_of_mouse_event_adding++;

                    var area_selection_flag = false;
                    _this.my_map.on('mousedown', function (e) {
                        if (_this.area_selection_mode) {
                            area_selection_flag = true;
                            console.log('map mousedown here: ', e, e.latlng);
                            _this.clearAreaCoordinate();
                            _this.area_coordinate.start = e.latlng;

                            //remove
                            _this.removeBrushRect();
                        }
                    });
                    _this.my_map.on('mousemove', function (e) {
                        if (_this.area_selection_mode && area_selection_flag) {
                            // console.log('map mouse move: ', e, e.latlng);
                            _this.area_coordinate.end = e.latlng;
                        }
                    });
                    _this.my_map.on('mouseup', function (e) {
                        if (_this.area_selection_mode && area_selection_flag) {
                            area_selection_flag = false;
                            console.log('map mouse up: ', e, e.latlng);
                            _this.area_coordinate.end = e.latlng;
                        }
                    });
                }
            });
            pipService.onStartAreaSelection(function (msg) {
                _this.area_selection_mode = msg;
                var svg = d3.select('#mapViewRealMap').select('svg');

                if (_this.area_selection_mode == true) {
                    _this.my_map.dragging.disable();
                    svg.classed('areaSelectionPointer', true);
                }
                else {
                    _this.my_map.dragging.enable();
                    svg.classed('areaSelectionPointer', false);
                }

            });
            pipService.onSubmitSelectionArea(function (msg) {
                //remove existing red circles on the map
                d3.select('#mapViewRealMap').select('g.venue_circles').selectAll('circle').remove();

                //query data for a region
                if (_this.area_coordinate.start.lat == _this.area_coordinate.end.lat &&
                    _this.area_coordinate.start.lng == _this.area_coordinate.end.lng) {
                    alert('You have not brush a region on map!');
                    return;
                }

                dataService.getBusinessAndLinksOfSelectedRegion(_this.current_city, _this.current_type,
                    _this.area_coordinate.start, _this.area_coordinate.end);
            });
            pipService.onClearSelectionArea(function (msg) {
                //clear selected area
                _this.clearAreaCoordinate();
                _this.removeBrushRect();
            });
            pipService.onBusinessAndLinksOfSelectedRegionIsReady(function (msg) {
                console.log('Data of selected region is ready; Start to draw Linked Glyph ======');
                _this.glyph_items = msg.nodes;
                _this.link_items = msg.links;
                _this.drawLinkedGlyphs(_this.my_map, _this.glyph_items, _this.link_items);
                console.log('Data of selected region is ready; FINISH drawing Linked Glyph ======');
            });

            //monitor the case when sliders are changed
            pipService.onFilteringSliderIsChanged(function (msg) {
                console.log(' Slider is changed !!!!!Start to filter venue circles and linked glyphs!!######### ', msg);

                function checkSingleGlyphFlag(d, msg) {
                    var flag = d.price_range >= msg[0].cur_min && d.price_range <= msg[0].cur_max &&
                        d.review_count >= msg[1].cur_min && d.review_count <= msg[1].cur_max &&
                        d.stars >= msg[2].cur_min && d.stars <= msg[2].cur_max;
                    return flag;
                }

                //venue circles
                var venue_circles_g = d3.select('#mapViewRealMap').select('svg').select('g.venue_circles');
                if (venue_circles_g[0][0] != null) {
                    //写到这 msg = [this.price_slider, this.customer_slider, this.rating_slider, this.link_slider];
                    venue_circles_g.selectAll('circle')
                        .filter(function (d, i) {
                            if (d.price_range == null || d.review_count == null || d.stars == null) {
                                return false;
                            }
                            var flag = checkSingleGlyphFlag(d, msg);
                            return flag;
                        })
                        .attr('opacity', 1.0);
                    venue_circles_g.selectAll('circle')
                        .filter(function (d, i) {
                            if (d.price_range == null || d.rating == null || d.stars == null) {
                                return true;
                            }
                            var flag = checkSingleGlyphFlag(d, msg);
                            return !flag;
                        })
                        .attr('opacity', 0.0); //待修改: 0.0
                }

                //glyphs and links
                var glyph_link_g = d3.select('#mapViewRealMap').select('svg').select('g.linked_glyphs');
                if (glyph_link_g[0][0] != null) {

                    //links
                    glyph_link_g.selectAll('g.interLink')
                        .filter(function (d, i) {
                            var flag = d.weight <= msg[3].cur_max && d.weight >= msg[3].cur_min;
                            return flag;
                        })
                        .attr('opacity', 1.0);
                    glyph_link_g.selectAll('g.interLink')
                        .filter(function (d, i) {
                            var flag = d.weight <= msg[3].cur_max && d.weight >= msg[3].cur_min;
                            return !flag;
                        })
                        .attr('opacity', 0.0);

                    //glyphs and the corresponding links
                    glyph_link_g.selectAll('g.glyph_group')
                        .filter(function (d, i) {
                            if (d.price_range == null || d.review_count == null || d.stars == null) {
                                return false;
                            }
                            var flag = checkSingleGlyphFlag(d, msg);
                            return flag;
                        })
                        .attr('opacity', 1.0);
                    glyph_link_g.selectAll('g.glyph_group')
                        .filter(function (d, i) {
                            if (d.price_range == null || d.rating == null || d.stars == null) {
                                return true;
                            }
                            var flag = checkSingleGlyphFlag(d, msg);
                            return !flag;
                        })
                        .attr('opacity', 0.0)
                        .each(function (d, i) {
                            var business_id = d['business_id'];
                            var start_class = 'start_' + business_id, end_class = 'end_' + business_id;
                            glyph_link_g.selectAll('line.' + start_class).each(function () {
                                d3.select(this.parentNode).attr('opacity', 0.0);
                            });
                            glyph_link_g.selectAll('line.' + end_class).each(function () {
                                d3.select(this.parentNode).attr('opacity', 0.0);
                            });
                        });

                }

                console.log(' Finished filtering venue circles and linked glyphs!!######### ', msg);
            });

            //confirm the filtering
            pipService.onConfirmFilteringResult(function (msg) {
                function checkSingleGlyphFlag(d, msg) {
                    var flag = d.price_range >= msg[0].cur_min && d.price_range <= msg[0].cur_max &&
                        d.review_count >= msg[1].cur_min && d.review_count <= msg[1].cur_max &&
                        d.stars >= msg[2].cur_min && d.stars <= msg[2].cur_max;
                    return flag;
                }

                //glyphs and links
                var glyph_link_g = d3.select('#mapViewRealMap').select('svg').select('g.linked_glyphs');
                if (glyph_link_g[0][0] != null) {
                    //links
                    glyph_link_g.selectAll('g.interLink')
                        .filter(function (d, i) {
                            var flag = d.weight <= msg[3].cur_max && d.weight >= msg[3].cur_min;
                            return !flag;
                        }).remove();

                    //glyphs and the corresponding links
                    glyph_link_g.selectAll('g.glyph_group')
                        .filter(function (d, i) {
                            if (d.price_range == null || d.rating == null || d.stars == null) {
                                return true;
                            }
                            var flag = checkSingleGlyphFlag(d, msg);
                            return !flag;
                        })
                        .each(function (d, i) {
                            var business_id = d['business_id'];
                            var start_class = 'start_' + business_id, end_class = 'end_' + business_id;
                            glyph_link_g.selectAll('line.' + start_class).each(function () {
                                d3.select(this.parentNode).remove();
                            });

                            glyph_link_g.selectAll('line.' + end_class).each(function () {
                                d3.select(this.parentNode).remove();
                            });

                            d3.select(this).remove();
                        });
                }
            });


            //highlight the link of two selected venues
            pipService.onVenueSelectionIsReady(function (_selected_two_venues) {
                var normal_link_color = _this.link_color_config['link_color'],
                    normal_link_opacity = _this.link_color_config['link_opacity'];

                // var highlight_link_color = 'blue', highlight_link_opacity = 0.9;
                var highlight_link_color = _this.link_color_config['link_color'],
                    highlight_link_opacity = _this.link_color_config['link_opacity'];

                var bs1 = _selected_two_venues[0]['business_id'], bs2 = _selected_two_venues[1]['business_id'];
                var link_class_str1 = '.start_' + bs1 + '.end_' + bs2, link_class_str2 = '.start_' + bs2 + '.end_' + bs1;

                //make all normal
                d3.select('#mapViewRealMap').select('svg')
                    .select('g.linked_glyphs')
                    .selectAll('g.interLink')
                    .selectAll('line')
                    .style('opacity', normal_link_opacity)
                    .style('stroke', normal_link_color);

                //make the selected highlight
                d3.select('#mapViewRealMap').select('svg')
                    .select('g.linked_glyphs')
                    .selectAll('g.interLink')
                    .selectAll('line' + link_class_str1)
                    .style('opacity', highlight_link_opacity)
                    .style('stroke', highlight_link_color);
                d3.select('#mapViewRealMap').select('svg')
                    .select('g.linked_glyphs')
                    .selectAll('g.interLink')
                    .selectAll('line' + link_class_str2)
                    .style('opacity', highlight_link_opacity)
                    .style('stroke', highlight_link_color);

            });

            //remove the highlighting of the link
            pipService.onRemoveCommonCustomerCompView(function (_selected_two_venues) {
                var normal_link_color = _this.link_color_config['link_color'],
                    normal_link_opacity = _this.link_color_config['link_opacity'];
                // var highlight_link_color = 'black', highlight_link_opacity = 1.0;

                // var bs1 = _selected_two_venues[0]['business_id'], bs2 = _selected_two_venues[1]['business_id'];
                // var link_class_str1 = '.start_' + bs1 + '.end_' + bs2, link_class_str2 = '.start_' + bs2 + '.end_' + bs1;

                //make all normal
                d3.select('#mapViewRealMap').select('svg')
                    .select('g.linked_glyphs')
                    .selectAll('g.interLink')
                    .selectAll('line')
                    .style('opacity', normal_link_opacity)
                    .style('stroke', normal_link_color);
            });

            //init the whole map as tempe
            var msg = {'city': _this.current_city, 'type': _this.current_type, 'focus': _this.focus_location};
            pipService.emitCityOrTypeIsChanged(msg);
        },

        watch: {
            area_coordinate: {
                handler: function (new_value, old_value) {
                    var svg = d3.select('#mapViewRealMap').select('svg');
                    if (new_value.start.lat != '#' && new_value.start.lng != '#' && new_value.end.lat != '#' && new_value.end.lng != '#') {
                        var brush_rect = svg.select('#brush_rect_id');
                        var x = this.my_map.latLngToLayerPoint(new_value.start).x;
                        var y = this.my_map.latLngToLayerPoint(new_value.start).y;
                        var width = this.my_map.latLngToLayerPoint(new_value.end).x - this.my_map.latLngToLayerPoint(new_value.start).x;
                        var height = this.my_map.latLngToLayerPoint(new_value.end).y - this.my_map.latLngToLayerPoint(new_value.start).y;

                        if (brush_rect[0][0] == null) {
                            svg.append('rect')
                                .attr('id', 'brush_rect_id')
                                .attr('x', x)
                                .attr('y', y)
                                .attr('width', width)
                                .attr('height', height)
                                .style('fill', 'none')
                                .style('stroke', 'red')
                                // .style('stroke', '#737373')
                                .style('stroke-width', '2px');
                        }
                        else {
                            svg.select('rect#brush_rect_id')
                                .attr('width', width)
                                .attr('height', height);
                        }
                    }

                }
                ,
                deep: true
            }
        }
    })
    ;
