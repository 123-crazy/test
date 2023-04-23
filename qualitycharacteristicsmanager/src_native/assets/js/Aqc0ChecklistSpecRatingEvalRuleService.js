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

 * @module js/Aqc0ChecklistSpecRatingEvalRuleService
 */

 import eventBus from 'js/eventBus';
 import app from 'app';
 import AwPromiseService from 'js/awPromiseService';
 import viewModelObjectSvc from 'js/viewModelObjectService';
 import soaSvc from 'soa/kernel/soaService';  
 import appCtxService from 'js/appCtxService';
 import _localeSvc from 'js/localeService';
 import dms from 'soa/dataManagementService';
 import cdm from 'soa/kernel/clientDataModel';
 import awColumnSvc from 'js/awColumnService';
 import dateTimeSvc from 'js/dateTimeService';
 import checklistSpecSvc from 'js/Aqc0ChecklistSpecService'; 
 import _ from 'lodash';
 
 import 'jquery';
 
 var exports = {};
 
 var _editCondition = null;
 var _resetEditWidgets = false;
 
 //Constants for widgte types
 let CHECKLIST_WIDGET_TYPE_LIST = {
     DATE: 'DATE',
     STRING: 'STRING',
     BOOLEAN: 'BOOLEAN'
 };
 
 //Constants for Value types and widget types for new fields to be added in prefrence
 let CHECKLIST_VALUE_TYPE_TO_WIDGET_TYPE_LIST = {
     1: 'STRING',
     2: 'DATE',
     3: 'DOUBLE',
     4: 'STRING',
     5: 'INTEGER',
     6: 'BOOLEAN',
     7: 'INTEGER',
     8: 'STRING',
     9: 'STRING', //TypedReference
     10: 'STRING', //UnTypedReference    
     11: 'STRING', //unknown
     12: 'STRING', //unknown
     13: 'STRING', //unknown
     14: 'STRING'
 };
 
 /**
  * Populate the Checklist Evaluation Parameters section based on ChecklistRatingConditions registered in ctx.
  *
  * @param {dataProvider} dataProvider - The current dataProvider of the viewModel
  * @param {ctx} ctx - The ctx of the viewModel
  * @param {DeclViewModel} data - The qualified data of the viewModel
  */
 export let getEvaluationRuleConditions = function (dataProvider, data) {
     if (data.activeView === 'Aqc0AddChecklistEvaluationRuleSub') {        
 
         if (data.ChecklistRatingConditions) {
             for (let i = 0; i < data.ChecklistRatingConditions.length; i++) {
                 if (dataProvider) {
                     let mObj = viewModelObjectSvc.createViewModelObject(i + 1, 'EDIT');
                     mObj = {
                         cellProperties: {}
                     };
                     mObj.uid = data.ChecklistRatingConditions[i].uid;                    
                     
                     mObj.cellHeader1 = data.ChecklistRatingConditions[ i ].conditionDisplayName;
                     mObj.cellHeaderInternalValue = data.ChecklistRatingConditions[ i ].conditionName;
                     
                     mObj.cellProperties[data.Aqc0PropertySection.dbValue] = {
                         key: data.Aqc0PropertySection.uiValue,
                         value: data.ChecklistRatingConditions[i].propertyDisplayName,
                         internalValue: data.ChecklistRatingConditions[i].propertyQName
                     };
 
                     mObj.cellProperties[data.Aqc0ConditionCellValueSection.dbValue] = {
                         key: data.Aqc0ConditionCellValueSection.uiValue,
                         value: data.ChecklistRatingConditions[i].value,
                         internalValue: data.ChecklistRatingConditions[i].internalValue
                     };
                     //TODO:: image request has been submitted until then "typeMissingImage48" will be used.
                     mObj.typeIconURL = app.getBaseUrlPath() + '/image/typeMissingImage48.svg';
                     dataProvider.viewModelCollection.loadedVMObjects.push(mObj);
                 }
             }
         } else {
             data.ChecklistRatingConditions = [];           
         }
     }
 };
 

 /**
  * Get the property preference configured in RAC for evaluation condition
  *
  * @param {object} typeInternalName - The type internal name
  * @param {ctx} ctx - The ctx of the viewModel
  * @param {DeclViewModel} data - The qualified data of the viewModel 
  */
 export let getPropertyAction = function (typeInternalName, ctx, data) {    
     _resetEditWidgets = false;
     if (!ctx.EvalautionRatingPreferenceMap) {
         let objs = [];
         objs.push(typeInternalName);         
         soaSvc.postUnchecked('Administration-2012-09-PreferenceManagement', 'getPreferences', {
             preferenceNames: ['AWC_Qc0RatingRuleEvaluationProperties'],
             includePreferenceDescriptions: false
         }).then(function (preferenceResult) {
             if (preferenceResult) {
                 let preferenceProp = preferenceResult.response[0].values.values;
                 ctx.EvalautionRatingPreferenceMap = {};                
                 ctx.EvalautionRatingPreferenceMap[typeInternalName] = [];                 
                 for (let i = 0; i < preferenceProp.length; i++) {
                     let propertyName = preferenceProp[i];                                                                                                    
                     ctx.EvalautionRatingPreferenceMap[typeInternalName].push(propertyName);
                 }
                 soaSvc.postUnchecked('Core-2015-10-Session', 'getTypeDescriptions2', {
                     typeNames: objs,
                     options: {
                         PropertyExclusions: ["AllExclusions"],
                         TypeExclusions: ["AllExclusions"],
                         TypeConstants: [""],
                         PropertyConstants: [""]
                     }
                 }).then(function (descResult) {
                         if (descResult.types) {
                             ctx.EvalautionRatingPropertiesMap = {};
                         for (let k = 0; k < descResult.types.length; k++) {
                             ctx.EvalautionRatingPropertiesMap[descResult.types[k].name] = descResult.types[k].propertyDescriptors;
                         }
                         exports.displayPropertyPreferencesAction(objs[0], ctx, data);
                     }
                 });
             }
         });       
     } else {
         exports.displayPropertyPreferencesAction(typeInternalName, ctx, data);
     }
 };
 
 /**
  * Display the property preferences , It would populate the field names for Panel
  *
  * @param {object} typeInternalName - The type internal name
  * @param {ctx} ctx - The ctx of the viewModel
  * @param {DeclViewModel} data - The qualified data of the viewModel
  */
 export let displayPropertyPreferencesAction = function (typeInternalName, ctx, data) {
     if (typeInternalName) {
         let count = 0;
         let properties = ctx.EvalautionRatingPropertiesMap[typeInternalName];
         let prefProperties = ctx.EvalautionRatingPreferenceMap[typeInternalName];
         if(properties && properties.length > 0 && prefProperties && prefProperties.length > 0){
             for (let j = 0; j < prefProperties.length; j++) {
                 for (let k = 0; k < properties.length; k++) {
                     if(properties[k].name === prefProperties[j]){
                         let edit = ctx.ChecklistEvaluationRuleEditContext;
                         if( edit && edit.cellProperties[ data.Aqc0PropertySection.dbValue ].internalValue === properties[ k ].name ) {
                             data.propertyContext.dbValue = properties[ k ].name;
                             data.propertyContext.uiValue = properties[ k ].displayName;
                         }
                         data.propertyContextValues.dbValues[count] = [];
                         data.propertyContextValues.dbValues[count].propDisplayValue = properties[k].displayName;
                         data.propertyContextValues.dbValues[count].propInternalValue = properties[k].name;
                         data.propertyContextValues.dbValues[count].valueType = properties[k].valueType;
                         count++;
                         break;
                     }                    
                 }
             }
         }
         data.propertyContextValues.dbValue = _.clone(data.propertyContextValues.dbValues);
     }
     eventBus.publish('selectionChangeOfPropertyContext', data);
 };
 
 /**
  * Selection change event for property change 
  *
  * @param {DeclViewModel} data - The data of view model
  */
 export let selectionChangeOfPropertyContext = function (data) {   
 
     //cleanData
     cleanData(data);
 
     if (data.propertyContext.dbValue) {
         var valueType = null;
         for (let j = 0; j < data.propertyContextValues.dbValues.length; j++) {
             if (data.propertyContext.dbValue === data.propertyContextValues.dbValues[j].propInternalValue) {
                 valueType = data.propertyContextValues.dbValues[j].valueType;
                 break;
             }
         }
         if (valueType !== null && valueType >= 0) {                      
             let widgetType = CHECKLIST_WIDGET_TYPE_LIST[valueType];
             if (widgetType) {
                 //TODO:: Add support for LISTBOX
                 data.genericWidget.type = widgetType;
                 data.genericWidget.propertyDisplayName = data.propertyContext.uiValue;                
             } else {
                 widgetType = CHECKLIST_VALUE_TYPE_TO_WIDGET_TYPE_LIST[valueType];
                 data.genericWidget.type = widgetType;
                 data.genericWidget.propertyDisplayName = data.propertyContext.uiValue;                
             }
            
             data.currentFieldValueType.dbValue = widgetType;                        
             exports.setGenericWidgetDisplayValue(data);
             resetWidgets(data, widgetType);
         }     
     }
 
     let ctx = appCtxService.ctx;
 
     if( ctx.ChecklistEvaluationRuleEditContext ) {
         if ( _resetEditWidgets ) {
             resetWidgets( data );
             ctx.ChecklistEvaluationRuleEditContext.cellProperties[ data.Aqc0ConditionCellValueSection.dbValue ].value = '';
         } else {
             if( data.currentFieldValueType.dbValue === 'DATE' ) {
                 setDates( ctx, data );
             } else {
                 setGenericBoxes( ctx, data, data.genericWidget );
             } 
             _resetEditWidgets = true;
         }
     }
 };
 
 /**
  * Edit Functionality : Sets the Date Widget on the edit Panel
  *
  * @param {ctx} ctx - The context of view model
  * @param {data} data - The data of view model
  */
  var setDates = function( ctx, data ) {
     let fieldValue = ctx.ChecklistEvaluationRuleEditContext.cellProperties[ data.Aqc0ConditionCellValueSection.dbValue ].value;
     
     if( fieldValue ) {        
         let propertyDate = null;       
         propertyDate = Date.parse( fieldValue );
     
         if( propertyDate ) {
             data.genericWidget.dbValue = propertyDate;
             data.genericWidget.uiValue = propertyDate;
             data.genericWidget.dateApi.dateValue = dateTimeSvc.formatDate( propertyDate, data.genericWidget.dateApi.dateFormatPlaceholder );
         }
     }
 };
 
 /**
  * Edit Functionality : Sets the other Widget on the edit Panel
  *
  * @param {ctx} ctx - The context of view model
  * @param {data} data - The data of view model
  * @param {widget} widget - The current active widget of view model
  */
 var setGenericBoxes = function( ctx, data, widget ) {
     let fieldValue = ctx.ChecklistEvaluationRuleEditContext.cellProperties[ data.Aqc0ConditionCellValueSection.dbValue ].value;
     if( fieldValue ) {
         if( widget.type === 'BOOLEAN' ) {
             widget.dbValue = fieldValue === 'true';        
         } else {
             widget.dbValue = fieldValue;
         }
         //TODO:: Support LISTBOX
         widget.uiValue = fieldValue;       
     }
 };
 
 /**
  * Condition Context handling on Panel
  *
  * @param {DeclViewModel} data - The data of view model  
  */
 export let setGenericWidgetDisplayValue = function (data) {            
     data.genericWidget.propertyDisplayName = data.propertyContext.uiValue;
     data.genericValueContext.propertyDisplayName = data.propertyContext.uiValue;      
 };
 
 /**
  * Reset widget value
  *
  * @param {DeclViewModel} data - The data of view model
  * @param {String} widgetType - widget type 
  */
 var resetWidgets = function (data, widgetType) {
     if (data.genericWidget) {         
         if(widgetType && widgetType === 'BOOLEAN'){
             data.genericWidget.dbValue = true; 
             data.genericWidget.uiValue = true;               
         } else {
             data.genericWidget.dbValue = null; 
         }
     }
 };
 
 /**
  * Add the condition to ctx
  *
  * @param {ctx} ctx - The ctx of the viewModel
  * @param {DeclViewModel} data - The qualified data of the viewModel
  * @returns {Object} test
  */
 export let addConditionToCtx = function (ctx, data) {
     if (!data.ChecklistRatingConditions) {
         data.ChecklistRatingConditions = [];
     }
     let deferred = AwPromiseService.instance.defer();    
 
     if( ctx.ChecklistEvaluationRuleEditContext ) {
         _editCondition = ctx.ChecklistEvaluationRuleEditContext;
         var result = editFromChecklistEvaluationRuleEditCtx( ctx, data );
         if( !result.valid ) {            
             deferred.resolve({
                 isDuplicate: result.isDuplicate,
                 isFieldEmpty: result.isFieldEmpty,
                 param: result.param
             });
 
             return deferred.promise;
         }
         ctx.ChecklistEvaluationRuleEditContext = [];
         _editCondition = null;
     } else {
         let length = data.ChecklistRatingConditions.length;
         data.ChecklistRatingConditions[length] = [];
         var result = checkForValidations(length, ctx, data, true);
         if (!result.valid ) {
             data.ChecklistRatingConditions.pop();
             deferred.resolve({                
                 isDuplicate: result.isDuplicate,
                 isFieldEmpty: result.isFieldEmpty,
                 param: result.param
             });
 
             return deferred.promise;
         }
     }
     
     _resetEditWidgets = false;
     exports.cleanAll( ctx, data );
    
     let destPanelId = 'Aqc0AddChecklistEvaluationRuleSub';
     let context = {
         destPanelId: destPanelId,
         recreatePanel: true
     };
     eventBus.publish('awPanel.navigate', context);
 };
 
 /**
 * Edit filter condition when clicked on the edit cell.
  *
  * @param {ctx} ctx - The ctx of the viewModel
  * @param {data} data - The qualified data of the viewModel
  * @returns {boolean} true/false
  */
 var editFromChecklistEvaluationRuleEditCtx = function( ctx, data ) {
     for( let i = 0; i < data.ChecklistRatingConditions.length; i++ ) {
         let cond = data.ChecklistRatingConditions[ i ];
         if( cond.uid === _editCondition.uid ) {
             var result = checkForValidations(i, ctx, data);
             if( !result.valid ) {
                 return result;
             }
             break;
         }
     }
     resetWidgets( data );
     return {
         valid: true,        
         isDuplicate: false,
         isFieldEmpty: false
     }; 
 };
 
 /**
  * checkForValidations
  *
  * @param {var} i - The index
  * @param {ctx} ctx - The ctx of the viewModel
  * @param {DeclViewModel} data - The qualified data of the viewModel
  * @param {boolean} generateUid - Whether to generate UID or not
  * @returns {boolean} true/false
  */
 var checkForValidations = function (i, ctx, data, generateUid) {    
     //check if selected property is already exist in list
     for(let j =0; j < data.ChecklistRatingConditions.length; j++) {
         let cond = data.ChecklistRatingConditions[j];
         if((_editCondition && cond.uid !== _editCondition.uid && cond.propertyQName === data.propertyContext.dbValue) || (!_editCondition && cond.propertyQName === data.propertyContext.dbValue)) {
             return {
                 valid: false,
                 isDuplicate: true,
                 isFieldEmpty: false,
                 param: data.propertyContext.uiValue
             };            
         }             
     }
 
     data.ChecklistRatingConditions[i].conditionDisplayName = data.i18n.Aqc0ConditionCellNameSection;
     data.ChecklistRatingConditions[i].conditionName = data.i18n.Aqc0ConditionCellNameSection;
 
     data.ChecklistRatingConditions[i].propertyQName = data.propertyContext.dbValue;
     data.ChecklistRatingConditions[i].propertyDisplayName = data.propertyContext.uiValue;
 
     if (data.currentFieldValueType.dbValue === 'DATE') {
         if (checkWidgetEmptyOrNot(data, data.genericWidget)) {            
             return {
                 valid: false,
                 isDuplicate: false,
                 isFieldEmpty: true
             };               
         }
         let date = new Date(parseInt(data.genericWidget.dbValue));
         let formatDate = dateTimeSvc.formatDate(date, data.genericWidget.dateApi.dateFormatPlaceholder);
         data.ChecklistRatingConditions[i].value = formatDate;
         data.ChecklistRatingConditions[i].internalValue = dateTimeSvc.formatUTC(date);
     } else {
         let internalName = data.propertyContext.dbValue.split('.')[1];
         if (internalName !== 'object_name' && internalName !== 'object_desc') {
             if (checkWidgetEmptyOrNot(data, data.genericWidget)) {                
                 return {
                     valid: false,
                     isDuplicate: false,
                     isFieldEmpty: true
                 };  
             }
             data.ChecklistRatingConditions[i].value = data.genericWidget.uiValue.toString();
             data.ChecklistRatingConditions[i].internalValue = data.genericWidget.dbValue.toString();
         } else {
             data.ChecklistRatingConditions[i].value = data.genericWidget.uiValue;
             data.ChecklistRatingConditions[i].internalValue = data.genericWidget.dbValue;
         }
     }
 
     if (generateUid) {
         data.ChecklistRatingConditions[i].uid = Math.floor(Math.random() * 10000 + 1); // Uid generation for New Condition
     }
     return {
         valid: true,        
         isDuplicate: false,
         isFieldEmpty: false
     }; 
 };
 
 /**
  * check for value Widget Empty or Not .
  *
  * @param {DeclViewModel} data - The current data of view model
  * @param {object} genericWidget - The current active widget
  * @returns {boolean} true/false
  */
 var checkWidgetEmptyOrNot = function (data, genericWidget) {
     if (genericWidget.type === 'DATE') {
         if (genericWidget.dbValue > 0) {
             return false;
         }
     } else if (genericWidget.dbValue || genericWidget.dbValue === 0 || genericWidget.dbValue === false) { // false is added to support boolean type
         return false;
     }   
     return true;
 };
 
 /**
  * Get all the new checklist evaluation rules with existing rules
  * @param {DeclViewModel} data data of the current View model.
  */
 export let getChecklistEvalRulesToAdd = function (data) {
     var conditionList = data.ChecklistRatingConditions;
     var conditions = [];
     var ratingObject = data.ratingObject;
 
     if (ratingObject) {
         var getExistingConditions = ratingObject.props.qc0AssessmentRule.dbValues;
 
         if (getExistingConditions) {
             for (var i = 0; i < getExistingConditions.length; i++) {
                 conditions.push(getExistingConditions[i]);
             }
         }
     }
 
     var condition = "Rating: " + data.rating.dbValue + "; Answer: " + data.answer.dbValue;   
     if(data.state.dbValue || data.state.dbValue !==''){
         condition += "; qc0State: " + data.state.dbValue;
     }
     for (var cond = 0; cond < conditionList.length; cond++) {
         condition += "; ";
         condition += conditionList[cond].propertyQName;
         condition += ": ";
         condition += conditionList[cond].internalValue;
     }   
     conditions.push(condition.toString());
     data.ChecklistRatingConditions = [];
     data.dataProviders.getEvaluationRuleConditions.viewModelCollection.clear();
     return conditions;
 };
 
 /**
  * @return {Array} Array of conditions or rules (type string) already exist in the object..
  */
 function createTableRowData(ratingObject, data) {
     var rules = [];
     if (ratingObject) {
 
         var assessmentRules = ratingObject.props.qc0AssessmentRule.dbValues;
         for (var i = 0; i < assessmentRules.length; i++) {
             var rule = {};
 
             rule.type = ratingObject.type;
             rule.uid = i;
             rule.typeIconURL = "";
             rule.props = {};
             var qc0AssessmentRule = {
                 "type": "STRING",
                 "hasLov": false,
                 "isArray": false,
                 "displayValue": assessmentRules[i],
                 "uiValue": assessmentRules[i],
                 "value": assessmentRules[i],
                 "propertyName": "qc0AssessmentRule",
                 "propertyDisplayName": data.i18n.Aqc0TableColumnName,
                 "isEnabled": true
             };
             rule.props = {
                 qc0AssessmentRule: qc0AssessmentRule
             };
             rules.push(rule);
         }
     }
 
     return rules;
 }
 
 /**
  * Load Checklist evaluation rules. It creates data row to get loaded in table. 
  * @param {DeclViewModel} data data of the current View model.
  */
 export let loadChecklistEvalRuleExprTreeTableData = function (data) {
 
     var deferred = AwPromiseService.instance.defer();
     let ctx = appCtxService.ctx;
     var ratingObject;
     if (data.ratingObject && data.ratingObject.props.qc0AssessmentRule) {
         ratingObject = data.ratingObject;
     }
     else {
         var selectedObject = ctx.selected;
         var ratingObjectUID = selectedObject.props.qc0RatingRuleReference.dbValues[0];
         ratingObject = cdm.getObject(ratingObjectUID);
     }
 
     if (ratingObject && ratingObject.props && ratingObject.props.qc0AssessmentRule) {
         var rules = createTableRowData(ratingObject, data);
         deferred.resolve({
             rules: rules
         });
     } else {
         dms.getProperties([ratingObject.uid], ['qc0AssessmentRule']).then(
             function () {
                 var rules = createTableRowData(ratingObject, data);
                 deferred.resolve({
                     rules: rules
                 });
             });
     }
 
     return deferred.promise;
 };
 
 /**
  * Load table columns
  * @param {UwDataProvider} uwDataProvider an object that wraps access to a 'viewModelCollection'
  * @param {DeclViewModel} data data of the current View model.
  */
 export let loadTableColumns = function (uwDataProvider, data) {
     var deferred = AwPromiseService.instance.defer();
     appCtxService.ctx.tableDataProvider = uwDataProvider;
     var awColumnInfos = [];
     awColumnInfos.push(awColumnSvc.createColumnInfo({
         name: 'qc0AssessmentRule',
         displayName: data.i18n.Aqc0TableColumnName,
         width: checklistSpecSvc.getGridWidth('checklistEvalRuleExprSplmGridID'),
         minWidth: 200,
         typeName: 'String',
         enableColumnResizing: true,
         enableColumnMoving: false
     }));
 
     uwDataProvider.columnConfig = {
         columns: awColumnInfos
     };
     deferred.resolve({
         columnInfos: awColumnInfos
     });
 
     return deferred.promise;
 };
 
 /**
  * Move selected checklist evaluation rule up or down and returned array with updated order.
  * @param {Object} ctx current context
  * @param {DeclViewModel} data data of the current View model.
  */
 export let moveSelectedChecklistEvalRule = function (ctx, data) {
 
     var selectedEvalRule = ctx.tableDataProvider.selectedObjects[0];
     ctx.selectedRatingObject = null;
     ctx.selectedRatingObject = selectedEvalRule;    
     var indexOfSelection = selectedEvalRule.uid;
     var selectedConditionValue = selectedEvalRule.props.qc0AssessmentRule.value;
     var existingEvalRules = getExistingEvalRules(ctx, data, false);
 
     if (existingEvalRules.length > 0) {
         if (data.activeCommandDimension.popupId === 'Aqc0MoveUpCondForChecklistEvaluation') {
             if (indexOfSelection > 0) {
                 var selectedConditionFromArray = existingEvalRules[indexOfSelection];
                 if (selectedConditionFromArray === selectedConditionValue) {
                     existingEvalRules[indexOfSelection] = existingEvalRules[indexOfSelection - 1];
                     existingEvalRules[indexOfSelection - 1] = selectedConditionFromArray;
                 }
             }
         } else if (data.activeCommandDimension.popupId === 'Aqc0MoveDownCondForChecklistEvaluation') {
             if (indexOfSelection < existingEvalRules.length - 1) {
                 var selectedConditionFromArray = existingEvalRules[indexOfSelection];
                 if (selectedConditionFromArray === selectedConditionValue) {
                     existingEvalRules[indexOfSelection] = existingEvalRules[indexOfSelection + 1];
                     existingEvalRules[indexOfSelection + 1] = selectedConditionFromArray;
                 }
             }
         }
     }    
 
     return existingEvalRules;
 };
 
 /**
  * get existing evaluation rules in table data format.
  * @param {Object} ctx current context
  * @param {DeclViewModel} data data of the current View model.
  * @param {boolean} createTableRowMetadata set true, if need Table Row object array in return else false.
  * @return {Array} Array of conditions (type string or vmo) already exist in the object.. 
  */
 function getExistingEvalRules(ctx, data, createTableRowMetadata) {
     var checklistSpecObject = ctx.pselected;
     var ratingruleObjectUID = checklistSpecObject.props.qc0RatingRuleReference.dbValues[0];
     var ratingObject = cdm.getObject(ratingruleObjectUID);
     if(createTableRowMetadata){
         return createTableRowData(ratingObject, data);
     }else {
         return ratingObject.props.qc0AssessmentRule.dbValues;
     }    
 }
 
 /**
  * Delete selected checklist evaluation rule and returned array with remaining evaluation rules.
  * @param {Object} ctx current context
  * @param {data} data - The qualified data of the viewModel
  */
 export let deleteSelectedChecklistEvalRule = function (ctx, data) {
     var selectedConditions = ctx.tableDataProvider.selectedObjects;
     var existingEvalRules = getExistingEvalRules(ctx, data, true);
 
     for (var i = 0; i < selectedConditions.length; i++) {
         var indexOfSelection = selectedConditions[i].uid;
         var selectedConditionValue = selectedConditions[i].props.qc0AssessmentRule.value;
         for (var j = 0; j < existingEvalRules.length; j++) {            
             if (existingEvalRules[j].uid === indexOfSelection && existingEvalRules[j].props.qc0AssessmentRule.value === selectedConditionValue) {                
                 existingEvalRules.splice(j, 1); 
                 break;               
             }
         }       
     }
     return existingEvalRules.map(rule => rule.props.qc0AssessmentRule.value);
 };
 
 var removeFromDataContext = function (ctx, data, deletedUid) {
     for (let i =0; i < data.ChecklistRatingConditions.length; i++){
         let cond = data.ChecklistRatingConditions[i];
         if(cond.uid === deletedUid){
             data.ChecklistRatingConditions.splice(i,1);
             break;
         }
     }
     resetWidgets( data, null );
     return true;
 };
 
 /**
  * Remove condition called when clicked on the remove cell.
  *
  * @param {ctx} ctx - The ctx of the viewModel
  * @param {data} data - The qualified data of the viewModel
  * @param {object} deletedUid - The Uid to be deleted
  */
  export let removeCondition = function( ctx, data, deletedUid ) {
     let memberModelObjects = data.dataProviders.getEvaluationRuleConditions.viewModelCollection.loadedVMObjects;
     
     for(let i=0; i < memberModelObjects.length; i++){
         if(memberModelObjects[i].uid === deletedUid){
             memberModelObjects.splice(i,1);
             break;
         }
     }
     data.dataProviders.getEvaluationRuleConditions.update( memberModelObjects );
     removeFromDataContext( ctx, data, deletedUid );
 };
 
 
 /**
  * Execute the delete command. 
  *
  * @param {ViewModelObject} vmo - Context for the command 
  * @param {DeclViewModel} data - The qualified data of the viewModel
  */
  export let deleteEvaluationRuleCondition = function( vmo, data ) {
     if( vmo && vmo.uid && data ) {
         data.vmo = vmo;
         eventBus.publish( 'Aqc0AddChecklistEvaluationRuleSub.removeCondition', data );
     }
 };
 
 /**
  * Clean up the registers
  *
  * @param {ctx} ctx - The ctx of the viewModel
  */
 export let cleanUpEdit = function( ctx ) {
     if( ctx.ChecklistEvaluationRuleEditContext ) {
         appCtxService.unRegisterCtx( 'ChecklistEvaluationRuleEditContext' );        
     }
     _resetEditWidgets = false;
 };
 
 /**
  * Clean up the registers and data
  *
  * @param {ctx} ctx - The ctx of the viewModel
  * @param {DeclViewModel} data - The qualified data of the viewModel
  */
 export let cleanAll = function ( ctx, data) {
     cleanUpEdit(ctx);   
     cleanData(data);
 };
 
 /**
  * Clean up the data
  * @param {DeclViewModel} data - The qualified data of the viewModel
  */
  var cleanData = function (data) {
     data.isDuplicate = false;
     data.isFieldEmpty = false;
     data.errorParam = null;
 };
 
 /**
  * Execute the edit command. 
  *
  * @param {ViewModelObject} vmo - Context for the command 
  * @param {DeclViewModel} data - The qualified data of the viewModel
  */
 export let editEvaluationRuleCondition = function( vmo, data ) {
     if( vmo) {    
         if( !appCtxService.ctx.ChecklistEvaluationRuleEditContext ) {
             appCtxService.registerCtx( 'ChecklistEvaluationRuleEditContext', [] );
         }
         appCtxService.ctx.ChecklistEvaluationRuleEditContext = _.cloneDeep( vmo );
 
         let destPanelId = 'Aqc0AddEvaluationCondition';
         let context = {
             destPanelId: destPanelId,
             title: data.i18n.Aqc0Add,
             recreatePanel: true,
             supportGoBack: true
         };
         eventBus.publish( 'awPanel.navigate', context );
     }
 };
 
 export let editChecklistEvalRuleConditon = function( ctx, data ){
     if(ctx.ChecklistEvaluationRuleEditContext){
         data.propertyContext.dbValue = ctx.ChecklistEvaluationRuleEditContext.cellProperties[ data.Aqc0PropertySection.dbValue ].internalValue;
         data.propertyContext.uiValue = ctx.ChecklistEvaluationRuleEditContext.cellProperties[ data.Aqc0PropertySection.dbValue ].value;
         exports.getPropertyAction('Qc0ChecklistSpecification',ctx,data);
     }
 };

 export let populateErrorString = function( response ) {
    return checklistSpecSvc.populateErrorString(response);
};
 
 export default exports = {
     getPropertyAction,
     displayPropertyPreferencesAction,
     selectionChangeOfPropertyContext,
     getEvaluationRuleConditions,
     setGenericWidgetDisplayValue,
     addConditionToCtx,     
     getChecklistEvalRulesToAdd,
     loadChecklistEvalRuleExprTreeTableData,     
     loadTableColumns,     
     moveSelectedChecklistEvalRule,
     deleteSelectedChecklistEvalRule,    
     removeCondition,
     deleteEvaluationRuleCondition,
     editEvaluationRuleCondition,
     editChecklistEvalRuleConditon,     
     cleanAll,
     cleanUpEdit,
     populateErrorString
 };
 app.factory('Aqc0ChecklistSpecRatingEvalRuleService', () => exports);
 