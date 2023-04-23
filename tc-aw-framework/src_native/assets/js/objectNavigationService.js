// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * @module js/objectNavigationService
 */
import soaService from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import AwStateService from 'js/awStateService';
import viewModelObjectService from 'js/viewModelObjectService';
import { getEvaluatedObjsForSelection } from 'js/awConfiguredRevService';
import _ from 'lodash';

let exports = {};

var DEFAULT_PAGE_SIZE = 50;

//Navigate context key
var _navigateContext = 'navigate';

//Uids are not references to the actual object
var getRealUid = function( uid ) {
    var realMo = cdm.getObject( uid );
    if( realMo && realMo.props.awp0Target ) {
        return realMo.props.awp0Target.dbValues[ 0 ];
    }
    return uid;
};

export let sortResults = function( parentUid, searchResults ) {
    //Sort by creation date if the context is set
    var navigationCreateContext = appCtxService.getCtx( _navigateContext + '.' + parentUid );
    if( navigationCreateContext && navigationCreateContext.length > 0 ) {
        var createOrderedObjects = searchResults.filter( function( mo ) {
            var uid = getRealUid( mo.uid );
            return navigationCreateContext.indexOf( uid ) !== -1;
        } ).sort( function( a, b ) {
            //context has oldest objects first
            return navigationCreateContext.indexOf( getRealUid( b.uid ) ) - navigationCreateContext.indexOf( getRealUid( a.uid ) );
        } );

        //Remove any created objects from the search results and
        //keep the original ordering for anything that was not created
        var originalOrderingResults = searchResults.filter( function( mo ) {
            var uid = getRealUid( mo.uid );
            return navigationCreateContext.indexOf( uid ) === -1;
        } );

        /**
         * Note: The current approach for moving newly created objects to the top will NOT
         * completely work for DCP, The model object the client has does not include DCP
         * properties, and the server does not always return all of the newly created objects.
         *
         * Replacing created objects with the objects returned from the server will fix this for
         * the first 50 items, but any newly created DCP object that is not in the first 50
         * folder items will not have DCP properties.
         */
        var serverUidsMap = searchResults.reduce( function( acc, nxt ) {
            var uid = getRealUid( nxt.uid );
            if( !acc[ uid ] ) {
                acc[ uid ] = [];
            }
            acc[ uid ].push( nxt );
            return acc;
        }, {} );
        createOrderedObjects.forEach( function( mo, idx ) {
            //If the server response also contains this object
            if( serverUidsMap[ mo.uid ] ) {
                createOrderedObjects[ idx ] = serverUidsMap[ mo.uid ];
            }
        } );
        //Flatten - can't do within forEach as it messes up indices
        createOrderedObjects = createOrderedObjects.reduce( function( acc, nxt ) {
            if( Array.isArray( nxt ) ) {
                return acc.concat( nxt );
            }
            acc.push( nxt );
            return acc;
        }, [] );

        //LCS-138644 - Above code will duplicate DCP objects in primary workarea, we are just getting rid of duplicates here.
        return _.uniq( createOrderedObjects.concat( originalOrderingResults ) );
    }
    return searchResults;
};

export let loadData = function( searchInput, columnConfigInput, saveColumnConfigData, objToSelectInfo ) {
    return soaService.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
            columnConfigInput: columnConfigInput,
            saveColumnConfigData: saveColumnConfigData,
            searchInput: searchInput,
            inflateProperties: true,
            noServiceData: false
        } )
        .then(
            function( response ) {
                if( response.searchResultsJSON ) {
                    response.searchResults = JSON.parse( response.searchResultsJSON );
                    delete response.searchResultsJSON;
                }
                getObjsToBeSelected( response, objToSelectInfo );
                // Create view model objects
                response.searchResults = response.searchResults &&
                    response.searchResults.objects ? response.searchResults.objects
                    .map( function( vmo ) {
                        return viewModelObjectService
                            .createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                    } ) : [];

                // Update IncompleteHeadTailInfo
                if( response.cursor ) {
                    updateVMNodesWithIncompleteHeadTailInfo( response.cursor, response.searchResults );
                }

                // Collect all the prop Descriptors
                var propDescriptors = [];
                _.forEach( response.searchResults, function( vmo ) {
                    _.forOwn( vmo.propertyDescriptors, function( value ) {
                        propDescriptors.push( value );
                    } );
                } );

                // Weed out the duplicate ones from prop descriptors
                response.propDescriptors = _.uniq( propDescriptors, false,
                    function( propDesc ) {
                        return propDesc.name;
                    } );
                return response;
            } );
};

/**
 * @param {Object} cursorInfo - cursor
 * @param {Array|Object} vmNodes - view model objects
 */
function updateVMNodesWithIncompleteHeadTailInfo( cursorInfo, vmNodes ) {
    var headChild = _.head( vmNodes );
    var lastChild = _.last( vmNodes );

    if( !cursorInfo.startReached ) {
        headChild.incompleteHead = true;
    }

    if( !cursorInfo.endReached ) {
        lastChild.incompleteTail = true;
    }
}

export const getRelatedModifiedInfo = ( eventData, baseSelection ) => {
    let matches = baseSelection && eventData.relatedModified.filter( function( mo ) {
        return mo.uid === baseSelection.uid;
    } );
    if( matches && matches.length > 0 || eventData.viewMode === 'Tree' ) {
        return {
            relatedModifiedInfo: {
                isRelatedModifiedBaseSelectionMatching: true,
                createdObjects: eventData.createdObjects,
                childObjects: eventData.childObjects,
                isPinnedFlag: eventData.isPinnedFlag,
                refreshLocationFlag: eventData.refreshLocationFlag,
                relatedModified: eventData.relatedModified,
                relations: eventData.relations
            }
        };
    }
    return {
        relatedModifiedInfo: undefined
    };
};

export const getObjsToBeSelected = ( response, objToSelectInfo ) => {
    if( response && objToSelectInfo && objToSelectInfo.relatedModifiedInfo ) {
        const { relatedModifiedInfo } = objToSelectInfo;
        let { evaluatedObjs } = getEvaluatedObjsForSelection( relatedModifiedInfo.createdObjects, response.searchResults.objects );
        updateNavigateContext( appCtxService.getCtx( 'locationContext.modelObject' ).uid, evaluatedObjs, relatedModifiedInfo.childObjects );
        //Select the newly created objects
        if( relatedModifiedInfo.createdObjects && !relatedModifiedInfo.isPinnedFlag ) {
            objToSelectInfo.selectionModel.addToSelection( evaluatedObjs );
        }
    }
};

export const clearRelatedModifiedInfo = ( data ) => {
    data.relatedModifiedInfo = undefined;
};

//Utility to add newly created objects to context
export const updateNavigateContext = ( uid, newObjects, cutObjects ) => {
    var ctx = _navigateContext + '.' + uid;
    var currentCtx = appCtxService.getCtx( ctx ) || [];
    //If new objects were added, add them into the context
    if( newObjects ) {
        var newUids = newObjects.map( function( mo ) {
            return mo.alternateID ? mo.alternateID : mo.uid;
        } );
        currentCtx = currentCtx.concat( newUids.filter( function( x ) {
            return currentCtx.indexOf( x ) === -1;
        } ) );
    }
    //If objects were cut remove them from the context
    if( cutObjects ) {
        var cutUids = cutObjects.map( function( mo ) {
            return mo.alternateID ? mo.alternateID : mo.uid;
        } );
        currentCtx = currentCtx.filter( function( uid ) {
            return cutUids.indexOf( uid ) === -1;
        } );
    }
    appCtxService.updatePartialCtx( ctx, currentCtx );
};


/**
 * Reloading objectNav state ; not doing a complete page refresh
 */
 export let reloadObjNavState = function() {
    AwStateService.instance.reload();
};

/**
 * Get the default page size used for max to load/return.
 *
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    var defaultPageSize = DEFAULT_PAGE_SIZE;

    if( defaultPageSizePreference ) {
        if( _.isArray( defaultPageSizePreference ) ) {
            defaultPageSize = exports.getDefaultPageSize( defaultPageSizePreference[ 0 ] );
        } else if( _.isString( defaultPageSizePreference ) ) {
            defaultPageSize = parseInt( defaultPageSizePreference );
        } else if( _.isNumber( defaultPageSizePreference ) && defaultPageSizePreference > 0 ) {
            defaultPageSize = defaultPageSizePreference;
        }
    }

    return defaultPageSize;
};

/**
 * Sort Criteria is updated
 *
 * @param {Object} dataprovider - the data provider
 */
export let sortCriteriaUpdated = function( data ) {
    //Now reset the navigation create context as sort has been applied and objects should appear in sort order unless newly created.
    appCtxService.updatePartialCtx( _navigateContext + '.' + data.parentUid, [] );
};

/**
 * Returns valid column config object
 *
 * @param {Object} data - the data
 * @param {Object} columnConfig - the columnConfig
 */
export let getValidColumnConfig = function( data, columnConfig ) {
    if( data.columnConfig.columnConfigId && data.columnConfig.columns ) {
        return data.columnConfig;
    }
    return columnConfig;
};

export default exports = {
    sortResults,
    loadData,
    reloadObjNavState,
    getRelatedModifiedInfo,
    clearRelatedModifiedInfo,
    getDefaultPageSize,
    updateNavigateContext,
    getObjsToBeSelected,
    sortCriteriaUpdated,
    getValidColumnConfig
};
