// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 *
 * @module js/searchSettingsService
 *
 * @requires js/uwPropertyService
 * @requires lodash
 * @requires angular
 * @requires js/appCtxService
 * @requires soa/kernel/soaService
 *
 */
import app from 'app';
import uwPropertyService from 'js/uwPropertyService';
import appCtxService from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import messagingService from 'js/messagingService';
import _ from 'lodash';
import localeService from 'js/localeService';
import AwStateService from 'js/awStateService';

var OBJECT_TYPE = 'WorkspaceObject.object_type';
var CATEGORIZATION = 'Categorization.Category';
var _TYPE;
var _CATEGORY;

/**
 * convert the preference data type to ViewModelProperty type
 * @function getDataType
 * @param {INTEGER}preferenceDataType - preference data type
 */
export let getDataType = function( preferenceDataType ) {
    var dataType;
    switch ( preferenceDataType ) {
        case 1:
            dataType = 'BOOLEAN';
            break;
        case 2:
            dataType = 'INTEGER';
            break;
        default:
            dataType = 'STRING';
            break;
    }
    return dataType;
};

/**
 * validate_AW_TypeAheadFacetSearch_Delay
 * @function validate_AW_TypeAheadFacetSearch_Delay
 * @param {INTEGER}dbValue - dbValue
 */
export let validate_AW_TypeAheadFacetSearch_Delay = function( dbValue ) {
    return dbValue > 50 && dbValue < 1000;
};

/**
 * addToChangedPreferences
 * @function addToChangedPreferences
 * @param {ViewModelProperty}prop - ViewModelProperty
 */
export let addToChangedPreferences = function( prop ) {
    return function() {
        exports.doAddToChangedPreferences( prop );
    };
};

export let processAddToChangedPreferences = function( prop ) {
    if( prop.propertyName === 'AWC_Limited_Filter_Categories_Enabled' ) {
        appCtxService.updatePartialCtx( 'searchSettings.AWC_Limited_Filter_Categories_Enabled', prop.dbValue );
    }
    if( appCtxService.ctx.searchSettings.erroredPreferenceValues ) {
        delete appCtxService.ctx.searchSettings.erroredPreferenceValues[ prop.propertyName ];
        if( Object.keys( appCtxService.ctx.searchSettings.erroredPreferenceValues ).length < 1 ) {
            delete appCtxService.ctx.searchSettings.erroredPreferenceValues;
        }
    }
};

/**
 * doAddToChangedPreferences
 * @function doAddToChangedPreferences
 * @param {ViewModelProperty}prop - ViewModelProperty
 */
export let doAddToChangedPreferences = function( prop ) {
    let isValid = true;
    if( prop.propApi.validationApi ) {
        isValid = prop.propApi.validationApi( prop.dbValue );
    }
    if( isValid ) {
        processAddToChangedPreferences( prop );
        prop.error = null;
        if( appCtxService.ctx.searchSettings.originalPrefValues[ prop.propertyName ] !== prop.dbValue ) {
            if( prop.propertyName === 'AWC_Limited_Filter_Categories_Expanded' ) {
                let origLength = appCtxService.ctx.searchSettings.filtersSelected.length;
                if( prop.dbValue && prop.dbValue.length === 2 && origLength === 2 ) {
                    //no change. default filters expanded
                    exports.deleteChangedPreferenceValues( prop );
                    return;
                }
            }
            if( !appCtxService.ctx.searchSettings.changedPreferenceValues ) {
                appCtxService.ctx.searchSettings.changedPreferenceValues = {};
            }
            appCtxService.ctx.searchSettings.changedPreferenceValues[ prop.propertyName ] = prop;
        } else {
            exports.deleteChangedPreferenceValues( prop );
        }
    } else {
        if( !appCtxService.ctx.searchSettings.erroredPreferenceValues ) {
            appCtxService.ctx.searchSettings.erroredPreferenceValues = {};
        }
        appCtxService.ctx.searchSettings.erroredPreferenceValues[ prop.propertyName ] = prop;
        prop.error = prop.validationErrorMessage;
        messagingService.showError( prop.validationErrorMessage );
    }
};

/**
 * load all the preferences
 * @function loadViewModel
 * @param {ViewModelProperty}prop - ViewModelProperty
 */
export let deleteChangedPreferenceValues = function( prop ) {
    if( appCtxService.ctx.searchSettings.changedPreferenceValues ) {
        delete appCtxService.ctx.searchSettings.changedPreferenceValues[ prop.propertyName ];
        if( Object.keys( appCtxService.ctx.searchSettings.changedPreferenceValues ).length < 1 ) {
            delete appCtxService.ctx.searchSettings.changedPreferenceValues;
        }
    }
};

/**
 * load all the preferences
 * @function loadViewModel
 * @param {Object}data - the view model data
 */
export let loadViewModel = function( data ) {
    if( !data.preferencesForSettings ) {
        return;
    }
    let originalPrefValues = {};
    if( !appCtxService.ctx.searchSettings ) {
        appCtxService.ctx.searchSettings = {};
    }
    appCtxService.ctx.searchSettings.searchPreferencesForSettings = [];
    appCtxService.ctx.searchSettings.originalPrefValues = {};

    let preferenceNames = data.preferencesForSettings.map( ( { name } ) => name );
    let preferenceDisplayNames = data.preferencesForSettings.map( ( { displayName } ) => displayName );
    let preferenceDescriptions = data.preferencesForSettings.map( ( { description } ) => description );
    let preferenceCategories = data.preferencesForSettings.map( ( { category } ) => category );
    let preferenceValidationApi = data.preferencesForSettings.map( ( { validationApi } ) => validationApi );
    let validationErrorMessage = data.preferencesForSettings.map( ( { validationErrorMessage } ) => validationErrorMessage );
    let hide = data.preferencesForSettings.map( ( { hide } ) => hide );
    let visibilityConditions = data.preferencesForSettings.map( ( { visibilityCondition } ) => visibilityCondition );

    soaSvc.post( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
        preferenceNames: preferenceNames,
        includePreferenceDescriptions: true
    } ).then( function( result ) {
        if( result && result.response && result.response.length > 0 ) {
            let i = 0;
            let props = result.response.map( preference => {
                if( hide[ i ] || exports.evaluateCustomConditionToHide( visibilityConditions[ i ] ) === 'false' ) {
                    i++;
                } else {
                    let propertyName = preference.definition.name;
                    let dataType = exports.getDataType( preference.definition.type );
                    let dbValue = preference.values.values ? preference.values.values[ 0 ] : undefined;
                    let displayValuesIn = preference.values.values;
                    if( propertyName === 'AWC_search_filter_wildcard' ) {
                        var wildCards = {
                            0: data.i18n.noWildCard,
                            1: data.i18n.trailingWildCard,
                            2: data.i18n.leadingWildCard,
                            3: data.i18n.bothWildCard
                        };
                        displayValuesIn = [ wildCards[ dbValue ] ];
                    }
                    dataType = exports.setDataTypeForLimitedFilterCategoriesEnabled( propertyName, dataType );
                    let prop = uwPropertyService.createViewModelProperty( propertyName, preferenceDisplayNames[ i ], dataType, dbValue, displayValuesIn );
                    prop = exports.processPreferencesLoadViewModel( data, i, dataType, propertyName, wildCards, prop,
                        preferenceCategories, preferenceDescriptions, preferenceValidationApi, validationErrorMessage );

                    prop.propApi.fireValueChangeEvent = exports.addToChangedPreferences( prop );
                    ++i;
                    originalPrefValues[ prop.propertyName ] = prop.dbValue;
                    return prop;
                }
            } );
            appCtxService.updatePartialCtx( 'searchSettings.searchPreferencesForSettings', props );
            appCtxService.updatePartialCtx( 'searchSettings.originalPrefValues', originalPrefValues );
        }
    } );
};

/**
 * processPreferencesLoadViewModel
 * Helper for LoadView Model
 * @function processPreferencesLoadViewModel
 * @param {Object}data - data
 * @param {INTEGER}i - Iterator
 * @param {Object}dataType - the date type
 * @param {Object}propertyName - the property name
 * @param {Object}wildCards - Wild cards
 * @param {ViewModelProperty}prop - the view model property
 * @param {Object}preferenceCategories - Preference categories
 * @param {Object}preferenceDescriptions - Preference descriptions
 * @param {Object}preferenceValidationApi - Preference Validation API
 * @param {Object}validationErrorMessage - Validation Error Message
 * @returns {ViewModelProperty} prop
 */
export let processPreferencesLoadViewModel = function( data, i, dataType, propertyName, wildCards, prop,
    preferenceCategories, preferenceDescriptions, preferenceValidationApi, validationErrorMessage ) {
    if( dataType === 'BOOLEAN' ) {
        prop.hint = 'checkbox';
        prop.propertyLabelDisplay = 'PROPERTY_LABEL_AT_RIGHT';
    }
    prop.isEditable = true;
    prop.isEnabled = true;
    prop.category = preferenceCategories[ i ];
    prop.description = preferenceDescriptions[ i ];
    if( propertyName === 'AWC_search_filter_wildcard' ) {
        exports.createWildCardProperty( wildCards, prop );
    }
    if( propertyName === 'AWC_select_firstobject_inSearchLocation' ) {
        prop.propertyRadioFalseText = data.i18n.showChart;
        prop.propertyRadioTrueText = data.i18n.showSummary;
        prop.propertyLabelDisplay = 'PROPERTY_LABEL_AT_TOP';
        prop.hint = 'radiobutton';
    }
    if( propertyName === 'AW_DisableTypeAheadFacetSearch' ) {
        prop.propertyRadioFalseText = data.i18n.automaticSearch;
        prop.propertyRadioTrueText = data.i18n.manualSearch;
        prop.propertyLabelDisplay = 'PROPERTY_LABEL_AT_TOP';
        prop.hint = 'radiobutton';
    }
    if( propertyName === 'AWC_Limited_Filter_Categories_Enabled' ) {
        appCtxService.updatePartialCtx( 'searchSettings.AWC_Limited_Filter_Categories_Enabled', prop.dbValue );
    }
    if( propertyName === 'AWC_Limited_Filter_Categories_Expanded' ) {
        prop.resetEnabled = true;
        exports.createFiltersExpandedList( prop, false );
    }

    if( propertyName === 'AWC_Search_Filter_Values_Sort_Order' ) {
        prop.propertyRadioFalseText = data.i18n.byIndex;
        prop.propertyRadioTrueText = data.i18n.byCount;
        prop.hint = 'radiobutton';
        prop.propertyLabelDisplay = 'PROPERTY_LABEL_AT_TOP';
    }
    prop.propApi = {};
    if( preferenceValidationApi[ i ] ) {
        prop.propApi.validationApi = exports[ preferenceValidationApi[ i ] ];
        prop.validationErrorMessage = validationErrorMessage[ i ] === undefined ? data.i18n.validateErrorMessageForIncorrectPreference : validationErrorMessage[ i ];
    }
    return prop;
};

/**
 * setMaxAttributeIndex
 * @function setMaxAttributeIndex
 * @param {Object} propertyName - property name
 * @param {Object} dataType - dataType
 * @returns {Object} dataType - dataType
 */
export let setDataTypeForLimitedFilterCategoriesEnabled = function( propertyName, dataType ) {
    if( propertyName === 'AWC_Limited_Filter_Categories_Enabled' ) {
        dataType = 'BOOLEAN';
    }

    return dataType;
};

export let resetFiltersExpanded = function() {
    let settings = appCtxService.ctx.searchSettings.searchPreferencesForSettings;
    let prop = null;
    if( settings ) {
        prop = _.find( settings, { propertyName: 'AWC_Limited_Filter_Categories_Expanded' } );
        exports.getFiltersExpanded( prop, true );
        exports.doAddToChangedPreferences( prop );
    }
};

/**
 * getFiltersExpanded
 * @function getFiltersExpanded
 * @param {ViewModelProperty}prop - the view model property
 * @param {BOOLEAN}isDefault - true if getting default/site
 */
export let getFiltersExpanded = function( prop, isDefault ) {
    let filterListStringArray = isDefault ? appCtxService.ctx.searchSettings.default : appCtxService.ctx.searchSettings.custom;
    let filterExpandedListInUse = [];
    _.forEach( filterListStringArray, function( prop ) {
        let property = JSON.parse( prop );
        filterExpandedListInUse.push( property );
    } );
    //hardcode type and category
    let categoryExists = _.find( filterExpandedListInUse, { internalName: CATEGORIZATION } );
    if( !categoryExists ) {
        filterExpandedListInUse.push( {
            internalName: CATEGORIZATION,
            displayName: _CATEGORY,
            selected: 'true'
        } );
    } else {
        _.map( filterExpandedListInUse, function( prop ) {
            if( prop.internalName === CATEGORIZATION && prop.selected !== 'true' ) {
                prop.selected = 'true';
            }
        } );
    }
    let typeExists = _.find( filterExpandedListInUse, { internalName: OBJECT_TYPE } );
    if( !typeExists ) {
        filterExpandedListInUse.push( {
            internalName: OBJECT_TYPE,
            displayName: _TYPE,
            selected: 'true'
        } );
    } else {
        _.map( filterExpandedListInUse, function( prop ) {
            if( prop.internalName === OBJECT_TYPE && prop.selected !== 'true' ) {
                prop.selected = 'true';
            }
        } );
    }
    appCtxService.ctx.searchSettings.filterExpandedListInUse = filterExpandedListInUse;
    let filtersSelected = _.filter( filterExpandedListInUse, function( o ) { return o.selected === 'true'; } );
    if( !isDefault ) {
        //this is the original custom SELECTED filters
        appCtxService.ctx.searchSettings.filtersSelected = filtersSelected;
    }

    var db = [];
    var display = [];
    var disabled = [];
    let displayValStr = '';
    if( filtersSelected && filtersSelected.length > 0 ) {
        filtersSelected.forEach( function( val ) {
            db.push( val.internalName );
            display.push( val.displayName );
            disabled.push( val.internalName === CATEGORIZATION || val.internalName === OBJECT_TYPE );
            val.disabled = val.internalName === CATEGORIZATION || val.internalName === OBJECT_TYPE;
            displayValStr += displayValStr === '' ? '' : ', ';
            displayValStr += val.displayName;
        } );
    }

    prop.dbValue = db;
    prop.uiValues = display;
    prop.displayValues = display;
    prop.uiValue = displayValStr;
};

/**
 * createFiltersExpandedList
 * @function createFiltersExpandedList
 * @param {ViewModelProperty}prop - the view model property
 * @param {BOOLEAN}isDefault - true if getting default/site
 */
export let createFiltersExpandedList = function( prop, isDefault ) {
    exports.getFiltersExpanded( prop, isDefault );
    prop.isArray = true;
    prop.lovApi = {};
    prop.lovApi.getInitialValues = function( filterStr, deferred ) {
        var lovEntries = [];
        _.forEach( appCtxService.ctx.searchSettings.filterExpandedListInUse, function( entry ) {
            let lovEntry = {
                propDisplayValue: entry.displayName,
                propInternalValue: entry.internalName,
                propDisplayDescription: '',
                hasChildren: false,
                children: {},
                sel: entry.selected === 'true',
                disabled: entry.disabled
            };
            lovEntries.push( lovEntry );
        } );
        return deferred.resolve( lovEntries );
    };

    prop.lovApi.getNextValues = function( deferred ) {
        deferred.resolve( null );
    };
    prop.lovApi.validateLOVValueSelections = function( lovEntries ) { // eslint-disable-line no-unused-vars
        // Either return a promise or don't return anything. In this case, we don't want to return anything
    };
    prop.hasLov = true;
    prop.isSelectOnly = true;
    prop.emptyLOVEntry = false;
};
/**
 * createWildCardProperty
 * @function createWildCardProperty
 * @param {OBJECT}wildCards - wildcards
 * @param {ViewModelProperty}prop - the view model property
 */
export let createWildCardProperty = function( wildCards, prop ) {
    prop.lovApi = {};
    //special processing for AWC_search_filter_wildcard
    prop.lovApi.getInitialValues = function( filterStr, deferred ) {
        let noWildCard = {
            propDisplayValue: wildCards[ '0' ],
            propInternalValue: '0',
            propDisplayDescription: '',
            hasChildren: false,
            children: {},
            sel: prop.dbValue === '0'
        };
        let trailingWildCard = {
            propDisplayValue: wildCards[ '1' ],
            propInternalValue: '1',
            propDisplayDescription: '',
            hasChildren: false,
            children: {},
            sel: prop.dbValue === '1'
        };
        let leadingWildCard = {
            propDisplayValue: wildCards[ '2' ],
            propInternalValue: '2',
            propDisplayDescription: '',
            hasChildren: false,
            children: {},
            sel: prop.dbValue === '2'
        };
        let bothWildCard = {
            propDisplayValue: wildCards[ '3' ],
            propInternalValue: '3',
            propDisplayDescription: '',
            hasChildren: false,
            children: {},
            sel: prop.dbValue === '3'
        };
        var lovEntries = [];
        lovEntries.push( noWildCard );
        lovEntries.push( trailingWildCard );
        lovEntries.push( leadingWildCard );
        lovEntries.push( bothWildCard );
        return deferred.resolve( lovEntries );
    };

    prop.lovApi.getNextValues = function( deferred ) {
        deferred.resolve( null );
    };

    prop.lovApi.validateLOVValueSelections = function( lovEntries ) { // eslint-disable-line no-unused-vars
        // Either return a promise or don't return anything. In this case, we don't want to return anything
    };
    prop.hasLov = true;
    prop.isSelectOnly = true;
    prop.emptyLOVEntry = false;
};

/**
 * refreshSettings
 * @function refreshSettings
 */
export let refreshSettings = function() {
    //search settings panel can be launched on any Search sublocations,
    //but the existing settings are really about fulltext search, so we only reload when it's fulltext.
    //We can remove the if statement when this is no longer true.
    if ( appCtxService.ctx.sublocation.clientScopeURI === 'Awp0SearchResults' ) {
        AwStateService.instance.go( '.', AwStateService.instance.params, { reload: true } );
    }
};

/**
 * saveSettings
 * @function saveSettings
 */
export let saveSettings = function() {
    let preferenceInput = [];
    var keys = Object.keys( appCtxService.ctx.searchSettings.changedPreferenceValues );
    _.forEach( keys, function( propertyName ) {
        let eachProp = appCtxService.ctx.searchSettings.changedPreferenceValues[ propertyName ];
        if( eachProp.isArray && eachProp.dbValue && eachProp.dbValue.length > 1 ) {
            appCtxService.ctx.preferences[ eachProp.propertyName ] = eachProp.dbValue;
            preferenceInput.push( {
                preferenceName: eachProp.propertyName,
                values: eachProp.dbValue
            } );
        } else {
            appCtxService.ctx.preferences[ eachProp.propertyName ] = [ eachProp.dbValue || eachProp.dbValue === false || eachProp.dbValue === 0 ? eachProp.dbValue.toString() : '' ];
            let dbValueString = eachProp.dbValue || eachProp.dbValue === false || eachProp.dbValue === 0 ? eachProp.dbValue.toString() : '';
            dbValueString = exports.handleFirstObjectSelectionPreference( eachProp, dbValueString );
            preferenceInput.push( {
                preferenceName: eachProp.propertyName,
                values: [ dbValueString ]
            } );
        }
    } );
    soaSvc.post( 'Administration-2012-09-PreferenceManagement', 'setPreferences2', { preferenceInput: preferenceInput } ).then( function() {
        _.forEach( keys, function( propertyName ) {
            let eachProp = appCtxService.ctx.searchSettings.changedPreferenceValues[ propertyName ];
            appCtxService.ctx.searchSettings.originalPrefValues[ eachProp.propertyName ] = eachProp.dbValue;
            _.forEach( appCtxService.ctx.searchSettings.searchPreferencesForSettings, function( prop ) {
                if( prop && prop.propertyName === eachProp.propertyName ) {
                    prop = eachProp;
                }
            } );
        } );
        exports.refreshSettings();
    }, function( reason ) {
        console.error( reason );
    } );
};

/**
 * this function is to handle AWC_select_firstobject_inSearchLocation preference which is a logical preference but has to have values as "TRUE"/"FALSE" because of how it was initially introduced.
 * Also updates ctx.preferences with the upper case value as per requirement( because startup preferences does not refresh unless session is refreshed )
 * @param prop - view model property
 * @param dbValueString - string value of dbValue
 * @returns dbValueString - converts the passed in value to upper case always
 */
export let handleFirstObjectSelectionPreference = function( prop, dbValueString ) {
    if( prop && prop.propertyName === 'AWC_select_firstobject_inSearchLocation' ) {
        dbValueString = dbValueString.toUpperCase();
        appCtxService.ctx.preferences[ prop.propertyName ] = [ dbValueString ];
    }
    return dbValueString;
};

/**
 * evaluate custom conditions added in the view model
 * @function evaluateCustomConditionToHide
 * @param {String}visibilityConditions - string containing the key returned from the server to evaluate the visibility against.
 */

export let evaluateCustomConditionToHide = function( visibilityCondition ) {
    if( visibilityCondition ) {
        let searchSettingsCtx = appCtxService.getCtx( 'searchSettings' );
        if( searchSettingsCtx && searchSettingsCtx[ visibilityCondition ] && searchSettingsCtx[ visibilityCondition ][ 0 ] === 'false' ) {
            return 'false';
        }
    }
    return 'true';
};

/**
 * method to clear searchSettings ctx before making getSearchSettings SOA
 * this is done to avoid loading the panel before SOA is called
 * @function clearSearchSettingsCtx
 */
export let clearSearchSettingsCtx = function() {
    let searchSettingsCtx = appCtxService.getCtx( 'searchSettings' );
    if( searchSettingsCtx ) {
        appCtxService.updateCtx( 'searchSettings', undefined );
    }
};

var loadConfiguration = function() {
    localeService.getTextPromise( 'SearchMessages', true ).then(
        function( localTextBundle ) {
            _TYPE = localTextBundle.object_type;
            _CATEGORY = localTextBundle.categoryOfCategorization;
        } );
};
loadConfiguration();

const exports = {
    getDataType,
    validate_AW_TypeAheadFacetSearch_Delay,
    doAddToChangedPreferences,
    addToChangedPreferences,
    deleteChangedPreferenceValues,
    loadViewModel,
    createFiltersExpandedList,
    getFiltersExpanded,
    resetFiltersExpanded,
    createWildCardProperty,
    refreshSettings,
    saveSettings,
    evaluateCustomConditionToHide,
    clearSearchSettingsCtx,
    processAddToChangedPreferences,
    processPreferencesLoadViewModel,
    setDataTypeForLimitedFilterCategoriesEnabled,
    handleFirstObjectSelectionPreference
};

export default exports;

/**
 * @memberof NgServices
 * @member searchSettingsService
 */
app.factory( 'searchSettingsService', () => exports );
