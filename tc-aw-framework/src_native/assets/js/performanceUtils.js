// Copyright (c) 2019 Siemens
/* global
 define
 */
/**
 * This module provides functions for performance event.
 *
 * @module js/performanceUtils
 */

//
'use strict';

var exports = {};

/**
 * Constructor
 */
var PerformanceTimer = function() {
    var self = this;
    /**
     * start timer, the date since midnight, Jan 1, 1970.
     */
    this.start = new Date();

    /**
     * performance duration
     */
    this.duration = 0;

    /**
     * Mark the time here as the end time for an activity. Using the start time,
     * calculate the duration.<br/> Send this information to the browser console and
     * also to Cucumber.
     *
     * @param descriptionStr The string describing the activity being timed.
     * @param eventName The name of the custom event to send to Cucumber and possibly the browser console.
     */
    this.endAndLogTimer = function( descriptionStr, eventName ) {
        var currentDate = new Date();
        self.duration = currentDate.getTime() - self.start.getTime();

        // Convert a Date to an <a href="https://www.w3.org/TR/NOTE-datetime">ISO 8601</a> date format string -
        // "yyyy-MM-dd'T'HH:mm:ss.SSSZ". Consistent values as compared to those returned for SOA network operations in Cucumber.
        var startTimeValStr = self.start.toISOString();
        var durationValStr = ( self.duration / 1000.0 ).toString();

        var componentStr = 'GCF';
        var startTimeStr = 'startedDateTime';
        var durationStr = 'time';

        var descStr = descriptionStr.replace( new RegExp( ' ', 'gm' ), '_' );
        var startTimeKeyStr = componentStr + '.' + eventName + '.' + startTimeStr + '.' +
            descStr.concat( '_Start_Time' );
        var durationKeyStr = componentStr + '.' + eventName + '.' + durationStr + '.' +
            descStr.concat( '_Duration' );

        logTimeInWebConsole( 'Capture event: ' + eventName + '. Details: start=' + startTimeValStr + ', duration=' +
            durationValStr + 's' );
        logTimeInCucumber( eventName, startTimeKeyStr, startTimeValStr, durationKeyStr, durationValStr );
    };
};

/**
 * Send info to the Console.
 *
 * @param str The string to display in the browser console.
 */
var logTimeInWebConsole = function( str ) {
    console.log( str );
};

/**
 * Log timing info to Cucumber. This info takes the form of two key/value pairs - a start time and duration,
 * which and are sent to Cucumber via a custom event. Both key and value are strings.<br/> <br/> The keys are
 * described by WWW.XXX.YYY.ZZZ, where WWW should be a three letter designation for the component from which the
 * data originates, for example, GCF for Graphing Component Framework. XXX is the specific function of interest
 * from which information is being gathered. YYY is the designation for the information being sent, for example
 * 'startedDateTime' for the start time, and 'time' for the duration (these follow the naming convention found
 * in the HAR file format). ZZZ is the display string that will be used in any presentation of the data
 * elsewhere - use underscore '_' to represent spaces in that string.<br/> <br/> Start time values must follow
 * the <a href="https://www.w3.org/TR/NOTE-datetime">ISO 8601</a> date format "yyyy-MM-dd'T'HH:mm:ss.SSSZ".
 * This format is in US local and UTC/Zulu timezone, which is compatible with the native browser/JavaScript
 * Date() object.<br/> <br/> The value string for the duration time must be as a floating point
 * "seconds.milliseconds". The name of the event handler specified in the Cucumber step, "When I start monitor
 * graph for events:...", must match the name given for the custom event dispatched here.
 *
 * @param eventName The name of the custom event
 * @param startTimeKeyStr The key for the start time
 * @param startTimeValStr The value for the start time in ISO 8601 format.
 * @param durationKeyStr The key for the duration
 * @param durationValStr The value for the duration in "seconds.milliseconds".
 */
var logTimeInCucumber = function( eventName, startTimeKeyStr, startTimeValStr, durationKeyStr, durationValStr ) {
    var detailData = {};
    detailData[ startTimeKeyStr ] = startTimeValStr;
    detailData[ durationKeyStr ] = durationValStr;

    // On IE11, While a window.CustomEvent object exists, it cannot be called as a constructor. Instead of new CustomEvent(...),
    // you must use document.createEvent('CustomEvent') and then e.initCustomEvent(...)
    var event;
    if( CustomEvent instanceof Function ) {
        event = new CustomEvent( eventName, {
            detail: detailData
        } );
    } else {
        event = document.createEvent( 'CustomEvent' );
        event.initCustomEvent( eventName, true, true, detailData );
    }

    if( event ) {
        document.dispatchEvent( event );
    }
};

export let createTimer = function() {
    return new PerformanceTimer();
};

export default exports = {
    createTimer
};
