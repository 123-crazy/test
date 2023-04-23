// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aceViewTypesService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';

var exports = {};

var setViewType = function( eventData ) {
    eventBus.publish( 'awViewType.ValueChanged', eventData );
    eventBus.publish( 'awPopupWidget.close' );
};

export let selectViewType = function( data ) {
    if( data.dataProviders.getViewTypes.viewModelCollection.loadedVMObjects.length > 0 ) {
        //Find index of View Type and select it
        var indexOfCurrentViewType = data.dataProviders.getViewTypes.viewModelCollection.loadedVMObjects
            .map( function( x ) {
                return x.uid;
            } ).indexOf( data.contextKeyObject.productContextInfo.props.awb0ViewType.dbValues[ 0 ] );
        if( indexOfCurrentViewType >= 0 ) {
            data.dataProviders.getViewTypes.changeObjectsSelection( indexOfCurrentViewType,
                indexOfCurrentViewType, true );
        }
    }
};

export let updateViewType = function( eventData, data ) {
    if( data.contextKeyObject.productContextInfo.props.awb0ViewType.dbValues[ 0 ] && eventData.selectedObjects.length > 0 ) {
        if( data.contextKeyObject.productContextInfo.props.awb0ViewType.dbValues[ 0 ] !== eventData.selectedObjects[ 0 ].uid ) {
            eventData.viewType = eventData.selectedObjects[ 0 ].uid;
            setViewType( {
                selectedObject: eventData.selectedObjects[ 0 ],
                viewKey: data.viewKey,
                viewType: eventData.viewType
            } );
        }
    } else {
        // Handle Current view type selected
        eventBus.publish( 'awPopupWidget.close' );
    }
};

export let updateCurrentViewTypes = function( data, eventData ) {
    if( data && data.currentViewType ) {
        data.currentViewType = eventData.selectedObject;
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture', 'VIEW_TYPE_CHANGE' );
    }
};

export default exports = {
    selectViewType,
    updateViewType,
    updateCurrentViewTypes
};

app.factory( 'aceViewTypesService', () => exports );
/**
 * Return this service name as the 'moduleServiceNameToInject' property.
 */
