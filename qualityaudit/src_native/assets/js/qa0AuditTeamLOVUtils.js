// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/qa0AuditTeamLOVUtils
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaService from 'soa/kernel/soaService';
import listBoxService from 'js/listBoxService';
import parsingUtils from 'js/parsingUtils';
import eventBus from 'js/eventBus';

/**
 * Define public API
 */
var exports = {};

var getInitialLOVValueDeferred;

/**
 * Get the group or role content based on input values and created LOV entries and return.
 *
 * @param {Object} prop Property object whose properties needs to be populated
 * @param {int} startIndex Start index value
 * @param {Object} filterContent Filter object (Group or role) used to filter LOV
 * @param {Object} filterStr Filter string to filter
 * @returns {Object} The promise for the LOV search result
 */
var performLOVSearch = function( prop, startIndex, filterContent, filterStr ) {
    var deferred = AwPromiseService.instance.defer();
    var searchCriteria = { resourceProviderContentType: prop.contentType };

    // Initialize search criteria depending on contentType to search for
    if( prop.contentType === 'Group' && filterContent ) {
        searchCriteria.role = filterContent;
    } else if( prop.contentType === 'Role' && filterContent ) {
        searchCriteria.group = filterContent;
    }

    if( filterStr ) {
        searchCriteria.searchString = filterStr;
    }

    // Check if sub group need to be search. Pass that value to server
    if( prop.searchSubGroup ) {
        searchCriteria.searchSubGroup = 'true';
    }

    // By default resource provider will be Awp0ResourceProvider
    var resourceProvider = 'Awp0ResourceProvider';

    var inputData = {
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: ''
        },
        inflateProperties: false,
        saveColumnConfigData: {},
        searchInput: {
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: resourceProvider,
            searchCriteria: searchCriteria,
            cursor: {
                startIndex: startIndex,
                endReached: false,
                startReached: false,
                endIndex: 0
            },
            searchSortCriteria: [],
            searchFilterFieldSortType: 'Alphabetical'
        }
    };

    // Execute soa call to search for LOV values
    soaService.post( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', inputData ).then( function( response ) {
        var lovEntries = [];
        var modelObjects = [];

        if( response.searchResultsJSON ) {
            var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );

            if( searchResults ) {
                for( var i = 0; i < searchResults.objects.length; i++ ) {
                    var uid = searchResults.objects[ i ].uid;
                    var obj = response.ServiceData.modelObjects[ uid ];
                    modelObjects.push( obj );
                }
            }
            if( modelObjects ) {
                // Create the list model object that will be displayed
                var groups = listBoxService.createListModelObjects( modelObjects, 'props.object_string' );
                Array.prototype.push.apply( lovEntries, groups );
            }
        }

        // Populate the end index and more values present or not
        var endIndex = response.cursor.endIndex;
        var moreValuesExist = !response.cursor.endReached;

        if( endIndex > 0 && moreValuesExist ) {
            endIndex += 1;
        }

        prop.endIndex = endIndex;
        prop.moreValuesExist = moreValuesExist;

        deferred.resolve( lovEntries );
    } );

    return deferred.promise;
};

/**
 * This operation is invoked to query the data for a property having an LOV attachment. The results returned
 * from the server also take into consideration any filter string that is in the input. This method calls
 * 'getInitialLOVValues' and returns initial set of lov values.
 *
 * @param {filterString} data - The filter text for LOV's
 * @param {deferred} deferred - $q object to resolve the 'promise' with a an array of LOVEntry objects.
 * @param {ViewModelProperty} prop - Property to access LOV values for.
 * @param {String} filterContent Filter content string
 * @param {String} defaultString To be populate on group or role LOV
 * @param {String} filterStr Filter string
 */
var getInitialLOVValues = function( data, deferred, prop, filterContent, defaultString, filterStr ) {
    if( !getInitialLOVValueDeferred ) {
        getInitialLOVValueDeferred = deferred;

        var lovValues = [];

        performLOVSearch( prop, 0, filterContent, filterStr ).then( function( validObjects ) {
            if( validObjects ) {
                lovValues = listBoxService.createListModelObjectsFromStrings( [ defaultString ] );

                // Create the list model object that will be displayed
                Array.prototype.push.apply( lovValues, validObjects );
            }
            deferred.resolve( lovValues );
            getInitialLOVValueDeferred = null;
        }, function( reason ) {
            deferred.reject( reason );
            getInitialLOVValueDeferred = null;
        } );
    }
};

/**
 * Generate the next LOV values when user is doing pagination in LOV.
 * @param {deferred} deferred - $q object to resolve the 'promise' with a an array of LOVEntry objects.
 * @param {Object} prop Property object
 * @param {String} filterContent Filter content string
 * @returns {Object} Promise for the search result
 */
var getNextLOVValues = function( deferred, prop, filterContent ) {
    var lovEntries = [];

    // call search service only if more values exist
    if( prop.moreValuesExist ) {
        var startIdx = prop.endIndex;
        performLOVSearch( prop, startIdx, filterContent, null ).then( function( validObjects ) {
            lovEntries = validObjects;
            deferred.resolve( lovEntries );
        } );
    } else {
        deferred.resolve( lovEntries );
    }
    return deferred.promise;
};

/**
 * Initialize the group LOV.
 *
 * @param {Object} data Data view model object
 * @param {Object} prop Property object
 */
export let initializeGroupLOV = function( data, prop ) {
    var parentData = data;

    prop.lovApi = {};
    prop.contentType = 'Group';

    // Remove first empty entry from LOV list
    prop.emptyLOVEntry = false;
    prop.lovApi.getInitialValues = function( filterStr, deferred ) {
        getInitialLOVValues( data, deferred, prop, data.roleName, data.i18n.qa0AllGroups, filterStr );
    };

    prop.lovApi.getNextValues = function( deferred ) {
        getNextLOVValues( deferred, prop, data.roleName );
    };

    prop.lovApi.validateLOVValueSelections = function( lovEntries ) {
        parentData.groupName = null;

        if( lovEntries[ 0 ].propInternalValue.uid ) {
            parentData.groupName = lovEntries[ 0 ].propInternalValue.props.object_full_name.dbValues[ 0 ];
        } else if( lovEntries[ 0 ].propInternalValue !== data.i18n.qa0AllGroups ) {
            // If user entered invalid value reset to default "All groups"
            prop.dbValue = data.i18n.qa0AllGroups;
            prop.uiValue = data.i18n.qa0AllGroups;
        }
        parentData.additionalSearchCriteria.group = parentData.groupName;

        eventBus.publish( 'awPopupWidget.close' );
    };
};

/**
 * Initialize the role LOV.
 *
 * @param {Object} data Data view model object
 * @param {Object} prop Property object
 */
export let initializeRoleLOV = function( data, prop ) {
    var parentData = data;

    prop.lovApi = {};
    prop.contentType = 'Role';

    // Check if searchSubGroup present on data that means we need
    // to search role inside sub group
    if( data.searchSubGroup ) {
        prop.searchSubGroup = true;
    }

    // Remove first empty entry on LOV list
    prop.emptyLOVEntry = false;
    prop.lovApi.getInitialValues = function( filterStr, deferred ) {
        getInitialLOVValues( data, deferred, prop, data.groupName, data.i18n.qa0AllRoles, filterStr );
    };

    prop.lovApi.getNextValues = function( deferred ) {
        getNextLOVValues( deferred, prop, data.groupName );
    };

    prop.lovApi.validateLOVValueSelections = function( lovEntries ) {
        parentData.roleName = null;
        if( lovEntries[ 0 ].propInternalValue.uid ) {
            parentData.roleName = lovEntries[ 0 ].propInternalValue.props.role_name.dbValues[ 0 ];
        } else if( lovEntries[ 0 ].propInternalValue !== data.i18n.qa0AllRoles ) {
            // If user entered invalid value reset to default "All roles"
            prop.dbValue = data.i18n.qa0AllRoles;
            prop.uiValue = data.i18n.qa0AllRoles;
        }
        parentData.additionalSearchCriteria.role = parentData.roleName;

        eventBus.publish( 'awPopupWidget.close' );
    };
};

/**
 * This factory creates a service and returns exports
 *
 * @member qa0AuditTeamLOVUtils
 */

export default exports = {
    initializeGroupLOV,
    initializeRoleLOV
};
app.factory( 'qa0AuditTeamLOVUtils', () => exports );
