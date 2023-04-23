// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define Math */

/**
 * This measurement service provider
 *
 * @module js/viewerMeasurementManagerProvider
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import viewerUnitConversionService from 'js/viewerUnitConversionService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import assert from 'assert';
import 'jscom';
import 'manipulator';
import viewerSessionStorageService from 'js/viewerSessionStorageService';
import viewerPreferenceService from 'js/viewerPreference.service';

import logger from 'js/logger';

var exports = {};

/**
 * Provides an instance of viewer measurement manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerMeasurementManager} Returns viewer measurement manager
 */
export let getViewerMeasurementManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerMeasurementManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the viewer measurement data
 *
 * @constructor ViewerMeasurementManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var ViewerMeasurementManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var _viewerCtxNamespace = viewerCtxNamespace;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;
    var _doubleMeasurements = [];
    var _singleMeasurements = [];
    var _persistNewlyCreatedMeasurements = true;
    var _currentMeasuremenMode = true;
    var _currentSelectedMeasurement = null;
    let _previousTransparancyMode = null;

    var GEOANALYSIS_VIEWER_MEASUREMENT = 'viewerMeasurement';
    var GEOANALYSIS_VIEWER_MEASUREMENT_PICK_FILTER = 'selectedMeasurementPickFilters';
    var GEOANALYSIS_VIEWER_QUICK_MEASUREMENT_PICK_FILTER = 'selectedQuickMeasurementPickFilters';
    var GEOANALYSIS_VIEWER_MEASUREMENT_SELECTION = 'selectedMeasurementObject';
    var GEOANALYSIS_VIEWER_MEASUREMENT_COUNT = 'viewerMeasurementCount';
    var GEOANALYSIS_VIEWER_MEASURE_PICKFILTER_SELECTION_STATE = 'viewerMeasurePickfilterSelectionState';

    /**
     * Viewer measurement mode
     */
    self.MeasurementMode = {
        SINGLE: window.JSCom.Consts.MeasurementMode.SINGLE,
        DOUBLE: window.JSCom.Consts.MeasurementMode.DOUBLE
    };

    /**
     * Viewer measurement pick filter state
     */
    self.PickFilterStateValues = {
        PICK_NONE: window.JSCom.Consts.PickFilterState.NONE,
        PICK_PART: window.JSCom.Consts.PickFilterState.PART,
        PICK_PARTS: window.JSCom.Consts.PickFilterState.PART,
        PICK_VERTEX: window.JSCom.Consts.PickFilterState.VERTEX,
        PICK_ARC_CENTER: window.JSCom.Consts.PickFilterState.ARC_CENTER,
        PICK_MIDPOINT: window.JSCom.Consts.PickFilterState.MIDPOINT,
        PICK_POINT_ON_EDGE: window.JSCom.Consts.PickFilterState.POINT_ON_EDGE,
        PICK_POINT: window.JSCom.Consts.PickFilterState.POINT,
        PICK_EDGE: window.JSCom.Consts.PickFilterState.EDGE,
        PICK_SURFACE: window.JSCom.Consts.PickFilterState.SURFACE,
        PICK_USER_DEFINED_POINT: window.JSCom.Consts.PickFilterState.USER_DEFINED_POINT,
        PICK_INTERSECTION_POINT: window.JSCom.Consts.PickFilterState.INTERSECTION_POINT,
        PICK_THREE_POINT_ARC: window.JSCom.Consts.PickFilterState.THREE_POINT_ARC,
        PICK_CONSTRUCT_MIDPOINT: window.JSCom.Consts.PickFilterState.CONSTRUCT_MIDPOINT,
        PICK_ALL: window.JSCom.Consts.PickFilterState.ALL
    };

    /**
     * constant "sq" String
     */
    self.SQ_STR = 'sq'; //$NON-NLS-1$

    /**
     * constant "cu" String
     */
    self.CU_STR = 'cu'; //$NON-NLS-1$

    /**
     * Enums that represent units
     */
    self.UnitMnemonics = {
        mm: 1.0, //millimeters
        cm: 10.0, // Centimeters
        m: 1.0e+3, // Meters
        in: 25.4, // Inches
        ft: 304.8, // Feet
        yd: 914.4, // Yards
        um: 1.0e-3, // Micrometers
        dm: 100.0, // Decimeters
        km: 1.0e+6, // Kilometers
        mils: 1.609e+6, // Miles
        mile: 2.54e-2 // Mils
    };

    /**
     * Set measurement mode enabled or disabled
     *
     * @param {boolean} isEnabled should measurement be enabled
     */
    self.setMeasurementModeEnabled = function( isEnabled ) {
        if( !isEnabled ) {
            _currentMeasuremenMode = null;
        }
        _viewerView.measurementMgr.enableMeasurementCreator( isEnabled );
    };

    /**
     * Set measurement mode options
     *
     * @param {MeasurementMode} measurementMode - measurement mode
     * @param {PickFilterState} pickFilterState - pick filter state
     * @param {Boolean} quickMeasure - true if quick measurement mode should be turned on
     */
    self.setMeasurementModeOptions = function( measurementMode, pickFilterState, quickMeasure ) {
        if( quickMeasure && measurementMode === self.MeasurementMode.DOUBLE && _doubleMeasurements.length === 0 ) {
            _persistNewlyCreatedMeasurements = false;
        } else {
            _persistNewlyCreatedMeasurements = true;
        }
        _currentMeasuremenMode = measurementMode;
        var measurementModeOptions = {
            measurementMode: measurementMode,
            pickFilterState: pickFilterState,
            quickMeasure: !_persistNewlyCreatedMeasurements
        };
        _viewerView.measurementMgr.setMeasurementCreatorOptions( measurementModeOptions );
    };

    /**
     * Start measurement in viewer as per measurement mode provided
     *
     * @param {String} measurementMode - measurement type
     */
    self.startViewerMeasurement = function( measurementMode ) {
        self.setMeasurementModeEnabled( true );
        self.setMeasurementPickMode( measurementMode );
        _updateSelectedMeasurementContext( _currentSelectedMeasurement ).then( function() {
            _publishMeasurementSelectionEvent();
        } );
        let renderOptions = viewerPreferenceService.getRenderSource();
        let csrMode = viewerPreferenceService.getViewerCSRPref();
        var isUseTransparency = appCtxService.getCtx( 'viewer.preference.AWC_visSelectionDisplay' );
        if( renderOptions && renderOptions.length && renderOptions[ 0 ] === 'CSR' && csrMode && csrMode === 'PVW' && isUseTransparency ) {
            _viewerContextData.setUseTransparency( !isUseTransparency );
            _previousTransparancyMode = isUseTransparency;
        }
    };

    /**
     * Start quick measurement in viewer
     */
    self.startViewerQuickMeasurement = function() {
        self.setMeasurementModeEnabled( true );
        self.setQuickMeasurementPickMode();
    };

    /**
     * Close measurement in viewer
     *
     * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
     */
    self.closeViewerMeasurement = function() {
        self.setMeasurementModeEnabled( false );
        let renderOptions = viewerPreferenceService.getRenderSource();
        let csrMode = viewerPreferenceService.getViewerCSRPref();
        if( renderOptions && renderOptions.length && renderOptions[ 0 ] === 'CSR' && csrMode && csrMode === 'PVW' && _previousTransparancyMode ) {
            _viewerContextData.setUseTransparency( _previousTransparancyMode );
            _previousTransparancyMode = null;
        }
    };

    /**
     * Viewer measurement listener
     */
    var viewerMeasurementListener = {
        onMeasurementCreated: function( measurement ) {
            if( _persistNewlyCreatedMeasurements ) {
                _handleViewerMeasurementCreation( measurement );
            }
        },
        onMeasurementDeleted: function( measurement ) {
            // _handleViewerMeasurementDeletion( measurement );
        }
    };

    /**
     * Handle creation of measurement object
     *
     * @param {Object} measurement the newly created measurement object
     */
    var _handleViewerMeasurementCreation = function( measurement ) {
        measurement.getType().then( function( measurementType ) {
            if( measurementType === self.MeasurementMode.DOUBLE ) {
                _doubleMeasurements.push( measurement );
            } else if( measurementType === self.MeasurementMode.SINGLE ) {
                _singleMeasurements.push( measurement );
            }
            let measurementCtx = _getMeasurementContext();
            measurementCtx[ GEOANALYSIS_VIEWER_MEASUREMENT_COUNT ] += 1;
            measurement.addListener( viewerMeasurementSelectionListener );
            measurement.getSelected().then( function( isSelected ) {
                var promise = null;
                if( isSelected ) {
                    promise = _updateSelectedMeasurementContext( measurement );
                } else {
                    promise = AwPromiseService.instance.resolve();
                }
                promise.then( function() {
                    _publishMeasurementSelectionEvent();
                } );
            } );
        } );
    };

    /**
     * Set measurement pick mode
     */
    self.setMeasurementPickMode = function( measurementMode ) {
        let measurementCtx = _getMeasurementContext();
        var pickFilters = measurementCtx[ GEOANALYSIS_VIEWER_MEASUREMENT_PICK_FILTER ];
        if( _.isNull( pickFilters ) || _.isUndefined( pickFilters ) || pickFilters.length <= 0 ) {
            pickFilters = [];

            pickFilters.push( 'PICK_SURFACE' );
            pickFilters.push( 'PICK_EDGE' );
            pickFilters.push( 'PICK_VERTEX' );
            pickFilters.push( 'PICK_POINT' );
            pickFilters.push( 'PICK_ARC_CENTER' );
            measurementCtx[ GEOANALYSIS_VIEWER_MEASUREMENT_PICK_FILTER ] = pickFilters;
        }
        var pickFilterState = _generatePickFilterValue( pickFilters );
        if( measurementMode === 'doubleMeasurement' ) {
            self.setMeasurementModeOptions( self.MeasurementMode.DOUBLE, pickFilterState, false );
        } else if( measurementMode === 'singleMeasurement' ) {
            self.setMeasurementModeOptions( self.MeasurementMode.SINGLE, pickFilterState, false );
        }
    };

    /**
     * Set quick measurement pick mode
     */
    self.setQuickMeasurementPickMode = function() {
        let measurementCtx = _getMeasurementContext();
        var pickFilters = measurementCtx[ GEOANALYSIS_VIEWER_QUICK_MEASUREMENT_PICK_FILTER ];
        if( _.isNull( pickFilters ) || _.isUndefined( pickFilters ) || pickFilters.length <= 0 ) {
            pickFilters = [];
            pickFilters.push( 'PICK_FEATURES_ALL' );
            measurementCtx[ GEOANALYSIS_VIEWER_QUICK_MEASUREMENT_PICK_FILTER ] = pickFilters;
        }
        var featureAllIndex = pickFilters.indexOf( 'PICK_FEATURES_ALL' );
        var quickMeasurePickFilterState = [];
        if( featureAllIndex !== -1 ) {
            quickMeasurePickFilterState.push( 'PICK_SURFACE' );
            quickMeasurePickFilterState.push( 'PICK_EDGE' );
            quickMeasurePickFilterState.push( 'PICK_VERTEX' );
            quickMeasurePickFilterState.push( 'PICK_POINT' );
            quickMeasurePickFilterState.push( 'PICK_ARC_CENTER' );
        } else {
            quickMeasurePickFilterState.push( 'PICK_PARTS' );
        }
        var pickFilterState = _generatePickFilterValue( quickMeasurePickFilterState );
        self.setMeasurementModeOptions( self.MeasurementMode.DOUBLE, pickFilterState, true );
    };

    /**
     * Generate pick filter state value
     */
    var _generatePickFilterValue = function( pickFilters ) {
        var filterValue = '';
        for( var i = 0; i < pickFilters.length; i++ ) {
            if( pickFilters[ i ] !== 'PICK_FEATURES_ALL' ) {
                if( filterValue === '' ) {
                    filterValue = self.PickFilterStateValues[ pickFilters[ i ] ];
                } else {
                    filterValue |= self.PickFilterStateValues[ pickFilters[ i ] ];
                }
            }
        }
        return filterValue;
    };

    /**
     * Delete selected measurement
     */
    self.deleteSelectedMeasurement = function() {
        _currentSelectedMeasurement.getType().then( ( type ) => {
            if( type === self.MeasurementMode.DOUBLE ) {
                var deletedMeasurementIndex = _doubleMeasurements.indexOf( _currentSelectedMeasurement );
                if( deletedMeasurementIndex !== -1 ) {
                    _doubleMeasurements.splice( deletedMeasurementIndex, 1 );
                }
            } else if( type === self.MeasurementMode.SINGLE ) {
                var deletedQueryIndex = _singleMeasurements.indexOf( _currentSelectedMeasurement );
                if( deletedQueryIndex !== -1 ) {
                    _singleMeasurements.splice( deletedQueryIndex, 1 );
                }
            }
            let measurementCtx = _getMeasurementContext();
            measurementCtx[ GEOANALYSIS_VIEWER_MEASUREMENT_COUNT ] -= 1;
            _currentSelectedMeasurement.delete().then( function() {
                _updateSelectedMeasurementContext( null ).then( function() {
                    _publishMeasurementSelectionEvent();
                } );
            } );
        } );
    };

    /**
     * Delete all measurements
     */
    self.deleteAllMeasurements = function() {
        let measurements = _doubleMeasurements.concat( _singleMeasurements );
        _viewerView.measurementMgr.deleteMeasurements( measurements ).then( function() {
            _doubleMeasurements.length = 0;
            _singleMeasurements.length = 0;
            let measurementCtx = _getMeasurementContext();
            measurementCtx[ GEOANALYSIS_VIEWER_MEASUREMENT_COUNT ] = 0;
            _updateSelectedMeasurementContext( null ).then( function() {
                _publishMeasurementSelectionEvent();
            } );
        } );
    };

    /**
     * Update viewer context with selected measurement
     *
     * @param {Object} measurement selected measurement object
     * @returns {Promise} promise that is resolved after selected measurement context is updated
     */
    var _updateSelectedMeasurementContext = function( measurement ) {
        var deferred = AwPromiseService.instance.defer();
        let measurementCtx = _getMeasurementContext();
        measurementCtx[ GEOANALYSIS_VIEWER_MEASUREMENT_SELECTION ] = null;
        _currentSelectedMeasurement = null;
        if( !_.isNull( measurement ) && !_.isUndefined( measurement ) ) {
            measurement.getSelected().then( function( isSelected ) {
                if( isSelected ) {
                    measurement.getType().then( function( measurementType ) {
                        if( measurementType === self.MeasurementMode.DOUBLE ) {
                            var measurementPropPromise = measurement.getMeasurementProperties();
                            measurementPropPromise.then( function( properties ) {
                                var allSelectedMeasurementProperties = {};
                                for( var i = 0; i < properties.length; i++ ) {
                                    var dispName = properties[ i ].getDisplayName();
                                    var value = properties[ i ].getValue();
                                    var unit = properties[ i ].getUnits();
                                    if( unit ) {
                                        allSelectedMeasurementProperties[ dispName ] = {
                                            unit: unit,
                                            value: viewerUnitConversionService.convertToAnotherUnitsFromMeter( value, unit )
                                        };
                                    } else {
                                        allSelectedMeasurementProperties[ dispName ] = value;
                                    }
                                }
                                measurementCtx[ GEOANALYSIS_VIEWER_MEASUREMENT_SELECTION ] = allSelectedMeasurementProperties;
                                _currentSelectedMeasurement = measurement;
                                deferred.resolve();
                            } );
                        } else if( measurementType === self.MeasurementMode.SINGLE ) {
                            var measurementPropPromise = measurement.getMeasurementProperties();
                            measurementPropPromise.then( function( properties ) {
                                var allSelectedQueryProperties = {};
                                for( var i = 0; i < properties.length; i++ ) {
                                    var dispName = properties[ i ].getDisplayName();
                                    var value = properties[ i ].getValue();
                                    var unit = properties[ i ].getUnits();
                                    if( unit ) {
                                        allSelectedQueryProperties[ dispName ] = {
                                            unit: unit,
                                            value: viewerUnitConversionService.convertToAnotherUnitsFromMeter( value, unit )
                                        };
                                    } else {
                                        allSelectedQueryProperties[ dispName ] = value;
                                    }
                                }
                                measurementCtx[ GEOANALYSIS_VIEWER_MEASUREMENT_SELECTION ] = allSelectedQueryProperties;
                                _currentSelectedMeasurement = measurement;
                                deferred.resolve();
                            } );
                        } else {
                            deferred.resolve();
                        }
                    } );
                } else {
                    deferred.resolve();
                }
            } );
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    /**
     * Viewer measurement selection listener
     */
    var viewerMeasurementSelectionListener = {
        onMeasurementSelected: function() {
            if( _persistNewlyCreatedMeasurements ) {
                var promise = _updateSelectedMeasurementContext( this );
                promise.then( function() {
                    _publishMeasurementSelectionEvent();
                } );
            }
        }
    };

    /**
     * Publish measurement selection event
     */
    var _publishMeasurementSelectionEvent = function() {
        eventBus.publish( 'viewerMeasurement.select', {} );
    };
    _viewerView.measurementMgr.addListener( viewerMeasurementListener );

    /**
     * Returns measurement context
     */
    let _getMeasurementContext = function() {
        return appCtxService
            .getCtx( _viewerCtxNamespace + '.' + GEOANALYSIS_VIEWER_MEASUREMENT );
    };

    /*
     * Fetches measurements from server
     * @return {Promise} promise
     */
    self.getAllMeasurements = function() {
        _doubleMeasurements.length = 0;
        _singleMeasurements.length = 0;
        _viewerView.measurementMgr.getAllMeasurements()
            .then( function( rawMeasurementList ) {
                if( rawMeasurementList ) {
                    let measurementCtx = _getMeasurementContext();
                    measurementCtx[ GEOANALYSIS_VIEWER_MEASUREMENT_COUNT ] = 0;
                    for( var index = 0; index < rawMeasurementList.length; index++ ) {
                        rawMeasurementList.getMeasurement( index ).then( function( rawMeasurement ) {
                            _handleViewerMeasurementCreation( rawMeasurement );
                        } );
                    }
                }
            } )
            .catch( function( reason ) {
                logger.warn( 'Could not fetch measurements from server: ' + reason );
            } );
    };

    /**
    * Sets pick filter selection state to subcommand toolbar from session storage
    *
    * @param {Object} viewerCtxNamespace Viewer context name space
    */
    self.setPickFilterSelectionStateInSubCommandToolBar = function( viewerCtxNamespace ) {
        let sessionStorageId = 'MeasCmdGrp_' + viewerCtxNamespace;
        let selectionStateData = viewerSessionStorageService.getViewerCommandDataToSessionStorage( sessionStorageId );
        if( !selectionStateData ) {
            selectionStateData = {};
            selectionStateData.partsFilterSelected = false;
            selectionStateData.surfaceFilterSelected = true;
            selectionStateData.vertexFilterSelected = true;
            selectionStateData.edgeFilterSelected = true;
            selectionStateData.pointFilterSelected = true;
            selectionStateData.arcCenterFilterSelected = true;
        }
        let measurementCtx = _getMeasurementContext();
        measurementCtx[GEOANALYSIS_VIEWER_MEASURE_PICKFILTER_SELECTION_STATE] = selectionStateData;
    };

    /**
     * Stores measurement subCommandToolBar data to session storage
    * @param {Object} viewerCtxNamespace Viewer context name space
    * @param {Object} subToolBarCommandState Measurement subToolBarCommandState
    */
    self.setMeasurementCommandDataToSessionStorage = function( viewerCtxNamespace, subToolBarCommandState ) {
        let sessionStorageId = 'MeasCmdGrp_' + viewerCtxNamespace;
        viewerSessionStorageService.setViewerCommandDataToSessionStorage( sessionStorageId, subToolBarCommandState );
    };

    /**
     * clear viewer visibility
     */
    self.cleanUp = function() {
        _doubleMeasurements.length = 0;
        _singleMeasurements.length = 0;
        _viewerView.measurementMgr.removeListener( viewerMeasurementListener );
    };
};

export default exports = {
    getViewerMeasurementManager
};
/**
 * This service is used to get ViewerMeasurementManager
 *
 * @memberof NgServices
 */
app.factory( 'viewerMeasurementManagerProvider', () => exports );
