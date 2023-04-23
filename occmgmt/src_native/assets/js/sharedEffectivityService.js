// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/sharedEffectivityService
 */
import app from 'app';
import AwFilterService from 'js/awFilterService';
import appCtxSvc from 'js/appCtxService';
import tcVmoService from 'js/tcViewModelObjectService';
import localeService from 'js/localeService';
import cdm from 'soa/kernel/clientDataModel';
import dataManagementSvc from 'soa/dataManagementService';
import addElementService from 'js/addElementService';
import occmgmtSplitViewUpdateService from 'js/occmgmtSplitViewUpdateService';
import _occmgmtBackingObjectProviderService  from 'js/occmgmtBackingObjectProviderService';
import _expressionEffectivityService from 'js/expressionEffectivityService';
import soaSvc from 'soa/kernel/soaService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import _ from 'lodash';

import eventBus from 'js/eventBus';

var exports = {};

var setEndItem = function( itemOrRevision, data ) {
        itemOrRevision = itemOrRevision ? itemOrRevision : {};
        if( itemOrRevision && itemOrRevision.modelType && itemOrRevision.modelType.typeHierarchyArray && itemOrRevision.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
            itemOrRevision = cdm.getObject(itemOrRevision.props.awb0UnderlyingObject.dbValues[0]);
        }
        var item = itemOrRevision.props && itemOrRevision.props.items_tag ? cdm.getObject( itemOrRevision.props.items_tag.dbValues[0]) : itemOrRevision;

        appCtxSvc.ctx.elementEffectivity = appCtxSvc.ctx.elementEffectivity || {};
        appCtxSvc.ctx.elementEffectivity.author = appCtxSvc.ctx.elementEffectivity.author || {};
        appCtxSvc.ctx.elementEffectivity.author.endItem = appCtxSvc.ctx.elementEffectivity.author.endItem || {};
        appCtxSvc.ctx.elementEffectivity.author.endItem.type = item.type || '';
        appCtxSvc.ctx.elementEffectivity.author.endItem.uid = item.uid || '';

        appCtxSvc.ctx.editEffectivityContext = appCtxSvc.ctx.editEffectivityContext || {};
        appCtxSvc.ctx.editEffectivityContext.edit = appCtxSvc.ctx.editEffectivityContext.edit || {};
        appCtxSvc.ctx.editEffectivityContext.edit.endItem = appCtxSvc.ctx.editEffectivityContext.edit.endItem || {};
        appCtxSvc.ctx.editEffectivityContext.edit.endItem.type = item.type || '';
        appCtxSvc.ctx.editEffectivityContext.edit.endItem.uid = item.uid || '';

        if( !_.isUndefined( item.uid ) ) {
            dataManagementSvc.getProperties( [ item.uid ], [ 'object_string' ] ).then( function() {
                var dbValue = item.props.object_string.dbValues[ 0 ];
                appCtxSvc.ctx.elementEffectivity.author.endItem.dbValue = dbValue;
                appCtxSvc.ctx.editEffectivityContext.edit.endItem.dbValue = dbValue;
                exports.updateEndItemValue(data);
                eventBus.publish( 'effectivity.endItemPropLoaded' );
            } );
        }
};

var initializeElementEffectivityContextObject = function() {
    appCtxSvc.ctx.elementEffectivity = appCtxSvc.ctx.elementEffectivity || {};
    appCtxSvc.ctx.elementEffectivity.author = appCtxSvc.ctx.elementEffectivity.author || {};
    appCtxSvc.ctx.editEffectivityContext = appCtxSvc.ctx.editEffectivityContext || {};
    appCtxSvc.ctx.editEffectivityContext.edit = appCtxSvc.ctx.editEffectivityContext.edit || {};

    appCtxSvc.ctx.aceEffectivityValidator = appCtxSvc.ctx.aceEffectivityValidator || {};
    setCurrentlyRevealedPanelName( 'NEW' );
    setEndItem();
};

export let clearDateAndUnitEffectivity = function( data ) {
    clearDateEffectivityFields( data );
    clearUnitEffectivityFields( data );
    setCurrentlyRevealedPanelName( 'NEW' );
    return data.dateOrUnitEffectivityTypeRadioButton.dbValue;
};

var clearDateEffectivityFields = function( data ) {
    data.startDate.dateApi.dateValue = '';
    data.startDate.dateApi.timeValue = '';
    data.endDate.dateApi.dateValue = '';
    data.endDate.dateApi.timeValue = '';
    data.endDate.openEndedStatus = 0;
    data.startDate.dbValue = '';
    data.endDate.dbValue = '';
    data.endDateOptions.dbValue = 'Date';
    data.nameBox.dbValue = '';
    data.isShared.dbValue = false;
    appCtxSvc.ctx.elementEffectivity.isProtected = false;
    data.isDateRangeValid = true;
    setLocalizedValue( data.endDateOptions, 'uiValue', 'dateEffectivity' );
};

var clearUnitEffectivityFields = function( data ) {
    data.unitRangeText.dbValue = '';
    data.isunitRangeValid = true;
    data.nameBox.dbValue = '';
    data.isShared.dbValue = false;
    appCtxSvc.ctx.elementEffectivity.isProtected = false;
};

export let setDateOrUnitEffectivityInEditPanel = function( data ) {
    if( data.isDateEffectivityFieldsSet ) {
        data.isDateEffectivityFieldsSet = false;
        return;
    }
    clearDateEffectivityFields( data );
    clearUnitEffectivityFields( data );
    return data.dateOrUnitEffectivityTypeRadioButton.dbValue;
};

export let setProperties = function( data ) {
    var properties = data.propertiesToEdit[ data.selectedCell.uid ];
    data.selectedEffectivtyProperties = properties;
    exports.clearSelectedEndItem( data );
    if( properties.props.effectivity_dates.dbValues[ 0 ] ) {
        data.dateOrUnitEffectivityTypeRadioButton.dbValue = true;
        setDateEffectivityFields( data );
        data.isDateEffectivityFieldsSet = true;
    } else if( !properties.props.effectivity_dates.dbValues[ 0 ] ) {
        data.dateOrUnitEffectivityTypeRadioButton.dbValue = false;
        data.endDate.openEndedStatus = 0;
        setUnitEffectivityFields( data );
    }
    if( data.selectedEffectivtyProperties.props.effectivity_id.dbValues[ 0 ] ) {
        data.nameBox.dbValue = data.selectedEffectivtyProperties.props.effectivity_id.dbValues[ 0 ];
        data.isShared.dbValue = true;
    }

    if( data.selectedEffectivtyProperties.props.effectivity_protection.uiValues[ 0 ] === 'True' ) {
        appCtxSvc.ctx.elementEffectivity.isProtected = true;
    }

    setEndItemOrEndItemRevisionValue( data );

    return data.dateOrUnitEffectivityTypeRadioButton.dbValue;
};

var setDateEffectivityFields = function( data ) {
    data.startDate.dbValue = new Date( data.selectedEffectivtyProperties.props.effectivity_dates.dbValues[ 0 ] )
        .getTime();
    data.startDate.dateApi.dateValue = AwFilterService.instance( 'date' )( data.startDate.dbValue, 'dd-MMM-yyyy' );
    if( data.selectedEffectivtyProperties.props.effectivity_dates.dbValues[ 1 ] ) {
        data.endDate.dbValue = new Date(
            data.selectedEffectivtyProperties.props.effectivity_dates.dbValues[ 1 ] ).getTime();
        data.endDate.dateApi.dateValue = AwFilterService.instance( 'date' )( data.endDate.dbValue, 'dd-MMM-yyyy' );
        data.endDateOptions.dbValue = 'Date';
        data.endDateOptions.dbOriginalValue = 'Date';
        setLocalizedValue( data.endDateOptions, 'uiValue', 'dateEffectivity' );
    } else if( data.selectedEffectivtyProperties.props.range_text.dbValues[ 0 ].indexOf( 'UP' ) > -1 ) {
        data.endDateOptions.dbValue = 'UP';
        data.endDateOptions.dbOriginalValue = 'UP';
        setLocalizedValue( data.endDateOptions, 'uiValue', 'upText' );
    } else if( data.selectedEffectivtyProperties.props.range_text.dbValues[ 0 ].indexOf( 'SO' ) > -1 ) {
        data.endDateOptions.dbValue = 'SO';
        data.endDateOptions.dbOriginalValue = 'SO';
        setLocalizedValue( data.endDateOptions, 'uiValue', 'soText' );
    }
};

var setUnitEffectivityFields = function( data ) {
    data.unitRangeText.dbValue = data.selectedEffectivtyProperties.props.range_text.dbValues[ 0 ];
};

var setEndItemOrEndItemRevisionValue = function( data ) {
    var editCellEndItemProp = data.selectedEffectivtyProperties.props.end_item_rev.dbValues[ 0 ] ?
    data.selectedEffectivtyProperties.props.end_item_rev : data.selectedEffectivtyProperties.props.end_item;

    var effEndItemOrRevision = editCellEndItemProp.dbValues[0];
    if( effEndItemOrRevision ) {
        var itemOrRevision = cdm.getObject( editCellEndItemProp.dbValues[0] );
        itemOrRevision.dbValue = editCellEndItemProp.uiValues[ 0 ];
        setEndItem( itemOrRevision );

        data.endItemPrev = data.endItemVal.uiValue;
        data.endItemVal.uiValue = editCellEndItemProp.uiValues[ 0 ];
    }
};

var setLocalizedValue = function( object, objectProperty, resourceKey ) {
    var resource = 'OccurrenceManagementConstants';
    var localTextBundle = localeService.getLoadedText( resource );
    if( localTextBundle ) {
        object[ objectProperty ] = localTextBundle[ resourceKey ];
    } else {
        var asyncFun = function( localTextBundle ) {
            object[ objectProperty ] = localTextBundle[ resourceKey ];
        };
        localeService.getTextPromise( resource ).then( asyncFun( localTextBundle ) );
    }
};

var setCurrentlyRevealedPanelName = function( panelName ) {
    appCtxSvc.ctx.elementEffectivity.selectedPanel = panelName;
};

/* Loads EndItem with the top level context as default*/
export let loadTopLevelAsEndItem = function(data) {
    if( appCtxSvc.ctx.aceActiveContext ) {
        var topItemRevision = cdm.getObject( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.props.awb0Product.dbValues[ 0 ] );
        var topEndItem = cdm.getObject( topItemRevision.props.items_tag.dbValues[ 0 ] );
        setEndItem( topEndItem, data );
        var dbValue = topEndItem.props && topEndItem.props.object_string ? topEndItem.props.object_string.dbValues[ 0 ] : '';
        appCtxSvc.ctx.elementEffectivity.author.endItem.dbValue = dbValue;

    }
};

/* returns the typeFilters that are allowed to be shown on palette and search tabs */
export let setTypeFilterInfoFromResponse = function( response ) {
    return addElementService.extractAllowedTypesInfoFromResponse( response ).searchTypeName;
};

var getElementFromPallete = function() {
    var selectedObject = null;

    if( appCtxSvc.ctx.getClipboardProvider.selectedObjects.length !== 0 ) {
        selectedObject = appCtxSvc.ctx.getClipboardProvider.selectedObjects[ 0 ];
    } else if( appCtxSvc.ctx.getFavoriteProvider.selectedObjects.length !== 0 ) {
        selectedObject = appCtxSvc.ctx.getFavoriteProvider.selectedObjects[ 0 ];
    } else if( appCtxSvc.ctx.getRecentObjsProvider.selectedObjects.length !== 0 ) {
        selectedObject = appCtxSvc.ctx.getRecentObjsProvider.selectedObjects[ 0 ];
    }
    return selectedObject;
};

/* updates EndItem values and navigates to New panel */
export let updateEndItemAndNavigateToNewPanel = function( destPanelId ) {
    var endItemRev = getElementFromPallete();
    var endItemLoaded = eventBus.subscribe( 'effectivity.endItemPropLoaded', function() {
        exports.closeEndItemPanel();
        eventBus.publish( 'authorEffectivities.updateEndItemValue' );
        eventBus.publish( 'awPanel.navigate', {
            destPanelId: destPanelId
        } );
        eventBus.unsubscribe( endItemLoaded );
    } );

    setEndItem( endItemRev );
};

export let clearSelectedEndItem = function( data ) {
    setEndItem();
    if( data.endItemVal ) {
        data.endItemVal.uiValue = '';
    }
    setCurrentlyRevealedPanelName( 'NEW' );
};

export let clearAuthorEffectivityPanel = function( data ) {
    if( data.dateOrUnitEffectivityTypeRadioButton.dbValue ) {
        clearDateEffectivityFields( data );
    } else {
        clearUnitEffectivityFields( data );
    }

    exports.clearSelectedEndItem( data );
    appCtxSvc.ctx.elementEffectivity.isProtected = false;
    data.nameBox.dbValue = '';
    data.isShared.dbValue = false;
};

export let clearEndDate = function( data ) {
    if( data.endDateOptions.dbValue !== 'Date' ) {
        data.endDate.dateApi.dateValue = '';
        data.endDate.dateApi.timeValue = '';
        data.endDate.dbValue = '';
    }
};

export let getEffectivityName = function( data ) {
    if( data.isShared.dbValue ) {
        return data.nameBox.dbValue;
    }
    return '';
};

export let getDateRangeText = function( data ) {
    var dateRange = [];
    var endDate = data.endDate.dbValue;
    var startDate = data.startDate.dbValue;

    if( data.dateOrUnitEffectivityTypeRadioButton.dbValue ) {
        dateRange[ 0 ] = AwFilterService.instance( 'date' )( startDate, 'yyyy-MM-dd' ) + 'T' +
            AwFilterService.instance( 'date' )( startDate, 'HH:mm:ssZ' );

        if( data.endDateOptions.dbValue === 'UP' ) {
            data.endDate.openEndedStatus = 1;
        } else if( data.endDateOptions.dbValue === 'SO' ) {
            data.endDate.openEndedStatus = 2;
        } else {
            dateRange[ 1 ] = AwFilterService.instance( 'date' )( endDate, 'yyyy-MM-dd' ) + 'T' +
                AwFilterService.instance( 'date' )( endDate, 'HH:mm:ssZ' );
            data.endDate.openEndedStatus = 0;
        }
    }
    return dateRange;
};

export let closeEndItemPanel = function() {
    setCurrentlyRevealedPanelName( 'NEW' );
};

export let updateEndItemValue = function( data ) {
    if(data && data.endItemVal){
        data.endItemVal.uiValue = appCtxSvc.ctx.elementEffectivity.author.endItem.dbValue;
    }
};

export let setEndItemAndNavigateToNewPanel = function( data ) {
    var endItem = data.dataProviders.searchEndItems.selectedObjects[ 0 ];
    if( endItem ) {
        var endItemLoaded = eventBus.subscribe( 'effectivity.endItemPropLoaded', function() {
            exports.closeEndItemPanel();
            eventBus.publish( 'authorEffectivities.updateEndItemValue' );
            eventBus.publish( 'awPanel.navigate', {
                destPanelId: data.previousView
            } );
            eventBus.unsubscribe( endItemLoaded );
        } );

        setEndItem( endItem );
    }
};

export let handleTabSelectionChange = function( data ) {
    if( data && data.tabsModel && data.tabsModel.dbValues[ 0 ].selectedTab ) {
        // initialize new tab
        setCurrentlyRevealedPanelName( 'NEW' );
    } else if( data && data.tabsModel && data.tabsModel.dbValues[ 1 ].selectedTab ) {
        // initialize search tab
        setCurrentlyRevealedPanelName( 'SEARCH' );
    }
};

export let clearDataProviderSelection = function( dataProvider ) {
    dataProvider.selectNone();
};

/**
 * Set the selected release status.
 *
 * @param {obejct} releaseStatus - the selected status
 */
export let setReleaseStatusToAppContext = function( releaseStatus ) {
    var selectedPWAObject = appCtxSvc.ctx.selected;
    var releaseStatusProp = selectedPWAObject.props.release_status_list ||
        selectedPWAObject.props.awb0ArchetypeRevRelStatus;

    // populate ui value of selected release status
    var uiValue;
    for( var i = 0; i < releaseStatusProp.dbValues.length; i++ ) {
        if( releaseStatusProp.dbValues[ i ] === releaseStatus ) {
            uiValue = releaseStatusProp.uiValues[ i ];
            break;
        }
    }

    appCtxSvc.ctx.editEffectivityContext.selectedReleaseStatus = cdm.getObject( releaseStatus );
    appCtxSvc.ctx.editEffectivityContext.selectedReleaseStatus.uiValue = uiValue;
    eventBus.publish( 'editEffectivityContext.selectedReleaseStatusUpdated' );
};

export let setReleaseStatusListFromSelectedObjectInPWA = function( data ) {
    var selectedPWAObject = appCtxSvc.ctx.selected;
    return tcVmoService.getViewModelProperties( [ selectedPWAObject ], [ 'release_status_list', 'awb0ArchetypeRevRelStatus' ] ).then( function() {
        var releaseStatusProp;
        if( selectedPWAObject.props.awb0ArchetypeRevRelStatus ) {
            releaseStatusProp = selectedPWAObject.props.awb0ArchetypeRevRelStatus;
        } else {
            releaseStatusProp = selectedPWAObject.props.release_status_list;
        }

        var releaseStatusList = [];
        var i = 0;
        for( i = 0; i < releaseStatusProp.dbValues.length; i++ ) {
            releaseStatusList.push( {
                propInternalValue: releaseStatusProp.dbValues[ i ],
                propDisplayValue: releaseStatusProp.uiValues[ i ]
            } );
        }

        if( releaseStatusProp.dbValues.length > 0 ) {
            data.relStatusList.dbValue = releaseStatusList;
            data.releaseStatus.dbValue = releaseStatusList[ 0 ].propInternalValue;

            appCtxSvc.ctx.editEffectivityContext.selectedReleaseStatus = cdm.getObject( data.releaseStatus.dbValue );
            appCtxSvc.ctx.editEffectivityContext.selectedReleaseStatus.uiValue = releaseStatusList[ 0 ].propDisplayValue;
            eventBus.publish( 'editEffectivityContext.selectedReleaseStatusUpdated' );
        }
    } );
};

/**
 * Get the effectivities.
 *
 * @param {object} data - the data object
 * @return effectivityObjectArray - effectivities array
 *
 */
export let getEffectivitiesArray = function( data ) {
    var objects = data.modelObjects;
    var effectivityObjectArray = [];
    var i = 0;
    for( var key in data.modelObjects ) {
        var object = objects[ key ];
        if( object.type === 'Effectivity' ) {
            effectivityObjectArray[ i ] = object;
            i++;
        }
    }
    return effectivityObjectArray;
};

export let updateEffectivities = function( selectedModelObject ) {
    var objectsToRefresh = [];
    var activeElements = [ selectedModelObject ];

    if( appCtxSvc.ctx.aceActiveContext && appCtxSvc.ctx.aceActiveContext.key ) {
        var inactiveView = occmgmtSplitViewUpdateService.getInactiveViewKey();
        if( inactiveView ) {
            var inactiveElements = occmgmtSplitViewUpdateService.getAffectedElementsPresentInGivenView( inactiveView, selectedModelObject );
            if( inactiveElements ) {
                objectsToRefresh = objectsToRefresh.concat( inactiveElements );
            }
        }
        activeElements = occmgmtSplitViewUpdateService.getAffectedElementsPresentInGivenView( appCtxSvc.ctx.aceActiveContext.key, selectedModelObject );
    }

    if( activeElements ) {
        objectsToRefresh = objectsToRefresh.concat( activeElements );
    }
    if( objectsToRefresh.length ) {
        var policy = {
            types: [ {
                name: 'ItemRevision',
                properties: [ { name: 'effectivity_text' } ]
            } ]
        };
        let actionPolicyId = propertyPolicySvc.register( policy, 'refreshObjects_Policy' );
        soaSvc.post( 'Core-2007-01-DataManagement', 'refreshObjects', {
            objects: objectsToRefresh
        } ).then( ()=>{ propertyPolicySvc.unregister( actionPolicyId ); }, ()=>{ propertyPolicySvc.unregister( actionPolicyId ); } );
    }
};
export let limitTotalFoundForTooltip = function( response, data ) {
    /*Update tooltip title*/
    var tooltipLabel = data.i18n.elementEffectivityTooltipTitle;
    var totalFound = response.totalFound || (response.effectivitiesInfo[0].effectivityExprData && response.effectivitiesInfo[0].effectivityExprData.length > 0
        ? response.effectivitiesInfo[0].effectivityExprData : response.effectivitiesInfo[0].effectivityObjects).length;
    tooltipLabel = tooltipLabel.replace( '{0}', totalFound );
    data.effectivityTooltipLabel.propertyDisplayName = tooltipLabel;

    /*Enable link and limit total Found to 4*/
    if( totalFound > 4 ) {
        data.enableMoreLink.dbValue = true;
        var tooltipLink = data.i18n.tooltipLinkText;
        tooltipLink = tooltipLink.replace( '{0}', totalFound - 4 );
        data.moreEffectivitiesLink.propertyDisplayName = tooltipLink;
        totalFound = 4;
    }
    response.totalFound = totalFound;
    return totalFound;
};

export let getSelectedElements = function( data ) {
    var elementSelectedMessage = data.elementSelected;
    var totalFound = appCtxSvc.ctx.mselected.length;
    elementSelectedMessage = elementSelectedMessage.replace( '{0}', totalFound );

    var response =  {
        elementSelectedMessage : elementSelectedMessage
    };
    return response;
};

export let getEffectivitiesFromResponse = function(response, maxToLoad){
    var effectivities = response.effectivitiesInfo[0].effectivityExprData && response.effectivitiesInfo[0].effectivityExprData.length > 0
    ? _expressionEffectivityService.getEffectivityDataForDisplay( {
        effectivityData : [{
            effectivity: response.effectivitiesInfo[0].effectivityExprData
        }]
    } ) : response.effectivitiesInfo[0].effectivityObjects;
    return effectivities.slice(0,maxToLoad.dbValue);
};

export let getBomlineOfSelectedElement = function( element ){
    return _occmgmtBackingObjectProviderService.getBackingObjects([element])[0];
};

initializeElementEffectivityContextObject();

export default exports = {
    getEffectivitiesFromResponse,
    getBomlineOfSelectedElement,
    clearDateAndUnitEffectivity,
    setDateOrUnitEffectivityInEditPanel,
    setProperties,
    loadTopLevelAsEndItem,
    setTypeFilterInfoFromResponse,
    updateEndItemAndNavigateToNewPanel,
    clearSelectedEndItem,
    clearAuthorEffectivityPanel,
    clearEndDate,
    getEffectivityName,
    getDateRangeText,
    closeEndItemPanel,
    updateEndItemValue,
    setEndItemAndNavigateToNewPanel,
    handleTabSelectionChange,
    clearDataProviderSelection,
    setReleaseStatusToAppContext,
    setReleaseStatusListFromSelectedObjectInPWA,
    getEffectivitiesArray,
    updateEffectivities,
    limitTotalFoundForTooltip,
    getSelectedElements
};
/**
 * Share Effectivity service utility
 *
 * @memberof NgServices
 * @member swcService
 */
app.factory( 'sharedEffectivityService', () => exports );
