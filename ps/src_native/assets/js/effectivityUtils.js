// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global */

/**
 * effectivity authoring util
 *
 * @module js/effectivityUtils
 */
import app from 'app';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import dataManagementSvc from 'soa/dataManagementService';
import _ from 'lodash';
import viewModelService from 'js/viewModelService';
import localeService from 'js/localeService';

let exports = {};
let UPDATE_END_ITEM_EVENT = 'ps0Effectivity.updateEndItemValue';
let END_ITEM_PROP_LOADED_EVENT = 'ps0Effectivity.endItemPropLoaded';
let UP_UNIT_VAL = '2147483647';
/**
 * Get the type names.
 * @param {Object} response findDisplayableSubBusinessObjectsWithDisplayNames response
 * @return {Object} type names
 */
export let processSoaResponseForBOTypes = function( response ) {
    let typeNames = [];
    if( response.output ) {
        for( let ii = 0; ii < response.output.length; ii++ ) {
            let displayableBOTypeNames = response.output[ ii ].displayableBOTypeNames;
            for( let jj = 0; jj < displayableBOTypeNames.length; jj++ ) {
                let searchFilter = {
                    searchFilterType: 'StringFilter',
                    stringValue: ''
                };
                searchFilter.stringValue = displayableBOTypeNames[ jj ].boName;
                typeNames.push( searchFilter );
            }
        }
    }
    return typeNames;
};

/**
 * Get the selected element from palette.
 * @return {Object} selectedObject returns selected object
 */
export let getElementFromPallete = function() {
    let selectedObject = null;

    if( appCtxSvc.ctx.getClipboardProvider.selectedObjects.length !== 0 ) {
        selectedObject = appCtxSvc.ctx.getClipboardProvider.selectedObjects[ 0 ];
    } else if( appCtxSvc.ctx.getFavoriteProvider.selectedObjects.length !== 0 ) {
        selectedObject = appCtxSvc.ctx.getFavoriteProvider.selectedObjects[ 0 ];
    } else if( appCtxSvc.ctx.getRecentObjsProvider.selectedObjects.length !== 0 ) {
        selectedObject = appCtxSvc.ctx.getRecentObjsProvider.selectedObjects[ 0 ];
    }
    return selectedObject;
};

/**
 * Get the subobject BO types.
 * @param {Object} data declarative view model object.
 */
export let fetchSubBOTypesAndDoSearch = function( data ) {
    if( !data.subBusinessObjects || data.subBusinessObjects.length === 0 ) {
        eventBus.publish( 'searchEndItems.fetchSubBOTypes' );
    } else {
        eventBus.publish( 'searchEndItems.doSearch' );
    }
};

/**
 * Set End Item and publish provided event
 * @param {Object} itemOrRevision  Effectivity end item
 * @param {String} effectivityType evectivityType context variable
 * @param {String} eventName Event Name to publish
 */
export let setEndItemAndPublishProvidedEvent = function( itemOrRevision, effectivityType, eventName ) {
    itemOrRevision = itemOrRevision ? itemOrRevision : {};
    if( itemOrRevision.modelType && itemOrRevision.modelType.typeHierarchyArray && itemOrRevision.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
        itemOrRevision = cdm.getObject( itemOrRevision.props.awb0UnderlyingObject.dbValues[ 0 ] );
    }
    let item = itemOrRevision.props && itemOrRevision.props.items_tag ? cdm.getObject( itemOrRevision.props.items_tag.dbValues[ 0 ] ) : itemOrRevision;

    if( appCtxSvc.ctx[ effectivityType ].author ) {
        appCtxSvc.ctx[ effectivityType ].author.endItem = appCtxSvc.ctx[ effectivityType ].author.endItem || {};
        appCtxSvc.ctx[ effectivityType ].author.endItem.type = item.type || '';
        appCtxSvc.ctx[ effectivityType ].author.endItem.uid = item.uid || '';
    }
    if( appCtxSvc.ctx[ effectivityType ].edit ) {
        appCtxSvc.ctx[ effectivityType ].edit.endItem = appCtxSvc.ctx[ effectivityType ].edit.endItem || {};
        appCtxSvc.ctx[ effectivityType ].edit.endItem.type = item.type || '';
        appCtxSvc.ctx[ effectivityType ].edit.endItem.uid = item.uid || '';
    }
    if( !_.isUndefined( item.uid ) ) {
        dataManagementSvc.getProperties( [ item.uid ], [ 'object_string' ] ).then( function() {
            let uiValue = item.props.object_string.uiValues[ 0 ];
            appCtxSvc.ctx.expressionEffectivity.author.endItem.uiValue = uiValue;
            eventBus.publish( eventName );
        } );
    }
};

/**
 * Loads EndItem with the top level context as default
 */
export let loadTopLevelAsEndItem = function() {
    if( appCtxSvc.ctx.aceActiveContext ) {
        let topItemRevision = cdm.getObject( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.props.awb0Product.dbValues[ 0 ] );
        let topEndItem = cdm.getObject( topItemRevision.props.items_tag.dbValues[ 0 ] );
        setEndItemAndPublishProvidedEvent( topEndItem, 'expressionEffectivity', END_ITEM_PROP_LOADED_EVENT );
        let uiValue = topEndItem.props.object_string.dbValues[ 0 ];
        appCtxSvc.ctx.expressionEffectivity.author.endItem.uiValue = uiValue;
        eventBus.publish( UPDATE_END_ITEM_EVENT );
    }
};

/**
 * Update end item value on declarative view model
 * @param {String} data  declarative view model
 * @param {String} effectivityType evectivityType context variable
 */
export let updateEndItemValue = function( data, effectivityType ) {
    data.endItemVal.uiValue = appCtxSvc.ctx[ effectivityType ].author.endItem.uiValue;
};

/**
 * Get the localized value from a given key.
 * @param {String} key: The key for which the value needs to be extracted.
 * @param {String} resource: Resource bundle.
 * @return {String} localized string for the input key.
 */
let getLocalizedValueFromKey = function( key, resource ) {
    let localTextBundle = localeService.getLoadedText( resource );
    return localTextBundle[ key ];
};

/**
 * This function is to attach startDate validation criteria dynamically
 * @param {DeclViewModel} data - The declViewModel  object.
 */
export let attachStartDateConditionDynamically = function( data ) {
    let startDateCondition = {
        name: 'invalidStartDate',
        expression: {

            $and: [ {
                    $source: 'data.endDateOptions.dbValue',
                    $query: {
                        $eq: 'Date'
                    }
                },
                {

                    $source: 'data.startDate.dbValue',
                    $query: {
                        $gte: 'Date({{data.endDate.dbValue}})'
                    }
                }
            ]

        }
    };
    let starteDateErrorMsg = getLocalizedValueFromKey( 'invalidDateRangeError', 'PSMessages' );
    viewModelService.attachValidationCriteria( data, 'startDate', startDateCondition, starteDateErrorMsg );
};

/**
 * This function is to attach unitRangeText validation criteria dynamically
 * @param {DeclViewModel} data - The declViewModel  object.
 */
export let attachUnitRangeConditionDynamically = function( data ) {
    var unitRangeTextCondition = {
        name: 'invalidUnitText',
        expression: {
            $source: 'data.unitRangeText.dbValue',
            $query: {
                $notinregexp: '^[0-9]+$|^[0-9]+$|^([0-9]+|UP|SO|up|so)$|^[0-9]+\\-([0-9]+|UP|SO|up|so|uP|sO|Up|So)$'
            }
        }

    };
    var unitRangeTextErrorMsg = getLocalizedValueFromKey( 'invalidUnitRange', 'PSMessages' );
    viewModelService.attachValidationCriteria( data, 'unitRangeText', unitRangeTextCondition, unitRangeTextErrorMsg );
    var unitRangeTextCondition1 = {
        name: 'invalidUnitRange',
        expression: 'conditions.invalidUnitText===false && data.isUnitRangeValid ===false'

    };
    viewModelService.attachValidationCriteria( data, 'unitRangeText', unitRangeTextCondition1, unitRangeTextErrorMsg );
};

/**
 * This function is to attach validation criteria dynamically
 * @param {DeclViewModel} data - The declViewModel  object.
 */
export let validateDateCriteria = function( data ) {
    if( data.startDate.valueUpdated || data.endDate.valueUpdated ) {
        data.startDate.validationCriteria = [];
        attachStartDateConditionDynamically( data );
    }
};

/**
 * This function is to validate unit text field
 * @param {DeclViewModel} data - The declViewModel  object.
 */
export let validateUnitCriteria = function( data ) {
    data.isUnitRangeValid = false;
    if( data.unitRangeText.dbValue !== undefined && data.unitRangeText.dbValue !== '' && data.unitRangeText.validationCriteria[ 0 ] === null ) {
        data.isUnitRangeValid = true;
        let values = data.unitRangeText.dbValue.split( '-' );

       //unitIn should be less than unitOut
       if( values.length === 2 && Number( values[ 1 ] ) ) {
        data.isUnitRangeValid = Number( values[ 0 ] ) < Number( values[ 1 ] ) && Number( values[ 1 ] ) <= Number( UP_UNIT_VAL );
        }

        //unitOut should be less than UP
        if( values.length === 1 && Number( values[ 0 ] ) ) {
            data.isUnitRangeValid = Number( values[ 0 ] ) <= Number( UP_UNIT_VAL );
        }
    }
};

/**
 * Click listener for enditem button
 * @param {data} data of the active view
 */
export let ps0ReplaceButtonClickListener = function( data ) {
    data.ps0ReplaceButtonClickEvent = function() {
        var navContext = {
            destPanelId: 'ps0EffectivityEndItemPanel',
            title: getLocalizedValueFromKey( 'invalidUnitRange', 'PSConstants' ),
            recreatePanel: true,
            supportGoBack: true
        };
        eventBus.publish( 'awPanel.navigate', navContext );
    };
};

export default exports = {
    processSoaResponseForBOTypes,
    fetchSubBOTypesAndDoSearch,
    getElementFromPallete,
    setEndItemAndPublishProvidedEvent,
    loadTopLevelAsEndItem,
    updateEndItemValue,
    attachStartDateConditionDynamically,
    validateDateCriteria,
    attachUnitRangeConditionDynamically,
    validateUnitCriteria,
    ps0ReplaceButtonClickListener
};

app.factory( 'effectivityUtils', () => exports );
