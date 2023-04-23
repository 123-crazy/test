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
 * @module js/reuseRequirementService
 */
import eventBus from 'js/eventBus';
import app from 'app';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import awTableSvc from 'js/awTableService';
import { popupService } from 'js/popupService';
import $ from 'jquery';
import iconService from 'js/iconService';
import browserUtils from 'js/browserUtils';
import fmsUtils from 'js/fmsUtils';
import ckeditorOperations from 'js/ckeditorOperations';
import soaSvc from 'soa/kernel/soaService';
import messagingService from 'js/messagingService';
import AwPromiseService from 'js/awPromiseService';
var exports = {};

var objPropsMap = {};
var latestFullTextData = {};
var largePopupRef;
var _loadingWidePopup = false;
let subscriptions = [];
var _data = null;
var isFrozen = false;


/*
 * Get create input
 *
 * @param {Object} data - The panel's view model object
 */
export let getCreateInput = function( data ) {
    var inputObject = _getInputObject();
    var propertyNameValues = {
        object_name: [ data.name.dbValue ],
        object_desc: [ data.desc.dbValue ]
    };
    return [ {
        boName: inputObject.type,
        propertyNameValues: propertyNameValues,
        compoundCreateInput: {}
    } ];
};

/*
 * Freeze selected objects
 *@param {appCtx} ctx the application context
 *@param {Object} data - The panel's view model object
 */
export let freezeObject = function( data, ctx ) {
    data.operationType = "FREEZE";

    //if multiselected objects
    if( ctx.mselected.length > 1 ) {

        //get map of masterRevId and SRUid of selected derived object
        let masterIdSRUid = new Map();
        masterIdSRUid = ckeditorOperations.getMapOfMasterIdSRUid(ctx, data);

        //get map of SRUid of selected derived object and Fulltext of master object
        var SRUidFulltext = [];
        SRUidFulltext = getMapOfSRUidFulltext(masterIdSRUid, data);

        var reuseFinalInput = {};
        reuseFinalInput.inputs = [];
        for( var index = 0; index < SRUidFulltext.length; index++ ) {
            var reuseInput = {
                operationType: "FREEZE",
                inputCtxt: {},
                isDeep: false,
                isRunInBackground: false,
                options: {}
            };
            reuseInput.selectedElements = [ cdm.getObject( SRUidFulltext[ index ].SRID ) ];
            var fulltextUid = SRUidFulltext[ index ].fulltextId;
            reuseInput.dataset = cdm.getObject( fulltextUid );
            reuseInput.datasetVersion = -1;
            reuseFinalInput.inputs.push( reuseInput );
        }
        isFrozen = true;
        callreuseSpecification( reuseFinalInput, ctx, data );
    } else {
        eventBus.publish( 'Arm0FreezeRevision.FreezeSingleSelected' );
    }

};

/*
 * Get map of SRUid of selected derived object and Fulltext of master object
 *@param {Object} masterIdSRUid
 *@param {Object} data - The panel's view model object
 */
var getMapOfSRUidFulltext = function(masterIdSRUid, data) {
    //create map of SRUid of selected derived object and Fulltext of master object
    var SRUidFulltext = [];
    for( var i = 0; i < data.requirementId.length; i++ ) {
        var SRIdFulltext = {};
        var SRID = masterIdSRUid.get( data.requirementId[ i ] );
        var fulltextId = data.masterIdFulltext.get( data.requirementId[ i ] );
        SRIdFulltext.SRID = SRID;
        SRIdFulltext.fulltextId = fulltextId;
        SRUidFulltext.push( SRIdFulltext );
    }
    return SRUidFulltext;
};

/*
 * Unfreeze selected objects
 *@param {appCtx} ctx the application context
 */
export let unfreezeObject = function( ctx ) {

    var unfreezeInput = {
        inputs: [ {
            operationType: "UNFREEZE",
            selectedElements: ctx.mselected,
            inputCtxt: {},
            isDeep: false,
            isRunInBackground: false,
            options: {},
            datasetVersion: 0
        } ]
    };
    var isOperationPerformedFromCkeditor = appCtxService.getCtx('operationPerformedFromCkeditor');
    if(isOperationPerformedFromCkeditor){
        unfreezeInput.inputs[0].selectedElements = ctx.rmselected;
    }
    isFrozen = false;
    callreuseSpecification( unfreezeInput, ctx, null );
};

/*
 *Overwrite selected objects
 *@param {appCtx} ctx the application context
 */
 export let overwriteObject = function( ctx ) {

    var  overwriteInput = {
        inputs: [ {
            operationType: "OVERWRITE",
            selectedElements: ctx.mselected,
            inputCtxt: {},
            isDeep: false,
            isRunInBackground: false,
            options: {},
            datasetVersion: 0
        } ]
    };
    var isOperationPerformedFromCkeditor = appCtxService.getCtx('operationPerformedFromCkeditor');
    if(isOperationPerformedFromCkeditor){
        overwriteInput.inputs[0].selectedElements = ctx.rmselected;
    }
    callreuseSpecification( overwriteInput, ctx, null );
};

/*
* Call reuseSpecification SOA
*@param {Object} reuseInput - Input for SOA
*@param {appCtx} ctx the application context
*@param {Object} data - The panel's view model object
 */
var callreuseSpecification = function( reuseInput, ctx, data ) {
    var deferred = AwPromiseService.instance.defer();
    var promise = soaSvc.post( 'Internal-ActiveWorkspaceReqMgmt-2019-06-SpecNavigation',
        'reuseSpecification', reuseInput );
    promise.then( function( response ) {
            if( response ) {
                if( reuseInput.inputs[ 0 ].operationType === "OVERWRITE" ) {
                    eventBus.publish("requirementDocumentation.closeExistingBalloonPopup");
                    ckeditorOperations.makeRequirementEditable( ctx );
                    if(ctx.rmselected[0].uid ===  ctx.mselected[0].uid){
                        appCtxService.registerCtx( 'isDeriveCommandVisible', false);
                        appCtxService.registerCtx( 'hideUnfreezeCommand', true);
                    }
                    appCtxService.unRegisterCtx('operationPerformedFromCkeditor');
                    deferred.resolve( response );
                } else {
                    //create input for exportToApplication soa
                    var selectedDerivedRev = ckeditorOperations.getSelectedDerivedObject( ctx );

                    callexportAppSoa( selectedDerivedRev, ctx, data );
                    deferred.resolve( response );
                }
            }
        } )
        .catch( function( error ) {
            var errMsg = messagingService.getSOAErrorMessage( error );
            messagingService.showWarning( errMsg );
            deferred.reject( error );
        } );
};
/*
* Call exportToApplication3 SOA
*@param {Object} selectedDerivedRev - revision id's of selected derived object
*@param {appCtx} ctx - the application context
*@param {Object} data - The panel's view model object
 */
var callexportAppSoa = function( selectedDerivedRev, ctx, data ) {
    var baseUrl = getFmsBaseURL();
    var exportInput = {
        input: [ {
            templateName: '',
            applicationFormat: 'HTML',
            objectsToExport: selectedDerivedRev,
            targetObjectsToExport: [],
            exportOptions: [ {
                option: 'base_url',
                optionvalue: baseUrl
            } ],
            recipeSourceObjects: [],
            recipeTargetObjects: [],
            attributesToExport: [],
            objectTemplateInputs: [],
            includeAttachments: false
        } ]
    };
    var deferred = AwPromiseService.instance.defer();
    var promise = soaSvc.post( 'Internal-AWS2-2017-06-RequirementsManagement',
        'exportToApplication3', exportInput );
    promise.then( function( result ) {

            //get selected SRUid to update its content
            var selectedSRid = ckeditorOperations.getSRIdOfSelected(ctx);
            updateContents(selectedSRid,result);
        } )
        .catch( function( error ) {
            var errMsg = messagingService.getSOAErrorMessage( error );
            messagingService.showWarning( errMsg );
            deferred.reject( error );
        } );
};

/*
*Update contents after freeze/unfreeze operation
*@param {Object} selectedSRid - SRid's of selected derived objects
*@param {result} data - updated contents
 */
var updateContents = function(selectedSRid,result) {
    var attrsToRemove = [];
    var attrsToAdd = [];
    var isFrozenToLatestRev = false;
    if( result.transientFileReadTickets && result.transientFileReadTickets.length ) {
        if( isFrozen ) {
            attrsToAdd.push( getAttributeObject( 'isFrozen', 'true' ) );
            isFrozenToLatestRev =true;
            appCtxService.registerCtx( 'hideUnfreezeCommand', false);
        } else {
            attrsToRemove.push( getAttributeObject( 'isFrozen', 'true' ) );
            attrsToRemove.push( getAttributeObject( 'isMasterChanged', 'true' ) );
            if(appCtxService.ctx.rmselected[0].uid ===  appCtxService.ctx.mselected[0].uid){
                appCtxService.registerCtx( 'hideUnfreezeCommand', true);
            }
        }
        appCtxService.registerCtx( 'isDeriveCommandVisible', true);
        for( let index = 0; index < result.transientFileReadTickets.length; index++ ) {
            var contentDivElement = document.createElement( 'div' );
            contentDivElement.innerHTML = result.transientFileReadTickets[ index ];
            var bodytext = contentDivElement.getElementsByClassName( 'aw-requirement-bodytext' );
            ckeditorOperations.updateBodyTextContentAndAttributes( bodytext[ 0 ].innerHTML, selectedSRid[ index ].SRUid, attrsToAdd, attrsToRemove, false, isFrozenToLatestRev );
        }
        eventBus.publish( 'showActionPopup.close' );
        eventBus.publish( 'Arm0FreezeRevision.hidePopupPanel' );
        appCtxService.unRegisterCtx('operationPerformedFromCkeditor');
    }
};

/*
 * Get operation type
 *
 * @param {Object} data - The panel's view model object
 */
export let getOperationType = function( data ) {
    //Register flag in context for reuse/ derive scenario
    appCtxService.registerCtx( 'isReuseDeriveInProgress', true );
    var operationType = '';
    if( data.reuseOptions.dbValue ) {
        operationType = 'CREATECOPY';
    } else {
        operationType = 'DERIVED';
    }
    return operationType;
};
/*
 * Get selected element
 *
 */
export let getSelectedElements = function() {
    var lastParent = _getInputObject();
    var selectedObj = {
        uid: lastParent.uid,
        type: lastParent.type
    };
    return [ selectedObj ];
};
var _getInputObject = function() {
    var selectObj = appCtxService.ctx.selected;
    var lastParent = selectObj;
    while( selectObj ) {
        var parentModelObject = null;
        if( selectObj.modelType && selectObj.modelType.typeHierarchyArray && ( selectObj.modelType.typeHierarchyArray.indexOf( 'Arm0RequirementElement' ) > -1 || selectObj.modelType.typeHierarchyArray.indexOf( 'Arm0ParagraphElement' ) > -1 || selectObj.modelType.typeHierarchyArray.indexOf( 'Arm0RequirementSpecElement' ) > -1 ) ) {
            lastParent = selectObj;
        }
        if( selectObj && selectObj.props && selectObj.props.awb0Parent && selectObj.props.awb0Parent.dbValues[ 0 ] ) {
            var parentObjUID = selectObj.props.awb0Parent.dbValues[ 0 ];
            parentModelObject = cdm.getObject( parentObjUID );
        }
        selectObj = parentModelObject;
    }
    return lastParent;
};
/*
 * Set full text revisions in list.
 *@param {appCtx} ctx the application context
 * @param {Object} data - The panel's view model object
 */
export let setFullTextRevisions = function( ctx, data ) {
    if( data.response ) {
        var cellObjects = [];
        latestFullTextData = {};
        var tempCellObjets = [];
        var revToFullText = data.response.revToFullText;
        var objPropertyMap = data.response.objectPropValues;
        parseProperties( objPropertyMap );
        var fullText = revToFullText[ 1 ]; // Array of full text versions of revision
        var revisions = revToFullText[ 0 ]; // Revisions of requirement
        data.masterIdFulltext =  new Map();
        let masterIdFulltext = new Map();
        var addedid = [];
        var addedRevision = [];

        for( var i = 0; i < revisions.length; i++ ) {
            var isLatestRevision = false;
            var maxFullTextNumber = 0;
            var fullTextVersions = fullText[i];
            for( var j = 0; j < fullTextVersions.length; j++ ) {
                var currentFullText = fullTextVersions[j];
                var revisionDescriptor = revisions[i].modelType.propertyDescriptorsMap;
                var fullTextDescriptor = currentFullText.modelType.propertyDescriptorsMap;
                var revProps = objPropsMap[revisions[i].uid];
                var cellPropValue = revProps[revisionDescriptor.awp0CellProperties.displayName];
                var propertyNameValuesArr = cellPropValue.split( ',' );
                var nameDisplayName = revisionDescriptor.object_name.displayName;
                var idDisplayName = revisionDescriptor.item_id.displayName;
                var revIdDisplauName = revisionDescriptor.item_revision_id.displayName;
                var revisionName = getPropertyValue( cellPropValue, nameDisplayName, idDisplayName );
                var id = getPropertyValue( cellPropValue, idDisplayName, revIdDisplauName );
                var revision = getPropertyValue( cellPropValue, revIdDisplauName );
                if( !latestFullTextData.revision || revision > latestFullTextData.revision ) {
                    latestFullTextData.revision = revision;
                    isLatestRevision = true;
                }
                var revisionNameWithID = id + '-' + revisionName;
                var fullTextProps = objPropsMap[currentFullText.uid];
                var fullTextVersion = fullTextProps[fullTextDescriptor.revision_number.displayName ];
                var lmd = fullTextProps[fullTextDescriptor.last_mod_date.displayName];
                var lmu = fullTextProps[fullTextDescriptor.last_mod_user.displayName];
                var vmNode = createRowForFullTextVersion( data, revisionNameWithID, revision, fullTextVersion, lmd, lmu );
                vmNode.typeIconURL = iconService.getTypeIconURL( revisions[i].type );
                vmNode.fullTextUid = currentFullText.uid;
                vmNode.revUid = revisions[i].uid;

                tempCellObjets.push( vmNode );
                var parsedValue = _.parseInt( fullTextVersion );
                if( isLatestRevision && parsedValue > maxFullTextNumber ) {
                    maxFullTextNumber = parsedValue;
                    latestFullTextData.version = parsedValue;
                    latestFullTextData.fullTextUid = currentFullText.uid;
                }
            }
            if( tempCellObjets.length > 0 ) {
                tempCellObjets.sort( function( vmObject1, vmObject2 ) { return vmObject2.props.version.displayValue - vmObject1.props.version.displayValue; } );
                if( ctx.mselected.length > 1 ) {
                    if(addedid.indexOf( id ) === -1  ){
                        masterIdFulltext.set( id, tempCellObjets[ 0 ].fullTextUid );
                        cellObjects = cellObjects.concat( tempCellObjets[ 0 ] );
                        addedRevision[tempCellObjets[ 0 ].props.name.displayValue] = tempCellObjets[ 0 ].props.revision.displayValue;
                        addedid.push(id);
                    }else{
                        var newRevision = tempCellObjets[ 0 ].props.revision.displayValue;
                        var addedVerRevision = addedRevision[tempCellObjets[ 0 ].props.name.displayValue];
                        if(addedVerRevision.charCodeAt(0) < newRevision.charCodeAt(0)){
                            for (var index = 0; index < cellObjects.length; index++) {
                                if(cellObjects[index].props.name.displayValue === tempCellObjets[ 0 ].props.name.displayValue){
                                    cellObjects.splice(index,1);
                                }
                            }
                            masterIdFulltext.set( id, tempCellObjets[ 0 ].fullTextUid );
                            cellObjects = cellObjects.concat( tempCellObjets[ 0 ] );
                            addedRevision[tempCellObjets[ 0 ].props.name.displayValue] = tempCellObjets[ 0 ].props.revision.displayValue;

                        }
                    }
                } else {
                    cellObjects = cellObjects.concat( tempCellObjets );
                }
                tempCellObjets = [];
            }
        }
        data.masterIdFulltext = masterIdFulltext;
        data.filterResults = cellObjects;
        eventBus.publish( 'FullTextRequirement.refreshRevisionList' );
        eventBus.publish( 'Arm0FreezeRevision.selectFirstTableRow' );
    }
};

export let handleFullTextSelection = function( data ) {
    var selectedRowUid = data.eventData.selectedObjects[0].fullTextUid;
    var fullTextProps = objPropsMap[selectedRowUid];
    document.getElementById( 'arm0fullTextBodyText' ).innerHTML = fullTextProps.body_text;
};

var createRowForFullTextVersion = function(  data, revisionNameWithID, revision, fullTextVersion, lmd, lmu  ) {
    var properties = [];
    properties.name = _createProp( 'name', revisionNameWithID, 'STRING', data.i18n.revisionNameColumn );
    properties.revision = _createProp( 'revision', revision, 'STRING', data.i18n.revisionColumn );
    properties.version = _createProp( 'version', fullTextVersion, 'STRING', data.i18n.versionColumn );
    properties.last_modified_user = _createProp( 'last_modified_user', lmu, 'STRING', data.i18n.lastModifiedUserColumn );
    properties.date_modified = _createProp( 'date_modified', lmd, 'STRING', data.i18n.dateModifiedColumn );
    var vmNode = awTableSvc.createViewModelTreeNode();
    vmNode.props = properties;
    return vmNode;
};

var _createProp = function( propName, propValue, type, propDisplayName ) {
    return {
        type: type,
        hasLov: false,
        isArray: false,
        displayValue: propValue,
        uiValue: propValue,
        value: propValue,
        propertyName: propName,
        propertyDisplayName: propDisplayName,
        isEnabled: true
    };
};

/**
 * Function to parse object properties received from SOA
 * @param {Object} objPropertyMap the object contains properties data
 */
function parseProperties( objPropertyMap ) {
    var objects = objPropertyMap[0];
    var properties = objPropertyMap[1];
    for( var i = 0; i < objects.length; i++ ) {
        var obj = objects[i];
        var props = {};
        var objProps = properties[i];
        for( var j = 0; j < objProps.length; j++ ) {
            var propName = objProps[j].propName;
            var propValue = objProps[j].propValues[0];
            props[propName] = propValue;
        }
        objPropsMap[obj.uid] =  props;
    }
    return objPropsMap;
}

/**
 *Method to get property value from given string
 @param {String} cellProps the string to parse
 @param {String} propName the propName to find
 @param {String} nextPropName the next prop name to stop parsing
 @returns {String} the property value
 */
function getPropertyValue( cellProps, propName, nextPropName ) {
    var propStartIndex = cellProps.indexOf( propName );
    var nextPropStartIndex = nextPropName ? cellProps.indexOf( nextPropName ) : cellProps.length;
    var prop = cellProps.substring( propStartIndex, nextPropStartIndex );
    if( prop ) {
        prop = prop.trim();
        prop = prop.substring( prop.indexOf( ':' ) + 1, nextPropStartIndex );
        if( prop.endsWith( ',' ) ) {
        prop = prop.substring( 0, prop.length - 1 );
        }
        return prop;
    }
    return '';
}


/**
 * resize popup after window resize
 *
 * @returns {Object} popup height & width value
 */
function reCalcPanelHeightWidth() {
    var popupHeight = 800;
    var popupWidth = 800;
    // Get the popup panel hright based on aw_toolsAndInfo div present in DOM as normal
    // commands panel will also have the similar height.
    var toolInfoElement = $( '#aw_toolsAndInfo' );
    if( toolInfoElement && toolInfoElement.parent() && toolInfoElement.parent().height() ) {
        popupHeight = toolInfoElement.parent().height();
        popupWidth = toolInfoElement.parent().width();
    }

    // If height is not valid then use hard coded height.
    if( !popupHeight || popupHeight <= 0 ) {
        popupHeight = 800;
    }
    // If width is not valid then use hard coded width.
    if( !popupWidth || popupWidth <= 0 ) {
        popupWidth = 800;
    }else{
        popupWidth -= 0.5 * popupWidth;
    }
    popupHeight += 'px';
    popupWidth += 'px';
    return { popupHeight: popupHeight, popupWidth: popupWidth };
}

/**
 * Hide the opened popup panel and remove all event subscriptions as well.
 */
export let hidePopupPanel = function() {
    if( largePopupRef && largePopupRef.options ) {
        largePopupRef.options.disableClose = false;
        popupService.hide( largePopupRef );
        for( const s of subscriptions ) {
            eventBus.unsubscribe( s );
        }
        subscriptions = [];
        largePopupRef = null;
        _data = null;
    }
};

/**
 * Show popup
 * @param {Object} popupData - data to open popup panel
 * @param {Boolean} calcHeight - Boolean for cheking if height calculation required or not
 */
export let showFreezeUnFreezePopup = function( popupData, calcHeight ) {
    if ( _loadingWidePopup && largePopupRef && largePopupRef.panelEl ) {
        // Don't process the call if panel loading is in process Or panel is initiated but context is not yet updated
        return;
    }
    if ( !appCtxService.ctx.Arm0SingleRequirementWidePanelEditorActive && ( !largePopupRef || !largePopupRef.panelEl ) ) {
        _loadingWidePopup = true;
        if( !popupData.options ) {
            popupData.options = {};
        }

        // Calculate the popup panel height & width based on browser size.
        if( calcHeight ) {
            var scaleObj = reCalcPanelHeightWidth();
            popupData.options.height = scaleObj.popupHeight;
            popupData.options.width = scaleObj.popupWidth;
        }
        popupService.show( popupData ).then( popupRef => {
            largePopupRef = popupRef;
            _loadingWidePopup = false;
            subscriptions.push( eventBus.subscribe( 'LOCATION_CHANGE_COMPLETE', hidePopupPanel ) );
            var sideNavEventSub = eventBus.subscribe( 'awsidenav.openClose', function( eventData ) {
                if ( eventData && eventData.id === 'aw_toolsAndInfo' ) {
                    hidePopupPanel();
                }
            } );
            eventBus.publish( 'Arm0FreezeRevision.getFullTextVersionsInfo' );
            subscriptions.push( sideNavEventSub );
        } );
    } else {
        exports.unRegisterCtxclosePopup();
    }
};

/**
 * Return FMS base url
 * @returns {String} url
 */
export let getFmsBaseURL = function() {
    return browserUtils.getBaseURL() + fmsUtils.getFMSUrl();
};

/*
 * Get selected objects
 *@param {appCtx} ctx the application context
 */
 export let getSelected = function(ctx) {
    return ckeditorOperations.getSelected(ctx);
};

/**
 *Select attribute from table
 *
 * @param {Object} data the data object
 */
export let selectFirstTableRow = function( data, index ) {
    var dataProvider = data.dataProviders.freezeRevisionsDataProvider;
    var selModel = dataProvider.selectionModel;
    var vmObjects = dataProvider.viewModelCollection.loadedVMObjects;
    selModel.setSelection( vmObjects[0] );
};

export let updateContentLocally = function( data, ctx ) {
    var selected = data.dataProviders.freezeRevisionsDataProvider.selectedObjects[ 0 ];
    var selectedRowUid = selected.fullTextUid;
    var fullTextProps = objPropsMap[selectedRowUid];
    var attrsToAdd = [];
    var attrsToRemove = [];
    var isMaterChanged = false;
    var isFrozenToLatestRev = false;
    if( data.operationType === "FREEZE") {
        var freezedRevision  = selected.props.revision;
        var freezedVersion  = selected.props.version;
        attrsToAdd.push( getAttributeObject( 'isFrozen', 'true' ) );
        var lesserVersionSelected =  latestFullTextData.revision === freezedRevision.displayValue
                                    && latestFullTextData.version > _.parseInt( freezedVersion.displayValue );
        var oldRevisionSelected = latestFullTextData.revision > freezedRevision.displayValue;
        if( lesserVersionSelected || oldRevisionSelected ) {
                isMaterChanged = true;
                attrsToAdd.push( getAttributeObject( 'isMasterChanged', 'true' ) );
        }else{
            isFrozenToLatestRev = true;
        }
        if( appCtxService.ctx.rmselected[ 0 ].uid === appCtxService.ctx.mselected[ 0 ].uid ) {
            appCtxService.registerCtx( 'isDeriveCommandVisible', true );
            appCtxService.registerCtx( 'hideUnfreezeCommand', false );
        }
    } else {
        attrsToRemove.push( getAttributeObject( 'isFrozen', 'true' ) );
        attrsToRemove.push( getAttributeObject( 'isMasterChanged', 'true' ) );
    }
    var selected = getSelected(ctx);
    ckeditorOperations.updateBodyTextContentAndAttributes( fullTextProps.body_text, selected[0].uid, attrsToAdd, attrsToRemove, isMaterChanged, isFrozenToLatestRev );
    appCtxService.unRegisterCtx('operationPerformedFromCkeditor');
};

/**
 * Method to create json object from name and value
 * @param {String} name the name of the attribute
 * @param {String} value the value of the attribute
 * @returns {Object} the json object
 */
function getAttributeObject( name, value ) {
    return {
        attrName:name,
        attrValue:value
    };
}

/*
 * Get fulltext version
 */
export let getVersion = function( data ) {
    var versionNo = 0;
    if( data.operationType === "FREEZE" ) {
        versionNo = _.parseInt( data.dataProviders.freezeRevisionsDataProvider.selectedObjects[ 0 ].props.version.displayValue );
    }
    return versionNo;
};
/*
 * Get freeze operation type
 */
export let getFreezeOperationType = function( data ) {
    var operationType = '';
    if( data.freezeRevision.dbValue === true ) {
        operationType = 'FREEZE';
    } else {
        operationType = 'UNFREEZE';
    }
    return operationType;
};
/*
 * Get derived object name
 */
export let getDerivedObjectName = function( ctx, data ) {
    var lastParent = _getInputObject();
    var derivedName = lastParent.props.object_string.uiValues[ 0 ] + ' ' + data.i18n.derived;
    if( !data.reuseOptions.dbValue ) {
        data.name.dbValue = derivedName;
    } else {
        data.name.dbValue = ctx.captureName;
    }
};
/*
 * Get fulltext version id
 */
export let getDatasetId = function( data ) {
    if( data.operationType === "FREEZE" ) {
        var fulltextUid = data.dataProviders.freezeRevisionsDataProvider.selectedObjects[0].fullTextUid;
        return cdm.getObject( fulltextUid );
    }
};

/**
 * Get Run in Background option value
 *
 * @param {Object} data - The panel's view model object
 * @return {Boolean} true if checkout supported
 */
export let getRunInBackgroundOptionValue = function( data ) {
    if( data.runInBackgroundReuse.dbValue ) {
        return true;
    }
    return false;
};

export default exports = {
    getCreateInput,
    getOperationType,
    getSelectedElements,
    setFullTextRevisions,
    getVersion,
    getFreezeOperationType,
    getDerivedObjectName,
    getDatasetId,
    getRunInBackgroundOptionValue,
    showFreezeUnFreezePopup,
    hidePopupPanel,
    handleFullTextSelection,
    selectFirstTableRow,
    getFmsBaseURL,
    updateContentLocally,
    unfreezeObject,
    freezeObject,
    overwriteObject,
    getSelected
};
/*
 * reuseRequirementService service utility
 * @memberof NgServices
 * @member reuseRequirementService
 */
app.factory( 'reuseRequirementService', () => exports );
