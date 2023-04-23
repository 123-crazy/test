// Copyright (c) 2020 Siemens

/**
 * Defines {@link NgServices.aw.navigateBreadCrumbService} which provides the data for navigation bread crumb from url.
 *
 * @module js/aw.navigateBreadCrumbService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import dms from 'soa/dataManagementService';
import AwStateService from 'js/awStateService';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import localeService from 'js/localeService';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import logger from 'js/logger';

var exports = {};

var _selectionCountLabel;
var _dataCountLabel;

/**
 * Build Skeleton for bread crumb
 *
 * @param {Object|null} provider - bread crumb provider
 * @return {Object} provider
 */
export let buildBreadcrumbProviderSkeleton = function( provider ) {
    if( !provider ) {
        provider = {
            crumbs: [],
            clear: function() {
                exports.setCrumbs( [] );
            },
            onSelect: function( crumb ) {
                exports.addOrRemoveCrumb( crumb.internalName );
            }
        };
    }

    return provider;
};

/**
 * read url and build the model object crumb list
 *
 * @param {String} breadcrumbId - bread crumb ID
 * @return {Object} promise
 */
export let readUrlForCrumbs = function( breadcrumbId, readSelection ) {
    var modelObjectList = {};
    var absentModelObjectData = [];

    // filter it out with URL params
    var bcParams = AwStateService.instance.params[ breadcrumbId ];

    var selId;
    if( readSelection ) {
        selId = AwStateService.instance.params.s_uid;
    }

    if( bcParams ) {
        var docId = bcParams.split( '^' );

        if( selId ) {
            docId.push( selId );
        }

        // this is for d_uids
        if( docId && docId.length ) {
            docId.forEach( function( element ) {
                modelObjectList[ element ] = '';
            } );
        }

        $.each( modelObjectList, function( key ) {
            var modelObject = cdm.getObject( key );
            if( modelObject ) {
                modelObjectList[ modelObject.uid ] = modelObject;
            } else {
                absentModelObjectData.push( key );
            }
        } );

        if( absentModelObjectData && absentModelObjectData.length ) {
            return dms.loadObjects( absentModelObjectData ).then( function( serviceData ) {
                for( var i = 0; i < absentModelObjectData.length; i++ ) {
                    var modelObject = serviceData.modelObjects[ absentModelObjectData[ i ] ];
                    modelObjectList[ absentModelObjectData[ i ] ] = modelObject;
                }
                return modelObjectList;
            }, function() {
                logger.error( 'SOA error :: cannot load objects.' );
            } );
        }
    }

    return AwPromiseService.instance.resolve( modelObjectList );
};

export let generateCrumb = function( displayName, showChevron, selected, selectedUid ) {
    return {
        displayName: displayName,
        showArrow: showChevron,
        selectedCrumb: selected,
        scopedUid: selectedUid,
        clicked: false
    };
};

export let buildDefaultCrumbs = function( breadCrumbMap ) {
    var crumbsList = [];
    $.each( breadCrumbMap, function( key, val ) {
        var crumb = exports.generateCrumb( val, true, false, key );
        crumbsList.push( crumb );
    } );

    if( crumbsList.length > 0 ) {
        crumbsList[ crumbsList.length - 1 ].showArrow = false;
        crumbsList[ crumbsList.length - 1 ].selectedCrumb = true;
    }
    return crumbsList;
};

export let buildBreadcrumbUrl = function( bcId, selectedUid, navigate ) {
    var bcParams = AwStateService.instance.params[ bcId ];
    var selParams;
    if( navigate ) {
        if( bcParams ) {
            if( selectedUid !== null ) {
                bcParams = bcParams.split( '|' )[ 0 ];
                if( bcParams.indexOf( selectedUid ) !== -1 ) {
                    bcParams = bcParams.split( selectedUid )[ 0 ] + selectedUid;
                } else {
                    const clickedChevronContext = appCtxService.getCtx( bcId + 'Chevron' );
                    const parentUid = clickedChevronContext.scopedUid;
                    if( bcParams.indexOf( parentUid ) !== -1 ) {
                        bcParams = bcParams.split( parentUid )[ 0 ] + parentUid + '^' + selectedUid;
                    }
                }
            }
        } else {
            var selectedModelObj = appCtxService.getCtx( 'selected' );
            if( selectedModelObj ) {
                bcParams = selectedModelObj.uid;
            }
        }
        AwStateService.instance.params[ bcId ] = bcParams;
    } else {
        const clickedChevronContext = appCtxService.getCtx( bcId + 'Chevron' );
        if( clickedChevronContext ) {
            const parentUid = clickedChevronContext.scopedUid;
            if( bcParams.indexOf( parentUid ) !== -1 ) {
                bcParams = bcParams.split( parentUid )[ 0 ] + parentUid;
            }
            AwStateService.instance.params[ bcId ] = bcParams;
        }
        // if some object is already selected, and we selected some diff. object

        selParams = AwStateService.instance.params.s_uid = selectedUid;
    }

    if( bcParams || selParams ) {
        AwStateService.instance.go( '.', AwStateService.instance.params );
        eventBus.publish( 'navigateBreadcrumb.refresh', bcId );
    }
};

/**
 * Retrive base crumb
 *
 * @param {Number} totalFound - total number of objects found
 * @param {Object[]} selectedObjects - array of selected objects
 * @param {Boolean} pwaMultiSelectEnabled - primary workarea multi selection enabled/disabled
 * @return {Promise} base bread crumb
 */
export let getBaseCrumb = async function( totalFound, selectedObjects, pwaMultiSelectEnabled ) {
    var newBreadcrumb = {
        clicked: false,
        selectedCrumb: true,
        showArrow: false
    };
    _selectionCountLabel = await localeService.getLocalizedTextFromKey( 'XRTMessages.selectionCountLabel' );
    _dataCountLabel = await localeService.getLocalizedTextFromKey( 'XRTMessages.dataCount' );
    if( pwaMultiSelectEnabled ) {
        newBreadcrumb.displayName = _selectionCountLabel.format( selectedObjects.length, _dataCountLabel.format( totalFound ) );
    } else {
        // simple count otherwise
        newBreadcrumb.displayName = _dataCountLabel.format( totalFound );
    }
    return newBreadcrumb;
};

/**
 * Retrive primary crumb
 *
 * @return {Object} primary crumb object
 */
export let getPrimaryCrumb = function() {
    var obj = cdm.getObject( AwStateService.instance.params.uid );
    return {
        clicked: false,
        displayName: obj.props.object_string.uiValues[ 0 ],
        scopedUid: obj.uid,
        selectedCrumb: false,
        showArrow: true,
        primaryCrumb: true
    };
};

/**
 * Ensures object string property loaded
 *
 * @param {String[]} uidsToLoad - array of uids to load
 * @return {Promise} A promise is return which resolves after 'object_string' properties are loaded
 */
export let ensureObjectString = function( uidsToLoad ) {
    if( !exports.ensureObjectString.loadPromise ) {
        // One at most will trigger server call
        exports.ensureObjectString.loadPromise = dms.loadObjects( uidsToLoad ).then( function() {
            return dms.getProperties( uidsToLoad, [ 'object_string' ] );
        } ).then( function() {
            exports.ensureObjectString.loadPromise = null;
        } );
    }
    return exports.ensureObjectString.loadPromise;
};

/**
 * Sublocation specific override to build breadcrumb
 *
 * @function buildNavigateBreadcrumb
 * @memberOf NgControllers.NativeSubLocationCtrl
 *
 * @param {String} totalFound - Total number of results in PWA
 * @param {Object[]} selectedObjects - Selected objects
 * @return {Object} bread crumb provider
 */
export let buildNavigateBreadcrumb = function( totalFound, selectedObjects ) {
    var pwaSelectionInfo = appCtxService.getCtx( 'pwaSelectionInfo' );

    // If total found is not set show loading message
    var baseCrumb;
    if( totalFound === undefined ) {
        baseCrumb = {
            clicked: false,
            selectedCrumb: true,
            showArrow: false
        };

        localeService.getLocalizedText( 'BaseMessages', 'LOADING_TEXT' ).then(
            function( msg ) {
                baseCrumb.displayName = msg;
            } );
        return {
            crumbs: [ baseCrumb ]
        };
    }

    var provider = {
        crumbs: [ exports.getPrimaryCrumb() ]
    };

    var missingObjectCrumbs = [];

    if( AwStateService.instance.params.d_uids ) {
        provider.crumbs = provider.crumbs.concat( AwStateService.instance.params.d_uids.split( '^' ).map(
            function( key, index ) {
                var crumb = {
                    clicked: false,
                    displayName: key,
                    index: selectedObjects && selectedObjects.length === 1 && selectedObjects[ 0 ].alternateID ? index + 1 : null,
                    scopedUid: key,
                    scopedAlternateId: selectedObjects && selectedObjects.length === 1 && selectedObjects[ 0 ].alternateID ? getAlternateId( selectedObjects[ 0 ], index ) : null,
                    selectedCrumb: false,
                    showArrow: true
                };

                var obj = cdm.getObject( key );
                if( obj && obj.props.object_string ) {
                    crumb.displayName = obj.props.object_string.uiValues[ 0 ];
                } else {
                    missingObjectCrumbs.push( crumb );
                }

                return crumb;
            } ) );
    }

    if( pwaSelectionInfo.currentSelectedCount === 1 ) {
        var vmo = selectedObjects[ 0 ];

        var crumb = {
            clicked: false,
            displayName: vmo.props && vmo.props.object_string ? vmo.props.object_string.uiValues[ 0 ] : vmo.uid,
            scopedUid: vmo.uid,
            scopedAlternateId: vmo.alternateID ? vmo.alternateID : null,
            selectedCrumb: false,
            showArrow: true
        };

        if( !vmo.props ) {
            missingObjectCrumbs.push( crumb );
        }

        provider.crumbs.push( crumb );
    }

    // Get the object_string
    exports.ensureObjectString( missingObjectCrumbs.map( function( crumb ) {
            return crumb.scopedUid;
        } ).filter( function( uid ) {
            return uid;
        } ) ) //
        .then( function() {
            // Update with the actual string title instead of uid
            missingObjectCrumbs.map( function( crumb ) {
                var obj = cdm.getObject( crumb.scopedUid );
                if( obj && obj.props.object_string ) {
                    crumb.displayName = obj.props.object_string.uiValues[ 0 ];
                }
            } );
        } );

    var lastCrumb = provider.crumbs[ provider.crumbs.length - 1 ];
    var lastObj = cdm.getObject( lastCrumb.scopedUid );

    // Don't show last crumb as link
    lastCrumb.selectedCrumb = true;

    // If the last object is not a folder leave the arrow
    if( !lastObj || lastObj.modelType.typeHierarchyArray.indexOf( 'Folder' ) === -1 ) {
        lastCrumb.showArrow = false;
    }

    exports.getBaseCrumb( totalFound, selectedObjects, pwaSelectionInfo.multiSelectEnabled ).then( ( resp ) => {
        baseCrumb = resp;
        if( baseCrumb && baseCrumb.displayName ) {
            var d_uids = AwStateService.instance.params.d_uids;
            var currentFolderUid = AwStateService.instance.params.uid;

            if( d_uids ) {
                var d_uidsArray = d_uids.split( '^' );
                if( d_uidsArray.length > 0 ) {
                    currentFolderUid = _.last( d_uidsArray );
                }
            }

            if( provider.crumbs.length >= 2 ) {
                if( lastCrumb.showArrow && lastCrumb.scopedUid === currentFolderUid ) {
                    lastCrumb.objectsCountDisplay = ' (' + baseCrumb.displayName + ')';
                } else {
                    var secondLastCrumb = provider.crumbs[ provider.crumbs.length - 2 ];
                    if( secondLastCrumb.showArrow && secondLastCrumb.scopedUid === currentFolderUid ) {
                        secondLastCrumb.objectsCountDisplay = ' (' + baseCrumb.displayName + ')';
                    }
                }
            } else {
                lastCrumb.objectsCountDisplay = ' (' + baseCrumb.displayName + ')';
            }
        }
    } );

    return provider;
};

const getAlternateId = ( selectedObject, index ) => {
    var uids = selectedObject.alternateID.split( ',' ).reverse();
    return uids.slice( 0, index + 2 ).reverse().join( ',' );
};

/**
 * Functionality to trigger after selecting bread crumb
 *
 * @param {Object} crumb - selected bread crumb object
 */
export let onSelectCrumb = function( crumb ) {
    if( AwStateService.instance.params.d_uids ) {
        var d_uids = AwStateService.instance.params.d_uids.split( '^' );
        var uidIdx = d_uids.indexOf( crumb.scopedUid );

        var d_uidsParam = '';
        var s_uidParam = '';

        if( crumb.scopedAlternateId ) {
            d_uidsParam = crumb.index !== -1 ? d_uids.slice( 0, crumb.index ).join( '^' ) : null;
            s_uidParam = crumb.scopedAlternateId;
        } else {
            d_uidsParam = uidIdx !== -1 ? d_uids.slice( 0, uidIdx + 1 ).join( '^' ) : null;
            s_uidParam = d_uidsParam ? d_uids.slice( 0, uidIdx + 1 ).slice( -1 )[ 0 ] : AwStateService.instance.params.uid;
        }

        AwStateService.instance.go( '.', {
            d_uids: d_uidsParam,
            s_uid: s_uidParam
        } );
    } else if( AwStateService.instance.params.s_uid ) {
        //Clear selection if in base folder
        AwStateService.instance.go( '.', {
            s_uid: null
        } );
    }
};

exports = {
    buildBreadcrumbProviderSkeleton,
    readUrlForCrumbs,
    generateCrumb,
    buildDefaultCrumbs,
    buildBreadcrumbUrl,
    getBaseCrumb,
    getPrimaryCrumb,
    ensureObjectString,
    buildNavigateBreadcrumb,
    onSelectCrumb
};
export default exports;
/**
 * Service to manage navigate bread crumb
 *
 * @class commandService
 * @param contributionService {Object} - Contribution service
 * @memberOf NgServices
 */
/**
 * form a crumb
 *
 * @function generateCrumb
 * @memberOf NgServices
 * @param {String} displayName - display name
 * @param {Boolean} showChevron - show chevron?
 * @param {Boolean} selected - selected?
 * @param {String} selectedUid - selected UID
 * @return {Object} crumb
 */
/**
 * build default crumbs
 *
 * @function buildDefaultCrumbs
 * @memberOf NgServices
 * @param {Object} breadCrumbMap - bread crumb map
 * @return {Object} crumbsList
 */
/**
 * build the bread crumb url
 *
 * @function buildBreadcrumbUrl
 * @memberOf NgServices
 * @param {String} bcId
 * @param {String} selectedUid
 * @param {Boolean} navigate
 * @param {Boolean} selected
 */
app.factory( 'aw.navigateBreadCrumbService', () => exports );
