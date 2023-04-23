// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 defines
 */

/**
 * This file is used as utility file for Rule, Naming Convention, Condition Object oprtaions.
 * @module js/Acp0RuleNCCondUtils
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import commandPanelService from 'js/commandPanel.service';
import dms from 'soa/dataManagementService';
import awTableSvc from 'js/awTableService';
import uwPropertySvc from 'js/uwPropertyService';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import parsingUtils from 'js/parsingUtils';
import iconSvc from 'js/iconService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import awColumnSvc from 'js/awColumnService';
import messagingSvc from 'js/messagingService';
import listBoxService from 'js/listBoxService';
import preferenceSvc from 'soa/preferenceService';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};
var _maxTreeLevel = 3;
var _deferExpandTreeNodeArray = [];
var _treeTableColumnInfos = null;
var _mapOfRuleCondsAndCondExprs = new Map();
var getInitialLOVValueDeferred = null;
var prev_location_context = '';

/**
 * Map of nodeId of a 'parent' TableModelObject to an array of its 'child' TableModelObjects.
 */
var _mapNodeId2ChildArray = {};
var _sourceclassList = {};
var _acp0SourceClassTypeValues = [];
var _mapOfPropNameDispValue = new Map();
var _dataCondExpr = {};

/**
 *This method ensures that to load required properties.
 */
export let loadRequiredProperties = function( selectedCondObj, data, ruleBuilderPanelFlag ) {
    _dataCondExpr = data;
    var propsToLoad = [];
    var uids = [ selectedCondObj.uid ];
    if ( selectedCondObj.type === 'Acp0Rule' ) {
        var ruleCond = selectedCondObj.props.acp0RuleCondition;
        if ( ruleCond && ruleCond.dbValues.length > 0 ) {
            for ( var eachCond of ruleCond.dbValues ) {
                uids.push( eachCond );
            }
            selectedCondObj = cdm.getObject( ruleCond.dbValues[0] );
        } else {
            propsToLoad = [ 'acp0RuleCondition' ];
            propsToLoad = exports._toPreparePropstoLoadData( selectedCondObj, propsToLoad );
        }
    }
    if ( selectedCondObj.type === 'Acp0RuleCondition' ) {
        propsToLoad = [ 'acp0Expresion', 'acp0NamingConventionRef', 'acp0NamingConvention' ];
        propsToLoad = exports._toPreparePropstoLoadData( selectedCondObj, propsToLoad );
    }
    if ( propsToLoad.length > 0 ) {
        dms.getProperties( uids, propsToLoad )
            .then(
                function() {
                    if ( ruleBuilderPanelFlag ) {
                        commandPanelService.activateCommandPanel( 'Acp0AddExprsForCondBuild', 'aw_toolsAndInfo' );
                    } else {
                        _getSourceAttLOVValues( undefined, 'acp0SourceClassType', undefined, undefined );
                    }
                }
            );
    } else {
        if ( ruleBuilderPanelFlag ) {
            commandPanelService.activateCommandPanel( 'Acp0AddExprsForCondBuild', 'aw_toolsAndInfo' );
        }
    }
};
export let loadCondExprTreeTableData = function( selectedCondObj ) {
    /**
       * Extract action parameters from the arguments to this function.
       */
    var treeLoadInput = arguments[0];
    treeLoadInput.retainTreeExpansionStates = true;

    // treeLoadInput.sortCriteria = appCtxService.getCtx( 'charLibmanagercontext' ).sortCriteria;
    var delayTimeTree = 0;

    for ( var ndx = 0; ndx < arguments.length; ndx++ ) {
        var arg = arguments[ndx];

        if ( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'delayTimeTree' ) {
            delayTimeTree = arg.dbValue;
        } else if ( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'maxTreeLevel' ) {
            _maxTreeLevel = arg.dbValue;
        }
    }
    /**
     * Check the validity of the parameters
     */
    var deferred = AwPromiseService.instance.defer();
    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );
    if ( failureReason ) {
        deferred.reject( failureReason );
        return deferred.promise;
    }
    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    var i18nStrings = arguments[5];
    if ( delayTimeTree > 0 ) {
        _.delay( _loadTreeTableRows, delayTimeTree, deferred, treeLoadInput, i18nStrings );
    } else {
        _loadTreeTableRows( deferred, treeLoadInput, i18nStrings );
    }
    return deferred.promise;
};

export let createVmNodeUsingNewObjectInfo = function( modelObject, levelNdx, childNdx, isLoadAllEnabled, columnInfos, parentNode, i18nStrings ) {
    var nodeId = modelObject.uid;
    var type = modelObject.type;
    var displayName = '';
    var iconURL = '';
    if ( nodeId ) {
        var ncOnCond = modelObject.props.acp0NamingConvention;
        var ncString = ncOnCond ? ncOnCond.dbValues[0] : ncOnCond;
        //Display Naming Convention string as Set NC: 'ncString' If
        displayName = i18nStrings.setNCString + ' ("' + ncString + '") ' + i18nStrings.ifString;
        iconURL = iconSvc.getTypeIconURL( type );
    } else {
        var operator = '';
        var relAndValue = '';
        var attPropName = '';
        var typeForIcon = '';
        //This block to evaluate the expression Attibute should show display value on UI(In expression, saving the internal name of attribute property)
        if ( levelNdx === 1 ) {
            if ( childNdx !== 1 ) {
                //This line is to show Display string for operator
                operator = modelObject.split( /\s(.+)/ )[0] === '&&' ? 'AND' + '\xa0' : '\xa0' + 'OR' + '\xa0\xa0\xa0'; //After 'OR' operator has one extra space to manage the length of both operator for diplay purpose.
                //This line is to show the Icon for operator
                //typeForIcon = modelObject.split( /\s(.+)/ )[0] === '&&' ? 'Acp0ANDOperatorIcon' : 'Acp0OROperatorIcon';
                var expr = modelObject.split( /\s(.+)/ )[1];
                attPropName = expr.split( /\s(.+)/ )[0];
                relAndValue = expr.split( /\s(.+)/ )[1];
            } else {
                //Below line to manage the empty space when there is no operator
                typeForIcon = 'Acp0NoOperatorIcon';
                attPropName = modelObject.split( /\s(.+)/ )[0];
                relAndValue = modelObject.split( /\s(.+)/ )[1];
            }
        }
        var attPropDispValue = _mapOfPropNameDispValue.get( attPropName );
        if ( !attPropDispValue ) {
            var reqMessage = _dataCondExpr.i18n.propMissingInLOV;
            var message = reqMessage ? reqMessage.replace( '{0}', attPropName ) : reqMessage;
            console.error( message );
        }
        //As we are displaying text for operator this line required
        //operator = operator?operator+' ':operator;
        attPropDispValue = attPropDispValue ? attPropDispValue : attPropName;
        modelObject = operator + attPropDispValue + ' ' + relAndValue;
        //As we are back to text scenario for Operator below line not returning any icon
        iconURL = iconSvc.getTypeIconURL( typeForIcon );
        displayName = modelObject;
    }
    var vmNode = awTableSvc.createViewModelTreeNode( nodeId, type, displayName, levelNdx, childNdx, iconURL );
    vmNode.modelType = modelObject.modelType;
    !containChildren( modelObject.props, vmNode );
    vmNode.selected = true;
    if ( !vmNode.modelType ) {
        //vmNode.parentNodeUid = parentNodeUId;
        vmNode.parentNode = parentNode;
    }
    _populateColumns( columnInfos, isLoadAllEnabled, vmNode, childNdx, modelObject.props );
    return vmNode;
};
/**
 * @param {Object} uwDataProvider - An Object (usually a UwDataProvider) on the DeclViewModel on the $scope this
 *            action function is invoked from.
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 *
 * <pre>
 * {
 *     columnInfos : {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 * }
 * </pre>
 */
export let loadTreeTableColumns = function( uwDataProvider, data ) {
    var deferred = AwPromiseService.instance.defer();
    appCtxService.ctx.treeVMO = uwDataProvider;
    var awColumnInfos = _getTreeTableColumnInfos( data );
    uwDataProvider.columnConfig = {
        columns: awColumnInfos
    };
    deferred.resolve( {
        columnInfos: awColumnInfos
    } );
    return deferred.promise;
};
/*
* This method return updated list of Conditions or Expressions.
*/
export let getCondorExpToAdd = function( ctx, data ) {
    var returnCondorExpVal = [];
    var selections;
    var toGetPropName;
    var dataToBePush;
    var treeVMOSelecions = ctx.treeVMO ? ctx.treeVMO.selectedObjects : [];
    // In Selection model some time tree node selection not gettig correct in multiselection so handle here.
    if ( treeVMOSelecions.length > 0 ) {
        selections = treeVMOSelecions;
    } else {
        selections = ctx.mselected;
    }
    for ( var im = 0; im < selections.length; im++ ) {
        var objectwithPropAndDP = _toGetObjectAndPropNameToAddRemoveCondsOrExps( selections[im], data );
        toGetPropName = objectwithPropAndDP.toGetPropName;
        dataToBePush = objectwithPropAndDP.dataToBePush;
        var getCondorExpr = selections[im].props[toGetPropName].dbValues;
        getCondorExpr.push( dataToBePush );
        for ( var i = 0; i < getCondorExpr.length; i++ ) {
            returnCondorExpVal.push( getCondorExpr[i].toString() );
        }
    }
    return returnCondorExpVal;
};
/*
* This method refresh the condition builder after adding or removing the conditions or expressions.
*/
export let expandCondNodeAftrAddorRemoveExpr = function( ctx, data ) {
    /* If this node is already expanded, then we have to collapse and
    then expand this tree to refresh the contents of this node. */
    var selectedCondsToBeRefresh = [];
    var mapOfSelectedObjects = new Map();
    var treeVMOSelecions = ctx.treeVMO.selectedObjects;
    if ( treeVMOSelecions.length > 0 ) {
        for ( var eachSelection of _mapOfRuleCondsAndCondExprs.entries() ) {
            if ( eachSelection[0].type === 'Acp0Rule' ) {
                eventBus.publish( 'condExprGrid.plTable.reload' );
                _mapOfRuleCondsAndCondExprs = new Map();
                return;
            }
        }
        for ( var treeVMOSelecion of treeVMOSelecions ) {
            if ( !treeVMOSelecion.type ) {
                mapOfSelectedObjects.set( treeVMOSelecion.parentNode, treeVMOSelecion.parentNode );
            } else {
                mapOfSelectedObjects.set( treeVMOSelecion, treeVMOSelecion );
            }
        }
        for ( var treeNodeToggle of mapOfSelectedObjects.entries() ) {
            var treeNodeToToggle = treeNodeToggle[0];
            if ( treeNodeToToggle.isLeaf ) {
                treeNodeToToggle.isLeaf = false;
            }
            if ( treeNodeToToggle.isExpanded ) {
                treeNodeToToggle.isExpanded = false;
                eventBus.publish( 'condExprGrid.plTable.toggleTreeNode', treeNodeToToggle );
            }
            treeNodeToToggle.isExpanded = true;
            eventBus.publish( 'condExprGrid.plTable.toggleTreeNode', treeNodeToToggle );

            if ( treeNodeToToggle.props.acp0Expresison.dbValues.length === 0 ) {
                eventBus.publish( 'condExprGrid.plTable.reload' );
            }
            treeNodeToToggle.selected = true;
        }
    } else {
        eventBus.publish( 'condExprGrid.plTable.reload' );
    }
    _mapOfRuleCondsAndCondExprs = new Map();
};

export let getRemoveExprOrCondnInfo = function( ctx ) {
    var info = [];
    var selections;
    var toGetPropObject;
    var toGetPropName;
    _mapOfRuleCondsAndCondExprs = new Map();
    var mapOfIndexOfSelectedCondsAndExprs = new Map();
    var treeVMOSelecions = ctx.treeVMO.selectedObjects;
    // In Selection model some time tree node selection not gettig correct in multiselection so handle here.
    if ( treeVMOSelecions.length > 0 ) {
        selections = treeVMOSelecions;
    } else {
        selections = ctx.mselected;
    }
    for ( var im = 0; im < selections.length; im++ ) {
        toGetPropObject = _toGetSelectedObjectAndPropName( selections[im] ).toGetPropObject;
        //Manage map with selcted conditions and expressions based on index.
        if ( treeVMOSelecions.length > 0 ) {
            if ( !mapOfIndexOfSelectedCondsAndExprs.get( toGetPropObject ) ) {
                mapOfIndexOfSelectedCondsAndExprs.set( toGetPropObject, [ selections[im].childNdx - 1 ] );
            } else {
                var availableIndexList = mapOfIndexOfSelectedCondsAndExprs.get( toGetPropObject );
                availableIndexList.push( selections[im].childNdx - 1 );
                mapOfIndexOfSelectedCondsAndExprs.set( toGetPropObject, availableIndexList );
            }
        } else {
            mapOfIndexOfSelectedCondsAndExprs.set( toGetPropObject, [] );
        }
    }
    for ( var eachCondOrExprData of mapOfIndexOfSelectedCondsAndExprs.entries() ) {
        var getupdatedCondsorExprs = [];
        var infoInput;
        var toGetPropObjectAndProp = _toGetObjectAndPropNameToAddRemoveCondsOrExps( eachCondOrExprData[0] );
        toGetPropName = toGetPropObjectAndProp.toGetPropName;
        if ( eachCondOrExprData[1].length > 0 ) {
            //Fetching the Expressions or Conditions
            var getCondorExprs = eachCondOrExprData[0].props[toGetPropName].dbValues;
            //Remove the selected Expressions or Conditions from fetched data
            getupdatedCondsorExprs = $.grep( getCondorExprs, function( n, i ) {
                return $.inArray( i, eachCondOrExprData[1] ) === -1;
            } );
            //Checking the selected expression is on first index
            if ( eachCondOrExprData[0].type === 'Acp0RuleCondition' && eachCondOrExprData[1].indexOf( 0 ) > -1 && getupdatedCondsorExprs.length > 0 ) {
                //Need to remove operator from first expression
                getupdatedCondsorExprs[0] = getupdatedCondsorExprs[0].split( /\s(.+)/ )[1];
            }
        }
        //Adding expected Expressions or Conditions to map for processing the operations.
        _mapOfRuleCondsAndCondExprs.set( eachCondOrExprData[0], getupdatedCondsorExprs );
    }
    // This Loop required to manage if user selects a expression which parent condition is already part of removal operation.
    for ( var eachCondnorExpr of _mapOfRuleCondsAndCondExprs ) {
        if ( eachCondnorExpr[0].type === 'Acp0RuleCondition' ) {
            var getRuleObjToCheckSelectedConds = ctx.pselected;
            var updatedCondsOrExprs = _mapOfRuleCondsAndCondExprs.get( getRuleObjToCheckSelectedConds );
            // To check the condition is part of removal already, if yes then no need to process expression of that condition for removal.
            if ( updatedCondsOrExprs && updatedCondsOrExprs.indexOf( eachCondnorExpr[0].uid ) > -1 || !updatedCondsOrExprs ) {
                infoInput = _toPrepareSetPropertiesSOAInput( eachCondnorExpr[0], 'acp0Expresison', eachCondnorExpr[1] );
                info.push( infoInput );
            }
        } else {
            infoInput = _toPrepareSetPropertiesSOAInput( eachCondnorExpr[0], 'acp0RuleCondition', eachCondnorExpr[1] );
            info.push( infoInput );
        }
    }
    return info;
};

/*
* To Show the proper error messages.
*/
export let getMultipleObjDeleteMessageData = function( ctx, data ) {
    var treeVMOSelecions = ctx.treeVMO.selectedObjects;
    var conditions = [];
    var expressions = [];
    for ( var im = 0; im < treeVMOSelecions.length; im++ ) {
        if ( treeVMOSelecions[im].type === 'Acp0RuleCondition' ) {
            conditions.push( treeVMOSelecions[im].props.acp0NamingConventionRef.uiValues[0] );
        } else if ( !treeVMOSelecions[im].type ) {
            expressions.push( treeVMOSelecions[im].displayName );
        }
    }
    var selectionCount = conditions.length + expressions.length;
    if ( conditions.length > 0 ) {
        var message = data.i18n.deleteCondOrExpr.replace( '{0}', selectionCount );
        messagingSvc.showInfo( message );
    }
    return message;
};
/*
* To get updated sequence for Conditions or Expressions.
*/
export let toMoveDownOrMoveUpTheSelCondOrExpr = function( ctx, data ) {
    var info = [];
    var selectedCondorExp = ctx.treeVMO.selectedObjects[0];
    var indexOfSelection = ctx.treeVMO.selectedObjects[0].childNdx - 1;
    var togetTypeObjectAndProp = _toGetSelectedObjectAndPropName( selectedCondorExp );
    var toGetPropObject = togetTypeObjectAndProp.toGetPropObject;
    var toGetPropName = togetTypeObjectAndProp.toGetPropName;
    var getCondorExprs = toGetPropObject.props[toGetPropName].dbValues;
    if ( data.activeCommandDimension.popupId === 'Acp0MoveDownCondForCondBuild' ) {
        if ( indexOfSelection === 0 && toGetPropObject.type === 'Acp0RuleCondition' ) {
            var operator = getCondorExprs[indexOfSelection + 1].split( /\s(.+)/ )[0];
            getCondorExprs[indexOfSelection + 1] = getCondorExprs[indexOfSelection + 1].split( /\s(.+)/ )[1];
            getCondorExprs[indexOfSelection] = operator + ' ' + getCondorExprs[indexOfSelection];
        }
        [ getCondorExprs[indexOfSelection], getCondorExprs[indexOfSelection + 1] ] = [ getCondorExprs[indexOfSelection + 1], getCondorExprs[indexOfSelection] ];
    } else if ( data.activeCommandDimension.popupId === 'Acp0MoveUpCondForCondBuild' ) {
        if ( indexOfSelection === 1 && toGetPropObject.type === 'Acp0RuleCondition' ) {
            var operator = getCondorExprs[indexOfSelection].split( /\s(.+)/ )[0];
            getCondorExprs[indexOfSelection] = getCondorExprs[indexOfSelection].split( /\s(.+)/ )[1];
            getCondorExprs[indexOfSelection - 1] = operator + ' ' + getCondorExprs[indexOfSelection - 1];
        }
        [ getCondorExprs[indexOfSelection - 1], getCondorExprs[indexOfSelection] ] = [ getCondorExprs[indexOfSelection], getCondorExprs[indexOfSelection - 1] ];
    } else if ( data.activeCommandDimension.popupId === 'Acp0ChangeOperatorForExprs' ) {
        var operator = getCondorExprs[indexOfSelection].split( /\s(.+)/ )[0];
        var expression = getCondorExprs[indexOfSelection].split( /\s(.+)/ )[1];
        operator = operator === '&&' ? '||' : '&&';
        getCondorExprs[indexOfSelection] = operator + ' ' + expression;
    }
    info.push( _toPrepareSetPropertiesSOAInput( toGetPropObject, toGetPropName, getCondorExprs ) );
    return info;
};

/*
* To load the Naming Convention LOV Values.
*/
export let loadRequiredLOVValues = function( ctx, data ) {
    var inputData = {
        searchInput: {
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: 'Acp0CharsRulesAndNCProvider',
            searchCriteria: {
                type: 'Acp0NamingConvention',
                searchString: ''
            },
            searchSortCriteria: [
                {
                    fieldName: 'creation_date',
                    sortDirection: 'DESC'
                }
            ],
            startIndex: ''
        }
    };
    // SOA call made to get the content
    soaSvc.post( 'Internal-AWS2-2016-03-Finder', 'performSearch', inputData ).then( function( response ) {
        var namingConventions = response.searchResults;
        var validNamingConventions = [];
        for ( var namingConvention of namingConventions ) {
            var ncPropValue = namingConvention.props.acp0NamingConvention.dbValues[0];
            var sctPropValue = namingConvention.props.acp0SourceClassType.dbValues[0];
            if ( ncPropValue && ncPropValue !== '' && sctPropValue && sctPropValue !== '' ) {
                validNamingConventions.push( namingConvention );
            }
        }
        data.NamingConvention = listBoxService.createListModelObjects( validNamingConventions, 'props.acp0NamingConvention' );
    } );
};

/**
 * This method is used to get the LOV values.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getLOVList = function( response ) {
    return response.lovValues.map( function( obj ) {
        return {
            propDisplayValue: obj.propDisplayValues.lov_values[0],
            propInternalValue: obj.propInternalValues.lov_values[0]
        };
    } );
};

/*
* To load the Source Attribute LOV Values based on selected Naming Convention.
*/
export let loadSourceAttributeLOVValues = function( ctx, data ) {
    var selectedNC = data.acp0NamingConvention.dbValue;
    var selectedNCUid = selectedNC ? selectedNC.uid : undefined;
    var selectedcond = ctx.treeVMO ? ctx.treeVMO.selectedObjects : [];
    if ( !selectedNC && selectedcond.length === 1 && selectedcond[0].type === 'Acp0RuleCondition' ) {
        selectedNCUid = selectedcond[0].props.acp0NamingConventionRef.dbValues[0];
    }
    _getSourceAttLOVValues( selectedNCUid, 'acp0SourceClassAttribute', undefined, data );
};
/*
* To check the selection has conditions selected.
*/
export let checkMultiSelectConds = function( ctx, data ) {
    var selectedObjects = ctx.treeVMO.selectedObjects;
    ctx.condCount = 0;
    for ( var selectedObject of selectedObjects ) {
        if ( selectedObject.type === 'Acp0RuleCondition' ) {
            ctx.condCount += 1;
        }
    }
    return ctx.condCount;
};

// Below are the required functions for condition builder.
/*
* This method to return the property lists which needs to be loaded
*/
export function _toPreparePropstoLoadData( selectedCondObj, propsToLoad ) {
    var propsToLoadData = [];
    for ( var prop of propsToLoad ) {
        if ( !selectedCondObj.props.prop ) {
            propsToLoadData.push( prop );
        }
    }
    return propsToLoadData;
}

/**
 * @return {selectedobject and property name}
 */
function _toGetSelectedObjectAndPropName( selectedObject ) {
    var toGetPropObject;
    var toGetPropName;
    if ( selectedObject.type === 'Acp0RuleCondition' ) {
        toGetPropObject = appCtxService.ctx.pselected;
        toGetPropName = 'acp0RuleCondition';
    } else if ( !selectedObject.type ) {
        toGetPropObject = cdm.getObject( selectedObject.parentNode.uid );
        toGetPropName = 'acp0Expresison';
    } else if ( selectedObject.type === 'Acp0Rule' ) {
        toGetPropObject = selectedObject;
        toGetPropName = 'acp0RuleCondition';
    }
    return {
        toGetPropObject: toGetPropObject,
        toGetPropName: toGetPropName
    };
}

/*
* Function is preparing the setProperties SOA Input
*/
function _toPrepareSetPropertiesSOAInput( requiredObject, propertyName, propertyValue ) {
    var infoInput = {
        object: '',
        timestamp: '',
        vecNameVal:
            [
                {
                    name: '',
                    values: []
                }
            ]
    };
    infoInput.object = requiredObject;
    infoInput.vecNameVal[0].name = propertyName;
    infoInput.vecNameVal[0].values = propertyValue;
    return infoInput;
}

/**
 * @return {Object and property name}
 */
function _toGetObjectAndPropNameToAddRemoveCondsOrExps( selectedObject, data ) {
    var toGetPropName;
    var dataToBePush;
    var space = ' ';
    if ( selectedObject.type === 'Acp0RuleCondition' ) {
        toGetPropName = 'acp0Expresison';
        var dataOpExist = data && selectedObject.props.acp0Expresison.dbValues.length > 0 ? data.operator : undefined;
        var operator = dataOpExist ? dataOpExist.dbValue : undefined;
        operator = operator ? operator + space : '';
        dataToBePush = data ? operator + data.sourceAttribute.dbValue + space + data.relation.uiValue + space + data.attributeValue.uiValue : data;
    } else if ( selectedObject.type === 'Acp0Rule' ) {
        toGetPropName = 'acp0RuleCondition';
        dataToBePush = data ? data.createdCondObject.uid : data;
    }
    return {
        toGetPropName: toGetPropName,
        dataToBePush: dataToBePush
    };
}

/*
* Function is to get LOV of Attribute values
*/
function _getSourceAttLOVValues( selectedNCUID, propName, acp0SourceClassTypeValue, data ) {
    var acp0SourceClassTypeValues = [ acp0SourceClassTypeValue ];
    var inputData = {
        initialData: {
            propertyName: propName,
            lovInput: {
                owningObject: {
                    type: 'Acp0NamingConvention',
                    uid: selectedNCUID
                },
                operationName: 'Edit',
                boName: 'Acp0NamingConvention',
                propertyValues: {
                }
            }
        }
    };
    if ( !data && propName === 'acp0SourceClassAttribute' ) {
        inputData.initialData.lovInput.propertyValues = {
            acp0SourceClassAttribute: [],
            acp0SourceClassType: acp0SourceClassTypeValues
        };
    }
    soaSvc.post( 'Core-2013-05-LOV', 'getInitialLOVValues', inputData ).then( function( responseData ) {
        //To set the attribute list on Add expression Panel
        if ( data ) {
            data.SourceAttribute = exports.getLOVList( responseData );
        } else {
            if ( propName === 'acp0SourceClassType' ) {
                _sourceclassList = exports.getLOVList( responseData );
                for ( var sourceClass of _sourceclassList ) {
                    _acp0SourceClassTypeValues.push( sourceClass.propInternalValue );
                }
            }
            if ( propName === 'acp0SourceClassAttribute' ) {
                var sourceClassAttrList = exports.getLOVList( responseData );
                for ( var sourceClassAttr of sourceClassAttrList ) {
                    _mapOfPropNameDispValue.set( sourceClassAttr.propInternalValue, sourceClassAttr.propDisplayValue );
                }
            }
            if ( _acp0SourceClassTypeValues.length > 0 ) {
                _getSourceAttLOVValues( undefined, 'acp0SourceClassAttribute', _acp0SourceClassTypeValues.shift(), undefined );
            } else {
                eventBus.publish( 'condExprGrid.plTable.reload' );
            }
        }
    } );
}
//Functions for load the tree structure for condition builder.
/**
 * Resolve the row data for the 'next' page of 'children' nodes of the given 'parent'.
 * <P>
 * Note: The paging status is maintained in the 'parent' node.
 *
 * @param {DeferredResolution} deferred -
 * @param {TreeLoadInput} treeLoadInput -
 * @return {Promise} Revolved with a TreeLoadResult object containing result/status information.
 */
function _loadTreeTableRows( deferred, treeLoadInput, i18nStrings ) {
    var parentNode = treeLoadInput.parentNode;
    var targetNode = parentNode;
    if ( !parentNode.isLeaf ) {
        if ( parentNode.levelNdx < 0 ) {
            var isLoadAllEnabled = true;
            var children = [];
            var selectedRule = appCtxService.ctx.selected;
            if ( selectedRule.type !== 'Acp0Rule' ) {
                selectedRule = appCtxService.ctx.pselected;
            }
            var condProp = selectedRule.props.acp0RuleCondition;
            var hasConditions = condProp ? condProp.dbValues : condProp;
            if ( hasConditions ) {
                for ( var i = 0; i < hasConditions.length; i++ ) {
                    children.push( cdm.getObject( hasConditions[i] ) );
                }
            }
            if ( hasConditions.length === 0 ) {
                parentNode.isLeaf = true;
                var endReached = true;
                var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, true,
                    endReached, null );
                deferred.resolve( {
                    treeLoadResult: treeLoadResult
                } );
            } else {
                var treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, i18nStrings );
                deferred.resolve( {
                    treeLoadResult: treeLoadResult
                } );
            }
            return;
        }
        if ( parentNode.levelNdx < _maxTreeLevel ) {
            var isLoadAllEnabled = true;
            var children = [];
            var loadChxObjectInput = {
                objects: [ cdm.getObject( parentNode.uid ) ],
                attributes: [ 'acp0Expresison' ]
            };
            if ( loadChxObjectInput.objects[0].type === 'Acp0RuleCondition' ) {
                var testMO = loadChxObjectInput.objects[0];
                var condObj = testMO.props.acp0Expresison;
                if ( condObj && condObj.dbValues.length > 0 ) {
                    for ( var i = 0; i < condObj.dbValues.length; i++ ) {
                        var temp = testMO.props.acp0Expresison.dbValues[i];
                        children.push( temp );
                    }
                    var treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, i18nStrings );
                    deferred.resolve( {
                        treeLoadResult: treeLoadResult
                    } );
                } else {
                    parentNode.isLeaf = true;
                    var endReached = true;
                    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, true,
                        endReached, null );
                    deferred.resolve( {
                        treeLoadResult: treeLoadResult
                    } );
                }
            } else {
                parentNode.isLeaf = true;
                var endReached = true;
                var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, true,
                    endReached, null );
                deferred.resolve( {
                    treeLoadResult: treeLoadResult
                } );
            }
        }
    }
}

/**
 *
 * @param {parentNode} parentNode -
 * @param {children} children -
 * @param {isLoadAllEnabled} isLoadAllEnabled -
 * @param {actionObjects} actionObjects -
 * @param {treeLoadInput} treeLoadInput -
 * @return {awTableSvc.buildTreeLoadResult} awTableSvc.buildTreeLoadResult -
 *
 **/
function _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, i18nStrings ) {
    _buildTreeTableStructure( _getTreeTableColumnInfos(), parentNode, children, isLoadAllEnabled, i18nStrings );
    if ( parentNode.children !== undefined && parentNode.children !== null ) {
        var mockChildNodes = parentNode.children.concat( _mapNodeId2ChildArray[parentNode.id] );
    } else {
        var mockChildNodes = _mapNodeId2ChildArray[parentNode.id];
    }
    var mockChildNodesLen = mockChildNodes ? mockChildNodes.length : 0;
    var endReached = parentNode.startChildNdx + treeLoadInput.pageSize > mockChildNodesLen;
    var tempCursorObject = {
        endReached: endReached,
        startReached: true
    };
    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, mockChildNodes, false, true,
        endReached, null );
    treeLoadResult.parentNode.cursorObject = tempCursorObject;
    return treeLoadResult;
}
/**
 * @param {AwTableColumnInfoArray} columnInfos - Array of column information objects to use when building the
 *            table rows.
 * @param {ViewModelTreeNode} parentNode - A node that acts 'parent' of a hierarchy of 'child'
 *            ViewModelTreeNodes.
 * @param {Number} nChildren - The # of child nodes to add to the given 'parent'.
 * @param {Boolean} isLoadAllEnabled - TRUE if all properties should be included.
 */
function _buildTreeTableStructure( columnInfos, parentNode, nChildren, isLoadAllEnabled, i18nStrings ) {
    var children = [];
    _mapNodeId2ChildArray[parentNode.id] = children;
    var levelNdx = parentNode.levelNdx + 1;
    for ( var childNdx = 1; childNdx <= nChildren.length; childNdx++ ) {
        /**
         * Create a new node for this level. and Create props for it
         */
        var vmNode = exports.createVmNodeUsingNewObjectInfo( nChildren[childNdx - 1], levelNdx, childNdx, isLoadAllEnabled, columnInfos, parentNode, i18nStrings );
        /**
         * Add it to the 'parent' based on its ID
         */
        children.push( vmNode );
    }
}

/**
 * function to evaluate if an object contains children
 * @param {objectType} objectType object type
 * @return {boolean} if node contains child
 */
function containChildren( props, vmNode ) {
    var deferred = AwPromiseService.instance.defer();
    var containChild = false;
    var loadChxObjectInput = {
        objects: [ cdm.getObject( vmNode.uid ) ],
        attributes: [ 'acp0Expresison', 'acp0NamingConventionRef', 'acp0NamingConvention' ]
    };
    if ( loadChxObjectInput.objects[0] && loadChxObjectInput.objects[0].type === 'Acp0RuleCondition' ) {
        soaSvc.post( 'Core-2006-03-DataManagement', 'getProperties', loadChxObjectInput ).then( function( getPropertiesResponse ) {
            var uid = getPropertiesResponse.plain[0];
            var testMO = cdm.getObject( getPropertiesResponse.plain[0] );
            if ( testMO.props.acp0Expresison.dbValues.length > 0 ) {
                vmNode.isLeaf = containChild;
            } else {
                vmNode.isLeaf = !containChild;
            }
        } );
    } else {
        vmNode.isLeaf = !containChild;
    }
    if ( !vmNode.isLeaf ) {
        _deferExpandTreeNodeArray.push( vmNode );
    }
}
/**
 * @param {ObjectArray} columnInfos -
 * @param {Boolean} isLoadAllEnabled -
 * @param {ViewModelTreeNode} vmNode -
 * @param {Number} childNdx -
 */
function _populateColumns( columnInfos, isLoadAllEnabled, vmNode, childNdx, props ) {
    if ( isLoadAllEnabled ) {
        if ( !vmNode.props ) {
            vmNode.props = {};
        }
        var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdm
            .getObject( vmNode.uid ), 'EDIT' );
        tcViewModelObjectService.mergeObjects( vmNode, vmo );
    }
}

/**
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
function _getTreeTableColumnInfos( data ) {
    var cur_location_context = appCtxService.getCtx( 'locationContext.ActiveWorkspace:SubLocation' );
    if ( !_treeTableColumnInfos || cur_location_context !== prev_location_context ) {
        _treeTableColumnInfos = _buildTreeTableColumnInfos( data );
        prev_location_context = cur_location_context;
    }
    return _treeTableColumnInfos;
}
/**
* @return {width} To get dynamic Width of aw-splm-table.
**/
function findWidth() {
    var width = document.getElementById( 'condExprSplmGridId' ).clientWidth;
    width = width === 0 ? document.getElementById( 'noAwSplmTable' ).clientWidth : width;
    width = width * 99.7 / 100;
    return width;
}
/**
 * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
 */
function _buildTreeTableColumnInfos( data ) {
    var columnInfos = [];
    /**
     * Set 1st column to special 'name' column to support tree-table.
    */
    var awColumnInfos = [];
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'acp0Expresison',
        displayName: data.i18n.expressiontoolbarTitle,
        width: findWidth(),
        minWidth: 200,
        typeName: 'String',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: true
    } ) );
    for ( var index = 0; index < awColumnInfos.length; index++ ) {
        var column = awColumnInfos[index];
        column.cellRenderers = [];
    }
    var sortCriteria = [];
    if ( !_.isEmpty( sortCriteria ) ) {
        if ( sortCriteria[0].fieldName && _.eq( awColumnInfos[0].name, sortCriteria[0].fieldName ) ) {
            awColumnInfos[0].sort = {};
            awColumnInfos[0].sort.direction = sortCriteria[0].sortDirection.toLowerCase();
            awColumnInfos[0].sort.priority = 0;
        }
    }
    return awColumnInfos;
}

/**
 *This method to make property in edit mode if there are any errors.
 *@param {Object} data of selected object
 *@param {Object} edithandler object of edit handler
 *@param {String} selectedObjectType like rule or naming convention
 */
export let setPropertyInEditMode = function( data, activeEditHandler, selectedObjectType ) {
    appCtxService.ctx.editInProgress = true;
    activeEditHandler._editing = true;
    if ( selectedObjectType === 'Acp0Rule' ) {
        uwPropertySvc.setIsEditable( data.acp0DefaultVarNamingConvention, true );
        uwPropertySvc.setIsEditable( data.acp0DefaultAttNamingConvention, true );
        uwPropertySvc.setIsEditable( data.acp0DefaultVisNamingConvention, true );
    }
    if ( selectedObjectType === 'Acp0NamingConvention' ) {
        uwPropertySvc.setIsEditable( data.sourceClass, true );
        uwPropertySvc.setIsEditable( data.seletedAttribute, true );
        uwPropertySvc.setIsEditable( data.delim, true );
    }
    uwPropertySvc.setIsEditable( appCtxService.ctx.xrtSummaryContextObject.props.object_desc, true );
    uwPropertySvc.setIsEditable( appCtxService.ctx.xrtSummaryContextObject.props.object_name, true );
};

export default exports = {
    loadRequiredProperties,
    loadCondExprTreeTableData,
    createVmNodeUsingNewObjectInfo,
    loadTreeTableColumns,
    getCondorExpToAdd,
    expandCondNodeAftrAddorRemoveExpr,
    getRemoveExprOrCondnInfo,
    getMultipleObjDeleteMessageData,
    toMoveDownOrMoveUpTheSelCondOrExpr,
    loadRequiredLOVValues,
    loadSourceAttributeLOVValues,
    getLOVList,
    checkMultiSelectConds,
    setPropertyInEditMode,
    _toPreparePropstoLoadData
};
app.factory( 'Acp0RuleNCCondUtils', () => exports );
