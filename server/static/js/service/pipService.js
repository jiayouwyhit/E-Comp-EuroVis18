/**
 * Created by yiding on 2016/12/31.
 */
var pipService = new Vue({
    data: {
        GREETING: 'greeting',
        GRAPHREADY: 'graphready',
        CHANGE_FORCE_LAYOUT_CONFIG: 'changeForceLayoutConfig',
        BUSINESS_DATA_OF_ONE_CITY_READY: 'business_data_of_one_city_is_ready',
        SOCIAL_NETWORK_OF_BUSINESS_VENUE_IS_READY: 'social_network_of_business_venue_is_ready',
        START_AREA_SELECTION_ON_MAP: 'start_area_selection_on_map',
        SUBMIT_SELECTION_AREA_IS_READY: 'submit_selection_area_is_ready',
        CLEAR_SUBMIT_SELECTION_AREA_IS_READY: 'clear_submit_selection_area_is_ready',
        BUSINESS_AND_LINKS_OF_SELECTED_REGION_IS_READY: 'business_and_links_of_selected_region_is_ready',
        CITY_OR_TYPE_IS_CHANGED: 'city_or_type_is_changed',
        FILTERING_SLIDER_IS_CHANGED: 'filtering_slider_is_changed',
        CONFIRM_FILTERING_RESULT_IS_READY: 'confirm_filtering_result',
        VENUE_SELECTION_LIST_IS_READY: 'venue_selection_list_is_ready',
        REMOVE_COMMON_CUSTOMER_VIEW: 'remove_common_customer_view',
        TEMPORAL_VIEW_LAYOUT_IS_CHANGED: 'temporal_view_layout_is_changed',
        UPDATE_WORD_CLOUD_VIEW_DATA: 'update_word_cloud_view_data',
        LOAD_DETAILED_REVIEW_CONTENT: 'load_detailed_review_content',
        GROUPED_WORD_PAIRS_ARE_READY: 'grouped_word_pairs_are_ready',
        TEXT_FEATURE_IS_CHANGED: 'text_feature_is_changed',
    },
    methods: {
        emitChangeAttributes: function (msg) {
            this.$emit(this.GREETING, msg);
        },
        onChangeAttributes: function (callback) {
            this.$on(this.GREETING, function (msg) {
                callback(msg);
            });
        },

        emitGraphDataReady: function (msg) {
            this.$emit(this.GRAPHREADY, msg);
        },
        onGraphDataReady: function (callback) {
            this.$on(this.GRAPHREADY, function (msg) {
                callback(msg);
            });
        },

        emitBusinessDataIsReady: function (msg) {
            this.$emit(this.BUSINESS_DATA_OF_ONE_CITY_READY, msg);
        },
        onBusinessDataIsReady: function (callback) {
            this.$on(this.BUSINESS_DATA_OF_ONE_CITY_READY, function (msg) {
                callback(msg);
            });
        },

        emitChangeForceLayoutConfig: function (msg) {
            this.$emit(this.CHANGE_FORCE_LAYOUT_CONFIG, msg);
        },
        onForceLayoutConfigIsReady: function (callback) {
            this.$on(this.CHANGE_FORCE_LAYOUT_CONFIG, function (msg) {
                callback(msg);
            });
        },

        emitSocialNetworkOfBusinessVenueIsReady: function (msg) {
            this.$emit(this.SOCIAL_NETWORK_OF_BUSINESS_VENUE_IS_READY, msg);
        },
        onSocialNetworkOfBusinessVenueIsReady: function (callback) {
            this.$on(this.SOCIAL_NETWORK_OF_BUSINESS_VENUE_IS_READY, function (msg) {
                callback(msg);
            });
        },

        emitStartAreaSelection: function (msg) {
            this.$emit(this.START_AREA_SELECTION_ON_MAP, msg);
        },
        onStartAreaSelection: function (callback) {
            this.$on(this.START_AREA_SELECTION_ON_MAP, function (msg) {
                callback(msg);
            });
        },

        emitSubmitSelectionArea: function (msg) {
            this.$emit(this.SUBMIT_SELECTION_AREA_IS_READY, msg);
        },
        onSubmitSelectionArea: function (callback) {
            this.$on(this.SUBMIT_SELECTION_AREA_IS_READY, function (msg) {
                callback(msg);
            });
        },

        emitClearSelectionArea: function (msg) {
            this.$emit(this.CLEAR_SUBMIT_SELECTION_AREA_IS_READY, msg);
        },
        onClearSelectionArea: function (callback) {
            this.$on(this.CLEAR_SUBMIT_SELECTION_AREA_IS_READY, function (msg) {
                callback(msg);
            });
        },

        emitBusinessAndLinksOfSelectedRegionIsReady: function (msg) {
            this.$emit(this.BUSINESS_AND_LINKS_OF_SELECTED_REGION_IS_READY, msg);
        },
        onBusinessAndLinksOfSelectedRegionIsReady: function (callback) {
            this.$on(this.BUSINESS_AND_LINKS_OF_SELECTED_REGION_IS_READY, function (msg) {
                callback(msg);
            });
        },

        emitCityOrTypeIsChanged: function (msg) {
            this.$emit(this.CITY_OR_TYPE_IS_CHANGED, msg);
        },
        onCityOrTypeIsChanged: function (callback) {
            this.$on(this.CITY_OR_TYPE_IS_CHANGED, function (msg) {
                callback(msg);
            });
        },

        emitFilteringSliderIsChanged: function (msg) {
            this.$emit(this.FILTERING_SLIDER_IS_CHANGED, msg);
        },
        onFilteringSliderIsChanged: function (callback) {
            this.$on(this.FILTERING_SLIDER_IS_CHANGED, function (msg) {
                callback(msg);
            });
        },

        emitConfirmFilteringResult: function (msg) {
            this.$emit(this.CONFIRM_FILTERING_RESULT_IS_READY, msg);
        },
        onConfirmFilteringResult: function (callback) {
            this.$on(this.CONFIRM_FILTERING_RESULT_IS_READY, function (msg) {
                callback(msg);
            });
        },


        emitVenueSelectionIsReady: function (msg) {
            this.$emit(this.VENUE_SELECTION_LIST_IS_READY, msg);
        },
        onVenueSelectionIsReady: function (callback) {
            this.$on(this.VENUE_SELECTION_LIST_IS_READY, function (msg) {
                callback(msg);
            });
        },

        emitRemoveCommonCustomerCompView: function (msg) {
            this.$emit(this.REMOVE_COMMON_CUSTOMER_VIEW, msg);
        },
        onRemoveCommonCustomerCompView: function (callback) {
            this.$on(this.REMOVE_COMMON_CUSTOMER_VIEW, function (msg) {
                callback(msg);
            });
        },

        emitTemporalViewLayoutIsChanged: function (msg) {
            this.$emit(this.TEMPORAL_VIEW_LAYOUT_IS_CHANGED, msg);
        },
        onTemporalViewLayoutIsChanged: function (callback) {
            this.$on(this.TEMPORAL_VIEW_LAYOUT_IS_CHANGED, function (msg) {
                callback(msg);
            });
        },

        emitUpdateWordCloudViewData: function (msg) {
            this.$emit(this.UPDATE_WORD_CLOUD_VIEW_DATA, msg);
        },
        onUpdateWordCloudViewData: function (callback) {
            this.$on(this.UPDATE_WORD_CLOUD_VIEW_DATA, function (msg) {
                callback(msg);
            });
        },


        emitLoadDetailedReviewContent: function (msg) {
            this.$emit(this.LOAD_DETAILED_REVIEW_CONTENT, msg);
        },
        onLoadDetailedReviewContent: function (callback) {
            this.$on(this.LOAD_DETAILED_REVIEW_CONTENT, function (msg) {
                callback(msg);
            });
        },

        emitGroupedWordPairsAreReady: function (msg) {
            this.$emit(this.GROUPED_WORD_PAIRS_ARE_READY, msg);
        },
        onGroupedWordPairsAreReady: function (callback) {
            this.$on(this.GROUPED_WORD_PAIRS_ARE_READY, function (msg) {
                callback(msg);
            });
        },


        emitTextFeatureIsChanged: function (msg) {
            this.$emit(this.TEXT_FEATURE_IS_CHANGED, msg);
        },
        onTextFeatureIsChanged: function (callback) {
            this.$on(this.TEXT_FEATURE_IS_CHANGED, function (msg) {
                callback(msg);
            });
        },

    }
})