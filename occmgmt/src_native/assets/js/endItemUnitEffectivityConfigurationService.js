// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 */

/**
 * @module js/endItemUnitEffectivityConfigurationService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import cdm from 'soa/kernel/clientDataModel';
import aceStructureConfigurationService from 'js/aceStructureConfigurationService';
import viewModelObjectService from 'js/viewModelObjectService';
import dmSvc from 'soa/dataManagementService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/navigationUtils';
import dateEffConfigration from 'js/dateEffectivityConfigurationService';

var exports = {};

var DEFAULT_UNIT = -1;
var NULL_ID = 'AAAAAAAAAAAAAA';

var populateProductContextInfo = function( data ) {
    aceStructureConfigurationService.populateContextKey( data );
    return data.contextKeyObject.productContextInfo;
};

var getEffectivityGroupsFromProductContextInfo = function( data ) {
    if( data.contextKeyObject.productContextInfo ) {
        return convertEffectivityGroupIntoVMProperty( data.contextKeyObject.productContextInfo, data );
    }
};

export var getUnitEffectivityGroupsFromProductContextInfo = function( data ) {
    let egos =  populateDataFromEGUids( data );
    return egos && egos.dbValues.length > 0 ? egos.dbValues.filter( e=>{
        let effString = cdm.getObject( e ).props.awp0CellProperties.dbValues[1];
        return !dateEffConfigration.isDateEffectivity( effString );
    } ) : [];
};

var convertEffectivityGroupIntoVMProperty = function( productContextInfoModelObject, data ) {
    let unitEgos = getUnitEffectivityGroupsFromProductContextInfo( data );

    var effectivityGroupVMProperty;
    if( unitEgos && unitEgos.length > 0 ) {
        if( unitEgos.length > 1 ) {
            effectivityGroupVMProperty = uwPropertyService.createViewModelProperty( data.multipleGroups, data.multipleGroups, 'STRING', '', '' );
            effectivityGroupVMProperty.uiValue = data.multipleGroups.uiValue;
        } else {
            var groupName = '';
            effectivityGroupVMProperty = uwPropertyService.createViewModelProperty(
                unitEgos[ 0 ],
                '', 'STRING',
                unitEgos[ 0 ], '' );

            var groupItemRev = cdm.getObject( unitEgos[ 0 ] );
            groupName = groupItemRev.props.object_name.uiValues[ 0 ];

            effectivityGroupVMProperty.uiValue = groupName;
        }
        return effectivityGroupVMProperty;
    }
};

var getEffectiveUnitFromProductContextInfo = function( data ) {
    var productContextInfoModelObject = data.contextKeyObject.productContextInfo;
    if( productContextInfoModelObject && productContextInfoModelObject.props.awb0EffUnitNo ) {
        var effectiveUnitVMProperty = uwPropertyService.createViewModelProperty(
            productContextInfoModelObject.props.awb0EffUnitNo.dbValues[ 0 ],
            productContextInfoModelObject.props.awb0EffUnitNo.uiValues[ 0 ], 'STRING',
            productContextInfoModelObject.props.awb0EffUnitNo.dbValues[ 0 ], '' );
        effectiveUnitVMProperty.uiValue = productContextInfoModelObject.props.awb0EffUnitNo.uiValues[ 0 ];
        return effectiveUnitVMProperty;
    }
};

var convertRevisionRuleEffectiveUnitIntoVMProperty = function( revisionRuleModelObject ) {
    if( revisionRuleModelObject.props.rule_unit ) {
        var effectiveUnitVMProperty = uwPropertyService.createViewModelProperty(
            revisionRuleModelObject.props.rule_unit.dbValues[ 0 ],
            revisionRuleModelObject.props.rule_unit.uiValues[ 0 ], 'STRING',
            revisionRuleModelObject.props.rule_unit.dbValues[ 0 ], '' );
        effectiveUnitVMProperty.uiValue = revisionRuleModelObject.props.rule_unit.uiValues[ 0 ];
        return effectiveUnitVMProperty;
    }
};

var getEffectiveUnitFromRevisionRule = function( currentRevisionRule ) {
    if( currentRevisionRule && currentRevisionRule.dbValues ) {
        var currentRevisionRuleModelObject = cdm.getObject( currentRevisionRule.dbValues );
        if( currentRevisionRuleModelObject ) {
            return convertRevisionRuleEffectiveUnitIntoVMProperty( currentRevisionRuleModelObject );
        }
    }
};

var getDefaultEffectiveUnit = function( data ) {
    if( data ) {
        return _.clone( data.effectivityUnitSectionAllUnitsValue, true );
    }
};

var populateEffectiveUnit = function( data ) {
    if( data ) {
        var currentEffectiveUnit = getEffectiveUnitFromProductContextInfo( data );
           if( !currentEffectiveUnit || !currentEffectiveUnit.uiValue ) {
            var currentRevisionRule = data.contextKeyObject.productContextInfo.props.awb0CurrentRevRule;
              currentEffectiveUnit = getEffectiveUnitFromRevisionRule( currentRevisionRule );
            if( !currentEffectiveUnit || !currentEffectiveUnit.uiValue ) {
                currentEffectiveUnit = getEffectivityGroupsFromProductContextInfo( data );
                if( !currentEffectiveUnit || !currentEffectiveUnit.uiValue ) {
                    currentEffectiveUnit = getDefaultEffectiveUnit( data );
                }
            }
        }
        currentEffectiveUnit.uiValue = currentEffectiveUnit.uiValue === '-1' ? data.effectivityUnitSectionAllUnitsValue.uiValue : currentEffectiveUnit.uiValue;
        return currentEffectiveUnit;
    }
};

var getEndItemFromProductContextInfo = function( data ) {
    if( data.contextKeyObject.productContextInfo ) {
        var endItem = data.contextKeyObject.productContextInfo.props.awb0EffEndItem;
        if( ( !endItem || endItem.dbValues[ 0 ] === '' || endItem.isNulls && endItem.isNulls !== true ) && data.contextKeyObject.productContextInfo.props.awb0Product ) {
            var topProduct = cdm.getObject( data.contextKeyObject.productContextInfo.props.awb0Product.dbValues[ 0 ] );
            endItem = cdm.getObject( topProduct.props.items_tag.dbValues[ 0 ] );
        }
        return endItem;
    }
};

export let getCurrentEffectiveUnitsAndEndItem = function( data ) {
    var endItem = appCtxSvc.getCtx( 'endItemToRender' );
    if( !endItem ) {
        endItem = getEndItemFromProductContextInfo( data );
    }
    var endItemUID = endItem.uid;
    if( !endItemUID && endItem.dbValues ) {
        endItemUID = endItem.dbValues[ 0 ];
    }

    var effectiveUnit = -1;
    aceStructureConfigurationService.populateContextKey( data );
    var context = data.contextKeyObject;
    if( context && context.productContextInfo && context.productContextInfo.props.awb0EffUnitNo.dbValues[ 0 ] ) {
        effectiveUnit = parseInt( context.productContextInfo.props.awb0EffUnitNo.dbValues[ 0 ] );
    }

    return {
        effectiveUnit: effectiveUnit,
        endItem: {
            uid: endItemUID
        }
    };
};

var handleEndItemChangeIfThePanelIsGettingReInitialized = function( data, endItemToRender ) {
    if( data && endItemToRender ) {
        var currentlyRenderedEndItem = appCtxSvc.getCtx( 'endItemToRender' );
        if( currentlyRenderedEndItem &&
            ( currentlyRenderedEndItem.uid === endItemToRender.uid || currentlyRenderedEndItem.dbValues &&
                currentlyRenderedEndItem.dbValues[ 0 ] === endItemToRender.uid ) ) {
            appCtxSvc.unRegisterCtx( 'endItemSelected' );
            return;
        }
        var currentEffectiveUnitsAndEndItem = exports.getCurrentEffectiveUnitsAndEndItem( data );
        var eventData = {
            effectiveUnit: currentEffectiveUnitsAndEndItem.effectiveUnit,
            endItem: endItemToRender
        };
        eventBus.publish( 'awConfigPanel.endItemUnitEffectivityChanged', eventData );
    }
    appCtxSvc.unRegisterCtx( 'endItemSelected' );
};

export let updateUnitEffectivityText = function( eventData, data ) {
    var unitText = eventData.effectiveUnit === DEFAULT_UNIT ? data.effectivityUnitSectionAllUnitsValue.uiValue : eventData.effectiveUnit;
    data.currentEffectiveUnit = uwPropertyService.createViewModelProperty(
        unitText,
        unitText, 'STRING',
        unitText, '' );
    data.currentEffectiveUnit.uiValue = unitText;
};

var updatePanelWithEndItemToRender = function( endItemToRender ) {
    if( endItemToRender ) {
        dmSvc.getProperties( [ endItemToRender.uid ], [ 'object_string' ] );
        appCtxSvc.updateCtx( 'endItemToRender', endItemToRender );
    }
};

var populateEndItems = function( data ) {
    if( data ) {
        var endItemToRender = appCtxSvc.getCtx( 'endItemSelected' );
        if( endItemToRender ) {
            handleEndItemChangeIfThePanelIsGettingReInitialized( data, endItemToRender );
            updatePanelWithEndItemToRender( endItemToRender );
        } else {
            var endItemToRenderFromPCI = getEndItemFromProductContextInfo( data );
            updatePanelWithEndItemToRender( endItemToRenderFromPCI );
        }
    }
};

export let getInitialUnitEffectivityConfigurationData = function( data ) {
    if( data ) {
        var productContextInfo = populateProductContextInfo( data );
        if( productContextInfo ) {
            data.currentEffectiveUnit = populateEffectiveUnit( data );
        }
    }
};

export let applyUnitEffectivity = function( data ) {
    if( data.newUnitEffectivity.dbValue ) {
        var eventData = {};
        eventData.effectiveUnit = parseInt( data.newUnitEffectivity.dbValue );
        eventData.endItem = exports.getCurrentEffectiveUnitsAndEndItem( data ).endItem;

        exports.setUnitEffectivity( eventData, data );

        // Structure platform code treats this as revision rule change.
        // So, setting userGesture as REVISION_RULE_CHANGE.
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture', 'REVISION_RULE_CHANGE' );
    }
};

export let selectUnitEffectivity = function( data ) {
    if( data.dataProviders.getPreferredUnitEffectivities.viewModelCollection.loadedVMObjects.length > 0 ) {
        // unselect them first
        for( var i = 0; i < data.dataProviders.getPreferredUnitEffectivities.viewModelCollection.loadedVMObjects.length; ++i ) {
            data.dataProviders.getPreferredUnitEffectivities.changeObjectsSelection( i, i, false );
        }
        //Find index of Unit eff and select it
        var indexOfCurrentUnitEff = data.dataProviders.getPreferredUnitEffectivities.viewModelCollection.loadedVMObjects
            .map( function( x ) {
                return x.unit;
            } ).indexOf( populateEffectiveUnit( data ).propertyDisplayName );
        if( indexOfCurrentUnitEff >= 0 ) {
            data.dataProviders.getPreferredUnitEffectivities.changeObjectsSelection( indexOfCurrentUnitEff,
                indexOfCurrentUnitEff, true );
        }
    }
};

export let updateUnitEffectivity = function( eventData, data ) {
    if( eventData.selectedObjects.length > 0 ) {
        // Handle Unit Eff selected

        if( populateEffectiveUnit( data ).propertyDisplayName !== eventData.selectedObjects[ 0 ].unit ) {
            var setUnitEffeventData = {};
            setUnitEffeventData.effectiveUnit = parseInt( eventData.selectedObjects[ 0 ].unit );
            if( !setUnitEffeventData.effectiveUnit ) {
                // Handle Group Effectivity
                if( data.effectivityGroups.uiValue === eventData.selectedObjects[ 0 ].unit ) {
                    data.isGroupEffectivity = true;
                    setUnitEffeventData.effectiveUnit = -2;
                } else {
                    data.isGroupEffectivity = false;
                    setUnitEffeventData.effectiveUnit = -1;
                }
            }
            if( setUnitEffeventData.effectiveUnit !== -1 ) {
                setUnitEffeventData.endItem = exports.getCurrentEffectiveUnitsAndEndItem( data ).endItem;
            }
            exports.setUnitEffectivity( setUnitEffeventData, data );
        }
    } else { // Handle Current Unit eff selected
        eventBus.publish( 'awPopupWidget.close' );
    }
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture', 'REVISION_RULE_CHANGE' );
};

export let setUnitEffectivity = function( eventData, data ) {
    if( data.isGroupEffectivity && eventData.effectiveUnit === -2 ) {
        // Handle "Groups" - publish event to launch panel
        eventBus.publish( 'awConfigPanel.groupEffectivityClicked', eventData );
        eventBus.publish( 'awPopupWidget.close' );
    } else {
        if( parseInt( data.contextKeyObject.productContextInfo.props.awb0EffUnitNo.dbValues[ 0 ] ) !== eventData.effectiveUnit ) {
            eventData.egos = dateEffConfigration.getDateEffectivityGroups( data );
            eventBus.publish( 'awConfigPanel.unitEffectivityChanged', eventData );
        }
        eventBus.publish( 'awPopupWidget.close' );
    }
};

export let getInitialEndItemConfigurationData = function( data ) {
    if( data ) {
        var productContextInfo = populateProductContextInfo( data );
        if( productContextInfo ) {
            populateEndItems( data );
        }
    }
};

export let getEndItems = function( data ) {
    var endItemToRender = appCtxSvc.getCtx( 'endItemToRender' );
    if( endItemToRender ) {
        var endItems = [];
        var egos = populateDataFromEGUids( data );
        if( egos.dbValues.length > 1 ) {
            endItems = '';
        } else {
            endItems.push( endItemToRender );
        }
        return endItems;
    }
};

export let updateConfigEndItems = function( newItemSelected ) {
    if( newItemSelected ) {
        var item = newItemSelected.props && newItemSelected.props.items_tag ? cdm.getObject( newItemSelected.props.items_tag.dbValues[0] ) : newItemSelected;
        appCtxSvc.registerCtx( 'endItemSelected', item );
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture', 'REVISION_RULE_CHANGE' );
    }
};

export let processUnitEffectivity = function( response, data ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }

    var effectivityUnits = [];
    if( response.preferredEffectivityInfo ) {
        effectivityUnits = populateEffectivityUnits( response.preferredEffectivityInfo.effectivityUnits );
    }
    addDefaultUnitsToPreferredUnitEffectivities( effectivityUnits, data );
    if( data.contextKeyObject.supportedFeatures.Awb0GroupEffectivityFeature ) {
        addGroupUnitsToPreferredUnitEffectivities( effectivityUnits, data );
    }
    return effectivityUnits;
};

var populateEffectivityUnits = function( allUnitEffectivities ) {
    var unitEffectivities = [];
    if( allUnitEffectivities ) {
        var uniqueUnitEffectivities = allUnitEffectivities.filter( function( elem, index, self ) {
            return index === self.indexOf( elem );
        } );
        if( uniqueUnitEffectivities ) {
            for( var i = 0; i < uniqueUnitEffectivities.length; i++ ) {
                var unitEff = {};
                if( uniqueUnitEffectivities[ i ] !== DEFAULT_UNIT ) {
                    unitEff.unit = uniqueUnitEffectivities[ i ].toString();
                    unitEffectivities.push( unitEff );
                }
            }
        }
    }
    return unitEffectivities;
};

export let processEndItems = function( response ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }

    var effectivityEndItems = [];
    if( response.preferredEffectivityInfo ) {
        effectivityEndItems = populateEndItemsOrSVROwningItems( response.preferredEffectivityInfo.effectivityEndItems );
    }
    effectivityEndItems = addOpenObjectAsPreferredIfApplicable( effectivityEndItems,
        response.addOpenObjAsPreferredEndItem );
    return effectivityEndItems;
};

export let populateEndItemsOrSVROwningItems = function( allItems ) {
    var uniqueItems = [];
    if( allItems ) {
        for( var i = 0; i < allItems.length; i++ ) {
            var found = false;
            for( var j = 0; j < uniqueItems.length; j++ ) {
                if( allItems[ i ].uid === uniqueItems[ j ].uid ) {
                    found = true;
                    break;
                }
            }
            if( !found && allItems[ i ].uid !== NULL_ID ) {
                uniqueItems.push( allItems[ i ] );
            }
        }
    }
    return uniqueItems;
};

export let addOpenObjectAsPreferredIfApplicable = function( endItemsOrSVROwningItems, addOpenObjAsPreferredEndItem ) {
    if( addOpenObjAsPreferredEndItem ) {
        var context = appCtxSvc.getCtx( 'aceActiveContext.context' );
        if( context && context.productContextInfo ) {
            endItemsOrSVROwningItems.push( context.productContextInfo.props.awb0Product );
        }
    }
    return endItemsOrSVROwningItems;
};

export let processSoaResponseForBOTypes = function( response ) {
    var typeNames = [];
    if( response.output ) {
        for( var ii = 0; ii < response.output.length; ii++ ) {
            var displayableBOTypeNames = response.output[ ii ].displayableBOTypeNames;
            for( var jj = 0; jj < displayableBOTypeNames.length; jj++ ) {
                var SearchFilter = {
                    searchFilterType: 'StringFilter',
                    stringValue: ''
                };
                SearchFilter.stringValue = displayableBOTypeNames[ jj ].boName;
                typeNames.push( SearchFilter );
            }
        }
    }
    return typeNames;
};

export let fetchSubBOTypesAndDoSearch = function( data ) {
    if( !data.subBusinessObjects || data.subBusinessObjects.length === 0 ) {
        eventBus.publish( 'searchEndItems.fetchSubBOTypes' );
    } else {
        eventBus.publish( 'searchEndItems.doSearch' );
    }
};

var addDefaultUnitsToPreferredUnitEffectivities = function( unitEffectivities, data ) {
    var allUnits = {
        unit: data.effectivityUnitSectionAllUnitsValue.uiValue,
        cellHeader1: data.effectivityUnitSectionAllUnitsValue.uiValue
    };
    unitEffectivities.splice( 0, 0, allUnits );
};

export let updatePartialCtx = function( path, value ) {
    appCtxSvc.updatePartialCtx( path, value );
};

var addGroupUnitsToPreferredUnitEffectivities = function( unitEffectivities, data ) {
    // Add group to unit
    var allGroups = {
        unit: data.effectivityGroups.uiValue,
        cellHeader1: data.effectivityGroups.uiValue
    };
    unitEffectivities.push( allGroups );
};

export let applyEffectivityGroups = function( data, selectedGroupEffectivities ) {
    var groupEffectivityUidArray = [];
    var egos = populateDataFromEGUids( data );
    if( egos ) {
        groupEffectivityUidArray = _.clone( egos.dbValues );
    }
    for( var i = 0; i < selectedGroupEffectivities.length; ++i ) {
        // Add to PCI if not present
        var index = groupEffectivityUidArray.indexOf( selectedGroupEffectivities[ i ].uid );
        if( index === -1 ) {
            groupEffectivityUidArray.push( selectedGroupEffectivities[ i ].uid );
        }
    }
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture', 'EFFECTIVITY_CHANGE' );
    return groupEffectivityUidArray;
};

export let getAllAppliedGroupEffectivities = function( data ) {
    aceStructureConfigurationService.populateContextKey( data );
    let effGroupsDBValues = getUnitEffectivityGroupsFromProductContextInfo( data );
    var displayValuesArr = [];
    dmSvc.getProperties( effGroupsDBValues, [ 'Fnd0EffectivityList' ] );
    for( var rowNdx = 0; rowNdx < effGroupsDBValues.length; rowNdx++ ) {
        var newVMO = viewModelObjectService.createViewModelObject( effGroupsDBValues[ rowNdx ] );
        displayValuesArr.push( newVMO );
    }
    return { groupEffectivitiesLength: effGroupsDBValues.length, groupEffectivitiesApplied: displayValuesArr };
};

let populateDataFromEGUids = function( data ) {
    let egos;
    if( appCtxSvc.ctx.aceActiveContext
        && appCtxSvc.ctx.aceActiveContext.context.configContext
        && appCtxSvc.ctx.aceActiveContext.context.configContext.eg_uids ) {
        egos = { dbValues: appCtxSvc.ctx.aceActiveContext.context.configContext.eg_uids };
    } else{
        let productContextInfoModelObject = data.contextKeyObject.productContextInfo;
        egos = productContextInfoModelObject.props.awb0EffectivityGroups;
    }
    return egos;
};

export let removeEffectivityGroups = function( data, selectedGroupEffectivities, eventData ) {
    var egos = populateDataFromEGUids( eventData.data );
    var dbValues = [];
    dbValues = egos.dbValues;
    for( var i = 0; i < selectedGroupEffectivities.length; ++i ) {
        var index = dbValues.indexOf( selectedGroupEffectivities[ i ].uid );
        if( index > -1 ) {
            dbValues.splice( index, 1 );
        }
    }
    return dbValues;
};

export default exports = {
    getCurrentEffectiveUnitsAndEndItem,
    getInitialUnitEffectivityConfigurationData,
    getInitialEndItemConfigurationData,
    getEndItems,
    updateConfigEndItems,
    processUnitEffectivity,
    processEndItems,
    populateEndItemsOrSVROwningItems,
    addOpenObjectAsPreferredIfApplicable,
    processSoaResponseForBOTypes,
    fetchSubBOTypesAndDoSearch,
    applyEffectivityGroups,
    updatePartialCtx,
    getAllAppliedGroupEffectivities,
    removeEffectivityGroups,
    selectUnitEffectivity,
    applyUnitEffectivity,
    updateUnitEffectivity,
    updateUnitEffectivityText,
    setUnitEffectivity,
    getUnitEffectivityGroupsFromProductContextInfo
};
app.factory( 'endItemUnitEffectivityConfigurationService', () => exports );
