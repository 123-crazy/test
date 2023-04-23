//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/insertElementService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import localeService from 'js/localeService';
import _ from 'lodash';
import awTableService from 'js/awTableService';
import addElemService from 'js/addElementService';
import cdm from 'soa/kernel/clientDataModel';
import occStructureEditSvc from 'js/occmgmtStructureEditService';
import occmgmtSplitViewUpdateService from 'js/occmgmtSplitViewUpdateService';

var exports = {};

/**
 * Get the localized value from a given key.
 * @param {String} key: The key for which the value needs to be extracted.
 * @return {String} localized string for the input key.
 */
function getLocalizedValueFromKey( key ) {
    var resource = 'OccurrenceManagementConstants';
    var localTextBundle = localeService.getLoadedText( resource );
    return localTextBundle[ key ];
}

/**
 * Populate input for addElement.elementsAdded event, to be called for inserted element added under current parent
 * @param {DeclViewModel} data - Awb0InsertLevelSubPanelViewModel
 */
function populateElementToBeAddedUnderCurrentParent(data){
    //populate addElementResponse for old parent -> don't add newElementInfo
    data.oldParentElement = cdm.getObject(appCtxService.ctx.aceActiveContext.context.insertLevelInput.currentParentElement);
    var selectedNewElementInfoForOldParent = {};
    selectedNewElementInfoForOldParent.newElements=[data.insertElementResponse.newParent];
    var parentElemsInResponse = data.insertElementResponse.childOccurrencesInfo[0];
    var childOccurences = data.insertElementResponse.childOccurrencesInfo[1];
    var parentIdx = _.findLastIndex( parentElemsInResponse, function( parentElem ) {
        return parentElem.uid === appCtxService.ctx.aceActiveContext.context.insertLevelInput.currentParentElement;
    } );
    selectedNewElementInfoForOldParent.pagedOccurrencesInfo ={
        childOccurrences: childOccurences[parentIdx]
    };
    data.addElementResponseForOldParent = {
        selectedNewElementInfo: selectedNewElementInfoForOldParent,
        ServiceData: data.insertElementResponse.ServiceData
    };
}

/**
 * Populate input for addElement.elementsAdded event, to be called for selected elements added under inserted parent
 * @param {DeclViewModel} data - Awb0InsertLevelSubPanelViewModel
 */
function populateElementsToBeAddedUnderNewParent(data){
    //populate addElementResponse for new parents -> also add newElementInfo
    data.newParent = data.insertElementResponse.newParent;
    var selectedNewElementInfoForNewParent = {
        newElements:[]
    };
    var parentElemsInResponse = data.insertElementResponse.childOccurrencesInfo[0];
    var childOccurences = data.insertElementResponse.childOccurrencesInfo[1];
    var childInx = _.findLastIndex( parentElemsInResponse, function( parentElem ) {
        return parentElem.uid === data.insertElementResponse.newParent.uid;
    } );
    selectedNewElementInfoForNewParent.pagedOccurrencesInfo = {
        childOccurrences: childOccurences[childInx]
    };

    for(var inx=0; inx<data.insertElementResponse.ServiceData.created.length;inx++)
    {
        var childOccInx = _.findLastIndex( childOccurences[childInx], function( childOccurrence ) {
            return childOccurrence.occurrenceId === data.insertElementResponse.ServiceData.created[inx];
        } );
        if(childOccInx > -1 )
        {
            var newElement = cdm.getObject(data.insertElementResponse.ServiceData.created[inx]);
            selectedNewElementInfoForNewParent.newElements.push(newElement);
        }
    }

    data.addElementResponseForNewParent = {
        selectedNewElementInfo: selectedNewElementInfoForNewParent,
        newElementInfos: data.insertElementResponse.newElementInfos,
        ServiceData: data.insertElementResponse.ServiceData
    };
}

/**
 * Populate table data for selectedElements table
 * @return {Object} loadResult - table data
 */
export let loadInsertLevelTableData = function()
{
    var rowLength = appCtxService.ctx.aceActiveContext.context.insertLevelInput.selectedElements.length;
    var vmRows = [];
    for(var rowIndx = 0; rowIndx<rowLength;rowIndx++)
    {
        var currentSelection = appCtxService.ctx.aceActiveContext.context.insertLevelInput.selectedElements[rowIndx];
        var dbValue = currentSelection.props.object_string.dbValues[ 0 ];
        var displayValues = [dbValue];
        var localizedName = getLocalizedValueFromKey('Name');
        var vmProp = uwPropertyService.createViewModelProperty( "Name", localizedName, "OBJECT", dbValue, displayValues );
        var constMap = {
            ReferencedTypeName: 'ItemRevision'
        };
        var propApi = {
            showAddObject: false
        };
        vmProp.propertyDescriptor = {
            displayName: localizedName,
            constantsMap: constMap
        };
        vmProp.propApi = propApi;
        vmProp.isEditable = true;
        vmProp.editableInViewModel = true;
        var vmRow = {};
        vmRow.props = {};
        vmRow.props[ "Name" ] = vmProp;
        vmRow.editableInViewModel = true;
        vmRow.isModifiable = true;
        vmRow.editableInViewModel = true;
        vmRow.typeIconURL=currentSelection.iconURL;
        uwPropertyService.setEditable( vmRow.props[ "Name" ], true );
        uwPropertyService.setEditState( vmRow, true );
        vmRows.push( vmRow );
    }
    var loadResult = awTableService.createTableLoadResult( vmRows.length );
    loadResult.selectedElems = vmRows;
    loadResult.totalSelectedElems = vmRows.length;
    return loadResult;
};

/**
 * Populate allowed types information for selected elements for insert level operation
 * @param {Object} response - getInfoForInsertLevel SOA Response
 */
export let extractAllowedTypesInfoFromResponse = function(response){
    if(response.preferredTypeInfo){
        response.preferredExists = true;
    }
    var allowedTypesInfo = addElemService.extractAllowedTypesInfoFromResponse(response);
    if(appCtxService.ctx.aceActiveContext.context.insertLevelInput){
        appCtxService.ctx.aceActiveContext.context.insertLevelInput.allowedTypesInfo = allowedTypesInfo;
    }else{
        appCtxService.ctx.aceActiveContext.context.insertLevelInput = {
            allowedTypesInfo: allowedTypesInfo
        };
    }
};

/**
 * Populate insert level input information and store in context
 * @return {Object} selectedElements - selected elements to be sent as input to getInfoForInsertLevel SOA
 */
export let populateInsertLevelInputInformation = function(){
    var vmc = appCtxService.ctx.aceActiveContext.context.vmc;
    var loadedObjects = vmc.loadedVMObjects;
    var selectedElements = [];
    for(var inx=0; inx<loadedObjects.length; inx++)
    {
        if(loadedObjects[inx].selected)
        {
            selectedElements.push(loadedObjects[inx]);
        }
    }
    var insertLevelInput = {};
    insertLevelInput.selectedElements = selectedElements;
    insertLevelInput.currentParentElement = selectedElements[0].props.awb0Parent.dbValue;
    appCtxService.ctx.aceActiveContext = appCtxService.ctx.aceActiveContext || {
        context: {}
    };
    appCtxService.ctx.aceActiveContext.context.insertLevelInput = insertLevelInput;
    return appCtxService.ctx.aceActiveContext.context.insertLevelInput.selectedElements;
};

/**
 * Delete insert level input from context once Insert level panel is closed
 */
export let clearInsertLevelInputFromCtx = function(){
    if(appCtxService.ctx.aceActiveContext.context.insertLevelInput){
        delete appCtxService.ctx.aceActiveContext.context.insertLevelInput;
    }
};

/**
 * Populate input for addElement.elementsAdded event
 * @param {DeclViewModel} data - Awb0InsertLevelSubPanelViewModel
 */
export let elementsInserted = function(data){
    if(appCtxService.ctx.aceActiveContext.context.insertLevelInput){
        var inactiveView = occmgmtSplitViewUpdateService.getInactiveViewKey();
        if(inactiveView){
            occStructureEditSvc.deSelectFromInactiveView( appCtxService.ctx.aceActiveContext.context.insertLevelInput.selectedElements,inactiveView );
        }
        //1. populate addElementResponse for old parent -> don't add newElementInfo
        populateElementToBeAddedUnderCurrentParent(data);

        //2. populate addElementResponse for new parents -> also add newElementInfo
        populateElementsToBeAddedUnderNewParent(data);
    }
};

/**
 * Populate input for insertLevel SOA
 * @param {DeclViewModel} data - Awb0InsertLevelSubPanelViewModel
 * @return {Object} objectToBeInserted - object to be inserted as parent for the selected elements
 */
export let getParentElementToInsertLevel = function( data ) {
    if ( Array.isArray( data.createdObject ) ) {
        return cdm.getObject( data.createdObject[ 0 ].props.items_tag.dbValues[ 0 ] );
    } else if ( data.createdObject ) {
        var obj = cdm.getObject( data.createdObject.props.items_tag.dbValues[ 0 ] );
        return obj;
    }
   return data.sourceObjects[0];
};

/**
 * Insert Element service
 */

export default exports = {
    loadInsertLevelTableData,
    extractAllowedTypesInfoFromResponse,
    populateInsertLevelInputInformation,
    clearInsertLevelInputFromCtx,
    elementsInserted,
    getParentElementToInsertLevel
};
app.factory( 'insertElementService', () => exports );
