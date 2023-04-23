// Copyright (c) 2020 Siemens

/**
 * This module includes the various AngularJS directives that present and control date and/or time entry widgets to the
 * user.
 * <P>
 * Note: We include 'jqueryui' as a parameter to be sure it finished loading before we get here.
 *
 * @module js/uwDirectiveDateTimeService
 */
import app from 'app';
import dateTimeSvc from 'js/dateTimeService';
import localeSvc from 'js/localeService';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import Debug from 'Debug';

// $.datepicker will use this
import 'jqueryui';

var trace = new Debug( 'uwDirectiveDateTimeService' );

var _checked = false;

let exports;

/**
 * Set (if necessary) the locale specific properties of the JQueryUI date picker based on the currently set
 * locale.
 */
export let assureDateTimeLocale = function() {
    if( !_checked ) {
        _checked = true;

        var promise = dateTimeSvc.getJQueryDatePickerTextBundle();

        if( promise ) {
            promise.then( function( jqTextBundle ) {
                if( jqTextBundle ) {
                    $.datepicker.regional[ localeSvc.getLanguageCode() ] = jqTextBundle;
                    $.datepicker.setDefaults( jqTextBundle );
                }
            } );
        }
    }
};

/**
 * Returns a new Date object based on the given Date value and the current format string using JQuery UI
 * <P>
 * Note: This method handles some corner cases found in (at least) the Firefox browser.
 *
 * @param {String} dateString - the date string to be converted to a date object
 * @param {String} format (OPTIONAL) - the date format to be used
 *
 * @return {Date} A new JS Date object based on the given object.
 */
export let parseDate = function( dateString, format ) {
    if( !format ) {
        format = dateTimeSvc.getDateFormat();
    }
    return $.datepicker.parseDate( format, dateString );
};

/**
 * Returns a new Date string value based on the given Date Object and the current format string using JQuery
 * UI
 * <P>
 * Note: This method handles some corner cases found in (at least) the Firefox browser.
 *
 * @param {Object} dateTime - the Date object to be formatted
 * @param {String} format (OPTIONAL) - the date format to be used
 *
 * @return {String} formatted date
 */
export let formatDate = function( dateTime, format ) {
    if( !format ) {
        format = dateTimeSvc.getDateFormat();
    }
    return $.datepicker.formatDate( format, dateTime );
};

/**
 * get date  in milliseconds
 *
 * @param {Object} queryVal value
 *
 * @return {Date} - in milliseconds
 */
export let convertDateToMsec = function( queryVal ) {
    if( typeof queryVal !== 'number' ) {
        try {
            queryVal = new Date( queryVal ).getTime();
        } catch ( e ) {
            trace( 'Invalid Date format', e );
        }
    }
    return queryVal > 0 ? queryVal : Infinity;
};

exports = {
    assureDateTimeLocale,
    parseDate,
    formatDate,
    convertDateToMsec
};
export default exports;

/**
 * Setup to listen to changes in locale.
 *
 * @param {Object} localeInfo - Updated locale info
 *
 * @return {Void}
 */
eventBus.subscribe( 'dateTime.changed', function( localeInfo ) { // eslint-disable-line no-unused-vars
    _checked = false;

    exports.assureDateTimeLocale();
}, 'uwDirectiveDateTimeService' );

app.factory( 'uwDirectiveDateTimeService', () => exports );
