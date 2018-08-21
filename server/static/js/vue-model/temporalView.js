/**
 * Created by wangyong on 12/3/2017.
 */

var temporalView = new Vue({
    el: '#temporalView',
    delimiters: ['{{', '}}'],
    data: {
        svg_width: 770,
        svg_height: 600,
        two_venue_review_rating: undefined,
        bs1_id: undefined,
        bs2_id: undefined,
        bs1_name: undefined,
        bs2_name: undefined,
        data_processing_mode: ['by_year', 'by_quarter_year'],
        cur_processing_mode: 'by_quarter_year',
        first_venue_color_mapping: ['#d73027', '#fdae61', '#EFFF9A', '#abd9e9', '#4575b4'],
        second_venue_color_mapping: ['#d73027', '#fdae61', '#EFFF9A', '#abd9e9', '#4575b4'],
        h_scale: undefined, //scale function for horizontal bars on the right in temporal view

        layered_layout_flag: false, //default is stacked layout, instead of layered layout

        rect_size: 12,
        rect_size_scale: undefined, //scale function for the size of rectangles on temporal view

        click_on_circle_rect_flag: false, //a flag for clicking on circle or rectangle
        highlight_color: '#969696',// 'black', the clicked highlighting color
        brushing_highlight_color: 'black',

        axis_label_color: '#525252', //'#737373',


    },
    methods: {
        init: function () {
            // var width = 770, height = 600;
            var svg = d3.select(this.$el)
                .append('svg')
                .attr('width', this.svg_width)
                .attr('height', this.svg_height);
        },
        date2Year: function (date_str) {
            var date = date_str.split('-');
            var year = parseInt(date[0]);
            return year;
        },
        date2Quarter: function (date_str) {
            var date = date_str.split('-');
            var year = parseInt(date[0]);
            var quarter = parseInt((parseInt(date[1]) - 1) / 3) + 1; //[1, 2, 3, 4]
            return [year, quarter];
        },
        date2QuarterIndex: function (cur_date_str, min_date_str) {
            var cur_quarter = this.date2Quarter(cur_date_str),
                min_quarter = this.date2Quarter(min_date_str);

            var idx = 0;
            if (cur_quarter[0] > min_quarter[0]) { //not the same year
                idx = 4 * (cur_quarter[0] - min_quarter[0] - 1) + cur_quarter[1] + (4 - min_quarter[1]);
                return idx;
            }
            else { //the same year
                idx = cur_quarter[1] - min_quarter[1];
            }

            return idx;
        },
        quarterIndex2Quarter: function (idx, min_date_str) { //assume idx starts from 0
            var min_quarter = this.date2Quarter(min_date_str);
            var cur_year = min_quarter[0] + parseInt((min_quarter[1] + idx - 1) / 4), //
                cur_quarter = (min_quarter[1] + idx - 1) % 4 + 1; //[1, 2, 3, 4]
            return [cur_year, cur_quarter];
        },
        getReviewArrayByYear: function (reviews, min_year, max_year) {
            var years = max_year - min_year + 1;
            var review_arr = new Array(years);
            for (var i = 0; i < years; i++) {
                review_arr[i] = [];
            }

            for (var i = 0; i < reviews.length; i++) {
                var cur_review = reviews[i];
                var cur_year = this.date2Year(cur_review['date']);
                var idx = cur_year - min_year;
                review_arr[idx].push(cur_review);
            }

            //sort by rating
            for (var i = 0; i < years; i++) {
                review_arr[i].sort(function (a, b) {
                    if (a.stars < b.stars) {
                        return -1;
                    }
                    else if (a.stars > b.stars) {
                        return 1;
                    }
                    else {
                        return 0;
                    }
                });
            }

            return review_arr;
        },
        getReviewArrayByQuarterYear: function (reviews, min_date_str, review_quarter_num) {
            var review_arr = new Array(review_quarter_num);
            for (var i = 0; i < review_quarter_num; i++) {
                review_arr[i] = [];
            }

            for (var i = 0; i < reviews.length; i++) {
                var cur_review = reviews[i];
                var idx = this.date2QuarterIndex(cur_review['date'], min_date_str);
                review_arr[idx].push(cur_review);
            }

            //sort by rating
            for (var i = 0; i < review_quarter_num; i++) {
                review_arr[i].sort(function (a, b) {
                    if (a.stars < b.stars) {
                        return -1;
                    }
                    else if (a.stars > b.stars) {
                        return 1;
                    }
                    else {
                        return 0;
                    }
                });
            }

            return review_arr;
        },
        processDataByQuarterYear: function (two_venue_review_rating) {
            var max_date = two_venue_review_rating['max_date'], min_date = two_venue_review_rating['min_date'];
            var bs1_reviews = two_venue_review_rating['data'][this.bs1_id],
                bs2_reviews = two_venue_review_rating['data'][this.bs2_id];

            var review_quarter_num = this.date2QuarterIndex(max_date, min_date) + 1;
            var bs1_reviews_by_quarter_year = this.getReviewArrayByQuarterYear(bs1_reviews, min_date, review_quarter_num);
            var bs2_reviews_by_quarter_year = this.getReviewArrayByQuarterYear(bs2_reviews, min_date, review_quarter_num);

            console.log('processDataByQuarterYear: ', bs1_reviews_by_quarter_year, bs2_reviews_by_quarter_year);
            return [bs1_reviews_by_quarter_year, bs2_reviews_by_quarter_year];
        },
        processDataByYear: function (two_venue_review_rating) {
            var max_date = two_venue_review_rating['max_date'], min_date = two_venue_review_rating['min_date'];
            var bs1_reviews = two_venue_review_rating['data'][this.bs1_id],
                bs2_reviews = two_venue_review_rating['data'][this.bs2_id];

            var max_year = this.date2Year(max_date), min_year = this.date2Year(min_date);
            var bs1_reviews_by_year = this.getReviewArrayByYear(bs1_reviews, min_year, max_year);
            var bs2_reviews_by_year = this.getReviewArrayByYear(bs2_reviews, min_year, max_year);

            console.log('processDataByYear: ', bs1_reviews_by_year, bs2_reviews_by_year);
            return [bs1_reviews_by_year, bs2_reviews_by_year];
        },

        getMaxRatingNumOfEachQuarterYear: function (_bs_review_rating_of_quarter_year) {
            var max_rating_num = [0, 0, 0, 0, 0];
            for (var i = 0; i < _bs_review_rating_of_quarter_year.length; i++) {
                var rating_num_of_each_quarter = [0, 0, 0, 0, 0];
                var quarter_year = _bs_review_rating_of_quarter_year[i];
                for (var j = 0; j < quarter_year.length; j++) {
                    var rating = quarter_year[j]['stars'];
                    rating_num_of_each_quarter[rating - 1]++;
                }

                //get the max
                for (var j = 0; j < 5; j++) {
                    max_rating_num[j] = Math.max(max_rating_num[j], rating_num_of_each_quarter[j]);
                }
            }

            return max_rating_num;
        },
        getMaxRatingNumOfEachQuarterYearAccumulated: function (bs_max_num_of_each_rating) {
            var bs_max_num_of_each_rating_accumulated = [];
            for (var i = 0; i < bs_max_num_of_each_rating.length; i++) {
                var tmp = bs_max_num_of_each_rating.slice(0, i);
                var sum = tmp.reduce(function (a, b) {
                    return (a + b);
                }, 0);

                bs_max_num_of_each_rating_accumulated.push(sum);
            }

            return bs_max_num_of_each_rating_accumulated;
        },

        getSelectedReviewIds: function (review_rating_arr1, review_rating_arr2) {
            var review_id_obj = {'business_ids': [], 'bs1_review_ids': [], 'bs2_review_ids': []};
            var bs1_id = '', bs2_id = '', bs1_rev_ids = [], bs2_rev_ids = [];

            for (var i = 0; i < review_rating_arr1.length; i++) {
                var g_rating = review_rating_arr1[i];
                for (var j = 0; j < g_rating.length; j++) {
                    var rev = g_rating[j];
                    bs1_id = rev['business_id'];
                    bs1_rev_ids.push(rev['review_id']);
                }
            }

            for (var i = 0; i < review_rating_arr2.length; i++) {
                var g_rating = review_rating_arr2[i];
                for (var j = 0; j < g_rating.length; j++) {
                    var rev = g_rating[j];
                    bs2_id = rev['business_id'];
                    bs2_rev_ids.push(rev['review_id']);
                }
            }

            review_id_obj['business_ids'] = [bs1_id, bs2_id];
            review_id_obj['bs1_review_ids'] = bs1_rev_ids;
            review_id_obj['bs2_review_ids'] = bs2_rev_ids;

            console.log('User brushed a new region, here is the review ids: ', review_id_obj);

            return review_id_obj;
        },

        processEventOfClickingOnRectsOrCircles: function (clicking_pos) {
            var _this = this;
            var x = clicking_pos[0], y = clicking_pos[1];

            //bs1: rect
            d3.select(this.$el).selectAll('g.bs1_temporal_rects')
                .selectAll('rect')
                .filter(function (item, i) {
                    var flag = x >= item['pos_x'] && y >= (item['pos_y'])
                        && x <= (item['pos_x'] + item['rect_w_h'])
                        && y <= (item['pos_y'] + item['rect_w_h']);

                    //clear all the other possible selections
                    if (!flag) {
                        d3.select(this).attr('fill', item['original_fill']);
                        item['selection_flag'] = false;
                    }

                    return flag;
                })
                .each(function (item, i) {
                    _this.click_on_circle_rect_flag = true;

                    item['selection_flag'] = !item['selection_flag'];
                    if (item['selection_flag']) { //selected
                        // d3.select(this).attr('fill', _this.highlight_color);
                        d3.select(this).attr('fill', _this.brushing_highlight_color);

                        //load detailed review data
                        var review_id = item['review_id'];
                        dataService.getDetailedContentOfOneReview(review_id);
                    }
                    else { //de-selection
                        d3.select(this).attr('fill', item['original_fill']);
                    }
                    console.log('===========item=========== ', item);
                });
            //bs1: circle
            d3.select(this.$el).selectAll('g.bs1_temporal_rects')
                .selectAll('circle')
                .filter(function (item, i) {
                    var flag = x >= item['pos_x'] && y >= (item['pos_y'])
                        && x <= (item['pos_x'] + item['rect_w_h'])
                        && y <= (item['pos_y'] + item['rect_w_h']);

                    //clear all the other possible selections
                    if (!flag) {
                        d3.select(this).attr('fill', item['original_fill']);
                        item['selection_flag'] = false;
                    }

                    return flag;
                })
                .each(function (item, i) {
                    _this.click_on_circle_rect_flag = true;

                    item['selection_flag'] = !item['selection_flag'];
                    if (item['selection_flag']) { //selected
                        // d3.select(this).attr('fill', _this.highlight_color);
                        d3.select(this).attr('fill', _this.brushing_highlight_color);

                        //select the other review by the same customer
                        var bs_other_view_g = d3.select('g.bs2_temporal_rects'),
                            svg_all_handler = d3.select(_this.$el).select('svg');
                        _this.highlightOrDehighlightCommonCustomerReviews(item, bs_other_view_g, svg_all_handler);

                        //load detailed review data
                        var review_id = item['review_id'];
                        dataService.getDetailedContentOfOneReview(review_id);
                    }
                    else { //de-selection
                        d3.select(this).attr('fill', item['original_fill']);

                        //select the other review by the same customer
                        var bs_other_view_g = d3.select('g.bs2_temporal_rects'),
                            svg_all_handler = d3.select(_this.$el).select('svg');
                        _this.highlightOrDehighlightCommonCustomerReviews(item, bs_other_view_g, svg_all_handler);
                    }
                    console.log('===========item=========== ', item);
                });


            //bs2: rect
            d3.select(this.$el).selectAll('g.bs2_temporal_rects')
                .selectAll('rect')
                .filter(function (item, i) {
                    var flag = x >= item['pos_x'] && y >= (item['pos_y'])
                        && x <= (item['pos_x'] + item['rect_w_h'])
                        && y <= (item['pos_y'] + item['rect_w_h']);

                    //clear all the other possible selections
                    if (!flag) {
                        d3.select(this).attr('fill', item['original_fill']);
                        item['selection_flag'] = false;
                    }

                    return flag;
                })
                .each(function (item, i) {
                    _this.click_on_circle_rect_flag = true;

                    item['selection_flag'] = !item['selection_flag'];
                    if (item['selection_flag']) { //selected
                        d3.select(this).attr('fill', _this.brushing_highlight_color);

                        //load detailed review data
                        var review_id = item['review_id'];
                        dataService.getDetailedContentOfOneReview(review_id);
                    }
                    else { //de-selection
                        d3.select(this).attr('fill', item['original_fill']);
                    }
                    console.log('===========item=========== ', item);
                });
            //bs2: circle
            d3.select(this.$el).selectAll('g.bs2_temporal_rects')
                .selectAll('circle')
                .filter(function (item, i) {
                    var flag = x >= item['pos_x'] && y >= (item['pos_y'])
                        && x <= (item['pos_x'] + item['rect_w_h'])
                        && y <= (item['pos_y'] + item['rect_w_h']);

                    //clear all the other possible selections
                    if (!flag) {
                        d3.select(this).attr('fill', item['original_fill']);
                        item['selection_flag'] = false;
                    }

                    return flag;
                })
                .each(function (item, i) {
                    _this.click_on_circle_rect_flag = true;

                    item['selection_flag'] = !item['selection_flag'];
                    if (item['selection_flag']) { //selected
                        d3.select(this).attr('fill', _this.brushing_highlight_color);

                        //select the other review by the same customer
                        var bs_other_view_g = d3.select('g.bs1_temporal_rects'),
                            svg_all_handler = d3.select(_this.$el).select('svg');
                        _this.highlightOrDehighlightCommonCustomerReviews(item, bs_other_view_g, svg_all_handler);

                        //load detailed review data
                        var review_id = item['review_id'];
                        dataService.getDetailedContentOfOneReview(review_id);
                    }
                    else { //de-selection
                        d3.select(this).attr('fill', item['original_fill']);

                        //select the other review by the same customer
                        var bs_other_view_g = d3.select('g.bs1_temporal_rects'),
                            svg_all_handler = d3.select(_this.$el).select('svg');
                        _this.highlightOrDehighlightCommonCustomerReviews(item, bs_other_view_g, svg_all_handler);
                    }
                    console.log('===========item=========== ', item);
                });

        },

        highlightOrDehighlightCommonCustomerReviews: function (cur_item, other_g_handler, svg_handler) {
            var _this = this;

            if (cur_item['selection_flag'] == true) { //highlighting
                other_g_handler.selectAll('circle')
                    .filter(function (item, i) {
                        var flag = cur_item['user_id'] == item['user_id'];
                        return flag;
                    })
                    .each(function (item, i) {
                        // d3.select(this).attr('fill', _this.highlight_color);

                        //draw line
                        var line_attributes = {
                            'x1': cur_item['pos_x'] + cur_item['rect_w_h'] / 2,
                            'y1': cur_item['pos_y'] + cur_item['rect_w_h'] / 2,
                            'x2': item['pos_x'] + item['rect_w_h'] / 2,
                            'y2': item['pos_y'] + item['rect_w_h'] / 2,
                        };

                        //add a highlighting line
                        svg_handler.append('g')
                            .attr('class', 'common_customer_highlighting_link')
                            .append('line')
                            .attr(line_attributes)
                            .style('stroke', '#969696')
                            .style('opacity', 0.8)
                            .style('stroke-width', 2);

                    });

            }
            else { //not true: remove highlighting
                other_g_handler.selectAll('circle')
                    .filter(function (item, i) {
                        var flag = cur_item['user_id'] == item['user_id'];
                        return flag;
                    })
                    .each(function (item, i) {
                        // d3.select(this).attr('fill', item['original_fill']);

                        //remove highlighting line
                        svg_handler.selectAll('g.common_customer_highlighting_link').remove();
                    });
            }

        },

        drawAxisAndLabelsForTemporalView: function (bs_temporal_view, layout_config, bs_mode_str) { //bs_mode_str: 'bs1' or 'bs2'
            var _this = this;

            var tick_arr = new Array(layout_config.max_w);
            var bs_axis_g = bs_temporal_view.append('g')
                .attr('class', bs_mode_str + '_x_axis')
                .attr('transform', function () {
                    return 'translate(0' + ',' + (-layout_config.each_axis_label_height * 0.75) + ')';
                });
            bs_axis_g.append('line')
                .attr('x1', layout_config.rect_size)
                .attr('y1', 0)
                .attr('x2', (layout_config.padding_w + layout_config.rect_size) * layout_config.max_w)
                .attr('y2', 0)
                .attr('stroke', _this.axis_label_color)
                .attr('stroke-width', 1);
            bs_axis_g.append('g')
                .attr('class', bs_mode_str + '_ticks')
                .selectAll('line')
                .data(tick_arr)
                .enter()
                .append('line')
                .attr('x1', function (d, i) {
                    return layout_config.rect_size + i * (layout_config.padding_w + layout_config.rect_size);
                })
                .attr('y1', -9)
                .attr('x2', function (d, i) {
                    return layout_config.rect_size + i * (layout_config.padding_w + layout_config.rect_size);
                })
                .attr('y2', 0)
                .attr('stroke', _this.axis_label_color)
                .attr('stroke-width', 1);
            bs_axis_g.append('g')
                .attr('class', bs_mode_str + '_axis_label')
                .selectAll('g')
                .data(tick_arr)
                .enter()
                .append('g')
                .attr('transform', function (d, i) {
                    return 'translate(' + (layout_config.rect_size + i * (layout_config.padding_w + layout_config.rect_size) ) + ',0)';
                    // return rect_size + i * (padding_w + rect_size);
                })
                .append('text')
                .style('text-anchor', 'start')
                .attr("x", 4)
                .attr("y", 4)
                .attr("transform", function (d) {
                    return "rotate(65)";
                })
                .text(function (d, i) {
                    var year_quarter = _this.quarterIndex2Quarter(i, _this.two_venue_review_rating['min_date']);
                    var year_quarter_str = '' + year_quarter[0] + '.' + year_quarter[1];
                    return year_quarter_str;
                })
                .attr('font-family', 'sans-serif')
                .attr('font-size', '8px')
                .attr('stroke', _this.axis_label_color);
        },
        drawLayerDividingLinesForTemporalView: function (bs_temporal_view, layout_config, bs_mode_str,
                                                         bs_max_num_of_each_rating_accumulated) { //bs_mode_str: 'bs1' or 'bs2'
            var _this = this;
            var layer_dividing_line_g = bs_temporal_view.append('g')
                .attr('class', bs_mode_str + '_layer_dividing_lines')
                .attr('transform', function () {
                    return 'translate(0,' + (-layout_config.each_axis_label_height) + ')';
                });
            layer_dividing_line_g.selectAll('line')
                .data(bs_max_num_of_each_rating_accumulated)
                .enter()
                .append('line')
                .attr('x1', layout_config.rect_size / 2)
                .attr('y1', function (d, i) {
                    return -(d * (layout_config.padding_h + layout_config.rect_size)
                    + layout_config.layer_h_padding * i - layout_config.layer_h_padding / 2);
                })
                .attr('x2', function (d, i) {
                    if (i > 0) {
                        return (layout_config.padding_w + layout_config.rect_size) * layout_config.max_w + layout_config.rect_size / 2;
                    }
                    else {
                        return layout_config.rect_size / 2;
                    }
                })
                .attr('y2', function (d, i) {
                    return -(d * (layout_config.padding_h + layout_config.rect_size)
                    + layout_config.layer_h_padding * i - layout_config.layer_h_padding / 2);
                })
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('opacity', 0.5)
                .style("stroke-dasharray", ("2, 2"));
        },
        drawStackedRectsForTemporalView: function (bs_review_ratings, bs_temporal_view, layout_config, bs_mode_str) {
            var _this = this;

            //parse the bs_temporal_view positions
            var bs_delta_x = d3.transform(d3.select(bs_temporal_view[0][0]).attr('transform')).translate[0],
                bs_delta_y = d3.transform(d3.select(bs_temporal_view[0][0]).attr('transform')).translate[1];
            bs_delta_x = parseInt(bs_delta_x);
            bs_delta_y = parseInt(bs_delta_y);

            bs_temporal_view.append('g')
                .attr('class', bs_mode_str + '_temporal_rects')
                .selectAll('g')
                .data(bs_review_ratings)
                .enter()
                .append('g')
                .attr('class', function (d, i) {
                    if (d.length == 0) {
                        return 'no_review';
                    }
                    var year_quarter = _this.date2Quarter(d[0]['date']);
                    var str = '' + year_quarter[0] + year_quarter[1];
                    return str;
                })
                .attr('transform', function (d, i) {
                    return 'translate(' + (i * (layout_config.padding_w + layout_config.rect_size) + layout_config.rect_size / 2)
                        + ',' + (-layout_config.each_axis_label_height) + ')';
                })
                .each(function (d, i) {
                    // console.log('draw rectangles: ', d, i);
                    if (d.length == 0) {
                        return;
                    }

                    //get the quarter year position
                    var bs_quarter_delta_x = bs_delta_x + (i * (layout_config.padding_w + layout_config.rect_size) + layout_config.rect_size / 2);
                    var bs_quarter_delta_y = bs_delta_y + (-layout_config.each_axis_label_height);

                    //draw rectangles or circles
                    d3.select(this).selectAll('g.rects_or_circles')
                        .data(d)
                        .enter()
                        .append('g')
                        .attr('class', 'rects_or_circles')
                        .each(function (item, j) {
                            item['rect_w_h'] = _this.rect_size_scale(item['scaled_score']);
                            item['selection_flag'] = false;
                            item['pos_x'] = bs_quarter_delta_x + (layout_config.rect_size - item['rect_w_h']) / 2;
                            item['pos_y'] = bs_quarter_delta_y - ( (layout_config.rect_size / 2 + item['rect_w_h'] / 2) + j * (layout_config.padding_h + layout_config.rect_size));
                            var rating = item['stars'];
                            item['original_fill'] = _this.first_venue_color_mapping[rating - 1];

                            //append rectangles or circles
                            if (item['common'] == 'false') {
                                d3.select(this).append('rect')
                                    .attr('width', function () {
                                        return item['rect_w_h'];
                                    })
                                    .attr('height', function () {
                                        return item['rect_w_h'];
                                    })
                                    .attr('x', function () {
                                        return (layout_config.rect_size - item['rect_w_h']) / 2;
                                    })
                                    .attr('y', function () {
                                        return -( (layout_config.rect_size / 2 + item['rect_w_h'] / 2) + j * (layout_config.padding_h + layout_config.rect_size));
                                    })
                                    .attr('fill', function () {
                                        return item['original_fill'];
                                    })
                                    .on('mouseover', function () {
                                        d3.select(this).style('cursor', 'pointer');
                                    })
                                    .on('mouseout', function () {
                                        d3.select(this).style('cursor', 'pointer');
                                    })
                                    .on('click', function () { //not working
                                        console.log('The selected text of stacked reviews: ', d);
                                    });

                            }
                            else { //append circles
                                //draw circles
                                d3.select(this)
                                    .append('circle')
                                    .attr('cx', function () {
                                        return layout_config.rect_size / 2;
                                    })
                                    .attr('cy', function () {
                                        return -( layout_config.rect_size / 2 + j * (layout_config.padding_h + layout_config.rect_size) );
                                        // return (item['pos_y'] + item['rect_w_h']/2);
                                    })
                                    .attr('r', function () {
                                        return item['rect_w_h'] / 2;
                                    })
                                    .attr('fill', function () {
                                        return item['original_fill'];
                                    })
                                    .on('mouseover', function () {
                                        d3.select(this).style('cursor', 'pointer');
                                    })
                                    .on('mouseout', function () {
                                        d3.select(this).style('cursor', 'pointer');
                                    })
                                    .on('click', function () { //not working
                                        console.log('The selected text of stacked reviews: ', item);
                                    });
                            }
                        });


                });

        },
        getBs2HorizontalBarChartData: function (_bs2_select_rect, _bs2_review_ratings, layout_config) {
            var selected_five_rating_arr = new Array(5);
            for (var i = 0; i < 5; i++) {
                selected_five_rating_arr[i] = [];
            }

            var start = _bs2_select_rect[0], end = _bs2_select_rect[1];
            if (start[0] == end[0] && start[1] == end[1]) {     //select All
                for (var i = 0; i < _bs2_review_ratings.length; i++) {
                    var row = _bs2_review_ratings[i];
                    for (var j = 0; j < row.length; j++) {
                        var rating = row[j]['stars'];
                        selected_five_rating_arr[rating - 1].push(row[j]);
                    }
                }
            }
            else if (start[0] <= end[0] && start[1] <= end[1]) { //select only a specific region
                for (var i = 0; i < _bs2_review_ratings.length; i++) {
                    var row = _bs2_review_ratings[i];
                    for (var j = 0; j < row.length; j++) {
                        var x = (i * (layout_config.padding_w + layout_config.rect_size) + layout_config.rect_size / 2);
                        var y = layout_config.h_tentative - layout_config.each_axis_label_height
                            - (layout_config.rect_size + j * (layout_config.padding_h + layout_config.rect_size));

                        var flag = x >= start[0] && y >= start[1] && x <= end[0] && y <= end[1];
                        if (flag) {
                            var rating = row[j]['stars'];
                            selected_five_rating_arr[rating - 1].push(row[j]);
                        }
                    }
                }
            }
            else {
                alert('Selection Area is NOT correct!');
            }

            return selected_five_rating_arr;
        },
        getBs1HorizontalBarChartData: function (_bs1_select_rect, _bs1_review_ratings, layout_config) {
            var selected_five_rating_arr = new Array(5);
            for (var i = 0; i < 5; i++) {
                selected_five_rating_arr[i] = [];
            }

            var start = _bs1_select_rect[0], end = _bs1_select_rect[1];
            if (start[0] == end[0] && start[1] == end[1]) {     //select All
                for (var i = 0; i < _bs1_review_ratings.length; i++) {
                    var row = _bs1_review_ratings[i];
                    for (var j = 0; j < row.length; j++) {
                        var rating = row[j]['stars'];
                        selected_five_rating_arr[rating - 1].push(row[j]);
                    }
                }
            }
            else if (start[0] <= end[0] && start[1] <= end[1]) { //select only a specific region
                for (var i = 0; i < _bs1_review_ratings.length; i++) {
                    var row = _bs1_review_ratings[i];
                    for (var j = 0; j < row.length; j++) {
                        var x = (i * (layout_config.padding_w + layout_config.rect_size) + layout_config.rect_size / 2);
                        var y = (layout_config.extra_padding_h + layout_config.bs1_max_h * (layout_config.rect_size + layout_config.padding_h)
                            + layout_config.each_axis_label_height) + (-layout_config.each_axis_label_height)
                            - (layout_config.rect_size + j * (layout_config.padding_h + layout_config.rect_size));
                        var flag = x >= start[0] && y >= start[1] && x <= end[0] && y <= end[1];
                        if (flag) {
                            var rating = row[j]['stars'];
                            selected_five_rating_arr[rating - 1].push(row[j]);
                        }
                    }
                }
            }
            else {
                alert('Selection Area is NOT correct!');
            }

            return selected_five_rating_arr;
        },
        getBs1HorizontalBarChartDataInLayeredLayout: function (_bs1_select_rect, _bs1_review_ratings, layout_config,
                                                               bs_max_num_of_each_rating_accumulated) {
            var selected_five_rating_arr = new Array(5);
            for (var i = 0; i < 5; i++) {
                selected_five_rating_arr[i] = [];
            }

            var start = _bs1_select_rect[0], end = _bs1_select_rect[1];
            if (start[0] == end[0] && start[1] == end[1]) {     //select All
                for (var i = 0; i < _bs1_review_ratings.length; i++) {
                    var row = _bs1_review_ratings[i];
                    for (var j = 0; j < row.length; j++) {
                        var rating = row[j]['stars'];
                        selected_five_rating_arr[rating - 1].push(row[j]);
                    }
                }
            }
            else if (start[0] <= end[0] && start[1] <= end[1]) { //select only a specific region
                for (var i = 0; i < _bs1_review_ratings.length; i++) {
                    var row = _bs1_review_ratings[i];

                    //get review num of each rating in this time slot
                    var rating_num_of_one_slot = [0, 0, 0, 0, 0];
                    for (var k = 0; k < row.length; k++) {
                        var rating = row[k]['stars'];
                        rating_num_of_one_slot[rating - 1]++;
                    }
                    var accumulated_rating_num_of_one_slot = [], tmp = 0;
                    accumulated_rating_num_of_one_slot.push(0);
                    for (k = 0; k < rating_num_of_one_slot.length - 1; k++) {
                        tmp += rating_num_of_one_slot[k];
                        accumulated_rating_num_of_one_slot.push(tmp);
                    }

                    //calculate the locations
                    for (var j = 0; j < row.length; j++) {
                        //get x
                        var x = (i * (layout_config.padding_w + layout_config.rect_size) + layout_config.rect_size / 2);
                        //get y
                        var rating = row[j]['stars'];
                        var layer_start_y = bs_max_num_of_each_rating_accumulated[rating - 1],
                            layer_h_padding = (rating - 1) * layout_config.layer_h_padding;

                        var y = layout_config.extra_padding_h
                            + layout_config.bs1_max_h * (layout_config.rect_size + layout_config.padding_h)
                            + layout_config.layer_h_padding * 4; //lowest y of the rectangles
                        y = y - ( layout_config.rect_size
                            + ((j - accumulated_rating_num_of_one_slot[rating - 1]) + layer_start_y) * (layout_config.padding_h + layout_config.rect_size)
                            + layer_h_padding); //get the postition of current y

                        var flag = x >= start[0] && y >= start[1] && x <= end[0] && y <= end[1];
                        if (flag) {
                            var rating = row[j]['stars'];
                            selected_five_rating_arr[rating - 1].push(row[j]);
                        }
                    }
                }
            }
            else {
                alert('Selection Area is NOT correct!');
            }

            return selected_five_rating_arr;
        },
        getBs2HorizontalBarChartDataInLayeredLayout: function (_bs2_select_rect, _bs2_review_ratings, layout_config,
                                                               bs_max_num_of_each_rating_accumulated) {
            var selected_five_rating_arr = new Array(5);
            for (var i = 0; i < 5; i++) {
                selected_five_rating_arr[i] = [];
            }

            var start = _bs2_select_rect[0], end = _bs2_select_rect[1];
            if (start[0] == end[0] && start[1] == end[1]) {     //select All
                for (var i = 0; i < _bs2_review_ratings.length; i++) {
                    var row = _bs2_review_ratings[i];
                    for (var j = 0; j < row.length; j++) {
                        var rating = row[j]['stars'];
                        selected_five_rating_arr[rating - 1].push(row[j]);
                    }
                }
            }
            else if (start[0] <= end[0] && start[1] <= end[1]) { //select only a specific region
                for (var i = 0; i < _bs2_review_ratings.length; i++) {
                    var row = _bs2_review_ratings[i];

                    //get review num of each rating in this time slot
                    var rating_num_of_one_slot = [0, 0, 0, 0, 0];
                    for (var k = 0; k < row.length; k++) {
                        var rating = row[k]['stars'];
                        rating_num_of_one_slot[rating - 1]++;
                    }
                    var accumulated_rating_num_of_one_slot = [], tmp = 0;
                    accumulated_rating_num_of_one_slot.push(0);
                    for (k = 0; k < rating_num_of_one_slot.length - 1; k++) {
                        tmp += rating_num_of_one_slot[k];
                        accumulated_rating_num_of_one_slot.push(tmp);
                    }

                    //calculate the locations
                    for (var j = 0; j < row.length; j++) {
                        //get x
                        var x = (i * (layout_config.padding_w + layout_config.rect_size) + layout_config.rect_size / 2);
                        //get y
                        var rating = row[j]['stars'];
                        var layer_start_y = bs_max_num_of_each_rating_accumulated[rating - 1],
                            layer_h_padding = (rating - 1) * layout_config.layer_h_padding;

                        var y = layout_config.h_tentative - layout_config.each_axis_label_height; //lowest y of the rectangles
                        y = y - ( layout_config.rect_size
                            + ((j - accumulated_rating_num_of_one_slot[rating - 1]) + layer_start_y) * (layout_config.padding_h + layout_config.rect_size)
                            + layer_h_padding); //get the postition of current y

                        var flag = x >= start[0] && y >= start[1] && x <= end[0] && y <= end[1];
                        if (flag) {
                            var rating = row[j]['stars'];
                            selected_five_rating_arr[rating - 1].push(row[j]);
                        }
                    }
                }
            }
            else {
                alert('Selection Area is NOT correct!');
            }

            return selected_five_rating_arr;
        },

        drawTwoHorizontalBarCharts: function (_bs1_temporal_view, _bs2_temporal_view,
                                              _bs1_selected_five_rating_arr, _bs2_selected_five_rating_arr, layout_config) {
            var _this = this;
            var h_bar_size = 20, h_bar_padding = 10;
            var bs1_horizontal_bar_g = _bs1_temporal_view.select('g.bs1_horizontal_bar_g'),
                bs2_horizontal_bar_g = _bs2_temporal_view.select('g.bs2_horizontal_bar_g');

            //get the max width of the two horizontal bars and calculate the scale
            var max_bs1_arr = _bs1_selected_five_rating_arr.map(function (item) {
                return item.length;
            });
            var max_bs2_arr = _bs2_selected_five_rating_arr.map(function (item) {
                return item.length;
            });
            var max_bs1_h = Math.max(...max_bs1_arr
            ),
            max_bs2_h = Math.max(...max_bs2_arr
            )
            ;
            var max_horizontal = Math.max(max_bs1_h, max_bs2_h);
            // var h_scale = undefined; //will store the scale when use this for the first time
            if (bs1_horizontal_bar_g[0][0] == null || bs2_horizontal_bar_g[0][0] == null) { //use it for the first time
                _this.h_scale = d3.scale.linear().domain([0, max_horizontal]).range([0, layout_config.horizontal_bar_chart_width]);
            }

            //create horizontal bars for bs1
            if (bs1_horizontal_bar_g[0][0] == null) {
                //not created before
                //determine the initial starting position of y
                var bs1_horizontal_h_start = 0, bs1_h_bar_padding = h_bar_padding;
                var bs1_max_horizontal_h = layout_config.bs1_max_h * (layout_config.rect_size + layout_config.padding_h) + layout_config.extra_padding_h,
                    tentative_bs1_horizontal_h = (h_bar_size + bs1_h_bar_padding) * 4 + h_bar_size;
                if (bs1_max_horizontal_h >= tentative_bs1_horizontal_h) {
                    bs1_horizontal_h_start = bs1_max_horizontal_h / 2 - tentative_bs1_horizontal_h / 2;
                }
                else {
                    bs1_h_bar_padding = (bs1_max_horizontal_h - 5 * h_bar_size) / 4;
                    bs1_h_bar_padding = Math.max(bs1_h_bar_padding, 1); //in case < 0;
                    bs1_horizontal_h_start = 0;
                }

                //create the group now
                bs1_horizontal_bar_g = _bs1_temporal_view.append('g')
                    .attr('class', 'bs1_horizontal_bar_g')
                    .attr('transform', function () {
                        // w_tentative = horizontal_bar_chart_width + extra_padding_w + max_w * (rect_size + padding_w);
                        return 'translate(' + (layout_config.w_tentative - layout_config.horizontal_bar_chart_width - layout_config.extra_padding_w / 4)
                            + ',' + (-layout_config.each_axis_label_height - bs1_horizontal_h_start) + ')';
                    });
                //x axis
                var bs1_xAxis = d3.svg.axis()
                    .orient('bottom')
                    .scale(_this.h_scale)
                    .ticks(3);
                bs1_horizontal_bar_g.append('g')
                    .attr('class', 'bs1_x_axis')
                    .call(bs1_xAxis);
                //y axis
                var bs1_y_axis_length = 4 * (bs1_h_bar_padding + h_bar_size);
                var bs1_y_label_scale = d3.scale.ordinal().domain(['1', '2', '3', '4', '5']).rangePoints([0, -bs1_y_axis_length]);
                var bs1_y_axis = d3.svg.axis()
                    .orient('left')
                    .scale(bs1_y_label_scale);
                bs1_horizontal_bar_g.append('g')
                    .attr('class', 'bs1_y_axis')
                    .attr('transform', function (item, i) {
                        return 'translate(-5,' + (-h_bar_size / 2) + ')';
                    })
                    .call(bs1_y_axis);

                //rects
                bs1_horizontal_bar_g.append('g')
                    .attr('class', 'bs1_h_rects')
                    .selectAll('g')
                    .data(max_bs1_arr)
                    .enter()
                    .append('g')
                    .attr('transform', function (item, i) {
                        return 'translate(0,' + (-h_bar_size - i * (h_bar_size + h_bar_padding) ) + ')';
                    })
                    .append('rect')
                    .attr('height', h_bar_size)
                    .attr('width', function (item, i) {
                        return _this.h_scale(item);
                    })
                    .attr('fill', function (item, i) {
                        return _this.first_venue_color_mapping[i];
                    });
            }
            else { //created before
                var bs1_h_bar_handler = _bs1_temporal_view.select('g.bs1_horizontal_bar_g')
                    .select('g.bs1_h_rects')
                    .selectAll('g')
                    .data(max_bs1_arr, function (item, i) {
                        return ('' + item + i); // make it unique
                    });

                bs1_h_bar_handler.exit().remove();
                bs1_h_bar_handler.enter()
                    .append('g')
                    .attr('transform', function (item, i) {
                        return 'translate(0,' + (-h_bar_size - i * (h_bar_size + h_bar_padding) ) + ')';
                    })
                    .append('rect')
                    .attr('height', h_bar_size)
                    .attr('width', function (item, i) {
                        return _this.h_scale(item);
                    })
                    .attr('fill', function (item, i) {
                        return _this.first_venue_color_mapping[i];
                    });
            }

            //create horizontal bars for bs2
            if (bs2_horizontal_bar_g[0][0] == null) {
                //not created before
                //determine the initial starting position of y
                var bs2_horizontal_h_start = 0, bs2_h_bar_padding = h_bar_padding;
                var bs2_max_horizontal_h = layout_config.bs2_max_h * (layout_config.rect_size + layout_config.padding_h) + layout_config.extra_padding_h,
                    tentative_bs2_horizontal_h = (h_bar_size + bs2_h_bar_padding) * 4 + h_bar_size;
                if (bs2_max_horizontal_h >= tentative_bs2_horizontal_h) {
                    bs2_horizontal_h_start = bs2_max_horizontal_h / 2 - tentative_bs2_horizontal_h / 2;
                }
                else {
                    bs2_h_bar_padding = (bs2_max_horizontal_h - 5 * h_bar_size) / 4;
                    bs2_h_bar_padding = Math.max(bs2_h_bar_padding, 1); //in case < 0;
                    bs2_horizontal_h_start = 0;
                }

                //create the group now
                bs2_horizontal_bar_g = _bs2_temporal_view.append('g')
                    .attr('class', 'bs2_horizontal_bar_g')
                    .attr('transform', function () {
                        // w_tentative = horizontal_bar_chart_width + extra_padding_w + max_w * (rect_size + padding_w);
                        return 'translate(' + (layout_config.w_tentative - layout_config.horizontal_bar_chart_width - layout_config.extra_padding_w / 4)
                            + ',' + (-layout_config.each_axis_label_height - bs2_horizontal_h_start) + ')';
                    });
                //x axis
                var bs2_xAxis = d3.svg.axis()
                    .orient('bottom')
                    .scale(_this.h_scale)
                    .ticks(3);
                bs2_horizontal_bar_g.append('g')
                    .attr('class', 'bs2_x_axis')
                    .call(bs2_xAxis);
                //y axis
                var bs2_y_axis_length = 4 * (bs2_h_bar_padding + h_bar_size);
                var bs2_y_label_scale = d3.scale.ordinal().domain(['1', '2', '3', '4', '5']).rangePoints([0, -bs2_y_axis_length]);
                var bs2_y_axis = d3.svg.axis()
                    .orient('left')
                    .scale(bs2_y_label_scale);
                bs2_horizontal_bar_g.append('g')
                    .attr('class', 'bs2_y_axis')
                    .attr('transform', function (item, i) {
                        return 'translate(-5,' + (-h_bar_size / 2) + ')';
                    })
                    .call(bs2_y_axis);

                //rects
                bs2_horizontal_bar_g.append('g')
                    .attr('class', 'bs2_h_rects')
                    .selectAll('g')
                    .data(max_bs2_arr)
                    .enter()
                    .append('g')
                    .attr('transform', function (item, i) {
                        return 'translate(0,' + (-h_bar_size - i * (h_bar_size + h_bar_padding) ) + ')';
                    })
                    .append('rect')
                    .attr('height', h_bar_size)
                    .attr('width', function (item, i) {
                        return _this.h_scale(item);
                    })
                    .attr('fill', function (item, i) {
                        return _this.second_venue_color_mapping[i];
                    });
            }
            else { //created before
                var bs2_h_bar_handler = _bs2_temporal_view.select('g.bs2_horizontal_bar_g')
                    .select('g.bs2_h_rects')
                    .selectAll('g')
                    .data(max_bs2_arr, function (item, i) {
                        return ('' + item + i);
                    });

                bs2_h_bar_handler.exit().remove();
                bs2_h_bar_handler.enter()
                    .append('g')
                    .attr('transform', function (item, i) {
                        return 'translate(0,' + (-h_bar_size - i * (h_bar_size + h_bar_padding) ) + ')';
                    })
                    .append('rect')
                    .attr('height', h_bar_size)
                    .attr('width', function (item, i) {
                        return _this.h_scale(item);
                    })
                    .attr('fill', function (item, i) {
                        return _this.second_venue_color_mapping[i];
                    });
            }
        },
        drawTemporalViewByQuarterYear: function (review_ratings) {
            var _this = this;
            var bs1_review_ratings = review_ratings[0],
                bs2_review_ratings = review_ratings[1];

            //fixed size
            var layout_config = {
                'padding_w': 2,
                'padding_h': 2,
                'extra_padding_w': 50,
                'extra_padding_h': 15,
                'rect_size': _this.rect_size,
                'each_axis_label_height': 45,
                'horizontal_bar_chart_width': 150,
                'max_w': undefined,
                'bs1_max_h': undefined,
                'bs2_max_h': undefined,
                'h_tentative': undefined,
                'w_tentative': undefined,

            };
            layout_config.max_w = bs1_review_ratings.length;


            // var bs1_max_num_of_each_rating = this.getMaxRatingNumOfEachQuarterYear(bs1_review_ratings),
            //     bs2_max_num_of_each_rating = this.getMaxRatingNumOfEachQuarterYear(bs2_review_ratings);
            // layout_config.bs1_max_h = bs1_max_num_of_each_rating.reduce(function (a, b) {
            //     return a + b;
            // }, 0);
            // layout_config.bs2_max_h = bs2_max_num_of_each_rating.reduce(function (a, b) {
            //     return a + b;
            // }, 0); //max height

            var bs1_h_arr = bs1_review_ratings.map(function (d, i) {
                    return d.length;
                }),
                bs2_h_arr = bs2_review_ratings.map(function (d, i) {
                    return d.length;
                });
            layout_config.bs1_max_h = Math.max(...bs1_h_arr
            ),
            layout_config.bs2_max_h = Math.max(...bs2_h_arr
            )
            ; //max height


            //determine tentative size
            layout_config.h_tentative = 2 * layout_config.each_axis_label_height + 2 * layout_config.extra_padding_h
                + (layout_config.bs1_max_h + layout_config.bs2_max_h) * (layout_config.rect_size + layout_config.padding_h);
            layout_config.w_tentative = layout_config.horizontal_bar_chart_width + layout_config.extra_padding_w
                + layout_config.max_w * (layout_config.rect_size + layout_config.padding_w);

            //remove previous svg and append a new one
            d3.select(this.$el).select('svg').remove();
            d3.select(this.$el)
                .style('overflow', 'auto')
                .append('svg')
                .attr('width', layout_config.w_tentative)
                .attr('height', layout_config.h_tentative);

            //append view groups
            var bs1_temporal_view = d3.select(this.$el)
                .select('svg')
                .append('g')
                .attr('class', 'bs1_temporal_view')
                .attr('transform', function () {
                    return 'translate(0,' + (layout_config.extra_padding_h
                        + layout_config.bs1_max_h * (layout_config.rect_size + layout_config.padding_h)
                        + layout_config.each_axis_label_height) + ')';
                });
            var bs2_temporal_view = d3.select(this.$el)
                .select('svg')
                .append('g')
                .attr('class', 'bs2_temporal_view')
                .attr('transform', function () {
                    return 'translate(0,' + layout_config.h_tentative + ')';
                });

            //append the business names for both venues
            var name_padding_left = 100;
            bs1_temporal_view.append('g')
                .attr('class', 'bs1_name')
                .attr('transform', function () {
                    return 'translate(' + name_padding_left + ',' + ( -(layout_config.bs1_max_h * (layout_config.rect_size + layout_config.padding_h) ) ) + ')';
                })
                .append('text')
                .attr("text-anchor", "start")
                .attr('font-size', '15px')
                .text(function () {
                    return _this.bs1_name;
                });

            bs2_temporal_view.append('g')
                .attr('class', 'bs2_name')
                .attr('transform', function () {
                    return 'translate(' + name_padding_left + ',' + ( (-layout_config.bs2_max_h) * (layout_config.rect_size + layout_config.padding_h) - 0 ) + ')';
                })
                .append('text')
                .attr("text-anchor", "start")
                .attr('font-size', '15px')
                .text(function () {
                    return _this.bs2_name;
                });


            //写到这


            //append axis and labels for bs1 and bs2
            var bs_mode = ['bs1', 'bs2'];
            this.drawAxisAndLabelsForTemporalView(bs1_temporal_view, layout_config, bs_mode[0]);
            this.drawAxisAndLabelsForTemporalView(bs2_temporal_view, layout_config, bs_mode[1]);

            //append rectangles for bs1
            this.drawStackedRectsForTemporalView(bs1_review_ratings, bs1_temporal_view, layout_config, bs_mode[0]);
            this.drawStackedRectsForTemporalView(bs2_review_ratings, bs2_temporal_view, layout_config, bs_mode[1]);


            //append horizontal bars for bs1 and bs2
            //selection of rectangles
            var bs1_selection_rect = [[0, 0], [0, 0]], bs2_selection_rect = [[0, 0], [0, 0]];
            var bs1_selected_five_rating_arr = undefined, bs2_selected_five_rating_arr = undefined;
            var two_bs_dividing_y = (layout_config.extra_padding_h + layout_config.bs1_max_h * (layout_config.rect_size
            + layout_config.padding_h) + layout_config.each_axis_label_height);
            var selection_start_pos = [0, 0];

            //drag event for selection
            var bs1_selection_handler = undefined, bs2_selection_handler = undefined;
            var bs_drag = d3.behavior.drag()
                .on('dragstart', function (d, i) {
                    console.log('dragstart: ', d3.mouse(this));

                    //set mouse pointer
                    d3.select(_this.$el)
                        .classed('areaSelectionPointer', true);

                    selection_start_pos = d3.mouse(this);
                    if (selection_start_pos[1] < two_bs_dividing_y) { //bs1
                        bs1_selection_rect = [selection_start_pos, selection_start_pos]; //init
                        bs1_selection_handler = d3.select(_this.$el)
                            .select('svg')
                            .append('rect')
                            .attr('class', 'bs1_selection_rect')
                            .attr('x', selection_start_pos[0])
                            .attr('y', selection_start_pos[1])
                            .attr('width', 0)
                            .attr('height', 0)
                            .attr('fill', 'none')
                            .attr('stroke', 'red')
                            .attr('stroke-width', 2);
                    }
                    else { //bs2
                        bs2_selection_rect = [selection_start_pos, selection_start_pos]; //init
                        bs2_selection_handler = d3.select(_this.$el)
                            .select('svg')
                            .append('rect')
                            .attr('class', 'bs2_selection_rect')
                            .attr('x', selection_start_pos[0])
                            .attr('y', selection_start_pos[1])
                            .attr('width', 0)
                            .attr('height', 0)
                            .attr('fill', 'none')
                            .attr('stroke', 'red')
                            .attr('stroke-width', 2);
                    }
                })
                .on('drag', function (d, i) {
                    console.log('drag: ', d3.mouse(this));
                    var pos = d3.mouse(this);

                    if (selection_start_pos[1] < two_bs_dividing_y) { //bs1
                        bs1_selection_rect[1] = pos;
                        bs1_selection_handler.attr('width', pos[0] - selection_start_pos[0])
                            .attr('height', pos[1] - selection_start_pos[1]);
                    }
                    else { //bs2
                        bs2_selection_rect[1] = pos;
                        bs2_selection_handler.attr('width', pos[0] - selection_start_pos[0])
                            .attr('height', pos[1] - selection_start_pos[1]);
                    }
                })
                .on('dragend', function (d, i) {
                    console.log('dragend: ', d3.mouse(this));

                    //set mouse pointer
                    d3.select(_this.$el)
                        .classed('areaSelectionPointer', false);

                    var pos = d3.mouse(this);

                    //remove the common customer line whatever
                    d3.select(_this.$el)
                        .select('g.common_customer_highlighting_link')
                        .remove();

                    //if start == end, then it may be a click event on rectangle 非常重要!!
                    if (selection_start_pos[0] == pos[0] && selection_start_pos[1] == pos[1]) {
                        _this.processEventOfClickingOnRectsOrCircles(pos);
                        if (_this.click_on_circle_rect_flag) { //if it is really a click on circle or rectangles, then return
                            _this.click_on_circle_rect_flag = false;
                            return;   //do not execute the remaining code
                        }
                    }

                    if (selection_start_pos[1] < two_bs_dividing_y) { //bs1
                        bs1_selection_rect[1] = pos;
                        var remove_flag = (bs1_selection_rect[1][0] == bs1_selection_rect[0][0])
                            && bs1_selection_rect[1][1] == bs1_selection_rect[0][1];
                        if (remove_flag) {
                            d3.select(_this.$el).selectAll('rect.bs1_selection_rect').remove();
                        }
                        updateHorizontalBarCharts();

                        //highlight the selected circles and rectangles and remove highlighting of un-selected rectangles
                        var bs1_svg_handler = d3.select(_this.$el).select('g.bs1_temporal_rects');
                        _this.highlightBrushedCircleAndRect(bs1_svg_handler, bs1_selection_rect);

                    }
                    else { //bs2
                        bs2_selection_rect[1] = pos;
                        var remove_flag = (bs2_selection_rect[1][0] == bs2_selection_rect[0][0])
                            && bs2_selection_rect[1][1] == bs2_selection_rect[0][1];
                        if (remove_flag) {
                            d3.select(_this.$el).selectAll('rect.bs2_selection_rect').remove();
                        }
                        updateHorizontalBarCharts();

                        //highlight the selected circles and rectangles and remove highlighting of un-selected rectangles
                        var bs2_svg_handler = d3.select(_this.$el).select('g.bs2_temporal_rects');
                        _this.highlightBrushedCircleAndRect(bs2_svg_handler, bs2_selection_rect);
                    }


                });
            d3.select(this.$el)
                .select('svg')
                .call(bs_drag);

            //draw the rectangles
            // var h_scale = undefined; //will store the scale when use this for the first time
            updateHorizontalBarCharts();

            function updateHorizontalBarCharts() {
                bs1_selected_five_rating_arr = _this.getBs1HorizontalBarChartData(bs1_selection_rect, bs1_review_ratings, layout_config);
                bs2_selected_five_rating_arr = _this.getBs2HorizontalBarChartData(bs2_selection_rect, bs2_review_ratings, layout_config);
                console.log('Selected review ratings: ', bs1_selected_five_rating_arr, bs2_selected_five_rating_arr);

                var selected_reviews_obj = _this.getSelectedReviewIds(bs1_selected_five_rating_arr, bs2_selected_five_rating_arr);
                pipService.emitUpdateWordCloudViewData(selected_reviews_obj); //update the word cloud view

                _this.drawTwoHorizontalBarCharts(bs1_temporal_view, bs2_temporal_view,
                    bs1_selected_five_rating_arr, bs2_selected_five_rating_arr, layout_config);
            }
        },

        highlightBrushedCircleAndRect: function (svg_circle_rect, rect_region) {
            var _this = this;

            //rect
            svg_circle_rect.selectAll('rect')
                .filter(function (item, i) {
                    var flag = item['pos_x'] >= rect_region[0][0] && item['pos_y'] >= rect_region[0][1] &&
                        item['pos_x'] <= rect_region[1][0] && item['pos_y'] <= rect_region[1][1];
                    return flag;
                })
                .each(function (item, i) {
                    d3.select(this).attr('fill', _this.highlight_color); //highlight
                });

            svg_circle_rect.selectAll('rect')
                .filter(function (item, i) {
                    var flag = item['pos_x'] >= rect_region[0][0] && item['pos_y'] >= rect_region[0][1] &&
                        item['pos_x'] <= rect_region[1][0] && item['pos_y'] <= rect_region[1][1];
                    return !flag;
                })
                .each(function (item, i) {
                    d3.select(this).attr('fill', item['original_fill']); //remove highlight
                });

            //circle
            svg_circle_rect.selectAll('circle')
                .filter(function (item, i) {
                    var flag = item['pos_x'] >= rect_region[0][0] && item['pos_y'] >= rect_region[0][1] &&
                        item['pos_x'] <= rect_region[1][0] && item['pos_y'] <= rect_region[1][1];
                    return flag;
                })
                .each(function (item, i) {
                    d3.select(this).attr('fill', _this.highlight_color); //highlight
                });

            svg_circle_rect.selectAll('circle')
                .filter(function (item, i) {
                    var flag = item['pos_x'] >= rect_region[0][0] && item['pos_y'] >= rect_region[0][1] &&
                        item['pos_x'] <= rect_region[1][0] && item['pos_y'] <= rect_region[1][1];
                    return !flag;
                })
                .each(function (item, i) {
                    d3.select(this).attr('fill', item['original_fill']); //remove highlight
                });

        },

        drawStackedRectsForTemporalViewWithLayers: function (bs_review_ratings, bs_temporal_view, layout_config,
                                                             bs_mode_str, bs_max_num_of_each_rating_accumulated) {
            var _this = this;

            //parse the bs_temporal_view positions
            var bs_delta_x = d3.transform(d3.select(bs_temporal_view[0][0]).attr('transform')).translate[0],
                bs_delta_y = d3.transform(d3.select(bs_temporal_view[0][0]).attr('transform')).translate[1];
            bs_delta_x = parseInt(bs_delta_x);
            bs_delta_y = parseInt(bs_delta_y);

            bs_temporal_view.append('g')
                .attr('class', bs_mode_str + '_temporal_rects')
                .selectAll('g')
                .data(bs_review_ratings)
                .enter()
                .append('g')
                .attr('class', function (d, i) {
                    if (d.length == 0) {
                        return 'no_review';
                    }
                    var year_quarter = _this.date2Quarter(d[0]['date']);
                    var str = '' + year_quarter[0] + year_quarter[1];
                    return str;
                })
                .attr('transform', function (d, i) {
                    return 'translate(' + (i * (layout_config.padding_w + layout_config.rect_size) + layout_config.rect_size / 2)
                        + ',' + (-layout_config.each_axis_label_height) + ')';
                })
                .each(function (d, i) {
                    // console.log('draw rectangles: ', d, i);
                    if (d.length == 0) {
                        return;
                    }

                    //get the quarter year position
                    var bs_quarter_delta_x = bs_delta_x + (i * (layout_config.padding_w + layout_config.rect_size) + layout_config.rect_size / 2);
                    var bs_quarter_delta_y = bs_delta_y + (-layout_config.each_axis_label_height);

                    //get review num of each rating in this time slot
                    var rating_num_of_one_slot = [0, 0, 0, 0, 0];
                    for (var k = 0; k < d.length; k++) {
                        var rating = d[k]['stars'];
                        rating_num_of_one_slot[rating - 1]++;
                    }
                    var accumulated_rating_num_of_one_slot = [], tmp = 0;
                    accumulated_rating_num_of_one_slot.push(0);
                    for (k = 0; k < rating_num_of_one_slot.length - 1; k++) {
                        tmp += rating_num_of_one_slot[k];
                        accumulated_rating_num_of_one_slot.push(tmp);
                    }


                    //draw rectangles or circles
                    d3.select(this).selectAll('g.rects_or_circles')
                        .data(d)
                        .enter()
                        .append('g')
                        .attr('class', 'rects_or_circles')
                        .each(function (item, j) {
                            item['rect_w_h'] = _this.rect_size_scale(item['scaled_score']);
                            item['selection_flag'] = false;
                            item['pos_x'] = bs_quarter_delta_x + (layout_config.rect_size - item['rect_w_h']) / 2;
                            var rating = item['stars'];
                            var layer_start_y = bs_max_num_of_each_rating_accumulated[rating - 1],
                                layer_h_padding = (rating - 1) * layout_config.layer_h_padding;
                            item['pos_y'] = bs_quarter_delta_y
                                - ( (layout_config.rect_size / 2 + item['rect_w_h'] / 2)
                                + ((j - accumulated_rating_num_of_one_slot[rating - 1]) + layer_start_y) * (layout_config.padding_h + layout_config.rect_size)
                                + layer_h_padding);
                            item['original_fill'] = _this.first_venue_color_mapping[rating - 1];

                            //draw rectangle
                            if (item['common'] == 'false') {
                                d3.select(this).append('rect')
                                    .attr('width', function () {
                                        return item['rect_w_h'];
                                    })
                                    .attr('height', function () {
                                        return item['rect_w_h'];
                                    })
                                    .attr('x', function () {
                                        return (layout_config.rect_size - item['rect_w_h']) / 2;
                                    })
                                    .attr('y', function () {
                                        return -( (layout_config.rect_size / 2 + item['rect_w_h'] / 2)
                                        + ((j - accumulated_rating_num_of_one_slot[rating - 1]) + layer_start_y) * (layout_config.padding_h + layout_config.rect_size)
                                        + layer_h_padding);
                                    })
                                    .attr('fill', function () {
                                        return item['original_fill'];
                                    })
                                    .on('mouseover', function () {
                                        d3.select(this).style('cursor', 'pointer');
                                    })
                                    .on('mouseout', function () {
                                        d3.select(this).style('cursor', 'pointer');
                                    })
                                    .on('click', function () { //not working
                                        console.log('The selected text of layered reviews: ', d);
                                    });
                            }
                            else {
                                //draw circles
                                d3.select(this)
                                    .append('circle')
                                    .attr('cx', function () {
                                        return layout_config.rect_size / 2;
                                    })
                                    .attr('cy', function () {
                                        return -( (layout_config.rect_size / 2)
                                        + ((j - accumulated_rating_num_of_one_slot[rating - 1]) + layer_start_y) * (layout_config.padding_h + layout_config.rect_size)
                                        + layer_h_padding);
                                    })
                                    .attr('r', function () {
                                        return item['rect_w_h'] / 2;
                                    })
                                    .attr('fill', function () {
                                        return item['original_fill'];
                                    })
                                    .on('mouseover', function () {
                                        d3.select(this).style('cursor', 'pointer');
                                    })
                                    .on('mouseout', function () {
                                        d3.select(this).style('cursor', 'pointer');
                                    })
                                    .on('click', function () { //not working
                                        console.log('The selected text of stacked reviews: ', item);
                                    });
                            }

                        });

                });

        },
        drawTemporalViewByQuarterYearWithLayers: function (review_ratings) {
            var _this = this;
            var bs1_review_ratings = review_ratings[0],
                bs2_review_ratings = review_ratings[1];

            //fixed size
            var layout_config = {
                'padding_w': 2,
                'padding_h': 2,
                'extra_padding_w': 50,
                'extra_padding_h': 15,
                'rect_size': _this.rect_size,
                'each_axis_label_height': 45,
                'horizontal_bar_chart_width': 150,
                'max_w': undefined,
                'bs1_max_h': undefined,
                'bs2_max_h': undefined,
                'h_tentative': undefined,
                'w_tentative': undefined,

                'layer_h_padding': 5, //padding between different layers
            };
            layout_config.max_w = bs1_review_ratings.length;


            var bs1_max_num_of_each_rating = this.getMaxRatingNumOfEachQuarterYear(bs1_review_ratings),
                bs2_max_num_of_each_rating = this.getMaxRatingNumOfEachQuarterYear(bs2_review_ratings);
            layout_config.bs1_max_h = bs1_max_num_of_each_rating.reduce(function (a, b) {
                return a + b;
            }, 0);
            layout_config.bs2_max_h = bs2_max_num_of_each_rating.reduce(function (a, b) {
                return a + b;
            }, 0); //max height

            //accumulated height of each layer
            var bs1_max_num_of_each_rating_accumulated = this.getMaxRatingNumOfEachQuarterYearAccumulated(bs1_max_num_of_each_rating);
            var bs2_max_num_of_each_rating_accumulated = this.getMaxRatingNumOfEachQuarterYearAccumulated(bs2_max_num_of_each_rating);

            //determine tentative size
            layout_config.h_tentative = 2 * layout_config.each_axis_label_height + 2 * layout_config.extra_padding_h
                + (layout_config.bs1_max_h + layout_config.bs2_max_h) * (layout_config.rect_size + layout_config.padding_h)
                + layout_config.layer_h_padding * 4 * 2; //layer_h_padding is for dividing different rating layers
            layout_config.w_tentative = layout_config.horizontal_bar_chart_width + layout_config.extra_padding_w
                + layout_config.max_w * (layout_config.rect_size + layout_config.padding_w);

            //remove previous svg and append a new one
            d3.select(this.$el).select('svg').remove();
            d3.select(this.$el)
                .style('overflow', 'auto')
                .append('svg')
                .attr('width', layout_config.w_tentative)
                .attr('height', layout_config.h_tentative);

            //append view groups
            var bs1_temporal_view = d3.select(this.$el)
                .select('svg')
                .append('g')
                .attr('class', 'bs1_temporal_view')
                .attr('transform', function () {
                    return 'translate(0,' + (layout_config.extra_padding_h
                        + layout_config.bs1_max_h * (layout_config.rect_size + layout_config.padding_h)
                        + layout_config.layer_h_padding * 4 //layer padding
                        + layout_config.each_axis_label_height) + ')';
                });
            var bs2_temporal_view = d3.select(this.$el)
                .select('svg')
                .append('g')
                .attr('class', 'bs2_temporal_view')
                .attr('transform', function () {
                    return 'translate(0,' + layout_config.h_tentative + ')';
                });

            //append axis and labels for bs1 and bs2
            var bs_mode = ['bs1', 'bs2'];
            this.drawAxisAndLabelsForTemporalView(bs1_temporal_view, layout_config, bs_mode[0]);
            this.drawAxisAndLabelsForTemporalView(bs2_temporal_view, layout_config, bs_mode[1]);

            //append rectangles for bs1 and bs2
            this.drawStackedRectsForTemporalViewWithLayers(bs1_review_ratings, bs1_temporal_view, layout_config,
                bs_mode[0], bs1_max_num_of_each_rating_accumulated);
            this.drawStackedRectsForTemporalViewWithLayers(bs2_review_ratings, bs2_temporal_view, layout_config,
                bs_mode[1], bs2_max_num_of_each_rating_accumulated);

            //append layered dividing lines
            this.drawLayerDividingLinesForTemporalView(bs1_temporal_view, layout_config, bs_mode[0], bs1_max_num_of_each_rating_accumulated);
            this.drawLayerDividingLinesForTemporalView(bs2_temporal_view, layout_config, bs_mode[1], bs2_max_num_of_each_rating_accumulated);

            //append horizontal bars for bs1 and bs2
            //selection of rectangles
            var bs1_selection_rect = [[0, 0], [0, 0]], bs2_selection_rect = [[0, 0], [0, 0]];
            var bs1_selected_five_rating_arr = undefined, bs2_selected_five_rating_arr = undefined;
            var two_bs_dividing_y = (layout_config.extra_padding_h + layout_config.bs1_max_h * (layout_config.rect_size
                + layout_config.padding_h) + layout_config.each_axis_label_height) + layout_config.layer_h_padding * 4;
            var selection_start_pos = [0, 0];

            var bs1_selection_handler = undefined, bs2_selection_handler = undefined;
            var bs_drag = d3.behavior.drag()
                .on('dragstart', function (d, i) {
                    console.log('dragstart: ', d3.mouse(this));

                    //set mouse pointer
                    d3.select(_this.$el)
                        .classed('areaSelectionPointer', true);

                    selection_start_pos = d3.mouse(this);
                    if (selection_start_pos[1] < two_bs_dividing_y) { //bs1
                        bs1_selection_rect = [selection_start_pos, selection_start_pos]; //init
                        bs1_selection_handler = d3.select(_this.$el)
                            .select('svg')
                            .append('rect')
                            .attr('class', 'bs1_selection_rect')
                            .attr('x', selection_start_pos[0])
                            .attr('y', selection_start_pos[1])
                            .attr('width', 0)
                            .attr('height', 0)
                            .attr('fill', 'none')
                            .attr('stroke', 'red')
                            .attr('stroke-width', 2);
                    }
                    else { //bs2
                        bs2_selection_rect = [selection_start_pos, selection_start_pos]; //init
                        bs2_selection_handler = d3.select(_this.$el)
                            .select('svg')
                            .append('rect')
                            .attr('class', 'bs2_selection_rect')
                            .attr('x', selection_start_pos[0])
                            .attr('y', selection_start_pos[1])
                            .attr('width', 0)
                            .attr('height', 0)
                            .attr('fill', 'none')
                            .attr('stroke', 'red')
                            .attr('stroke-width', 2);
                    }
                })
                .on('drag', function (d, i) {
                    console.log('drag: ', d3.mouse(this));
                    var pos = d3.mouse(this);

                    if (selection_start_pos[1] < two_bs_dividing_y) { //bs1
                        bs1_selection_rect[1] = pos;
                        bs1_selection_handler.attr('width', pos[0] - selection_start_pos[0])
                            .attr('height', pos[1] - selection_start_pos[1]);
                    }
                    else { //bs2
                        bs2_selection_rect[1] = pos;
                        bs2_selection_handler.attr('width', pos[0] - selection_start_pos[0])
                            .attr('height', pos[1] - selection_start_pos[1]);
                    }
                })
                .on('dragend', function (d, i) {
                    console.log('dragend: ', d3.mouse(this));

                    //set mouse pointer
                    d3.select(_this.$el)
                        .classed('areaSelectionPointer', false);

                    var pos = d3.mouse(this);

                    //remove the common customer line whatever
                    d3.select(_this.$el)
                        .select('g.common_customer_highlighting_link')
                        .remove();

                    //if start == end, then it may be a click event on rectangle 非常重要!!
                    if (selection_start_pos[0] == pos[0] && selection_start_pos[1] == pos[1]) {
                        _this.processEventOfClickingOnRectsOrCircles(pos);
                        if (_this.click_on_circle_rect_flag) { //if it is really a click on circle or rectangles, then return
                            _this.click_on_circle_rect_flag = false;
                            return;   //do not execute the remaining code
                        }
                    }

                    if (selection_start_pos[1] < two_bs_dividing_y) { //bs1
                        bs1_selection_rect[1] = pos;
                        var remove_flag = (bs1_selection_rect[1][0] == bs1_selection_rect[0][0])
                            && bs1_selection_rect[1][1] == bs1_selection_rect[0][1];
                        if (remove_flag) {
                            d3.select(_this.$el).selectAll('rect.bs1_selection_rect').remove();
                        }
                        updateHorizontalBarCharts();

                        //highlight the selected circles and rectangles and remove highlighting of un-selected rectangles
                        var bs1_svg_handler = d3.select(_this.$el).select('g.bs1_temporal_rects');
                        _this.highlightBrushedCircleAndRect(bs1_svg_handler, bs1_selection_rect);

                    }
                    else { //bs2
                        bs2_selection_rect[1] = pos;
                        var remove_flag = (bs2_selection_rect[1][0] == bs2_selection_rect[0][0])
                            && bs2_selection_rect[1][1] == bs2_selection_rect[0][1];
                        if (remove_flag) {
                            d3.select(_this.$el).selectAll('rect.bs2_selection_rect').remove();
                        }
                        updateHorizontalBarCharts();

                        //highlight the selected circles and rectangles and remove highlighting of un-selected rectangles
                        var bs2_svg_handler = d3.select(_this.$el).select('g.bs2_temporal_rects');
                        _this.highlightBrushedCircleAndRect(bs2_svg_handler, bs2_selection_rect);
                    }

                });
            d3.select(this.$el)
                .select('svg')
                .call(bs_drag);


            //draw the rectangles
            // var h_scale = undefined; //will store the scale when use this for the first time
            updateHorizontalBarCharts();

            function updateHorizontalBarCharts() {
                bs1_selected_five_rating_arr = _this.getBs1HorizontalBarChartDataInLayeredLayout(bs1_selection_rect,
                    bs1_review_ratings, layout_config, bs1_max_num_of_each_rating_accumulated);
                bs2_selected_five_rating_arr = _this.getBs2HorizontalBarChartDataInLayeredLayout(bs2_selection_rect,
                    bs2_review_ratings, layout_config, bs2_max_num_of_each_rating_accumulated);

                //update selected review objects
                var selected_reviews_obj = _this.getSelectedReviewIds(bs1_selected_five_rating_arr, bs2_selected_five_rating_arr);
                pipService.emitUpdateWordCloudViewData(selected_reviews_obj); //update the word cloud view

                _this.drawTwoHorizontalBarCharts(bs1_temporal_view, bs2_temporal_view,
                    bs1_selected_five_rating_arr, bs2_selected_five_rating_arr, layout_config);
            }
        },

        drawTemporalViewByYear: function (review_ratings) {
            var _this = this;
            var bs1_review_ratings = review_ratings[0],
                bs2_review_ratings = review_ratings[1];
            var padding_column = 40, padding_row = 2;// width, height
            var rect_size = 4;


            var bs1_temporal_view = d3.select(this.$el)
                .select('svg')
                .append('g')
                .attr('class', 'bs1_temporal_view')
                .attr('transform', function () {
                    return 'translate(0,' + _this.svg_height / 2 + ')';
                });
            var bs2_temporal_view = d3.select(this.$el)
                .select('svg')
                .append('g')
                .attr('class', 'bs2_temporal_view')
                .attr('transform', function () {
                    return 'translate(0,' + _this.svg_height + ')';
                });

            bs1_temporal_view.selectAll('g')
                .data(bs1_review_ratings)
                .enter()
                .append('g')
                .attr('class', function (d, i) {
                    var year = _this.date2Year(_this.two_venue_review_rating['min_date']) + i;
                    return year;
                })
                .attr('transform', function (d, i) {
                    return 'translate(' + (i * padding_column + rect_size / 2) + ',0)';
                })
                .each(function (d, i) {
                    // console.log('draw rectangles: ', d, i);
                    //draw rectangles
                    d3.select(this).selectAll('rect')
                        .data(d)
                        .enter()
                        .append('rect')
                        .attr('width', rect_size)
                        .attr('height', rect_size)
                        .attr('x', 0)
                        .attr('y', function (item, j) {
                            return -(rect_size + j * (padding_row + rect_size));
                        })
                        .attr('fill', function (item, j) {
                            var rating = item['stars'];
                            return _this.first_venue_color_mapping[rating - 1];
                        });

                });


        },
        getReviewIdsList: function (review_rating_list) {
            var review_id_list = [];
            for (var i = 0; i < review_rating_list.length; i++) {
                var review_id = review_rating_list[i]['review_id'];
                review_id_list.push(review_id);
            }

            return review_id_list;
        }
    },
    created: function () {
        console.log('Temporal View is Created!');


    },
    mounted: function () {
        console.log('Temporal View is mounted!');
        var _this = this;
        this.init();

        this.rect_size_scale = d3.scale.linear().domain([0, 10]).range([5, this.rect_size * 1.3]);//init the function for scaling rect_size based on helpfulness

        //two venue are selected
        pipService.onVenueSelectionIsReady(function (selected_two_venues) {
            console.log('Selected two venues:', selected_two_venues);
            _this.bs1_id = selected_two_venues[0]['business_id'], _this.bs2_id = selected_two_venues[1]['business_id'];
            _this.bs1_name = selected_two_venues[0]['name'], _this.bs2_name = selected_two_venues[1]['name'];

            dataService.getReviewRatingTemporalInfo(_this.bs1_id, _this.bs2_id)
                .then(function (resp) {
                    console.log('response review ratings: ', resp.data);
                    _this.two_venue_review_rating = resp.data;

                    //draw the view
                    if (_this.two_venue_review_rating != undefined) {
                        //notifying word cloud view to update the data
                        var review_ids_list = {
                            'business_ids': [_this.bs1_id, _this.bs2_id],
                            'bs1_review_ids': [],
                            'bs2_review_ids': []
                        };
                        review_ids_list['bs1_review_ids'] = _this.getReviewIdsList(_this.two_venue_review_rating.data[_this.bs1_id]);
                        review_ids_list['bs2_review_ids'] = _this.getReviewIdsList(_this.two_venue_review_rating.data[_this.bs2_id]);
                        pipService.emitUpdateWordCloudViewData(review_ids_list);

                        //draw temporal view
                        if (_this.cur_processing_mode == _this.data_processing_mode[0]) {
                            var review_rating_by_year = _this.processDataByYear(_this.two_venue_review_rating);
                            _this.drawTemporalViewByYear(review_rating_by_year);
                        }
                        else if (_this.cur_processing_mode == _this.data_processing_mode[1]) {
                            var review_rating_by_quarter_year = _this.processDataByQuarterYear(_this.two_venue_review_rating);
                            if (_this.layered_layout_flag) { //layered layout
                                _this.drawTemporalViewByQuarterYearWithLayers(review_rating_by_quarter_year);
                            }
                            else {
                                _this.drawTemporalViewByQuarterYear(review_rating_by_quarter_year);
                            }
                        }
                    }

                }, function (error) {
                    console.log('Error in loading the venue info!', error);
                });

        });

        pipService.onTemporalViewLayoutIsChanged(function (layout_str) {
            if (_this.two_venue_review_rating == undefined) {
                return;
            }

            var review_rating_by_quarter_year = _this.processDataByQuarterYear(_this.two_venue_review_rating);
            if (layout_str == 'Layered') {
                _this.layered_layout_flag = true;
                _this.drawTemporalViewByQuarterYearWithLayers(review_rating_by_quarter_year);
            }
            else if (layout_str == 'Stacked') { //stacked
                _this.layered_layout_flag = false;
                _this.drawTemporalViewByQuarterYear(review_rating_by_quarter_year);
            }

        });

        //remove the whole view when the venue is small
        pipService.onRemoveCommonCustomerCompView(function (cur_venues) {
            console.log('Need to remove temporal view!');
            d3.select(_this.$el).select('svg').remove();
            d3.select(_this.$el)
                .style('overflow', 'auto')
                .append('svg')
                .attr('width', 771)
                .attr('height', 610);

        });

    },
    watch: {

    }

});
