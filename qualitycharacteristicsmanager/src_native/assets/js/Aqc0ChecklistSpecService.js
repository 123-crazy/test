// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**

 * @module js/Aqc0ChecklistSpecService
 */

import eventBus from 'js/eventBus';
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import messagingSvc from 'js/messagingService';
import appCtxService from 'js/appCtxService';
import _localeSvc from 'js/localeService';
import dms from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';

import 'jquery';

var exports = {};

export let getParentChecklistSpecProperty = function (ctx) {

    return ctx.selected !== null ? ctx.selected : {};
};

/**
 * Drag and drop functionality for cut and paste the object in the tree view
 * @param{ModelObject} targetObject Parent to which the object is to be pasted
 * @param{ModelObject} sourceObjects object to be pasted
 */
export let setPropertiesForPaste = function (targetObject, sourceObjects) {
    var deferred = AwPromiseService.instance.defer();
    var inputData = [];

    if (targetObject.type === 'Qc0ChecklistSpecification' && sourceObjects.length > 0 && (appCtxService.ctx.locationContext['ActiveWorkspace:SubLocation'] === 'ChecklistSpecificationSubLocation')) {
        _.forEach(sourceObjects, function (sourceObject) {
            if (targetObject.type === 'Qc0ChecklistSpecification' && sourceObject.type === 'Qc0ChecklistSpecification' && targetObject.uid !== sourceObject.uid) {
                var input = {
                    object: sourceObject,
                    timestamp: '',
                    vecNameVal: [{
                        name: 'qc0ParentChecklistSpec',
                        values: [
                            targetObject.uid
                        ]
                    }]
                };
                inputData.push(input);
            }
        });
        soaSvc.post('Core-2010-09-DataManagement', 'setProperties', {
            info: inputData
        }).then(
            function () {
                deferred.resolve();
                if (appCtxService.ctx.pselected !== undefined) {
                    eventBus.publish('cdm.relatedModified', {
                        relatedModified: [appCtxService.ctx.pselected, targetObject]
                    });
                } else {
                    eventBus.publish('primaryWorkarea.reset');
                }
            },
            function (error) {
                var errMessage = messagingSvc.getSOAErrorMessage(error);
                messagingSvc.showError(errMessage);
                deferred.reject(error);
                eventBus.publish('cdm.relatedModified', {
                    relatedModified: [appCtxService.ctx.pselected, targetObject]
                });
            }
        );
    } else {
        var resource = app.getBaseUrlPath() + '/i18n/qualityfailuremanagerMessages';
        var localTextBundle = _localeSvc.getLoadedText(resource);
        var errorMessage = localTextBundle.Aqc0DragDropError;
        messagingSvc.showError(errorMessage);
    }
    return deferred.promise;
};

/**
 * Load rating rule object attached to Checklist specification object
 * @param {ctx} ctx Current context
 */
export let loadRatingRuleObjectWithProps = function (ctx) {

    let deferred = AwPromiseService.instance.defer();

    var selectedObject;
    if(ctx.selected.type === 'Qc0ChecklistSpecification'){
        selectedObject = ctx.selected;
    } else {
        selectedObject = ctx.pselected;
    }

    let ratingReferenceProp = selectedObject.props.qc0RatingRuleReference;
    let ratingObjectUID = ratingReferenceProp ? ratingReferenceProp.dbValues[0] : ratingReferenceProp;

    if (ratingObjectUID) {        
        var ratingObject = cdm.getObject(ratingObjectUID);
        let propsArray = [];

        if(!ratingObject.props.qc0AssessmentRule) {
            propsArray.push('qc0AssessmentRule');
        }
        if (!ratingObject.props.qc0AnswerOptions) {
            propsArray.push('qc0AnswerOptions');            
        }
        if(!ratingObject.props.qc0AnswerOptionValues) {
            propsArray.push('qc0AnswerOptionValues');
        }

        if (propsArray.length > 0) {

            dms.getProperties([ratingObjectUID], propsArray).then(
                function () {
                    ratingObject = cdm.getObject(ratingObjectUID);
                    deferred.resolve({
                        ratingObject: ratingObject
                    });
                }
            );
        } else {
            deferred.resolve({
                ratingObject: ratingObject
            });
        }
    } else {
        deferred.resolve({
            ratingObject: null
        });
    }

    return deferred.promise;
};

/**
 * get grid width in document
**/
export let getGridWidth = function(gridID) {
    var width = document.getElementById(gridID).clientWidth;
    width = width * 0.99;
    return width;
};

/**
 * This API is added to process the Partial error being thrown from the SOA
 *
 * @param {object} response - the response of SOA
 * @return {String} message - Error message to be displayed to user
 */
 export let populateErrorString = function( response ) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if ( response && response.ServiceData.partialErrors ) {
        _.forEach( response.ServiceData.partialErrors, function( partialError ) {
            getMessageString( partialError.errorValues, msgObj );
        } );
    }

    return msgObj.msg;
};

/**
 * This API is added to form the message string from the Partial error being thrown from the SOA
 *
 * @param {Object} messages - messages array
 * @param {Object} msgObj - message object
 */
 var getMessageString = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        msgObj.msg += '<BR/>';
        msgObj.msg += object.message;
        msgObj.level = _.max( [ msgObj.level, object.level ] );
    } );
};

export let getSelectedOrNewlyCreatedObject = function (data){
    if (data.selectedTab.panelId === 'Aqc0RatingRuleSearchTab' && data.dataProviders.loadFilteredList.selectedObjects.length > 0 ) { 
        return data.dataProviders.loadFilteredList.selectedObjects[0].uid;
    } else if( data.selectedTab.panelId === 'Aqc0RatingRuleNewTab' && data.createdObject){
        return data.createdObject.uid;
    }

    return null;
};

/**
 * get Search Criteria for input to performSearchViewModel4 SOA
 *
 * @param {DeclViewModel} data - Aqc0AddRatingRuleViewModel
 * @param {int} startIndex - current index of the searchFolders dataProvider
 * @param {ctx} ctx - current context
 *
 */
 export let getSearchCriteria = function( data, startIndex, ctx ) {    
    var searchCriteria = {};
    searchCriteria.typeOfSearch = 'ADVANCED_SEARCH';
    searchCriteria.utcOffset = '0';

    if( ctx.search && startIndex > 0 ) {
        searchCriteria.totalObjectsFoundReportedToClient = ctx.search.totalFound.toString();
        searchCriteria.lastEndIndex = ctx.search.lastEndIndex.toString();
    } else {
        searchCriteria.totalObjectsFoundReportedToClient = '0';
        searchCriteria.lastEndIndex = '0';
    }
    searchCriteria.queryName = '_AQC_GetRatingRuleObjects';

    let filterString = getFilterBoxValueWithWildCard(data.filterBox.dbValue);
    searchCriteria.Name = filterString;
    searchCriteria.object_name = filterString;          
    return searchCriteria;
};

/**
 * get Filterstring value with wild card character
 * @param {string} filterString string to filter data
 * @returns {string} filter string with prefix and append wild card character
 */
var getFilterBoxValueWithWildCard = function(filterString) {
    if(!filterString.includes("*")){
        filterString = "*" + filterString + "*";
    }
    else if(filterString === ""){
        filterString = "*";
    }
    return filterString;
};

/**
  * Load LOV in data for panel.
  * @param {response} response - The response of the SOA call.
  * @param {DeclViewModel} data - The qualified data of the viewModel
  * @param {ctx} ctx - the ctx of the viewModel
  * @param {string} propertyName - The name of the property to update
  * @param {boolean} addEmpty1stItem - true if add empty item to head of list
  * @returns {Object} value the LOV value 
  */
 export let getLOVlist = function( response, data, ctx, propertyName, addEmpty1stItem ) {
 
    const value = createLOVObject(response);
    const addEmpty1stItemBoolean = (addEmpty1stItem === 'true');
    var values = [];

    if(addEmpty1stItemBoolean){
        var emptyListModel = getEmptyListModel();
        values.push(emptyListModel);
    }

    for( let index = 0; index < value.length; index++ ) {
        values.push(value[index]);
    }

    return values;
 };

 /**
  * Map lov values of response to 
  * @param {response} response 
  */
 var createLOVObject  = function(response) {
    const lovValues = response.lovValues.map( function( obj ) {
        return {
            propDisplayValue: obj.propDisplayValues.lov_values[ 0 ],
            propDisplayDescription: obj.propDisplayValues.lov_value_descriptions ? obj.propDisplayValues.lov_value_descriptions[ 0 ] : obj.propDisplayValues.lov_values[ 0 ],
            propInternalValue: obj.propInternalValues.lov_values[ 0 ]
        };
    } );
    return lovValues;
 };

 /**
 * Return an empty ListModel object.
 *
 * @return {Object} - Empty ListModel object.
 */
var getEmptyListModel = function() {
    return {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: true
    };
};



export default exports = {
    getParentChecklistSpecProperty,
    setPropertiesForPaste,           
    getLOVlist,    
    loadRatingRuleObjectWithProps,   
    getGridWidth,    
    populateErrorString,    
    getSelectedOrNewlyCreatedObject,
    getSearchCriteria    
};
app.factory('Aqc0ChecklistSpecService', () => exports);
