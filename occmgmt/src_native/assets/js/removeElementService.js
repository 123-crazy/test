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
 * Creates an array of uids and types for the RemoveElement soa call
 *
 * @module js/removeElementService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import ClipboardService from 'js/clipboardService';
import cdm from 'soa/kernel/clientDataModel';
import occmgmtStateHandler from 'js/occurrenceManagementStateHandler';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import TypeDisplayNameService from 'js/typeDisplayName.service';
import awDataNavigatorService from 'js/awDataNavigatorService';

var exports = {};

export let performPostRemoveAction = function( removedElementUIDs, operationName ) {
    var removedObjects = [];

    _.forEach( removedElementUIDs, function( removedElementUID ) {
        var removedObject = appCtxSvc.ctx.mselected.filter( function( selected ) {
            return selected.uid === removedElementUID;
        } );
        removedObjects.push.apply( removedObjects, removedObject );
    } );

    //Get underlying object and store them in clipboard
    var contextObj = removedObjects.filter( function( obj ) {
        return cdm.getObject( obj.props.awb0UnderlyingObject.dbValues[0] ) !== null;
    } ).map( function( obj ) {
        return obj.props.awb0UnderlyingObject.dbValues[0];
    } );

    if ( contextObj.length > 0 ) {
        ClipboardService.instance.setContents( contextObj );
    }

    //Deselect removed elements from selection model
    eventBus.publish( 'aceElementsDeSelectedEvent', {
        elementsToDeselect: removedObjects
    } );

    if ( removedObjects.length > 0 ) {
        //publish elements removed from PWA
        eventBus.publish( 'ace.elementsRemoved', {
            removedObjects: removedObjects,
            viewToReact: appCtxSvc.ctx.aceActiveContext.key,
            operationName: operationName
        } );
    }
};

export let getRemovedElements = function( serviceData ) {
    var mselected = appCtxSvc.ctx.mselected.map( function( obj ) {
        return obj.uid;
    } );
    if ( appCtxSvc.ctx.aceActiveContext.context.isMarkupEnabled && serviceData.updated ) {
        var mergedResponse = serviceData.deleted ? serviceData.updated.concat( serviceData.deleted ) : serviceData.updated;
        return _.intersection( mergedResponse, mselected );
    }
    return _.intersection( serviceData.deleted, mselected );
};

export let processPartialErrors = function( serviceData ) {
    var name = [];
    var msgObj = {
        name: '',
        msg: '',
        level: 0
    };

    if ( serviceData.partialErrors && appCtxSvc.ctx.mselected.length === 1 ) {
        name.push( appCtxSvc.ctx.mselected[0].props.awb0UnderlyingObject.uiValues[0] );
        msgObj.name += name[0];
        for ( var x = 0; x < serviceData.partialErrors[0].errorValues.length; x++ ) {
            msgObj.msg += serviceData.partialErrors[0].errorValues[x].message;
            msgObj.msg += '<BR/>';
        }
        msgObj.level = _.max( [ msgObj.level, serviceData.partialErrors[0].errorValues[0].level ] );
    }

    return msgObj;
};

export let getDisplayNamesForRemoveLevel = function( selectedElement ) {
    var displayNames = [];
    displayNames.push( TypeDisplayNameService.instance.getDisplayName( selectedElement ) );
    var parentElem = cdm.getObject( selectedElement.props.awb0Parent.dbValues[0] );
    displayNames.push( TypeDisplayNameService.instance.getDisplayName( parentElem ) );
    return displayNames;
};

export let performPostRemoveLevelAction = function( removeLevelResponse, operationName ) {

    var mselected = appCtxSvc.ctx.mselected.map( function( obj ) {
        return obj.uid;
    } );

    var removedElementUIDs = _.intersection( removeLevelResponse.ServiceData.deleted, mselected );
    exports.performPostRemoveAction( removedElementUIDs, operationName );

    var parentElemsInResponse = removeLevelResponse.childOccurrencesInfo[0];
    var childOccurences = removeLevelResponse.childOccurrencesInfo[1];

    for ( var inx = 0; inx < parentElemsInResponse.length; ++inx ) {
        var addElementResponse = {};
        var selectedNewElementInfo = {
            newElements: []
        };
        for ( var i = 0; i < removeLevelResponse.ServiceData.created.length; ++i ) {
            var childOccInx = _.findLastIndex( childOccurences[inx], function( childOccurrence ) {
                return childOccurrence.occurrenceId === removeLevelResponse.ServiceData.created[i];
            } );
            if ( childOccInx > -1 ) {
                var newElement = cdm.getObject( removeLevelResponse.ServiceData.created[i] );
                selectedNewElementInfo.newElements.push( newElement );
            }
        }
        selectedNewElementInfo.pagedOccurrencesInfo = {
            childOccurrences: childOccurences[inx]
        };
        addElementResponse = {
            selectedNewElementInfo: selectedNewElementInfo,
            ServiceData: removeLevelResponse.ServiceData

        };
        if ( inx === parentElemsInResponse.length - 1 ) {
            addElementResponse.newElementInfos = removeLevelResponse.newElementInfos;
        }
        var eventData = {
            updatedParentElement: parentElemsInResponse[inx],
            addElementResponse: addElementResponse,
            viewToReact: appCtxSvc.ctx.aceActiveContext.key
        };

        eventBus.publish( 'addElement.elementsAdded', eventData );
        var eventDataForSelection = {
            objectsToSelect :selectedNewElementInfo.newElements
        };
        eventBus.publish( 'aceElementsSelectionUpdatedEvent', eventDataForSelection );
    }
};

export let getRemoveElements2Input = function( selectedObjects ) {
    let input = [];
    const activeCtxKey = appCtxSvc.ctx.aceActiveContext.key;
    for( let index = 0; index < selectedObjects.length; index++ ) {
        let productInfo = awDataNavigatorService.getProductInfoForCurrentSelection( selectedObjects[index], activeCtxKey );
        let removeElement2Input = {
            element: {
                uid: selectedObjects[ index ].uid,
                type: selectedObjects[ index ].type
            },
            productContextInfo: {
                uid: productInfo.newPci_uid,
                type: "Awb0ProductContextInfo"
            }
        };
        input.push( removeElement2Input );
    }
    return input;
};

/**
 * Remove Element service utility
 */

export default exports = {
    performPostRemoveAction,
    getRemovedElements,
    processPartialErrors,
    performPostRemoveLevelAction,
    getDisplayNamesForRemoveLevel,
    getRemoveElements2Input
};
app.factory( 'removeElementService', () => exports );
