// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/nonIndexedSearchService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import advancedSearchLovService from 'js/advancedSearchLovService';
import clientDataModel from 'soa/kernel/clientDataModel';
import viewModelObjectService from 'js/viewModelObjectService';
import dateTimeSvc from 'js/dateTimeService';
import localeSvc from 'js/localeService';
import occmgmtUtils from 'js/occmgmtUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import _dateTimeSvc from 'js/dateTimeService';
import tcSessionData from 'js/TcSessionData';

var exports = {};

var setSearchScopeUid = function( data ) {
    data.searchScopeUid = data.searchScope.dbValue ? appCtxSvc.ctx[ data.navigateContext.dbValue ].selectedModelObjects[ 0 ].uid : '';
};

var getRealProperties = function( modelObject ) {
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
                        if( attributeIndex > parseInt( maxAttributeIndex, 10 ) ) {
                            maxAttributeIndex = attributeIndex;
                        }
                        var attributeName = attributeNameOriginal.substring( indexOf_ + 1 );
                        prop.propName = attributeName;
                        propsInterested[ attributeIndex ] = prop;
                    }
                } catch ( e ) {
                    //not an attribute interested in, e.g., an attribute inherited from the parent which is not a query clause
                }
            }
        }
    } );
    //return the props in ordered list
    for( var i = 0; i <= maxAttributeIndex; i++ ) {
        var prop = propsInterested[ i ];
        if( prop ) {
            propsInterestedOrdered[ prop.propName ] = prop;
        }
    }
    return propsInterestedOrdered;
};

var setSearchCriteriaMap = function( data ) {
    data.searchCriteria.uiValue = '';
    data.searchInputMap = {};
    data.searchString = '';
    _.forEach( data.awb0ContextQueryAttributes, function( prop ) {
        var propName = prop.propertyName;
        var propDisplayName = prop.propertyDisplayName;
        if( propName && propName.trim() && propDisplayName && propDisplayName.trim() ) {
            if( prop.dbValue || prop.type === 'BOOLEAN' && prop.dbValue !== null ) {
                var value = null;
                if( prop.type === 'DATE' ) {
                    var date = new Date( prop.dbValue );
                    if( date && date.getTime() ) {
                        value = dateTimeSvc.formatSessionDateTime( date );
                    }
                } else if( prop.type === 'BOOLEAN' ) {
                    value = prop.dbValue.toString();
                } else {
                    value = prop.dbValue;
                }

                if( value ) {
                    if( prop.type === 'BOOLEAN' ) {
                        data.searchInputMap[ propName ] = value;
                    } else if( value.length > 0 ) {
                        data.searchInputMap[ propName ] = prop.uiValue ? prop.uiValue : prop.dbValue;
                    }
                }
            }
        }
    } );
};

var resetNavigationPanel = function( data ) {
    data.showKeywordLabel = false;
    data.savedQueryUID = '';
    data.searchCriteria.dbValue = '';
    data.searchStringIndexed.dbValue = '';
    data.useAlternateConfig = 'true';
    data.searchInputMap = {};
    appCtxSvc.ctx[ data.navigateContext.dbValue ].showLiveSearchResultCommand = false;
    var searchScopeObject = '';
    if( appCtxSvc.ctx[ data.navigateContext.dbValue ].selectedModelObjects && appCtxSvc.ctx[ data.navigateContext.dbValue ].selectedModelObjects.length > 0 ) {
        searchScopeObject = appCtxSvc.ctx[ data.navigateContext.dbValue ].selectedModelObjects[ 0 ].props.object_string.dbValues[ 0 ];
    }

    data.searchScope.propertyDisplayName = data.i18n.searchScopeText.replace( '{0}', searchScopeObject );
    _.forEach( data.awb0ContextQueryAttributes, function( prop ) {
        prop.dbValue = prop.dbOriginalValue !== undefined ? prop.dbOriginalValue : '';
        if( prop.type !== 'DATE' ) {
            prop.uiValue = prop.dbOriginalValue !== undefined ? prop.dbOriginalValue : '';
        } else {
            prop.dateApi.dateValue = '';
            prop.dateApi.timeValue = '';
        }
    } );
    //Reset Result Panel
    if( data.dataProviders && data.dataProviders.icsPerformSearch ) {
        data.dataProviders.icsPerformSearch.viewModelCollection.clear();
        data.dataProviders.icsPerformSearch.selectedObjects = [];
        data.searchResults = undefined;
        data.searchKeywordLabel.uiValue = '';
        data.totalFound = 0;
        data.totalLoaded = 0;
    }
    appCtxSvc.registerCtx( 'searchIncontextInfo', {} );
    data.searchScopeUid = '';
    if( data.filterKeywordLabel ) {
        data.searchString = '$DefaultSearchProvider_STD$*';
        data.categories = [];
        eventBus.publish( 'navigate.fetchInitialFilters' );
    }
};

export let preProcessAndPerformQuickSearch = function( data ) {
    if( data.searchCriteria.dbValue ) {
        _.forEach( data.awb0ContextQueryAttributes, function( prop ) {
            prop.dbValue = data.searchCriteria.dbValue;
        } );
        setSearchCriteriaMap( data );
        data.nonIndexedKeyword = data.searchCriteria.dbValue;
        setSearchScopeUid( data );
        eventBus.publish( 'launchResultsPanelAndSearch' );
    }
};
export let resetPanelAndHideShowTabsBasedOnQueryCriteria = function( data ) {
    resetNavigationPanel( data );

    if( data.awb0ContextQuery.uiValue === data.i18n.keyword ) {
        data.tabsModel.dbValues[ 0 ].visibleWhen = 'false';
        var context = appCtxSvc.ctx[ data.navigateContext.dbValue ];
        if( context.supportedFeatures.Awb0EnableFilterInFullTextSearchFeature || context.supportedFeaturesInWC && context.supportedFeaturesInWC.Awb0EnableFilterInFullTextSearchFeature ||
            context.supportedFeatures.Awb0UnifiedFindInStructure && context.productContextInfo.props.awb0AlternateConfiguration.dbValues[ 0 ] !== '' &&
            context.productContextInfo.props.fgf0PartitionScheme.dbValues.isNulls === 'undefined' ) {
            data.tabsModel.dbValues[ 2 ].visibleWhen = 'true';
            data.hideFilterTab = 'true';
            data.tabsModel.dbValues[ 2 ].displayTab = 'true';
        } else {
            data.tabsModel.dbValues[ 2 ].visibleWhen = 'false';
            data.hideFilterTab = 'false';
        }
    } else {
        var tabContext = {
            tabKey: 'Input'
        };
        data.tabsModel.dbValues[ 0 ].visibleWhen = 'true';
        data.tabsModel.dbValues[ 2 ].visibleWhen = 'false';
        data.hideFilterTab = 'false';
        eventBus.publish( 'awTab.setSelected', tabContext );
        eventBus.publish( 'navigate.getSelectedQueryCriteria' );
    }
};
/**
 * The function will populate data provider from response.
 *
 * @param {Object} data - panel data
 */
export let populateContextQueries = function( data ) {
    var search_criteria = [];
    //Add the additional Keyword vmo in dataProvider list
    search_criteria.push( data.awb0ContextQuery.dbValue );
    getSearchCriteriasVMOs( data, search_criteria );
    data.contextQueries = search_criteria;
    data.countOfContextQueries = search_criteria.length;
};

/**
 * The function will add the keyword vmo to input data.
 *
 * @param {Object} data - input data
 * @returns {Object} modified data
 */
export let addKeywordContext = function( data ) {
    localeSvc.getLocalizedText( 'OccurrenceManagementConstants', 'keyword' ).then( function( keywordsText ) {
        var keywordVMO = viewModelObjectService.constructViewModelObjectFromModelObject( null, 'EDIT' );

        keywordVMO.cellHeader1 = keywordsText;
        var temp = {
            uiValue: keywordsText
        };
        keywordVMO.props.object_string = temp;
        keywordVMO.propertyDisplayName = keywordsText;
        if( !data.searchResults ) {
            data.searchResults = [];
        }
        data.searchResults.push( keywordVMO );
        return data.searchResults;
    } );

    return data.searchResults;
};

/**
 * The function will create the keyword vmo.
 *
 * @param {Object} data - panel data
 */
export let updateKeywordContext = function( data ) {
    localeSvc.getLocalizedText( 'OccurrenceManagementConstants', 'keyword' ).then(
        function( keywordsText ) {
            var keywordVMO = viewModelObjectService.constructViewModelObjectFromModelObject( null, 'EDIT' );
            keywordVMO.cellHeader1 = keywordsText;
            var temp = { uiValue: keywordsText };
            keywordVMO.props.object_string = temp;
            keywordVMO.propertyDisplayName = keywordsText;
            data.awb0ContextQuery.dbValue = keywordVMO;
            data.awb0ContextQuery.propertyDisplayName = keywordsText;
        } );
    exports.resetPanelAndHideShowTabsBasedOnQueryCriteria( data );
};

/**
 * The function will create the vmo's for popup list.
 *
 * @param {Object} data - panel data
 * @param {Object} search_criteria - list of search criteria to be populated
 *
 * @return {object} Array of the unique projects
 */
var getSearchCriteriasVMOs = function( data, search_criteria ) {
    var criteriaList = data.contextQueries;
    if ( criteriaList ) {
        for( var i = 0, len = criteriaList.length; i < len; ++i ) {
            var savedQueryViewModelObj = viewModelObjectService.constructViewModelObjectFromModelObject(
                criteriaList[ i ], 'EDIT' );
            search_criteria.push( savedQueryViewModelObj );
        }
    }
    return search_criteria;
};

export let preProcessAndPerformNonIndexedSearch = function( data ) {
    var validSearchString = false;
    _.forEach( data.awb0ContextQueryAttributes, function( prop ) {
        if( prop.dbValue || prop.type === 'BOOLEAN' && prop.dbValue !== null ) {
            if( prop.type === 'DATE' && prop.dbValue > 0 ) {
                validSearchString = true;
                return false;
            } else if( prop.type !== 'DATE' ) {
                validSearchString = true;
                return false;
            }
        }
    } );
    if( validSearchString ) {
        setSearchCriteriaMap( data );
        data.nonIndexedKeyword = '';
        for( var searchParam in data.searchInputMap ) {
            data.nonIndexedKeyword = data.nonIndexedKeyword + searchParam + ' = ' + data.searchInputMap[ searchParam ] + '\n';
        }
        setSearchScopeUid( data );
        eventBus.publish( 'launchResultsPanelAndSearch' );
    }
};

export let prepareDPForPagination = function( data ) {
    var vmc = data.dataProviders.icsPerformSearch.viewModelCollection;
    var appContext = appCtxSvc.ctx.aceActiveContext.context;
    //searchFilterCategories is empty in case of saved query search AND search on non-indexed product
    if( data.searchFilterCategories && data.searchFilterCategories.length === 0 ) {
        //New find design on AW Server is implemented for Product/Session/Workset. The old path is
        //executed for Saved Bookmark irrespective of if the SWC contains discovey/aceindexed/non-indexed
        //products.
        if ( appContext.topElement.type === 'Awb0SavedBookmark' || !isTCVersion141OrLater() ) {
            vmc.totalFound = vmc.totalFound === 40 ? vmc.totalObjectsLoaded + 1 : vmc.totalObjectsLoaded;
        }
    }
};

/**
 * clearAllQueryCriteriaInContextSearch
 * @function clearAllQueryCriteriaInContextSearch
 * @param {Object}data - the view model data
 */
export let clearAllQueryCriteriaInContextSearch = function( data ) {
    _.forEach( data.awb0ContextQueryAttributes, function( prop ) {
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
                    prop.dbValue = '';
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

export let updateContextQuerySearchAttributes = function( data ) {
    var modelObject = clientDataModel.getObject( data.advancedQueryCriteriaUid );
    var modelObjectForDisplay = {
        uid: data.awb0ContextQuery.dbValue.uid,
        props: getRealProperties( modelObject ),
        type: 'ImanQuery',
        modelType: modelObject.modelType
    };
    var savedQueryViewModelObj = viewModelObjectService.constructViewModelObjectFromModelObject(
        modelObjectForDisplay, 'Search' );
    _.forEach( savedQueryViewModelObj.props, function( prop ) {
        if( prop.lovApi ) {
            advancedSearchLovService.initNativeCellLovApi( prop, null, 'Search', savedQueryViewModelObj );
        }
        if( prop.type === 'BOOLEAN' ) {
            prop.propertyLabelDisplay = 'NO_PROPERTY_LABEL';
            prop.hint = 'triState';
        }
    } );
    data.awb0ContextQueryAttributes = savedQueryViewModelObj.props;
    data.searchCriteria.dbValue = '';
    data.isQueryAttributeMoreThanOne = Object.keys( data.awb0ContextQueryAttributes ).length > 1;
};

/**
 * Get the correct provider name based on tc version.
 *
 * @param {Object} providerName - The input 'provider name'
 * @returns {Object} The 'provider name' based on tc version
 */
 export let getProviderName = function( providerName ) {
    var prefix = occmgmtUtils.isMinimumTCVersion( 14, 0 ) ? 'Fnd0' : 'Awb0';
    return prefix + providerName;
};

/**
 * Get the correct search criteria based on tc version.
 *
 * @returns {Object} The 'searchCriteria' based on tc version
 */
 export let getSearchCriteria = function( ) {
    var searchCriteria = {
        searchContentType: 'ImanQuery',
        searchProperty: 'object_name'
    };
    if( occmgmtUtils.isMinimumTCVersion( 14, 0 ) ) {
        searchCriteria.preferenceName = 'AWBSavedQueries';
    }
    return searchCriteria;
};

/*
 * Get the supported TC version for new find redesign
 */
var isTCVersion141OrLater = function() {
    var isVersionSupported = false;
    var tcMajor = tcSessionData.getTCMajorVersion();
    var tcMinor = tcSessionData.getTCMinorVersion();
    // If platform  is 14.1 or greater then return true
    if( tcMajor >= 14 && tcMinor >= 1 || tcMajor >= 15 ) {
        isVersionSupported = true;
    }
    return isVersionSupported;
};

/**
 * nonIndexedSearch service utility
 */

export default exports = {
    preProcessAndPerformQuickSearch,
    prepareDPForPagination,
    resetPanelAndHideShowTabsBasedOnQueryCriteria,
    populateContextQueries,
    addKeywordContext,
    updateKeywordContext,
    preProcessAndPerformNonIndexedSearch,
    clearAllQueryCriteriaInContextSearch,
    updateContextQuerySearchAttributes,
    getProviderName,
    getSearchCriteria
};
app.factory( 'nonIndexedSearchService', () => exports );
