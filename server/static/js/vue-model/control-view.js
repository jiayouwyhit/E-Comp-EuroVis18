/**
 * Created by yiding on 2016/12/30.
 */

// import vueSlider from '../lib/vuejs-slider.min.js'

var controlModel = new Vue({
    el: '#control-view',
    delimiters: ["{{", "}}"],
    // components: {
    //     vueSlider
    // },
    data: {
        features: [
            {name: "LinkDistance", 'type': 'range', 'value': 50, 'min': 1, 'max': 500, 'step': 1},
            {name: "Charge", 'type': 'range', 'value': 36, 'min': 1, 'max': 800, 'step': 1},
            {name: "Gravity", 'type': 'range', 'value': 0.12, 'min': 0, 'max': 1, 'step': 0.001}
        ],
        cities: ['Tempe', 'Las Vegas', 'Phoenix', 'Toronto'],
        city_selection_focus: {'Tempe': [33.4230242165, -111.940247586], 'Las Vegas': [36.2162287, -115.2446964]},
        selected_city: 'Tempe',
        types: ['All', 'Restaurants', 'Shopping', 'Transportation', 'Entertainment', 'Hotel', 'Health', 'Services',
            'Education', 'Pets', 'Media', 'Religious', 'Parks', 'Null'],
        selected_type: 'All',
        layout_options: ['Stacked', 'Layered'],
        selected_temporal_layout: 'Stacked',

        time_unit_options: ['Quarter', 'Month'],
        selected_time_unit: 'Quarter',

        text_feature_options: ['food', 'service', 'price', 'ambiance'], //'ambiance' -> 'place'
        selected_text_feature: 'food',

        area_selection: false,
        area_selection_flag: false, //since some posts say that event response and value change may not happen simultaneously
        area_selection_button_mode: false, //false: you can brush a region to select now; true: you can re-load all the red circles now
        area_selection_button_text: 'Submit Selection', // or 'Reload Dataset'

        //sliders
        price_slider: {'max': 5, 'min': 1, 'cur_min': 1, 'cur_max': 5},
        customer_slider: {'max': 9999, 'min': 1, 'cur_min': 1, 'cur_max': 9999},
        rating_slider: {'max': 5, 'min': 1, 'cur_min': 1, 'cur_max': 5},
        link_slider: {'max': 9999, 'min': 1, 'cur_min': 1, 'cur_max': 9999},

        //search and selection
        search_words: '',
        venue_list_for_table: [],
        table_size: 14,
        cur_table_attr: ['Name', '#Rev', 'Star', 'Type'], //price
        cur_table_venues: [],

        //for pagination
        pagination_max_page: undefined,
        pagination_active_page: undefined,
        pagination_arr: [],

    },
    methods: {
        onSelectedTextFeatureChanged: function () {
            console.log('selected text feature is changed!', this.selected_text_feature);
            var tmp = this.selected_text_feature;
            if (tmp == 'ambiance') {
                tmp = 'place';
            }

            pipService.emitTextFeatureIsChanged(tmp);
        },
        onAreaSelectionChange: function () {
            console.log('area_selection_flag is changed! ', this.area_selection);
            this.area_selection_flag = !this.area_selection_flag;
            pipService.emitStartAreaSelection(this.area_selection_flag);
        },
        onSubmitSelectionArea: function () {
            console.log('onSubmitSelectionArea!');
            this.area_selection_button_mode = !this.area_selection_button_mode;
            if (this.area_selection_button_mode) {
                this.area_selection_button_text = 'Reload Dataset';
                pipService.emitSubmitSelectionArea('submit selection area!');
            }
            else {
                this.area_selection_button_text = 'Submit Selection';
                this.onCityOrTypeChanged();
            }
        },
        onClearSelectionArea: function () {
            console.log('onClearSelectionArea!');
            pipService.emitClearSelectionArea('clear selection area!');
        },
        formatCityAndTypeAndFocus: function () {
            console.log('formatCityAndTypeAndFocus!');
            var city = this.selected_city;
            var focus = this.city_selection_focus[city];
            var type = this.selected_type.charAt(0).toLowerCase() + this.selected_type.substr(1);

            city = city.split(' ');
            for (var i = 0; i < city.length; i++) {
                city[i] = city[i].charAt(0).toLowerCase() + city[i].substr(1);
            }
            var city_str = city.join('_');

            return {'city': city_str, 'type': type, 'focus': focus};
        },
        onCityOrTypeChanged: function () {
            console.log('city or type is changed!');
            var query_params = this.formatCityAndTypeAndFocus();
            console.log('query_params: ', query_params);

            pipService.emitCityOrTypeIsChanged(query_params);
        },
        onConfirmSliderFiltering: function () {
            console.log('confirm filtering!');
            var slider = [this.price_slider, this.customer_slider, this.rating_slider, this.link_slider];
            pipService.emitConfirmFilteringResult(slider);
        },
        onLayoutChanged: function () {
            var layout = this.selected_temporal_layout;
            pipService.emitTemporalViewLayoutIsChanged(layout);
        },
        startSearchEntities: function () {

        },
        resetSearch: function () {


        },

        sortingVenues: function (a, b) {
            if (a['review_count'] > b['review_count']) {
                return -1;
            }
            else if (a['review_count'] < b['review_count']) {
                return 1;
            }
            else {
                if (a['stars'] > b['stars']) {
                    return -1;
                }
                else if (a['stars'] < b['stars']) {
                    return 1;
                }
                else {
                    return 0;
                }
            }
        },

        calPaginationParams: function (clicked_page) {
            //calculate a temp array first
            var tmp = [];
            if (isNaN(clicked_page)) { //not a number
                if (clicked_page == 'First') {
                    this.pagination_active_page = 1;
                }
                else if (clicked_page == 'Previous') {
                    this.pagination_active_page--;
                }
                else if (clicked_page == 'Next') {
                    this.pagination_active_page++;
                }
                else if (clicked_page == 'Last') {
                    this.pagination_active_page = this.pagination_max_page;
                }
            }
            else {
                this.pagination_active_page = clicked_page;
            }

            var min_num = Math.min(this.pagination_max_page, 5);
            if (this.pagination_active_page <= min_num) {
                for (var i = 1; i <= min_num; i++) {
                    var item = {'pg': i, 'isActive': false, 'isDisabled': false};
                    tmp.push(item);
                }
            }
            else if (this.pagination_active_page > this.pagination_max_page - min_num) {
                for (var i = this.pagination_active_page - min_num + 1; i <= this.pagination_max_page; i++) {
                    var item = {'pg': i, 'isActive': false, 'isDisabled': false};
                    tmp.push(item);
                }
            }
            else {
                for (var i = this.pagination_active_page - 2; i <= this.pagination_active_page + 2; i++) {
                    var item = {'pg': i, 'isActive': false, 'isDisabled': false};
                    tmp.push(item);
                }
            }
            for (var i = 0; i < tmp.length; i++) {
                if (tmp[i]['pg'] == this.pagination_active_page) {
                    tmp[i]['isActive'] = true;
                }
            }

            //insert other labels
            tmp.unshift({
                'pg': 'Previous',
                'isActive': false,
                'isDisabled': false
            });
            tmp.unshift({'pg': 'First', 'isActive': false, 'isDisabled': false});
            tmp.push({'pg': 'Next', 'isActive': false, 'isDisabled': false});
            tmp.push({'pg': 'Last', 'isActive': false, 'isDisabled': false});

            if (this.pagination_active_page == 1) {
                tmp[0]['isDisabled'] = true;
                tmp[1]['isDisabled'] = true;
            }

            if (this.pagination_active_page == this.pagination_max_page) {
                var pg_len = tmp.length;
                tmp[pg_len - 1]['isDisabled'] = true;
                tmp[pg_len - 2]['isDisabled'] = true;
            }

            return tmp;
        },
        clickPagination: function (clicked_pg_info) {
            var pg = clicked_pg_info['pg'];
            this.pagination_arr = this.calPaginationParams(pg);

            //update table values
            var pg_id = this.pagination_active_page - 1;
            this.cur_table_venues = this.venue_list_for_table.slice(pg_id * this.table_size, (pg_id + 1) * this.table_size);
            for (var i = 0; i < this.cur_table_venues.length; i++) {
                this.cur_table_venues[i]['selection_flag'] = false;
                this.cur_table_venues[i]['css3_business_id'] = 'css3_selector_' + this.cur_table_venues[i]['business_id'];
            }

        },
    },
    watch: {
        features: {
            handler: function (newValues, oldValues) {
                let changedValues = [];
                for (var i = 0, ilen = newValues.length; i < ilen; i++) {
                    if (newValues[i]['value'] != oldValues[i]['value']) {
                        changedValues[i] = {'name': newValues[i]['name'], 'value': newValues[i]['value']};
                    } else {
                        changedValues[i] = {'name': oldValues[i]['name'], 'value': oldValues[i]['value']};
                    }
                }

                console.log('Features are changed! Begin to emit change attributes!');
                pipService.emitChangeAttributes(changedValues);
                console.log('control view: features are changed! ', this.features);
            },
            deep: true
        },
        'price_slider.cur_max': {
            handler: function (new_value, old_value) {
                console.log('price_slider["cur_max"]: ', new_value);
                var slider = [this.price_slider, this.customer_slider, this.rating_slider, this.link_slider];
                pipService.emitFilteringSliderIsChanged(slider);
            },
            deep: true
        },
        'customer_slider.cur_min': {
            handler: function (new_value, old_value) {
                console.log('customer_slider["cur_min"]: ', new_value);
                var slider = [this.price_slider, this.customer_slider, this.rating_slider, this.link_slider];
                pipService.emitFilteringSliderIsChanged(slider);
            },
            deep: true
        },
        'rating_slider.cur_min': {
            handler: function (new_value, old_value) {
                console.log('rating_slider["cur_min"]: ', new_value);
                var slider = [this.price_slider, this.customer_slider, this.rating_slider, this.link_slider];
                pipService.emitFilteringSliderIsChanged(slider);
            },
            deep: true
        },
        'link_slider.cur_min': {
            handler: function (new_value, old_value) {
                console.log('link_slider["cur_min"]: ', new_value);
                var slider = [this.price_slider, this.customer_slider, this.rating_slider, this.link_slider];
                pipService.emitFilteringSliderIsChanged(slider);
            },
            deep: true
        },
    },
    created: function () {
        // var _this = this;
        // console.log('!!!!!!!emitChangeForceLayoutConfig -----');
        // pipService.emitChangeForceLayoutConfig(this.features);
    },
    mounted: function () {
        var _this = this;
        //for sliders
        pipService.onBusinessDataIsReady(function (msg) {
            //update table
            _this.venue_list_for_table = dataService.business_of_one_city_type;
            _this.venue_list_for_table.sort(_this.sortingVenues); //sorting
            _this.cur_table_venues = _this.venue_list_for_table.slice(0, _this.table_size);
            for (var i = 0; i < _this.cur_table_venues.length; i++) {
                _this.cur_table_venues[i]['selection_flag'] = false;
                _this.cur_table_venues[i]['css3_business_id'] = 'css3_selector_' + _this.cur_table_venues[i]['business_id'];
            }

            //paginations
            _this.pagination_max_page = parseInt(_this.venue_list_for_table.length / _this.table_size) + 1;
            _this.pagination_arr = _this.calPaginationParams(1);


            var customers = dataService.business_of_one_city_type.map(function (item) {
                return item['review_count'];
            });
            var ratings = dataService.business_of_one_city_type.map(function (item) {
                return item['stars'];
            });
            var price = dataService.business_of_one_city_type.map(function (item) { //待修改
                if (item['price_range'] == null || isNaN(item['price_range']) == true) { //not number
                    return 1;
                }
                else { //number
                    return item['price_range'];
                }
            });

            _this.customer_slider.max = Math.max.apply(null, customers);
            _this.customer_slider.min = Math.min.apply(null, customers);
            _this.customer_slider.cur_max = _this.customer_slider.max;
            _this.customer_slider.cur_min = _this.customer_slider.min;

            _this.rating_slider.max = Math.max.apply(null, ratings);
            _this.rating_slider.min = Math.min.apply(null, ratings);
            _this.rating_slider.cur_max = _this.rating_slider.max;
            _this.rating_slider.cur_min = _this.rating_slider.min;

            _this.price_slider.max = Math.max.apply(null, price); //待修改
            _this.price_slider.min = Math.min.apply(null, price);
            _this.price_slider.cur_max = _this.price_slider.max;
            _this.price_slider.cur_min = _this.price_slider.min;

            console.log('=================this.customer_slider, this.rating_slider: =========== ', _this.customer_slider, _this.rating_slider);
        });

        pipService.onBusinessAndLinksOfSelectedRegionIsReady(function (msg) {
            //update table
            console.log('selected local data: ', msg);
            _this.venue_list_for_table = msg.nodes;
            _this.venue_list_for_table.sort(_this.sortingVenues); //sorting

            _this.cur_table_venues = _this.venue_list_for_table.slice(0, _this.table_size);
            for (var i = 0; i < _this.cur_table_venues.length; i++) {
                _this.cur_table_venues[i]['selection_flag'] = false;
                _this.cur_table_venues[i]['css3_business_id'] = 'css3_selector_' + _this.cur_table_venues[i]['business_id'];
            }

            //paginations
            _this.pagination_max_page = parseInt(_this.venue_list_for_table.length / _this.table_size) + 1;
            _this.pagination_arr = _this.calPaginationParams(1);

            var links = msg.links.map(function (item) {
                if (item['weight'] == null || isNaN(item['weight']) == true) { //not number
                    return 0;
                }
                else { //number
                    return item['weight'];
                }
            });
            var customers = msg.nodes.map(function (item) {
                return item['review_count'];
            });
            var ratings = msg.nodes.map(function (item) {
                return item['stars'];
            });
            var price = msg.nodes.map(function (item) {
                if (item['price_range'] == null || isNaN(item['price_range']) == true) { //not number
                    return 1;
                }
                else { //number
                    return item['price_range'];
                }
            });

            _this.link_slider.max = Math.max.apply(null, links);
            _this.link_slider.min = Math.min.apply(null, links);
            _this.link_slider.cur_max = _this.link_slider.max;
            _this.link_slider.cur_min = _this.link_slider.min;

            _this.customer_slider.max = Math.max.apply(null, customers);
            _this.customer_slider.min = Math.min.apply(null, customers);
            _this.customer_slider.cur_max = _this.customer_slider.max;
            _this.customer_slider.cur_min = _this.customer_slider.min;

            _this.rating_slider.max = Math.max.apply(null, ratings);
            _this.rating_slider.min = Math.min.apply(null, ratings);
            _this.rating_slider.cur_max = _this.rating_slider.max;
            _this.rating_slider.cur_min = _this.rating_slider.min;

            _this.price_slider.max = Math.max.apply(null, price);
            _this.price_slider.min = Math.min.apply(null, price);
            _this.price_slider.cur_max = _this.price_slider.max;
            _this.price_slider.cur_min = _this.price_slider.min;

            console.log('Data of selected region is ready; Finish Update slider value! ======', _this.price_slider.max, _this.customer_slider.min,
                _this.rating_slider.min, _this.link_slider.min);
            console.log('price:===== ', price);
            console.log('corresponding nodes: ', msg.nodes);

        });

        //when two venues are selected
        pipService.onVenueSelectionIsReady(function (selected_two_venues) {
            console.log('=========selected: ', selected_two_venues);
            console.log('=========Before using it ==========', _this.cur_table_venues);
            for (var i = 0; i < _this.cur_table_venues.length; i++) {
                var cur_id = _this.cur_table_venues[i]['business_id'];
                if (cur_id == selected_two_venues[0]['business_id'] || cur_id == selected_two_venues[1]['business_id']) {
                    _this.$set(_this.cur_table_venues[i], 'selection_flag', true); //结果都没有更新table中的绑定的数据
                    // _this.cur_table_venues[i]['selection_flag'] = true;
                    console.log('_this.cur_table_venues[i]: ', _this.cur_table_venues[i]);
                    _this.$forceUpdate();

                    Vue.nextTick(function () {
                        console.log('===========================DOM 更新了====================');
                        console.log(_this.cur_table_venues);
                        console.log('===========================DOM 更新了====================');
                    });

                    // d3.select(_this.$el).select('tr#css3_selector_' + _this.cur_table_venues[i]['business_id']).classed('selected_table_row', true);
                }
                else {
                    _this.$set(_this.cur_table_venues[i], 'selection_flag', false); //结果都没有更新table中的绑定的数据
                    // _this.cur_table_venues[i]['selection_flag'] = false;
                    console.log('_this.cur_table_venues[i]: ', _this.cur_table_venues[i]);


                    // console.log('business false: ', _this.cur_table_venues[i]);
                    // d3.select(_this.$el).select('tr#css3_selector_' + _this.cur_table_venues[i]['business_id']).classed('selected_table_row', false);
                }
            }

            console.log('=========Finished checking it ==========', _this.cur_table_venues);
        });

        //when  < 2 venues are selected
        pipService.onRemoveCommonCustomerCompView(function (venue_list) {
            for (var i = 0; i < _this.cur_table_venues.length; i++) {
                var cur_id = _this.cur_table_venues[i]['business_id'];
                var flag = true && (venue_list.length >= 1);
                for (var j = 0; j < venue_list.length; j++) {
                    flag = flag && (cur_id == venue_list[j]['business_id']);
                }

                if (flag) {
                    _this.$set(_this.cur_table_venues[i], 'selection_flag', true); //结果都没有更新table中的绑定的数据
                    // _this.cur_table_venues[i]['selection_flag'] = true;
                    console.log('_this.cur_table_venues[i]: ', _this.cur_table_venues[i]);

                    _this.$forceUpdate();


                    // d3.select(_this.$el).select('tr#css3_selector_' + _this.cur_table_venues[i]['business_id']).classed('selected_table_row', true);
                }
                else {
                    _this.$set(_this.cur_table_venues[i], 'selection_flag', false); //结果都没有更新table中的绑定的数据
                    // _this.cur_table_venues[i]['selection_flag'] = false;
                    console.log('_this.cur_table_venues[i]: ', _this.cur_table_venues[i]);

                    // console.log('business false: ', _this.cur_table_venues[i]);
                    // d3.select(_this.$el).select('tr#css3_selector_' + _this.cur_table_venues[i]['business_id']).classed('selected_table_row', false);
                }
            }

        });
    }
});
