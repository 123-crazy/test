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
 * @module js/aceArrangementsService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/contextStateMgmtService';
import uwPropertyService from 'js/uwPropertyService';
import aceStructureConfigurationService from 'js/aceStructureConfigurationService';
import appCtxSvc from 'js/appCtxService';

var exports = {};

var setArrangement = function( eventData ) {
    eventBus.publish( 'awArrangementPanel.arrangementChanged', eventData );
    eventBus.publish( 'awPopupWidget.close' );
};

export let selectArrangement = function( data ) {
    if( data.dataProviders.getArrangements.viewModelCollection.loadedVMObjects.length > 0 ) {
        //Find index of Arrangement and select it
        var indexOfCurrentArrangement = data.dataProviders.getArrangements.viewModelCollection.loadedVMObjects
            .map( function( x ) {
                return x.uid;
            } ).indexOf( data.contextKeyObject.productContextInfo.props.awb0AppliedArrangement.dbValues[ 0 ] );
        if( indexOfCurrentArrangement >= 0 ) {
            data.dataProviders.getArrangements.changeObjectsSelection( indexOfCurrentArrangement,
                indexOfCurrentArrangement, true );
        }
    }
};

export let updateArrangement = function( eventData, data ) {
    if( data.contextKeyObject.productContextInfo.props.awb0AppliedArrangement.dbValues[ 0 ] && eventData.selectedObjects.length > 0 ) {
        if( data.contextKeyObject.productContextInfo.props.awb0AppliedArrangement.dbValues[ 0 ] !== eventData.selectedObjects[ 0 ].uid ) {
            eventData.arrangement = eventData.selectedObjects[ 0 ].uid;
            setArrangement( {
                selectedObject: eventData.selectedObjects[ 0 ],
                viewKey: data.viewKey
            } );
        }
    } else { // Handle Current Arrangement selected
        eventBus.publish( 'awPopupWidget.close' );
    }
};

export let updateCurrentArrangement = function( data, eventData ) {
    if( data && data.currentArrangement ) {
        data.currentArrangement = eventData.selectedObject.props.object_string;
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture', 'ARRANGEMENT_CHANGE' );
    }
};

var populateCurrentArrangement = function( data ) {
    var currentArrangement = data.contextKeyObject.productContextInfo.props.awb0AppliedArrangement;
    if( currentArrangement ) {
        data.currentArrangement = uwPropertyService.createViewModelProperty( currentArrangement.dbValues[ 0 ],
            currentArrangement.uiValues[ 0 ], 'STRING', currentArrangement.dbValues[ 0 ], currentArrangement.uiValues );
}
};

export let initializeArrangementConfigurationInfo = function( data ) {
    if( data ) {
        aceStructureConfigurationService.populateContextKey( data );
        if( data.contextKeyObject && data.contextKeyObject.productContextInfo ) {
            populateCurrentArrangement( data );
        }
    }
};

export default exports = {
    selectArrangement,
    updateArrangement,
    updateCurrentArrangement,
    initializeArrangementConfigurationInfo
};

app.factory( 'aceArrangementsService', () => exports );
/**
 * Return this service name as the 'moduleServiceNameToInject' property.
 */
