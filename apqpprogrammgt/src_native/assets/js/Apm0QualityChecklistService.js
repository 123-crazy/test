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

 * @module js/Apm0QualityChecklistService
 */

 import * as app from 'app';
 import appCtxService from 'js/appCtxService';
 import AwPromiseService from 'js/awPromiseService';
 import messagingService from 'js/messagingService';
 import soaSvc from 'soa/kernel/soaService';
 import cdm from 'soa/kernel/clientDataModel';
 import dms from 'soa/dataManagementService';
 import colorDecoratorService from 'js/colorDecoratorService';
 import ProgramScheduleManagerConstants from 'js/ProgramScheduleManagerConstants';
 import _ from 'lodash';
 import Psi0ChecklistService from 'js/Psi0ChecklistService';
 import 'jquery';

 var exports = {};


 export let setSelectedChecklistSpec = function( ctx, data) {

     let selectedChecklistSpec = {};
     selectedChecklistSpec = data.dataProviders.checklistTypeListProvider.selectedObjects[0];

     selectedChecklistSpec.object_name = data.dataProviders.checklistTypeListProvider.selectedObjects[0].props.object_name.dbValue;
     selectedChecklistSpec.object_desc = data.dataProviders.checklistTypeListProvider.selectedObjects[0].props.object_desc.dbValue;
     selectedChecklistSpec.qc0ChecklistType = data.dataProviders.checklistTypeListProvider.selectedObjects[0].props.qc0ChecklistType.dbValue;

     selectedChecklistSpec.qc0AssessmentRequired = data.dataProviders.checklistTypeListProvider.selectedObjects[0].props.qc0AssessmentRequired.dbValue;
     selectedChecklistSpec.qc0Mandatory = data.dataProviders.checklistTypeListProvider.selectedObjects[0].props.qc0Mandatory.dbValue;
     selectedChecklistSpec.qc0Number = data.dataProviders.checklistTypeListProvider.selectedObjects[0].props.qc0Number.dbValue;

     appCtxService.updateCtx( 'selectedChecklistSpec', selectedChecklistSpec );

 };

 /**
  * Update fnd0ActionId in data
  *
  * @param {object} data - The qualified data of the viewModel
  * @param {ctx} ctx - The qualified context of the viewModel
  */
 export let updateQualityChecklistID = function( data, ctx ) {
     data.psi0ID.dbValue = ctx.QualityChecklistId;
     data.psi0ID.uiValue = ctx.QualityChecklistId;
     data.psi0ID.dbValues = ctx.QualityChecklistId;
 };

 /**
  * This method is used to get the LOV values for the versioning panel.
  * @param {Object} response the response of the getLov soa
  * @returns {Object} value the LOV value
  */
  export let getLOVList = function (response) {
     return response.lovValues.map(function (obj) {
         return {
             propDisplayValue: obj.propDisplayValues.lov_values[0],
             propDisplayDescription: obj.propDisplayValues.lov_value_descriptions ? obj.propDisplayValues.lov_value_descriptions[0] : obj.propDisplayValues.lov_values[0],
             propInternalValue: obj.propInternalValues.lov_values[0]
         };
     });
 };

 /**
 * Initialize audit norm value list from assigned audit guideline object.
 * @param {object} ctx - Context
 * @param {DeclViewModel} data - The qualified data of the viewModel 
*/
export let initializeAnswerOptions = function( ctx, data ) {
    var tcData = ctx.tcSessionData;
    if(tcData.tcMajorVersion > 14 || (tcData.tcMajorVersion === 14 && tcData.tcMinorVersion >= 1)) {
        var viewProp = ctx.xrtSummaryContextObject.props.apm0Answer;
        var checklistSpecReferenceUID = ctx.xrtSummaryContextObject.props.apm0ChecklistSpecReference.dbValues[ 0 ];
    
        viewProp.hasLov = true;
        viewProp.lovApi = {};
        viewProp.isSelectOnly = true;
        // Retrieve Answer options from checklist spec reference
        loadAnswerOptionsFromSpecification(checklistSpecReferenceUID, data).then( function( response ) {
            viewProp.lovApi.getInitialValues = function( filterStr, deferred ) {
                var lovEntries = [];
                var lovinput = response.answerOptions;
                var lovinputValue = response.answerOptionValues;
            
                for( let i = 0; i < lovinput.length; i++ ) {
                    var internalValue = lovinput[ i ];
                    var displayValue = lovinput[ i ];
                    var displayDescription = 'Value: ' + lovinputValue[ i ]; 
                    
                    var isSelected = viewProp.dbValue === internalValue ? true : false;
    
                    lovEntries.push( {
                        propDisplayValue: displayValue,
                        propInternalValue: internalValue,
                        propDisplayDescription: displayDescription,
                        hasChildren: false,
                        children: {},
                        sel: isSelected
                    } );
                }
    
                return deferred.resolve( lovEntries );
            };
    
            viewProp.lovApi.getNextValues = function( deferred ) {
                deferred.resolve( null );
            };
    
            viewProp.lovApi.validateLOVValueSelections = function( values ) {
                return false;
            };
        },
        function( error ) {
            messagingService.showError( error );
        } );
    } else if(tcData.tcMajorVersion === 14 && tcData.tcMinorVersion === 0) {
        var viewProp = ctx.xrtSummaryContextObject.props.apm0Answer;        
        viewProp.hasLov = true;
        viewProp.lovApi = {};
        viewProp.isSelectOnly = true;

        loadAnswersFromPreference().then (function (preferenceValues) {

            viewProp.lovApi.getInitialValues = function( filterStr, deferred ) {
                var lovEntries = [];
                _.forEach(preferenceValues, optionString => {
                    if(optionString.includes(":")){
                        var answerTextToken = optionString.split(":");                       
                        var answerDesc = answerTextToken[1];
                        if(answerDesc.trim() !== ''){                                                                        
                            lovEntries.push( {
                                propDisplayValue: answerTextToken[0],
                                propInternalValue: answerTextToken[0],
                                propDisplayDescription: answerDesc,
                                hasChildren: false,
                                children: {}
                            } );
                        } else {
                            lovEntries.push( {
                                propDisplayValue: answerTextToken[0],
                                propInternalValue: answerTextToken[0],                                
                                hasChildren: false,
                                children: {}
                            } );
                        }
                    }
                });    
        
                return deferred.resolve( lovEntries );
            };
        
            viewProp.lovApi.getNextValues = function( deferred ) {
                deferred.resolve( null );
            };

            viewProp.lovApi.validateLOVValueSelections = function( values ) {
                return false;
            };

        },function( error ) {
            var errMessage = messagingService.getSOAErrorMessage( error );
            messagingService.showError( errMessage );
        });
    }    
};

/**
 * Get the preference configured in RAC for answers options specific for 14.0 version and load them in LOV
 *
 * @param {DeclViewModel} data - The qualified data of the viewModel 
 */
 var loadAnswersFromPreference = function () {   
    var deferred = AwPromiseService.instance.defer();         
    soaSvc.postUnchecked('Administration-2012-09-PreferenceManagement', 'getPreferences', {
        preferenceNames: ['Apm0AnswerOptionsForTCVersion140'],
        includePreferenceDescriptions: false
    }).then(function (preferenceResult) {
        if (preferenceResult && preferenceResult.response.length > 0) {
            var preferenceValues = preferenceResult.response[0].values.values;           
            deferred.resolve(preferenceValues);
        } else if( preferenceResult && preferenceResult.ServiceData.partialErrors.length > 0 ) {
            deferred.reject(preferenceResult.ServiceData);
        }
    }, function( error ) {       
       deferred.reject(error);
    } );       
    return deferred.promise;
};

/**
 * load answer options and values from rating rule object.
 */
var loadAnswerOptionsFromSpecification = function (checklistSpecReferenceUID, data) {

    let deferred = AwPromiseService.instance.defer();

    let ratingRulePropName = "qc0RatingRuleReference";
    let answerOptionPropName = "qc0AnswerOptions";
    let answerOptionValuesPropName = "qc0AnswerOptionValues";

    var checklistSpecObject;
    var answerOptions;
    var answerOptionValues;

    getRootChecklistSpecificationObject(checklistSpecReferenceUID).then (function (obj){
        checklistSpecObject = obj;

        if (checklistSpecObject) {
            var ratingRuleObjectUID = checklistSpecObject.props[ratingRulePropName].dbValues[0];
            if(ratingRuleObjectUID) {
                var ratingObject = cdm.getObject(ratingRuleObjectUID);
                if (!ratingObject.props[answerOptionPropName]) {
                    dms.getProperties([ratingRuleObjectUID], [answerOptionPropName,answerOptionValuesPropName]).then(
                        function () {
                            ratingObject = cdm.getObject(ratingRuleObjectUID);
                            answerOptions = ratingObject.props[answerOptionPropName].dbValues ;
                            answerOptionValues = ratingObject.props[answerOptionValuesPropName].dbValues;
                            deferred.resolve({
                                answerOptions: answerOptions,
                                answerOptionValues: answerOptionValues
                            });
                        }
                    );
                } else {
                    answerOptions = ratingObject.props[answerOptionPropName].dbValues ;
                    answerOptionValues = ratingObject.props[answerOptionValuesPropName].dbValues;
                    deferred.resolve({
                        answerOptions: answerOptions,
                        answerOptionValues: answerOptionValues
                    });
                }
            } else {
                var msg = '';
                msg = msg.concat( data.i18n.Apm0AnswerConfigUnavailable );                
                deferred.reject( msg );
            }         
        }    
    });
    return deferred.promise;
};

var getRootChecklistSpecificationObject = function(parentChecklistUID) {

    let deferred = AwPromiseService.instance.defer();

    var checklistSpecObject = null;
   
    checklistSpecObject = cdm.getObject(parentChecklistUID);
    //check if qc0ParentChecklistSpec property exists in object
    if(checklistSpecObject.props && checklistSpecObject.props.hasOwnProperty( 'qc0ParentChecklistSpec' ) ) {
        parentChecklistUID = checklistSpecObject.props['qc0ParentChecklistSpec'].dbValues[0];

        if(parentChecklistUID) {
            return getRootChecklistSpecificationObject(parentChecklistUID);
        } else {
            deferred.resolve(checklistSpecObject);
        }
    } else {
        //qc0ParentChecklistSpec property does not exist. Need to get properties.
        dms.getProperties([parentChecklistUID], ['qc0ParentChecklistSpec', 'qc0RatingRuleReference']).then(
            function () {
                checklistSpecObject = cdm.getObject(parentChecklistUID);
                parentChecklistUID = checklistSpecObject.props['qc0ParentChecklistSpec'].dbValues[0];

                if(parentChecklistUID) {
                    //recursive function call to load parent checklist object
                    getRootChecklistSpecificationObject(parentChecklistUID).then(
                        function(obj) {
                            deferred.resolve(obj);
                        }
                    );
                } else {                    
                    deferred.resolve(checklistSpecObject);
                }
            }
        );
    }

    return deferred.promise;
};

export let groupObjectsForDecorators = function( vmos, modifiedObjects ) {
    exports.setDecoratorStyles(vmos, false, modifiedObjects );
};

var setRYGDecorators = function( objectsToDecorate ) {

    _.forEach(objectsToDecorate, function(objInArr) {
        var rygValue = objInArr.rygObject.props.apm0Rating.dbValues[ 0 ];
        if( rygValue ) {
            var rygDecoratorMap = ProgramScheduleManagerConstants.RYG_DECORATOR_STYLE;
            if( rygDecoratorMap && rygDecoratorMap[ rygValue ].cellDecoratorStyle ) {
                objInArr.viewModelTreeNode.cellDecoratorStyle = rygDecoratorMap[ rygValue ].cellDecoratorStyle;
            }
            if( rygDecoratorMap && rygDecoratorMap[ rygValue ].gridDecoratorStyle ) {
                objInArr.viewModelTreeNode.gridDecoratorStyle = rygDecoratorMap[ rygValue ].gridDecoratorStyle;
            }
        } else {
            objInArr.viewModelTreeNode.cellDecoratorStyle = '';
            objInArr.viewModelTreeNode.gridDecoratorStyle = '';
        }       
    });
    
};

/**
 * Method to set Grid and Cell Decorator style to vmo
 * @param {ViewModelObject} vmos - ViewModelObject(s) to set style on
 * @param {Boolean} clearStyles - Clear style passed as false
 */

 export let setDecoratorStyles = function(vmos, clearStyles, modifiedObjects ) {

    let objectSetRowVMOs = vmos.filter(vmo => vmo.modelType.typeHierarchyArray.indexOf( 'Awp0XRTObjectSetRow' ) > -1);
    if(objectSetRowVMOs.length > 0) {
        _.forEach(objectSetRowVMOs, function(vmo){
            Psi0ChecklistService.setRYGDecorator(vmo);
        });
        vmos = vmos.filter(vmo => vmo.modelType.typeHierarchyArray.indexOf( 'Awp0XRTObjectSetRow' ) === -1);
    }
    function rygObjectFilter(obj) {
        return obj.modelType.typeHierarchyArray.indexOf('Apm0RYG') > -1 && !(obj.props && obj.props.hasOwnProperty('apm0RatedObject') && obj.props.hasOwnProperty('apm0Rating'));
    }

    var RYGObjects;
    if(modifiedObjects && Array.isArray(modifiedObjects) && modifiedObjects.length > 0) {
        RYGObjects = modifiedObjects.filter(rygObjectFilter);
    }

    if(RYGObjects && RYGObjects.length > 0) {
        dms.getProperties(RYGObjects.map(obj=> obj.uid), ['apm0RatedObject', 'apm0Rating'] )
        .then(function(){
            var objectsToDecorate = [];
            _.forEach(modifiedObjects, function(mod){
                var vmo;
                var rygObject;
                var vmto;
                if(mod.modelType.typeHierarchyArray.indexOf('Apm0RYG') > -1) {
                    rygObject = mod;
                    let vmoTag = mod.props.apm0RatedObject.dbValues[0];
                    vmo = cdm.getObject(vmoTag);
                    vmto = vmos.find(obj => obj.uid===vmo.uid);               
                } else if(mod.modelType.typeHierarchyArray.indexOf('Psi0AbsChecklist') > -1) {                   
                    vmo = mod;
                    let rygtag = mod.props.apm0RatedReference.dbValues[0];
                    rygObject = cdm.getObject( rygtag );
                    vmto = vmos.find(vmo => vmo.uid===mod.uid);                                   
                }
                if(rygObject && vmto){
                    objectsToDecorate.push({                        
                        rygObject: rygObject,
                        viewModelTreeNode: vmto
                    });
                }               
            });
    
            if(objectsToDecorate && objectsToDecorate.length > 0) {
                setRYGDecorators(objectsToDecorate);
                colorDecoratorService.setDecoratorStyles( objectsToDecorate.map(obj => obj.viewModelTreeNode) );
            }               
        });        

    } else if(modifiedObjects && Array.isArray(modifiedObjects) && modifiedObjects.length > 0) {      
        var objectsToDecorate = [];  
        _.forEach(modifiedObjects, function(mod){
            var vmo;
            var rygObject;
            var vmto;
            if(mod.modelType.typeHierarchyArray.indexOf('Apm0RYG') > -1) {
                rygObject = mod;
                let vmoTag = mod.props.apm0RatedObject.dbValues[0];
                vmo = cdm.getObject(vmoTag);
                vmto = vmos.find(obj => obj.uid===vmo.uid);               
            } else if(mod.modelType.typeHierarchyArray.indexOf('Psi0AbsChecklist') > -1)  {
                vmo = mod;
                if(mod.props && mod.props.apm0RatedReference){
                    let rygtag = mod.props.apm0RatedReference.dbValues[0];
                    rygObject = cdm.getObject( rygtag );
                }                
                vmto = vmos.find(vmo => vmo.uid===mod.uid);               
            } 
            if(rygObject && vmto){
                objectsToDecorate.push({                    
                    rygObject: rygObject,
                    viewModelTreeNode: vmto
                });
            } 
        });

        if(objectsToDecorate && objectsToDecorate.length > 0) {
            setRYGDecorators(objectsToDecorate);
            colorDecoratorService.setDecoratorStyles( objectsToDecorate.map(obj => obj.viewModelTreeNode) );
        }    
    
    } 
    else {  
        if(vmos && vmos.length > 0) {
            var RYGObjectTags = vmos.map(obj => obj.props.apm0RatedReference.dbValues[0]);
            RYGObjects = cdm.getObjects(RYGObjectTags);
            var RYGObjectsWOProps = RYGObjects.filter(rygObjectFilter);

            if(RYGObjectsWOProps && RYGObjectsWOProps.length > 0){
                dms.getProperties(RYGObjectsWOProps.map(obj=> obj.uid), ['apm0RatedObject', 'apm0Rating'] )
                .then(function(){         
                    var objectsToDecorate = [];       
                    _.forEach(vmos, function(mod){                    
                        var rygObject;
                        var vmto;
                        if(mod.modelType.typeHierarchyArray.indexOf('Psi0AbsChecklist') > -1) {                        
                            let rygtag = mod.props.apm0RatedReference.dbValues[0];
                            rygObject = RYGObjects.find(obj=> obj.uid === rygtag);
                            vmto = mod;     
                        }
                        if(rygObject){
                            objectsToDecorate.push({                        
                                rygObject: rygObject,
                                viewModelTreeNode: vmto
                            });
                        }                   
                    });
            
                    if(objectsToDecorate && objectsToDecorate.length > 0) {
                        setRYGDecorators(objectsToDecorate);
                        colorDecoratorService.setDecoratorStyles( objectsToDecorate.map(obj => obj.viewModelTreeNode) );
                    }                   
                });        
            } else {        
                var objectsToDecorate = [];
                _.forEach(vmos, function(mod){                    
                    var rygObject;
                    var vmto;
                    if(mod.modelType.typeHierarchyArray.indexOf('Psi0AbsChecklist') > -1) {                        
                        let rygtag = mod.props.apm0RatedReference.dbValues[0];
                        rygObject = RYGObjects.find(obj=> obj.uid === rygtag);
                        vmto = mod;     
                    }
                    if(rygObject && vmto) {
                        objectsToDecorate.push({                        
                            rygObject: rygObject,
                            viewModelTreeNode: vmto
                        });
                    }                
                });
                if(objectsToDecorate && objectsToDecorate.length > 0) {
                    setRYGDecorators(objectsToDecorate);
                    colorDecoratorService.setDecoratorStyles( objectsToDecorate.map(obj => obj.viewModelTreeNode) );
                }            
            } 
        }                      
    }    
};

 export default exports = {
     setSelectedChecklistSpec,
     updateQualityChecklistID,
     getLOVList,
     initializeAnswerOptions,
     groupObjectsForDecorators,
     setDecoratorStyles
 };
 app.factory( 'Apm0QualityChecklistService', () => exports );
