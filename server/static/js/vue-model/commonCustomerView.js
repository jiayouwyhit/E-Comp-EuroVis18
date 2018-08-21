/**
 * Created by wangyong on 8/3/2017.
 */

var commonCustomerView = new Vue({
    el: '#commonCustomerComparisonView',
    delimiters: ['{{', '}}'],
    data: {
        // view_svg_handler: undefined,
        // selected_venue_info: [],
        common_customer_rating_reviews: [],
        l_color_mapping: ['#d73027', '#fdae61', '#EFFF9A', '#abd9e9', '#4575b4'],
        r_color_mapping:  ['#d73027', '#fdae61', '#EFFF9A', '#abd9e9', '#4575b4'],
        m_color_no_diff: '#cccccc',
        m_color_with_diff: ['#dadaeb', '#bcbddc', '#9e9ac8', '#807dba'], //紫色
            //['#d1e5f0', '#92c5de', '#4393c3', '#2166ac'], //blue
        //['#969696', '#636363', '#252525', '#000000'], //sequential color

        svg_w: 750,
        svg_h: 390,
    },
    methods: {
        initDrawing: function () {
            var width = this.svg_w, height = this.svg_h;
            var svg_tmp = d3.select('#commonCustomerComparisonView').select('svg');
            if (svg_tmp[0][0] != null) {
                svg_tmp.remove();
            }
            d3.select('#commonCustomerComparisonView')
                .append("svg")
                .attr('width', width)
                .attr('height', height);
        },
        getRectColorByAttrName: function (attr_nm) {
            if (attr_nm[0] == 'l') { //left
                var idx = parseInt(attr_nm.substring(1)) - 1;
                return this.l_color_mapping[idx];
            }
            else if (attr_nm[0] == 'r') { //right
                var idx = parseInt(attr_nm.substring(1)) - 1;
                return this.r_color_mapping[idx];
            }
            else if (attr_nm[0] == 'm') { //middle
                var idx = parseInt(attr_nm.substring(1));
                if (idx == 0) {
                    return this.m_color_no_diff;
                }
                else if (idx > 0) {
                    idx = idx - 1;
                    return this.m_color_with_diff[idx];
                }
                else if (idx < 0) {
                    idx = Math.abs(idx) - 1;
                    return this.m_color_with_diff[idx];
                }
            }
            else {
                alert('Error in the processing!');
            }

        },
        processNodeList: function (raw_nodes) {
            //build links
            var tmp_link = {};
            for (var i = 0; i < raw_nodes.length; i++) {
                var bs1_rating = raw_nodes[i]['details']['business_1_rating'],
                    bs2_rating = raw_nodes[i]['details']['business_2_rating'];

                //check if the rating does not exist
                if (bs1_rating == null)
                    bs1_rating = 3;
                if (bs2_rating == null)
                    bs2_rating = 3;

                // //l->r
                // var l_attr = 'l' + bs1_rating,
                //     r_attr = 'r' + bs2_rating;
                // var attr = l_attr + ',' + r_attr;
                // if (tmp_link.hasOwnProperty(attr)) {
                //     tmp_link[attr]++;
                // }
                // else {
                //     tmp_link[attr] = 1;
                // }

                //l->m
                var l_attr = 'l' + bs1_rating,
                    r_attr = 'r' + bs2_rating;
                var bs_diff = bs1_rating - bs2_rating;
                var m_attr = 'm' + bs_diff;
                var attr = l_attr + ',' + m_attr;
                if (tmp_link.hasOwnProperty(attr)) {
                    tmp_link[attr]++;
                }
                else {
                    tmp_link[attr] = 1;
                }

                //m->r
                attr = m_attr + ',' + r_attr;
                if (tmp_link.hasOwnProperty(attr)) {
                    tmp_link[attr]++;
                }
                else {
                    tmp_link[attr] = 1;
                }
            }
            var links = []; //final info of nodes
            for (var prop in tmp_link) {
                if (tmp_link.hasOwnProperty(prop)) {
                    var tmp_prop = prop.split(',');
                    var tmp = {'source': tmp_prop[0], 'target': tmp_prop[1], 'value': tmp_link[prop]};
                    links.push(tmp);
                }
            }

            //Node info and update link nodes
            var node_set = new Set();
            for (var i = 0; i < links.length; i++) {
                node_set.add(links[i]['source']);
                node_set.add(links[i]['target']);
            }
            var node_array = Array.from(node_set);
            node_array.sort(function (a, b) {
                if (b[0] > a[0])
                    return 1;
                else if (b[0] < a[0])
                    return -1;
                else {
                    return b.substring(1) - a.substring(1);
                }
            });
            for (var i = 0; i < links.length; i++) {
                links[i]['source'] = node_array.indexOf(links[i]['source']);
                links[i]['target'] = node_array.indexOf(links[i]['target']);
            }

            var nodes = []; //final info of nodes
            for (var i = 0; i < node_array.length; i++) {
                var tmp = {'name': node_array[i]};
                nodes.push(tmp);
            }

            return {'nodes': nodes, 'links': links};
        },
        drawSankeyDiagram: function (nodes, links, nm1, nm2) {
            var _this = this;
            var width = this.svg_w, height = this.svg_h;
            var sanky_padding_w = 160, sanky_padding_h = 30;
            var view_svg_handler = d3.select('#commonCustomerComparisonView')
                .select("svg")
                .append('g')
                .attr('class', 'sanky-diagrams')
                .attr('transform', function () {
                    return 'translate(' + sanky_padding_w / 2 + ',' + (sanky_padding_h) + ')';
                });
            // .attr('width', width)
            // .attr('height', height);

            //append the names of businesses
            var bs_label_handler = d3.select('#commonCustomerComparisonView')
                .select("svg")
                .append('g')
                .attr('class', 'label_names');
            var y_padding_sankey = sanky_padding_h * 0.65;
            bs_label_handler.append('g') //bs1
                .attr('transform', function () {
                    return 'translate(20,' + y_padding_sankey + ')';
                })
                .append('text')
                .attr("text-anchor", "start")
                .text(function () {
                    return nm1;
                });
            bs_label_handler.append('g') //bs2
                .attr('transform', function () {
                    return 'translate(' + (width - 40) + ',' + y_padding_sankey + ')';
                })
                .append('text')
                .attr("text-anchor", "end")
                .text(function () {
                    return nm2;
                });
            bs_label_handler.append('g') //difference
                .attr('transform', function () {
                    return 'translate(' + (width/2 - 25) + ',' + y_padding_sankey + ')';
                })
                .append('text')
                .attr("text-anchor", "start")
                .text(function () {
                    return 'Difference';
                });


            var units = "Customers";
            var formatNumber = d3.format(",.0f"), // zero decimal places
                format = function (d) {
                    return formatNumber(d) + " " + units;
                },
                color = d3.scale.category20();

            // Set the sankey diagram properties
            var sankey = d3.sankey()
                .nodeWidth(20)
                .nodePadding(10)
                .width(width - sanky_padding_w)
                .size([width - sanky_padding_w, height - sanky_padding_h]); // width,height
            var path = sankey.link();

            sankey
                .nodes(nodes)
                .links(links)
                .groupingMode(true)
                .layout(0); //iteration number. When set as 0, the order of the nodes will follow the data order

            // add in the links
            var link = view_svg_handler
                .append("g")
                .selectAll(".link")
                .data(links)
                .enter()
                .append("path")
                .attr("class", function (d, j) {
                    var src_name = d.source.name, target_name = d.target.name;
                    var class_str = "link " + src_name + ' ' + target_name;
                    return class_str;
                })
                .attr("d", path)
                .style("stroke-width", function (d) {
                    return Math.max(1, d.dy);
                })
                .sort(function (a, b) {
                    return b.dy - a.dy;
                })
                .on('mouseover', function (d, j) {
                    console.log('Mouse Over Event! ', d, j);
                    var src_name = d.source.name, target_name = d.target.name;
                    if (src_name[0] == 'l') {
                        var related_target = src_name.substring(1) - target_name.substring(1);
                        var related_target_name = 'r' + related_target;

                        d3.select('.link.' + src_name + '.' + target_name) //current
                            .classed('link_hovered', true)
                            .style('stroke', _this.getRectColorByAttrName(src_name));
                        d3.select('.link.' + target_name + '.' + related_target_name)
                            .classed('link_hovered', true)   //the other
                            .style('stroke', _this.getRectColorByAttrName(related_target_name));
                    }
                    else if (src_name[0] == 'm') {
                        var related_src = src_name.substring(1) + target_name.substring(1);
                        var related_src_name = 'l' + related_src;

                        d3.select('.link.' + src_name + '.' + target_name) //current
                            .classed('link_hovered', true)
                            .style('stroke', _this.getRectColorByAttrName(target_name));
                        d3.select('.link.' + src_name + '.' + related_src_name)
                            .classed('link_hovered', true)
                            .style('stroke', _this.getRectColorByAttrName(related_src_name));
                    }
                    else {
                        alert('Error in the source names!');
                    }
                })
                .on('mouseout', function (d, j) {
                    console.log('Mouse Out Event!', d, j);
                    var src_name = d.source.name, target_name = d.target.name;
                    if (src_name[0] == 'l') {
                        var related_target = src_name.substring(1) - target_name.substring(1);
                        var related_target_name = 'r' + related_target;

                        d3.select('.link.' + src_name + '.' + target_name) //current
                            .classed('link_hovered', false)
                            .style('stroke', '#000');
                        d3.select('.link.' + target_name + '.' + related_target_name)
                            .classed('link_hovered', false)   //the other
                            .style('stroke', '#000');
                    }
                    else if (src_name[0] == 'm') {
                        var related_src = src_name.substring(1) + target_name.substring(1);
                        var related_src_name = 'l' + related_src;

                        d3.select('.link.' + src_name + '.' + target_name) //current
                            .classed('link_hovered', false)
                            .style('stroke', '#000');
                        d3.select('.link.' + src_name + '.' + related_src_name)
                            .classed('link_hovered', false)
                            .style('stroke', '#000');
                    }
                    else {
                        alert('Error in the source names!');
                    }

                });

            // add the link titles
            var nameRemapping = function (_input_nm) {
                var mapping_lable_to_name = {
                    'l': 'Rating: ',
                    'm': 'Diff: ',
                    'r': 'Rating: '
                };
                var tmp = mapping_lable_to_name[_input_nm[0]] + _input_nm.substring(1);
                return tmp;
            };
            link.append("title")
                .text(function (d) {
                    var src_name = d.source.name, target_name = d.target.name;
                    if (src_name[0] == 'l') {
                        var related_target = src_name.substring(1) - target_name.substring(1);
                        var related_target_name = 'r' + related_target;

                        return nameRemapping(src_name) + " → " + nameRemapping(target_name) + " → " + nameRemapping(related_target_name) +
                            "\n" + format(d.value);
                    }
                    else if (src_name[0] == 'm') {
                        var related_src = src_name.substring(1) + target_name.substring(1);
                        var related_src_name = 'l' + related_src;

                        return nameRemapping(related_src_name) + " → " + nameRemapping(src_name) + " → " + nameRemapping(target_name) +
                            "\n" + format(d.value);
                    }
                    else {
                        alert('Error in the source names!');
                    }
                });

            // add in the nodes
            var node = view_svg_handler
                .append("g").selectAll(".node")
                .data(nodes)
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                })
                .call(d3.behavior.drag()
                    .origin(function (d) {
                        return d;
                    })
                    .on("dragstart", function () {
                        this.parentNode.appendChild(this);
                    })
                    .on("drag", dragmove));

            // add the rectangles for the nodes
            var mid_rect_rate = 1.6;
            node.append("rect")
                .attr("height", function (d) {
                    return d.dy;
                })
                .attr("width", function (d, i) {
                    return sankey.nodeWidth();
                })
                .style("fill", function (d) {
                    // return d.color = color(d.name.replace(/ .*/, ""));
                    // return d.color = color(d.name);
                    return _this.getRectColorByAttrName(d.name);
                })
                .style("stroke", function (d) {
                    return d3.rgb(d.color).darker(2);
                })
                .append("title")
                .text(function (d) {
                    return nameRemapping(d.name) + "\n" + format(d.value);
                });

            //change the shape of middle rectangle
            node.filter(function (d, i) {
                var nm = d.name[0];
                return nm == 'm';
            }).each(function (d, i) {
                d3.select(this)
                    .select('rect')
                    .attr('width', sankey.nodeWidth() * mid_rect_rate)
                // .attr('rx', 6)
                // .attr('ry', 6);
            });


            // // add in the title for the nodes
            // node.append("text")
            //     .attr("x", -6)
            //     .attr("y", function (d) {
            //         return d.dy / 2;
            //     })
            //     .attr("dy", ".35em")
            //     .attr("text-anchor", "end")
            //     .attr("transform", null)
            //     .text(function (d) {
            //         // return d.name;
            //         if(d.name[0] == 'r' || d.name[0] == 'l'){
            //             return 'Rating: ' + d.name.substring(1);
            //         }
            //         else{
            //             return 'Diff: ' + d.name.substring(1);
            //         }
            //     })
            //     .filter(function (d) {
            //         return d.x < width / 2;
            //     })
            //     .attr("x", 6 + sankey.nodeWidth())
            //     .attr("text-anchor", "start")
            //     .filter(function (d) {
            //         var nm = d.name[0];
            //         return nm == 'm';
            //     })
            //     .attr('x', 6 + sankey.nodeWidth() * mid_rect_rate);
            // add in the title for the nodes
            node.append("text")
                .attr("x", 6 + sankey.nodeWidth())
                .attr("y", function (d) {
                    return d.dy / 2;
                })
                .attr("dy", ".35em")
                .attr("text-anchor", "start")
                .attr("transform", null)
                .text(function (d) {
                    // return d.name;
                    if (d.name[0] == 'r' || d.name[0] == 'l') {
                        return 'Rating: ' + d.name.substring(1);
                    }
                    else {
                        return 'Diff: ' + d.name.substring(1);
                    }
                })
                .filter(function (d) {
                    return d.x < width / 2;
                })
                .attr("x", -sankey.nodeWidth() + 4)
                .attr("text-anchor", "end")
                .filter(function (d) {
                    var nm = d.name[0];
                    return nm == 'm';
                })
                .attr("text-anchor", "start")
                .attr('x', 6 + sankey.nodeWidth() * mid_rect_rate);

            // the function for moving the nodes
            function dragmove(d) {
                d3.select(this).attr("transform",
                    "translate(" + d.x + "," + (
                        d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
                    ) + ")");
                sankey.relayout();
                link.attr("d", path);
            }


        }
    },
    created: function () {

    },
    mounted: function () {
        var _this = this;
        _this.initDrawing();
        pipService.onVenueSelectionIsReady(function (selected_glyphs) {
            console.log('selected glyph list: ', selected_glyphs);
            var bs_id1 = selected_glyphs[0]['business_id'], bs_id2 = selected_glyphs[1]['business_id'];
            var bs_nm1 = selected_glyphs[0]['name'], bs_nm2 = selected_glyphs[1]['name'];
            var data_getter_handler = dataService.getCommonCustomerInfoOfTwoVenues(bs_id1, bs_id2);
            data_getter_handler.then(function (resp) {
                console.log('Common Customer Info: ', resp.data);
                var links_list = resp.data.links;
                var nodes_list = resp.data.nodes;

                _this.common_customer_rating_reviews = nodes_list;
                // console.log('_this.common_customer_rating_reviews: ', _this.common_customer_rating_reviews);
                var processed_nodes_links = _this.processNodeList(nodes_list);

                _this.initDrawing();
                _this.drawSankeyDiagram(processed_nodes_links['nodes'], processed_nodes_links['links'], bs_nm1, bs_nm2);
            }, function (error) {
                console.log('Error in getting common customer information!', error);
            });
        });

        //remove
        pipService.onRemoveCommonCustomerCompView(function (msg) {
            _this.initDrawing();
        });
    },
    watch: {},
});