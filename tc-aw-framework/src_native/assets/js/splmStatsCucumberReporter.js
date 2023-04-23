// Copyright (c) 2020 Siemens

/**
 * Reporter to be used with cucumber/selenium 
 *
 * @module js/splmStatsCucumberReporter
 *
 * @publishedApolloService
 *
 */
import eventBus from 'js/eventBus';
import _t from 'js/splmStatsConstants';

/**
 * Reporter to be used with cucumber/selenium
 *
 * @class SPLMStatsCucumberReporter
 */
function SPLMStatsCucumberReporter() {
    var self = this;

    /**
     * @param {Object} obj - Performance object to be fired in event that cucumber java performance_helper.js is listening to
     */
    self.report = function( obj ) {
        eventBus.publish( _t.CUCUMBER_PERFORMANCE_METRICS, obj );
    };

    return self;
}

export default SPLMStatsCucumberReporter;
