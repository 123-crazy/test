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
 * @module js/closureRuleConfigurationService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import aceStructureConfigurationService from 'js/aceStructureConfigurationService';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import occmgmtUtils from 'js/occmgmtUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';

import 'js/occurrenceManagementStateHandler';

var exports = {};

var productContextInfo = null;

var _defaultClosureRule = null;
var _NULL_ID = 'AAAAAAAAAAAAAA';
export let processClosureRules = function( response ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }

    var noneOption = tcViewModelObjectService.createViewModelObjectById( _NULL_ID );
    noneOption.props = {
        "object_string": {
            "dbValue": _defaultClosureRule
        }
    };
    noneOption.cellHeader1 = _defaultClosureRule;
    noneOption.marker = 0;
    response.searchResults.splice( 0, 0, noneOption );
    response.totalFound++;
    return response.searchResults;
};

var convertClosureRuleIntoVMProperty = function( currentClosureRuleObject ) {
    var closureRuleVMProperty = uwPropertyService.createViewModelProperty( currentClosureRuleObject.dbValues[ 0 ],
        currentClosureRuleObject.dbValues[ 0 ], 'STRING', currentClosureRuleObject.uiValues[ 0 ], '' );
    closureRuleVMProperty.uiValue = currentClosureRuleObject.uiValues[ 0 ];
    return closureRuleVMProperty;
};

var getClosureRuleFromProductContextInfo = function( data ) {
    if( productContextInfo ) {
        var currentClosureRuleObject = productContextInfo.props.awb0ClosureRule;
        if( _.isNull( currentClosureRuleObject.dbValues[ 0 ] ) || _.isUndefined( currentClosureRuleObject.dbValues[ 0 ] ) ||
            _.isEmpty( currentClosureRuleObject.dbValues[ 0 ] ) ) {
            currentClosureRuleObject.uiValues[ 0 ] = data.defaultClosureRule.uiValue;
            _defaultClosureRule = data.defaultClosureRule.uiValue;
        }
        var closureRuleProperty = convertClosureRuleIntoVMProperty( currentClosureRuleObject );
        return closureRuleProperty;
    }
};

var populateClosureRule = function( data ) {
    if( data ) {
        data.currentClosureRule = getClosureRuleFromProductContextInfo( data );
    }
};

/**
 * Get Closure Rule Configuration Data
 */
export let getInitialClosureRuleConfigurationData = function( data ) {
    if( data ) {
        aceStructureConfigurationService.populateContextKey( data );
        if( data.contextKeyObject ) {
            productContextInfo = data.contextKeyObject.productContextInfo;
            if( productContextInfo ) {
                populateClosureRule( data );
            }
        }
    }
};

var setClosureRule = function( eventData ) {
    eventBus.publish( 'awClosureRule.ValueChanged', eventData );
    eventBus.publish( 'awPopupWidget.close' );
};

export let selectClosureRule = function( data, subPanelContext ) {
    if( data.dataProviders.getClosureRules.viewModelCollection.loadedVMObjects.length > 0 ) {
        if ( subPanelContext.currentClosureRule.dbValue === data.defaultClosureRule.uiValue ) { //Select "No Rule" from List
            var indexOfCurrentClosureRule = data.dataProviders.getClosureRules.viewModelCollection.loadedVMObjects
                .map( function( x ) {
                    return x.props.object_string.dbValue;
                } ).indexOf( subPanelContext.currentClosureRule.dbValue );

                data.dataProviders.getClosureRules.changeObjectsSelection( indexOfCurrentClosureRule,
                indexOfCurrentClosureRule, true );
        } else {
            //Find index of ClosureRule and select it
            var indexOfCurrentClosureRule = data.dataProviders.getClosureRules.viewModelCollection.loadedVMObjects
                .map( function( x ) {
                    return x.uid;
                } ).indexOf( subPanelContext.currentClosureRule.dbValue );
            if( indexOfCurrentClosureRule >= 0 ) {
                data.dataProviders.getClosureRules.changeObjectsSelection( indexOfCurrentClosureRule,
                    indexOfCurrentClosureRule, true );
            }
        }
    }
};

export let updateClosureRule = function( eventData, data, subPanelContext ) {
    if( subPanelContext.currentClosureRule.dbValue && eventData.selectedObjects.length > 0 ) {
        if(  subPanelContext.currentClosureRule.dbValue !== eventData.selectedObjects[ 0 ].uid
        && subPanelContext.currentClosureRule.dbValue !== eventData.selectedObjects[ 0 ].props.object_string.dbValue ) {
            eventData.closureRule = eventData.selectedObjects[ 0 ].uid;
            setClosureRule( {
                selectedObject: eventData.selectedObjects[ 0 ],
                viewKey: data.viewKey,
                closureRule: eventData.closureRule
            } );
        }
    } else {
        // Handle Current view type selected
        eventBus.publish( 'awPopupWidget.close' );
    }
};

export let updateCurrentClosureRules = function( data, eventData ) {
    if( data && data.currentClosureRule ) {
        data.currentClosureRule = eventData.selectedObject;
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture', 'CLOSURE_RULE_CHANGE' );
    }
};

/**
 * Get the correct provider name based on tc version.
 *
 * @param {Object} providerName - The input 'provider name'
 * @returns {Object} The 'provider name' based on tc version
 */
 export let getProviderName = function( providerName ) {
    var prefix = occmgmtUtils.isMinimumTCVersion( 14, 0 )? 'Fnd0' : 'Awb0';
    return prefix + providerName;
};

/**
 * Closure Rule Configuration service utility
 */

export default exports = {
    processClosureRules,
    getInitialClosureRuleConfigurationData,
    selectClosureRule,
    updateClosureRule,
    updateCurrentClosureRules,
    getProviderName
};
app.factory( 'closureRuleConfigurationService', () => exports );
