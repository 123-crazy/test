// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * This service is to create viewer section manager
 *
 * @module js/viewerSectionManagerProvider
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import localeSvc from 'js/localeService';
import viewerPreferenceService from 'js/viewerPreference.service';
import viewerUnitConversionService from 'js/viewerUnitConversionService';
import eventBus from 'js/eventBus';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import assert from 'assert';
import logger from 'js/logger';
import 'jscom';
import 'manipulator';

var exports = {};

/**
 * Provides an instance of viewer section manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerSectionManager} Returns viewer section manager
 */
export let getViewerSectionManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerSectionManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the viewer section data
 *
 * @constructor ViewerSectionManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var ViewerSectionManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var _viewerCtxNamespace = viewerCtxNamespace;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;
    var _sectionIdToSectionObjectMap = {};
    var _sectionsList = [];
    // The map stores the information about the custom plane section.
    var _customSectionIdToSectionObjectMap = {};
    var _currentSectionMode = true;
    var _sectionListenerFlag = false;

    /**
     * images for dropdown planes.
     */
    var CMDPLANEIMAGES = [ 'cmdXyPlanar', 'cmdZxPlanar', 'cmdYzPlanar', 'cmdNonOrthogonalSectionPlane' ];

    /**
     * Ids for dropdown planes. Do not change the order.
     */
    var PLANEIDS = [ 1, 2, 3 ];
    var customPlaneID = '4';
    /**
     * Plane orientation labels
     */
    var SECTION_PLANES = [ getLocalizedText( 'xy' ), getLocalizedText( 'xz' ), getLocalizedText( 'yz' ) ];

    var CLIP_STATES = [ getLocalizedText( 'Neither' ), getLocalizedText( 'Near' ), getLocalizedText( 'Far' ), getLocalizedText( 'Both' ) ];

    self.GEOANALYSIS_SECTION_NAMESPACE = 'geoAnalysisSection';
    self.GEOANALYSIS_SECTION_LIST = 'sectionList';
    self.GEOANALYSIS_SECTION_OFFSET_LABEL = 'offsetLabel';
    self.GEOANALYSIS_SECTION_OFFSET_VALUE = 'offsetValue';
    self.GEOANALYSIS_SECTION_OFFSET_PERCENT_VALUE = 'offsetPercentValue';
    self.GEOANALYSIS_SECTION_OFFSET_MIN = 'offsetMinValue';
    self.GEOANALYSIS_SECTION_OFFSET_MAX = 'offsetMaxValue';
    self.GEOANALYSIS_SECTION_ISSELECTED = 'selected';
    self.GEOANALYSIS_SECTION_ID = 'sectionId';
    self.GEOANALYSIS_EDIT_SECTION_ID = 'editSectionId';
    self.GEOANALYSIS_SECTION_PLANE_LABEL = 'sectionPlaneLabel';
    self.GEOANALYSIS_SECTION_VISIBILITY = 'isSectionVisible';
    self.GEOANALYSIS_SECTION_OFFSET_THUMBNAIL = 'planeThumbnailIcon';
    self.GEOANALYSIS_SECTION_PLANE_IDS_LIST = 'sectionPlaneIdsProp';
    self.GEOANALYSIS_SECTION_PLANE_NAMES_LIST = 'sectionPlaneNamesProp';
    self.GEOANALYSIS_SECTION_ERROR_MESSAGE = 'sectionPlaneErrorMessage';
    self.GEOANALYSIS_SECTION_PLANE_ICONS_LIST = 'sectionPlaneIconsProp';
    self.GEOANALYSIS_SECTION_PLANE_SELECTION_ID = 'sectionPlaneSelectionIdProp';
    self.GEOANALYSIS_SHOW_CAPS_AND_CUT_LINES = 'isShowCapsAndCutLines';
    self.GEOANALYSIS_SECTION_NORMAL = 'sectionNormal';
    self.GEOANALYSIS_SECTION_CLIP_STATE = 'sectionClipState';
    self.GEOANALYSIS_SECTION_CLIP_STATE_LIST = 'sectionClipStateList';
    self.GEOANALYSIS_SECTION_CUT_LINES_STATE = 'sectionCutLinesState';

    /**
     * Create viewer section
     *
     * @param {String} viewerCtxNamespace - registered viewer context name space
     * @param {String} planeId plane id to create section
     * @param {Promise} deferred A promise resolved once section is create in viewer in given plane
     *
     * @return {Promise} A promise resolved once section is create in viewer in given plane
     */
    self.createViewerSection = function( viewerCtxNamespace, planeId, deferred ) {
        var initProps = [ {
            name: window.JSCom.Consts.CrossSectionProperties.NORMAL,
            value: mapToVector( planeId )
        } ];

        return _viewerView.sectionMgr.createCrossSection( initProps ).then(
            function( newlyCreatedCrossSection ) {
                return createSectionObject( newlyCreatedCrossSection, planeId ).then(
                    function( sectionData ) {
                        deselectExistingSections();
                        _sectionIdToSectionObjectMap[ sectionData.sectionId ] = newlyCreatedCrossSection;
                        _sectionsList.unshift( sectionData );
                        updateSectionListToViewerContext();
                        deferred.resolve( sectionData.sectionId );
                        return sectionData;
                    },
                    function( errorMessage ) {
                        logger.error( errorMessage );
                        deferred.reject( errorMessage );
                        return errorMessage;
                    }
                );
            },
            function( errorMessage ) {
                logger.error( errorMessage );
                deferred.reject( errorMessage );
                return errorMessage;
            }
        );
    };

    var _handleViewerSectionCreationUsingEntities = function( section ) {
        return createSectionObject( section, customPlaneID ).then(
            function( sectionData ) {
                _sectionIdToSectionObjectMap[ sectionData.sectionId ] = section;
                _sectionsList.unshift( sectionData );
                updateSectionListToViewerContext();
                self.setSectionModeEnabled( false );
                eventBus.publish( 'SectionCreatedUsingEntities.revealPanel', { viewerCtxNameSpace: _viewerCtxNamespace, sectionData: sectionData } );
                return sectionData;
            },
            function( errorMessage ) {
                logger.error( errorMessage );
                return errorMessage;
            }
        );
    };

    var _deselectForCustomSections = function() {
        const customSectionDeferred = AwPromiseService.instance.defer();
        let isSectionSelected = false;
        _sectionsList.forEach( ( element ) => {
            if( element.selected === true ) {
                self.setSectionSelection( _viewerCtxNamespace, customSectionDeferred, element.sectionId, false );
                element.selected = false;
                isSectionSelected = true;
            }
        } );
        if( !isSectionSelected ) {
            customSectionDeferred.resolve();
        }
        return customSectionDeferred.promise;
    };

    self.enterSectionCreationModeUsingEntities = function( sectionCreatorOptions ) {
        self.setSectionModeEnabled( true );
        self.setSectionCreatorOptions( sectionCreatorOptions );
        if( _sectionListenerFlag === false ) {
            _viewerView.sectionMgr.addListener( viewerSectionListener );
            _sectionListenerFlag = true;
        }
    };

    self.setSectionModeEnabled = function( isEnabled ) {
        if( !isEnabled ) {
            _currentSectionMode = null;
        }
        _viewerView.sectionMgr.enableSectionCreator( isEnabled );
    };

    var viewerSectionListener = {
        onSectionCreated: function( section ) {
            var promise = _deselectForCustomSections();
            promise.then( function() {
                _handleViewerSectionCreationUsingEntities( section );
            } );
        }
    };

    self.setSectionCreatorOptions = function( sectionCreatorOptions ) {
        _currentSectionMode = sectionCreatorOptions.SECTION_MODE;
        var SectionModeOptions = {
            sectionMode: sectionCreatorOptions.SECTION_MODE,
            pickFilterState: sectionCreatorOptions.PICK_FILTER
        };
        _viewerView.sectionMgr.setSectionCreatorOptions( SectionModeOptions );
    };

    /**
     * This api sets show caps and cut lines in viewer
     *
     * @function setShowCapsAndCutLines
     *
     * @param {String} viewerContextNamespace - registered viewer context name space
     * @param {String} isShowCapsAndLines true if section is to be selected
     * @param {Promise} deferred A promise resolved once section is create in viewer in given plane
     */
    self.setShowCapsAndCutLines = function( viewerContextNamespace, isShowCapsAndLines, deferred ) {
        _viewerView.sectionMgr.setCappingAndLines( isShowCapsAndLines ).then(
            function() {
                deferred.resolve();
            },
            function( errorMessage ) {
                logger.error( errorMessage );
                deferred.reject( errorMessage );
            }
        );
    };

    /**
     * This api returns all section in current 3D session
     *
     * @function getAllSections
     *
     * @param {Promise} deferred A promise resolved once context is initialized
     */
    self.getAllSections = function( deferred ) {
        _viewerView.sectionMgr.getAllSections().then( sectionsListFromServer => {
            deferred.resolve( sectionsListFromServer );
        } ).catch( error => {
            deferred.reject( error );
        } );
    };

    /**
     * This api used to initialize viewer context
     *
     * @function initializeSectionsFromContext
     *
     * @param {String} viewerContextNamespace - registered viewer context name space
     * @param {Promise} deferred A promise resolved once context is initialized
     */
    self.initializeSectionsFromContext = function( viewerContextNamespace, deferred ) {
        var serverSectionsList = null;
        _viewerView.sectionMgr.getAllSections().then(
            function( sectionsListFromServer ) {
                var getSectionPromises = [];
                if( sectionsListFromServer && sectionsListFromServer.length > 0 ) {
                    for( var i = sectionsListFromServer.length - 1; i >= 0; i-- ) {
                        getSectionPromises.push( sectionsListFromServer.getSection( i ) );
                    }
                    return AwPromiseService.instance.all( getSectionPromises );
                }
                return [];
            }
        ).then(
            function( sectionsFromSectionList ) {
                var getSectionNormalPromises = [];
                if( sectionsFromSectionList && sectionsFromSectionList.length > 0 ) {
                    serverSectionsList = sectionsFromSectionList;
                    for( var i = 0; i < sectionsFromSectionList.length; i++ ) {
                        getSectionNormalPromises.push( sectionsFromSectionList[ i ].getNormal() );
                    }
                    return AwPromiseService.instance.all( getSectionNormalPromises );
                }
                return [];
            }
        ).then(
            function( sectionNormals ) {
                var getSectionObjectPromises = [];
                if( serverSectionsList && serverSectionsList.length > 0 && sectionNormals.length === serverSectionsList.length ) {
                    for( var i = 0; i < serverSectionsList.length; i++ ) {
                        getSectionObjectPromises.push( createSectionObject( serverSectionsList[ i ], getPlaneIdFromNormalVector( sectionNormals[ i ] ) ) );
                    }
                    return AwPromiseService.instance.all( getSectionObjectPromises );
                }
                return [];
            }
        ).then(
            function( sectionObjectsFromSectionList ) {
                _sectionIdToSectionObjectMap = {};
                _sectionsList.length = 0;
                for( var i = 0; i < sectionObjectsFromSectionList.length; i++ ) {
                    var sectionData = sectionObjectsFromSectionList[ i ];
                    _sectionIdToSectionObjectMap[ sectionData.sectionId ] = serverSectionsList[ i ];
                    _sectionsList.push( sectionData );
                }
                updateSectionListToViewerContext();
                deferred.resolve();
            }
        ).catch( function( errorMessage ) {
            logger.error( errorMessage );
            deferred.reject( errorMessage );
        } );
    };

    /**
     * Create and send request for selecting a section in viewer
     *
     * @param {String} viewerContextNamespace viewer context namespace
     * @param {Promise} deferred promise object
     * @param {Number} sectionId section id
     * @param {Boolean} isSelected is selected
     */
    self.setSectionSelection = function( viewerContextNamespace, deferred, sectionId, isSelected ) {
        var sectionIdStr = sectionId ? sectionId.toString() : sectionId;
        var selectedSection = _sectionIdToSectionObjectMap[ sectionIdStr ];
        if( selectedSection ) {
            selectedSection.setSelected( isSelected ).then(
                function() {
                    updateSectionsSelectionInViewerContext( sectionIdStr, isSelected );
                    deferred.resolve();
                },
                function( errorMessage ) {
                    logger.error( errorMessage );
                    deferred.reject( errorMessage );
                }
            );
        } else {
            deferred.resolve();
        }
    };

    /**
     * Get section data by id
     *
     * @param {Number} sectionId section id
     * @returns {Object} Edit section data object
     */
    self.getSectionDataById = function( sectionId ) {
        let sectionData = null;
        for( let i = 0; i < _sectionsList.length; i++ ) {
            if( _sectionsList[ i ].sectionId === sectionId ) {
                sectionData = _sectionsList[ i ];
                break;
            }
        }
        return sectionData;
    };

    /**
     * Deselect existing sections
     */
    function deselectExistingSections() {
        for( var i = 0; i < _sectionsList.length; i++ ) {
            _sectionsList[ i ].selected = false;
        }
    }

    /**
     * Create and send request for selecting a section in viewer
     *
     * @param {String} viewerContextNamespace viewer context namespace
     * @param {Promise} deferred promise object
     * @param {Number} sectionId section id
     */
    self.toggleSectionVisibility = function( viewerContextNamespace, deferred, sectionId ) {
        var selectedSection = _sectionIdToSectionObjectMap[ sectionId ];
        if( selectedSection ) {
            selectedSection.getVisible().then(
                function( isVisible ) {
                    selectedSection.setVisible( !isVisible ).then(
                        function() {
                            updateSectionsVisibilityInViewerContext( sectionId, !isVisible );
                            deferred.resolve();
                        },
                        function( errorMessage ) {
                            logger.error( errorMessage );
                            deferred.reject( errorMessage );
                        }
                    );
                },
                function( errorMessage ) {
                    logger.error( errorMessage );
                    deferred.reject( errorMessage );
                }
            );
        } else {
            deferred.resolve();
        }
    };

    /**
     * Modify section
     *
     * @param {String} viewerContextNamespace viewer context namespace
     * @param {Promise} deferred promise object
     * @param {Number} sectionId section id
     * @param {Number} newNormal new normal value
     */
    self.modifySection = function( viewerContextNamespace, deferred, sectionId, newNormal ) {
        var selectedSection = _sectionIdToSectionObjectMap[ sectionId ];
        var newPlaneId = getPlaneIdFromNormal( newNormal );
        if( selectedSection ) {
            var newNormalValArray = mapToVector( newPlaneId, sectionId );
            selectedSection.setNormal( newNormalValArray ).then(
                function() {
                    if( newPlaneId === '4' ) {
                        var customSectionData = _customSectionIdToSectionObjectMap[ sectionId ];

                        if( customSectionData && customSectionData[ self.GEOANALYSIS_SECTION_OFFSET_VALUE ] ) {
                            var convertedOffsetValue =
                                viewerUnitConversionService.convertToMeterFromAnotherUnits( getRoundedNumber( customSectionData[ self.GEOANALYSIS_SECTION_OFFSET_VALUE ] ),
                                    viewerPreferenceService.getDisplayUnit() );
                            selectedSection.setOffset( convertedOffsetValue ).then(
                                function() {
                                    modifySectionData( selectedSection, newPlaneId, sectionId, deferred );
                                },
                                function( errorMessage ) {
                                    logger.error( errorMessage );
                                    deferred.reject( errorMessage );
                                }
                            );
                        } else {
                            modifySectionData( selectedSection, newPlaneId, sectionId, deferred );
                        }
                    } else {
                        modifySectionData( selectedSection, newPlaneId, sectionId, deferred );
                    }
                },
                function( errorMessage ) {
                    logger.error( errorMessage );
                    deferred.reject( errorMessage );
                }
            );
        } else {
            deferred.resolve();
        }
    };

    /**
     * modify section data
     *
     * @param {Object} selectedSection selected section object
     * @param {Number} newPlaneId new value
     * @param {Number} sectionId section id
     * @param {Promise} deferred promise object
     */
    function modifySectionData( selectedSection, newPlaneId, sectionId, deferred ) {
        createSectionObject( selectedSection, newPlaneId, sectionId ).then(
            function( sectionData ) {
                var sectionIndex = 0;
                for( var i = 0; i < _sectionsList.length; i++ ) {
                    if( _sectionsList[ i ].sectionId === sectionId ) {
                        sectionIndex = i;
                        break;
                    }
                }
                modifySectionInViewerContext( sectionId );
                _sectionIdToSectionObjectMap[ sectionData.sectionId ] = selectedSection;
                _sectionsList.splice( sectionIndex, 0, sectionData );
                updateSectionListToViewerContext();
                deferred.resolve();
            },
            function( errorMessage ) {
                logger.error( errorMessage );
                deferred.reject( errorMessage );
            }
        );
    }

    /**
     * Set section offset value
     *
     * @param {String} viewerContextNamespace viewer context namespace
     * @param {Promise} deferred promise object
     * @param {Number} sectionId section id
     * @param {Number} newValue new value
     */
    self.setSectionOffsetValue = function( viewerContextNamespace, deferred, sectionId, newValue ) {
        var selectedSection = _sectionIdToSectionObjectMap[ sectionId ];
        var roundedOffsetValue = getRoundedNumber( newValue );
        var convertedOffsetValue = viewerUnitConversionService.convertToMeterFromAnotherUnits( roundedOffsetValue, viewerPreferenceService.getDisplayUnit() );
        if( selectedSection ) {
            selectedSection.setOffset( convertedOffsetValue ).then(
                function() {
                    updateSectionOffsetInViewerContext( sectionId, roundedOffsetValue );
                    deferred.resolve();
                },
                function( errorMessage ) {
                    logger.error( errorMessage );
                    deferred.reject( errorMessage );
                }
            );
        } else {
            deferred.resolve();
        }
    };

    /**
     * move section offset value
     *
     * @param {String} viewerContextNamespace viewer context namespace
     * @param {Promise} deferred promise object
     * @param {Number} sectionId section id
     * @param {Number} offsetValue new offset value
     */
    self.moveSection = function( viewerContextNamespace, deferred, sectionId, offsetValue ) {
        var selectedSection = _sectionIdToSectionObjectMap[ sectionId ];
        var roundedOffsetValue = getRoundedNumber( offsetValue );
        var convertedOffsetValue = viewerUnitConversionService.convertToMeterFromAnotherUnits( roundedOffsetValue, viewerPreferenceService.getDisplayUnit() );
        if( selectedSection ) {
            selectedSection.quickMove( convertedOffsetValue ).then(
                function() {
                    updateSectionOffsetInViewerContext( sectionId, roundedOffsetValue );
                    deferred.resolve();
                },
                function( errorMessage ) {
                    logger.error( errorMessage );
                    deferred.reject( errorMessage );
                }
            );
        } else {
            deferred.resolve();
        }
    };

    /**
     * Delete all section
     *
     * @param {String} viewerContextNamespace viewer context namespace
     * @param {Promise} deferred promise object
     */
    self.deleteAllSections = function( viewerContextNamespace, deferred ) {
        var allDeleteSectionPromises = [];
        _.forOwn( _sectionIdToSectionObjectMap, function( value ) {
            allDeleteSectionPromises.push( value.delete() );
        } );
        if( allDeleteSectionPromises.length > 0 ) {
            AwPromiseService.instance.all( allDeleteSectionPromises ).then( function() {
                _sectionIdToSectionObjectMap = {};
                _customSectionIdToSectionObjectMap = {};
                _sectionsList.length = 0;
                updateSectionListToViewerContext();
                deferred.resolve();
            }, function( errorMessage ) {
                logger.error( errorMessage );
                deferred.reject( errorMessage );
            } );
        } else {
            _sectionIdToSectionObjectMap = {};
            _customSectionIdToSectionObjectMap = {};
            _sectionsList.length = 0;
            updateSectionListToViewerContext();
            deferred.resolve();
        }
    };

    /**
     * Delete section
     *
     * @param {String} viewerContextNamespace viewer context namespace
     * @param {Promise} deferred object
     * @param {Number} sectionId section id
     */
    self.deleteSection = function( viewerContextNamespace, deferred, sectionId ) {
        var selectedSection = _sectionIdToSectionObjectMap[ sectionId ];
        if( selectedSection ) {
            selectedSection.delete().then(
                function() {
                    deleteSectionFromViewerContext( sectionId );
                    deferred.resolve();
                },
                function( errorMessage ) {
                    logger.error( errorMessage );
                    deferred.reject( errorMessage );
                }
            );
        } else {
            deferred.resolve();
        }
    };

    /**
     * Update clip state  of section
     *
     * @param {String} sectionId section's Id
     * @param {String} clipState new Clipping State
     * @param {Object} deferred promise object
     *
     */
    self.updateClipState = function( sectionId, clipState, deferred ) {
        var selectedSection = _sectionIdToSectionObjectMap[ sectionId ];
        selectedSection.setClipState( clipState ).then( function() {
            updateSectionClipState( sectionId, clipState );
            deferred.resolve();
        } );
    };

    /**
     * This api sets whether capping for cross sections should be drawn
     *
     * @function setCapping
     *
     * @param {String} viewerContextNamespace - registered viewer context name space
     * @param {String} setCapping true if capping will be enabled for cross sections
     * @param {Promise} deferred A promise resolved when the operation is completed
     */
    self.setCapping = function( viewerContextNamespace, setCapping, deferred ) {
        _viewerView.sectionMgr.setCapping( setCapping ).then(
            function() {
                deferred.resolve();
            },
            function( errorMessage ) {
                logger.error( errorMessage );
                deferred.reject( errorMessage );
            }
        );
    };

    /**
     * This api sets whether cut lines for the new cross sections should be drawn
     *
     * @function setGlobalCutLines
     *
     * @param {String} viewerContextNamespace - registered viewer context name space
     * @param {String} setGlobalCutLines true if cut lines will be enabled for the new cross sections
     * @param {Promise} deferred A promise resolved when the operation is completed
     */
    self.setGlobalCutLines = function( viewerContextNamespace, setGlobalCutLines, deferred ) {
        _viewerView.sectionMgr.setGlobalCutLines( setGlobalCutLines ).then(
            function() {
                deferred.resolve();
            },
            function( errorMessage ) {
                logger.error( errorMessage );
                deferred.reject( errorMessage );
            }
        );
    };

    /**
     * This api sets whether the Cut Lines status of the cross section
     *
     * @function setCutLines
     *
     * @param {String} viewerContextNamespace - registered viewer context name space
     * @param {String} setCutLines true if cut lines will be enabled for the new cross sections
     * @param {sectionId} sectionId Section id to be processed
     * @param {Promise} deferred A promise resolved when the operation is completed
     */
    self.setCutLines = function( viewerContextNamespace, setCutLines, sectionId, deferred ) {
        let selectedSection = _sectionIdToSectionObjectMap[ sectionId ];
        let sectionData = self.getSectionDataById( sectionId );
        sectionData[ self.GEOANALYSIS_SECTION_CUT_LINES_STATE ] = setCutLines;
        if( selectedSection ) {
            selectedSection.setCutLines( setCutLines ).then(
                function() {
                    deferred.resolve();
                },
                function( errorMessage ) {
                    logger.error( errorMessage );
                    deferred.reject( errorMessage );
                }
            );
        } else {
            deferred.resolve();
        }
    };

    /**
     * This api returns Cut Lines status of the cross section
     *
     * @function setCutLines
     *
     * @param {String} viewerContextNamespace - registered viewer context name space
     * @param {sectionId} sectionId Section id to be processed
     * @param {Promise} deferred A promise resolved when the operation is completed
     */
    self.getCutLines = function( sectionId, deferred ) {
        var selectedSection = _sectionIdToSectionObjectMap[ sectionId ];
        if( selectedSection ) {
            selectedSection.getCutLines().then(
                function( data ) {
                    deferred.resolve( data );
                },
                function( errorMessage ) {
                    logger.error( errorMessage );
                    deferred.reject( errorMessage );
                }
            );
        } else {
            deferred.resolve();
        }
    };

    /**
     * Update edit section id to viewer context
     * @param {sectionId} sectionId Section id to be processed
     * @param {Promise} deferred A promise resolved when the operation is completed
     */
    self.updateEditSectionIdToViewerContext = function( sectionId, deferred ) {
        _viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( _viewerCtxNamespace, self.GEOANALYSIS_SECTION_NAMESPACE + '.' + self.GEOANALYSIS_EDIT_SECTION_ID, sectionId );
        deferred.resolve();
    };

    /**
     * get edit section id from viewer context
     * @param {Promise} deferred A promise resolved when the operation is completed
     */
    self.getEditSectionId = function( deferred ) {
        let editSectionId = _viewerContextData.getViewerCtxSvc().getViewerApplicationContext( _viewerCtxNamespace, self.GEOANALYSIS_SECTION_NAMESPACE + '.' + self.GEOANALYSIS_EDIT_SECTION_ID );
        deferred.resolve( editSectionId );
        return editSectionId;
    };

    /**
     * clear edit section id in viewer context
     * @param {Promise} deferred A promise resolved when the operation is completed
     */
    self.clearEditSectionId = function( deferred ) {
        _viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( _viewerCtxNamespace, self.GEOANALYSIS_SECTION_NAMESPACE + '.' + self.GEOANALYSIS_EDIT_SECTION_ID, null );
        deferred.resolve();
    };

    /**
     * Reset section list in viewer context
     */
    self.resetSectionListInViewerContext = function() {
        _sectionIdToSectionObjectMap = {};
        _sectionsList.length = 0;
        cleanupGeoAnalysisSection();
    };

    /**
     * @param {String} sectionId section's Id
     * @param {String} newClipState new Clipping State
     */
    function updateSectionClipState( sectionId, newClipState ) {
        for( var i = 0; i < _sectionsList.length; i++ ) {
            var currentSection = _sectionsList[ i ];
            if( currentSection[ self.GEOANALYSIS_SECTION_ID ] === sectionId ) {
                currentSection[ self.GEOANALYSIS_SECTION_CLIP_STATE ] = newClipState;
                updateSectionListToViewerContext();
                break;
            }
        }
    }

    /**
     * Delete section from viewer context
     *
     * @param {Number} sectionId section id to be set
     */
    function deleteSectionFromViewerContext( sectionId ) {
        delete _sectionIdToSectionObjectMap[ sectionId ];
        if( _customSectionIdToSectionObjectMap[ sectionId ] ) {
            delete _customSectionIdToSectionObjectMap[ sectionId ];
        }
        _.remove( _sectionsList, function( currentSection ) {
            return currentSection[ self.GEOANALYSIS_SECTION_ID ] === sectionId;
        } );
        updateSectionListToViewerContext();
    }

    /**
     * Modify section in viewer context
     *
     * @param {Number} sectionId section id to be set
     */
    function modifySectionInViewerContext( sectionId ) {
        delete _sectionIdToSectionObjectMap[ sectionId ];
        _.remove( _sectionsList, function( currentSection ) {
            return currentSection[ self.GEOANALYSIS_SECTION_ID ] === sectionId;
        } );
        updateSectionListToViewerContext();
    }

    /**
     * Update sections offset in viewer context
     *
     * @param {Number} sectionId section id to be set
     * @param {Number} newValue new offset value
     */
    function updateSectionOffsetInViewerContext( sectionId, newValue ) {
        for( var i = 0; i < _sectionsList.length; i++ ) {
            var currentSection = _sectionsList[ i ];
            if( currentSection[ self.GEOANALYSIS_SECTION_ID ] === sectionId ) {
                currentSection[ self.GEOANALYSIS_SECTION_OFFSET_VALUE ] = newValue;
                updateSectionListToViewerContext();
                break;
            }
        }
    }

    /**
     * Update sections selection in viewer context
     *
     * @param {Number} sectionId section id to be set
     * @param {Boolean} isSelected boolean indicating if section is selected or not
     */
    function updateSectionsSelectionInViewerContext( sectionId, isSelected ) {
        for( var i = 0; i < _sectionsList.length; i++ ) {
            var currentSection = _sectionsList[ i ];
            if( currentSection[ self.GEOANALYSIS_SECTION_ID ] === sectionId ) {
                currentSection.selected = isSelected;
                updateSectionListToViewerContext();
                break;
            }
        }
    }

    /**
     * Update sections visibility in viewer
     *
     * @param {Number} sectionId section id to be set
     * @param {Boolean} isVisible boolean indicating if section is visible or not
     */
    function updateSectionsVisibilityInViewerContext( sectionId, isVisible ) {
        for( var i = 0; i < _sectionsList.length; i++ ) {
            var currentSection = _sectionsList[ i ];
            if( currentSection[ self.GEOANALYSIS_SECTION_ID ] === sectionId ) {
                currentSection[ self.GEOANALYSIS_SECTION_VISIBILITY ] = isVisible;
                updateSectionListToViewerContext();
                break;
            }
        }
    }

    /**
     * Map plane string to vector
     *
     * @param {Number} planeId xy, xz, or yz
     * @param {Number} sectionId in case the plane is custom plane. sectionId must be passed to look for vector in _customSectionIdToSectionObjectMap
     * @return {Array} vector x,y,z
     */
    function mapToVector( planeId, sectionId ) {
        switch ( planeId ) {
            case '1':
                return [ 0, 0, 1 ];
            case '2':
                return [ 0, 1, 0 ];
            case '3':
                return [ 1, 0, 0 ];
            case '4':
                return getCustomSectionNormal( sectionId );
        }
    }

    /**
     * Get normal vector for custom plane
     * @param {Number} sectionId in case the plane is custom plane. sectionId must be passed to look for vector in _customSectionIdToSectionObjectMap
     * @return {Array} vector x,y,z
     */
    function getCustomSectionNormal( sectionId ) {
        var customSectionData = _customSectionIdToSectionObjectMap[ sectionId ];
        if( customSectionData ) {
            return customSectionData[ self.GEOANALYSIS_SECTION_NORMAL ];
        }
        return [ 0, 0, 0 ];
    }

    /**
     * Map plane string to offset string
     *
     * @param {Number} planeId plane id
     * @return {String} Offset string
     */
    function getOffsetLabel( planeId ) {
        switch ( planeId ) {
            case '1':
                return getLocalizedText( 'coordinateZ' );
            case '2':
                return getLocalizedText( 'coordinateY' );
            case '3':
                return getLocalizedText( 'coordinateX' );
            default:
                return getLocalizedText( 'custom' );
        }
    }

    /**
     * Map plane string to orientation string
     *
     * @param {Number} planeId plane id
     * @return {String} Orientation plane text
     */
    function getOrientationPlaneLabel( planeId ) {
        switch ( planeId ) {
            case '1':
                return getLocalizedText( 'xy' );
            case '2':
                return getLocalizedText( 'xz' );
            case '3':
                return getLocalizedText( 'yz' );
            default:
                return getLocalizedText( 'custom' );
        }
    }

    /**
     * Map normal string to plane id
     *
     * @param {String} normal plane id
     * @return {String} plane id
     */
    function getPlaneIdFromNormal( normal ) {
        switch ( normal ) {
            case 'XY':
                return '1';
            case 'XZ':
                return '2';
            case 'YZ':
                return '3';
            default:
                return '4';
        }
    }

    /**
     * Map normal vector to plane id
     *
     * @param {Number[]} normalVector normal vector
     * @return {String} plane id
     */
    function getPlaneIdFromNormalVector( normalVector ) {
        if( _.isEqual( normalVector, [ 0, 0, 1 ] ) ) {
            return '1';
        } else if( _.isEqual( normalVector, [ 0, 1, 0 ] ) ) {
            return '2';
        } else if( _.isEqual( normalVector, [ 1, 0, 0 ] ) ) {
            return '3';
        }
        return '4';
    }

    /**
     * Get the localized text for given key
     *
     * @param {String} key Key for localized text
     * @return {String} The localized text
     */
    function getLocalizedText( key ) {
        var localeTextBundle = getLocaleTextBundle();
        return localeTextBundle[ key ];
    }

    /**
     * This method finds and returns an instance for the locale resource.
     *
     * @return {Object} The instance of locale resource if found, null otherwise.
     */
    function getLocaleTextBundle() {
        var resource = 'Awv0threeDViewerMessages';
        var localeTextBundle = localeSvc.getLoadedText( resource );
        if( localeTextBundle ) {
            return localeTextBundle;
        }
        return null;
    }

    /**
     * Returns the Section's Image
     *
     * @param {String} planeId plane id string
     * @return {String} Image of section
     */
    function getSectionImage( planeId ) {
        var img = null;
        switch ( planeId ) {
            case '1':
                img = 'cmdXyPlanar';
                break;
            case '2':
                img = 'cmdZxPlanar';
                break;
            case '3':
                img = 'cmdYzPlanar';
                break;
            case '4':
                img = 'cmdNonOrthogonalSectionPlane';
                break;
            default:
                img = 'SelectFeatures';
        }

        return img;
    }

    /**
     * Get rounded number
     * @param {Number} numberToBeRounded Number to be rounded
     * @return {Number} rounded number
     */
    function getRoundedNumber( numberToBeRounded ) {
        return _.round( numberToBeRounded, 6 );
    }

    /**
     * Calculate the offset percentage
     *
     * @param {Number} lowerBound lower bound
     * @param {Number} upperBound upper bound
     * @param {Number} value offset bound
     * @return {Number} percentage value
     */
    function calculatePercentageValue( lowerBound, upperBound, value ) {
        var lowerBoundVal = getRoundedNumber( lowerBound );
        var upperBoundVal = getRoundedNumber( upperBound );
        var roundedVal = getRoundedNumber( value );

        return parseInt( ( roundedVal - lowerBoundVal ) / ( upperBoundVal - lowerBoundVal ) * 100 );
    }

    /**
     * Create section object
     *
     * @param {Object} sectionObj SectionObject
     * @param {Stirng} planeId section plane id
     * @param {Number} oldSectionID In case of modified section
     * @return {Object} json section object
     */
    function createSectionObject( sectionObj, planeId, oldSectionID ) {
        var promises = [];
        promises.push( sectionObj.getName() );
        promises.push( sectionObj.getOffsetRange() );
        promises.push( sectionObj.getOffset() );
        promises.push( sectionObj.getSelected() );
        promises.push( sectionObj.getVisible() );
        promises.push( sectionObj.getNormal() );
        promises.push( sectionObj.getClipState() );
        promises.push( sectionObj.getCutLines() );
        return AwPromiseService.instance.all( promises ).then( function( values ) {
                var sectionValueJso = {};
                sectionValueJso[ self.GEOANALYSIS_SECTION_ID ] = sectionObj.visObject.resourceID;
                sectionValueJso[ self.GEOANALYSIS_SECTION_OFFSET_LABEL ] = getOffsetLabel( planeId );
                sectionValueJso[ self.GEOANALYSIS_SECTION_PLANE_LABEL ] = getOrientationPlaneLabel( planeId );
                sectionValueJso[ self.GEOANALYSIS_SECTION_OFFSET_THUMBNAIL ] = getSectionImage( planeId );
                sectionValueJso[ self.GEOANALYSIS_SECTION_OFFSET_MIN ] =
                    getRoundedNumber( viewerUnitConversionService.convertToAnotherUnitsFromMeter( values[ 1 ].min, viewerPreferenceService.getDisplayUnit() ) );
                sectionValueJso[ self.GEOANALYSIS_SECTION_OFFSET_MAX ] =
                    getRoundedNumber( viewerUnitConversionService.convertToAnotherUnitsFromMeter( values[ 1 ].max, viewerPreferenceService.getDisplayUnit() ) );
                sectionValueJso[ self.GEOANALYSIS_SECTION_OFFSET_VALUE ] =
                    getRoundedNumber( viewerUnitConversionService.convertToAnotherUnitsFromMeter( values[ 2 ], viewerPreferenceService.getDisplayUnit() ) );
                sectionValueJso[ self.GEOANALYSIS_SECTION_OFFSET_PERCENT_VALUE ] = calculatePercentageValue( values[ 1 ].min, values[ 1 ].max, values[ 2 ] );
                sectionValueJso[ self.GEOANALYSIS_SECTION_ISSELECTED ] = values[ 3 ];
                logger.info( 'Received value is selected from vis server : ' + values[ 3 ] );
                logger.info( 'Received value is selected from vis server : ' + sectionValueJso.selected );

                sectionValueJso[ self.GEOANALYSIS_SECTION_PLANE_SELECTION_ID ] = parseInt( planeId );
                sectionValueJso[ self.GEOANALYSIS_SECTION_PLANE_ICONS_LIST ] = CMDPLANEIMAGES;
                sectionValueJso[ self.GEOANALYSIS_SECTION_CLIP_STATE ] = values[ 6 ];
                sectionValueJso[ self.GEOANALYSIS_SECTION_CLIP_STATE_LIST ] = CLIP_STATES;
                sectionValueJso[ self.GEOANALYSIS_SECTION_CUT_LINES_STATE ] = values[ 7 ];
                var SECTION_PLANES_TO_BE_DISPLAYED = SECTION_PLANES.slice();
                var PLANEIDS_TO_BE_DISPLAYED = PLANEIDS.slice();
                if( !_.includes( PLANEIDS, Number( planeId ) ) ) {
                    PLANEIDS_TO_BE_DISPLAYED.push( Number( planeId ) );
                    SECTION_PLANES_TO_BE_DISPLAYED.push( getLocalizedText( 'custom' ) );
                    sectionValueJso[ self.GEOANALYSIS_SECTION_NORMAL ] = values[ 5 ];
                    _customSectionIdToSectionObjectMap[ sectionObj.visObject.resourceID ] = sectionValueJso;
                } else if(  oldSectionID && _customSectionIdToSectionObjectMap[ oldSectionID ]  || _customSectionIdToSectionObjectMap.hasOwnProperty( sectionObj.visObject.resourceID ) ) {
                    PLANEIDS_TO_BE_DISPLAYED.push( Number( 4 ) );
                    SECTION_PLANES_TO_BE_DISPLAYED.push( getLocalizedText( 'custom' ) );
                }
                sectionValueJso[ self.GEOANALYSIS_SECTION_PLANE_IDS_LIST ] = PLANEIDS_TO_BE_DISPLAYED;
                sectionValueJso[ self.GEOANALYSIS_SECTION_PLANE_NAMES_LIST ] = SECTION_PLANES_TO_BE_DISPLAYED;
                sectionValueJso[ self.GEOANALYSIS_SECTION_VISIBILITY ] = values[ 4 ];
                var errorMessage = getLocalizedText( 'invalidOffsetValueWarning' );
                errorMessage = _.replace( errorMessage, '{0}', _.toString( getRoundedNumber( values[ 1 ].min ) ) );
                errorMessage = _.replace( errorMessage, '{1}', _.toString( getRoundedNumber( values[ 1 ].max ) ) );
                sectionValueJso[ self.GEOANALYSIS_SECTION_ERROR_MESSAGE ] = errorMessage;
                let viewerRenderValue = appCtxService.getCtx( 'viewer.viewerMode' );
                if( viewerRenderValue && viewerRenderValue === 'CSR' ) {
                    let viewerCSROption = viewerPreferenceService.getViewerCSRPref();
                    if( viewerCSROption && viewerCSROption === 'PVW' && sectionObj.visObject.pvwObject && sectionObj.visObject.pvwObject._listeners.length === 0 ) {
                        sectionObj.addListener( sectionPlaneChangeListener );
                    }
                }
                return sectionValueJso;
            },
            function( error ) {
                logger.error( error );
            } );
    }

    /**
     * Update section list to viewer context
     */
    function updateSectionListToViewerContext() {
        _viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( _viewerCtxNamespace, self.GEOANALYSIS_SECTION_NAMESPACE + '.' + self.GEOANALYSIS_SECTION_LIST, _sectionsList );
    }

    /**
     * Clean up section entry from viewer context
     */
    function cleanupGeoAnalysisSection() {
        let viewerCtx = appCtxService.getCtx( _viewerCtxNamespace );
        delete viewerCtx[ self.GEOANALYSIS_SECTION_NAMESPACE ];
        appCtxService.updatePartialCtx( _viewerCtxNamespace, viewerCtx );
        _viewerContextData.getViewerCtxSvc().updateViewerApplicationContext( viewerCtxNamespace, 'enableSectionCommandPanel', false );
        if( _sectionListenerFlag !== false ) {
            _viewerView.sectionMgr.removeListener( viewerSectionListener );
            _sectionListenerFlag = false;
        }
    }

    var sectionPlaneChangeListener = {
        onPlanePositionChange: function( val ) {
            eventBus.publish( 'geoanalysis.sectionPlanePosition', {
                val: getRoundedNumber( viewerUnitConversionService.convertToAnotherUnitsFromMeter( val, viewerPreferenceService.getDisplayUnit() ) )
            } );
        },
        onPlaneSelectionChange: function( isSelected ) {
            var sectionId = this.visObject.resourceID;
            deselectExistingSections();
            updateSectionsSelectionInViewerContext( sectionId, isSelected );
            eventBus.publish( 'geoanalysis.getAllSectionsAction', {} );
        }
    };
};

/**
 * This service is used to get viewerSectionManager
 * @param {Promise} $q promise api
 * @param {Object} localeSvc locale service
 * @return {Object} Exposed Apis
 */

export default exports = {
    getViewerSectionManager
};
app.factory( 'viewerSectionManagerProvider', () => exports );
