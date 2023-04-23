import _ from 'lodash';

/**
 * This module provides chart supporting utilities
 *
 * @module js/chartUtils
 */

/**
 * Filter the Chart Options to secure from prototype pollution attacks
 *
 * @method filterChartOptions
 *
 * @param {Object} chartOptions - Chart config options
 * @returns {Object} filtered or sanitized chart options
 */
export const filterChartOptions = chartOptions => {
    return _.pickBy( chartOptions, ( value, key ) => {
        if( Object.hasOwnProperty( chartOptions, key ) && ( key === '__proto__' || key === 'constructor' ) ) {
            return false;
        }
        return true;
    } );
};

const exports = {
    filterChartOptions
};
export default exports;
