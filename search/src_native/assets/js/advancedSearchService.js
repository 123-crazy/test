// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/advancedSearchService
 */

import app from 'app';
import AwStateService from 'js/awStateService';
import advancedSearchLovService from 'js/advancedSearchLovService';
import advancedSearchUtils from 'js/advancedSearchUtils';
import preferredAdvancedSearchService from 'js/preferredAdvancedSearchService';
import viewModelObjectService from 'js/viewModelObjectService';
import soaService from 'soa/kernel/soaService';
import clientDataModel from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import localeService from 'js/localeService';
import searchCommonUtils from 'js/searchCommonUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import _dateTimeSvc from 'js/dateTimeService';

import 'soa/preferenceService';

/**
 * getRealProperties
 * @function getRealProperties
 * @param {Object}modelObject - modelObject
 * @param {Object}data - the view model data
 * @param {string}searchUid - the quick access query uid
 * @param {string}searchType - the search type
 * @param {Boolean}clearAll - clearAll
 * @return {Object} saved query attributes
 */
export let getRealProperties = function( modelObject, data, searchUid, searchType, clearAll ) {
    var quickSearchAttribute = null;
    if( searchType === 'Quick' ) {
        quickSearchAttribute = advancedSearchUtils.getQuickSearchAttribute( data, searchUid, data.awp0QuickSearchName.displayValues[ 0 ] );
    }

    var propsInterested = {};
    var propsInterestedOrdered = {};
    var maxAttributeIndex = 0;
    _.forEach( modelObject.props, function( prop ) {
        var displayName = prop.propertyDescriptor.displayName;
        if( displayName && displayName.trim() ) {
            var attributeNameOriginal = prop.propertyDescriptor.name;
            var indexOf_ = attributeNameOriginal.indexOf( '_' );
            //if indexOf_<0, it is not an attribute interested in, e.g., an attribute inherited from the parent which is not a query clause
            if( indexOf_ >= 0 ) {
                var attributeIndexStr = attributeNameOriginal.substring( 0, indexOf_ );
                try {
                    var attributeIndex = parseInt( attributeIndexStr, 10 );
                    if( !isNaN( attributeIndex ) ) {
                        maxAttributeIndex = exports.setMaxAttributeIndex( attributeIndex, maxAttributeIndex );
                        var attributeName = attributeNameOriginal.substring( indexOf_ + 1 );
                        if( searchType === 'Quick' ) {
                            exports.processQuickSearch( attributeName, quickSearchAttribute, prop, propsInterestedOrdered );
                        } else {
                            prop.propName = attributeName;
                            //check if LOV
                            prop = exports.checkIfPropertyIsLOV( prop );
                            propsInterested[ attributeIndex ] = prop;
                        }
                    }
                } catch ( e ) {
                    //not an attribute interested in, e.g., an attribute inherited from the parent which is not a query clause
                }
            }
        }
    } );
    //return the props in ordered list
    propsInterestedOrdered = exports.returnPropsInOrderedList( maxAttributeIndex, propsInterested, propsInterestedOrdered, clearAll );

    //Date query critiera attribute should always show time, it doesn't honor Fnd0EnableTimeForDateProperty property constant
    //Since there is no information about timeEnabled from query criteria property descript constant map, add timeEnable=1 to
    //always show time widget in advanced search page.
    _.forEach( propsInterestedOrdered, function( property ) {
        if( property ) {
            var propDesc = property.propertyDescriptor;
            var constantsMap;
            if( propDesc && propDesc.valueType === 2 ) {
                constantsMap = propDesc.constantsMap;
            }
            if ( constantsMap ) {
                if ( _.isUndefined( constantsMap.timeEnabled ) ) {
                    constantsMap.timeEnabled = '1';
                }
            }
        }
    } );
    return propsInterestedOrdered;
};

/**
 * processQuickSearch
 * @function processQuickSearch
 * @param {string} attributeName - the properties of interest
 * @param {string} quickSearchAttribute - the search attribute
 * @param {string} searchType - the search type
 * @param {ViewModelProperty} prop - the model object property
 * @return {Object} the properties of interest sorted
 */
export let processQuickSearch = function( attributeName, quickSearchAttribute, prop, propsInterestedOrdered ) {
    if( quickSearchAttribute === attributeName ) {
        prop.propName = attributeName;
        //check if LOV
        prop = exports.checkIfPropertyIsLOV( prop );
        propsInterestedOrdered[ attributeName ] = prop;
    }
    return propsInterestedOrdered;
};

/**
 * setMaxAttributeIndex
 * @function setMaxAttributeIndex
 * @param {Object} attributeIndex - attribute index
 * @param {Object} maxAttributeIndex - maximum attribute index
 */
export let setMaxAttributeIndex = function( attributeIndex, maxAttributeIndex ) {
    if( attributeIndex > parseInt( maxAttributeIndex, 10 ) ) {
        maxAttributeIndex = attributeIndex;
    }

    return maxAttributeIndex;
};

export let returnPropsInOrderedList = function( maxAttributeIndex, propsInterested, propsInterestedOrdered, clearAll ) {
    for( var i = 0; i <= maxAttributeIndex; i++ ) {
        var prop = propsInterested[ i ];
        if( prop ) {
            if( clearAll ) {
                prop.uiValues = [];
                prop.dbValues = [];
            }
            propsInterestedOrdered[ prop.propName ] = prop;
        }
    }
    return propsInterestedOrdered;
};

export let checkIfPropertyIsLOV = function( prop ) {
    if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 ) {
        prop.propertyDescriptor.anArray = true;
        prop.propertyDescriptor.fieldType = 1;
        prop.propertyDescriptor.maxArraySize = -1;
        if( prop.uiValues.length === 1 && prop.uiValues[ 0 ] === '' ) {
            prop.uiValues = [];
            prop.dbValues = [];
        }
    }
    return prop;
};

/**
 * getViewModelObjectWithSelectedQuery
 * @function getViewModelObjectWithSelectedQuery
 * @param {Object}data - the view model data
 * @param {Object}response - response from SOA getSelectedQueryCriteria
 * @param {Boolean}clearAll - clearAll
 * @returns {Object}savedQueryViewModelObj - the view model object for the saved query
 */
export let getViewModelObjectWithSelectedQuery = function( data, response, clearAll ) {
    var modelObject = clientDataModel.getObject( response.advancedQueryCriteria.uid );

    var modelObjectForDisplay = {
        uid: data.awp0AdvancedQueryName.dbValue,
        props: exports.getRealProperties( modelObject, undefined, undefined, undefined, clearAll ),
        type: 'ImanQuery',
        modelType: modelObject.modelType
    };

    var savedQueryViewModelObj = viewModelObjectService.constructViewModelObjectFromModelObject(
        modelObjectForDisplay, 'Search' );

    var hasProp = false;
    _.forEach( savedQueryViewModelObj.props, function( prop ) {
        hasProp = true;
        if( prop.lovApi ) {
            advancedSearchLovService.initNativeCellLovApi( prop, null, 'Search',
                savedQueryViewModelObj );
            prop.hint = 'checkboxoptionlov';
            prop.suggestMode = true;
            prop.propertyRequiredText = '';
        }
        if( prop.type === 'BOOLEAN' ) {
            prop.propertyLabelDisplay = 'NO_PROPERTY_LABEL';
            prop.hint = 'triState';
            advancedSearchUtils.initTriState( prop );
        }
    } );
    data.awp0AdvancedQueryAttributes = hasProp ? savedQueryViewModelObj.props : undefined;
    if( appCtxService.ctx.sublocation.clientScopeURI === 'Awp0AdvancedSearch' ) {
        appCtxService.updatePartialCtx( 'advancedSearch.awp0AdvancedQueryAttributes', data.awp0AdvancedQueryAttributes );
    } else if( appCtxService.ctx.sublocation.clientScopeURI === 'Awp0SavedSearch' ) {
        appCtxService.updatePartialCtx( 'advancedSavedSearch.awp0AdvancedQueryAttributes', data.awp0AdvancedQueryAttributes );
    }
    return savedQueryViewModelObj;
};

/**
 * updateSearchAttributesWithSelectedQuery
 *
 * @function updateSearchAttributesWithSelectedQuery
 * @param {Object}data - the view model data
 * @param {Object}response - response from SOA getSelectedQueryCriteria
 * @param {string}searchType - the search type
 * @param {Boolean}clearAll - clear all
 */
export let updateSearchAttributesWithSelectedQuery = function( data, response, searchType, clearAll ) {
    var modelObject = clientDataModel.getObject( response.advancedQueryCriteria.uid );
    exports.updateOrClearSearchAttributes( data, modelObject, searchType, clearAll );
};

/**
 * updateOrClearSearchAttributes
 * @function updateOrClearSearchAttributes
 * @param {Object}data - the view model data
 * @param {Object}modelObject - modelObject
 * @param {string}searchType - the search type
 * @param {string}clearAll - clear all
 */
export let updateOrClearSearchAttributes = function( data, modelObject, searchType, clearAll ) {
    var searchUid;
    if( searchType === 'Quick' ) {
        searchUid = data.awp0QuickSearchName.dbValue;
    } else {
        searchUid = data.awp0AdvancedQueryName.dbValue;
    }

    var modelObjectForDisplay = {
        uid: searchUid,
        props: exports.getRealProperties( modelObject, data, searchUid, searchType, clearAll ),
        type: 'ImanQuery',
        modelType: modelObject.modelType
    };

    var savedQueryViewModelObj = viewModelObjectService.constructViewModelObjectFromModelObject(
        modelObjectForDisplay, 'Search' );

    var hasProp = false;
    _.forEach( savedQueryViewModelObj.props, function( prop ) {
        hasProp = true;
        if( prop.lovApi ) {
            advancedSearchLovService.initNativeCellLovApi( prop, null, 'Search',
                savedQueryViewModelObj );
            prop.hint = 'checkboxoptionlov';
            prop.suggestMode = true;
            prop.propertyRequiredText = '';
        }
        if( prop.type === 'BOOLEAN' ) {
            prop.propertyLabelDisplay = 'NO_PROPERTY_LABEL';
            prop.hint = 'triState';
            advancedSearchUtils.initTriState( prop );
        }
    } );

    if( searchType === 'Quick' ) {
        data.awp0QuickQueryAttributes = hasProp ? savedQueryViewModelObj.props : undefined;
        if( appCtxService.ctx.sublocation.clientScopeURI === 'Awp0AdvancedSearch' ) {
            appCtxService.updatePartialCtx( 'advancedSearch.awp0QuickQueryAttributes', data.awp0QuickQueryAttributes );
        }
    } else {
        data.awp0AdvancedQueryAttributes = hasProp ? Object.assign( {}, savedQueryViewModelObj.props ) : undefined;
        if( appCtxService.ctx.sublocation && appCtxService.ctx.sublocation.clientScopeURI && appCtxService.ctx.sublocation.clientScopeURI === 'Awp0AdvancedSearch' ) {
            var advancedSearch = appCtxService.ctx.advancedSearch;
            appCtxService.updatePartialCtx( 'advancedSearch.awp0AdvancedQueryAttributes', data.awp0AdvancedQueryAttributes );
            appCtxService.registerCtx( 'advancedSearch', advancedSearch );
            appCtxService.updatePartialCtx( 'advancedSearch.tagFlagSet', preferredAdvancedSearchService.checkIfTagOptionIsValid( data ) );
            appCtxService.updatePartialCtx( 'advancedSearch.preferredSearches', undefined );
        } else if( appCtxService.ctx.sublocation && appCtxService.ctx.sublocation.clientScopeURI && appCtxService.ctx.sublocation.clientScopeURI === 'Awp0SavedSearch' ) {
            var advancedSavedSearch = appCtxService.ctx.advancedSavedSearch;
            advancedSavedSearch.awp0AdvancedQueryAttributes = data.awp0AdvancedQueryAttributes;
            appCtxService.registerCtx( 'advancedSavedSearch', advancedSavedSearch );
        }
    }
};

/**
 * revealDefaultQuickSearch
 * @function revealDefaultQuickSearch
 * @param {Object}data - the view model data
 */
export let revealDefaultQuickSearch = function( data ) {
    if( data.awp0QuickSearchName !== undefined && data.awp0QuickSearchName.dbValue !== '' ) {
        var request2 = {
            selectedQuery: {
                uid: data.awp0QuickSearchName.dbValue,
                type: 'ImanQuery'
            }
        };

        soaService.post( 'Internal-AWS2-2016-12-AdvancedSearch', 'getSelectedQueryCriteria', request2 ).then(
            function( response2 ) {
                exports.updateSearchAttributesWithSelectedQuery( data, response2, 'Quick', false );
            } );
    }
};

/**
 * updateSearchAttributes
 * @function updateSearchAttributes
 * @param {Object}data - the view model data
 * @param {String}searchType - the search type
 * @returns {Object} void
 */
export let updateSearchAttributes = function( data, searchType ) {
    return function() {
        var searchUid;
        if( searchType === 'Quick' ) {
            searchUid = data.awp0QuickSearchName.dbValue;
            data.awp0QuickSearchName.dbValues = [ data.awp0QuickSearchName.dbValue ];
            data.awp0QuickSearchName.uiValues = [ data.awp0QuickSearchName.uiValue ];
        } else {
            searchUid = data.awp0AdvancedQueryName.dbValue;
        }
        var request2 = {
            selectedQuery: {
                uid: searchUid,
                type: 'ImanQuery'
            }
        };
        if( !searchUid ) {
            delete data.awp0AdvancedQueryAttributes;
            delete data.awp0QuickQueryAttributes;
            return;
        }
        appCtxService.updatePartialCtx( 'advancedSearch.showTagUnTag', false );
        soaService.post( 'Internal-AWS2-2016-12-AdvancedSearch', 'getSelectedQueryCriteria', request2 ).then(
            function( response2 ) {
                exports.updateSearchAttributesWithSelectedQuery( data, response2, searchType, false );
            } ).then( function() {
                appCtxService.updatePartialCtx( 'advancedSearch.showTagUnTag', true );
            } );
    };
};

/**
 * getAdvancedSearchViewModelFromCache
 * @function getAdvancedSearchViewModelFromCache
 * @param {Object}modelObject - modelObject
 * @param {Object}data - the view model data
 */
export let getAdvancedSearchViewModelFromCache = function( modelObject, data ) {
    var viewModelObj = viewModelObjectService.createViewModelObject( modelObject.uid, 'SpecialEdit' );
    viewModelObj.uid = 'AAAAAAAAAAAAAA';

    data.awp0QuickSearchName = viewModelObj.props.awp0QuickSearchName;
    data.awp0QuickSearchName.propertyLabelDisplay = 'NO_PROPERTY_LABEL';
    var localTextBundle1 = localeService.getLoadedText( 'SearchMessages' );
    data.awp0QuickSearchName.propertyRequiredText = localTextBundle1.selectSearchTip;
    advancedSearchLovService.initNativeCellLovApi( data.awp0QuickSearchName, null, 'SpecialEdit',
        viewModelObj );
    data.awp0QuickSearchName.propApi = {};
    data.awp0QuickSearchName.propApi.fireValueChangeEvent = exports.updateSearchAttributes( data, 'Quick' );
    if( data.isAdvancedSearchSupported.dbValue === 0 ) {
        return;
    }
    data.awp0AdvancedQueryName = viewModelObj.props.awp0AdvancedQueryName;
    data.awp0AdvancedQueryName.propertyLabelDisplay = 'NO_PROPERTY_LABEL';
    data.awp0AdvancedQueryName.propertyRequiredText = localTextBundle1.selectSearchTip;
    advancedSearchLovService.initNativeCellLovApi( data.awp0AdvancedQueryName, null, 'SpecialEdit',
        viewModelObj );

    data.awp0AdvancedQueryName.propApi = {};

    data.awp0AdvancedQueryName.propApi.fireValueChangeEvent = exports.updateSearchAttributes( data, 'Advanced' );
};

/**
 * getAdvancedSearchViewModelFromCtx
 *
 * @function getAdvancedSearchViewModelFromCtx
 *
 * @param {Object}data - the view model data
 * @param {Object}cachedAdvancedSearch - cachedAdvancedSearch
 */
export let getAdvancedSearchViewModelFromCtx = function( data, cachedAdvancedSearch ) {
    data.awp0QuickSearchName = cachedAdvancedSearch.awp0QuickSearchName;
    data.isAdvancedSearchSupported = cachedAdvancedSearch.isAdvancedSearchSupported;
    data.searchCriteria = cachedAdvancedSearch.searchCriteria;
    data.awp0QuickQueryAttributes = cachedAdvancedSearch.awp0QuickQueryAttributes;
    data.awp0QuickSearchName.propApi.fireValueChangeEvent = exports.updateSearchAttributes( data, 'Quick' );
    if( data.isAdvancedSearchSupported.dbValue === 0 ) {
        return;
    }

    data.awp0AdvancedQueryName = cachedAdvancedSearch.awp0AdvancedQueryName;
    data.awp0AdvancedQueryAttributes = cachedAdvancedSearch.awp0AdvancedQueryAttributes;
    data.selectedTab = cachedAdvancedSearch.selectedTab;
    data.tabModels = cachedAdvancedSearch.tabModels;

    data.awp0AdvancedQueryName.propApi.fireValueChangeEvent = exports.updateSearchAttributes( data, 'Advanced' );
};

/**
 * getAdvancedSearchViewModelFromServer
 * @function getAdvancedSearchViewModelFromServer
 * @param {Object}data - data
 */
export let getAdvancedSearchViewModelFromServer = function( data ) {
    var request = {};
    soaService.postUnchecked( 'Internal-AWS2-2016-12-AdvancedSearch', 'createAdvancedSearchInput', request )
        .then(
            function( response ) {
                advancedSearchUtils.checkVersionSupported( data, response );
                exports.getAdvancedSearchViewModelFromCache( response.advancedSearchInput, data );
                exports.revealDefaultQuickSearch( data );
                advancedSearchUtils.getUidsForQuickSearch();
                preferredAdvancedSearchService.setPreferredSearchesVisibilityCtx();
                appCtxService
                    .updatePartialCtx( 'advancedSearch.awp0QuickSearchName', data.awp0QuickSearchName );
                appCtxService.updatePartialCtx( 'advancedSearch.awp0AdvancedQueryName',
                    data.awp0AdvancedQueryName );
                appCtxService.updatePartialCtx( 'advancedSearch.selectedTab', data.selectedTab );
                appCtxService.updatePartialCtx( 'advancedSearch.searchCriteria', data.searchCriteria );
                appCtxService.updatePartialCtx( 'advancedSearch.tabModels', data.tabModels );
                appCtxService.updatePartialCtx( 'advancedSearch.isAdvancedSearchSupported',
                    data.isAdvancedSearchSupported );
            } ).then(
            function() {
                if( AwStateService.instance.params.savedQueryName ) {
                    exports.getAdvancedSearchViewModelFromURL( data );
                }
            } );
};

/**
 * getAdvancedSearchViewModel
 * @function getAdvancedSearchViewModel
 * @param {Object}data - the view model data
 */
export let getAdvancedSearchViewModel = function( data ) {
    var cachedAdvancedSearch = appCtxService.getCtx( 'advancedSearch' );

    if( cachedAdvancedSearch ) {
        if( AwStateService.instance.params.pinned === 'true' || cachedAdvancedSearch.awp0QuickSearchName === undefined || cachedAdvancedSearch.awp0AdvancedQueryName === undefined ) {
            exports.getAdvancedSearchViewModelFromServer( data );
            AwStateService.instance.go( '.', {
                pinned: 'false'
            } );
        } else {
            exports.getAdvancedSearchViewModelFromCtx( data, cachedAdvancedSearch );
        }
    } else {
        appCtxService.registerCtx( 'advancedSearch', '{}' );
        exports.getAdvancedSearchViewModelFromServer( data );
    }
};

/**
 * doQuickSearch
 * @function doQuickSearch
 * @param {Object}data - the view model data
 */
export let doQuickSearch = function( data ) {
    var quickCriteria = null;

    _.forEach( data.awp0QuickQueryAttributes, function( prop ) {
        quickCriteria = advancedSearchUtils.getQuickSearchCriteria( prop );
    } );

    if( quickCriteria === undefined || quickCriteria === null ||
        quickCriteria === '' ) {
        return;
    }

    var criteria = {
        queryUID: data.awp0QuickSearchName.dbValue,
        quickSearchAttributeValue: advancedSearchUtils.removeTrailingSpecialCharacterFromCriteria( quickCriteria ),
        searchID: advancedSearchUtils.getSearchId( data.awp0QuickSearchName.dbValue ),
        typeOfSearch: 'QUICK_SEARCH',
        utcOffset: String( -1 * new Date().getTimezoneOffset() ),
        lastEndIndex: '',
        totalObjectsFoundReportedToClient: ''
    };
    advancedSearchUtils.setQuickSearchCriteriaMap( data, criteria );
    var searchContext = appCtxService.getCtx( 'advancedSearch' );
    searchContext.criteria = criteria;
    appCtxService.updatePartialCtx( 'advancedSearch', searchContext );
    eventBus.publish( 'search.doAdvancedSearch', data.searchCriteria.uiValue );
    data.searchType = 'Quick';
    advancedSearchUtils.updateURLForAdvancedSearch( data );
};

/**
 * doAdvancedSearch
 * @function doAdvancedSearch
 * @param {String} data the view model data
 */
export let doAdvancedSearch = function( data, skipSavingContext ) {
    var criteria = {
        queryUID: data.awp0AdvancedQueryName.dbValue,
        searchID: advancedSearchUtils.getSearchId( data.awp0AdvancedQueryName.dbValue ),
        typeOfSearch: 'ADVANCED_SEARCH',
        utcOffset: String( -1 * new Date().getTimezoneOffset() ),
        lastEndIndex: '',
        totalObjectsFoundReportedToClient: ''
    };
    advancedSearchUtils.setAdvancedSearchCriteriaMap( data, criteria, skipSavingContext );
    if ( !skipSavingContext ) {
        var searchContext = appCtxService.getCtx( 'advancedSearch' );
        searchContext.criteria = criteria;
        appCtxService.updatePartialCtx( 'advancedSearch', searchContext );
        eventBus.publish( 'search.doAdvancedSearch', data.searchCriteria.uiValue );
        data.searchType = 'Advanced';
        advancedSearchUtils.updateURLForAdvancedSearch( data );
    } else {
        data.criteria = criteria;
    }
};

/**
 * showData
 * @function showData
 * @param {String}searchCriteria - search criteria
 */
export let showData = function( searchCriteria ) {
    if( searchCriteria ) {
        var searchContext = appCtxService.getCtx( 'advancedSearch' );
        eventBus.publish( 'search.doAdvancedSearch', searchContext.searchCriteria.uiValue );
    }
};


/**
 * clearAllAction
 * @function clearAllAction
 * @param {Object}data - the view model data
 */
export let clearAllAction = function( data ) {
    _.forEach( data.awp0AdvancedQueryAttributes, function( prop ) {
        prop.searchText = '';
        if( prop.type === 'DATE' ) {
            prop.newDisplayValues = [ '' ];
            prop.newValue = _dateTimeSvc.getNullDate();
            prop.dbValue = _dateTimeSvc.getNullDate();
            prop.dateApi.dateObject = null;
            prop.dateApi.dateValue = '';
            prop.dateApi.timeValue = '';
            prop.dbValues = [];
            prop.displayValues = [ '' ];
            prop.uiValue = '';
            prop.uiValues = [ '' ];
            prop.value = 0;
        } else {
            var propName = prop.propertyName;
            var propDisplayName = prop.propertyDisplayName;
            if( propName && propDisplayName && prop.dbValue !== 'undefined' && prop.dbValue !== null ) {
                if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 ) {
                    prop.dbValue = [];
                } else {
                    prop.dbValue = null;
                }
                prop.dbValues = [];
                prop.displayValues = [ '' ];
                prop.uiValue = '';
                prop.uiValues = [ '' ];
                prop.value = null;
            }
        }
    } );
};

/**
 * doAdvancedSavedSearch
 * @function doAdvancedSavedSearch
 * @param {String}targetState - the Advanced Search SubLocation
 * @param {Object}savedQuery  - data for the saved query
 * @param {Object}savedQueryParametersMap - A map containing saved query attributes
 */

export let doAdvancedSavedSearch = function( targetState, searchType, savedQuery, savedQueryParametersMap ) {
    AwStateService.instance.go( targetState ? targetState : '.', {
        savedQueryParameters: advancedSearchUtils.buildURLForAdvancedSavedSearch( savedQueryParametersMap ),
        savedQueryName: savedQuery.uiValues[ 0 ],
        searchType: searchType
    } );
};

/**
 * getAdvancedSearchViewModelFromURL
 * @function getAdvancedSearchViewModelFromURL
 * @param {Object}data - the view model data
 */
export let getAdvancedSearchViewModelFromURL = function( data ) {
    if( AwStateService.instance.params.searchType === 'Quick' ) {
        var savedQueryMap = advancedSearchUtils.getSavedQueryAttributesFromURL( AwStateService.instance.params.savedQueryParameters );
        data.awp0QuickSearchName.dbValue = savedQueryMap.savedQueryNameMap[ 0 ];
        data.awp0QuickSearchName.uiValue = savedQueryMap.savedQueryNameMap[ 1 ];
        data.awp0QuickSearchName.uiValues[ 0 ] = data.awp0QuickSearchName.uiValue;
        data.awp0QuickQueryAttributesPopulated = savedQueryMap.savedQueryAttributesMap;

        delete data.tabModels.dbValues[ 1 ].selectedTab;
        data.selectedTab = data.tabModels.dbValues[ 0 ];
        data.selectedTab.selectedTab = true;
        eventBus.publish( 'awTab.setSelected', data.selectedTab );
        exports.executeQuickSearch( data );
    } else if( AwStateService.instance.params.searchType === 'Advanced' ) {
        savedQueryMap = advancedSearchUtils.getSavedQueryAttributesFromURL( AwStateService.instance.params.savedQueryParameters );
        data.awp0AdvancedQueryAttributesPopulated = savedQueryMap.savedQueryAttributesMap;
        data.awp0AdvancedQueryName.dbValue = savedQueryMap.savedQueryNameMap[ 0 ];
        data.awp0AdvancedQueryName.uiValue = savedQueryMap.savedQueryNameMap[ 1 ];
        data.awp0AdvancedQueryName.uiValues[ 0 ] = data.awp0AdvancedQueryName.uiValue;
        exports.executeAdvancedSavedSearch( data );
    }
};

/**
 * executeQuickSearch
 * @function executeQuickSearch
 * @param {Object}data - the view model data
 */
export let executeQuickSearch = function( data ) {
    if( data.awp0QuickQueryAttributesPopulated ) {
        var request2 = {
            selectedQuery: {
                uid: data.awp0QuickSearchName.dbValue,
                type: 'ImanQuery'
            }
        };
        if( !data.awp0QuickSearchName.dbValue ) {
            delete data.awp0QuickQueryAttributes;
            return;
        }
        soaService.post( 'Internal-AWS2-2016-12-AdvancedSearch', 'getSelectedQueryCriteria', request2 ).then(
            function( response2 ) {
                exports.updateSearchAttributesWithSelectedQuery( data, response2, 'Quick', false );
                exports.doQuickSearch( data );
            } ).then(
            function() {
                data.awp0QuickSearchName.propApi = {};
                data.awp0QuickSearchName.propApi.fireValueChangeEvent = exports.updateSearchAttributes( data, 'Quick' );
            } );
    }
};

/**
 * executeAdvancedSavedSearch
 * @function executeAdvancedSavedSearch
 * @param {Object}data - the view model data
 */
export let executeAdvancedSavedSearch = function( data ) {
    //execute a saved search
    if( data.awp0AdvancedQueryAttributesPopulated ) {
        var request2 = {
            selectedQuery: {
                uid: data.awp0AdvancedQueryName.dbValue,
                type: 'ImanQuery'
            }
        };
        if( !data.awp0AdvancedQueryName.dbValue ) {
            delete data.awp0AdvancedQueryAttributes;
            return;
        }
        soaService.post( 'Internal-AWS2-2016-12-AdvancedSearch', 'getSelectedQueryCriteria', request2 ).then(
            function( response2 ) {
                exports.updateSearchAttributesWithSelectedQuery( data, response2, 'Advanced', true );
                advancedSearchUtils.populateQueryAttributesForSavedSearch( data );
                exports.doAdvancedSearch( data );
            } ).then(
            function() {
                data.awp0AdvancedQueryName.propApi = {};
                data.awp0AdvancedQueryName.propApi.fireValueChangeEvent = exports.updateSearchAttributes( data, 'Advanced' );
                delete data.tabModels.dbValues[ 0 ].selectedTab;
                data.selectedTab = data.tabModels.dbValues[ 1 ];
                data.selectedTab.selectedTab = true;
                eventBus.publish( 'awTab.setSelected', data.selectedTab );
            } );
    }
};

/**
 * getReviewAndExecuteViewModel
 * @function getReviewAndExecuteViewModel
 * @param {Object}data - the view model data
 * @param {Object}response2 - the SOA response which gets the saved query attributes
 */
export let getReviewAndExecuteViewModel = function( data, response2 ) {
    // populate the Review and Execute Panel with Advanced Saved Search Attributes
    var savedQueryViewModelObj = exports.getViewModelObjectWithSelectedQuery( data, response2, true );
    advancedSearchUtils.populateQueryAttributesForSavedSearch( data, savedQueryViewModelObj );
};

/**
 * Get the default page size used for max to load/return.
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    return searchCommonUtils.getDefaultPageSize( defaultPageSizePreference );
};

/**
 * getSearchCriteria
 * @function getSearchCriteria
 * @param {Number}startIndex - startIndex
 * @param {Object}criteria - criteria
 * @return {Object} search criteria
 */
export let getSearchCriteria = function( startIndex, criteria ) {
    if( criteria ) {
        var searchResponseInfo = appCtxService.getCtx( 'searchResponseInfo' );
        if( searchResponseInfo && startIndex > 0 ) {
            //it's a scrolling case
            criteria.totalObjectsFoundReportedToClient = searchResponseInfo.totalFound.toString();
            criteria.lastEndIndex = searchResponseInfo.lastEndIndex.toString();
        } else {
            criteria.totalObjectsFoundReportedToClient = 0;
            criteria.lastEndIndex = 0;
        }
        var searchContext = appCtxService.getCtx( 'advancedSearch' );
        searchContext.criteria = criteria;
        appCtxService.updatePartialCtx( 'advancedSearch', searchContext );
    }
    return criteria;
};

/**
 * Return the cursor end index value
 * @param {Object} data Data
 * @returns {Integer} end index value
 */
 export let getCursorStartIndexValue = function( data ) {
    if( data.cursorObject ) {
        var endValue = data.cursorObject.endIndex;
        if( endValue ) {
            return ++endValue;
        }
    }
    return 0;
};

const exports = {
    getRealProperties,
    getViewModelObjectWithSelectedQuery,
    updateSearchAttributesWithSelectedQuery,
    updateOrClearSearchAttributes,
    revealDefaultQuickSearch,
    updateSearchAttributes,
    getAdvancedSearchViewModelFromCache,
    getAdvancedSearchViewModelFromCtx,
    getAdvancedSearchViewModelFromServer,
    getAdvancedSearchViewModel,
    doQuickSearch,
    doAdvancedSearch,
    showData,
    clearAllAction,
    doAdvancedSavedSearch,
    getAdvancedSearchViewModelFromURL,
    executeQuickSearch,
    executeAdvancedSavedSearch,
    getReviewAndExecuteViewModel,
    getDefaultPageSize,
    getSearchCriteria,
    checkIfPropertyIsLOV,
    returnPropsInOrderedList,
    processQuickSearch,
    setMaxAttributeIndex,
    getCursorStartIndexValue
};

export default exports;

/**
 * @memberof NgServices
 * @member advancedSearchService
 */
app.factory( 'advancedSearchService', () => exports );
