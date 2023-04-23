// Copyright (c) 2020 Siemens

/**
 * This file contains the utility methods of navigation utils. This is for GWT consumption of the navigation utils.
 *
 * @module js/navigationUtils
 */
import browserUtils from 'js/browserUtils';
import _ from 'lodash';
import conditionService from 'js/conditionService';
import AwStateService from 'js/awStateService';

var exports = {};

/**
 * getting $state reference. $state is injected in this way so to do the unit testing. This function is stubbed with
 * desired output in unit testing.
 *
 * @return {$state} $state reference
 */
export let getState = function() {
    return AwStateService.instance;
};

/**
 * creating url of selected object
 *
 * @param {IModelObject} obj - selected object in the clipboard
 * @return {string} url of selected object
 */
export let urlProcessing = function( obj ) {
    var url = '';
    var stateSvc = exports.getState();
    if( stateSvc ) {
        var uid = obj.uid;
        // s_uid is not required for creating unique url for Model Object
        url = browserUtils.getBaseURL() + stateSvc.href( 'com_siemens_splm_clientfx_tcui_xrt_showObject', {
            uid: uid,
            s_uid: ''
        }, {
            inherit: false
        } );
    }
    return url;
};

/**
 * get url of all the selected objects
 *
 * @param {IModelObjectArray} ObjList - array of selected object in the clipboard
 * @return {array} url array of selected object
 */
export let getDisplayURLs = function( objList ) {
    var url = [];
    if( objList.length > 0 ) {
        for( var i = 0; i < objList.length; i++ ) {
            url[ i ] = exports.urlProcessing( objList[ i ] );
        }
    }
    return url;
};

/**
 * create hyperlink of all the selected objects
 *
 * @param {IModelObjectArray} ObjList - array of selected object in the clipboard
 * @return {string} hyperlink string of all the selected object
 */
export let creatingHyperlinkOfSelectedObjects = function( objList ) {
    var hyperlinkText;
    var hyperlinkString = '';
    var url = exports.getDisplayURLs( objList );
    for( var i = 0; i < objList.length; i++ ) {
        hyperlinkText = objList[ i ].props.object_string.uiValues[ 0 ];
        hyperlinkString += '<a href="' + url[ i ] + '" target="_parent" class="aw-base-osClipboardHyperlink">' +
            hyperlinkText + '</a><br/>';
    }
    return hyperlinkString;
};

/**
 * builds an encoded parameter string based on the state name and param map supplied
 *
 * @param {String} stateName - state name
 * @param {Object} paramMap - parameter map
 * @return {String} encoded parameter string
 */
export let buildEncodedParamString = function( stateName, paramMap ) {
    var stateSvc = exports.getState();
    var stateIn = stateName;
    var encodedParamStr = '';

    if( stateIn !== '.' ) {
        stateIn = stateIn.replace( /\./g, '_' );
    }

    var relativeUrl = stateSvc.href( stateIn, paramMap, {
        inherit: false
    } );

    if( relativeUrl ) {
        var splitArr = relativeUrl.split( stateName );
        if( splitArr.length === 2 ) {
            encodedParamStr = splitArr[ 1 ];
        }
    }

    return encodedParamStr;
};

/**
 * Expand a string based expression to include nested conditions
 *
 * @param {String} expression - a string expression to evaluate
 * @param {Object} internalViewModel - the object containing other expressions
 * @returns {String} the new string expression
 */
export let getConditionExpression = function( expression, internalViewModel ) {
    var conditionIndex = expression.indexOf( 'conditions.' );
    if( conditionIndex > -1 ) {
        var substring = expression.substring( conditionIndex );
        var endConditionIndex = substring.search( '[^a-zA-Z0-9._]' );
        endConditionIndex = endConditionIndex > -1 ? conditionIndex + endConditionIndex : expression.length;
        var referenceCondition = expression.substring( conditionIndex, endConditionIndex );
        var evaluatedCondition = _.get( internalViewModel, referenceCondition );
        var returnExpression = expression.replace( referenceCondition, '(' + evaluatedCondition.expression + ')' );
        return exports.getConditionExpression( returnExpression, internalViewModel );
    }
    return expression;
};

/**
 * Find active naigations  for the given workspaces..
 *
 * @param {Object} allNavConfigs - all navigations for active woorkspace
 * @param {Object} $scope - Scope to execute the command with
 *
 * @return {Object} most appropriate active placement.
 */
export let findActiveWorkspaceNavigation = function( allNavConfigs, $scope ) {
    var mostAppropriateActionHandler = null;
    var mostAppropriateConditionLength = -1;
    _.forEach( allNavConfigs, function( navConfig ) {
        var conditions = _.get( navConfig, 'activeWhen.condition' );
        if( conditions ) {
            var conditionExpression = exports.getConditionExpression( conditions, navConfig );
            var isValidCondition = conditionService.evaluateCondition( $scope, conditionExpression );
            var expressionLength = conditionExpression.length;
            if( _.isObject( conditionExpression ) ) {
                expressionLength = JSON.stringify( conditionExpression ).length;
            }
            if( isValidCondition &&
                expressionLength > mostAppropriateConditionLength ) {
                mostAppropriateConditionLength = expressionLength;
                mostAppropriateActionHandler = navConfig;
            }
        } else {
            mostAppropriateActionHandler = navConfig;
        }
    } );
    return mostAppropriateActionHandler;
};

exports = {
    getState,
    urlProcessing,
    getDisplayURLs,
    creatingHyperlinkOfSelectedObjects,
    buildEncodedParamString,
    getConditionExpression,
    findActiveWorkspaceNavigation
};
export default exports;
