// Copyright (c) 2020 Siemens

/**
 * This service handles toolbars sublocation of command builder
 *
 * @module js/toolbarsSublocationService
 *
 * @namespace toolbarsSublocationService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import awTableSvc from 'js/awTableService';
import graphQLModelSvc from 'js/graphQLModelService';
import graphQLSvc from 'js/graphQLService';
import localeSvc from 'js/localeService';
import uwPropertySvc from 'js/uwPropertyService';
import _ from 'lodash';

// eslint-disable-next-line valid-jsdoc
/**
 * Define public API
 */
var exports = {};
/**
 * Setup to map labels to local names.
 */
var _localeMap = {};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.commandTitle', true ).then( result => _localeMap.title = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.commandIcon', true ).then( result => _localeMap.icon = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.commandType', true ).then( result => _localeMap.type = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.id', true ).then( result => _localeMap.id = result );
};

// ***********************************************************
var _gqlQueryAnchor = `query($id: ID!, $locale: String) {
                anchor(id: $id) {
                  id
                  title {
                    value(locale: $locale)
                  }
                }
              }`;

// ***********************************************************
var _gqlQueryCommand = `query($id: ID!, $locale: String) {
                command(id: $id) {
                  id
                  title {
                    value(locale: $locale)
                  }
                }
              }`;

// ***********************************************************
var _gqlQueryAnchors = `query($filter: String, $locale: String) {
                anchors(filter: $filter) {
                  id
                  title {
                    value(locale: $locale)
                  }
                }
              }`;

// ***********************************************************
var _gqlQueryPlacementsNode = `query($filter: CommandPlacementFilter, $locale: String) {
                commandPlacements(filter: $filter) {
                  id
                  parentCommand {
                    id
                  }
                  command {
                    cmdId: id
                    cmdTitle: title {
                      value(locale: $locale)
                    }
                    cmdType: type
                    cmdIcon: icon {
                      id
                      url
                    }
                  }
                }
              }`;

// ***********************************************************
var _gqlQueryPlacementsRow = `query($filter: CommandPlacementFilter, $locale: String) {
                commandPlacements(filter: $filter) {
                  id
                  priority
                  parentCommand {
                    id
                  }
                  command {
                    id
                    title {
                      value(locale: $locale)
                    }
                    icon {
                      id
                      url
                    }
                  }
                  relativeTo {
                    id
                  }
                }
              }
              `;

/**
 * Define named constant values.
 */
var _isSimplePage = true; // since all children are being returned, no extra paging is needed.
var _startReached = true;
var _endReached = true;

var _newTopNode = null;
var _makeEditable = false;

/**
 * Retrieve commands table data for toolbars sublocation
 *
 * @param {GraphQLResult} gqlResult - Object returned from a GraphQL query with a collection of GraphQL
 * {Anchor} objects.
 *
 * @param {ViewModelTreeNode} parentNode - The 'parent' node directly above the nodes being created here.
 *
 * @returns {ViewModelTreeNodeArray} Array of {ViewModelTreeNode} 'child' objects of the given 'parent'.
 */
function _convertAnchorsToVMTreeNodes( gqlResult, parentNode ) {
    var vmNodes = [];

    var gqlAnchors = _.get( gqlResult, 'data.anchors' );

    var childNdx = 0;
    var childLevel = parentNode.levelNdx + 1;
    var isLeaf = childLevel > 0;

    _.forEach( gqlAnchors, function( gqlAnchor ) {
        gqlAnchor.nodeId = _.get( gqlAnchor, 'id' );

        var vmNode = graphQLModelSvc.convertGqlItemToVMTreeNode( gqlAnchor, graphQLModelSvc.TYPE.AnchorNode,
            _makeEditable, _localeMap, childLevel, childNdx++, null,
            'title.value', 'icon' );

        vmNode.isLeaf = isLeaf;

        vmNodes.push( vmNode );
    } );

    return vmNodes;
}

/**
 * Retrieve commands table data for toolbars sublocation
 *
 * @param {GraphQLResult} gqlResult - Object returned from a GraphQL query with a collection of GraphQL
 * {Anchor} objects.
 *
 * @param {ViewModelTreeNode} parentNode - The 'parent' node directly above the nodes being created here.
 *
 * @returns {ViewModelTreeNodeArray} Array of {ViewModelTreeNode} 'child' objects of the given 'parent'.
 */
function _convertPlacementsToVMTreeNodes( gqlResult, parentNode ) {
    var vmNodes = [];

    var gqlPlacements = _.get( gqlResult, 'data.commandPlacements' );

    var childNdx = 0;
    var childLevel = parentNode.levelNdx + 1;

    _.forEach( gqlPlacements, function( gqlPlacement ) {
        gqlPlacement.nodeId = _.get( gqlPlacement, 'command.cmdId' );

        var vmNode = graphQLModelSvc.convertGqlItemToVMTreeNode( gqlPlacement,
            graphQLModelSvc.TYPE.PlacementNode, _makeEditable, _localeMap, childLevel, childNdx++, null,
            'command.cmdTitle.value', 'command.cmdIcon' );

        var vmProps = graphQLModelSvc.convertGqlPropsToVMProps( gqlPlacement.command, _localeMap, null );

        _.forEach( vmProps, function( vmProp ) {
            vmNode.props[ vmProp.propertyName ] = vmProp;
        } );

        vmNode.isLeaf = vmNode.props.cmdType.dbValue !== 'GROUP';

        var relativeToObj = _.get( vmNode, 'props.relativeTo.dbValue' );

        if( relativeToObj ) {
            var relativeToIdValue = _.get( relativeToObj, 'id' );

            if( relativeToIdValue ) {
                vmNode.props.relativeToId = graphQLModelSvc.convertGqlPropToVMProp( relativeToIdValue, 'relativeToId', _localeMap );

                var relativeToTitleValue = _.get( relativeToObj, 'title.value' );

                if( relativeToTitleValue ) {
                    vmNode.props.relativeToTitle = graphQLModelSvc.convertGqlPropToVMProp( relativeToTitleValue, 'relativeToTitle', _localeMap );
                }
            }
        }

        vmNodes.push( vmNode );
    } );

    return vmNodes;
}

/**
 * Convert GraphQL {Anchor} (a.k.a. Toolbar) or {Command} definition to a collection of {ViewModelProperty}
 * objects for display in a 'summary' or 'column'.
 *
 * @param {GraphQLResult} gqlResult - Object returned from a GraphQL query with a SINGLE GraphQL {Anchor} or
 * {Command} object.
 *
 * @returns {ViewModelPropertyArray} Collection of {ViewModelProperty} objects set with properties from
 * given input.
 */
function _convertGqlItemToVMProps( gqlResult ) {
    var gqlItem = _.get( gqlResult, 'data.anchor' );

    if( !gqlItem ) {
        gqlItem = _.get( gqlResult, 'data.command' );
    }

    return graphQLModelSvc.convertGqlPropsToVMProps( gqlItem, _localeMap );
}

/**
 * Convert a collection of GraphQL {CommandPlacement} definitions to a collection of {ViewModelObject}.
 *
 * @param {GraphQLResult} gqlResult - Object returned from a GraphQL query with a collection of GraphQL
 * {CommandPlacement} objects.
 *
 * @param {DeclViewModel} declViewModelIn - (Optional) A {DeclViewModel} to set into the 'up' pointers on
 * each {ViewModelProperty}.
 *
 * @returns {ViewModelObjectArray} A collection of new VMO initialized based on properties in the given
 * input.
 */
function _convertPlacementsToVMOs( gqlResult, declViewModelIn ) {
    var vmos = [];

    var gqlPlacements = _.get( gqlResult, 'data.commandPlacements' );

    _.forEach( gqlPlacements, function( gqlPlacement ) {
        var gqlPlacementIn = _.omit( gqlPlacement, [ 'command' ] );
        var gqlCommand = _.get( gqlPlacement, 'command' );

        var vmo = graphQLModelSvc.convertGqlItemToVMO( gqlPlacementIn, graphQLModelSvc.TYPE.Placement, true );
        vmos.push( vmo );

        if( gqlCommand ) {
            var commandVmo = graphQLModelSvc.convertGqlItemToVMO( gqlCommand, graphQLModelSvc.TYPE.Placement, true );
            commandVmo.props.cmdId = commandVmo.props.id;
            commandVmo.props = _.omit( commandVmo.props, [ 'id' ] );
            _.merge( vmo, commandVmo );
        }

        _.forEach( vmo.props, function( vmProp, propName ) {
            graphQLModelSvc.assureVMPropType( vmProp );

            if( propName === 'priority' ) {
                uwPropertySvc.setIsPropertyModifiable( vmProp, true );
                uwPropertySvc.setEditState( vmProp, true, true );
            } else if( propName === 'relativeTo' ) {
                vmProp.hasLov = true;
                vmProp.dataProvider = 'getRelativeToCommandsDP';
                vmProp.getViewModel = function() {
                    return declViewModelIn;
                };
                uwPropertySvc.setIsPropertyModifiable( vmProp, true );
                uwPropertySvc.setEditState( vmProp, true, true );
            } else {
                uwPropertySvc.setIsPropertyModifiable( vmProp, false );
                uwPropertySvc.setEditState( vmProp, false, false );
            }
        } );
    } );

    return vmos;
}

/**
 * Convert a collection of GraphQL {Anchor} (a.k.a. Toolbar) definitions to a collection of
 * {ViewModelObject} objects for display in a 'list' or 'table'.
 *
 * @param {GraphQLResult} gqlResult - Object returned from a GraphQL query with a collection of GraphQL
 * {Anchor} objects.
 *
 * @returns {Array} array of view model objects
 */
export let convertAnchorsToVMOs = function( gqlResult ) {
    var vmos = [];

    var gqlAnchors = _.get( gqlResult, 'data.anchors' );

    _.forEach( gqlAnchors, function( gqlAnchor ) {
        var vmo = graphQLModelSvc.convertGqlItemToVMO( gqlAnchor, graphQLModelSvc.TYPE.Anchor, false );

        vmos.push( vmo );
    } );

    return vmos;
};

/**
 * @param {DeclViewModel} declViewModel - The view model.
 * @returns {Promise} Resolved with the {GraphQLResult} of a query for the {Anchor} or {Command} definition
 * for the currently selected VMO.
 */
export let loadSelectedSummaryData = function( declViewModel ) {
    var selectedVMO = _.get( declViewModel, 'eventData.dataProvider.selectedObjects[0]' );

    if( !selectedVMO ) {
        selectedVMO = appCtxSvc.getCtx( 'selected' );
    }

    var result = {
        commandDefProps: [],
        placementList: []
    };

    if( selectedVMO ) {
        var gqlQueryProps;
        var gqlQueryPlacements;

        switch ( selectedVMO.type ) {
            default:
            case graphQLModelSvc.TYPE.Anchor:
            case graphQLModelSvc.TYPE.AnchorNode:
                gqlQueryProps = {
                    endPoint: 'graphql',
                    request: {
                        query: _gqlQueryAnchor,
                        variables: {
                            id: selectedVMO.uid
                        }
                    }
                };

                gqlQueryPlacements = {
                    endPoint: 'graphql',
                    request: {
                        query: _gqlQueryPlacementsRow,
                        variables: {
                            filter: {
                                anchor: selectedVMO.uid
                            }
                        }
                    }
                };
                break;

            case graphQLModelSvc.TYPE.PlacementNode:
                var parentCmdId = _.get( selectedVMO, 'props.cmdId.dbValue' );

                if( parentCmdId ) {
                    gqlQueryProps = {
                        endPoint: 'graphql',
                        request: {
                            query: _gqlQueryCommand,
                            variables: {
                                id: parentCmdId
                            }
                        }
                    };

                    var cmdType = _.get( selectedVMO, 'props.cmdType.dbValue' );

                    if( cmdType === 'GROUP' ) {
                        gqlQueryPlacements = {
                            endPoint: 'graphql',
                            request: {
                                query: _gqlQueryPlacementsRow,
                                variables: {
                                    filter: {
                                        parentGroupId: parentCmdId
                                    }
                                }
                            }
                        };
                    }
                }

                break;
        }

        var deferreds = [];

        if( gqlQueryProps ) {
            deferreds[ 0 ] = graphQLSvc.callGraphQL( gqlQueryProps ).then( function( gqlResult ) {
                return _convertGqlItemToVMProps( gqlResult );
            } );
        }

        if( gqlQueryPlacements ) {
            deferreds[ 1 ] = graphQLSvc.callGraphQL( gqlQueryPlacements ).then( function( gqlResult ) {
                return _convertPlacementsToVMOs( gqlResult, declViewModel );
            } );
        }

        return AwPromiseService.instance.all( deferreds ).then( function( results ) {
            var finalResult = {};

            if( results[ 0 ] ) {
                finalResult.commandDefProps = results[ 0 ];
            } else {
                finalResult.commandDefProps = [];
            }

            if( results[ 1 ] ) {
                finalResult.placementList = results[ 1 ];
            } else {
                finalResult.placementList = [];
            }

            return finalResult;
        } );
    }

    return AwPromiseService.instance.resolve( result );
};

/*
 * Called by dataProvider to load {Anchor} (for 1st level) or {CommandPlacement} (for 2-Nth level) object
 * 'children' of the given 'parent' node.
 *
 * @param {TreeLoadInput} treeLoadInput - The object defining the (root) 'parent' node and options for the
 * load.
 *
 * @returns {TreeLoadResult} The result of loading the {Anchor} or {CommandPlacement} objects as
 * {ViewModelTreeNode} objects (as 'child' nodes).
 */
export let loadTreeTableData = function( treeLoadInput ) {
    var parentNode = treeLoadInput.parentNode;
    var gqlQuery;

    /**
     * Load 1st level {Anchor} nodes
     */
    if( parentNode.levelNdx === -1 ) {
        gqlQuery = {
            endPoint: 'graphql',
            request: {
                query: _gqlQueryAnchors,
                variables: {
                    filter: appCtxSvc.getCtx( 'search.criteria.searchString' )
                }
            }
        };

        return graphQLSvc.callGraphQL( gqlQuery ).then( function( gqlResult ) {
            var childNodes = _convertAnchorsToVMTreeNodes( gqlResult, treeLoadInput.parentNode );

            return {
                treeLoadResult: awTableSvc.buildTreeLoadResult( treeLoadInput, childNodes,
                    _isSimplePage, _startReached, _endReached, _newTopNode )
            };
        } );
    }

    /**
     * Load Nth level {Anchor} or {Placement} nodes
     */
    switch ( parentNode.type ) {
        case graphQLModelSvc.TYPE.AnchorNode:
            gqlQuery = {
                endPoint: 'graphql',
                request: {
                    query: _gqlQueryPlacementsNode,
                    variables: {
                        filter: {
                            anchor: parentNode.uid
                        }
                    }
                }
            };

            break;

        case graphQLModelSvc.TYPE.PlacementNode:
            var cmdType = _.get( parentNode, 'props.cmdType.dbValue' );

            if( cmdType === 'GROUP' ) {
                var parentGroupId = _.get( parentNode, 'props.cmdId.dbValue' );

                if( parentGroupId ) {
                    gqlQuery = {
                        endPoint: 'graphql',
                        request: {
                            query: _gqlQueryPlacementsNode,
                            variables: {
                                filter: {
                                    parentGroupId: parentGroupId
                                }
                            }
                        }
                    };
                }

                break;
            }
    }

    if( gqlQuery ) {
        return graphQLSvc.callGraphQL( gqlQuery ).then( function( gqlResult ) {
            var childNodes = _convertPlacementsToVMTreeNodes( gqlResult, parentNode );

            return {
                treeLoadResult: awTableSvc.buildTreeLoadResult( treeLoadInput, childNodes,
                    _isSimplePage, _startReached, _endReached, _newTopNode )

            };
        } );
    }

    return {
        treeLoadResult: awTableSvc.buildTreeLoadResult( treeLoadInput, [],
            _isSimplePage, _startReached, _endReached, _newTopNode )
    };
};

/**
 * Return active ViewModelObject where a cell is being edited in handlers/placements table
 *
 * @param {Object} activeObject - active object
 *
 * @returns {Object} active ViewModelObject where a cell is being edited in handlers/placements table
 */
export let updateActiveObject = function( activeObject ) {
    return activeObject;
};

exports = {
    loadConfiguration,
    convertAnchorsToVMOs,
    loadSelectedSummaryData,
    loadTreeTableData,
    updateActiveObject
};
export default exports;

loadConfiguration();

/**
 * This service handles toolbars sublocation of command builder
 *
 * @member toolbarsSublocationService
 * @memberof NgServices
 */
app.factory( 'toolbarsSublocationService', () => exports );
