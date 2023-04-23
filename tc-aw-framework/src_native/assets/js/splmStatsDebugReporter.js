// Copyright (c) 2020 Siemens

/**
 * Debug Reporter that will send performance info to console if enabled
 *
 * @module js/splmStatsDebugReporter
 * @publishedApolloService
 */
import _ from 'lodash';
import browserUtils from 'js/browserUtils';

/**
 * Debug Reporter that will send performance info to console if enabled
 *
 * @class SPLMStatsDebugReporter
 */
function SPLMStatsDebugReporter() {
    var self = this;

    var repeat = function( str, n ) {
        var newStr = '';
        for( var i = 0; i < n; i++ ) {
            newStr += str;
        }
        return newStr;
    };

    var _getFormattedPrint = function( performanceObj ) {
        var Table = function( report ) {
            var self = this;
            var _rows = {};
            var _skeletonStruct = '';

            /* Prints the table */
            self.getTable = function() {
                return _skeletonStruct;
            };

            self.addRow = function( row, colIdx ) {
                if( browserUtils.isIE && row === ' ' ) {
                    return;
                }
                if( !_rows[ colIdx ] ) {
                    _rows[ colIdx ] = {};
                    _rows[ colIdx ].rowList = [];
                    _rows[ colIdx ].maxWidth = 0;
                }
                _rows[ colIdx ].rowList.push( row );
                if( _rows[ colIdx ].maxWidth < row.length ) {
                    _rows[ colIdx ].maxWidth = row.length;
                }
            };

            self.buildSkeleton = function() {
                var _skel = 'PLStats Performance Summary\n';
                var columns = Object.keys( _rows );

                _rows[ '0' ].maxWidth = 1 + _rows[ 0 ].maxWidth;
                _rows[ '1' ].maxWidth = 1 + ( _rows[ 1 ].maxWidth > 13 ? _rows[ 1 ].maxWidth : 13 );

                /* SETUP TOP */
                for( var i = 0; i < columns.length; i++ ) {
                    _skel += '+' + repeat( '-', _rows[ i ].maxWidth );
                }
                _skel += '+\n';
                _skel += '|' + ' Metric' + repeat( ' ', _rows[ 0 ].maxWidth - ' Metric'.length );
                _skel += '|' + repeat( ' ', _rows[ 1 ].maxWidth - ' Value |'.length + 1 ) + ' Value |';
                _skel += '\n';

                /* SETUP MIDDLE PORTION */
                for( i = 0; i < columns.length; i++ ) {
                    _skel += '+' + repeat( '-', _rows[ i ].maxWidth );
                }
                _skel += '+\n';

                /* Print Data Here */
                for( i = 0; i < _rows[ 0 ].rowList.length; i++ ) {
                    _skel += '|' + ' ' + _rows[ 0 ].rowList[ i ] + repeat( ' ', _rows[ 0 ].maxWidth - ( ' ' + _rows[ 0 ].rowList[ i ] ).length );
                    _skel += '|' + repeat( ' ', 1 + _rows[ 1 ].maxWidth - String( ' ' + _rows[ 1 ].rowList[ i ] + '|' ).length ) + ' ' + _rows[ 1 ].rowList[ i ] + '|';
                    _skel += '\n';
                }

                /* SETUP BOTTOM */
                for( i = 0; i < columns.length; i++ ) {
                    _skel += '+' + repeat( '-', _rows[ i ].maxWidth );
                }
                _skel += '+\n';
                _skeletonStruct = _skel;
                return _skel;
            };

            /* Any processing that needs to be done to report performance object... => String */

            var memoryUsed = report.MemoryUsed;
            var memoryConsumed = report.MemoryConsumption;
            var memoryStart = report.MemoryStart;
            var memoryEnd = report.MemoryEnd;

            var soaCount = 0;

            if( memoryUsed === 0 || memoryConsumed === 0 ) {
                memoryUsed = 'Not Supported';
                memoryConsumed = 'Not Supported';
                memoryStart = 'Not Supported';
                memoryEnd = 'Not Supported';
            } else {
                memoryUsed = ( memoryUsed / 1024000 ).toFixed( 0 ) + 'MB';
                memoryConsumed = ( memoryConsumed / 1024000 ).toFixed( 0 ) + 'MB';
                memoryStart = ( memoryStart / 1024000 ).toFixed( 0 ) + 'MB';
                memoryEnd = ( memoryEnd / 1024000 ).toFixed( 0 ) + 'MB';
            }

            soaCount = _.filter( report.XHR.details, function( networkCall ) {
                return networkCall.logCorrelationID !== 0;
            } ).length;

            self.addRow( ' Browser Type', 0 );
            self.addRow( report.BrowserType + ' ', 1 );

            self.addRow( ' ', 0 );
            self.addRow( ' ', 1 );

            self.addRow( ' Time To Interactive', 0 );
            self.addRow( ( report.TTI / 1000 ).toFixed( 1 ) + 's ', 1 );

            self.addRow( ' Scripting Time', 0 );
            self.addRow( ( report.scriptTime / 1000 ).toFixed( 1 ) + 's ', 1 );

            self.addRow( ' Total Network Time', 0 );
            self.addRow( ( report.totalNetworkTime / 1000 ).toFixed( 1 ) + 's ', 1 );

            self.addRow( ' ', 0 );
            self.addRow( ' ', 1 );

            self.addRow( ' Total Network Requests(SOA)', 0 );
            self.addRow( soaCount + ' ', 1 );

            self.addRow( ' ', 0 );
            self.addRow( ' ', 1 );

            self.addRow( ' Memory At Start', 0 );
            self.addRow( memoryStart + ' ', 1 );

            self.addRow( ' Memory At Stop', 0 );
            self.addRow( memoryEnd + ' ', 1 );

            self.addRow( ' ', 0 );
            self.addRow( ' ', 1 );

            self.addRow( ' DOM Node Count', 0 );
            self.addRow( report.DOM.elemCount + ' ', 1 );

            self.addRow( ' DOM Tree Depth', 0 );
            self.addRow( report.DOM.DOMTreeDepth + ' ', 1 );

            self.addRow( ' ', 0 );
            self.addRow( ' ', 1 );

            self.addRow( ' Digest Cycles', 0 );
            self.addRow( report.AngularJS.DigestCycles + ' ', 1 );

            self.addRow( ' Watchers on Page', 0 );
            self.addRow( report.AngularJS.watcherCount + ' ', 1 );

            self.buildSkeleton();

            return self;
        };
        return new Table( performanceObj ).buildSkeleton();
    };

    /**
     * @param {Object} performanceObject - Performance object to be formatted and sent to console
     */
    self.report = function( performanceObject ) {
        if( performanceObject.TTI < 800 ) {
            return;
        }
        var memoryStart = performanceObject.MemoryStart;
        var memoryEnd = performanceObject.MemoryEnd;

        if( performanceObject.MemoryUsed === 0 || performanceObject.MemoryConsumption === 0 ) {
            memoryStart = 'Not Supported';
            memoryEnd = 'Not Supported';
        } else {
            memoryStart = ( memoryStart / 1024 ).toFixed( 3 ) + 'kb';
            memoryEnd = ( memoryEnd / 1024 ).toFixed( 3 ) + 'kb';
        }
        performanceObject.XHR[ '*TotalNetworkTime' ] = performanceObject.totalNetworkTime.toFixed( 3 ) + 'ms';

        /* uncomment to alert TTI numbers - needed in IE since f12 has big impact on performance
        // eslint-disable-next-line no-alert
        alert( '*splmTTI: ' + performanceObject.TTI.toFixed( 3 ) + 'ms\n'
             + '*splmTotalNetworkTime: ' + performanceObject.totalNetworkTime.toFixed( 3 ) + 'ms\n'
             + '*splmScriptingTime: ' +  performanceObject.scriptTime.toFixed( 3 ) + 'ms' );
        */

        console.log( _getFormattedPrint( performanceObject ) );
        console.log( 'PLStats Performance Telemetry Internal Debug: * = denotes sent to analytics if enabled', {
            '*TimeToInteractive': performanceObject.TTI.toFixed( 3 ) + 'ms',
            '*ScriptingTime': performanceObject.scriptTime.toFixed( 3 ) + 'ms',
            '*Type': performanceObject.BrowserType,
            DOM: {
                '*NodeCount': performanceObject.DOM.elemCount,
                TreeDepth: performanceObject.DOM.DOMTreeDepth,
                'CostlyWidgets( >= 50 watchers || >= 7 Descendant DOM Depth )': performanceObject.DOM.DOMCostlyWidgets
            },
            AngularJS: {
                '*WatchersOnPage': performanceObject.AngularJS.watcherCount,
                '*DigestCycles': performanceObject.AngularJS.DigestCycles
            },
            XHR: performanceObject.XHR,
            Memory: {
                '*MemoryAtStart': memoryStart,
                '*MemoryAtStop': memoryEnd
            },
            _processorOverhead: {
                DOM: performanceObject.DOMProcessorOverhead.toFixed( 3 ) + 'ms',
                Memory: performanceObject.MemProcessorOverhead.toFixed( 3 ) + 'ms',
                AngularJS: performanceObject.NgProcessorOverhead.toFixed( 3 ) + 'ms',
                XHR: performanceObject.XHRProcessorOverhead.toFixed( 3 ) + 'ms',
                SCRIPT: performanceObject.JsProcessorOverhead.toFixed( 3 ) + 'ms'
            }
        } );
    };
    return self;
}

export default SPLMStatsDebugReporter;
