/* eslint-disable max-lines */
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
 * Module for the Import Specification panel for Word
 *
 * @module js/Arm0ImportFromWord
 */

import app from 'app';
import messagingService from 'js/messagingService';
import appCtxSvc from 'js/appCtxService';
import notyService from 'js/NotyModule';
import requirementsUtils from 'js/requirementsUtils';
import $ from 'jquery';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var _ruleName = null;
var _ruleScope = null;
var PROP_RULE_CONST = 'Arm0AddRulesSub.selectedPropRule';
var RULE_CONST = 'Arm0AddRulesSub.selectedRule';
var RULE_ERROR_CONST = 'importSpecification.showAddRuleError';
var PROP_RULE_ERROR_CONST = 'importSpecification.showAddPropRuleError';
var CONDITION_ERROR = 'importSpecification.showAddConditionError';

// Form data of the selected file, required on Update Preview in case of PDF
var _formData;

/**
 * Show leave warning message in Preview Screen
 *
 * @param {Object} data - The view model data
 * @param {Object} fileName - Selected file for import
 */
export let closeImportPreview = function( data, fileName ) {
    if( fileName && data && data.i18n && data.i18n.notificationForPreviewClose ) {
        var msg = data.i18n.notificationForPreviewClose.replace( '{0}', fileName );
        var buttons = [ {
            addClass: 'btn btn-notify',
            text: data.i18n.stayTitle,
            onClick: function( $noty ) {
                $noty.close();
            }
        }, {
            addClass: 'btn btn-notify',
            text: data.i18n.closeTitle,
            onClick: function( $noty ) {
                $noty.close();
                eventBus.publish( 'importPreview.navigateToBack' );
            }
        } ];

        messagingService.showWarning( msg, buttons );
    }
};

/**
 * Proxy function to publish closeImportPreview event
 */
export let closeImportPreviewProxyFunction = function() {
    eventBus.publish( 'Arm0ImportPreview.closeImportPreview' );
};

var _isSentenceBeginOnNewLineRuleAdded = function( data ) {
    var isSentenceBeginOnNewLineRuleAdded = false;
    for( var i = 0; i < data.operationTypeValues.dbValue.length; i++ ) {
        if( data.operationTypeValues.dbValue[ i ].propInternalValue === 'SENTENCE_BEGIN_ON_NEW_LINE' )
        {
            isSentenceBeginOnNewLineRuleAdded = true;
        }
    }
    return isSentenceBeginOnNewLineRuleAdded;
};
/**
 * revealArm0AddRulesSub for reveal of Arm0AddRulesSub panel.
 *
 * @param {Object} data - The view model data
 */
export let revealArm0AddRulesSub = function( data ) {
    var selectedRule = appCtxSvc.getCtx( RULE_CONST );

    if( selectedRule !== null ) {
        //while editing other rules than "SENTENCE_BEGIN_ON_NEW_LINE" delete this rule from list if already added
        for( let index = 0; index < selectedRule.keywordImportConditions.length; index++ ) {
            if( !selectedRule || ( selectedRule && selectedRule.keywordImportConditions[ index ].opType !== 'SENTENCE_BEGIN_ON_NEW_LINE' ) ) {
                if( data.conditionOfRuleMap && data.conditionOfRuleMap[ 'SENTENCE_BEGIN_ON_NEW_LINE' ] ) {
                    for( var i = data.operationTypeValues.dbValue.length - 1; i >= 0; i-- ) {
                        if( data.operationTypeValues.dbValue[ i ].propInternalValue === 'SENTENCE_BEGIN_ON_NEW_LINE' ) {
                            data.operationTypeValues.dbValue.splice( i, 1 );
                        }
                    }
                }
            }
            var isSentenceBeginOnNewLineRuleAdded = _isSentenceBeginOnNewLineRuleAdded( data );
            //Add rule back to list if user wants to edit "SENTENCE_BEGIN_ON_NEW_LINE" rule
            if( selectedRule && selectedRule.keywordImportConditions[ index ].opType === 'SENTENCE_BEGIN_ON_NEW_LINE' && !isSentenceBeginOnNewLineRuleAdded ) {
                var sentenceBeginOnNewLineModel = _getEmptyListModel();
                sentenceBeginOnNewLineModel.propDisplayValue = data.i18n.sentenceBeginOnNewLine;
                sentenceBeginOnNewLineModel.propInternalValue = 'SENTENCE_BEGIN_ON_NEW_LINE';
                data.operationTypeValues.dbValue.push( sentenceBeginOnNewLineModel );
            }
        }
    }else{
        //while adding new rule check and delete "SENTENCE_BEGIN_ON_NEW_LINE" rule if already added
        var isSentenceBeginOnNewLineRuleAdded = _isSentenceBeginOnNewLineRuleAdded( data );
        if(isSentenceBeginOnNewLineRuleAdded && data.conditionOfRuleMap && data.conditionOfRuleMap[ 'SENTENCE_BEGIN_ON_NEW_LINE' ]){
            for( var i = data.operationTypeValues.dbValue.length - 1; i >= 0; i-- ) {
                if( data.operationTypeValues.dbValue[ i ].propInternalValue === 'SENTENCE_BEGIN_ON_NEW_LINE' ) {
                    data.operationTypeValues.dbValue.splice( i, 1 );
                }
            }
        }
    }
    data.tempPropRuleArray = [];
    // data.propertyTypeMap = {};
    // remove style rule in case of pdf import
    if( appCtxSvc.ctx && appCtxSvc.ctx.isArm0ImportFromPDFSubPanelActive && data.operationTypeValues && data.operationTypeValues.dbValues ) {
        data.operationTypeValues.dbValues.splice( _.findIndex( data.operationTypeValues.dbValues, function( item ) {
            return item.propInternalValue === 'Has_Style';
        } ), 1 );
    }

    if( data.preferences.REQ_Microservice_Installed[ 0 ] === 'true' ) {
        data.addConditionList.dbValue = [];
        if( selectedRule && data.importRules.dbValue.length > 0 ) {
            data.importType.dbValue = selectedRule.targetChildType;
            data.dispPropRules.dbValue = selectedRule.advancedRules;
            if( selectedRule.advancedRules.length ) {
                _.forEach( selectedRule.advancedRules, function( advancedRuleObj ) {
                    data.tempPropRuleArray.push( advancedRuleObj.propertyNameValue.Key );
                } );
            }
            setTimeout( function() {
                getConditionListForBasedOnAddedRules( data, selectedRule );
            }, 200 );
        } else {
            data.addConditionList.dbValue.push( {
                operationType: _.clone( data.operationType, true ),
                style: _.clone( data.style, true ),
                operationValues: _.clone( data.operationValues, true ),
                operationCheckboxValues: _.clone( data.operationCheckboxValues, true ),
                operationTypeValues: data.operationTypeValues,
                styleValues: data.styleValues
            } );
        }
    } else {
        if( data.importRules.dbValue.length > 0 ) {
            _getOpTypesBasedOnAddedRules( data );
        }
        if( selectedRule && data.importType ) {
            data.importType.dbValue = selectedRule.cellHeader1InVal;
            data.importType.uiValue = selectedRule.cellHeader1;
            if( selectedRule.cellHeader2InVal === 'Word_Contains' ) {
                data.operationValues.dbValue = selectedRule.cellHeader4;
                data.operationValues.uiValue = selectedRule.cellHeader4;
                data.operationSubType.dbValue = selectedRule.cellHeader3InVal;
                data.operationSubType.uiValue = selectedRule.cellHeader3;
            } else {
                data.style.dbValue = selectedRule.cellHeader3InVal;
                data.style.uiValue = selectedRule.cellHeader3;
            }
        }
    }
};
/**
 * Return an empty ListModel object.
 * @param {Object} data - The view model data
 */
var _getOpTypesBasedOnAddedRules = function( data ) {
    var isWordContainsRule = false;
    if( data.importRules.dbValue.length > 0 && data.importRules.dbValue[ 0 ].cellHeader2InVal === 'Word_Contains' ) {
        isWordContainsRule = true;
    }

    for( var i = data.operationTypeValues.dbValue.length - 1; i >= 0; i-- ) {
        if( isWordContainsRule ) {
            clearWordContainsRule( data );
            if( data.operationTypeValues.dbValue[ i ].propInternalValue === 'Has_Style' ) {
                data.operationTypeValues.dbValue.splice( i, 1 );
            }
        } else {
            clearHasStyleRule( data );
            if( data.operationTypeValues.dbValue[ i ].propInternalValue === 'Word_Contains' ) {
                data.operationTypeValues.dbValue.splice( i, 1 );
            }
        }
    }
};

/**
 * Clears view data
 * @param {Object} data - The view model data
 */
function clearWordContainsRule( data ) {
    data.operationValues.uiValue = '';
    data.operationValues.dbValue = '';
    data.operationSubType.uiValue = data.i18n.exactMatch;
    data.operationSubType.dbValue = 'Exact_Match';
    data.importType.dbValue = data.reqSpecEleTypeList[ 0 ].propInternalValue;
    data.importType.uiValue = data.reqSpecEleTypeList[ 0 ].propDisplayValue;
}

/**
 * Clears view data
 * @param {Object} data - The view model data
 */
function clearHasStyleRule( data ) {
    data.importType.dbValue = data.reqSpecEleTypeList[ 0 ].propInternalValue;
    data.importType.uiValue = data.reqSpecEleTypeList[ 0 ].propDisplayValue;
    data.style.dbValue = 'Heading 1';
    data.style.uiValue = 'Heading 1';
}

/**
 * Create imput for saving an import rule
 *
 * @param {Object} data - The view model data
 */
export let createSaveRulesInput = function( data ) {
    var input = {};
    var rulesData = {};
    if( data.savedRules.dbValue ) {
        rulesData.ruleName = data.savedRules.dbValue;
        rulesData.ruleDispName = data.savedRules.dbValue;
        rulesData.accessRight = 'WRITE';
        rulesData.ruleObject = data.selectedRule.ruleObject;
        rulesData.ruleScope = data.selectedRule.ruleScope;
        input.actionName = 'UPDATE';
    } else if( _ruleName ) {
        rulesData.ruleName = _ruleName;
        rulesData.ruleDispName = _ruleName;
        data.savedRules.dbValue =_ruleName;
        data.savedRules.uiValue =_ruleName;
        rulesData.accessRight = 'WRITE';
        rulesData.ruleObject = {
            uid: 'AAAAAAAAAAAAAA',
            type: 'unknownType'
        };
        input.actionName = 'CREATE';
        if( _ruleScope ) {
            rulesData.ruleScope = _ruleScope;
        }
    }
    rulesData.rules = JSON.stringify( data.importRules.dbValue );
    if( data.preferences.REQ_Microservice_Installed[ 0 ] === 'true' ) {
        input.mappingType = 'SaveAdvanceRule';
    } else {
        input.mappingType = 'SaveLegacyRule';
    }
    input.rulesData = [ rulesData ];
    data.importInput = input;
    _ruleName = null;
    _ruleScope = null;
    eventBus.publish( 'importSpecification.saveImportRule' );
};

/**
 * To fire event for save rule button click on popup
 * @param {Object} data - The view model data
 */
export let saveImportRulePopupButtonClicked = function( data ) {
    _ruleName = data.ruleName.dbValue;
    if( data.globalScopeCheck.dbValue === true ) {
        _ruleScope = 'GLOBAL';
    } else {
        _ruleScope = 'LOCAL';
    }
    eventBus.publish( 'importSpecification.createSaveRulesInput' );
};

/**
 * Populate the rules for the selected saved rule
 *
 * @param {Object} data - The view model data
 *
 */
export let populateRulesFromSavedRuleName = function( data ) {
    var rulesData = data.response.rulesData;
    for( var k = 0; k < rulesData.length; k++ ) {
        var singleRulesData = rulesData[ k ];
        data.importRules.dbValue = JSON.parse( singleRulesData.rules );
    }
    _.forEach( data.importRules.dbValue, function( savedRuleObj ) {
        data.typeOfRuleMap[ savedRuleObj.targetChildType ] = savedRuleObj.targetChildType;
    } );
    eventBus.publish( 'ImportFromOffice.refreshImportRuleList' );
};

/**
 * To fire event for save rule button click
 * @param {Sting} isReqMicroServiceInstalled - For Advance Rule Check
 */
export let saveImportRuleButtonClicked = function() {
    eventBus.publish( 'importSpecification.checkActionForSave' );
};

/**
 * To set appropriate action for save
 * @param {Object} data - The view model data
 */
export let checkActionForSave = function( data ) {
    if( data.savedRules.dbValue ) {
        _showUpdateRuleNotificationWarning( data );
    } else {
        var rect = document.querySelector( 'button[button-id=\'Arm0ImportFromWordSubSaveCmd\']' ).getBoundingClientRect();
        var cmdDimension = {
            offsetHeight: rect.height,
            offsetLeft: rect.left,
            offsetTop: rect.top,
            offsetWidth: rect.width,
            popupId: 'Arm0ImportFromWordSubSaveCmd'
        };
        data.saveRuleCmdDimension = cmdDimension;
        eventBus.publish( 'importSpecification.displayPopup' );
    }
};

/**
 * Show leave warning message
 *
 * @param {Object} data - The view model data
 */
var _showUpdateRuleNotificationWarning = function( data ) {
    var msg = data.i18n.notificationForUpdateMsg.replace( '{0}', data.savedRules.dbValue );
    var buttons = [ {
        addClass: 'btn btn-notify',
        text: data.i18n.cancel,
        onClick: function( $noty ) {
            $noty.close();
        }
    }, {
        addClass: 'btn btn-notify',
        text: data.i18n.update,
        onClick: function( $noty ) {
            $noty.close();
            eventBus.publish( 'importSpecification.createSaveRulesInput' );
        }
    } ];

    notyService.showWarning( msg, buttons );
};

/**
 * Add new Rule to importRule list.
 *
 * @param {Object} data - The view model data
 * @param {Object} newRule - The new Rule to be added
 */
export let addRule = function( data, newRule ) {
    if( newRule ) {
        data.importRules.dbValue.push( newRule );
        data.activeView = 'Arm0ImportFromOfficeSub';
    }
};

/**
 * Remove given importRule from importRulesList list.
 *
 * @param {Object} data - The view model data
 * @param {Object} importRule - The overrideType to be removed
 */
export let removeRule = function( data, importRule ) {
    if( importRule ) {
        for( var i = data.importRules.dbValue.length - 1; i >= 0; i-- ) {
            if( data.importRules.dbValue[ i ] === importRule ) {
                data.importRules.dbValue.splice( i, 1 );
                if( data.typeOfRuleMap ) {
                    delete data.typeOfRuleMap[ importRule.targetChildType ];
                    delete data.typeOfPropRuleMap[ importRule.targetChildType ];
                }
            }
        }

        //Adds rule back to list if user deletes existing rule
        if( importRule.keywordImportConditions && importRule.keywordImportConditions[ 0 ].opType === 'SENTENCE_BEGIN_ON_NEW_LINE') {
            var sentenceBeginOnNewLineModel = _getEmptyListModel();
            sentenceBeginOnNewLineModel.propDisplayValue = data.i18n.sentenceBeginOnNewLine;
            sentenceBeginOnNewLineModel.propInternalValue = 'SENTENCE_BEGIN_ON_NEW_LINE';
            data.operationTypeValues.dbValue.push( sentenceBeginOnNewLineModel );
            data.conditionOfRuleMap = {};
        }
    }

    if( data.importRules.dbValue.length === 0 ) {
        _getInitialOperationTypes( data );
    }
};

/**
 * Prepares the initial list of operation types supported
 * @param {Object} data - The view model data
 */
var _getInitialOperationTypes = function( data ) {
    _clearOperationTypesList( data );

    var wordContainsModel = _getEmptyListModel();
    wordContainsModel.propDisplayValue = 'Word Contains';
    wordContainsModel.propInternalValue = 'Word_Contains';

    var hasStyleModel = _getEmptyListModel();
    hasStyleModel.propDisplayValue = 'Has Style';
    hasStyleModel.propInternalValue = 'Has_Style';
    if( !data.operationTypeValues ) {
        data.operationTypeValues = {
            isArray: true,
            dbValue: []
        };
    }
    data.operationTypeValues.dbValue.push( wordContainsModel );
    data.operationTypeValues.dbValue.push( hasStyleModel );
};

var _clearOperationTypesList = function( data ) {
    if( data.operationTypeValues ) {
        for( var i = data.operationTypeValues.dbValue.length - 1; i >= 0; i-- ) {
            data.operationTypeValues.dbValue.splice( i, 1 );
        }
    }
};

/**
 * Return an empty ListModel object.
 *
 * @return {Object} - Empty ListModel object.
 */
var _getEmptyListModel = function() {
    return {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: false
    };
};

/**
 * updatePartialCtx for update Rule.
 *
 * @param {Object} data - The view model data
 * @param {Object} selectedRule - The overrideType to be removed
 * @param {Boolean} isMicroserviceInstalled - for microservice check
 */
export let updateRuleFn = function( data, selectedRule, isMicroserviceInstalled ) {
    appCtxSvc.updatePartialCtx( RULE_CONST, selectedRule );
    if( isMicroserviceInstalled ) {
        eventBus.publish( 'importSpecification.updateAdvanceRuleEvent' );
    } else {
        eventBus.publish( 'importSpecification.updateRuleEvent' );
    }
};

/**
 * Update given updatedRule to importRulesList list.
 *
 * @param {Object} data - The view model data
 * @param {Object} updatedRule - The overrideType to be removed
 */
export let updateRule = function( data, updatedRule ) {
    var selectedRule = appCtxSvc.getCtx( RULE_CONST );
    if( updatedRule && selectedRule ) {
        for( var i = data.importRules.dbValue.length - 1; i >= 0; i-- ) {
            if( data.importRules.dbValue[ i ] === selectedRule ) {
                data.importRules.dbValue.splice( i, 1, updatedRule );
            }
        }
    }
    data.activeView = 'Arm0ImportFromOfficeSub';
};

/**
 * updatePartialCtx to null for NEW add rule.
 */
export let unRegisterArm0AddRulesSubCtx = function() {
    appCtxSvc.updatePartialCtx( RULE_CONST, null );
    appCtxSvc.updatePartialCtx( PROP_RULE_CONST, null );
};

/**
 * updatePartialCtx to null for NEW Prop add rule.
 */
export let unRegisterArm0AddPropRulesCtx = function() {
    appCtxSvc.updatePartialCtx( PROP_RULE_CONST, null );
};

/****************************** Advance Rule  start ************************************************/
/**
 * rule Object processing
 * @param {Object} ruleObject - Rule Object
 * @param {Array} ruleConditionList - condition number
 * @returns {Boolean} return true if there is an error
 *
 */
function processRuleObj( ruleObject, ruleConditionList ) {
    for( var i = 0; i < ruleConditionList.dbValue.length; i++ ) {
        var conditionObject = ruleConditionList.dbValue[ i ];
        if( ( conditionObject.operationType.dbValue === 'Has_Style' && conditionObject.style.dbValue || conditionObject.operationValues.dbValue ) && conditionObject.operationType.dbValue !==
            'SENTENCE_BEGIN_ON_NEW_LINE' ) {
            ruleObject.keywordImportConditions.push( {
                opType: conditionObject.operationType.dbValue,
                opDisplayType: conditionObject.operationType.uiValue,
                keyword: conditionObject.operationType.dbValue === 'Has_Style' ? conditionObject.style.dbValue : conditionObject.operationValues.dbValue,
                operationCheckboxValues: false
            } );
        } else if( conditionObject.operationType.dbValue === 'SENTENCE_BEGIN_ON_NEW_LINE' ) {
            ruleObject.keywordImportConditions.push( {
                opType: conditionObject.operationType.dbValue,
                opDisplayType: conditionObject.operationType.uiValue,
                keyword: '',
                operationCheckboxValues: conditionObject.operationCheckboxValues.dbValue
            } );
        } else {
            return true;
        }
    }
    }

/**
 * constructs and returns the input typePropMap required while making the SOA call.
 *
 * @param {Object} data - The view model data
 */
export let getInputForAddPropRules = function( data ) {
    var objType = data.importType.dbValue;
    var inputData = {};
    inputData[objType] = [ 'object_name' ];
    return inputData;
};

/**
 * @param {Object} data  The view model data
 * @param {Object} outputTypeDescriptionsList return property list
 */
export let populateTypeDescriptions = function( data, outputTypeDescriptionsList ) {
    var selectedRule = appCtxSvc.getCtx( PROP_RULE_CONST );
    if( selectedRule ) {
        _.remove( data.tempPropRuleArray, function( n ) {
            return n === selectedRule.propertyNameValue.Key;
        } );
    }

    data.mapOfTypeDescriptions = {};
    data.setFieldTypeList.dbValue = [];
    _.forEach( outputTypeDescriptionsList[ 0 ].propInfos, function( propertyDescriptorObj ) {
        if( propertyDescriptorObj.isEditable ) {
            var result = _.find( data.tempPropRuleArray, propName => propName === propertyDescriptorObj.propName );
            if( !result ) {
                data.setFieldTypeList.dbValue.push( { propDisplayValue: propertyDescriptorObj.dispPropName, propInternalValue: propertyDescriptorObj.propName } );
            }
            data.mapOfTypeDescriptions[ propertyDescriptorObj.propName ] = propertyDescriptorObj.hasLOV;
        }
    } );
};
export let dispplayFieldTypeValue = function( data, fieldTypeValueList ) {
    data.setFieldTypeValueList.dbValue = fieldTypeValueList;
};
/**
 * This method is used to get the LOV values for the versioning panel.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getLOVList = function( response ) {
    return response.lovValues.map( function( obj ) {
        return {
            propDisplayValue: obj.propDisplayValues.lov_values[ 0 ],
            propInternalValue: obj.propInternalValues.lov_values[ 0 ]
        };
    } );
};

/**
 * Adds new condition in a Rule
 * @param {Object} data - The view model data
 * @param {Object} addConditionList - The list of conditions
 */
export let addCondition = function( data, addConditionList ) {
    addConditionList.dbValue.push( {
        operationType: _.clone( data.operationType, true ),
        style: _.clone( data.style, true ),
        operationValues: _.clone( data.operationValues, true ),
        operationTypeValues: data.operationTypeValues,
        operationCheckboxValues: _.clone( data.operationCheckboxValues, true ),
        styleValues: data.styleValues
    } );
};

/**
 * to Remove condition in a Rule
 * @param {Object} addConditionList - The list of conditions
 * @param {Object} selectedCondition - condition number
 */
export let removeCondition = function( addConditionList, selectedCondition ) {
    if( addConditionList.dbValue.length > 1 && selectedCondition ) {
        for( var i = addConditionList.dbValue.length - 1; i >= 0; i-- ) {
            if( addConditionList.dbValue[ i ] === selectedCondition ) {
                addConditionList.dbValue.splice( i, 1 );
            }
        }
    }
};

/**
 * Adds Rule in a List of ImportRule
 * @param {Object} data - The view model data
 * @param {Array} ruleConditionList - condition number
 */
export let addAdvanceRule = function( data, ruleConditionList ) {

    //Adds rule to map if its "SENTENCE_BEGIN_ON_NEW_LINE"
    for( var i = 0; i < ruleConditionList.dbValue.length; i++ ) {
        var conditionObject = ruleConditionList.dbValue[ i ];
        if( conditionObject.operationType.dbValue === 'SENTENCE_BEGIN_ON_NEW_LINE' ) {
            data.conditionOfRuleMap[ conditionObject.operationType.dbValue ] = conditionObject.operationType.dbValue;
        }
    }
    if( data.typeOfRuleMap[ data.importType.dbValue ] ) {
        eventBus.publish( RULE_ERROR_CONST );
    } else {
        var ruleObject = {
            targetChildType: _.clone( data.importType.dbValue, true ),
            targetChildDisplayType: _.clone( data.importType.uiValue, true ),
            conditionProcessingType: _.clone( data.conditionProcessingType.dbValue, true ),
            keywordImportConditions: [],
            advancedRules: []
        };
        var isError = processRuleObj( ruleObject, ruleConditionList );
        if( isError ) {
            eventBus.publish( CONDITION_ERROR );
        } else {
            data.typeOfRuleMap[ data.importType.dbValue ] = data.importType.dbValue;
            ruleObject.advancedRules = data.dispPropRules.dbValue;
            data.typeOfPropRuleMap[ data.importType.dbValue ] = data.tempPropRuleArray;
            data.importRules.dbValue.push( ruleObject );
            data.dispPropRules.dbValue = [];
            data.tempPropRuleArray = [];
            data.activeView = 'Arm0ImportFromOfficeSub';
        }
    }
};

/**
 * Process Rule list for popoulation in UI
 * @param {Object} data - The view model data
 * @param {Object} selectedRule - selected Rule for Updation
 */
function getConditionListForBasedOnAddedRules( data, selectedRule ) {
    data.importType.dbValue = selectedRule.targetChildType;
    data.importType.uiValue = selectedRule.targetChildDisplayType;
    data.conditionProcessingType.dbValue = selectedRule.conditionProcessingType;
    for( var i = data.importRules.dbValue.length - 1; i >= 0; i-- ) {
        if( data.importRules.dbValue[ i ].targetChildType === selectedRule.targetChildType ) {
            _.forEach( data.importRules.dbValue[ i ].keywordImportConditions, function( keywordImportConditionObject ) {
                var conditionObject = {
                    operationType: _.clone( data.operationType, true ),
                    style: _.clone( data.style, true ),
                    operationValues: _.clone( data.operationValues, true ),
                    operationTypeValues: data.operationTypeValues,
                    operationCheckboxValues: _.clone( data.operationCheckboxValues, true ),
                    styleValues: data.styleValues
                };
                conditionObject.operationValues.dbValue = keywordImportConditionObject.keyword;
                conditionObject.operationValues.uiValue = keywordImportConditionObject.keyword;
                conditionObject.operationCheckboxValues.dbValue = keywordImportConditionObject.operationCheckboxValues;
                conditionObject.operationCheckboxValues.uiValue = keywordImportConditionObject.operationCheckboxValues;
                conditionObject.operationType.dbValue = keywordImportConditionObject.opType;
                conditionObject.operationType.uiValue = keywordImportConditionObject.opDisplayType;
                conditionObject.style.dbValue = keywordImportConditionObject.opType === 'Has_Style' && keywordImportConditionObject.keyword;
                conditionObject.style.uiValue = keywordImportConditionObject.opType === 'Has_Style' && keywordImportConditionObject.keyword;

                data.addConditionList.dbValue.push( conditionObject );
            } );
            eventBus.publish( 'ImportFromOffice.refreshConditionListProvider' );
        }
    }
}

/**
 * Update Advance Rule
 * @param {Object} data - The view model data
 * @param {Array} ruleConditionList - condition number
 */
export let updateAdvanceRule = function( data, ruleConditionList ) {
    var selectedRule = appCtxSvc.getCtx( RULE_CONST );
    var ruleObject = {};

    //Clear map if rule is not there in updated condition list
    for( var i = 0; i < ruleConditionList.dbValue.length; i++ ) {
        if( ruleConditionList.dbValue[ i ].operationType.dbValue === 'SENTENCE_BEGIN_ON_NEW_LINE' ) {
            data.conditionOfRuleMap[ ruleConditionList.dbValue[ i ].operationType.dbValue ] = ruleConditionList.dbValue[ i ].operationType.dbValue;
        } else {
            data.conditionOfRuleMap = {};
        }
    }
    if( data.typeOfRuleMap[ data.importType.dbValue ] ) {
        if( data.typeOfRuleMap[ data.importType.dbValue ] === selectedRule.targetChildType ) {
            ruleObject = getRuleObject( data );
            var isError = processRuleObj( ruleObject, ruleConditionList );
            if( isError ) {
                eventBus.publish( CONDITION_ERROR );
            } else {
                ruleObject.advancedRules = data.dispPropRules.dbValue;
                updateSelectedRule( data, selectedRule, ruleObject );
            }
        } else {
            eventBus.publish( RULE_ERROR_CONST );
        }
    } else {
        ruleObject = getRuleObject( data );
        isError = processRuleObj( ruleObject, ruleConditionList );
        if( isError ) {
            eventBus.publish( CONDITION_ERROR );
        } else {
            delete data.typeOfRuleMap[ selectedRule.targetChildType ];
            data.typeOfRuleMap[ data.importType.dbValue ] = data.importType.dbValue;
            delete data.typeOfPropRuleMap[ selectedRule.targetChildType ];
            data.typeOfPropRuleMap[ data.importType.dbValue ] = data.tempPropRuleArray;
            ruleObject.advancedRules = data.dispPropRules.dbValue;
            updateSelectedRule( data, selectedRule, ruleObject );
        }
    }
};

/**
 * to Update the Selected Rule in Rule List
 * @param {Array} data - The view model data
 * @param {Object} selectedRule - selected rule Object
 * @param {Object} ruleObject - rule Object
 */
function updateSelectedRule( data, selectedRule, ruleObject ) {
    if( selectedRule ) {
        for( var index = data.importRules.dbValue.length - 1; index >= 0; index-- ) {
            if( data.importRules.dbValue[ index ] === selectedRule ) {
                data.importRules.dbValue.splice( index, 1, ruleObject );
            }
        }
    }
    data.addConditionList.dbValue = [];
    data.activeView = 'Arm0ImportFromOfficeSub';
}

/**
 * To fire event for save rule button click on popup
 * @param {Object} key -
 * @param {Object} value -
 * @param {Object} uiValue -
 * @param {Object} data View Model data-
 * @returns {Object} object
 */
function getKeyMap( key, value, uiValue, data ) {
    // data.propertyTypeMap[ key ] = uiValue;
    return { Key: key, Value: value, dispKey: uiValue };
}

/**
 * returns the rule Object for processing
 * @param {Object} data - The view model data
 * @returns {Object} ruleObject - Rule Object
 */
function getRuleObject( data ) {
    return {
        targetChildType: _.clone( data.importType.dbValue, true ),
        targetChildDisplayType: _.clone( data.importType.uiValue, true ),
        conditionProcessingType: _.clone( data.conditionProcessingType.dbValue, true ),
        keywordImportConditions: [],
        advancedRules: []
    };
}

eventBus.subscribe( 'importSpecification.addPropRuleCmd', function() {
    eventBus.publish( 'importSpecification.addAdvanceOptions' );
} );

/**
 * Add Advance Options in a Rule
 * @param {Object} data - The view model data
 */
export let addAdvanceOptions = function( data ) {
    var context = {
        destPanelId: 'Arm0AddPropertyRuleSub',
        title: data.i18n.showAdvanceOptionsLabel,
        supportGoBack: true,
        recreatePanel: true
    };
    exports.unRegisterArm0AddPropRulesCtx();
    eventBus.publish( 'awPanel.navigate', context );
};

export let changeFiledTypes = function( data ) {
    if( data.mapOfTypeDescriptions[ data.setFieldType.dbValue ] ) {
        var eventData = {
            boName: data.importType.dbValue,
            propertyName: data.setFieldType.dbValue
        };
        eventBus.publish( 'importSpecification.getInitialLOVValues', eventData );
    }
};

/**
 * to get the TypeNames for getTypeDescriptions2
 * @param {Object} data - The view model data
 * @returns {Array} TypeNames Array
 */
export let getTypeNames = function( data ) {
    if( data.importType ) {
        return [ data.importType.dbValue ];
    }
    return [ data.reqType.dbValue ];
};

/**
 * to get the exclusions for getTypeDescriptions2
 * @returns {Object} exclusion Object
 */
export let getExclusions = function() {
    return {
        PropertyExclusions: [ 'NamingRules', 'RendererReferences' ],
        TypeExclusions: [ 'DirectChildTypesInfo', 'RevisionNamingRules', 'ToolInfo' ]
    };
};

/**
 * Store form data for file selected to import
 *
 * @param {Object} formData - Form Data
 */
export let storeFormDataForUpdatePreviewForImportPDF = function( formData ) {
    _formData = formData;
};

/**
 * Return the cached formData
 *
 * @return {Object} formData - Form Data
 */
export let getCachedFormData = function() {
    return _formData;
};

/*************************** Advance Rule Move Operations 5.1 start ****************************************/

/* Register context to update command state
 */
export let registerCmdContext = function() {
    var jso = {
        enableMoveUp: false,
        enableMoveDown: false
    };
    appCtxSvc.registerCtx( 'Arm0AddRulesCtx', jso );
};

/* Change move up/down command state on selection change
 *
 * @param {Object} data - The view model data
 */
export let columnSelectionChanged = function( data ) {
    var arm0AddRulesSub = appCtxSvc.getCtx( 'Arm0AddRulesCtx' );
    var columnListLength = data.importRulesList.getLength();
    var selectedColumn = data.importRulesList.selectedObjects[ 0 ];
    if( selectedColumn ) {
        if( data.importRulesList.getItemAtIndex( 0 ) === selectedColumn ) {
            arm0AddRulesSub.enableMoveUp = false;
        } else {
            arm0AddRulesSub.enableMoveUp = true;
        }
        if( data.importRulesList.getItemAtIndex( columnListLength - 1 ) === selectedColumn ) {
            arm0AddRulesSub.enableMoveDown = false;
        } else {
            arm0AddRulesSub.enableMoveDown = true;
        }
    } else {
        arm0AddRulesSub.enableMoveDown = false;
        arm0AddRulesSub.enableMoveUp = false;
    }
};

/**
 * Move one down or up from list
 *
 * @param {Object} dataProvider - dataprovider
 * @param {Array} importRules - list of rules
 * @param {Object} moveTo - Direction to move to
 */
export let moveUpDown = function( dataProvider, importRules, moveTo ) {
    var sortColumns;
    if( dataProvider.importRulesList ) {
        sortColumns = dataProvider.importRulesList;
    }
    if( sortColumns ) {
        var selectedCount = sortColumns.getSelectedIndexes()[0];
        if ( moveTo === 'Down' ) {
            importRules = move( importRules, selectedCount, selectedCount + 1 );
        }
        if ( moveTo === 'Up' ) {
            importRules = move( importRules, selectedCount, selectedCount - 1 );
        }
        eventBus.publish( 'ImportFromOffice.refreshImportRuleList' );
    }
};

var move = function( arr, old_index, new_index ) {
    while( old_index < 0 ) {
        old_index += arr.length;
    }
    while( new_index < 0 ) {
        new_index += arr.length;
    }
    if( new_index >= arr.length ) {
        var k = new_index - arr.length;
        while( k-- + 1 ) {
            arr.push( undefined );
        }
    }
    arr.splice( new_index, 0, arr.splice( old_index, 1 )[ 0 ] );
    return arr;
};

/****************************** Advance Rule Move Operations 5.1 end ************************************************/

/****************************** Advance Property Rule 5.1 start ************************************************/
/**
 * Process Rule list for popoulation in UI
 * @param {Object} data - The view model data
 * selectedRule - selected Rule for Updation
 */
export let getConditionListForAddedPropRules = function( data ) {
    var selectedRule = appCtxSvc.getCtx( PROP_RULE_CONST );
    if( selectedRule ) {
        data.advanceConditionProcessingType.dbValue = selectedRule.conditionProcessingType;
        data.setFieldType.dbValue = selectedRule.propertyNameValue.Key;
        data.setFieldTypeValue.dbValue = data.mapOfTypeDescriptions[ selectedRule.propertyNameValue.Key ] ? selectedRule.propertyNameValue.Value : '';
        data.setFieldTypeTextValue.dbValue = !data.mapOfTypeDescriptions[ selectedRule.propertyNameValue.Key ] ? selectedRule.propertyNameValue.Value : '';
        for( var i = data.dispPropRules.dbValue.length - 1; i >= 0; i-- ) {
            if( data.dispPropRules.dbValue[ i ].propertyNameValue.Key === selectedRule.propertyNameValue.Key ) {
                _.forEach( data.dispPropRules.dbValue[ i ].keywordImportConditions, function( keywordImportConditionObject ) {
                    var conditionObject = {
                        operationType: _.clone( data.operationType, true ),
                        style: _.clone( data.style, true ),
                        operationValues: _.clone( data.operationValues, true ),
                        operationTypeValues: data.operationTypeValues,
                        styleValues: data.styleValues
                    };
                    conditionObject.operationValues.dbValue = keywordImportConditionObject.keyword;
                    conditionObject.operationValues.uiValue = keywordImportConditionObject.keyword;
                    conditionObject.operationType.dbValue = keywordImportConditionObject.opType;
                    conditionObject.operationType.uiValue = keywordImportConditionObject.opDisplayType;
                    conditionObject.style.dbValue = keywordImportConditionObject.opType === 'Has_Style' && keywordImportConditionObject.keyword;
                    conditionObject.style.uiValue = keywordImportConditionObject.opType === 'Has_Style' && keywordImportConditionObject.keyword;

                    data.addPropConditionList.dbValue.push( conditionObject );
                } );
            }
        }
    }
    /**Property Rule Refresh Option Process */
    eventBus.publish( 'ImportFromOffice.refreshPropConditionListProvider' );
};

/**
 * revealArm0AddPropRules for reveal of Arm0AddPropertyRulesSub panel.
 *
 * @param {Object} data - The view model data
 */
export let revealArm0AddPropRules = function( data ) {
    data.addPropConditionList.dbValue = [];
    eventBus.publish( 'importSpecification.getTypeDescriptions' );
};

/***
 * addConditionProcessing for Advance Condition
 * @param {Object} data - The view model data
 */
export let addConditionProcessing = function( data ) {
    if( data.advanceConditionProcessingType.dbValue !== 'ALWAYS' && data.addPropConditionList.dbValue.length === 0 ) {
        data.addPropConditionList.dbValue.push( {
            operationType: _.clone( data.operationType, true ),
            style: _.clone( data.style, true ),
            operationValues: _.clone( data.operationValues, true ),
            operationTypeValues: data.operationTypeValues,
            styleValues: data.styleValues
        } );
        /**Property Rule Refresh Option Process */
        eventBus.publish( 'ImportFromOffice.refreshPropConditionListProvider' );
    }
};

/**
 * updatePartialCtx for update Rule.
 *
 * @param {Object} data - The view model data
 * @param {Object} selectedRule - The overrideType to be removed
 *
 */
export let editPropRuleFn = function( data, selectedRule ) {
    appCtxSvc.updatePartialCtx( PROP_RULE_CONST, selectedRule );
    eventBus.publish( 'importSpecification.editPropRuleEvent' );
};

/**
 * Adds Rule in a List of ImportRule
 * @param {Object} data - The view model data
 * @param {Array} ruleConditionList - condition list
 */
export let addPropRule = function( data, ruleConditionList ) {
    var propRuleObject = {
        conditionProcessingType: _.clone( data.advanceConditionProcessingType.dbValue, true ),
        propertyNameValue: getKeyMap( data.setFieldType.dbValue, data.mapOfTypeDescriptions[ data.setFieldType.dbValue ] ?
            data.setFieldTypeValue.dbValue : data.setFieldTypeTextValue.dbValue, data.setFieldType.uiValue, data ),
        keywordImportConditions: []
    };
    var isError = false;
    if( data.advanceConditionProcessingType.dbValue !== 'ALWAYS' ) {
        isError = processRuleObj( propRuleObject, ruleConditionList );
    }
    if( isError ) {
        eventBus.publish( CONDITION_ERROR );
    } else {
        var flagForNewRule = false;
        for( var index = 0; index < data.dispPropRules.dbValue.length; index++ ) {
            if( data.dispPropRules.dbValue[ index ].propertyNameValue.Key === propRuleObject.propertyNameValue.Key ) {
                flagForNewRule = true;
                break;
            }
        }
        if( flagForNewRule ) {
            eventBus.publish( PROP_RULE_ERROR_CONST );
        } else {
            data.dispPropRules.dbValue.push( propRuleObject );
            data.tempPropRuleArray.push( propRuleObject.propertyNameValue.Key );
            data.activeView = 'Arm0AddAdvanceRulesSub';
        }
    }
};

/**
 * Update Advance Rule
 * @param {Object} data - The view model data
 * @param {Array} ruleConditionList - condition number
 */
export let updatePropRule = function( data, ruleConditionList ) {
    var selectedRule = appCtxSvc.getCtx( PROP_RULE_CONST );
    var propRuleObject = {
        conditionProcessingType: _.clone( data.advanceConditionProcessingType.dbValue, true ),
        propertyNameValue: getKeyMap( data.setFieldType.dbValue, data.mapOfTypeDescriptions[ data.setFieldType.dbValue ] ?
            data.setFieldTypeValue.dbValue : data.setFieldTypeTextValue.dbValue, data.setFieldType.uiValue ),
        keywordImportConditions: []
    };
    var isError = false;
    if( data.advanceConditionProcessingType.dbValue !== 'ALWAYS' ) {
        isError = processRuleObj( propRuleObject, ruleConditionList );
    }
    if( isError ) {
        eventBus.publish( CONDITION_ERROR );
    } else {
        var flagForNewRule = false;
        for( var index = 0; index < data.dispPropRules.dbValue.length; index++ ) {
            if( data.dispPropRules.dbValue[ index ].propertyNameValue.Key === propRuleObject.propertyNameValue.Key ) {
                if( selectedRule.propertyNameValue.Key === propRuleObject.propertyNameValue.Key ) {
                    flagForNewRule = false;
                    break;
                } else {
                    flagForNewRule = true;
                }
            }
        }
        if( flagForNewRule ) {
            eventBus.publish( PROP_RULE_ERROR_CONST );
        } else {
            updateSelectedPropRule( data, selectedRule, propRuleObject );
        }
    }
};

/**
 * to Update the Selected Rule in Rule List
 * @param {Array} data - The view model data
 * @param {Object} selectedRule - selected rule Object
 * @param {Object} ruleObject - rule Object
 */
function updateSelectedPropRule( data, selectedRule, ruleObject ) {
    if( selectedRule ) {
        for( var index = data.dispPropRules.dbValue.length - 1; index >= 0; index-- ) {
            if( data.dispPropRules.dbValue[ index ] === selectedRule ) {
                data.dispPropRules.dbValue.splice( index, 1, ruleObject );
                data.tempPropRuleArray.push( ruleObject.propertyNameValue.Key );
            }
        }
    }
    data.addPropConditionList.dbValue = [];
    data.activeView = 'Arm0AddAdvanceRulesSub';
}

/**
 * Remove given importRule from importRulesList list.
 *
 * @param {Object} data - The view model data
 * @param {Object} importRule - The overrideType to be removed
 */
export let removePropRule = function( data, importRule ) {
    if( importRule ) {
        for( var i = data.dispPropRules.dbValue.length - 1; i >= 0; i-- ) {
            if( data.dispPropRules.dbValue[ i ] === importRule ) {
                data.dispPropRules.dbValue.splice( i, 1 );
            }
        }
    }
};

/************************** Advance Property Rule 5.1 end *********************************/

/****************************** Advance Rule  end ************************************************/

/****************************** Panel Changes start ********************************/

/**
 * Returns the selected object
 *
 * @return {Object} selected object
 */
var getSelectedObject = function() {
    return appCtxSvc.getCtx( 'mselected' )[ 0 ];
};

export let prepareSelectedSepcData = function( data ) {
    if( appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:Location' ] !== 'ImportPreviewLocation' ) {
        var modelObject = getSelectedObject();
        if( modelObject && modelObject.modelType && modelObject.modelType.typeHierarchyArray && modelObject.modelType.typeHierarchyArray.indexOf( 'Folder' ) > -1 ) {
            data.selectedSpecObj = {
                iconURL: requirementsUtils.getTypeIconURL( modelObject.type ),
                specName: modelObject.cellHeader1
            };
        } else {
            data.selectedSpecObj = {
                iconURL: requirementsUtils.getTypeIconURL( modelObject.type ),
                specName: modelObject.cellHeader1 || modelObject.props.awb0ArchetypeRevName.dbValues[ 0 ]
            };
        }
    }
};

/****************************** Panel Changes End ********************************/

export default exports = {
    closeImportPreview,
    closeImportPreviewProxyFunction,
    revealArm0AddRulesSub,
    addPropRule,
    unRegisterArm0AddPropRulesCtx,
    editPropRuleFn,
    updatePropRule,
    removePropRule,
    revealArm0AddPropRules,
    addConditionProcessing,
    getConditionListForAddedPropRules,
    createSaveRulesInput,
    saveImportRulePopupButtonClicked,
    populateRulesFromSavedRuleName,
    saveImportRuleButtonClicked,
    checkActionForSave,
    addRule,
    removeRule,
    updateRuleFn,
    updateRule,
    unRegisterArm0AddRulesSubCtx,
    getInputForAddPropRules,
    populateTypeDescriptions,
    dispplayFieldTypeValue,
    getLOVList,
    addCondition,
    removeCondition,
    addAdvanceRule,
    updateAdvanceRule,
    addAdvanceOptions,
    changeFiledTypes,
    getTypeNames,
    getExclusions,
    storeFormDataForUpdatePreviewForImportPDF,
    getCachedFormData,
    columnSelectionChanged,
    registerCmdContext,
    moveUpDown,
    prepareSelectedSepcData
};
/**
 * Arm0ImportFromWord panel service utility for Word
 *
 * @memberof NgServices
 * @member Arm0ImportFromWord
 * @returns {Service} Arm0ImportFromWord -
 */
app.factory( 'Arm0ImportFromWord', () => exports );
