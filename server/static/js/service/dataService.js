/**
 * Created by yiding on 2017/1/1.
 */
var dataService = new Vue({
    data: {
        graphData: null,
        business_of_one_city_type: null
    },
    methods: {
        getGraphDataFromBackend: function () {
            this.$http.get('/getGraph', []).then(function (response) {
                this.graphData = JSON.parse(response.data);
                pipService.emitGraphDataReady()
            }, function (response) {
                console.log('error raised');
            });
        },
        getGraphData: function () {
            if (this.graphData != null) {
                return this.graphData;
            } else {
                return null;
            }
        },
        getVenueInfoOfOneCityAndType: function (city, type) {
            var url = '/api/get_business_information_city/' + city;
            if(type != 'all'){
                url = '/api/get_business_information_city_type/' + city + '/' + type;
            }

            this.$http.get(url).then(function (response) {
                this.business_of_one_city_type = response.data;
                pipService.emitBusinessDataIsReady(this.business_of_one_city_type);
            }, function (error) {
                console.log('error exist: ', error);
            });
        },
        getSocialNetworkOfTwoBusiness: function (business1, business2) {
            var url = '/api/get_social_graph_of_two_business/' + business1 + '/' + business2;
            // var url = '/api/get_social_graph_common/' + business1 + '/' + business2;
            this.$http.get(url).then(function (resp) {
                console.log('Two business: ', resp.data);
                pipService.emitSocialNetworkOfBusinessVenueIsReady(resp.data);
            }, function (error) {
                console.log('Error in getSocialNetworkOfTwoBusiness', error);
            });

        },
        getBusinessAndLinksOfSelectedRegion: function (city, type, p_start, p_end) {
            var url = '/api/get_business_graph_box/' + city + '/' + type + '/' + p_start.lng + '/' + p_start.lat + '/'
                + p_end.lng + '/' + p_end.lat;
            if(type == 'all'){ //待修改, depends on API
                url = '/api/get_business_graph_box/' + p_start.lng + '/' + p_start.lat + '/'
                + p_end.lng + '/' + p_end.lat;
            }

            console.log('query url: ', url);
            this.$http.get(url).then(function (resp) {
                console.log('responded data: ', resp.data);
                pipService.emitBusinessAndLinksOfSelectedRegionIsReady(resp.data);
            }, function (error) {
                console.log('Error in loading business of selected region!', error);
            });
        },
        getCommonCustomerInfoOfTwoVenues: function (bs_id1, bs_id2) {
            var url = '/api/get_social_graph_common/' + bs_id1 + '/' + bs_id2;
            return this.$http.get(url);
        },
        getReviewRatingTemporalInfo: function (bs_id1, bs_id2) {
            var url = '/api/get_review_information/' + bs_id1 + '/' + bs_id2;
            return this.$http.get(url);
        },

        getDetailedContentOfOneReview: function (_review_id) {
            var url = '/api/get_review_by_id/' + _review_id;

            this.$http.get(url).then(function (resp) {
                console.log('Content of one review: ', resp.data);
                var one_review_content = resp.data;
                pipService.emitLoadDetailedReviewContent(one_review_content);
            }, function (error) {
                console.log('Error existing in loading detailed content of one review!', error);
            });
        },

        getGroupedWordPairsFromReviewList: function (_review_id_list) {
            var str = '';
            str += '[';
            for(var i = 0; i < _review_id_list.length; i++){
                str = str + "'" + _review_id_list[i] + "'" + ",";
            }
            str[str.length - 1] = ''; //remove the last comma
            str += ']';

            var url = '/api/nlp/review_analysis/' + str;
            this.$http.get(url).then(function (resp) {
                var word_pairs_list = resp.data;
                console.log('Content of the word pairs: ', word_pairs_list);
                pipService.emitGroupedWordPairsAreReady(word_pairs_list);
            }, function (error) {
                console.log('Error in getting word pairs information: ', error);
            });
        }

    },
    created: function () {
        // this.getGraphDataFromBackend();
        // this.getVenueInfoOfOneCity('Tempe');
    },
    watch: {
        graphData: {
            handler: function () {
                console.log('Graph data has been updated');
            },
            deep: true
        }
    }
})