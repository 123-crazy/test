// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module defines graph grid preferences and actions
 *
 * @module js/graphGrid
 */
import _ from 'lodash';
import graphConstants from 'js/graphConstants';
import internalGraphUtils from 'js/internalGraphUtils';
import graphStyleUtils from 'js/graphStyleUtils';

'use strict';

var exports = {};

/**
 * Define graphGrid preferences
 *
 * @class
 * @param diagramView the diagram view object
 */
export let Preferences = function( diagramView ) {
    var self = this;
    var configData = diagramView.getSheetConfigurationData().gridPreferencesData;

    var GridType = {
        LINE: 0,
        POINT: 1
    };

    /**
     * Show or hide grid on graph
     *
     * @function
     * @param isShowGrid whether showing grid
     */
    this.enabled = {
        get: 'isShowGrid',
        set: 'setShowGrid'
    };

    /**
     * The color of the grid
     *
     * @function
     * @param lineColor the lineColor
     */
    this.lineColor = {
        get: 'getGridColor',
        set: 'setGridColor',
        converter: function() {
            var results;
            if( arguments ) {
                var input = arguments[ 0 ];
                return arguments[ 1 ] ? input : _.toArray( graphStyleUtils.parseColor( input ) );
            }
            return results;
        }
    };

    /**
     * Show Major lines or not
     *
     * @function
     * @param show boolean true if want to show major lines
     */
    this.showMajorLines = {
        get: 'isShowMajorLines',
        set: 'setShowMajorLines'
    };
    /**
     * Show Minor lines or not
     *
     * @function
     * @return true if grid is showing minor lines
     */
    this.showMinorLines = {
        get: 'isShowMinorLines',
        set: 'setShowMinorLines'
    };

    /**
     * set MajorGridSpacing
     *
     * @function
     * @param majorGridSpacing This attribute indicates the major grid space. Default value: 50.
     */
    this.majorSpacing = {
        get: 'getMajorGridSpacing',
        set: 'setMajorGridSpacing'
    };
    /**
     * set if the grid on top
     *
     * @function
     * @param isOnTop the new flag
     */
    this.bringToTop = {
        get: 'isBringGridToTop',
        set: 'setBringGridToTop'
    };

    /**
     * set if the type of grid (LINE vs POINT)
     *
     * @function
     * @param type the new type - 0 LINE, 1 POINT
     */
    this.lineStyle = {
        get: 'getGridType',
        set: 'setGridType',
        converter: internalGraphUtils.convert( GridType )
    };

    /**
     * set minor lines per major
     *
     * @function
     * @param linesPer the number of lines per major
     */
    this.minorLinesPerMajor = {
        get: 'getMinorLinesPerMajor',
        set: 'setMinorLinesPerMajor'
    };

    /**
     * set the setting for grid snapping
     *
     * @function
     * @param snapOn pass true to turn it on
     */
    this.enableSnapping = {
        get: 'isSnapToGrid',
        set: 'setSnapToGrid'
    };

    /**
     * set number of snap points per minor line
     *
     * @function
     * @param snapPoints the new number of snap points
     */
    this.snapPointsPerMinor = {
        get: 'getSnapPointsPerMinor',
        set: 'setSnapPointsPerMinor'
    };

    /**
     * Set the flag for snapping connections to grid
     *
     * @function
     * @param snapOn true to snap connections
     */
    this.enableSnapConnections = {
        get: 'isSnapConnectionToGrid',
        set: 'setSnapConnectionToGrid'
    };

    /**
     * sets the tolerance for connection snapping. Allows freedom of movement before snapping occurs
     *
     * @function
     * @param tolerance the new tolerance in pixels
     */
    this.snapConnectionTolerance = {
        get: 'getSnapConnectionToGridTolerance',
        set: 'setSnapConnectionToGridTolerance'
    };

    // transform property name and property value between GC exposed interface and DF internal interface
    _.forOwn( self, function( value, key ) {
        Object.defineProperty( self, key, {
            enumerable: true,
            configurable: true,
            get: function() {
                var v = configData[ value.get ]();
                return value.converter ? value.converter( v, true ) : v;
            },
            set: function( newValue ) {
                var v = value.converter ? value.converter( newValue ) : newValue;
                configData[ value.set ]( v );
            }
        } );
    } );
};

/**
 * Create graph grid preferences instance
 *
 * @param gridConfig the gridConfig
 * @param diagramView the diagram view object
 * @return graphGrid the graphGrid object, object structure \{preferences: Preferences\}. The Preferences object,
 *         see {@link graphGrid.Preferences} for details
 */
export let create = function( gridConfig, diagramView ) {
    if( gridConfig && diagramView ) {
        var grid = {
            preferences: new exports.Preferences( diagramView )
        };

        // initialize preferences
        _.assign( grid.preferences, gridConfig );

        return grid;
    }
};

export default exports = {
    Preferences,
    create
};
