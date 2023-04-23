/* eslint-disable max-lines */
// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/searchFolderService
 */

import app from 'app';
import viewModelObjectService from 'js/viewModelObjectService';
import clientDataModel from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'soa/preferenceService';
import advancedSearchUtils from 'js/advancedSearchUtils';
import advancedSearchSvc from 'js/advancedSearchService';
import soaService from 'soa/kernel/soaService';
import logger from 'js/logger';
import uwPropertyService from 'js/uwPropertyService';
import preferredAdvancedSearchService from 'js/preferredAdvancedSearchService';
import AwStateService from 'js/awStateService';
import saveSearchUtils from 'js/Awp0SaveSearchUtils';
import searchFilterSvc from 'js/aw.searchFilter.service';
import shapeSearchService from 'js/Awp0ShapeSearchService';
import searchFolderCommonService from 'js/searchFolderCommonService';
import searchCommonUtils from 'js/searchCommonUtils';
import commandPanelService from 'js/commandPanel.service';

var FULLTEXT_PROVIDER = 'Awp0FullTextSearchProvider';
var ADVANCED_PROVIDER = 'Awp0SavedQuerySearchProvider';
var AWP0_SEARCH_FOLDER = 'Awp0SearchFolder';
var SEARCH_FOLDER = 'searchFolder';
var UNKNOWN = 'Unknown';
var CURRENT_RULE = 'currentRule';
var NEW_RULE = 'newRule';
var SAVED_SEARCH = 'savedSearch';
var RULE_CHANGED_EVENT = 'searchFolder.ruleChanged';

/**
 * add folder
 * @function addActiveFolder
 * @param {STRING} parentFolderUID - parent folder uid
 * @param {STRING} searchFolderName - searchFolderName
 * @param {STRING} searchFolderDescription - searchFolderDescription
 */
export let addActiveFolder = function( parentFolderUID, searchFolderName, searchFolderDescription ) {
    searchFolderCommonService.addActiveFolder( parentFolderUID, searchFolderName, searchFolderDescription );
};

/**
 * edit folder
 * @function editActiveFolder
 * @param {STRING} parentFolderUID - parent folder uid
 * @param {STRING} searchFolderUID - searchFolderUID
 * @param {STRING} reportDefinitionUID - reportDefinitionUID
 * @param {Object} searchCriteria - searchCriteria
 */
export let editActiveFolder = function( parentFolderUID, searchFolderUID, reportDefinitionUID, searchCriteria ) {
    searchFolderCommonService.editActiveFolder( parentFolderUID, searchFolderUID, reportDefinitionUID, searchCriteria );
};

export let addObjectToSearchFolder = function( panelContext ) {
    commandPanelService.activateCommandPanel( 'Awp0SearchFolderCreate', 'aw_toolsAndInfo' );
};
/**
 * setCanExecuteSearch
 * @function setCanExecuteSearch
 * @param {*} defaultActiveFolders defaultActiveFolders
 */
export let setCanExecuteSearch = function( defaultActiveFolders ) {
    if( defaultActiveFolders && defaultActiveFolders.length > 0 ) {
        soaService.post( 'Internal-AWS2-2020-05-FullTextSearch', 'getSearchSettings', {
            searchSettingInput: {
                inputSettings: {
                    searchFolderExecution: defaultActiveFolders
                }
            }
        } );
    }
};

/**
 * set Data Provider name for the search( Full Text Search/ Shape Search/ Advanced Search )
 * @function setSearchFolderProvider
 * @param {*} context context
 */
export let setSearchFolderProvider = function( context ) {
    var searchContext = appCtxService.getCtx( 'search' );
    searchContext.searchFolderDataProvider = context;
    appCtxService.updatePartialCtx( 'search', searchContext );
    eventBus.publish( 'searchFolder.revealFilterPanel' );
};

/**
 * get Data Provider name for the search( Full Text Search/ Shape Search/ Advanced Search )
 * @function getSearchFolderDataProviderInt
 * @param {Object}searchFolderCtx - searchFolderCtx
 *
 * @return {Object} data provider
 */
export let getSearchFolderDataProviderInt = function( searchFolderCtx ) {
    if( searchFolderCtx.isShapeSearch ) {
        return 'SS1ShapeSearchDataProvider';
    } else if( searchFolderCtx.awp0SearchType ) {
        return searchFolderCtx.awp0SearchType;
    }
    return FULLTEXT_PROVIDER;
};
/**
 * get searchFolderCtx for the search( Full Text Search/ Shape Search/ Advanced Search )
 * @function getSearchFolderCtx
 * @param {Object}uidFolder - uid of Active Folder
 *
 * @return {Object} data provider
 */
export let getSearchFolderCtx = function( uidFolder ) {
    let searchFolderCtx = appCtxService.getCtx( SEARCH_FOLDER );
    if( !( searchFolderCtx && searchFolderCtx.uid === uidFolder ) ) {
        searchFolderCtx = exports.getSearchFolder( uidFolder );
    }
    return searchFolderCtx;
};

/**
 * get Data Provider name for the search( Full Text Search/ Shape Search/ Advanced Search )
 * @function getSearchFolderDataProvider
 * @param {Object}uidFolder - uid of Active Folder
 *
 * @return {Object} data provider
 */
export let getSearchFolderDataProvider = function( uidFolder ) {
    let searchFolderCtx = exports.getSearchFolderCtx( uidFolder );
    return exports.getSearchFolderDataProviderInt( searchFolderCtx );
};

/**
 * @function getSearchFolderDefinitionIntFulltext_CheckShapeSearch
 * @param {STRING}filter - filter
 * @param {Object}searchFolderCtx - searchFolderCtx
 */
export let getSearchFolderDefinitionIntFulltext_CheckShapeSearch = function( filter, searchFolderCtx ) {
    if( filter === 'ShapeSearchProvider' || filter === 'SS1partShapeFilter' || filter === 'SS1shapeBeginFilter' || filter === 'SS1shapeEndFilter' ) {
        searchFolderCtx.isShapeSearch = true;
    }
};
/**
 * @function getSearchFolderDefinitionIntFulltextStringFilter
 * @param {STRING}filterName - filter name
 * @param {Object}filterValue - filterValue
 * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
 */
export let getSearchFolderDefinitionIntFulltextStringFilter = function( filterName, filterValue, searchFilters ) {
    if( filterValue.stringDisplayValue ) {
        searchFilters.push( filterName + '=' + filterValue.stringDisplayValue );
    } else {
        searchFilters.push( filterName + '=' + filterValue.stringValue );
    }
};

/**
 * @function getSearchFolderDefinitionIntFulltext_ProcessFilterTypes
 * @param {STRING}filterName - filter name
 * @param {Object}filterValue - filterValue
 * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
 */
export let getSearchFolderDefinitionIntFulltext_ProcessFilterTypes = function( filterName, filterValue, searchFilters ) {
    if( filterValue.searchFilterType === 'DateFilter' ) {
        searchFilters.push( filterName + '=' + filterValue.startDateValue + ' - ' + filterValue.endDateValue );
    } else if( filterValue.startEndRange === 'NumericRange' ) {
        searchFilters.push( filterName + '=' + filterValue.startNumericValue + ' - ' + filterValue.endNumericValue );
    } else {
        exports.getSearchFolderDefinitionIntFulltextStringFilter( filterName, filterValue, searchFilters );
    }
};

/**
 * utiltiy function of getSearchFolderDefinitionIntFulltextInt
 * @function getSearchFolderDefinitionIntFulltextInt_setFilterMap
 * @param {Object}filter - filter
 * @param {Object}searchFilterMap - searchFilterMap
 * @param {Object}filterValue - filter value.
 */
export let getSearchFolderDefinitionIntFulltextInt_setFilterMap = function( filter, searchFilterMap, filterValue ) {
    if( !searchFilterMap[ filter ] ) {
        searchFilterMap[ filter ] = [ filterValue ];
    } else {
        searchFilterMap[ filter ].push( filterValue );
    }
};

/**
 *  utility function of get report definition for fulltext
 * @function getSearchFolderDefinitionIntFulltextInt
 * @param {Object}filter - filter
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @param {Object}paramValue - paramValue of report definition
 * @param {Object}searchFilterMap - searchFilterMap
 * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
 */
export let getSearchFolderDefinitionIntFulltextInt = function( filter, searchFolderCtx, paramValue, searchFilterMap, searchFilters ) {
    exports.getSearchFolderDefinitionIntFulltext_CheckShapeSearch( filter, searchFolderCtx );
    var sanitizedFilterValue = paramValue.replace( /^\[+|\]+$/g, '' );
    let filterValue = JSON.parse( sanitizedFilterValue );
    exports.getSearchFolderDefinitionIntFulltextInt_setFilterMap( filter, searchFilterMap, filterValue );
    let filterName = searchFilterSvc.getCategoryDisplayName( filter );
    if( filterName === '' ) {
        filterName = filter;
    }
    exports.getSearchFolderDefinitionIntFulltext_ProcessFilterTypes( filterName, filterValue, searchFilters );
};

/**
 * get report definition for fulltext
 * @function getSearchFolderDefinitionIntFulltext
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @param {Object}params - params of report definition
 * @param {Object}paramValues - paramValues of report definition
 * @param {Object}searchCriteria - searchCriteria
 * @param {Object}searchFilterMap - searchFilterMap
 * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
 */
export let getSearchFolderDefinitionIntFulltext = function( searchFolderCtx, params, paramValues, searchCriteria, searchFilterMap, searchFilters ) {
    let index = 0;
    let updateSearchFolderCtx = false;
    while( index < paramValues.length ) {
        let param = params[ index ];
        if( param === 'ReportSearchCriteria' ) {
            searchCriteria.searchString = paramValues[ index ];
            ++index;
        } else if( param === 'ReportTranslatedSearchCriteria' ) {
            ++index;
        } else if( param === 'DefaultActiveFolder' ) {
            searchFolderCtx.defaultActiveFolder = paramValues[ index ];
            updateSearchFolderCtx = true;
            ++index;
        } else if( param === 'RecentlyModifiedType' ) {
            searchFolderCtx.recentlyModifiedType = paramValues[ index ];
            updateSearchFolderCtx = true;
            ++index;
        } else if( param === 'shapeSearchUID' ) {
            //skip this parameter as it's purely for server side execution of shapesearch. searchCriteria.shapeSearchUID = paramValues[ index ];
            ++index;
        } else if( param === 'searchStringInContent' ) {
            searchCriteria.searchStringInContent = paramValues[ index ];
            ++index;
        } else {
            let filter = paramValues[ index ];
            let paramValue = paramValues[ ++index ];
            exports.getSearchFolderDefinitionIntFulltextInt( filter, searchFolderCtx, paramValue, searchFilterMap, searchFilters );
            ++index;
        }
    }
    if( updateSearchFolderCtx ) {
        appCtxService.updatePartialCtx( 'searchFolder', searchFolderCtx );
    }
};

/**
 * @function deleteAllProps
 * @param {Object}jsonObject - jsonObject
 */
export let deleteAllProps = function( jsonObject ) {
    for( var prop in jsonObject ) {
        if( jsonObject.hasOwnProperty( prop ) ) {
            delete jsonObject[ prop ];
        }
    }
};

/**
 * get report definition for shape search
 * @function getSearchFolderDefinitionIntShapeSearch
 * @param {Object}searchCriteria - searchCriteria
 */
export let getSearchFolderDefinitionIntShapeSearch = function( searchCriteria ) {
    let searchString = searchCriteria.searchString;
    let searchStringInContent = searchCriteria.searchStringInContent;
    exports.deleteAllProps( searchCriteria );
    searchCriteria.searchString = searchString;
    if( searchStringInContent ) {
        searchCriteria.searchStringInContent = searchStringInContent;
    }
};


/**
 * get report definition for advanced
 * @function getSearchFolderDefinitionIntAdvanced
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @param {Object}params - params of report definition
 * @param {Object}paramValues - paramValues of report definition
 * @param {Object}searchCriteria - searchCriteria
 * @param {Object}searchCriteriaAdvPopulated - adv search attributes that actually have values
 * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
 */
export let getSearchFolderDefinitionIntAdvanced = function( searchFolderCtx, params, paramValues, searchCriteria, searchCriteriaAdvPopulated, searchFilters ) {
    let index = 0;
    searchFolderCtx.savedQueryName = searchFolderCtx.props.awp0Rule.uiValues[ 0 ];
    while( index < paramValues.length ) {
        let param = params[ index ];
        if( param === 'ReportSearchCriteria' ) {
            searchCriteria.queryUID = paramValues[ index ];
            searchCriteria.searchID = advancedSearchUtils.getSearchId( searchCriteria.queryUID );
            ++index;
        } else if( param === 'savedQueryName' ) {
            // skip the field as we already got it from the props. searchFolderCtx.savedQueryName = paramValues[ index ];
            ++index;
        } else {
            let paramName = paramValues[ index ];
            let paramValue = paramValues[ ++index ];
            let multiValues = paramValue.split( advancedSearchUtils._delimiterForArray );
            let filterValue = '';
            if( multiValues && multiValues.length > 1 && paramValue.indexOf( searchFolderCommonService.INTERNAL_KEYWORD ) !== -1 ) {
                filterValue = searchFolderCommonService.splitInternalAndDisplayNameUsingInternalKeyword( multiValues, false );
            } else {
                let eachDisplayInternalPair2 = multiValues[ 0 ].split( searchFolderCommonService.INTERNAL_KEYWORD );
                if( eachDisplayInternalPair2 && eachDisplayInternalPair2.length > 1 ) {
                    filterValue += eachDisplayInternalPair2[ 1 ];
                } else {
                    filterValue += paramValue;
                }
            }
            searchCriteria[ paramName ] = filterValue;
            searchCriteriaAdvPopulated[ paramName ] = paramValue;
            searchFolderCtx.savedsearch_attr_names.uiValues.push( paramName );
            searchFolderCtx.savedsearch_attr_names.dbValues.push( paramName );
            searchFolderCtx.savedsearch_attr_values.uiValues.push( paramValue );
            searchFolderCtx.savedsearch_attr_values.dbValues.push( paramValue );
            searchFilters.push( paramName + '=' + paramValue );
            ++index;
        }
    }
};

/**
 * Set Search Folder Ctx
 * @function setSearchFolderCtxForReportDefinition
 *
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @param {Object}searchCriteria - searchCriteria
 * @param {Object}searchFilterMap - searchFilterMap
 * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
 * @param {BOOLEAN}isEditMode - isEditMode
 */
export let setSearchFolderCtxForReportDefinition = function( searchFolderCtx, searchCriteria, searchFilterMap, searchFilters, isEditMode ) {
    searchFolderCtx.searchCriteria = searchCriteria;
    searchFolderCtx.searchFilterMap = searchFilterMap;
    searchFolderCtx.isEditMode = isEditMode;
    searchFolderCtx.searchFilters = searchFilters;
    appCtxService.updateCtx( SEARCH_FOLDER, searchFolderCtx );
};

/**
 *  utility function of get report definition of search folder
 * @function processSearchFolderDefinitionInt_Fulltext
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @param {Object}searchCriteria - searchCriteria
 * @param {Object}params - params of report definition
 * @param {Object}paramValues - paramValues of report definition
 * @param {Object}searchFilterMap - searchFilterMap
 * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
 */
export let processSearchFolderDefinitionInt_Fulltext = function( searchFolderCtx, searchCriteria, params, paramValues, searchFilterMap, searchFilters ) {
    searchCriteria.limitedFilterCategoriesEnabled = 'false';
    searchCriteria.listOfExpandedCategories = '';
    searchCriteria.searchFromLocation = 'global';
    exports.getSearchFolderDefinitionIntFulltext( searchFolderCtx, params, paramValues, searchCriteria, searchFilterMap, searchFilters );
    if( searchFolderCtx.isShapeSearch ) {
        exports.getSearchFolderDefinitionIntShapeSearch( searchCriteria );
    }
};

/**
 *  utility function of get report definition of search folder
 * @function processSearchFolderDefinitionInt_Advanced
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @param {Object}searchCriteria - searchCriteria
 * @param {Object}params - params of report definition
 * @param {Object}paramValues - paramValues of report definition
 * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
 */
export let processSearchFolderDefinitionInt_Advanced = function( searchFolderCtx, searchCriteria, params, paramValues, searchFilters ) {
    searchCriteria.typeOfSearch = 'ADVANCED_SEARCH';
    searchCriteria.utcOffset = String( -1 * new Date().getTimezoneOffset() );
    searchCriteria.lastEndIndex = '';
    searchCriteria.totalObjectsFoundReportedToClient = '';
    let searchCriteriaAdvPopulated = {};
    searchFolderCtx.savedsearch_attr_names = {
        uiValues: [],
        dbValues: []
    };
    searchFolderCtx.savedsearch_attr_values = {
        uiValues: [],
        dbValues: []
    };
    exports.getSearchFolderDefinitionIntAdvanced( searchFolderCtx, params, paramValues, searchCriteria, searchCriteriaAdvPopulated, searchFilters );
    searchFolderCtx.searchCriteriaAdvPopulated = searchCriteriaAdvPopulated;
};

/**
 * utility function of get report definition of search folder
 * @function getSearchFolderDefinitionInt
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @param {Object}searchCriteria - searchCriteria
 * @param {Object}params - params of report definition
 * @param {Object}paramValues - paramValues of report definition
 * @param {Object}searchFilterMap - searchFilterMap
 * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
 */
export let getSearchFolderDefinitionInt = function( searchFolderCtx, searchCriteria, params, paramValues, searchFilterMap, searchFilters ) {
    if( searchFolderCtx.awp0SearchType === FULLTEXT_PROVIDER ) {
        exports.processSearchFolderDefinitionInt_Fulltext( searchFolderCtx, searchCriteria, params, paramValues, searchFilterMap, searchFilters );
    } else {
        exports.processSearchFolderDefinitionInt_Advanced( searchFolderCtx, searchCriteria, params, paramValues, searchFilters );
    }
};

/**
 *  utility function of get report definition of search folder
 * @function getSearchFolderDefinition_procParamValues
 * @param {Object}searchCriteria0 - criteria part of the reportDefinition in active folder
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @param {Object}searchCriteria - searchCriteria
 * @param {Object}searchFilterMap - searchFilterMap
 * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
 */
export let getSearchFolderDefinition_procParamValues = function( searchCriteria0, searchFolderCtx, searchCriteria, searchFilterMap, searchFilters ) {
    let params = searchCriteria0.props.rd_parameters.dbValues;
    let paramValues = searchCriteria0.props.rd_param_values.dbValues;
    if( paramValues && paramValues.length > 0 ) {
        exports.getSearchFolderDefinitionInt( searchFolderCtx, searchCriteria, params, paramValues, searchFilterMap, searchFilters );
    }
};

/**
 * get report definition of search folder
 * @function getSearchFolderDefinition
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @param {BOOLEAN}isEditMode - isEditMode
 */
export let getSearchFolderDefinition = function( searchFolderCtx, isEditMode ) {
    let searchCriteria = {};
    let searchFilterMap = {};
    let searchFilters = [];
    let searchDefinition0Id = searchFolderCtx.props.awp0SearchDefinition.dbValues[ 0 ];
    let searchCriteria0 = clientDataModel.getObject( searchDefinition0Id );
    if( searchCriteria0.props.rd_param_values ) {
        exports.getSearchFolderDefinition_procParamValues( searchCriteria0, searchFolderCtx, searchCriteria, searchFilterMap, searchFilters );
    }
    exports.setSearchFolderCtxForReportDefinition( searchFolderCtx, searchCriteria, searchFilterMap, searchFilters, isEditMode );
};

/**
 * Utility function - Get Search Folder
 * @function getSearchFolderInt_procKnownType
 * @param {Object}searchFolderCtx - searchFolderCtx
 */
export let getSearchFolderInt_procKnownType = function( searchFolderCtx ) {
    let awp0SearchType = searchFolderCtx.props.awp0SearchType;
    if( awp0SearchType && awp0SearchType.dbValues[ 0 ] === '1' || awp0SearchType && awp0SearchType.dbValues[ 0 ] === '3' ) {
        searchFolderCtx.awp0SearchType = FULLTEXT_PROVIDER;
    } else if( awp0SearchType && awp0SearchType.dbValues[ 0 ] === '2' ) {
        searchFolderCtx.awp0SearchType = ADVANCED_PROVIDER;
    } else {
        searchFolderCtx.awp0SearchType = UNKNOWN;
    }
    exports.getSearchFolderDefinition( searchFolderCtx, searchFolderCtx.isEditMode );
};

/**
 * Utility function - Get Search Folder
 * @function getSearchFolderInt
 * @param {Object}awp0SearchDefinition - report definition object
 * @param {Object}searchFolderCtx - searchFolderCtx
 */
export let getSearchFolderInt = function( awp0SearchDefinition, searchFolderCtx ) {
    if( awp0SearchDefinition && awp0SearchDefinition.dbValues && awp0SearchDefinition.dbValues[ 0 ] ) {
        exports.getSearchFolderInt_procKnownType( searchFolderCtx );
    } else {
        searchFolderCtx.awp0SearchType = UNKNOWN;
    }
};

/**
 * Get Search Folder - check if an old active folder is to be used
 * @function getSearchFolder
 *
 * @param {Object}oldSearchFolderCtx - Existing Active Folder
 * @return {BOOLEAN} true if to use old active folder
 */
export let getSearchFolder_isOldSearchFolder = function() {
    let isOld = false;
    let selected = appCtxService.ctx.mselected;
    if( selected && selected.length > 0 && selected[ 0 ].modelType && selected[ 0 ].modelType.typeHierarchyArray && selected[ 0 ].modelType.typeHierarchyArray.indexOf( AWP0_SEARCH_FOLDER ) < 0 ) {
        isOld = true;
    }
    return isOld;
};

/**
 * Get Search Folder
 * @function getSearchFolder
 *
 * @param {Object}uidFolder - uid of Active Folder
 * @return {Object} searchFolderCtx
 */
export let getSearchFolder = function( uidFolder ) {
    let oldSearchFolderCtx = appCtxService.getCtx( SEARCH_FOLDER );
    if( oldSearchFolderCtx && exports.getSearchFolder_isOldSearchFolder() ) {
        return oldSearchFolderCtx;
    }
    let searchFolderCtx = viewModelObjectService.createViewModelObject( uidFolder, 'SpecialEdit' );
    searchFolderCtx.onRulePage = oldSearchFolderCtx ? oldSearchFolderCtx.onRulePage : false;
    searchFolderCtx.isEditMode = oldSearchFolderCtx ? oldSearchFolderCtx.isEditMode : false;
    let awp0SearchDefinition = searchFolderCtx.props.awp0SearchDefinition;
    exports.getSearchFolderInt( awp0SearchDefinition, searchFolderCtx );
    searchFolderCtx.props.object_name.isRequired = searchFolderCtx.isEditMode;
    appCtxService.registerCtx( SEARCH_FOLDER, searchFolderCtx );
    return searchFolderCtx;
};

/**
 * Get Search Folder Criteria
 * @function getSearchDefinitionCriteria
 *
 * @param {Object}uidFolder - uid of Active Folder
 * @param {Number}startIndex - startIndex
 * @return {Object} search criteria
 */
export let getSearchDefinitionCriteria = function( uidFolder, startIndex ) {
    let searchFolderCtx = appCtxService.getCtx( SEARCH_FOLDER );
    if( !( searchFolderCtx && searchFolderCtx.uid === uidFolder && searchFolderCtx.searchCriteria ) ) {
        searchFolderCtx = exports.getSearchFolder( uidFolder );
    }
    if ( searchFolderCtx.awp0SearchType === ADVANCED_PROVIDER ) {
        searchFolderCtx.searchCriteria = exports.getAdvSearchCriteriaAdditionalInfo( startIndex, searchFolderCtx.searchCriteria );
    }
    return searchFolderCtx.searchCriteria;
};

/**
 * Get Search Folder filter map
 * @function getSearchDefinitionFilterMap
 *
 * @param {Object}uidFolder - uid of Active Folder
 * @return {Object} search filter map
 */
export let getSearchDefinitionFilterMap = function( uidFolder ) {
    let searchFolderCtx = appCtxService.getCtx( SEARCH_FOLDER );
    if( !( searchFolderCtx && searchFolderCtx.uid === uidFolder && searchFolderCtx.searchFilterMap ) ) {
        searchFolderCtx = exports.getSearchFolder( uidFolder );
    }
    return searchFolderCtx.searchFilterMap;
};

/**
 *  utility function of set initial edit mode
 * @function setInitialEditModeInt
 *
 * @param {Object}data - view model data
 * @param {Object} searchFolderObject - model object of active folder
 */
export let setInitialEditModeInt = function( data, searchFolderObject ) {
    let searchFolderCtx = exports.getSearchFolder( searchFolderObject.uid );
    searchFolderCtx.onRulePage = true;
    searchFolderCtx.isEditMode = false;
    if( searchFolderCtx.awp0SearchType === UNKNOWN ) {
        searchFolderCtx.useRule = NEW_RULE;
    } else {
        searchFolderCtx.useRule = CURRENT_RULE;
    }
};

/**
 *  utility function of get full properties of active folder
 * @function getFolderFullProperties
 * @param {STRING}searchDefinitionId - report definition id
 * @param {Object}data - view model data
 * @param {Object} searchFolderObject - model object of active folder
 */
export let getFolderFullPropertiesInt = function( searchDefinitionId, data, searchFolderObject ) {
    let searchDefinitionObject = clientDataModel.getObject( searchDefinitionId );
    if( !searchDefinitionObject.props.rd_parameters ) {
        var getPropertiesInput = {
            objects: [ searchDefinitionObject ],
            attributes: [ 'rd_parameters', 'rd_param_values', 'rd_source' ]
        };
        soaService.post( 'Core-2006-03-DataManagement', 'getProperties', getPropertiesInput ).then( function() {
            exports.setInitialEditModeInt( data, searchFolderObject );
        } );
    } else {
        exports.setInitialEditModeInt( data, searchFolderObject );
    }
};

/**
 * get full properties of active folder
 * @function getFolderFullProperties
 *
 * @param {Object}data - view model data
 * @param {Object} searchFolderObject - model object of active folder
 */
export let getFolderFullProperties = function( data, searchFolderObject ) {
    let searchDefinitionId = searchFolderObject.props.awp0SearchDefinition.dbValues[ 0 ];
    if( searchDefinitionId ) {
        exports.getFolderFullPropertiesInt( searchDefinitionId, data, searchFolderObject );
    } else {
        exports.setInitialEditModeInt( data, searchFolderObject );
    }
};

/**
 * set initial edit mode
 * @function setInitialEditMode
 *
 * @param {Object}data - view model data
 * @param {Object}uidFolder - uid of Active Folder
 */
export let setInitialEditMode = function( data, uidFolder ) {
    let searchFolderObject = clientDataModel.getObject( uidFolder );
    if( !searchFolderObject.props.awp0SearchDefinition ) {
        //if certain view mode does not bring in awp0SearchDefinition property, we need to go fetch it
        var getPropertiesInput = {
            objects: [ searchFolderObject ],
            attributes: [ 'awp0SearchDefinition', 'awp0SearchType', 'awp0CanExecuteSearch', 'awp0Rule' ]
        };
        soaService.post( 'Core-2006-03-DataManagement', 'getProperties', getPropertiesInput ).then( function() {
            exports.getFolderFullProperties( data, searchFolderObject );
        } );
    } else {
        exports.getFolderFullProperties( data, searchFolderObject );
    }
};

/**
 * set non-edit mode
 * @function setNonEditMode
 *
 * @param {Object}data - view model data
 * @param {Object}searchFolderCtx - searchFolderCtx
 */
export let setNonEditMode = function( data, searchFolderCtx ) {
    searchFolderCtx.onRulePage = true;
    searchFolderCtx.isEditMode = false;
    searchFolderCtx.useRule = CURRENT_RULE;
    searchFolderCtx.isDirty = false;
};

/**
 * set non-edit mode
 * @function setExitEditMode
 *
 * @param {Object}data - view model data
 * @param {Object}uidFolder - uid of Active Folder
 */
export let setExitEditMode = function( data, uidFolder ) {
    let searchFolderCtx = appCtxService.getCtx( SEARCH_FOLDER );
    searchFolderCtx.onRulePage = false;
};

/**
 * editSearchFolderRule
 * @function editSearchFolderRule
 *
 * @param {Object}searchFolderCtx - searchFolderCtx
 */
export let editSearchFolderRule = function( searchFolderCtx ) {
    searchFolderCtx.isEditMode = true;
    searchFolderCtx.props.object_name.isRequired = true;
    if( searchFolderCtx.awp0SearchType === UNKNOWN ) {
        searchFolderCtx.useRule = NEW_RULE;
    } else {
        searchFolderCtx.useRule = CURRENT_RULE;
    }
    if( searchFolderCtx.awp0SearchType === FULLTEXT_PROVIDER ) {
        eventBus.publish( 'searchFolder.revealFilterPanel' );
    } else if( searchFolderCtx.awp0SearchType === ADVANCED_PROVIDER ) {
        eventBus.publish( 'searchFolder.revealAdvancedSearchPanel' );
    }
};

/**
 * getAdvancedSearchViewModelFromServer
 * @function getAdvancedSearchViewModelFromServer
 * @param {Object}data - data
 */
export let getAdvancedSearchViewModelFromServer = function( data ) {
    data.awp0AdvancedQueryName = {};
    data.isAdvancedSearchSupported = {
        dbValue: true
    };
    var request = {};
    soaService.postUnchecked( 'Internal-AWS2-2016-12-AdvancedSearch', 'createAdvancedSearchInput', request )
        .then(
            function( response ) {
                advancedSearchSvc.getAdvancedSearchViewModelFromCache( response.advancedSearchInput, data );
                preferredAdvancedSearchService.setPreferredSearchesVisibilityCtx();
            } ).then(
            function() {
                if( AwStateService.instance.params.savedQueryName ) {
                    advancedSearchSvc.getAdvancedSearchViewModelFromURL( data );
                }
            } );
};

/**
 * reset advanced search mode
 * @function resetAdvancedSearch
 * @param {Object}data - view model data
 */
export let resetAdvancedSearch = function( data ) {
    data.isAdvancedSearch.dbValue = false;
};

/**
 * set to advanced search mode
 * @function setAdvancedSearch
 * @param {Object}data - view model data
 * @param {Object}uidFolder - uid of Active Folder
 */
export let setAdvancedSearch = function( data, uidFolder ) {
    let searchFolderCtx = exports.resetCurrentSearchFolderRule( uidFolder );
    if( data.isAdvancedSearch && data.isAdvancedSearch.dbValue === true ) {
        searchFolderCtx.awp0SearchType = ADVANCED_PROVIDER;
    } else {
        searchFolderCtx.awp0SearchType = FULLTEXT_PROVIDER;
    }
    searchFolderCtx.useRule = NEW_RULE;
};

/**
 * reset searchResponseInfo ctx
 * @function cleanSearchResponseInfoCtx
 */
export let cleanSearchResponseInfoCtx = function() {
    let searchResponseInfoCtx = appCtxService.getCtx( 'searchResponseInfo' );
    if( searchResponseInfoCtx ) {
        appCtxService.updateCtx( 'searchResponseInfo', {} );
    }
};

/**
 * do fulltext search
 * @function doFulltextSearch
 * @param {Object}data - view model data
 * @param {Object}uidFolder - uid of Active Folder
 */
export let doFulltextSearch = function( data, uidFolder ) {
    let searchFolderCtx = exports.resetCurrentSearchFolderRule( uidFolder );
    if( searchFolderCtx.awp0SearchType === UNKNOWN ) {
        searchFolderCtx.useRule = NEW_RULE;
    }
    searchFolderCtx.awp0SearchType = FULLTEXT_PROVIDER;
    searchFolderCtx.searchCriteria = {
        limitedFilterCategoriesEnabled: 'false',
        listOfExpandedCategories: '',
        searchFromLocation: 'global',
        searchString: data.searchBox.dbValue
    };
    searchFolderCtx.isEditMode = true;
    searchFolderCtx.isDirty = true;
    eventBus.publish( RULE_CHANGED_EVENT );
};

/**
 * resetCurrentSearchFolderRule
 * @function resetCurrentSearchFolderRule
 * @param {Object}uidFolder - uid of Active Folder
 * @return {Object} searchFolderCtx
 */
export let resetCurrentSearchFolderRule = function( uidFolder ) {
    exports.cleanSearchResponseInfoCtx();
    let searchFolderCtx = exports.getSearchFolder( uidFolder );
    delete searchFolderCtx.awp0SearchType;
    delete searchFolderCtx.translatedSearchCriteriaForPropertySpecificSearch;
    searchFolderCtx.searchCriteria = {};
    searchFolderCtx.searchFilterMap = {};
    delete searchFolderCtx.searchFilters;
    delete searchFolderCtx.awp0AdvancedQueryName;
    delete searchFolderCtx.awp0AdvancedQueryAttributes;
    delete searchFolderCtx.savedSearchId;
    delete searchFolderCtx.isShapeSearch;
    return searchFolderCtx;
};

/**
 * start a new rule for active folder with all options open
 * @function clearTextSearchFolderRule
 *
 * @param {Object}searchFolderCtx - searchFolderCtx
 */
export let clearTextSearchFolderRule = function( searchFolderCtx ) {
    searchFolderCtx = exports.resetCurrentSearchFolderRule( searchFolderCtx.uid );

    searchFolderCtx.isEditMode = true;
    searchFolderCtx.useRule = NEW_RULE;
    searchFolderCtx.awp0SearchType = UNKNOWN;
    searchFolderCtx.isDirty = true;
    eventBus.publish( 'Awp0SearchFolderRule.resetAdvancedSearch' );
    eventBus.publish( RULE_CHANGED_EVENT );
};

/**
 * start a new rule for active folder with saved search
 * @function importSearchFolderRule
 *
 * @param {Object}searchFolderCtx - searchFolderCtx
 */
export let importSearchFolderRule = function( searchFolderCtx ) {
    searchFolderCtx = exports.resetCurrentSearchFolderRule( searchFolderCtx.uid );

    searchFolderCtx.awp0SearchType = UNKNOWN;
    searchFolderCtx.useRule = SAVED_SEARCH;
    searchFolderCtx.isEditMode = true;
    let savedSearchObjects = null;
    let searchCtx = appCtxService.getCtx( 'search' );
    if( searchCtx ) {
        savedSearchObjects = searchCtx.savedSearchObjects;
    }
    if( !( savedSearchObjects && savedSearchObjects.objects ) ) {
        eventBus.publish( 'loadSavedSearchData' );
    } else {
        eventBus.publish( 'loadSavedSearchViewModel' );
    }
};

/**
 * cancel edits on the active folder rule editing page
 * @function cancelEditSearchFolderRule
 *
 * @param {Object}searchFolderCtx - searchFolderCtx
 */
export let cancelEditSearchFolderRule = function( searchFolderCtx ) {
    exports.cleanSearchResponseInfoCtx();
    searchFolderCtx = exports.getSearchFolder( searchFolderCtx.uid );
    searchFolderCtx.isEditMode = false;
    searchFolderCtx.useRule = CURRENT_RULE;
    searchFolderCtx.isDirty = false;
    eventBus.publish( RULE_CHANGED_EVENT );
};

/**
 * save the rule and props for active folder
 * @function saveSearchFolderRule
 * @param {Object}searchFolderCtx - searchFolderCtx
 */
export let saveSearchFolderRule = function( searchFolderCtx ) {
    eventBus.publish( 'searchFolder.save' );
};

/**
 *  utility function of update the display for criteria and filters
 * @function updateCriteriaAndFiltersInt
 *
 * @param {Object}data - view model data
 * @param {Object}searchFolderCtx - searchFolderCtx
 */
export let updateCriteriaAndFiltersInt = function( data, searchFolderCtx ) {
    if( searchFolderCtx.awp0SearchType === ADVANCED_PROVIDER ) {
        let uiValues = searchFolderCtx.props.awp0Rule.uiValues;
        data.searchFolderCriteria.uiValue = uiValues[ 0 ];
        data.searchFolderFilters.displayValues = searchFolderCommonService.processAttributes( uiValues );
    } else if( searchFolderCtx.awp0SearchType === FULLTEXT_PROVIDER ) {
        if( searchFolderCtx.searchCriteria.searchStringInContent ) {
            data.searchFolderCriteria.uiValue = searchFolderCtx.searchCriteria.searchString + ', ' + searchFolderCtx.searchCriteria.searchStringInContent;
        } else {
            data.searchFolderCriteria.uiValue = searchFolderCtx.searchCriteria.searchString;
        }
        data.searchFolderFilters.displayValues = searchFolderCtx.searchFilters ? searchFolderCtx.searchFilters : [];
    }
};

/**
 * update the display for criteria and filters
 * @function updateCriteriaAndFilters
 *
 * @param {Object}data - view model data
 * @param {STRING}uidFolder - uid of active folder
 */
export let updateCriteriaAndFilters = function( data, uidFolder ) {
    let searchFolderCtx = exports.getSearchFolder( uidFolder );
    exports.updateCriteriaAndFiltersInt( data, searchFolderCtx );
};
/**
 * updatePanelForSelectedSavedShapeSearch
 *
 * @function updatePanelForSelectedSavedShapeSearch
 * @param {ViewModelProperty} prop - prop
 * @param {ViewModel} searchFolderCtx - Advanced Saved search object
 * @param {Object} searchFilterMap - searchFilterMap
 */
export let updatePanelForSelectedSavedShapeSearch = function( prop, searchFolderCtx, searchFilterMap ) {
    searchFolderCtx.isShapeSearch = true;
    let shapeSearchCriteria = shapeSearchService.getSearchCriteriaForShapeSearch( searchFilterMap );
    searchFolderCtx.searchCriteria = shapeSearchCriteria;
    let searchContext = {
        activeFilterMap: {},
        activeFilters: []
    };
    searchFilterSvc.buildSearchFiltersInt( searchContext, searchFilterMap );
    shapeSearchService.updateFilterMapForShapeSearch( searchContext.activeFilterMap );
    searchFolderCtx.searchFilterMap = searchContext.activeFilterMap;
};

/**
 * updatePanelForSelectedFulltextSavedSearch
 *
 * @function updatePanelForSelectedFulltextSavedSearch
 * @param {ViewModelProperty} prop - prop
 * @param {ViewModel} vmo - vmo
 * @param {ViewModel} searchFolderCtx - Advanced Saved search object
 */
export let updatePanelForSelectedFulltextSavedSearch = function( prop, vmo, searchFolderCtx ) {
    searchFolderCtx.savedSearchId = prop.dbValue;
    searchFolderCtx.awp0SearchType = FULLTEXT_PROVIDER;
    searchFolderCtx.searchCriteria = {
        limitedFilterCategoriesEnabled: 'false',
        listOfExpandedCategories: '',
        searchFromLocation: 'global',
        searchString: vmo.props.awp0search_string.dbValue
    };
    let searchFilterMap = saveSearchUtils.getFilterMap( vmo );
    if( searchFilterMap && searchFilterMap.ShapeSearchProvider ) {
        exports.updatePanelForSelectedSavedShapeSearch( prop, searchFolderCtx, searchFilterMap );
    } else {
        let searchContext = {
            activeFilterMap: {},
            activeFilters: []
        };
        searchFilterSvc.buildSearchFiltersInt( searchContext, searchFilterMap );
        searchFolderCtx.searchFilterMap = searchContext.activeFilterMap;
    }
    searchFolderCtx.isDirty = true;
    eventBus.publish( RULE_CHANGED_EVENT );
};

/**
 * updatePanelForSelectedAdvancedSavedSearch
 *
 * @function updatePanelForSelectedAdvancedSavedSearch
 * @param {ViewModelProperty} prop - prop
 * @param {ViewModel} vmo - vmo
 * @param {ViewModel} searchFolderCtx - Advanced Saved search object
 */
export let updatePanelForSelectedAdvancedSavedSearch = function( prop, vmo, searchFolderCtx ) {
    searchFolderCtx.awp0SearchType = ADVANCED_PROVIDER;
    let searchCriteria = {
        typeOfSearch: 'ADVANCED_SEARCH',
        utcOffset: String( -1 * new Date().getTimezoneOffset() ),
        lastEndIndex: '',
        totalObjectsFoundReportedToClient: ''
    };
    searchFolderCtx.savedsearch_attr_names = {
        uiValues: [],
        dbValues: []
    };
    searchFolderCtx.savedsearch_attr_values = {
        uiValues: [],
        dbValues: []
    };

    searchCriteria.queryUID = vmo.props.savedsearch_query.dbValue;
    let eventData = {};
    if( searchFolderCtx.savedSearchId && searchFolderCtx.savedSearchId !== prop.dbValue ) {
        eventData.forceRefresh = true;
    } else {
        searchFolderCtx.savedSearchId = prop.dbValue;
    }

    searchCriteria.searchID = advancedSearchUtils.getSearchId( searchCriteria.queryUID );
    var savedQueryCriteriaUID = vmo.props.saved_search_criteria.dbValues[ 0 ];
    var savedQueryCriteriaObject = clientDataModel.getObject( savedQueryCriteriaUID );
    var savedSearchAttributeDisplayValues = savedQueryCriteriaObject.props.fnd0AttributeDisplayValues.dbValues;
    vmo.props.savedsearch_attr_values.uiValues = savedSearchAttributeDisplayValues;

    for( var i = 0; i < vmo.props.savedsearch_attr_names.dbValues.length; i++ ) {
        searchCriteria[ vmo.props.savedsearch_attr_names.dbValues[ i ] ] = vmo.props.savedsearch_attr_values.dbValues[ i ];
        searchFolderCtx.savedsearch_attr_names.uiValues.push( vmo.props.savedsearch_attr_names.uiValues[ i ] );
        searchFolderCtx.savedsearch_attr_names.dbValues.push( vmo.props.savedsearch_attr_names.dbValues[ i ] );
        searchFolderCtx.savedsearch_attr_values.uiValues.push( vmo.props.savedsearch_attr_values.uiValues[ i ] );
        searchFolderCtx.savedsearch_attr_values.dbValues.push( vmo.props.savedsearch_attr_values.dbValues[ i ] );
        searchFolderCtx.searchFilters += vmo.props.savedsearch_attr_names.uiValues[ i ] + '=' + vmo.props.savedsearch_attr_values.uiValues[ i ] + ';';
    }
    searchFolderCtx.savedQueryName = vmo.props.savedsearch_query.uiValue;
    searchFolderCtx.searchCriteria = searchCriteria;
    searchFolderCtx.searchFilterMap = {};
    eventBus.publish( 'searchFolder.revealAdvancedSearchPanel', eventData );
};

/**
 * updatePanelForSelectedSavedSearch
 *
 * @function updatePanelForSelectedSavedSearch
 * @param {ViewModelProperty} prop - prop
 * @return {Function} call back function
 */
export let updatePanelForSelectedSavedSearch = function( prop ) {
    return function() {
        let searchFolderCtx = appCtxService.getCtx( SEARCH_FOLDER );
        searchFolderCtx.useRule = SAVED_SEARCH;
        if( !( prop && prop.dbValue ) ) {
            return;
        }
        let vmo = viewModelObjectService.createViewModelObject( prop.dbValue, 'SpecialEdit' );
        if( vmo.type === 'Awp0FullTextSavedSearch' ) {
            exports.updatePanelForSelectedFulltextSavedSearch( prop, vmo, searchFolderCtx );
        } else {
            exports.updatePanelForSelectedAdvancedSavedSearch( prop, vmo, searchFolderCtx );
        }
    };
};

/**
 * getQueryParametersMap
 *
 * @function getQueryParametersMap
 * @param {Object} savedSearchObject savedSearchObject - the selected saved search object+
 * @return {Object} queryParametersMap - a map containing saved query parameters
 */
export let getQueryParametersMap = function( savedSearchObject ) {
    var queryParametersMap = {};
    var savedSearchAttributeNames = savedSearchObject.props.savedsearch_attr_names.dbValues;
    var savedsearch_attr_values = savedSearchObject.props.savedsearch_attr_values.uiValues;

    for( var j = 0; j < savedSearchAttributeNames.length; j++ ) {
        var key = savedSearchAttributeNames[ j ];
        var value = savedsearch_attr_values[ j ];
        let multipleValues = value.split( advancedSearchUtils._delimiterForArray );
        let filterValue = '';
        if( multipleValues && multipleValues.length > 0 && value.indexOf( searchFolderCommonService.INTERNAL_KEYWORD ) !== -1 ) {
            filterValue = searchFolderCommonService.splitInternalAndDisplayNameUsingInternalKeyword( multipleValues, true );
            queryParametersMap[ key ] = filterValue;
        } else {
            queryParametersMap[ key ] = value;
        }
    }
    return queryParametersMap;
};

/**
 * doAdvancedSearch
 *
 * @function doAdvancedSearch
 * @param {String} data the view model data
 * @param {BOOLEAN} forceRefresh - force refresh
 */
export let doAdvancedSearch = function( data, forceRefresh ) {
    advancedSearchSvc.doAdvancedSearch( data, true );
    let searchFolderCtx = appCtxService.getCtx( SEARCH_FOLDER );

    searchFolderCtx.awp0AdvancedQueryName = data.awp0AdvancedQueryName;
    searchFolderCtx.awp0AdvancedQueryAttributes = data.awp0AdvancedQueryAttributes;
    searchFolderCtx.searchCriteria = data.criteria;
    if( forceRefresh ) {
        searchFolderCtx.isDirty = true;
        eventBus.publish( RULE_CHANGED_EVENT );
    }
};

/**
 * Utility function of populateAdvSearchPanel
 *
 * @function populateAdvSearchPanelInt
 * @param {Object} data - view model data
 * @param {BOOLEAN} doExecute - actually perform the search
 * @param {BOOLEAN} forceRefresh - force refresh,
 * @param {Object} response - SOA response object
 */
export let populateAdvSearchPanelInt = function( data, doExecute, forceRefresh, response ) {
    if( data.awp0AdvancedQueryName.dbValues ) {
        advancedSearchSvc.getReviewAndExecuteViewModel( data, response );
        if( doExecute ) {
            exports.doAdvancedSearch( data, forceRefresh );
        }
    }
};

/**
 * populateAdvSearchPanel
 *
 * @function populateAdvSearchPanel
 * @param {ViewModel} savedSearchObject - Advanced Saved search object
 * @param {Object} data - view model data
 * @param {BOOLEAN} doExecute - actually perform the search
 * @param {BOOLEAN} forceRefresh - force refresh
 */
export let populateAdvSearchPanel = function( savedSearchObject, data, doExecute, forceRefresh ) {
    data.awp0AdvancedQueryName = savedSearchObject.props.savedsearch_query;
    data.awp0AdvancedQueryName.propertyName = 'awp0AdvancedQueryName';
    data.awp0AdvancedQueryName.isEnabled = true;
    data.awp0QuickSearchName = {};
    data.awp0AdvancedQueryAttributes = {};

    var request = {
        selectedQuery: {
            uid: savedSearchObject.props.savedsearch_query.dbValues[ 0 ],
            type: 'ImanQuery'
        }
    };
    soaService.post( 'Internal-AWS2-2016-12-AdvancedSearch', 'getSelectedQueryCriteria', request ).then(
        function( response ) {
            var modelObject = clientDataModel.getObject( response.advancedQueryCriteria.uid );
            var props = advancedSearchSvc.getRealProperties( modelObject, null, null, 'Advanced' );

            var savedSearchCriteria = '';
            for( var i = 0; i < savedSearchObject.props.savedsearch_attr_names.dbValues.length; i++ ) {
                try {
                    savedSearchObject.props.savedsearch_attr_names.uiValues[ i ] = props[ savedSearchObject.props.savedsearch_attr_names.dbValues[ i ] ].propertyDescriptor.displayName;
                    savedSearchCriteria = savedSearchCriteria + savedSearchObject.props.savedsearch_attr_names.uiValues[ i ] + '=' +
                        savedSearchObject.props.savedsearch_attr_values.uiValues[ i ] + ';';
                } catch ( e ) {
                    logger.info( savedSearchObject.props.savedsearch_attr_names.dbValues[ i ] +
                        ' attribute does not exist in the list of attributes defined for the ' +
                        savedSearchObject.props.savedsearch_query.uiValues[ 0 ] + ' saved query' );
                }
            }
            data.awp0AdvancedQueryAttributesPopulated = exports.getQueryParametersMap( savedSearchObject );
            exports.populateAdvSearchPanelInt( data, doExecute, forceRefresh, response );
        } );
};

/**
 * updateSavedAdvSearchContextForSearchFolder
 *
 * @function updateSavedAdvSearchContextForSearchFolder
 * @param {OBJECT} searchFolderCtx - searchFolderCtx
 * @param {Object} data - view model data
 * @param {BOOLEAN} doExecute - actually perform the search
 * @param {BOOLEAN} forceRefresh - force refresh
 */
export let updateSavedAdvSearchContextForSearchFolder = function( searchFolderCtx, data, doExecute, forceRefresh ) {
    let propertyName = 'awp0AdvancedQueryName';
    let dataType = 'STRING';
    let dbValue = searchFolderCtx.searchCriteria.queryUID;
    let displayValuesIn = [ searchFolderCtx.savedQueryName ];
    if( dbValue ) {
        let queryProp = uwPropertyService.createViewModelProperty( propertyName, searchFolderCtx.savedQueryName, dataType, dbValue, displayValuesIn );
        queryProp.dbValues = [ queryProp.dbValue ];
        queryProp.uiValues = [ queryProp.uiValue ];
        let savedSearchObject = {
            props: {
                savedsearch_query: queryProp,
                savedsearch_attr_names: searchFolderCtx.savedsearch_attr_names,
                savedsearch_attr_values: searchFolderCtx.savedsearch_attr_values
            }
        };
        exports.populateAdvSearchPanel( savedSearchObject, data, doExecute, forceRefresh );
    }
};

/**
 * updateAdvancedSearchContextForSearchFolder
 *
 * @function updateAdvancedSearchContextForSearchFolder
 * @param {ViewModel} searchFolderCtx - Advanced Saved search object
 * @param {Object} data - view model data
 */
export let updateAdvancedSearchContextForSearchFolder = function( searchFolderCtx, data ) {
    if( searchFolderCtx.useRule === NEW_RULE ) {
        eventBus.publish( 'loadSavedQueryViewModel' );
    } else if( searchFolderCtx.useRule === CURRENT_RULE ) {
        eventBus.publish( 'loadSavedSearchViewModel' );
        exports.updateSavedAdvSearchContextForSearchFolder( searchFolderCtx, data );
    } else if( searchFolderCtx.useRule === SAVED_SEARCH ) {
        if( data.eventData && data.eventData.forceRefresh ) {
            exports.updateSavedAdvSearchContextForSearchFolder( searchFolderCtx, data, true, true );
        } else {
            exports.updateSavedAdvSearchContextForSearchFolder( searchFolderCtx, data, true );
        }
    }
};

/**
 * update context for fulltext saved search
 * @function updateSavedFullTextSearchContextForSearchFolder
 *
 * @param {Object}searchFolderCtx - searchFolderCtx
 */
export let updateSavedFullTextSearchContextForSearchFolder = function( searchFolderCtx ) {
    //no op for now.
};

/**
 * reroute for selected saved search based on its type
 * @function updateSavedSearchContextForSearchFolder
 *
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @param {Object}data - view model data
 */
export let updateSavedSearchContextForSearchFolder = function( searchFolderCtx, data ) {
    if( searchFolderCtx.awp0SearchType === FULLTEXT_PROVIDER ) {
        // if the saved search object type is Full Text Saved Search
        exports.updateSavedFullTextSearchContextForSearchFolder( searchFolderCtx );
    } else if( searchFolderCtx.awp0SearchType === ADVANCED_PROVIDER ) {
        // if the saved search object type is Advanced Saved Search
        searchFolderCtx.useRule = SAVED_SEARCH;
        searchFolderCtx.awp0SearchType = ADVANCED_PROVIDER;
        exports.updateSavedAdvSearchContextForSearchFolder( searchFolderCtx, data );
    }
};

/**
 * getReportDefinitionCriteriaForSave
 * @function getReportDefinitionCriteriaForSave
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @param {String} data the view model data
 */
export let getReportDefinitionCriteriaForSave = function( searchFolderCtx, data ) {
    if( searchFolderCtx.awp0SearchType === FULLTEXT_PROVIDER ) {
        return exports.getFulltextReportDefinitionCriteriaForSave( searchFolderCtx, data );
    } else if( searchFolderCtx.awp0SearchType === ADVANCED_PROVIDER ) {
        return exports.getAdvancedReportDefinitionCriteriaForSave( searchFolderCtx, data );
    }
};
/**
 * Utility function of setSearchFiltersAfterSave
 *
 * @function setSearchFiltersAfterSave_procStringFilter
 * @param {STRING}prop - prop
 * @param {Object}value - filter
 * @param {Object}searchFilters - searchFilters
 */
export let setSearchFiltersAfterSave_procStringFilter = function( prop, value, searchFilters ) {
    delete value.startDateValue;
    delete value.endDateValue;
    delete value.startNumericValue;
    delete value.endNumericValue;
    delete value.startEndRange;
    searchFilters.push( prop + '=' + value.stringDisplayValue );
    if( value.stringDisplayValue === value.stringValue ) {
        searchFilters.push( prop + '=' + value.startDateValue + ' - ' + value.endDateValue );
        delete value.stringDisplayValue;
    }
};
/**
 * Utility function of setSearchFiltersAfterSave
 *
 * @function setSearchFiltersAfterSave_procDateFilter
 * @param {STRING}prop - prop
 * @param {Object}value - filter
 * @param {Object}searchFilters - searchFilters
 */
export let setSearchFiltersAfterSave_procDateFilter = function( prop, value, searchFilters ) {
    delete value.startNumericValue;
    delete value.endNumericValue;
    delete value.startEndRange;
    delete value.stringDisplayValue;
    searchFilters.push( prop + '=' + value.startDateValue + ' - ' + value.endDateValue );
};
/**
 * Utility function of setSearchFiltersAfterSave
 *
 * @function setSearchFiltersAfterSave_procNumericFilter
 * @param {STRING}prop - prop
 * @param {Object}value - filter
 * @param {Object}searchFilters - searchFilters
 */
export let setSearchFiltersAfterSave_procNumericFilter = function( prop, value, searchFilters ) {
    delete value.startDateValue;
    delete value.endDateValue;
    delete value.stringDisplayValue;
    if( value.startEndRange === 'NumericRange' ) {
        searchFilters.push( prop + '=' + value.startNumericValue + ' - ' + value.endNumericValue );
    } else {
        searchFilters.push( prop + '=' + value.stringValue );
    }
};

/**
 * Utility function of setSearchFiltersAfterSave when type of filter is Radio Filter
 * @function setSearchFiltersAfterSave_processRadioFilter
 * @param {STRING}prop - prop
 * @param {Object}value - filter
 * @param {Object}searchFilters - searchFilters
 */
export let setSearchFiltersAfterSave_processRadioFilter = function( prop, value, searchFilters ) {
    delete value.startDateValue;
    delete value.endDateValue;
    delete value.startNumericValue;
    delete value.endNumericValue;
    delete value.startEndRange;
    searchFilters.push( prop + '=' + value.stringDisplayValue );
    if( value.stringDisplayValue === value.stringValue ) {
        delete value.stringDisplayValue;
    }
};

/**
 * setSearchFiltersAfterSave
 *
 * @function setSearchFiltersAfterSave
 * @param {STRING}prop - prop
 * @param {Object}value - filter
 * @param {Object}searchFilters - searchFilters
 * @param {INTEGER}index - index
 * @param {Object}searchCriteria - searchCriteria
 */
export let setSearchFiltersAfterSave = function( prop, value, searchFilters, index, searchCriteria ) {
    delete value.colorValue;
    delete value.count;
    delete value.selected;
    if( value.searchFilterType === 'StringFilter' ) {
        exports.setSearchFiltersAfterSave_procStringFilter( prop, value, searchFilters );
    } else if( value.searchFilterType === 'DateFilter' ) {
        exports.setSearchFiltersAfterSave_procDateFilter( prop, value, searchFilters );
    } else if( value.searchFilterType === 'NumericFilter' ) {
        exports.setSearchFiltersAfterSave_procNumericFilter( prop, value, searchFilters );
    } else if( value.searchFilterType === 'RadioFilter' ) {
        exports.setSearchFiltersAfterSave_processRadioFilter( prop, value, searchFilters );
    }

    let reportFilter = {
        criteriaName: 'ReportFilter_' + String( index ),
        criteriaValues: [ prop ]
    };
    let reportFilterValue = {
        criteriaName: 'ReportFilterValue_' + String( index ),
        criteriaValues: []
    };
    let filterString = JSON.stringify( value );
    reportFilterValue.criteriaValues.push( filterString );
    searchCriteria.push( reportFilter );
    searchCriteria.push( reportFilterValue );
};

/**
 * getFulltextReportDefinitionCriteriaForSave
 *
 * @function getFulltextReportDefinitionCriteriaForSave
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @param {Object} data the view model data
 * @return {Object} searchCriteria
 */
export let getFulltextReportDefinitionCriteriaForSave = function( searchFolderCtx, data ) {
    let searchCriteria = [];
    let searchFilters = [];
    if( !searchFolderCtx.searchCriteria.searchString ) {
        return searchCriteria;
    }
    let searchString = {
        criteriaName: 'searchString',
        criteriaValues: [ searchFolderCtx.searchCriteria.searchString ]
    };
    searchCriteria.push( searchString );
    if( searchFolderCtx.translatedSearchCriteriaForPropertySpecificSearch
        && searchFolderCtx.translatedSearchCriteriaForPropertySpecificSearch.length > 0 ) {
        _.forEach( searchFolderCtx.translatedSearchCriteriaForPropertySpecificSearch, function( value ) {
            if( value && value.length > 0 ) {
                let translatedSearchString = {
                    criteriaName: 'ReportTranslatedSearchCriteria',
                    criteriaValues: [ value ]
                };
                searchCriteria.push( translatedSearchString );
            }
        } );
    }

    if( searchFolderCtx.defaultActiveFolder ) {
        let isDefaultActiveFolder = {
            criteriaName: 'DefaultActiveFolder',
            criteriaValues: [ searchFolderCtx.defaultActiveFolder ]
        };
        searchCriteria.push( isDefaultActiveFolder );
    }

    if( searchFolderCtx.recentlyModifiedType ) {
        let recentlyModifiedType = {
            criteriaName: 'RecentlyModifiedType',
            criteriaValues: [ searchFolderCtx.recentlyModifiedType ]
        };
        searchCriteria.push( recentlyModifiedType );
    }

    if( searchFolderCtx.isShapeSearch ) {
        let shapeSearchUID = {
            criteriaName: 'shapeSearchUID',
            criteriaValues: [ searchFolderCtx.searchCriteria.searchString ]
        };
        searchCriteria.push( shapeSearchUID );
        if( searchFolderCtx.searchCriteria.searchStringInContent ) {
            let searchStringInContent = {
                criteriaName: 'searchStringInContent',
                criteriaValues: [ searchFolderCtx.searchCriteria.searchStringInContent ]
            };
            searchCriteria.push( searchStringInContent );
        }
    }
    let index = -1;
    for( var prop in searchFolderCtx.searchFilterMap ) {
        if( searchFolderCtx.searchFilterMap.hasOwnProperty( prop ) ) {
            _.forEach( searchFolderCtx.searchFilterMap[ prop ], function( value, key ) {
                ++index;
                exports.setSearchFiltersAfterSave( prop, value, searchFilters, index, searchCriteria );
            } );
        }
    }
    searchFolderCtx.searchFilters = searchFilters;
    return searchCriteria;
};

/**
 * Utility function of getAdvancedReportDefinitionCriteriaForSave
 * @function getAdvancedReportDefinitionCriteriaForSaveInt
 * @param {Object}criteria - criteria object
 * @param {Object} searchFilters the view model data
 * @param {Object} data the view model data
 * @return {Object} searchCriteria
 */
export let getAdvancedReportDefinitionCriteriaForSaveInt = function( criteria, searchFilters, searchCriteria, data ) {
    let index = -1;
    for( var prop in criteria ) {
        if( criteria.hasOwnProperty( prop ) ) {
            let internalValues = criteria[ prop ].split( advancedSearchUtils._delimiterForArray );
            let displayValues = data.searchCriteriaUiValueMap[ prop ][ 3 ].split( advancedSearchUtils._delimiterForArray );
            searchFilters.push( prop + '=' + criteria[ prop ] );
            ++index;
            let reportFilter = {
                criteriaName: 'ReportFilter_' + String( index ),
                criteriaValues: [ prop ]
            };
            let filterValue = '';
            if( internalValues.length === displayValues.length && data.awp0AdvancedQueryAttributes[ prop ]
                && data.awp0AdvancedQueryAttributes[ prop ].hasLov ) {
                for( let index = 0; index < internalValues.length; index++ ) {
                    filterValue += displayValues[ index ] + searchFolderCommonService.INTERNAL_KEYWORD + internalValues[ index ];
                    if( index !== internalValues.length - 1 ) {
                        filterValue += advancedSearchUtils._delimiterForArray;
                    }
                }
            } else {
                filterValue = data.searchCriteriaUiValueMap[ prop ][ 3 ];
            }
            let reportFilterValue = {
                criteriaName: 'ReportFilterValue_' + String( index ),
                criteriaValues: [ filterValue ]
            };
            searchCriteria.push( reportFilter );
            searchCriteria.push( reportFilterValue );
        }
    }
};

/**
 * getAdvancedReportDefinitionCriteriaForSave
 * @function getAdvancedReportDefinitionCriteriaForSave
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @param {Object} data the view model data
 * @return {Object} searchCriteria
 */
export let getAdvancedReportDefinitionCriteriaForSave = function( searchFolderCtx, data ) {
    let searchCriteria = [];
    let searchFilters = [];
    let savedQueryUID = {
        criteriaName: 'savedQueryUID',
        criteriaValues: [ data.awp0AdvancedQueryName.dbValues[ 0 ] ]
    };
    searchCriteria.push( savedQueryUID );
    let savedQueryName = {
        criteriaName: 'savedQueryName',
        criteriaValues: [ data.awp0AdvancedQueryName.uiValues[ 0 ] ]
    };
    searchCriteria.push( savedQueryName );
    let utcOffset = {
        criteriaName: 'utcOffset',
        criteriaValues: [ String( -1 * new Date().getTimezoneOffset() ) ]
    };
    searchCriteria.push( utcOffset );
    let criteria = {};
    advancedSearchUtils.setAdvancedSearchCriteriaMap( data, criteria );
    exports.getAdvancedReportDefinitionCriteriaForSaveInt( criteria, searchFilters, searchCriteria, data );
    searchFolderCtx.searchFilters = searchFilters;
    return searchCriteria;
};

/**
 * createSavedSearchList
 * @function createSavedSearchList
 * @param {Object} data the view model data
 */
export let createSavedSearchList = function( data ) {
    data.awp0AdvancedQueryName = {};
    let prop = uwPropertyService.createViewModelProperty( data.awp0SavedSearchName.propertyName, data.awp0SavedSearchName.propertyDisplayName, data.awp0SavedSearchName.type, '', [] );
    prop.isArray = false;
    prop.lovApi = {};
    prop.propApi = {};
    prop.lovApi.getInitialValues = function( filterStr, deferred ) {
        var lovEntries = [];
        _.forEach( appCtxService.ctx.search.savedSearchObjects.objects, function( entry ) {
            let savedSearchObject = clientDataModel.getObject( entry.uid );
            var savedSearchViewModelObj = viewModelObjectService.constructViewModelObjectFromModelObject(
                savedSearchObject, 'Search' );
            let lovEntry = {
                propDisplayValue: savedSearchViewModelObj.props.object_name.uiValue,
                propInternalValue: savedSearchViewModelObj.uid,
                propDisplayDescription: '',
                hasChildren: false,
                children: {},
                sel: savedSearchViewModelObj.selected === 'true'
            };
            lovEntries.push( lovEntry );
        } );
        return deferred.resolve( lovEntries );
    };
    prop.propApi.fireValueChangeEvent = exports.updatePanelForSelectedSavedSearch( prop );

    prop.lovApi.getNextValues = function( deferred ) {
        deferred.resolve( null );
    };
    prop.lovApi.validateLOVValueSelections = function( lovEntries ) { // eslint-disable-line no-unused-vars
        // Either return a promise or don't return anything. In this case, we don't want to return anything
    };
    prop.hasLov = true;
    prop.isSelectOnly = true;
    prop.emptyLOVEntry = true;
    data.awp0SavedSearchName = prop;
};

/**
 * getReportDefinitionUID
 * @function getReportDefinitionUID
 * @param {String} value the report definition db value in search folder context
 */
export let getReportDefinitionUID = function( value ) {
    if( value === null || value === undefined ) {
        value = '';
    }
    return value;
};

/**
 * getInputSearchCriteriaForSearchSettings
 * @function getInputSearchCriteriaForSearchSettings
 * @param {Object} searchFolder the selected active folder
 * @returns {Array} translatedSearchCriteriaInput - the array contains the rd_param_values for input for search settings SOA input
 */
export let getInputSearchCriteriaForSearchSettings = function( searchFolder ) {
    let reportDefinitionUID = searchFolder
        && searchFolder.props
        && searchFolder.props.awp0SearchDefinition
        && searchFolder.props.awp0SearchDefinition.dbValues ? searchFolder.props.awp0SearchDefinition.dbValues[ 0 ] : undefined;
    let searchFolderCtx = appCtxService.getCtx( SEARCH_FOLDER );
    let translatedSearchCriteriaInput = [];
    if( reportDefinitionUID && !searchFolderCtx.isEditMode ) {
        let reportDefinition = clientDataModel.getObject( reportDefinitionUID );
        let params = reportDefinition.props.rd_parameters.dbValues;
        let paramValues = reportDefinition.props.rd_param_values.dbValues;
        if( paramValues && paramValues.length > 0 ) {
            translatedSearchCriteriaInput = searchCommonUtils.scanReportDefinitionForTranslatedSearchCriteria( params, paramValues );
        }
    }
    return translatedSearchCriteriaInput;
};

/**
 * setTranslatedSearchString
 * @function setTranslatedSearchString
 * @param {Object} response the search settings SOA response
 * @param {Object} translatedSearchString the view model property which will contain the translated search criteria
 * @returns {Object} setTranslatedSearchString - the view model property which contains the translated search criteria
 */
export let setTranslatedSearchString = function( response, translatedSearchString ) {
    let translatedSearchStringFromSOA;
    if( response && response.outputValues && response.outputValues.getTranslatedSearchCriteriaForCurrentLocale
        && response.outputValues.getTranslatedSearchCriteriaForCurrentLocale[0] && response.outputValues.getTranslatedSearchCriteriaForCurrentLocale[0].length > 0 ) {
        translatedSearchStringFromSOA = response.outputValues.getTranslatedSearchCriteriaForCurrentLocale[0];
    }
    if( translatedSearchStringFromSOA && translatedSearchStringFromSOA.length > 0 && translatedSearchStringFromSOA.indexOf( 'V_A_L' ) === -1 ) {
        let searchFolderCtx = appCtxService.getCtx( SEARCH_FOLDER );
        searchFolderCtx.searchCriteria.searchString = translatedSearchStringFromSOA;
        appCtxService.updatePartialCtx( SEARCH_FOLDER, searchFolderCtx );
    }
    translatedSearchString.dbValue = translatedSearchStringFromSOA;
    return translatedSearchString;
};

/**
 * getActiveFolderUids
 * This function feeds the SOA deleteActiveFolders with the UIDs of the objects to be deleted.
 * The SOA actually will delete any objects passed in, not just the active folders (active folders need special processing
 * to set parent folder's parameter). So after deletion instead of firing the event of cdm.relatedModified,
 * we'll do a primaryWorkArea.reset to refresh the root folder, MyActiveFolder,
 * because the selection can be heterogeneous and it is uncertain what parent active folder should be set the focus on.
 * @function getActiveFolderUids
 * @param {Object} selected selected objects
 * @returns {ARRAY} array of uids
 */
export let getActiveFolderUids =  function( selected ) {
    return _.map( selected, 'uid' );
};

/**
 * getAdvSearchCriteriaAdditionalInfo
 * @function getAdvSearchCriteriaAdditionalInfo
 * @param {Number}startIndex - startIndex
 * @param {Object}criteria - criteria
 * @return {Object} search criteria
 */
export let getAdvSearchCriteriaAdditionalInfo = function( startIndex, criteria ) {
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
    }
    return criteria;
};
const exports = {
    addActiveFolder,
    editActiveFolder,
    addObjectToSearchFolder,
    setCanExecuteSearch,
    setSearchFolderProvider,
    cleanSearchResponseInfoCtx,
    getSearchFolderDataProviderInt,
    getSearchFolderCtx,
    getSearchFolderDataProvider,
    getSearchFolderDefinitionIntFulltextInt_setFilterMap,
    getSearchFolderDefinitionIntFulltextInt,
    getSearchFolderDefinitionIntFulltext_ProcessFilterTypes,
    getSearchFolderDefinitionIntFulltextStringFilter,
    getSearchFolderDefinitionIntFulltext_CheckShapeSearch,
    getSearchFolderDefinitionIntFulltext,
    deleteAllProps,
    getSearchFolderDefinitionIntShapeSearch,
    getSearchFolderDefinitionIntAdvanced,
    setSearchFolderCtxForReportDefinition,
    processSearchFolderDefinitionInt_Fulltext,
    processSearchFolderDefinitionInt_Advanced,
    getSearchFolderDefinitionInt,
    getSearchFolderDefinition_procParamValues,
    getSearchFolderDefinition,
    getSearchFolderInt_procKnownType,
    getSearchFolderInt,
    getSearchFolder_isOldSearchFolder,
    getSearchFolder,
    getSearchDefinitionCriteria,
    getSearchDefinitionFilterMap,
    setInitialEditModeInt,
    getFolderFullPropertiesInt,
    getFolderFullProperties,
    setInitialEditMode,
    setExitEditMode,
    setNonEditMode,
    editSearchFolderRule,
    getAdvancedSearchViewModelFromServer,
    resetAdvancedSearch,
    setAdvancedSearch,
    doFulltextSearch,
    resetCurrentSearchFolderRule,
    clearTextSearchFolderRule,
    importSearchFolderRule,
    cancelEditSearchFolderRule,
    saveSearchFolderRule,
    populateAdvSearchPanelInt,
    populateAdvSearchPanel,
    updatePanelForSelectedSavedShapeSearch,
    updatePanelForSelectedFulltextSavedSearch,
    updatePanelForSelectedAdvancedSavedSearch,
    updatePanelForSelectedSavedSearch,
    createSavedSearchList,
    updateCriteriaAndFiltersInt,
    updateCriteriaAndFilters,
    updateAdvancedSearchContextForSearchFolder,
    updateSavedSearchContextForSearchFolder,
    updateSavedFullTextSearchContextForSearchFolder,
    updateSavedAdvSearchContextForSearchFolder,
    getQueryParametersMap,
    doAdvancedSearch,
    setSearchFiltersAfterSave_procStringFilter,
    setSearchFiltersAfterSave_procDateFilter,
    setSearchFiltersAfterSave_procNumericFilter,
    setSearchFiltersAfterSave,
    getFulltextReportDefinitionCriteriaForSave,
    getAdvancedReportDefinitionCriteriaForSaveInt,
    getAdvancedReportDefinitionCriteriaForSave,
    getReportDefinitionCriteriaForSave,
    getReportDefinitionUID,
    setSearchFiltersAfterSave_processRadioFilter,
    getInputSearchCriteriaForSearchSettings,
    setTranslatedSearchString,
    getActiveFolderUids,
    getAdvSearchCriteriaAdditionalInfo
};

export default exports;

/**
 * @memberof NgServices
 * @member searchFolderService
 */
app.factory( 'searchFolderService', () => exports );
