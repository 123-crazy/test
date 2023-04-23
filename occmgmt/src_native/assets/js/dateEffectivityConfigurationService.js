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
 * @module js/dateEffectivityConfigurationService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import aceStructureConfigurationService from 'js/aceStructureConfigurationService';
import dateTimeService from 'js/dateTimeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import AwRootScopeService from 'js/awRootScopeService';
import uwDirectiveDateTimeSvc from 'js/uwDirectiveDateTimeService';
import unitEffConfigration from 'js/endItemUnitEffectivityConfigurationService';
import viewModelObjectService from 'js/viewModelObjectService';
import dmSvc from 'soa/dataManagementService';

var exports = {};

var productContextInfo = null;
var _defaultDate = null;

var DEFAULT_DATE = '0001-01-01T00:00:00+00:00';

var populateSupportedFeaturesInfo = function( data ) {
    if( data && data.isEffectiveDateFeatureSupported && data.contextKeyObject ) {
        data.isEffectiveDateFeatureSupported.dbValue = data.contextKeyObject.supportedFeatures.Awb0DateEffectivityConfigFeature;
    }
};

var populateReadOnlyFeaturesInfo = function( data ) {
    if( data && data.isEffectiveDateFeatureReadOnly && data.contextKeyObject ) {
        data.isEffectiveDateFeatureReadOnly.dbValue = data.contextKeyObject.readOnlyFeatures.Awb0DateEffectivityConfigFeature;
    }
};

var convertEffectiveDateIntoVMProperty = function( productContextInfoModelObject ) {
    var effectiveDateVMProperty = uwPropertyService.createViewModelProperty(
        productContextInfoModelObject.props.awb0EffDate.dbValues[ 0 ],
        productContextInfoModelObject.props.awb0EffDate.uiValues[ 0 ], 'STRING',
        productContextInfoModelObject.props.awb0EffDate.dbValues[ 0 ], '' );
    effectiveDateVMProperty.uiValue = productContextInfoModelObject.props.awb0EffDate.uiValues[ 0 ];
    return effectiveDateVMProperty;
};

var getEffectiveDateFromProductContextInfo = function() {
    if( productContextInfo ) {
        return convertEffectiveDateIntoVMProperty( productContextInfo );
    }
};

var getRevRuleFromProductContextInfo = function() {
    if( productContextInfo ) {
        return productContextInfo.props.awb0CurrentRevRule;
    }
};

var convertRevisionRuleEffectiveDateIntoVMProperty = function( revisionRuleModelObject ) {
    if( revisionRuleModelObject.props.rule_date ) {
        var effectiveDateVMProperty = uwPropertyService.createViewModelProperty(
            revisionRuleModelObject.props.rule_date.dbValues[ 0 ],
            revisionRuleModelObject.props.rule_date.uiValues[ 0 ], 'STRING',
            revisionRuleModelObject.props.rule_date.dbValues[ 0 ], '' );
        effectiveDateVMProperty.uiValue = revisionRuleModelObject.props.rule_date.uiValues[ 0 ];
        return effectiveDateVMProperty;
    }
};

var getEffectiveDateFromRevisionRule = function( currentRevisionRule ) {
    if( currentRevisionRule ) {
        var currentRevisionRuleModelObject = cdm.getObject( currentRevisionRule.dbValues );
        if( currentRevisionRuleModelObject ) {
            return convertRevisionRuleEffectiveDateIntoVMProperty( currentRevisionRuleModelObject );
        }
    }
};

var getDefaultEffectiveDate = function( data ) {
    if( data ) {
        return _.clone( data.occurrenceManagementTodayTitle, true );
    }
};

// used Regular Expressions to differentiate date EGO and unit EGO
// [0-9] will look for numbers 0-9 and can be repetitive
// + indicates occurrences of [0-9] should be 1 or more
// (...)? indicates it is not mandatory but if it exist
// then it should have UP or SO or [0-9]
// * indicates occurrences should be 0 or more
export var isDateEffectivity = function( inputString ) {
    let effString = inputString.split( '\\:' )[1];
    if( effString.length === 0 ) {
        //Empty Effectivity will not be considered as a date effectivity
        return false;
    }
    let unitRegex = '([0-9]+(-(UP|SO|[0-9]+))?)';
    let concreteReg = '\\\\:(' + unitRegex + ', )*' + unitRegex + ' \\(';
    let output = inputString.match( concreteReg );
    return output ? output.length === 0 : true;
};

export var getDateEffectivityGroups = function( data ) {
    let productContextInfoModelObject = data.contextKeyObject.productContextInfo;
    if( productContextInfoModelObject ) {
        let egos = productContextInfoModelObject.props.awb0EffectivityGroups;
        return egos && egos.dbValues.length > 0 ? egos.dbValues.filter( e=>{
            let effString = cdm.getObject( e ).props.awp0CellProperties.dbValues[1];
            return isDateEffectivity( effString );
        } ) : [];
    }
};

var getDateEffectivityGroupsFromProductContextInfo = function( data ) {
    if( data.contextKeyObject.productContextInfo ) {
        let dateEgos = getDateEffectivityGroups( data );

        if( dateEgos && dateEgos.length > 0 ) {
            var effectivityGroupVMProperty;
            if( dateEgos.length > 1 ) {
                effectivityGroupVMProperty = uwPropertyService.createViewModelProperty( data.multipleGroups, data.multipleGroups, 'STRING', '', '' );
                effectivityGroupVMProperty.uiValue = data.multipleGroups.uiValue;
            } else {
                var groupName = '';
                effectivityGroupVMProperty = uwPropertyService.createViewModelProperty(
                    dateEgos[ 0 ],
                    '', 'STRING',
                    dateEgos[ 0 ], '' );

                var groupItemRev = cdm.getObject( dateEgos[ 0 ] );
                groupName = groupItemRev.props.object_name.uiValues[ 0 ];

                effectivityGroupVMProperty.uiValue = groupName;
            }
            return effectivityGroupVMProperty;
        }
    }
};

var populateEffectiveDate = function( data ) {
    if( data ) {
         var currentEffectiveDate = getDateEffectivityGroupsFromProductContextInfo( data );
        if( !currentEffectiveDate || !currentEffectiveDate.uiValue ) {
            currentEffectiveDate = getEffectiveDateFromProductContextInfo();
            if( !currentEffectiveDate || !currentEffectiveDate.uiValue ) {
                var currentRevisionRule = getRevRuleFromProductContextInfo();
                currentEffectiveDate = getEffectiveDateFromRevisionRule( currentRevisionRule );
                if( !currentEffectiveDate || !currentEffectiveDate.uiValue ) {
                    currentEffectiveDate = getDefaultEffectiveDate( data );
                }
            }
        }
        data.currentEffectiveDate = currentEffectiveDate;
    }
};

var clearDataProvider = function( data ) {
    if( data && data.dataProviders && data.dataProviders.getPreferredDateEffectivities ) {
        data.dataProviders.getPreferredDateEffectivities.viewModelCollection.clear();
        data.dataProviders.getPreferredDateEffectivities.selectedObjects = [];
    }
};

var populateProductContextInfo = function( data ) {
    aceStructureConfigurationService.populateContextKey( data );
    productContextInfo = data.contextKeyObject.productContextInfo;
};

var populateEffectivityDateTimeVisibilityAndFormat = function( data ) {
    var timeEnabled = data.contextKeyObject && data.contextKeyObject.productContextInfo.props.awb0EffDate.propertyDescriptor.constantsMap.timeEnabled;
    data.isTimeEnabled = timeEnabled && timeEnabled === '1';
    data.dateTimeFormat = data.isTimeEnabled ? dateTimeService.getSessionDateTimeFormat() : dateTimeService.getSessionDateFormat();
};

/**
 * Initialize the Date Effectivity Configuration Section
 */
export let getInitialDateEffectivityConfigurationData = function( data ) {
    if( data ) {
        uwDirectiveDateTimeSvc.assureDateTimeLocale();
        clearDataProvider( data );
        if( data.occurrenceManagementTodayTitle ) {
            _defaultDate = data.occurrenceManagementTodayTitle.uiValue;
        }
        aceStructureConfigurationService.populateContextKey( data );
        if( data.contextKeyObject !== undefined ) {
        populateProductContextInfo( data );
        if( productContextInfo ) {
            populateSupportedFeaturesInfo( data );
            populateReadOnlyFeaturesInfo( data );
            populateEffectiveDate( data );
            populateEffectivityDateTimeVisibilityAndFormat( data );
        }
} else {
            populateEffectivityDateTimeVisibilityFormatFromRevisionRule( data );
        }
    }
};

/**
 * populate the effectivity DateTime visibility format from the RevisionRule
 */
let populateEffectivityDateTimeVisibilityFormatFromRevisionRule = function( data ) {
    var objModelType = cmm.getType( 'RevisionRule' );
    if( objModelType !== null ) {
        var propDescriptor = objModelType.propertyDescriptorsMap.rule_date;
        if( !_.isUndefined( propDescriptor ) ) {
            var propConstantMap = propDescriptor.constantsMap;
            var timeEnabled = propConstantMap.timeEnabled;
            if( timeEnabled !== null ) {
                data.isTimeEnabled = timeEnabled && timeEnabled === '1';
                data.dateTimeFormat = data.isTimeEnabled ? dateTimeService.getSessionDateTimeFormat() : dateTimeService.getSessionDateFormat();
            }
        }
    }
};

var addDefaultDateToPreferredDateEffectivities = function( dateEffectivities, data ) {
    var today = {
        date: _defaultDate,
        dateTimeFormat: data.dateTimeFormat,
        cellHeader1: _defaultDate
    };
    dateEffectivities.splice( 0, 0, today );
};

// If the popup only shows date: act on every date change(when old != new).
// If the popup shows both time and date(data.isTimeEnabled === true), act only when time value is selected from the list.
export let handleDateOrTimeChange = function( data ) {
    if( ( !data.isTimeEnabled || data.eventData.oldValue ) && data.eventData.newValue && data.eventData.newValue !== data.eventData.oldValue ) {
        if( !data.isTimeEnabled || ( Math.abs( data.eventData.newValue - data.eventData.oldValue ) < 24 * 60 * 60 * 1000 ) ) {
            exports.changeConfiguration( data );
        }
    }
};

var addGroupToPreferredDateEffectivities = function( effectivityDates, data ) {
    // Add group to unit
    var allGroups = {
        date: data.dateRange.uiValue,
        cellHeader1: data.dateRange.uiValue
    };
    effectivityDates.push( allGroups );
};

export let processDateEffectivity = function( response, data ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }

    var effectivityDates = [];
    if( response.preferredEffectivityInfo ) {
        effectivityDates = populateEffectivityDates( response.preferredEffectivityInfo.effectivityDates, data );
    }
    addDefaultDateToPreferredDateEffectivities( effectivityDates, data );
    if( data.contextKeyObject && data.contextKeyObject.supportedFeatures && data.contextKeyObject.supportedFeatures.Awb0GroupEffectivityFeature &&
        ( appCtxSvc.ctx.tcSessionData.tcMajorVersion > 13 ||  appCtxSvc.ctx.tcSessionData.tcMajorVersion === 13 && appCtxSvc.ctx.tcSessionData.tcMinorVersion >= 3  ) ) {
        addGroupToPreferredDateEffectivities( effectivityDates, data );
    }
    return effectivityDates;
};

var populateEffectivityDates = function( allDateEffectivities, data ) {
    var effectivityDates = [];
    if( allDateEffectivities ) {
        var uniqueDateEffectivities = allDateEffectivities.filter( function( elem, index, allDates ) {
            return index === allDates.indexOf( elem );
        } );
        if( uniqueDateEffectivities ) {
            for( var i = 0; i < uniqueDateEffectivities.length; i++ ) {
                var dateEff = {};
                if( uniqueDateEffectivities[ i ] !== DEFAULT_DATE ) {
                    dateEff.date = uniqueDateEffectivities[ i ];
                    dateEff.dateTimeFormat = data.dateTimeFormat;
                    effectivityDates.push( dateEff );
                }
            }
        }
    }
    return effectivityDates;
};
export let initializeDateEffectivityInfo = function( data ) {
    data.dateTimeDetails = uwPropertyService.createViewModelProperty( '', '', 'DATE', data.subPanelContext.currentEffectiveDate.dbValue );
    data.currentEffectiveDate = data.subPanelContext.currentEffectiveDate;
    populateEffectivityDateTimeVisibilityAndFormat( data );
};

var setDateEffectivity = function( eventData, data ) {
    eventData.egos = data.contextKeyObject.productContextInfo.props.awb0EffectivityGroups.dbValues;
    if( eventData.effectivityDate === data.occurrenceManagementTodayTitle.propertyDisplayName ) {
        data.currentEffectiveDate.propertyDisplayName = data.occurrenceManagementTodayTitle.propertyDisplayName;
        data.currentEffectiveDate.dbValue = null;
        eventData.effectivityDate = new Date( '0001-01-01T00:00:00' ).getTime();
        eventData.egos = unitEffConfigration.getUnitEffectivityGroupsFromProductContextInfo( data );
    } else if( data.isGroupEffectivity ) {
        // Handle "Groups" - publish event to launch panel
        eventBus.publish( 'awConfigPanel.groupEffectivityClicked', eventData );
        eventBus.publish( 'awPopupWidget.close' );
        return;
    }else {
        data.currentEffectiveDate.dbValue = eventData.effectivityDate;
        eventData.effectivityDate = new Date( eventData.effectivityDate ).getTime();
        eventData.egos = unitEffConfigration.getUnitEffectivityGroupsFromProductContextInfo( data );
    }
    eventBus.publish( 'awConfigPanel.effectivityDateChanged', {
        effectivityDate: eventData.effectivityDate,
        currentEffectiveDate: data.currentEffectiveDate,
        viewKey: data.viewKey,
        egos: eventData.egos
    } );
    eventBus.publish( 'awPopupWidget.close' );
};

var getDateIndex = function( data ) {
    var dateEffIndex;
    if( data.currentEffectiveDate.dbValue ) {
        dateEffIndex = data.dataProviders.getPreferredDateEffectivities.viewModelCollection.loadedVMObjects.map(
            function( x ) {
                return x.date;
            } ).indexOf( data.currentEffectiveDate.dbValue );
    } else {
        dateEffIndex = data.dataProviders.getPreferredDateEffectivities.viewModelCollection.loadedVMObjects.map(
            function( x ) {
                return x.date;
            } ).indexOf( data.currentEffectiveDate.propertyDisplayName );
    }
    return dateEffIndex;
};

export let updateCurrentDateEffectivity = function( data, eventData ) {
    if( data && data.currentEffectiveDate ) {
        if( eventData.currentEffectiveDate.propertyDisplayName === data.occurrenceManagementTodayTitle.propertyDisplayName && eventData.currentEffectiveDate.dbValue === null ) {
            data.currentEffectiveDate.uiValue = data.occurrenceManagementTodayTitle.propertyDisplayName;
        } else {
            data.currentEffectiveDate.uiValue = dateTimeService.formatNonStandardDate( eventData.effectivityDate, data.dateTimeFormat );
        }
        // Structure platform code treats this as revision rule change.
        // So, setting userGesture as REVISION_RULE_CHANGE.
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture', 'REVISION_RULE_CHANGE' );
    }
};

export let initAddDateRangePanel = function( data ) {
    populateProductContextInfo( data );
    populateEffectivityDateTimeVisibilityAndFormat( data );
    var displayValuesArr = [];
    let effGroupsDBValues = getDateEffectivityGroups( data );
    if( effGroupsDBValues.length ) {
        dmSvc.getProperties( effGroupsDBValues, [ 'Fnd0EffectivityList' ] );
        for( var rowNdx = 0; rowNdx < effGroupsDBValues.length; rowNdx++ ) {
            var newVMO = viewModelObjectService.createViewModelObject( effGroupsDBValues[ rowNdx ] );
            displayValuesArr.push( newVMO );
        }
        data.groupEffectivitiesApplied = displayValuesArr;
    } else {
        data.groupEffectivitiesApplied = displayValuesArr;
     }
    if( data.configuredBy ) {
        data.configuredBy.uiValue = effGroupsDBValues.length ? String( data.i18n.configuredBy + ( newVMO ? newVMO.cellHeader2 : '' ) ) :
        String( data.i18n.configuredBy );
    }
};

export let applyDateEffectivityGroups = function( data, selectedGroupEffectivities ) {
    selectedGroupEffectivities = selectedGroupEffectivities.length ? selectedGroupEffectivities : [ selectedGroupEffectivities ];
    let groupEffectivityUidArray = unitEffConfigration.getUnitEffectivityGroupsFromProductContextInfo( data );
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

export let changeConfiguration = function( data ) {
    var isValidDateTimeValue = data.dateTimeDetails.dbValue > 0 && !data.dateTimeDetails.error;
    if( isValidDateTimeValue ) {
        var selectedDateTime = Math.floor( new Date( data.dateTimeDetails.dbValue ).getTime() / 1000 ) * 1000;
        var currentDateTime = data.currentEffectiveDate.dbValue ? new Date( data.currentEffectiveDate.dbValue ).getTime() : '';
        var isSameTimeSelected = currentDateTime && selectedDateTime === currentDateTime;
        if( isSameTimeSelected ) {
            return;
        }
        var eventData = {
            effectivityDate: new Date( selectedDateTime )
        };
        setDateEffectivity( eventData, data );
    }
};

export let updatePartialCtx = function( path, value ) {
    appCtxSvc.updatePartialCtx( path, value );
};

export let updateDateEffWhenSelectedFromList = function( eventData, data ) {
    if( eventData.selectedObjects.length ) {
        if( data.currentEffectiveDate.dbValue ) {
            if( data.currentEffectiveDate.dbValue !== eventData.selectedObjects[ 0 ].date ) {
                data.isGroupEffectivity = data.dateRange.uiValue === eventData.selectedObjects[ 0 ].date;
                eventData.effectivityDate = data.isGroupEffectivity ? -2 : eventData.selectedObjects[ 0 ].date;
                setDateEffectivity( eventData, data );
            }
        } else {
            if( data.currentEffectiveDate.propertyDisplayName !== eventData.selectedObjects[ 0 ].date ) {
                data.isGroupEffectivity = data.dateRange.uiValue === eventData.selectedObjects[ 0 ].date;
                eventData.effectivityDate = data.isGroupEffectivity ? -2 : eventData.selectedObjects[ 0 ].date;
                setDateEffectivity( eventData, data );
            }
        }
    } else { // Handle Current Date Eff selected
        eventBus.publish( 'awPopupWidget.close' );
    }
};

export let selectDateEffInList = function( data ) {
    if( data.dataProviders.getPreferredDateEffectivities.viewModelCollection.loadedVMObjects.length > 0 ) {
        //Find date eff index and select it
        var dateEffIndex = getDateIndex( data );
        if( dateEffIndex >= 0 ) {
            data.dataProviders.getPreferredDateEffectivities.changeObjectsSelection( dateEffIndex, dateEffIndex,
                true );
        }
    }
};

/**
 * Date Effectivity Configuration service utility
 */

export default exports = {
    getInitialDateEffectivityConfigurationData,
    processDateEffectivity,
    updateCurrentDateEffectivity,
    changeConfiguration,
    updateDateEffWhenSelectedFromList,
    selectDateEffInList,
    initializeDateEffectivityInfo,
    handleDateOrTimeChange,
    getDateEffectivityGroups,
    applyDateEffectivityGroups,
    updatePartialCtx,
    initAddDateRangePanel,
    isDateEffectivity
};
app.factory( 'dateEffectivityConfigurationService', () => exports );
