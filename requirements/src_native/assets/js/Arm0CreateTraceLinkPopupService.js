// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Arm0CreateTraceLinkPopupService
 */
import app from 'app';
import { popupService } from 'js/popupService';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import localStrg from 'js/localStorage';
import cdm from 'soa/kernel/clientDataModel';
import reqUtils from 'js/requirementsUtils';

import popupUtils from 'js/popupUtils';
import { DOMAPIs as dom } from 'js/domUtils';
import reqTracelinkService from 'js/requirementsTracelinkService';

var exports = {};

var _popupRef;

var _sideNavEventSub;
var _locationCompleteEventSub;
var _loadingTracelinkPopup = false;

/**
 * Show popup
 * @param {Object} popupData - data to open popup panel
 */
export let showTracelinkPopup = function( popupData ) {
    if ( _loadingTracelinkPopup || !appCtxService.ctx.CreateTraceLinkPopupCtx && _popupRef && _popupRef.panelEl ) {
        // Don't process the call if panel loading is in process Or panel is initiated but context is not yet updated
        return;
    }
    if ( !appCtxService.ctx.CreateTraceLinkPopupCtx && ( !_popupRef || !_popupRef.panelEl ) ) {
        //Takes selection from matrix if matrix is open and any cell is selected
        if ( appCtxService.ctx && appCtxService.ctx.Arm0TraceabilityMatrixSelectedCell ) {
            getSelectionFromMatrix();
        }
        _loadingTracelinkPopup = true;
        // check if aw_toolsAndInfo panel is already opened
        var ref = '#aw_toolsAndInfo';
        var referenceEl = popupUtils.getElement( popupUtils.extendSelector( ref ) );
        if ( referenceEl && referenceEl.offsetHeight > 0 ) {
            popupData.options.reference = '#aw_toolsAndInfo';
        }
        popupService.show( popupData ).then( function( popupRef ) {
            _popupRef = popupRef;
            _loadingTracelinkPopup = false;
            eventBus.publish( 'Arm0CreateTraceLinkPopup.reveal' );
            _sideNavEventSub = eventBus.subscribe( 'awsidenav.openClose', function( eventData ) {
                if ( eventData && eventData.id === 'aw_toolsAndInfo' ) {
                    setTimeout( function() {
                        exports.updatePopupPosition();
                    }, 300 );
                }
            } );

            _locationCompleteEventSub = eventBus.subscribe( 'LOCATION_CHANGE_COMPLETE', function() {
                setTimeout( function() {
                    exports.updatePopupPosition();
                }, 300 );
            } );
        } );
    } else {
        exports.unRegisterLocalStorageAndClosePopup();
    }
};

/**
 * Takes selection from Matrix cell to display on tracelink popup
 */
var getSelectionFromMatrix = function() {
    var sourceModelObjects = [];
    var destModelObjects = [];
    var objArray = [];
    if ( appCtxService.ctx.Arm0TraceabilityMatrixSelectedCell.rowUid ) {
        var sourceObjUids = appCtxService.ctx.Arm0TraceabilityMatrixSelectedCell.rowUid;
        for ( var i = 0; i < sourceObjUids.length; i++ ) {
            objArray.push( {
                uid: sourceObjUids[i]
            } );
        }
    }
    if ( appCtxService.ctx.Arm0TraceabilityMatrixSelectedCell.colUid ) {
        var destObjUids = appCtxService.ctx.Arm0TraceabilityMatrixSelectedCell.colUid;
        for ( var j = 0; j < destObjUids.length; j++ ) {
            objArray.push( {
                uid: destObjUids[j]
            } );
        }
    }
    var cellProp = [ 'awp0CellProperties', 'awb0UnderlyingObject' ];
    reqUtils.loadModelObjects( objArray, cellProp ).then( function( response ) {
        if ( appCtxService.ctx.Arm0TraceabilityMatrixSelectedCell.rowUid ) {
            var sourceObjUids = appCtxService.ctx.Arm0TraceabilityMatrixSelectedCell.rowUid;
            for ( var i = 0; i < sourceObjUids.length; i++ ) {
                var obj1 = cdm.getObject( sourceObjUids[i] );
                sourceModelObjects.push( obj1 );
            }
        }
        if ( appCtxService.ctx.Arm0TraceabilityMatrixSelectedCell.colUid ) {
            var destObjUids = appCtxService.ctx.Arm0TraceabilityMatrixSelectedCell.colUid;
            for ( var j = 0; j < destObjUids.length; j++ ) {
                var obj2 = cdm.getObject( destObjUids[j] );
                destModelObjects.push( obj2 );
            }
        }
        if ( sourceModelObjects.length === 1 || destModelObjects.length === 1 ) {
            var context = {
                sourceObject: sourceModelObjects,
                destObject: destModelObjects
            };
        } else {
            context = null;
        }
        if ( context ) {
            appCtxService.registerCtx( 'rmTracelinkPanelContext', context );
        }
    } );
};

/**
 * Open Tracelink popup panel
 */
export let openTracelinkPopup = function( context ) {
    if ( context ) {
        appCtxService.registerCtx( 'rmTracelinkPanelContext', context );
    }
    exports.showTracelinkPopup( {
        declView: 'Arm0CreateTraceLink',
        locals: {
            anchor: 'arm0_create_tracelink_popup'
        },
        options: {
            reference: '.aw-layout-infoCommandbar',
            isModal: false,
            placement: 'left-end',
            width: 320,
            height: 410,
            draggable: true,
            detachMode: true,
            disableClose: true
        }
    } );
};

/**
 * Update Popup position
 */
export let updatePopupPosition = function() {
    var ref = '#aw_toolsAndInfo';
    var referenceEl = popupUtils.getElement( popupUtils.extendSelector( ref ) );
    if ( !referenceEl ) {
        return;
    }
    if ( referenceEl.offsetHeight <= 0 ) {
        ref = '.aw-layout-infoCommandbar';
        referenceEl = popupUtils.getElement( popupUtils.extendSelector( '.aw-layout-infoCommandbar' ) );
    }
    if ( referenceEl ) {
        var options = _popupRef.options;
        options.userOptions.reference = ref;
        options.reference = referenceEl;
        popupService.update( _popupRef );
    }
};

/**
 *
 */
export let unRegisterLocalStorageAndClosePopup = function( data ) {
    _.defer( function() {
        localStrg.removeItem( 'CreateTraceLinkPopup' );
        appCtxService.unRegisterCtx( 'CreateTraceLinkPopupCtx' );
        appCtxService.unRegisterCtx( 'rmTracelinkPanelContext' );
        eventBus.unsubscribe( _sideNavEventSub );
        eventBus.unsubscribe( _locationCompleteEventSub );

        // TODO - need to pass data from commandsViewModel
        if ( data && data.startItems ) {
            var objects = [];
            if ( data.startItems && data.startItems.dbValue.length > 0 ) {
                objects = objects.concat( data.startItems.dbValue );
            }
            if ( data.endItems && data.endItems.dbValue.length > 0 ) {
                objects = objects.concat( data.endItems.dbValue );
            }
            exports.removeObjectReferences( objects );
        }

        _popupRef.options.disableClose = false;
        popupService.hide( _popupRef );
    } );
};

/**
 * Update tracelink popup data in local storage
 * @returns {Object} object which contains start and end objects
 */
export let getLocalStorageData = function() {
    return localStrg.get( 'CreateTraceLinkPopup' );
};

/**
 * Remove reference from objects, so that those objects will be free to remove from cache on page change
 * @param {Array} objects - start and end objects
 */
export let removeObjectReferences = function( objects ) {
    objects.forEach( function( obj ) {
        if ( _.isFunction( obj.removeReference ) ) {
            obj.removeReference();
        }
    } );
};

/**
 * Update tracelink popup data in local storage
 * @param {Object} data - object which contains start and end objects
 */
export let updateLocalStorageData = function( data ) {
    // No need to update if popup is not opened
    if ( !appCtxService.ctx.CreateTraceLinkPopupCtx ) {
        return;
    }

    if ( data ) {
        var objects = [];
        if ( data.startItems && data.startItems.dbValue.length > 0 ) {
            objects = objects.concat( data.startItems.dbValue );
        }
        if ( data.endItems && data.endItems.dbValue.length > 0 ) {
            objects = objects.concat( data.endItems.dbValue );
        }

        // Add reference to the object so that it will not getting clean when new page is loaded
        objects.forEach( function( obj ) {
            if ( _.isFunction( obj.removeReference ) ) {
                obj.removeReference();
            }
        } );

        // Add reference to the object so that it will not getting clean when new page is loaded
        objects.forEach( function( obj ) {
            if ( _.isFunction( obj.addReference ) ) {
                obj.addReference();
            }
        } );
    }

    if ( data && data.startItems && data.endItems ) {
        var starts = _.map( data.startItems.dbValue, 'uid' );
        var ends = _.map( data.endItems.dbValue, 'uid' );
        var trceLinkType = data.traceLinkType;
        var obj = {
            startItems: starts,
            endItems: ends,
            traceLinkType:trceLinkType
        };
        var jsonStr = JSON.stringify( obj );

        localStrg.publish( 'CreateTraceLinkPopup', jsonStr );
        localStrg.publish( 'CreateTraceLinkPopupAWSession', localStrg.get( 'awSession' ) );
         //Update the height of the Create TraceLink PopUp
         exports.updateHeight();
    }
};

export let updateHeight = function() {
    if( _popupRef && _popupRef.panelEl ) {
        var el = dom.get( 'div.aw-layout-panelContent', _popupRef.panelEl );
        el.style.height = '100%';
        el.style.maxHeight = document.children[0].clientHeight - 84 + 'px';
    }
};

export let setTracelinkIcon = function( viewModelCollection ) {
    viewModelCollection.loadedVMObjects.forEach( function( vmo ) {
        vmo.tracelinkTitle = reqTracelinkService.getToggleType( vmo );
        if( vmo.tracelinkTitle === 'Switch to Occurrence' ) {
            vmo.tracelinkIcon = 'CreateOccurrence';
            vmo.cellHeader1 = reqTracelinkService.getCellHeader( vmo );
        } else if( vmo.tracelinkTitle === 'Switch to Revision' ) {
            vmo.tracelinkIcon = 'CreateRevision';
            vmo.cellProperties = {};
            vmo.cellHeader1 = reqTracelinkService.getCellHeader( vmo );
        }
    } );
};

export let toggleType = function( vmo ) {
    reqTracelinkService.setToggleType( vmo );
    var viewModelCollection = {
        loadedVMObjects: [ vmo ]
    };
    exports.setTracelinkIcon( viewModelCollection );
};

/* Function to create hint label showed on tracelink panel
*
* @param {Object} data - view model object data
*/
export let createDropTracelinkHintLabel = function( data ) {
    var label = data.i18n.dropTracelinkHintLabel.split( '{0}' );
    data.dropTracelinkHintLabel1 = label[0];
    data.dropTracelinkHintLabel2 = label[1];
};

export default exports = {
    showTracelinkPopup,
    openTracelinkPopup,
    updatePopupPosition,
    unRegisterLocalStorageAndClosePopup,
    getLocalStorageData,
    removeObjectReferences,
    updateLocalStorageData,
    updateHeight,
    setTracelinkIcon,
    toggleType,
    createDropTracelinkHintLabel
};
/**
 * Create Trace Link popup service utility
 *
 * @memberof NgServices
 * @member Arm0CreateTraceLinkPopupService
 */
app.factory( 'Arm0CreateTraceLinkPopupService', () => exports );
