// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/alternatesService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import ClipboardService from 'js/clipboardService';
import adapterSvc from 'js/adapterService';
import appCtxSvc from 'js/appCtxService';
import localeService from 'js/localeService';
import messagingService from 'js/messagingService';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Creates the ViewModelObject from the input selected object uid
 * @param {DeclViewModel} data - ViewModel data from ps0AddAlternateViewModel
 * @param {string} selectedObjects - uid of the adapted object on which the alternate will be added/removed.
 */
var updatePrimarySelectionFromSelectedObject = function( data, selectedObjects ) {
    if( appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TreeView' ) {
        data.primarySelection = appCtxSvc.ctx.selected;
    } else {
        var selectedUid = appCtxSvc.ctx.xrtSummaryContextObject.uid;
        var selected = cdm.getObject( selectedUid );
        data.primarySelection = selected;
    }

    data.selectedObject = tcViewModelObjectService.createViewModelObjectById( selectedObjects, 'EDIT' );
};

/**
 * Process the input for SOA addAlternate and publish the "addAlternate" event
 * @param {DeclViewModel} data - ViewModel data from ps0AddAlternateViewModel
 * @param {string} selectedObjects - uid of the adapted object on which the alternate will be added.
 */
export let addSelectionsAsAlternate = function( data, selectedObjects ) {
    updatePrimarySelectionFromSelectedObject( data, selectedObjects );

    data.alternates = [];
    data.alternateObjectsToAdd = [];
    var srcObj = {};
    if( typeof data.createdMainObject === 'undefined' || data.createdMainObject === null ) {
        for( var itr = 0, len = data.sourceObjects.length; itr < len; ++itr ) {
            srcObj = {};
            srcObj.uid = data.sourceObjects[ itr ].uid;
            srcObj.type = data.sourceObjects[ itr ].type;
            data.alternates.push( srcObj );
            data.alternateObjectsToAdd.push( data.sourceObjects[ itr ] );
        }
    } else {
        srcObj = {};
        srcObj.uid = data.createdMainObject.uid;
        srcObj.type = data.createdMainObject.type;
        data.alternates.push( srcObj );
        data.alternateObjectsToAdd.push( data.createdMainObject );
    }
    eventBus.publish( 'addAlternate' );
};

var getMessageString = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        if( msgObj.msg.length > 0 ) {
            msgObj.msg += '<BR/>';
        }
        msgObj.msg += object.message;
        msgObj.level = _.max( [ msgObj.level, object.level ] );
    } );
};

export let processPartialErrors = function( serviceData ) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if( serviceData.partialErrors ) {
        _.forEach( serviceData.partialErrors, function( partialError ) {
            getMessageString( partialError.errorValues, msgObj );
        } );
    }

    return msgObj.msg;
};

/**
 * Process the input and calls removeAlternates SOA
 * @param {ViewModelObject} selectedAlternates - ViewModel data of the Alternate object to be removed.
 * @param {String} selectedObjects - uid of the adapted object from which Alternate object will be removed.
 */
export let removeAlternates = function( selectedAlternates, selectedObjects ) {
    ClipboardService.instance.setContents( selectedAlternates );

    var deferred = AwPromiseService.instance.defer();
    var data = {};
    updatePrimarySelectionFromSelectedObject( data, selectedObjects );

    var alternates = [];
    for( var itr = 0, len = selectedAlternates.length; itr < len; ++itr ) {
        var srcObj = {};
        srcObj.uid = selectedAlternates[ itr ].uid;
        srcObj.type = selectedAlternates[ itr ].type;
        alternates.push( srcObj );
    }

    var soaInput = {};
    soaInput.element = {};
    soaInput.element.uid = data.selectedObject.uid;
    soaInput.element.type = data.selectedObject.type;
    soaInput.alternatesToBeRemoved = alternates;
    soaSvc.postUnchecked( 'Internal-AWS2-2018-05-GlobalAlternate', 'removeAlternates', soaInput ).then(
        function( response ) {
            deferred.resolve();
            if( response.plain ) {
                var eventData = {};
                eventData.relations = '';
                eventData.relatedModified = [];
                eventData.relatedModified[ 0 ] = data.primarySelection;
                eventData.refreshLocationFlag = true;
                eventBus.publish( 'cdm.relatedModified', eventData );
                soaSvc.post( 'Core-2007-01-DataManagement', 'refreshObjects', {
                    objects: [ data.selectedObject, data.primarySelection ]
                } );
            }
            if( response.partialErrors ) {
                var msg = exports.processPartialErrors( response );

                var resource = 'PSMessages';
                var localeTextBundle = localeService.getLoadedText( resource );
                var errorMessage = msg;
                if( selectedAlternates.length !== 1 && response.plain ) {
                    errorMessage = localeTextBundle.removeAlternateMultipleFailureMessage;
                    errorMessage = errorMessage.replace( '{0}', response.plain.length );
                    errorMessage = errorMessage.replace( '{1}', alternates.length );
                    errorMessage = errorMessage.replace( '{2}', msg );
                }
                messagingService.showError( errorMessage );
            }
        } );

    return deferred.promise;
};

export let showListOfGlobalAlternates = function( vmoHovered, data ) {
    if( vmoHovered && vmoHovered.props.awb0HasAlternates ) {
        data.globalAltObjects = [];
        var globalAlternatesList = vmoHovered.props.awb0HasAlternates.displayValues;
        var globalAltArray = [];
        globalAltArray = globalAlternatesList[ 0 ].split( ',#NL#' );
        //Populate tooltip objects
        var objectsToPush = [];
        for( var i = 0; i < ( globalAltArray.length > 4 ? 4 : globalAltArray.length ); i++ ) {
            objectsToPush.push( JSON.parse( JSON.stringify( data.globalAlternates ) ) );

            objectsToPush[ i ].globalAlt.uiValue = globalAltArray[ i ];
        }
        data.globalAltObjects = objectsToPush;

        //  Update tooltip label with number of overridden contexts
        var alternateLabel = data.i18n.globalAlternateLabel;
        alternateLabel = alternateLabel.replace( '{0}', globalAltArray.length );
        data.globalAlternateLabel.propertyDisplayName = alternateLabel;

        //update tooltip link for more data
        if( globalAltArray.length > 4 ) {
            var tooltipText = data.i18n.tooltipLinkText;
            tooltipText = tooltipText.replace( '{0}', globalAltArray.length - 4 );
            data.moreGlobalAlternates.uiValue = tooltipText;
            data.enableMoreGlobalAlternates.dbValue = true;
        }
        return data.globalAltObjects;
    }
};

export default exports = {
    addSelectionsAsAlternate,
    processPartialErrors,
    removeAlternates,
    showListOfGlobalAlternates
};
app.factory( 'alternatesService', () => exports );
