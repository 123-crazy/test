// @<COPYRIGHT>@
// ===========================================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ===========================================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * A service that has util methods which can be use in other js files
 *
 * @module js/aw.projects.service
 */

import app from 'app';
import soaService from 'soa/kernel/soaService';
import AwPromiseService from 'js/awPromiseService';
import editHandlerService from 'js/editHandlerService';
import tableStateService from 'js/awTableStateService';
import _ from 'lodash';

var exports = {};

/**
 *  Returns orgTreeData with the newly updated data for the expanded node
 * @param {Object} node currently expanding node from the treeLoadInput
 * @param {Object} orgTreeData org tree data from the context
 * @param {Object} data new data for the expanding node
 *
 * @returns {Object} updated org tree data
 */
export let _setParentNodeInHierarchy = function( node, orgTreeData, data ) {
    // get an array of parent Ids to iterate through the hierarchy; take into account possible subgroups
    var hierarchy = node.hierarchy.split( '.' );
    var id = 'Site';
    var currNode = orgTreeData.Site;
    for( var i = 1; i < hierarchy.length; i++ ) {
        id += '.' + hierarchy[ i ];
        currNode = currNode.hier[ id ];
    }
    // set the new data in the org tree data and return the new orgTreeData
    currNode = data;
    return orgTreeData;
};

/**
 * Remove passed in characters if the filterString starts and ends with it.
 * @param {Object} filterString the search string for the org tree.
 * @param {Object} charToRemove Characters to remove.
 *
 * @return {String} filterString
 */
var removeStartEndChar = function( filterString, charToRemove ) {
    for( var i = 0; i < charToRemove.length; i++ ) {
        var char = charToRemove.charAt( i );
        if( filterString.charAt( 0 ) === char && filterString.charAt( 0 ) === char ) {
            filterString = filterString.substring( 1, filterString.length - 1 );
        }
    }
    return filterString;
};

var _replaceRegExpChars = function( string, char ) {
    var charExp = new RegExp( char, 'g' );
    return string.replace( charExp, char );
};

/**
 * @return{String} User type.
 */
export let getUserType = function() {
    return 'User';
};

/**
 *
 * @param {Object} lowestFound lowest node in this branch of the org tree that contains the search string
 * @param {Array} groups array of displayNames for groups and subgroups
 * @param {String} role diplayName for role
 * @param {String} user displayName for user
 * @param {Object} orgTreeData org tree data
 * @param {Object} vmData viewmodel data
 * @param {String} gridId grid id
 */
export let _setNodesToExpand = function( lowestFound, groups, role, user, orgTreeData, vmData, gridId ) {
    var currNode = orgTreeData.Site;
    var hierarchy = 'Site';
    var index = groups.length - 1;
    while( currNode.node.id !== lowestFound.id ) {
        // set node to expand
        tableStateService.saveRowExpanded( vmData, gridId, currNode.node );

        if( index >= 0 ) {
            // next node should be a group/subgroup
            hierarchy += '.' + groups[ index ] + '_' + 'Group';
            index--;
        } else if( currNode.node.type !== 'Role' ) {
            // next node should be a role (if the current node is already role, then we get user)
            hierarchy += '.' + role + '_' + 'Role';
        } else {
            // next node should be user
            hierarchy += '.' + user + '_' + 'GroupMember';
        }
        currNode = currNode.hier[ hierarchy ];
    }
};

/**
 * Returns the groups, role, and user for the selected node based on the selected node's hierarchy
 * @param {Object} selectedNode ViewModelTreeNode that is currently selected
 * @returns {Object} the groups, role, and user for the selected node
 */
export let _getGroupRoleUser = function( selectedNode ) {
    // split hierarchy of node on . and retrieve groups, role, and user display names
    var hierarchyArray = selectedNode.hierarchy.split( '.' );
    var groups = _.filter( hierarchyArray, function( elem ) {
        return _.endsWith( elem, '_Group' );
    } ).reverse();
    groups.forEach( function( elem, index ) {
        groups[ index ] = elem.substring( 0, elem.lastIndexOf( '_' ) );
    } );

    var role = _.filter( hierarchyArray, function( elem ) {
        return _.endsWith( elem, '_Role' );
    } )[ 0 ];
    role = !_.isUndefined( role ) ? role.substring( 0, role.lastIndexOf( '_' ) ) : '';

    var user = _.filter( hierarchyArray, function( elem ) {
        return _.endsWith( elem, '_GroupMember' );
    } )[ 0 ];
    user = !_.isUndefined( user ) ? user.substring( 0, user.lastIndexOf( '_' ) ) : '';
    return {
        groups: groups,
        role: role,
        user: user
    };
};

export let _removeQuotesAddWildcards = function( string ) {
    if( _.isUndefined( string ) ) {
        return {
            string: '*',
            removeTrailingWildcard: false
        };
    }

    var removeTrailingWildcard = false;
    // if there are " " surrounding the string, remove " " and indicate if we should remove the ending *
    if( string.charAt( 0 ) === '"' && string.charAt( string.length - 1 ) === '"' ) {
        string = removeStartEndChar( string, '\"' );

        if( string.charAt( string.length - 1 ) !== '*' ) {
            string = string.concat( '*' );
            removeTrailingWildcard = true;
        }
    } else {
        if( string.charAt( string.length - 1 ) !== '*' ) {
            string = string.concat( '*' );
        }
    }
    return {
        string: string,
        removeTrailingWildcard: removeTrailingWildcard
    };
};

/**
 * Initializes a node for orgTreeData
 * @param {Object} vmNode node to initialize
 * @returns {Object} initialized object
 */
export let _getInitialObject = function( vmNode ) {
    var currentObj = {
        children: [],
        hier: {},
        fullExpansion: false,
        node: vmNode
    };

    return currentObj;
};

/**
 *_nodeIndex method Retruns index of node if exist else return -1
 *
 * @param {String} selectedNodeId current selected node id
 * @param {Array} availableNodes all available childrens of current expanded node
 *
 * @returns {Number} index of node
 */
export let _nodeIndex = function( selectedNodeId, availableNodes ) {
    for( var i = 0; i < availableNodes.length; i++ ) {
        if( selectedNodeId === availableNodes[ i ].id ) {
            return i;
        }
    }
    return -1;
};

/**
 * This generates a regular expression that can be used for
 * @param {String} string string that we will be generating the regex for
 * @returns {RegExp} the formatted regular expression
 */
export let generateRegex = function( string ) {
    var parsedData = exports._removeQuotesAddWildcards( string );
    string = parsedData.string;

    // remove trailing wildcard if the user did not add it themselves (i.e. it was implicitly added)
    if( parsedData.removeTrailingWildcard ) {
        string = string.substring( 0, string.length - 1 );
    }

    // add '\' before any characters special to reg expressions
    var chars = [ '\\\\', '\\(', '\\)', '\\+', '\\[', '\\]', '\\$', '\\^', '\\|', '\\?', '\\.', '\\{', '\\}', '\\!', '\\=', '\\<' ];
    for( var n = 0; n < chars.length; n++ ) {
        string = _replaceRegExpChars( string, chars[ n ] );
    }

    var regExpString = '^(';
    var splitString = string.split( '*' );
    if( splitString.length > 1 ) {
        for( var i = 0; i < splitString.length; i++ ) {
            regExpString += splitString[ i ] + '.*';
        }
        // remove extra .* from end
        regExpString = regExpString.substring( 0, regExpString.lastIndexOf( '.*' ) );
    } else {
        regExpString += splitString[ 0 ];
    }
    regExpString += ')$';
    var regExp = new RegExp( regExpString, 'i' );
    return regExp;
};

/**
 * Common method to process response and return err object
 * @param  {Object}  response - response from SOA
 *
 * @return {Object} 'error' object
 */
export let handleSOAResponseError = function( response ) {
    var err;
    if( response && response.partialErrors ) {
        err = soaService.createError( response.partialErrors );
        err.message = '';
        _.forEach( response.partialErrors, function( partialError ) {
            _.forEach( partialError.errorValues, function( object ) {
                err.message += '<BR/>';
                err.message += object.message;
            } );
        } );
    }
    return err;
};

/**
 * Return rejection Promise object from err object
 * @param  {Object}  err - 'error' object
 *
 * @return {Promise} 'rejection' Promise
 */
export let getRejectionPromise = function( err ) {
    var deferred = AwPromiseService.instance.defer();
    deferred.reject( err );
    return deferred.promise;
};

export default exports = {
    _setParentNodeInHierarchy,
    getUserType,
    _setNodesToExpand,
    _getGroupRoleUser,
    _removeQuotesAddWildcards,
    _getInitialObject,
    _nodeIndex,
    generateRegex,
    handleSOAResponseError,
    getRejectionPromise
};
/**
 * Register the service
 *
 * @memberof NgServices
 * @member awProjectsService
 *
 * @param {Object} soaService soa service functions
 * @param {Object} $q functions
 * @param {Object} editHandlerService functions
 * @param {Object} tableStateService functions
 *
 * @returns {Object} export functions
 */
app.factory( 'awProjectsService', () => exports );
