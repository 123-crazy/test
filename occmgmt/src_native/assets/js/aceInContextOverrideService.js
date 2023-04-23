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
 * @module js/aceInContextOverrideService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import adapterSvc from 'js/adapterService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var _editStartHandlerListener = null;

var exports = {};

/**
 * Subscribe to treeNodesLoadedEvent and apply VMO states correctly.
 */
function _subscribeToTreeNodesLoadedEvent() {
    if( !_editStartHandlerListener ) {
        _editStartHandlerListener = eventBus.subscribe( 'editHandlerStateChange', function( context ) {
            if( !_.isEmpty( appCtxService.ctx.aceActiveContext ) && appCtxService.ctx.aceActiveContext.context.vmc ) {
                if( _.isEqual( appCtxService.ctx.aceActiveContext.context.vmc.name, context.dataSource.name ) ) {
                    var loadedVMOs = appCtxService.ctx.aceActiveContext.context.vmc.loadedVMObjects;

                    //Set suppressed for in-context edit on all lines
                    for( var ndx = 0; ndx < loadedVMOs.length; ndx++ ) {
                        if( loadedVMOs[ ndx ].isGreyedOutElement || loadedVMOs[ ndx ].isInContextOverrideSet ) {
                            loadedVMOs[ ndx ].setEditableStates( false );
                        }
                    }
                }
            }
        } );
    }
}

/**
 * Unsubscribe to events when In-Context mode is toggled off
 */
export let cleanUpInContextOverrides = function() {
    _toggleOffInContextOverrideMode();
    if( _editStartHandlerListener ) {
        eventBus.unsubscribe( _editStartHandlerListener );
        _editStartHandlerListener = null;
    }
    var toParams = {
        incontext_uid: null
    };
    contextStateMgmtService.updateContextState( appCtxService.ctx.aceActiveContext.key, toParams, true );
    eventBus.publish( 'overridenContextChanged' );
};

/**
 * Set Greyed Out State
 * @param {ViewModelObjectArray} vmosToBeGreyedOut : Objects to be set in Greyed Out State
 */
function _setVMOsInGreyedOutState( vmosToBeGreyedOut ) {
    for( var ndx = 0; ndx < vmosToBeGreyedOut.length; ndx++ ) {
        vmosToBeGreyedOut[ ndx ].isGreyedOutElement = true;
        //vmosToBeGreyedOut[ndx].setEditableStates( false ); -- need to validate if we need this
    }
}

/**
 * Set Supressed State
 * @param {ViewModelObject} vmoToApplyContextOverrideOn:
 */
function _setInContextOverrideOnProvidedAssembly( vmoToApplyContextOverrideOn, contextKey ) {
    var begNdx = -1;
    var nDelete = 0;
    var loadedVMOs = appCtxService.ctx[ contextKey ].vmc.loadedVMObjects;

    _setVMOsInGreyedOutState( loadedVMOs );

    //Set inContextOveride on VMO under action.
    vmoToApplyContextOverrideOn.isInContextOverrideSet = true;

    //Delete isGreyedOutElement property on VMO under action and all its children.
    delete vmoToApplyContextOverrideOn.isGreyedOutElement;

    for( var ndx = 0; ndx < loadedVMOs.length; ndx++ ) {
        if( loadedVMOs[ ndx ].id === vmoToApplyContextOverrideOn.id ) {
            begNdx = ndx + 1;
            nDelete = 0;
        } else if( begNdx >= 0 ) {
            if( loadedVMOs[ ndx ].levelNdx > vmoToApplyContextOverrideOn.levelNdx ) {
                nDelete++;
            } else {
                break;
            }
        }
    }

    for( ndx = 0; ndx < nDelete; ndx++ ) {
        delete loadedVMOs[ begNdx + ndx ].isGreyedOutElement;
    }

    var newState = {};
    newState.incontext_uid = vmoToApplyContextOverrideOn.uid;
    contextStateMgmtService.updateContextState( contextKey, newState, true );
}

/**
 * Toggle Off In-Context Override
 */
function _toggleOffInContextOverrideMode() {
    var loadedVMOs = appCtxService.ctx.aceActiveContext.context.vmc.loadedVMObjects;
    for( var ndx = 0; ndx < loadedVMOs.length; ndx++ ) {
        delete loadedVMOs[ ndx ].isGreyedOutElement;
    }
    eventBus.publish( 'reRenderTableOnClient' );
}

/**
 * Parent Assembly on wich "Set In-Context" is applied
 * @returns {ViewModelObject} on which "Set In-Context" is applied
 */
function _getCurrentContextOverridenVMO() {
    var loadedVMOs = appCtxService.ctx.aceActiveContext.context.vmc.loadedVMObjects;
    return loadedVMOs.filter( function( vmo ) { return vmo.isInContextOverrideSet; } )[ 0 ];
}

export let initialize = function() {
    _subscribeToTreeNodesLoadedEvent();
};

export let applyInContextOverrideStatesOnNewlyLoadedObjectsInTree = function( contextKey, eventData ) {
    var incontext_uid = appCtxService.ctx[ contextKey ].currentState.incontext_uid;

    if( eventData.treeLoadResult && eventData.treeLoadResult.parentNode.isGreyedOutElement ) {
        _setVMOsInGreyedOutState( eventData.treeLoadResult.childNodes );
    }

    if( incontext_uid ) {
        var vmoIdToApplyContextOverrideOn = appCtxService.ctx[ contextKey ].vmc.findViewModelObjectById( incontext_uid );
        if( vmoIdToApplyContextOverrideOn !== -1 ) {
            var loadedVMOs = appCtxService.ctx[ contextKey ].vmc.loadedVMObjects;
            var vmoToApplyContextOverrideOn = loadedVMOs[ vmoIdToApplyContextOverrideOn ];

            _subscribeToTreeNodesLoadedEvent();
            _setInContextOverrideOnProvidedAssembly( vmoToApplyContextOverrideOn, contextKey );
            eventBus.publish( 'overridenContextChanged' );
        }
    }
};

export let getOverridenContextParent = function( data ) {
    if( data.contextKeyObject && data.contextKeyObject.currentState && data.contextKeyObject.currentState.incontext_uid ) {
        var inContextObj = cdm.getObject( data.contextKeyObject.currentState.incontext_uid );
        if( inContextObj && inContextObj.props.object_string ) {
            data.overridenContextParentElem = {
                isNull : false,
                uiValue : inContextObj.props.object_string.dbValues[ 0 ],
                dbValue : inContextObj.props.object_string.dbValues[ 0 ]
            };
        }
    }
};

export let toggleInContextOverrideOnSelectedParentAssemblyInTreeView = function() {
    var vmoIdToApplyContextOverrideOn = appCtxService.ctx.aceActiveContext.context.vmc.findViewModelObjectById( appCtxService.ctx.selected.uid );

    if( vmoIdToApplyContextOverrideOn !== -1 ) {
        var loadedVMOs = appCtxService.ctx.aceActiveContext.context.vmc.loadedVMObjects;
        var vmoToApplyContextOverrideOn = loadedVMOs[ vmoIdToApplyContextOverrideOn ];
        var currentContextOverridenVMO = _getCurrentContextOverridenVMO();

        if( currentContextOverridenVMO ) {
            delete currentContextOverridenVMO.isInContextOverrideSet;
        }

        var eventData = { incontext_uid: vmoToApplyContextOverrideOn.uid };

        eventBus.publish( 'StartSaveAutoBookmarkEvent', eventData );
        //Set In-Context Override is like toggle. If it is applied on same VMO, it should as as cleanup.
        if( currentContextOverridenVMO && _.isEqual( currentContextOverridenVMO.id, vmoToApplyContextOverrideOn.id ) ) {
            exports.cleanUpInContextOverrides();
            return;
        }

        _subscribeToTreeNodesLoadedEvent();
        _setInContextOverrideOnProvidedAssembly( vmoToApplyContextOverrideOn, appCtxService.ctx.aceActiveContext.key );
        eventBus.publish( 'reRenderTableOnClient' );
        eventBus.publish( 'overridenContextChanged' );
    }
};

export let toggleOffInContextOverrideInTreeView = function() {
    var incontext_uid = appCtxService.ctx.aceActiveContext.context.currentState.incontext_uid;
    var eventData = { incontext_uid: incontext_uid };
    eventBus.publish( 'StartSaveAutoBookmarkEvent', eventData );
    exports.cleanUpInContextOverrides();
};

export let getSecondaryObjects = function() {
    var secondaryObjects = [];
    _.forEach( appCtxService.ctx.mselected, function( obj ) {
        secondaryObjects.push( {
            type: obj.type,
            uid: obj.uid
        } );
    } );
    return secondaryObjects;
};

export let getInContextOverrides = function( vmoHovered, data ) {
    if( vmoHovered && vmoHovered.props.awb0OverriddenProperties && vmoHovered.props.awb0OverrideContexts ) {
        data.tooltipObjects = [];
        var overriddenProps = vmoHovered.props.awb0OverriddenProperties.displayValues;
        var contextsForOverrides = vmoHovered.props.awb0OverrideContexts.dbValues;
        var commaSeparatedPropNames = [];

        //Remove duplicate context values
        const uniqueArray = Array.from( new Set( contextsForOverrides ) );

        //Create comma separated property names against each unique context
        _.forEach( uniqueArray, function( context ) {
            var indexes = [];
            var propertiesForEachContext = [];
            for( var i = 0; i < contextsForOverrides.length; i++ ) {
                if( contextsForOverrides[ i ] === context ) { indexes.push( i ); }
            }
            _.forEach( indexes, function( index ) {
                propertiesForEachContext.push( overriddenProps[ index ] );
            } );
            propertiesForEachContext = propertiesForEachContext.join( ', ' );
            commaSeparatedPropNames.push( propertiesForEachContext );
        } );

        //Populate tooltip objects
        var objectsToPush = [];
        for( var i = 0; i < ( uniqueArray.length > 4 ? 4 : uniqueArray.length ); i++ ) {
            objectsToPush.push( JSON.parse( JSON.stringify( data.overrideInfoObjects ) ) );

            objectsToPush[ i ].contextValue.uiValue = uniqueArray[ i ];
            objectsToPush[ i ].contextValue.propertyDisplayName = data.i18n.contextTitle;
            objectsToPush[ i ].propertyValue.uiValue = commaSeparatedPropNames[ i ];
            objectsToPush[ i ].propertyValue.propertyDisplayName = data.i18n.properties;
        }
        data.tooltipObjects = objectsToPush;

        //  Update tooltip label with number of overridden contexts
        var overridesLabel = data.i18n.overridesLabel;
        overridesLabel = overridesLabel.replace( '{0}', uniqueArray.length );
        data.overrideText.propertyDisplayName = overridesLabel;

        //update tooltip link for more data
        if( uniqueArray.length > 4 ) {
            var tooltipText = data.i18n.tooltipLinkText;
            tooltipText = tooltipText.replace( '{0}', uniqueArray.length - 4 );
            data.moreOverrides.uiValue = tooltipText;
            data.enableOverrides.dbValue = true;
        }
        return data.tooltipObjects;
    }
};

/**
 * Removes property override for the property of vmo hovered
 */
export let removePropertyOverride = function() {
    var RemoveInContextOverrides = appCtxService.getCtx( 'aceActiveContext.context.removeOverrideInputData' );
    var _hoveredModelObject = cdm.getObject( RemoveInContextOverrides.removeInContextOverridesInfo.element.uid );
    RemoveInContextOverrides.removeInContextOverridesInfo.element = {
        uid: _hoveredModelObject.uid,
        type: _hoveredModelObject.type
    };
    return soaSvc.post( 'Internal-ActiveWorkspaceBom-2019-12-OccurrenceManagement', 'removeInContextPropertyOverride', RemoveInContextOverrides ).then(
        function( response ) {
            eventBus.publish( 'awPopupWidget.close' );
            return response;
        } );
};

export let adaptedRelatedModifiedInput = function() {
    return adapterSvc.getAdaptedObjectsSync( [ appCtxService.ctx.pselected ] );
};

export let removeAttachment = function() {
    if ( appCtxService.ctx.aceActiveContext.attachmentContext ) {
        delete appCtxService.ctx.aceActiveContext.attachmentContext;
    }
    var swaSelectionContext = appCtxService.getCtx( 'aceActiveContext.context.swaSelectionContext' );
    if( swaSelectionContext ) {
        var selectedObjects = swaSelectionContext.dataProvider.getSelectedObjects();
        for( var selectedObject of selectedObjects ) {
            if( selectedObject.props.awb0Context && selectedObject.props.awb0Context.dbValues[ 0 ] !== '' ) {
                appCtxService.updatePartialCtx( 'aceActiveContext.attachmentContext', 'removeOverride' );
                break;
            }
        }
    }
};

export let postRemoveAttachmentCleanupAction = function() {
    if ( appCtxService.ctx.aceActiveContext.attachmentContext ) {
        delete appCtxService.ctx.aceActiveContext.attachmentContext;
    }
};


export default exports = {
    cleanUpInContextOverrides,
    initialize,
    applyInContextOverrideStatesOnNewlyLoadedObjectsInTree,
    getOverridenContextParent,
    toggleInContextOverrideOnSelectedParentAssemblyInTreeView,
    toggleOffInContextOverrideInTreeView,
    getSecondaryObjects,
    getInContextOverrides,
    removePropertyOverride,
    adaptedRelatedModifiedInput,
    removeAttachment,
    postRemoveAttachmentCleanupAction
};
/**
 * @memberof NgServices
 * @member aceInContextOverrideService
 */
app.factory( 'aceInContextOverrideService', () => exports );
