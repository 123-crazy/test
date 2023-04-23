// Copyright (c) 2020 Siemens

/**
 * Reporter for Mobile Devices
 *
 * @module js/splmStatsMobileReporter
 *
 * @publishedApolloService
 *
 */
import _ from 'lodash';
import AwInjectorService from 'js/awInjectorService';
import 'js/aw-message-params.directive';

/**
 * Instances of this class represent a reporter for Mobile Devices
 *
 * @class SPLMStatsMobileReporter
 */
function SPLMStatsMobileReporter() {
    var self = this;

    self.report = function( obj ) {
        var failedRequests = obj.XHR.errorInfo.requestsAborted.concat( obj.XHR.errorInfo.requestsErrored ).concat( obj.XHR.errorInfo.requestsTimeout );
        var injector = AwInjectorService.instance;
        var _inj = _.debounce( function() {
            injector.invoke( [ 'messagingService', function( messagingService ) {
                var objStr = 'Performance Metrics:';
                objStr += '\nTTI: ' + obj.TTI.toFixed( 3 ) + 'ms';
                objStr += '\nTotal Network Time: ' + obj.totalNetworkTime.toFixed( 3 ) + 'ms';
                objStr += '\nXHR Request Count: ' + obj.XHR.details.length;
                objStr += '\nFailed XHR Count: ' + failedRequests.length;
                objStr += '\nDOMNodes: ' + obj.DOM.elemCount;
                objStr += '\nDOMTree Depth: ' + obj.DOM.DOMTreeDepth;
                objStr += '\nAngular Digest Cycles: ' + obj.AngularJS.DigestCycles;
                messagingService.showInfo( objStr );
            } ] );
        }, 1000, { leading: false, trailing: true } );
        _inj();
    };

    self.reportCustom = function( input ) {
        var injector = AwInjectorService.instance;
        var _inj = _.debounce( function() {
            injector.invoke( [ 'messagingService', function( messagingService ) {
                var _input = '~Invalid input~';
                if ( typeof input === 'string' ) {
                    _input = input;
                } else if (  typeof input === 'function' ) {
                    _input = input();
                } else if( typeof input === 'object' ) {
                    _input = JSON.stringify( input );
                }
                messagingService.showInfo( _input );
            } ] );
        }, 500, { leading: true, trailing: false } );
        _inj();
    };
    return self;
}

export default SPLMStatsMobileReporter;
