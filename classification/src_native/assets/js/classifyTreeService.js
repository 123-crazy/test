/* eslint-disable max-lines */
/* eslint-disable no-bitwise */
// Copyright 2018 Siemens Product Lifecycle Management Software Inc.
/*
global
 define
 */

/**
 * This is a utility to format the response for the classification hierarchy to be compatible with the generic
 * property widgets.
 *
 * @module js/classifyTreeService
 */
import app from 'app';
import soaService from 'soa/kernel/soaService';
import AwPromiseService from 'js/awPromiseService';
import AwTimeoutService from 'js/awTimeoutService';
import appCtxService from 'js/appCtxService';
import localeService from 'js/localeService';
import awTableSvc from 'js/awTableService';
import awColumnSvc from 'js/awColumnService';
import iconSvc from 'js/iconService';
import highlighterSvc from 'js/highlighterService';
import uwPropertyService from 'js/uwPropertyService';
import classifyUtils from 'js/classifyUtils';
import classifyService from 'js/classifyService';
import TcServerVersion from 'js/TcServerVersion';
import searchSimilarService from 'js/searchSimilarService';
import awTableStateService from 'js/awTableStateService';
import _ from 'lodash';
import eventBus from 'js/eventBus';


import 'js/aw-cls-treetable-command-cell.directive';

var exports = {};

var max_safe_number = !Number.MAX_SAFE_INTEGER ? Math.pow( 2, 53 ) - 1 : Number.MAX_SAFE_INTEGER;
var serviceName = 'Internal-IcsAw-2019-12-Classification';
var operationName = 'findClassificationInfo3';

/**
 * Helper method for updating viewer data(imageviewer) for the selected class/Node in the tree.
 */
let  updateImageViewerData = function( ) {
    if( appCtxService.ctx.SearchSimilarActive ) {
        return;
    }
    if( appCtxService.ctx.clsLocation && appCtxService.ctx.clsLocation.selectedTreeNode && appCtxService.ctx.clsLocation.selectedTreeNode.id ) {
        var searchCriteria = {};
        searchCriteria.searchAttribute = classifyService.UNCT_CLASS_ID;
        searchCriteria.searchString = appCtxService.ctx.clsLocation.selectedTreeNode.id;
        searchCriteria.sortOption = classifyService.UNCT_SORT_OPTION_CLASS_ID;
        var request = {
            workspaceObjects: [],
            searchCriterias: [ searchCriteria ],
            classificationDataOptions: 4
        };
        soaService.post( serviceName, operationName, request ).then( function( response ) {
            // update the class images in the classification location.
            exports.updateImageAndPublishEvent( response.clsClassDescriptors, appCtxService.ctx.clsLocation );
        } );
    }
};


/**
 * If there exists class images for the selected class, then update them in the ctx and fire appropriate event.
 * @param {object} clsClassDescriptors clsClassDescriptors from SOA response
 * @param {object} ctx Global context
 */
export let updateImageAndPublishEvent = function( clsClassDescriptors, ctx ) {
    if( clsClassDescriptors && clsClassDescriptors[ ctx.selectedClass.id ] &&
        clsClassDescriptors[ ctx.selectedClass.id ].documents &&
        clsClassDescriptors[ ctx.selectedClass.id ].documents.length > 0 ) {
        // Load the class images and publish the event to process image attachments
        ctx.datasetFilesOutput = clsClassDescriptors[ ctx.selectedClass.id ].documents;
        eventBus.publish( 'aw-cls-image-chart.contentLoaded' );
    } else {
        // Clear the data
        ctx.datasetFilesOutput = null;
        eventBus.publish( 'aw-cls-image-chart.contentLoaded' );
    }
};

/**
 * Returns the data options to be sent to the findClassificationInfo2 SOA based on ctx.sortOption.
 * @param {object} ctx Global context
 * @return {Number} Returns the classification data option to be sent to server
 */
export let getClassificationDataOptions = function( ctx ) {
    var clsDataOption = 0;
    if( ctx.sortOption ) {
        clsDataOption += ctx.sortOption;
    } else if( ctx.sortOption === undefined ) {
        // Let's sort based on CLASS_NAME
        if( ctx.supportedReleaseForSort ) {
            clsDataOption += classifyService.LOAD_CLASS_CHILDREN_ASC;
        } else {
            clsDataOption += classifyService.loadClassChildren;
        }
    } else {
        if( ctx.supportedReleaseForSort ) {
            clsDataOption += classifyService.LOAD_CLASS_CHILDREN_DEFAULT;
        } else {
            clsDataOption += classifyService.loadClassChildren;
        }
    }
    // Since we are always getting the storage metadata for now
    // TBD - Check if this and LOAD_CLASS_CHILDREN value is to be passed on if searchActive = true
    if( ctx.tableSummaryDataProviderName !== 'getClassTableSummary' ) {
        clsDataOption += classifyService.loadStorageMetadata;
    }
    return clsDataOption;
};

/** IMP :
 * Following method is being duplicated from classifySearchService.
 * We have BETA stabilization issue which occurs only production environment.
 * Thus code duplication is needed in-order-to resolve the issue,  considering run-way
 * If any changes are being made in classifySearchSerivce::resetScope(), ensure to do here as well
 **/

/**
 * Following method resets the application context variables, this would get called only while launching the filter panel
 * @param {*} data Declarative view model
 * @param {*} ctx Application context
 */
export let resetScope = function( data, ctx ) {
    appCtxService.updateCtx( 'selected', null );
    appCtxService.updateCtx( 'mselected', null );
    // if ( ctx.clsLocation ) {
    //     ctx.clsLocation.showParentVnc = undefined;
    // }
    eventBus.publish( 'primaryWorkArea.reset' );

    eventBus.publish( 'dataProvider.selectionChangeEvent', {
        selected: ctx.selections,
        source: 'secondaryWorkArea',
        dataProviderName: 'listDataProvider'
    } );
    ctx.clsLocation = ctx.clsLocation || {};
    ctx.clsLocation.tableSummaryDataProviderName = 'getClassTableSummary';
    data.tableSummaryDataProviderName = 'getClassTableSummary';
    exports.clearClassBreadCrumb( data, ctx.clsLocation );
    ctx.clsLocation.isChildVNC = ctx.clsLocation.isVNCaction = ctx.clsLocation.selectedNode = ctx.clsLocation.selectedTreeNode = null;
    ctx.clsLocation.chartProvider = null;
    ctx.clsLocation.panelIsClosed = false;
    ctx.clsLocation.selectedTreeNode = null;
    ctx.clsLocation.selectedNode = null;
    ctx.clsLocation.selectedClass = null;
    ctx.clsLocation.prevSelectedClass = null;
    ctx.clsLocation.isNavigating = false;
    ctx.clsLocation.expansionCounter = 0;
    data.bulkFiltersMap = {};
    // Resetting searchResponseInfo will also reset the data.categories
    ctx.searchResponseInfo = {};
    ctx.clsLocation.bulkFiltersMap = _.clone( data.bulkFiltersMap );

    ctx.clsLocation.supportedReleaseForSort = classifyUtils.checkIfSupportedTcVersionForSort( TcServerVersion.majorVersion,
        TcServerVersion.minorVersion, TcServerVersion.qrmNumber );
};

/**
 * We are using below function when tree needs to be created . Same function will be used in both initialize and next action mode.
 * We need to use it for expanding the tree as well.
 * @param {object} treeLoadInput Tree load input
 * @param {object} data Declarative view model
 * @param {object} ctx Global context
 * @return {Promise} Resolved with an object containing the results of the operation.
 */
export let getTreeStructure = function( treeLoadInput, data, ctx ) {
    appCtxService.ctx.parentClick = function( vncScope, node, isLast, index ) {
        vncScope.isVNCaction = true;
        //appCtxSvc.ctx.clsTab.panelIsClosed = true;
        vncScope.parents.push( node );
        vncScope.selectedNode = node;
        vncScope.selectedNode.indexOfNode = index;
        if( vncScope.panelIsClosed === false ) {
            eventBus.publish( vncScope.tableSummaryDataProviderName + '.VNCisSelected' );
        } else {
            eventBus.publish( vncScope.tableSummaryDataProviderName + '.VNCisSelectedWhenPanelIsClosed' );
        }
    };

    appCtxService.ctx.childClick = function( vncScope, childNode, parentNode ) {
        vncScope.isVNCaction = true;
        vncScope.isChildVNC = true;
        vncScope.parents.push( parentNode );
        vncScope.parents.push( childNode );
        vncScope.selectedNode = childNode;
        if( vncScope.panelIsClosed === false ) {
            eventBus.publish( vncScope.tableSummaryDataProviderName + '.VNCisSelected' );
        } else {
            eventBus.publish( vncScope.tableSummaryDataProviderName + '.VNCisSelectedWhenPanelIsClosed' );
        }
    };

    if( data && ctx && data !== undefined && ctx !== undefined ) {
        var deferred = AwPromiseService.instance.defer();

        if( appCtxService.ctx.SearchSimilarActive ) {
            searchSimilarService.switchToFilterPanel();
            return deferred.promise;
        }

        if( ctx === undefined || ctx === null ) {
            exports.resetScope( data, appCtxService.ctx );
            ctx = appCtxService.ctx.clsLocation;
        }
        treeLoadInput.pageSize = max_safe_number;

        if( ctx.sortOption || data.panelMode === 0 || data.panelMode === 1 ) {
            treeLoadInput.retainTreeExpansionStates = false;
        }

        treeLoadInput = awTableSvc.findTreeLoadInput( arguments );
        ctx.treeLoadInput = treeLoadInput;
        ctx.treeLoadInput.displayMode = 'Tree';

        var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

        if( failureReason ) {
            deferred.reject( failureReason );

            return deferred.promise;
        }
        // If it is not in classification tab's create/edit mode and if it is not Navigate tab mode, then return empty tree
        // This will prevent unncessary SOA calls at the start of going to classification tab.
        if( data.panelMode !== 0 && data.panelMode !== 1 && data.activeView !== 'Awp0ClassificationFilter' ) {
            treeLoadInput = Object.assign( {}, ctx.treeLoadInput );
            var tempCursorObject = {
                endReached: true,
                startReached: true
            };
            treeLoadInput.parentNode.cursorObject = tempCursorObject;

            var treeLoadEmptyResult = awTableSvc.buildTreeLoadResult( treeLoadInput, [], false, true, true, null );

            deferred.resolve( {
                treeLoadResult: treeLoadEmptyResult
            } );
            return deferred.promise;
        }

        buildTreeTableStructure( deferred, ctx.treeLoadInput, data, ctx );
        return deferred.promise;
    }
};

/**
 * Private function
 * Calls SOA and handles the response
 * @param {*} deferred deferred input
 * @param {*} treeLoadInput Tree load input
 * @param {*} data The view model data object
 * @param {*} ctx context
 */
function buildTreeTableStructure( deferred, treeLoadInput, data, ctx ) {
    data.numOfResults = null;
    var finaltree = [];
    var finalVMTNodes = [];

    var tempCursorObject = {
        endReached: true,
        startReached: true
    };
    var searchCriteria = {};
    var clsDataOptValue = 0;
    var workspaceObjects = [];

    searchCriteria.searchAttribute = classifyService.UNCT_CLASS_ID;
    if( treeLoadInput.parentNode.levelNdx === -1 ) {
        if( ctx.breadcrumbs && ctx.breadcrumbs.length > 0 ) {
            ctx.savedBreadCrumbs = _.clone( ctx.breadcrumbs );
            ctx.isNavigatingToNode = false;
        }
        searchCriteria.searchString = 'ICM';
        // Set the value to load class suggestions only if top level hierarchy is getting loaded
        // Won't be sent in case of searchActive = true
        if( ctx.workspaceObjectsForSOA && ctx.workspaceObjectsForSOA.length >= 1 ) {
            clsDataOptValue = classifyService.loadClassSuggestions;
            workspaceObjects = ctx.workspaceObjectsForSOA;
        }
    } else {
        searchCriteria.searchString = treeLoadInput.parentNode.id;
    }
    searchCriteria.sortOption = classifyService.UNCT_SORT_OPTION_CLASS_ID;

    var request;

    var highlightText = {
        additionalSearchInfoMap: {
            searchTermsToHighlight: [
                data.searchBox.dbValue
            ]
        }
    };

    exports.getHighlightKeywords( highlightText, ctx );

    var searchActive;
    if( data !== undefined && data.searchBox !== undefined ) {
        searchActive = data.searchBox.dbValue && data.searchBox.dbValue !== '' && data.searchBox.dbValue.trim() !== '*';
    }
    var releasesString = '';
    var releasesActive = false;
    var displayReleases = false;
    var releases = 0;
    var struct = isReleaseActive( ctx, data, searchCriteria, clsDataOptValue );

    // The string of releases to append to the searchString for SOA request.
    releasesString = struct.releasesString;

    // Determines if releases are active, and whether or not to append to the search string, and replace the searchAttribute in the SOA request.
    releasesActive = struct.releasesActive;

    // Determines whether or not VNC/Heirarchy nodes should have their names appended with their release, does not occur if only 1 release is selected.
    displayReleases = struct.displayReleases;

    // The currently selected releases
    releases = struct.releases;

    // eslint-disable-next-line no-extra-parens
    if( ctx.releases && releasesActive && clsDataOptValue === 0 || ( !ctx.releases && releasesActive && clsDataOptValue === 0 && searchCriteria.searchString === treeLoadInput.parentNode.id ) ) {
        // Do not search with releases if selecting Heirarchy arrows
        releasesActive = false;
        data.isTreeExpanding = false;
    }
    /**
     * If search operation is being performed
     */


     if( searchActive && !data.isTreeExpanding || searchActive && releasesActive || !searchActive && releasesActive ) {
        data.isTreeExpanding = false;

        // Add Releases to Search
        // Check if all items selected, if true dont update.
        if( releasesActive && searchActive ) {
            request = {
                workspaceObjects: [],
                searchCriterias: classifyService.parseSearchString( data.searchBox.dbValue.trim() ),
                classificationDataOptions: 0
            };
            request.searchCriterias[ 0 ].searchAttribute = 'CLASSNAME_SOURCESTANDARD';
            request.searchCriterias[ 0 ].searchString += releasesString;
        } else if( releasesActive && !searchActive ) {
            request = {
                workspaceObjects: workspaceObjects,
                searchCriterias: [ searchCriteria ],
                classificationDataOptions: clsDataOptValue + exports.getClassificationDataOptions( ctx )
            };
            searchCriteria.searchAttribute = 'CLASSID_SOURCESTANDARD';
            searchCriteria.searchString += releasesString;
        } else if( !releasesActive && searchActive ) {
            request = {
                workspaceObjects: [],
                searchCriterias: classifyService.parseSearchString( data.searchBox.dbValue.trim() ),
                classificationDataOptions: 0
            };
        }

        soaService.post( serviceName, operationName, request ).then( function( response ) {
            var treeLoadInput;
            if( !response.clsClassDescriptors || !response.classParents ) {
                treeLoadInput = Object.assign( {}, ctx.treeLoadInput );
                treeLoadInput.parentNode.cursorObject = tempCursorObject;
                var treeLoadEmptyResult = awTableSvc.buildTreeLoadResult( treeLoadInput, [], false, true, true, null );
                deferred.resolve( {
                    treeLoadResult: treeLoadEmptyResult
                } );
                ctx.currentLevel = {
                    children: []
                };
                ctx.initialHierarchy = ctx.currentLevel;
                eventBus.publish( 'clsBreadCrumb.refresh' );
                return deferred.promise;
            }

            var parentResults = response.classParents;
            var mappedArr = {};
            var outputs = response.clsClassDescriptors;

            // Set temporary hierarchy root to handle eclass hierarchy
            _.forEach( parentResults, function( node ) {
                var parentList = node.parents;
                if( parentList.length === 0 || parentList[ parentList.length - 1 ].properties[ 0 ].values[ 0 ].displayValue !== 'SAM' ) {
                    exports.addTemporaryRootToHierarchy( parentList );
                }
            } );

            _.forEach( outputs, function( output ) {
                var id = classifyUtils.getPropertyValueFromArray( output.properties, classifyService.UNCT_CLASS_ID );
                var className = classifyUtils.getPropertyValueFromArray( output.properties, classifyService.UNCT_CLASS_NAME );
                var type = classifyUtils.getPropertyValueFromArray( output.properties, classifyService.UNCT_CLASS_TYPE );
                var temp = {
                    id: id,
                    className: className,
                    parentid: classifyUtils.getPropertyValueFromArray( parentResults[ id ].parents[ '0' ].properties, classifyService.UNCT_CLASS_ID ),
                    level: parentResults[ id ].parents.length,
                    type: type,
                    typeIconFileUrl: classifyService.getIcon( output )
                };

                if( displayReleases ) {
                    appendNames( temp, output.properties );
                }
                if( !mappedArr[ id ] ) {
                    mappedArr[ id ] = temp;
                    mappedArr[ id ].children = [];
                }
            } );

            _.forEach( parentResults, function( node ) {
                var parentList = node.parents;
                for( var i = parentList.length - 2; i >= 0; i-- ) {
                    var id = classifyUtils.getPropertyValueFromArray( parentList[ i ].properties, classifyService.UNCT_CLASS_ID );
                    var temp = {
                        id: id,
                        className: classifyUtils.getPropertyValueFromArray( parentList[ i ].properties, classifyService.UNCT_CLASS_NAME ),
                        parentid: classifyUtils.getPropertyValueFromArray( parentList[ i + 1 ].properties, classifyService.UNCT_CLASS_ID ),
                        type: classifyUtils.getPropertyValueFromArray( parentList[ i + 1 ].properties, classifyService.UNCT_CLASS_TYPE ),
                        level: parentList.length - 1 - i
                    };

                    if( displayReleases ) {
                        appendNames( temp, parentList[ i ].properties );
                    }
                    if( !mappedArr[ id ] ) {
                        mappedArr[ id ] = temp;
                        mappedArr[ id ].children = [];
                    }
                }
            } );
            var mappedElem;
            var vmNode = null;

            var classifyIconName = 'typeClassificationElement48.svg';
            var imageIconUrl = iconSvc.getTypeIconFileUrl( classifyIconName );

            for( var id in mappedArr ) {
                if( mappedArr.hasOwnProperty( id ) ) {
                    mappedElem = mappedArr[ id ];

                    // If the element is not at the root level, add it to its parent array of children.
                    if( mappedElem.parentid !== 'SAM' ) {
                        vmNode = awTableSvc.createViewModelTreeNode(
                            mappedElem.id, '',
                            mappedElem.className, mappedElem.level - 2, mappedArr[ mappedElem.parentid ].children.length,
                            '' );
                        vmNode.isLeaf = false;
                        vmNode.childCount = mappedElem.childCount;
                        vmNode.parent_Id = mappedElem.parentid;
                        vmNode.isExpanded = true;
                        vmNode.cursorObject = tempCursorObject;
                        vmNode.children = mappedElem.children;
                        vmNode.iconURL = mappedElem.typeIconFileUrl;
                        vmNode.type = mappedElem.type;

                        //LCS-664859 - Adding property named 'Test' to ViewModelTreeNode to avoid console error
                        if ( !vmNode.props ) {
                            vmNode.props = [];
                        }
                        var vmProperty = uwPropertyService.createViewModelProperty( 'Test', 'Test', 'STRING', '', '' );
                        vmNode.props.Test = vmProperty;

                        mappedArr[ mappedElem.parentid ].children.push( vmNode );
                    } else {
                        // If the element is at the root level, add it to first level elements array.
                        // Considering only root element "Classification Root" and exluding other elements having parentid "SAM" while performing search operation
                        if( mappedElem.id === 'ICM' ) {
                            vmNode = awTableSvc.createViewModelTreeNode(
                                mappedElem.id, '',
                                mappedElem.className, mappedElem.level - 2, 0,
                                '' );
                            vmNode.isLeaf = false;
                            vmNode.childCount = mappedElem.childCount;
                            vmNode.parent_Id = mappedElem.parentid;
                            vmNode.isExpanded = true;
                            vmNode.cursorObject = tempCursorObject;
                            vmNode.children = mappedElem.children;
                            vmNode.iconURL = mappedElem.typeIconFileUrl;
                            vmNode.type = mappedElem.type;

                            //LCS-664859 - Adding property named 'Test' to ViewModelTreeNode to avoid console error
                            if ( !vmNode.props ) {
                                vmNode.props = [];
                            }
                            var vmProperty = uwPropertyService.createViewModelProperty( 'Test', 'Test', 'STRING', '', '' );
                            vmNode.props.Test = vmProperty;

                            finaltree.push( vmNode );
                        }
                    }
                }
            }
            var stack = [];
            stack.push( finaltree[ 0 ] );
            while( stack.length > 0 ) {
                vmNode = stack.pop();

                if( vmNode.id !== 'ICM' ) {
                    if( vmNode.children.length === 0 ) {
                        if( outputs[ vmNode.id ] && outputs[ vmNode.id ].childCount === 0 ) {
                            vmNode.childCount = outputs[ vmNode.id ].childCount;
                            vmNode.isLeaf = true;
                        }
                        vmNode.isExpanded = false;
                    }
                    finalVMTNodes.push( vmNode );
                }

                for( var i = 0; i < vmNode.children.length; i++ ) {
                    stack.push( vmNode.children[ i ] );
                }
            }

            var isTopNode = ctx.treeLoadInput.parentNode.levelNdx === -1;
            var rootPathNodes = [];
            var treeLoadResult = null;
            if( isTopNode ) {
                var vmNode1 = awTableSvc.createViewModelTreeNode(
                    ctx.treeLoadInput.parentNode.id, '',
                    ctx.treeLoadInput.parentNode.className, -1, 0, null );

                vmNode1.type = ctx.treeLoadInput.parentNode.type;

                rootPathNodes.push( vmNode1 );
                ctx.rootNode = treeLoadInput;

                // This is for loading search VNCs
                eventBus.publish( ctx.tableSummaryDataProviderName + '.firstLevelSearchResultsLoaded', {
                    response: response
                } );
            }

            treeLoadResult = awTableSvc.buildTreeLoadResult(
                ctx.treeLoadInput, finalVMTNodes, false, true, true, null );

            treeLoadResult.rootPathNodes = rootPathNodes;
            treeLoadResult.cursorObject = tempCursorObject;
            treeLoadResult.childNodes[ '0' ].cursorObject = tempCursorObject;
            data.numOfResults = finalVMTNodes.length;

            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );
        } );
    } else {
        /**
         * If normal tree rendering operation is being performed
         */
        if( data.treeInTab && typeof data.treeInTab.performClassExpansion === 'object' ) {
            // Check if this is a class expansion activity, call getParentHierarchy which will load and display multi-level hierarchies according to parentIds provided
            data.treeInTab.processPerformClassExpansion = _.clone( data.treeInTab.performClassExpansion );
            delete data.treeInTab.performClassExpansion;
            exports.getParentHierarchy( deferred, treeLoadInput, data, ctx );
            return;
        }

        // Add Releases to Search
        // Check if all items selected, if true dont update.
        if( releasesActive ) {
            searchCriteria.searchAttribute = 'CLASSID_SOURCESTANDARD';
            searchCriteria.searchString += releasesString;
        }

        request = {
            workspaceObjects: workspaceObjects,
            searchCriterias: [ searchCriteria ],
            classificationDataOptions: clsDataOptValue + exports.getClassificationDataOptions( ctx )
        };
        // Call SOA
        soaService.post( serviceName, operationName, request ).then( function( response ) {
            if( response && response.classChildren && _.has( response, 'classChildren.Cls0DefaultView' ) ) {
                data.doNotLoad = true;
            }

            //store the parentBreadcrumb information
            //this helps in expanding all the blocks when they are
            //selected in property group section.
            if( ctx.parents ) {
                ctx.parentBreadCrumb = ctx.parents;
            }

            var children1 = [];
            var children = classifyService.getChildren( response, true, [ searchCriteria.searchString, 'Cls0DefaultView' ] );
            var fullHierarchy = {};
            if( response.clsClassDescriptors !== undefined ) {
                fullHierarchy = Object.assign( {}, response.clsClassDescriptors.ICM );
            }

            fullHierarchy.children = exports.extractChildren( response, [ searchCriteria.searchString, 'Cls0DefaultView' ] );
            var currentLevel = fullHierarchy;
            var parents = [];

            if( treeLoadInput.parentNode.id === 'top' ) {
                ctx.currentLevel = currentLevel;
                ctx.initialHierarchy = currentLevel;
                ctx.parents = parents;

                // This is for loading AI Suggestions
                data.tileClick = function( node ) {
                    data.suggestedRight = data.suggestedRibbonIncr * 21 + '%';
                    data.selectedNode = node;
                    eventBus.publish( 'navigateToSuggestedClassEvent', data );
                };
                data.treeInTab = data.treeInTab || {};
                data.treeInTab.firstLevelResponse = response;
                eventBus.publish( ctx.tableSummaryDataProviderName + '.firstLevelTreeLoaded' );

                /**
                 * Let's clear the breadCrumb
                 */
                eventBus.publish( ctx.tableSummaryDataProviderName + '.updateClassBreadCrumb' );
                // Since we are loading second level hierarchy, set isSecondLevelLoaded to true
                ctx.initialHierarchy.isSecondLevelLoaded = true;
                exports.getNextLevelChildrenForTree( data, ctx );
            }
            for( var i = 0; i < children.length; i++ ) {
                var vmNode = awTableSvc.createViewModelTreeNode(
                    children[ i ].id, '',
                    children[ i ].className, treeLoadInput.parentNode.levelNdx + 1, i,
                    '' );
                if( children[ i ].childCount === 0 ) {
                    vmNode.childCount = children[ i ].childCount;
                    vmNode.isLeaf = true;
                }

                if( children[ i ].thumbnailUrl ) {
                    vmNode.iconURL = children[ i ].thumbnailUrl;
                }

                vmNode.parent_Id = treeLoadInput.parentNode.id;
                vmNode.type = children[ i ].type;

                //LCS-664859 - Adding property named 'Test' to ViewModelTreeNode to avoid console error
                if ( !vmNode.props ) {
                    vmNode.props = [];
                }
                var vmProperty = uwPropertyService.createViewModelProperty( 'Test', 'Test', 'STRING', '', '' );
                vmNode.props.Test = vmProperty;

                vmNode.parent_Id = treeLoadInput.parentNode.id;
                children1.push( vmNode );
            }

            var isTopNode = treeLoadInput.parentNode.levelNdx === -1;
            var rootPathNodes = [];
            if( isTopNode ) {
                var vmNode1 = awTableSvc.createViewModelTreeNode(
                    treeLoadInput.parentNode.id, '',
                    treeLoadInput.parentNode.className, -1, 0, null );

                vmNode1.type = treeLoadInput.parentNode.type;

                rootPathNodes.push( vmNode1 );
                ctx.rootNode = treeLoadInput;
            }

            var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children1, false, true, true, null );

            treeLoadResult.rootPathNodes = rootPathNodes;

            treeLoadResult.parentNode.cursorObject = tempCursorObject;
            if( data.panelMode === 0 || data.panelMode === 1 || data.tableSummaryDataProviderName === 'getClassTableSummary' ) {
                if( data.tableSummaryDataProviderName === 'tabGetClassTableSummary' ) {
                    awTableStateService.clearAllStates( data, 'tabTestTableClassification' );
                } else if( data.tableSummaryDataProviderName === 'getClassTableSummary' ) {
                    awTableStateService.clearAllStates( data, 'testTableClassification' );
                }
            }

            ctx.expansionCounter -= 1;
            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );
        } );
    }
}

/**
 * Private function
 * Appends name to SOA request
 * @param {*} temp vnc tile props
 * @param {*} props properties
 * @param {*} i index
 * @param {*} ctx context
 */
function appendNames( temp, props ) {
    var ctx2 = appCtxService.getCtx( 'clsTab' );
    var standard = classifyService.getPropertyValue( props, 'SOURCE_STANDARD' );
    if( standard && standard !== '' && ctx2.eReleases ) {
        var displayName = classifyService.getReleaseDisplayName( ctx2, standard );
        temp.className += ' ( ' + displayName + ' )';
    }
}

/**
 * Private function
 * Determines if the SOA should include Release information
 * @param {*} ctx context
 * @param {*} data The view model data object
 * @param {*} searchCriteria input
 * @param {*} clsDataOptValue input
 * @returns {*} struct of release flags
 */
function isReleaseActive( ctx, data, searchCriteria, clsDataOptValue ) {
    var delimit = '&&';
    var releasesString = '';
    var releasesActive = false;
    var displayReleases = false;
    var releases = 0;
    var structure = {};
    var releaseSet = [];
    structure.releasesString = '';
    structure.releasesActive = false;
    structure.displayReleases = false;
    structure.releases = 0;
    if( ctx.parents && ctx.parents.length < 1 ) {
        if( ctx.releases && ctx.releases.selected && ctx.releases.expandedList &&
            ctx.releases.expandedList.length > 0 && ctx.releases.selected.length > 0 && ctx.releases.selected.length < ctx.eReleases.length ) { // Check Fullview
            releasesActive = true;
            releaseSet = ctx.releases.selected;
        } else if( data.Releases && data.Releases.displayValues && data.Releases.uiValues && data.Releases.uiValues.length > data.Releases.displayValues.length ) { // Check Location
            releasesActive = true;
            releaseSet = data.Releases.dbValue;
        }
        _.forEach( releaseSet, function( release ) { // Loop on releases
            if( release.selected && release.selected === 'true' ) { // Check selected flag on full view
                releases++;
                releasesString += delimit;
                releasesString += release.internalName;
            }
            if( !release.selected ) { //Location does not have selected flag
                releases++;
                releasesString += delimit;
                releasesString += release;
            }
        } );
        if( data.isTreeExpanding && !releasesActive  && clsDataOptValue !== 0 ) {
            data.isTreeExpanding = false;
        }

        if( releases !== 1 ) { // Do not display releases on items when only 1 release selected
            displayReleases = true;
        }
    }
    structure.releasesString = releasesString;
    structure.releasesActive = releasesActive;
    structure.displayReleases = displayReleases;
    structure.releases = releases;
    return structure;
}

export let navigateToNode = function( data ) {
    var ctx = appCtxService.getCtx( 'clsLocation' );
    //if a different class is searched for, do not restore from saved breadcrumbs
    if( data && data.searchBox && data.searchBox.dbValue && data.searchBox.dbValue !== '' ) {
        ctx.breadcrumbs = null;
        ctx.savedBreadCrumbs = null;
        ctx.savedFilters = null;
        return;
    }
    if( ctx.breadcrumbs && ctx.breadcrumbs.length === 0 &&
        !ctx.savedBreadCrumbs || ctx.savedBreadCrumbs && ctx.savedBreadCrumbs.length === 0 ) {
        //if no breadcrumbs are present, show VNCs in primaryworkarea and hide secondary
        var currentCtx = appCtxService.getCtx( 'ViewModeContext' );
        if( currentCtx.ViewModeContext !== 'ListView' ) {
            currentCtx.ViewModeContext = 'ListView';
            appCtxService.registerCtx( 'ViewModeContext', currentCtx );
        }
        return;
    }
    //if a breadcrumbs are available use them.
    if( ctx.breadcrumbs && ctx.breadcrumbs.length > 0 ) {
        ctx.savedBreadCrumbs = ctx.breadcrumbs;
        return;
    }
    if( ctx.savedBreadCrumbs && ctx.savedBreadCrumbs.length > 0 && !ctx.isNavigatingToNode ) {
        var selectedClass = ctx.savedBreadCrumbs[ ctx.savedBreadCrumbs.length - 1 ];

        data.selectedClass = selectedClass;
        data.treeInTab = data.treeInTab || {};
        data.treeInTab.performClassExpansion = {
            toBeExpandedClass: data.selectedClass,
            parentIds: ctx.savedBreadCrumbs
        };
        ctx.isNavigatingToNode = true;

        exports.performClassExpansion( data, ctx );
    }
};

/**
 * Given the processPerformClassExpansion => it would (if required fetch and) create the hierarchy for (all) the parentIds.
 * It would also select the last class entry available in parentIds
 * @param {deferred} deferred Deferred which is to be resolved with the treeLoadResult
 * @param {treeLoadInput} treeLoadInput Tree load input
 * @param {object} data The view model data object
 * @param {object} ctx context
 */
export let getParentHierarchy = function( deferred, treeLoadInput, data, ctx ) {
    if( data.treeInTab.processPerformClassExpansion ) {
        // isTopNode is set to true only if it is initialTreeLoad
        const isTopNode = treeLoadInput.parentNode.levelNdx === -1 && data.initialTreeLoad;
        var clsDataOptValue = 0;
        var workspaceObjects = [];
        var searchCriterias = [];
        var tempObj = {};
        var existingNode = null;

        // No need to fetch children of the last class which is the class to be selected
        var toBeSelectedClass = data.treeInTab.processPerformClassExpansion.parentIds.pop();
        if( !isTopNode ) {
            existingNode = exports.assertVisibilityInViewModel( data, tempObj, toBeSelectedClass.id );
            if( existingNode !== null ) {
                // toBeSelectedClass itself exists in the tree.
                // Thus, nothing to be fetched from server. Everything is available in tree.
                data.selectedClass = ctx.selectedTreeNode = ctx.selectedNode = ctx.selectedClass = toBeSelectedClass;
                if( treeLoadInput.focusLoadAction ) {
                    // if it is a focus load action => do the selection. Set isVNCaction to true for other functionality to behave normally.
                    data.dataProviders[ data.tableSummaryDataProviderName ].selectionModel.setSelection( toBeSelectedClass );
                    ctx.isVNCaction = true;
                } else {
                    // Reset both the flags. keep it for safety. Not sure if it is called.
                    ctx.isChildVNC = false;
                    ctx.isVNCaction = false;
                }
                return;
            }
        }
        // Create searchCriteria for all the parentIds which are not available in the tree.
        for( var i = data.treeInTab.processPerformClassExpansion.parentIds.length - 1; i >= 0; i-- ) {
            const item = data.treeInTab.processPerformClassExpansion.parentIds[ i ];
            searchCriterias.unshift( {
                searchAttribute: classifyService.UNCT_CLASS_ID,
                searchString: item.id,
                sortOption: classifyService.UNCT_SORT_OPTION_CLASS_ID
            } );
            if( !isTopNode ) {
                existingNode = exports.assertVisibilityInViewModel( data, tempObj, item.id );
                if( existingNode !== null ) {
                    // All classes above this class would exist in the tree. Thus our parentNode will be existingNode
                    treeLoadInput.parentNode = existingNode;
                    break;
                }
            }
        }
        if( existingNode === null ) {
            // This means there is no node in the tree. Thus create the tree from the scratch
            // This would execute when on load tree expansion is to be performed.
            searchCriterias.unshift( {
                searchAttribute: classifyService.UNCT_CLASS_ID,
                searchString: 'ICM',
                sortOption: classifyService.UNCT_SORT_OPTION_CLASS_ID
            } );
            // Set the value to load class suggestions since top level hierarchy is getting loaded
            if( ctx.workspaceObjectsForSOA && ctx.workspaceObjectsForSOA.length >= 1 ) {
                clsDataOptValue = classifyService.loadClassSuggestions;
                workspaceObjects = ctx.workspaceObjectsForSOA;
            }
        }

        var request = {
            workspaceObjects: workspaceObjects,
            searchCriterias: searchCriterias,
            classificationDataOptions: clsDataOptValue + exports.getClassificationDataOptions( ctx )
        };

        // Call SOA
        soaService.post( serviceName, operationName, request ).then( function( response ) {
            let treeLoadResult;
            if( typeof response.classChildren !== 'object' ) {
                // If nothing is fetched from server, resolve with empty rows.
                treeLoadResult = exports.resolveWithEmptyResults( treeLoadInput );
                // Cleanup activities
                ctx.expansionCounter = 0;
                delete data.treeInTab.processPerformClassExpansion;
                deferred.resolve( {
                    treeLoadResult: treeLoadResult
                } );
                return;
            }
            const tempCursorObject = {
                endReached: true,
                startReached: true
            };
            var parentVMNode = treeLoadInput.parentNode;
            treeLoadInput.cursorObject = tempCursorObject;
            parentVMNode.cursorObject = tempCursorObject;
            var finalVMTNodes = [];
            var indexToInsert = 0;
            var nextIndexToInsert = 0;

            // Iterate through the searchCriterias and process it's response
            searchCriterias.forEach( ( { searchString: parentClassId }, searchCriteriaIndex ) => {
                let vmNode = null;
                let nextParentVMNode = null;
                parentVMNode.childNodes = [];
                parentVMNode.isExpanded = true;
                let nextParentId = null;

                if( typeof searchCriterias[ searchCriteriaIndex + 1 ] === 'object' ) {
                    nextParentId = searchCriterias[ searchCriteriaIndex + 1 ].searchString;
                }

                // If parentClassId is ICM and it's children are not returned, use Cls0DefaultView => For CST hierarchy
                if( typeof response.classChildren[ parentClassId ] === 'undefined' && parentClassId === 'ICM' ) {
                    parentClassId = 'Cls0DefaultView';
                }

                // Iterate through classChildren of the current class id to create vmNode and add it to parentVMNode.childNodes
                response.classChildren[ parentClassId ].children.forEach( ( childClass, childIndex ) => {
                    childClass.id = classifyUtils.getPropertyValueFromArray( childClass.properties, classifyService.UNCT_CLASS_ID );
                    childClass.className = classifyUtils.getPropertyValueFromArray( childClass.properties, classifyService.UNCT_CLASS_NAME );
                    childClass.type = classifyUtils.getPropertyValueFromArray( childClass.properties, classifyService.UNCT_CLASS_TYPE );

                    //Append Releases to names
                    appendNames( childClass, childClass.properties );

                    // Create vmNode
                    vmNode = awTableSvc.createViewModelTreeNode( childClass.id, '', childClass.className, parentVMNode.levelNdx + 1, childIndex, '' );

                    // Get all the required values from childClass into vmNode
                    classifyService.parseIndividualClassDescriptor( childClass, true, vmNode );

                    vmNode.isLeaf = !childClass.childCount;
                    vmNode.parent_Id = parentClassId;

                    // If childClass was also part of searchCriterias, then expand this vmNode. Use this node as future parentVMNode
                    if( nextParentId === childClass.id ) {
                        nextIndexToInsert = indexToInsert + childIndex + 1;
                        nextParentVMNode = vmNode;
                        vmNode.isExpanded = true;
                        vmNode.cursorObject = tempCursorObject;
                    } else {
                        vmNode.isExpanded = false;
                    }
                    if( childClass.id === toBeSelectedClass.id ) {
                        toBeSelectedClass = vmNode;
                    }
                    vmNode.childNodes = [];
                    vmNode.iconURL = vmNode.thumbnailUrl;

                    vmNode.index = childIndex;

                    if( typeof response.clsClassDescriptors[ childClass.id ] !== 'undefined' ) {
                        vmNode.classDescription = classifyService.getPropertyValue( response.clsClassDescriptors[ childClass.id ].properties, classifyService.UNCT_CLASS_DESCRIPTION );
                    }

                    // Push to parentVMNode.childNodes
                    parentVMNode.childNodes.push( vmNode );
                } );

                // add parentVMNode.childNodes to finalVMTNodes at indexToInsert
                finalVMTNodes.splice( indexToInsert, 0, ...parentVMNode.childNodes );

                // Assign indexToInsert and parentVMNode from the respective next entries
                indexToInsert = nextIndexToInsert;
                parentVMNode = nextParentVMNode;
            } );

            var rootPathNodes = [];
            if( isTopNode ) {
                // If it is a topNode, then create top vmNode and set appropriate values
                var vmNode1 = awTableSvc.createViewModelTreeNode(
                    treeLoadInput.parentNode.id, '',
                    treeLoadInput.parentNode.className, -1, 0, null );

                vmNode1.type = treeLoadInput.parentNode.type;
                vmNode1.isExpanded = true;

                rootPathNodes.push( vmNode1 );

                // Assign ctx.currentLevel and ctx.initialHierarchy with parentNode.childNodes
                var currentLevel = {
                    children: _.clone( treeLoadInput.parentNode.childNodes )
                };
                // Do not assign to ctx.currentLevel as this is auto expansion and selection. So no need to set top most hierarchy in the currentLevel
                // ctx.currentLevel = currentLevel;
                ctx.initialHierarchy = currentLevel;

                // Since we are not going to call getNextLevelChildrenForTree on top level hierarchy, set isSecondLevelLoaded to false.
                ctx.initialHierarchy.isSecondLevelLoaded = false;

                // Set rootNode
                ctx.rootNode = treeLoadInput;

                // This is for loading AI Suggestions
                data.treeInTab = data.treeInTab || {};
                data.treeInTab.firstLevelResponse = response;
                eventBus.publish( ctx.tableSummaryDataProviderName + '.firstLevelTreeLoaded' );
            }
            // Provide buildTreeLoadResult all the nodes/rows of all levels that are to be added.
            treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, finalVMTNodes, false, true, true, null );

            treeLoadResult.rootPathNodes = rootPathNodes;
            treeLoadResult.cursorObject = tempCursorObject;
            treeLoadResult.parentNode.cursorObject = tempCursorObject;
            data.numOfResults = finalVMTNodes.length;

            // Cleanup activities
            ctx.expansionCounter = 0;
            delete data.treeInTab.processPerformClassExpansion;

            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );

            data.selectedClass = ctx.selectedTreeNode = ctx.selectedNode = ctx.selectedClass = toBeSelectedClass;
            if( !treeLoadInput.focusLoadAction ) {
                data.dataProviders[ data.tableSummaryDataProviderName ].selectionModel.setSelection( toBeSelectedClass );
                ctx.isVNCaction = true;
            } else {
                ctx.isChildVNC = false;
                ctx.isVNCaction = false;
            }

            // Reset the variable which was set when coming from create/edit class mode.
            data.initialTreeLoad = false;
        } );
    }
};

/* ----------------------------- TABLE PROPERTIES/COLUMN RELATED -------------------------------------------- */
/**
 * Load properties to be shown in the tree structure
 * @param {object} data The view model data object
 * @return {object} Output of loadTableProperties
 */
export let loadPropertiesJS = function( data ) { // eslint-disable-line

    if( data && data !== undefined ) {
        var viewModelCollection = data.dataProviders[ data.tableSummaryDataProviderName ].getViewModelCollection();
        var loadedVMOs = viewModelCollection.getLoadedViewModelObjects();
        /**
         * Extract action parameters from the arguments to this function.
         */
        var propertyLoadInput = awTableSvc.findPropertyLoadInput( arguments );

        /**
         * Load the 'child' nodes for the 'parent' node.
         */
        if( propertyLoadInput !== null &&
            propertyLoadInput !== undefined &&
            propertyLoadInput !== 'undefined' ) {
            return exports.loadTableProperties( propertyLoadInput, loadedVMOs );
        }
    }
};

/**
 * load Properties required to show in tables'
 * @param {Object} propertyLoadInput - Property Load Input
 * @param {Array} loadedVMOs - Loaded View Model Objects
 * @return {Object} propertyLoadResult
 */
export let loadTableProperties = function( propertyLoadInput /* , loadedVMOs */ ) {
    var allChildNodes = [];
    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if( !childNode.props ) {
                childNode.props = {};
            }

            if( childNode.id !== 'top' ) {
                allChildNodes.push( childNode );
            }
        } );
    } );

    var propertyLoadResult = awTableSvc.createPropertyLoadResult( allChildNodes );

    return AwPromiseService.instance.resolve( {
        propertyLoadResult: propertyLoadResult
    } );
};

/**
 * Loads columns for the column
 * @param {object} uwDataProvider data provider
 * @return {object} promise for async call
 */
export let loadColumns = function( uwDataProvider ) {
    var deferred = AwPromiseService.instance.defer();

    var awColumnInfos = [];

    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'Test',
        isTreeNavigation: true,
        isTableCommand: false,
        enableSorting: false,
        enableCellEdit: false,
        width: 200,
        minWidth: 200,
        enableColumnResizing: false,
        enableColumnMoving: false,
        enableFiltering: false,
        frozenColumnIndex: -1,
        cellTemplate: '<aw-cls-treetable-command-cell class="aw-jswidgets-tablecell" ' + //
            'prop="row.entity.props[col.field]" vmo="row.entity" ' + //
            'commands="col.colDef.commands" anchor="col.colDef.commandsAnchor" rowindex="rowRenderIndex" row="row" ></aw-cls-treetable-command-cell>'
    } ) );

    uwDataProvider.columnConfig = {
        columns: awColumnInfos
    };

    deferred.resolve( {
        columnInfos: awColumnInfos
    } );
    return deferred.promise;
};

/**
 * Method sortHierarchy store's the sorting criteria on application context
 * @param {*} ctx application context
 * @param {*} sortOption sort criteria
 * Valid values are 64 = Sort by Ascending, 128 = Sort by Descending and
 * 256 = Sort by Default ( ICS Hierarchy : Order By Class name, CST Hierarchy : Order By Sort index, Class name)
 */
export let sortHierarchy = function( ctx, sortOption ) {
    ctx.sortOption = sortOption;
    eventBus.publish( ctx.tableSummaryDataProviderName + '.dataProvider.reset' );
};

/**
 * To resolve the treeLoadInput with empty tree load result.
 * @param {treeLoadInput} treeLoadInput load input
 * @returns {treeLoadResult} treeLoadEmptyResult
 */
export let resolveWithEmptyResults = function( treeLoadInput ) {
    treeLoadInput = Object.assign( {}, treeLoadInput );
    var tempCursorObject = {
        endReached: true,
        startReached: true
    };
    treeLoadInput.parentNode.cursorObject = tempCursorObject;

    return awTableSvc.buildTreeLoadResult( treeLoadInput, [], false, true, true, null );
};

/* ----------------------------- VNC RELATED FUNCTIONS ------------------------------------ */
/**
 * This function is used to get perform class expansion if given parentIds and class ID of to be expanded class
 * @param {*} data  Declarative view - model
 * @param {*} ctx  Global context
 */
export let performClassExpansion = function( data, ctx ) {
    if( data.treeInTab && typeof data.treeInTab.performClassExpansion === 'object' ) {
        // Always clone the data
        ctx.selectedNode = _.clone( data.treeInTab.performClassExpansion.toBeExpandedClass );
        ctx.parents = _.clone( data.treeInTab.performClassExpansion.parentIds );
        ctx.isVNCaction = true;
        // ctx.expansionCounter = ctx.parents.length - 1;

        // Since we have already consumed the data, clear the performClassExpansion data
        data.treeInTab.processPerformClassExpansion = data.treeInTab.performClassExpansion;
        delete data.treeInTab.performClassExpansion;
        exports.parseVNC( data, ctx );
    }
};

/**
 * This function is used to get selected VNC class - ID to be used to render the next VNC's set and passing the input to select associated tree node
 * @param {*} data  Declarative view - model
 * @param {*} ctx  Global context
 * @returns {bool} true
 */
export let parseVNC = function( data, ctx ) {
    // Here previous VNCs are getting changed, here, we are changing current level
    ctx.currentLevel = ctx.selectedNode;
    var isExists = false;
    // Below method checks whether corrseponding element exists in classification tree
    // If panel is closed, then what we just need to care about breadcrumb
    // If panel is closed, then what we just need to care about is breadcrumb
    if( ctx.panelIsClosed !== true ) {
        isExists = exports.assertVisibilityInViewModel( data, ctx, ctx.selectedNode.id );
        ctx.selectedTreeNode = ctx.selectedNode;
        if( isExists && isExists !== null && typeof isExists === 'object' ) {
            ctx.selectedNode = isExists;
            ctx.selectedTreeNode = ctx.selectedNode;
            data.dataProviders[ data.tableSummaryDataProviderName ].selectionModel.setSelection( isExists );
        } else {
            // getParentHierarchy would handle visibility check of the parent class
            data.treeInTab = data.treeInTab || {};
            data.treeInTab.performClassExpansion = {
                toBeExpandedClass: {
                    id: ctx.selectedNode.id,
                    className: ctx.selectedNode.className
                },
                parentIds: _.clone( ctx.parents )
            };

            var vmNode = awTableSvc.createViewModelTreeNode(
                ctx.selectedNode.id, '',
                ctx.selectedNode.className, 1, 3,
                '' );

            if( ctx.selectedNode.childCount === 0 ) {
                vmNode.isLeaf = true;
            } else {
                vmNode.isLeaf = false;
            }
            vmNode.childCount = ctx.selectedNode.childCount;
            vmNode.type = ctx.selectedNode.type;
            // Set selection should call getParentHierarchy as we have set performClassExpansion
            data.dataProviders[ data.tableSummaryDataProviderName ].selectionModel.setSelection( vmNode );
        }
    } else {
        // It means there would be no tree selection
        ctx.selectedTreeNode = ctx.selectedNode;
        exports.getFirstLevelChildrenForTree( data, ctx, ctx.selectedNode );
        // May be no need here as this code is supposed to be called only when tree is not there
        eventBus.publish( ctx.tableSummaryDataProviderName + '.updateClassBreadCrumb' );
    }
    return true;
};

/**
 * Following method worked upon child VNCs selection
 * @param {*} data Declarative view model
 * @param {*} ctx Application context
 */
export let workOnChildAndParentVNC = function( data, ctx ) {
    // // var selectedNode = data.dataProviders[data.tableSummaryDataProviderName].selectionModel.getSelection();
    ctx.selectedClass = ctx.selectedNode;
    ctx.selectedTreeNode = ctx.selectedNode;
    // It means that selectedNode is expanded
    // Here ctx.selectedNode is tree node it should be there, if it's not there
    if( ctx.selectedNode !== null && ctx.selectedNode.children && ctx.selectedNode.children.length > 0 && ctx.currentLevel.children && ctx.currentLevel.children.length > 0 ) {
        ctx.selectedNode.expanded = true;
        // We don't need to get first level children, as they are already expanded
        exports.getNextLevelChildrenForTree( data, ctx );
    } else {
        // We need get the first level and second level both children as well
        exports.getFirstLevelChildrenForTree( data, ctx, ctx.selectedNode );
    }
    if( ctx.expansionCounter <= 0 ) {
        // Care taker block , after this there would not be further expansion
        ctx.isChildVNC = false;
        ctx.isVNCaction = false;
        ctx.expansionCounter = 0;
    }
    // After getTreeStructure parseExpansion is called which is firing below event for updating selected class.
    // But when Navigation through VNC, and class is available in tree, getTreeStructure is not called.
    // Thus explicitly publish the event over here.
    eventBus.publish( 'classifyTab.updateSelectedClassFromTreeOnce' );
    eventBus.publish( ctx.tableSummaryDataProviderName + '.updateClassBreadCrumb' );
};

/**
 * It would be called from classification tab when user selects a StorageClass and tabGetClassTableSummary.selectionChangeEvent is fired
 * This is setting all the variables from the selectedClass from data provider
 * @param {object} data - data
 * @param {object} ctx - global context
 */
export let updateSelectedClassFromDataProvider = function( data, ctx ) {
    //need to populate ctx.clsTab.selectedNode and ctx.selectedNode in case of "Classification Object" command
    var clsLocation = appCtxService.getCtx( 'clsLocation' );

    var clsTab = appCtxService.getCtx( 'clsTab' );
    if( data && data.dataProviders && data.dataProviders[ data.tableSummaryDataProviderName ] && data.dataProviders[ data.tableSummaryDataProviderName ].selectedObjects[ 0 ] ) {
        //this section is executed in the "Classification" tab when a class is selected in "Add Classification" section
        ctx.selectedNode = data.dataProviders[ data.tableSummaryDataProviderName ].selectedObjects[ 0 ];
        ctx.selectedClass = ctx.selectedNode;
        ctx.selectedTreeNode = data.dataProviders[ data.tableSummaryDataProviderName ].selectedObjects[ 0 ];
    } else if( clsTab !== undefined && clsLocation !== undefined && clsLocation.prevSelectedClass ) {
        //this section is executed when "Create Catalog Item" button is clicked in classification location
        clsTab.selectedNode = clsLocation.prevSelectedClass;
        clsTab.selectedClass = clsTab.selectedNode;
        clsTab.selectedTreeNode = clsTab.selectedNode;
    } else if( ctx !== undefined && ctx.selectedClass !== undefined && clsLocation !== undefined && clsLocation.showStandalone === true ) {
        ctx.selectedNode = ctx.selectedClass;
        ctx.selectedTreeNode = ctx.selectedClass;
    }
    appCtxService.updateCtx( 'clsLocation', clsLocation );
    appCtxService.updateCtx( 'clsTab', clsTab );
};

/**
 * Node > parent > child
 * selected node can contain two levels information,
 * Add new parameter isVNCaction
 * Drill down to the next level of the selectedNode.
 * @param {Object} data The declarative viewmodel data
 * @param {Object} ctx The application context / clsLocation application context
 */
export let drillToNextLevel = function( data, ctx ) {
    ctx.clsImageLoaded = false;
    ctx.isClsSearchButtonVisible = false;
    if( ctx.clsLocation ) {
        ctx.clsLocation.showParentVnc = undefined;
    }

    var currentCtx = appCtxService.getCtx( 'ViewModeContext' );

    if( data.tableSummaryDataProviderName === 'getClassTableSummary'
    && ( !data.dataProviders[data.tableSummaryDataProviderName].selectedObjects
            || data.dataProviders[data.tableSummaryDataProviderName].selectedObjects
            && data.dataProviders[data.tableSummaryDataProviderName].selectedObjects.length === 0 ) ) {
        currentCtx.ViewModeContext = 'ListView';
        appCtxService.registerCtx( 'ViewModeContext', currentCtx );
    }

    if( data.tableSummaryDataProviderName === 'getClassTableSummary' && !ctx.isVncVisible && !ctx.clsLocationViewStatusToDefault ) {
        currentCtx.ViewModeContext = 'SummaryView';
        ctx.clsLocationViewStatusToDefault = true;
        appCtxService.registerCtx( 'ViewModeContext', currentCtx );
    }

    if( ctx.searchSimilarActiveForTree ) {
        ctx.searchSimilarActiveForTree = false;
        ctx.isVNCaction = false;
        ctx.isChildVNC = false;
        ctx.prevSelectedClass = null;
        ctx.currentLevel = {};

        appCtxService.ctx.searchResponseInfo = {};
        appCtxService.ctx.search = {};
        ctx.bulkFiltersMap = {};
        data.categories = {};
        data.categories.refineCategories = [];
        data.categories.navigateCategories = [];
        data.bulkFiltersMap = {};
        eventBus.publish( 'clsBreadCrumb.refresh' );
    }

    // Clearing location specific data related to search - bulk filter map, search results, etc.
    if( ctx.tableSummaryDataProviderName === 'getClassTableSummary' && ctx.prevSelectedClass ) {
        var ctxFS = appCtxService.getCtx( 'classifyFullscreen' );
        if( ctxFS ) {
            eventBus.publish( 'classify.exitFullScreenMode' );
        }
        ctx.isNavigating = false;
        ctx.prevSelectedClass = null;
        appCtxService.ctx.searchResponseInfo = {};
        appCtxService.ctx.search = {};
        ctx.bulkFiltersMap = {};
        data.categories = {};
        data.categories.refineCategories = [];
        data.categories.navigateCategories = [];
        data.bulkFiltersMap = {};
        ctx.isBulkFilterMapDirty = false;
        ctx.isBulkFilterUpdateEvent = true;
        ctx.isFiltersVisible = false;
        if ( ctx.savedFilters ) {
            ctx.savedFilters.filters = {};
        }
        eventBus.publish( 'clsBreadCrumb.refresh' );
        eventBus.publish( 'primaryWorkarea.reset' );
    }
    // Clearing the images/datasets
    if( ctx && ctx.imageURLs && ctx.datasetFilesOutput ) {
        ctx.imageURLs = null;
        ctx.datasetFilesOutput = null;
    }
    if( ctx.isVncVisible === false ) {
        ctx.isVncVisible = true;
    }
    if( ctx.selectedNode === undefined && ctx.rootNode !== undefined ) {
        ctx.selectedNode = ctx.rootNode;
    }
    if( ctx.isChildVNC === true || ctx.isVNCaction === true ) {
        exports.workOnChildAndParentVNC( data, ctx );
    } else {
        // If tree node is selected
        if( data.dataProviders && data.dataProviders[ data.tableSummaryDataProviderName ].selectedObjects !== undefined && data.dataProviders[ data.tableSummaryDataProviderName ].selectedObjects[0] ) {
            var existsInVNC = false;
            /**
             * Need to set below variable to false for precaution
             */
            ctx.isVNCaction = false;
            ctx.isChildVNC = false;

            ctx.selectedNode = data.dataProviders[ data.tableSummaryDataProviderName ].selectedObjects[ 0 ];
            ctx.selectedClass = ctx.selectedNode;

            ctx.selectedTreeNode = data.dataProviders[ data.tableSummaryDataProviderName ].selectedObjects[ 0 ];
            if( ctx.currentLevel !== undefined && ctx.currentLevel ) {
                ctx.parents = [];
                if( ctx.currentLevel.children && ctx.currentLevel.children.length > 0 ) {
                    for( var i = 0; i < ctx.currentLevel.children.length; i++ ) {
                        if( ctx.currentLevel.children[ i ].id === ctx.selectedTreeNode.id ) {
                            ctx.parents.push( ctx.currentLevel.children[ i ] );
                            /**
                             * was bug in the below code
                             */
                            exports.getParents( data, ctx, ctx.parents, ctx.selectedTreeNode );
                            existsInVNC = true;
                            break;
                        }
                    }
                }
                if( existsInVNC === false ) {
                    ctx.parents.push( ctx.selectedTreeNode );
                    exports.getParents( data, ctx, ctx.parents, ctx.selectedNode );
                }
            }

            // check childCount instead of totalchildcount since it is never getting assigned in cls code.
            if( ctx.selectedNode !== null && ctx.selectedNode.childCount === 0 ) {
                ctx.currentLevel = { children: [] };
                // This means there is a selected node which does not have child nodes.
                ctx.isClsSearchButtonVisible = true;
                exports.getFirstLevelChildrenForTree( data, ctx, ctx.selectedNode );
            } else {
                if( ctx.currentLevel !== undefined && ctx.currentLevel && ctx.currentLevel.children && ctx.currentLevel.children.length > 0 ) {
                    for( var i = 0; i < ctx.currentLevel.children.length; i++ ) {
                        if( ctx.selectedNode.id === ctx.currentLevel.children[ i ].id ) {
                            ctx.currentLevel = ctx.currentLevel.children[ i ];
                            // Since found the selected node in currentLevel children break the for loop
                            break;
                        }
                    }
                }
                if( existsInVNC === false ) {
                    ctx.parents.forEach( function( parentItem ) {
                        parentItem.expanded = true;
                    } );
                    ctx.selectedNode.expanded = true;
                    exports.getFirstLevelChildrenForTree( data, ctx, ctx.selectedNode );
                } else {
                    ctx.parents.forEach( function( parentItem ) {
                        parentItem.expanded = true;
                    } );
                    ctx.selectedNode.expanded = true;

                    exports.getFirstLevelChildrenForTree( data, ctx, ctx.selectedNode );
                }
            }
            // Till here tree node selection is done. Thus fire update event - Verified(direct selection in tree)

            eventBus.publish( 'classifyTab.updateSelectedClassFromTreeOnce' );
            eventBus.publish( ctx.tableSummaryDataProviderName + '.updateClassBreadCrumb' );
            eventBus.publish( 'clsBreadCrumb.refresh' );
        } else {
            /**
             * If nothing is selected or previous selection exists
             */
            var nodeExists = false;

            if( ctx.breadcrumbs && ctx.breadcrumbs.length !== 0 && ctx.breadcrumbs[ ctx.breadcrumbs.length - 1 ].class_Id !== undefined ) {
                var breadcrumbLastClassId = ctx.breadcrumbs[ ctx.breadcrumbs.length - 1 ].class_Id;
                for( var i = 0; i < data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects.length; i++ ) {
                    if( data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects[ i ].id === breadcrumbLastClassId ) {
                        nodeExists = true;
                        break;
                    }
                }
            }

            if( nodeExists === false ) {
                // Keep VNC as it is
                // I think we dont require below code to call first level and second level
                ctx.isVNCaction = false;
                ctx.isChildVNC = false;

                //if a block was collapsed this fix helps to expand the block when it is selected
                //in the property group section.
                if( ctx && ctx.selectedNode && ctx.selectedNode.id && ctx.selectedNode.className &&
                    ctx.parentBreadCrumb ) {
                    data.treeInTab = data.treeInTab || {};
                    data.treeInTab.performClassExpansion = {
                        toBeExpandedClass: {
                            id: ctx.selectedNode.id,
                            className: ctx.selectedNode.className
                        },
                        parentIds: ctx.parentBreadCrumb
                    };
                    eventBus.publish( 'tabGetClassTableSummary.performClassExpansion' );
                }

                // exports.getFirstLevelChildrenForTree( data, ctx, ctx.selectedNode );
            } else {
                /**
                 * Deselection use case , so ctx.parents should be null
                 */
                ctx.isVNCaction = false;
                ctx.isChildVNC = false;

                ctx.currentLevel = ctx.initialHierarchy;
                ctx.selectedTreeNode = null;
                ctx.selectedNode = null;
                ctx.selectedClass = null;
                /**
                 * Making parents as null for breadCrumb
                 */
                ctx.parents = null;

                var searchActive = false;
                // Check if search is active
                if( data && data.searchBox && data.searchBox.dbValue && data.searchBox.dbValue !== '' ) {
                    searchActive = true;
                }
                if( !searchActive && ctx.initialHierarchy.isSecondLevelLoaded === false ) {
                    // Since with auto expansion second level hierarchy is not loaded, load the hierarchy and cache it.
                    ctx.initialHierarchy.isSecondLevelLoaded = true;
                    exports.getNextLevelChildrenForTree( data, ctx );
                    // exports.getFirstLevelChildrenForTree( data, ctx, null );
                }

                // For deselection, it will clear the data.selectedClass
                eventBus.publish( 'classifyTab.updateSelectedClassFromTreeOnce' );
                eventBus.publish( ctx.tableSummaryDataProviderName + '.updateClassBreadCrumb' );
            }
        }
    }

    //when a user select "Classification Object" under "New Resources" and then selects "Resource Management"
    //the SWA should be repopulated with the appropriate content and not the old attributes of "New Resources"
    if( ctx.showStandalone === true ) {
        ctx.showStandalone = false;
    }
};

/**
 * Following method keeps counter for expansion, which decides no. of times tree node expansion should happen
 * @param {*} data Declarative view model
 * @param {*} ctx  Application context
 * @returns {bool} false
 */
export let parseExpansion = function( data, ctx ) {
    data.isTreeExpanding = true;
    if( ctx.expansionCounter > 0 ) {
        var vmNode = awTableSvc.createViewModelTreeNode(
            ctx.selectedNode.id, '',
            ctx.selectedNode.className, 0, 0,
            '' );

        if( ctx.selectedNode.childCount === 0 ) {
            vmNode.isLeaf = true;
        } else {
            vmNode.isLeaf = false;
        }
        vmNode.childCount = ctx.selectedNode.childCount;
        vmNode.type = ctx.selectedNode.type;
        data.dataProviders[ data.tableSummaryDataProviderName ].selectionModel.setSelection( vmNode );
        eventBus.publish( ctx.tableSummaryDataProviderName + '.updateClassBreadCrumb' );
        return ctx.expansionCounter;
    }
    // Navigation through VNC and class not available in tree, event would get fired from here. May be also from workOnChildAndParentVNC
    // eventBus.publish( 'classifyTab.updateSelectedClassFromTreeOnce' );
    return false;
};

export let parseVNCforDeselection = function( data /* , ctx */ ) {
    var temp = data.dataProviders[ data.tableSummaryDataProviderName ].selectionModel.getSelection();
    data.dataProviders[ data.tableSummaryDataProviderName ].selectionModel.removeFromSelection( temp );
};

/**
 * This function is used to set selection on tree for current selected node
 * @param {*} data Declarative view - model
 * @param {*} ctx  Global context
 */
export let parseChildandParentVNC = function( data, ctx ) {
    for( var i = 0; i < data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects.length; i++ ) {
        var temp = data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects[ i ];
        if( temp.id === ctx.selectedNode.id ) {
            /* Saving the selectedNode's corresponding tree node in ctx.selectedTreeNode to ensure search button is enabled appropriately */
            ctx.selectedTreeNode = temp;
            data.dataProviders[ data.tableSummaryDataProviderName ].selectionModel.setSelection( temp );
            ctx.selectedNode = temp;
            break;
        }
    }
    ctx.isChildVNC = true;
    ctx.isVNCaction = true;
};

/* ----------------------------- BREADCRUMB RELATED FUNCTIONS ---------------------------------------- */
/**
 * Updates the Class Breadcrumb with the current parents list
 * Here, we should create new list, we should always listen parents stored on ctx
 * @param {*} data Declarative view model
 * @param {*} ctx Application context
 * @returns {bool} false
 */
export let updateClassBreadCrumb = function( data, ctx ) {
    if( ctx.parents ) {
        var breadcrumbList = [];
        var parentsLength = ctx.parents.length;
        _.forEach( ctx.parents, function( parent ) {
            var eachDisplayName = null;
            if( parent.className ) {
                eachDisplayName = parent.className;
            } else {
                eachDisplayName = parent.displayName;
            }

            var parentBreadCrumb = {
                clicked: false,
                displayName: eachDisplayName,
                // If it is view mode, selection not to be allowed for breadcrumb
                // Also if it is paste mode, then selection not to be allowed for breadcrumb
                selectedCrumb: data.panelMode === -1 || parentsLength === 1 || data.panelMode === 1 && typeof appCtxService.ctx.classifyEdit.vmo !== 'object',
                showArrow: parentsLength !== 1,
                className: eachDisplayName,
                class_Id: parent.id,
                id: parent.id,
                count: parent.count,
                type: parent.type,
                objectType: parent.objectType,
                childCount: parent.childCount,
                children: parent.children
            };
            breadcrumbList.push( parentBreadCrumb );
            parentsLength--;
        } );
        var provider = {
            crumbs: breadcrumbList,
            onSelect: _onSelectBreadcrumb.bind( null, ctx )
        };
        data.provider = provider;
        data.provider.crumbs = breadcrumbList;
        ctx.breadcrumbs = breadcrumbList;

        return true;
    }
    exports.clearClassBreadCrumb( data, ctx );
    return false;
};

/**
 * Private method
 * Followed method gets called upon selection of breadcrumb
 * @param {*} selectedCrumb Selected breadcrumb
 */
function _onSelectBreadcrumb( ctx, selectedCrumb ) {
    ctx.selectedCrumb = selectedCrumb;
    eventBus.publish( ctx.tableSummaryDataProviderName + '.selectBreadCrumb', selectedCrumb );
}

/**
 * Following method gets selected breadcrumb when user clicks upon it
 * @param {*} data Declarative view model
 * @param {*} ctx Application context
 */
export let getSelectedCrumb = function( data, ctx ) {
    /**
     * We are getting selection, we need to select associated node in the tree
     * Check on application context whether filter panel is closed
     */
    var selectedCrumb = ctx.selectedCrumb; // appCtxService.getCtx( 'clsLocation.selectedCrumb' );
    var node;

    if( !ctx.panelIsClosed ) {
        for( var i = 0; i < data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects.length; i++ ) {
            node = data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects[ i ];
            if( node.id === selectedCrumb.class_Id ) {
                data.dataProviders[ data.tableSummaryDataProviderName ].selectionModel.setSelection( node );
                break;
            }
        }
    }
    exports.getParents( data, ctx, ctx.parents, node );
};

/**
 * Following method clear the available breadcrumbs
 * @param {Object} data - the viewmodel data object
 * @param {Object} ctx - Global context
 * @returns {bool} false
 */
export let clearClassBreadCrumb = function( data, ctx ) {
    if( data.provider ) {
        data.provider.crumbs = [];
        ctx.parents = [];
    }
    ctx.parents = [];
    return false;
};

/* ----------------------------- SUPPLIMENTARY FUNCTIONS FOR TREE/BREADCRUMB ------------------------------------ */
/**
 * Function to add classification root to the input list
 * @param {*} parentsList The parents list
 */
export let addTemporaryRootToHierarchy = function( parentsList ) {
    var rootNode = {
        attributes: [],
        childCount: 0,
        documents: [],
        properties: classifyUtils.generatePropertiesForClassInfo( 'ICM', 'Classification Root', 'AbstractClass' )
    };
    var rootGroup = {
        attributes: [],
        childCount: 0,
        documents: [],
        properties: classifyUtils.generatePropertiesForClassInfo( 'SAM', 'TC Classification Root', 'AbstractClass' )
    };
    parentsList.push( rootNode );
    parentsList.push( rootGroup );
};

/**
 * Search for the loaded tree nodes for the given class id.
 * @param {Object} data The declarative viewmodel data
 * @param {String} classId Class id to be searched
 * @returns {Object} If tree node exists with that class id, return the tree node, else returns null
 */
export let getTreeNodeFromClassId = function( data, classId ) {
    var index = 0;
    for( ; index < data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects.length; index++ ) {
        var node = data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects[ index ];
        if( node.id === classId ) {
            break;
        }
    }
    if( index !== data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects.length ) {
        return data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects[ index ];
    }
    return null;
};

/**
 * Checks if the children exists in the parent tree node.
 * Usage: This function is used to check if the child node is to be added to VNCs in case of class search
 * @param {Object} parentTreeNode Parent tree node
 * @param {String} childClassId Child class id which is to be checked in the parent tree node's children
 * @returns {Boolean} False if the tree node expanded and child class Id does not exists. True otherwise
 */
export let checkIfChildClassToBeAddedToVNC = function( parentTreeNode, childClassId ) {
    if( typeof parentTreeNode === 'object' && parentTreeNode !== null && parentTreeNode.isExpanded && parentTreeNode.children ) {
        // Checking for existence of the childClassId in the parentTreeNode
        var index = 0;
        for( ; index < parentTreeNode.children.length; index++ ) {
            if( parentTreeNode.children[ index ].id === childClassId ) {
                return true;
            }
        }
        return false;
    }
    return true;
};

/**
 * getHighlightKeywords
 * @param {Object} data search terms to highlight
 * @return {boolean}Returns true if highlighterSvc.highlightKeywords succeeds
 */
export let getHighlightKeywords = function( data, ctx ) {

    //Commenting out the highlighter code because it is not being used to highlight the classes
    /*
    if( data && data.additionalSearchInfoMap && data.additionalSearchInfoMap.searchTermsToHighlight && data.additionalSearchInfoMap.searchTermsToHighlight[ 0 ] )  {
        if( data.additionalSearchInfoMap.searchTermsToHighlight[ 0 ].trim() !== '' && data.additionalSearchInfoMap.searchTermsToHighlight[ 0 ].trim() !== '*' ){
            ctx.highlighter = undefined;
            appCtxService.ctx.highlighter = undefined;
        }
    } else if( data.additionalSearchInfoMap !== undefined ) {
        highlighterSvc.highlightKeywords( data.additionalSearchInfoMap.searchTermsToHighlight );
    }*/
};

/**
 * Loads the first level children to display on VNC
 *
 * @param {object} data - The declarative view model
 * @param {object} ctx - application context
 * @param {object} selectedNode - Selected Node
 * @returns {Promise} Promise that will be resolved when all the first level and next level VNCs are loaded.
 */
export let getFirstLevelChildrenForTree = function( data, ctx, selectedNode ) {
    var clssId = null;
    if( selectedNode === null ) {
        clssId = 'ICM';
    } else {
        clssId = selectedNode.id;
    }

    var searchCriteria = {};
    searchCriteria.searchAttribute = classifyService.UNCT_CLASS_ID;
    searchCriteria.searchString = clssId;
    searchCriteria.sortOption = classifyService.UNCT_SORT_OPTION_CLASS_ID;

    var soaPromise;
    if( selectedNode && ( selectedNode.isLeaf === true || selectedNode.childCount === 0 ) ) {
        // Earlier for every selection we use to do 3 findClassificationInfo3 call
        // As part of performance imporovemenet 1 extra findClassificationInfo3 was reduce for every selection.
        // Now for storage class there is not a single call of findClassificationInfo3 and viewer data is not updated.
        // To update the image viewer for storage class this call(updateImageViewerData) is needed.
        updateImageViewerData( );
        soaPromise = new Promise( function( resolve ) {
            AwTimeoutService.instance( () => {
                ctx.currentLevel = {
                    children: []
                };
                resolve();
            }, 0 );
        } );
        eventBus.publish( ctx.tableSummaryDataProviderName + '.selectStorageNode' );
    } else {
        // 1b. If child exist and children to be fetched from server, then perform SOA call
        var request = {
            workspaceObjects: [],
            searchCriterias: [ searchCriteria ],
            classificationDataOptions: exports.getClassificationDataOptions( ctx )
        };

        soaPromise = soaService.post( serviceName, operationName, request ).then( function( response ) {
            var fullHierarchy = {};

            /*
            If it is a leaf-level class, then there will not be any call to fetch it's children.
            but for leaf-level class, done the image handling from processAttributeForFilterPanel function.
            Since that function will also be called for intermediate nodes, removed code for image handling from here
            Only code in processAttributeForFilterPanel will be used for image handling.
            */

            if( response.clsClassDescriptors !== undefined ) {
                fullHierarchy = Object.assign( {}, response.clsClassDescriptors.ICM );
            }

            fullHierarchy.children = exports.extractChildren( response, [ searchCriteria.searchString ], data );
            ctx.currentLevel = fullHierarchy;
            var context = {
                parent: true
            };
            eventBus.publish( ctx.tableSummaryDataProviderName + '.selectParentNode', context );
            return true;
        } );
    }
    /**
     * Common code which is to be called after first level VNC is loaded
     * @Returns {Promise} Returns a promise returned by nextLevelChildrenForTree
     */
    function firstLevelLoadCompleteted() {
        return exports.getNextLevelChildrenForTree( data, ctx );
    }
    // 2. Perform some common activities which should be done irrespective of whether SOA call is made or not.
    return soaPromise.then( ( result ) => firstLevelLoadCompleteted() );
};

/*
 * Loads the next level of children to display on vnc
 *
 * @param {Object} data The declarative viewmodel data
 */
export let getNextLevelChildrenForTree = function( data, ctx ) {
    var serchingCriterias = [];
    if( ctx.childrenClsClassDescriptors && ctx.selectedTreeNode && ctx.selectedTreeNode.id ) {
        if( ctx.childrenClsClassDescriptors[ ctx.selectedTreeNode.id ] && ctx.childrenClsClassDescriptors[ ctx.selectedTreeNode.id ].documents && !ctx.clsImageLoaded ) {
            ctx.datasetFilesOutput = ctx.childrenClsClassDescriptors[ ctx.selectedTreeNode.id ].documents;
        }
    }

    if( ctx.currentLevel && ctx.currentLevel.children && ctx.currentLevel.children.length > 0 ) {
        ctx.currentLevel.children.forEach( function( childClass ) {
            // If we do not fetch data for leaf level children classes, it would also not load the class description(Class description are to be shown in VNC if they exist)
            var searchCriteria = {};
            searchCriteria.searchAttribute = classifyService.UNCT_CLASS_ID;
            searchCriteria.searchString = childClass.id;
            searchCriteria.sortOption = classifyService.UNCT_SORT_OPTION_CLASS_ID;
            serchingCriterias.push( searchCriteria );
        } );
    }
    var soaPromise;

    // 1a. If child exist and children to be fetched from server, then perform SOA call
    // 1b. If no child exist for fetching information, then do not perform any SOA call as it would be an empty SOA call
    // 2. Perform some common activities which should be done irrespective of whether SOA call is made or not.
    if( serchingCriterias.length >= 1 ) {
        var request = {
            workspaceObjects: [],
            searchCriterias: serchingCriterias,
            classificationDataOptions: exports.getClassificationDataOptions( ctx )
        };

        soaPromise = soaService.post( serviceName, operationName, request )
            .then( function( response ) {
                if( response.clsClassDescriptors ) {
                    ctx.childrenClsClassDescriptors = response.clsClassDescriptors;
                }
                for( var currentClassId in response.clsClassDescriptors ) {
                    var currentClassDescriptor = response.clsClassDescriptors[ currentClassId ];

                    if( ctx.currentLevel && !ctx.currentLevel.children ) {
                        ctx.currentLevel.children = [];
                    }
                    var classItemToUpdate = ctx.currentLevel.children.filter( ( currentParentItem ) => {
                        return currentParentItem.id === currentClassId;
                    } );

                    if( classItemToUpdate.length === 1 ) {
                        classItemToUpdate[ 0 ].classDescription = classifyService.getPropertyValue( currentClassDescriptor.properties, classifyService.UNCT_CLASS_DESCRIPTION );
                    }
                }

                var searchActive = false;
                // Check if search is active
                if( data && data.searchBox && data.searchBox.dbValue && data.searchBox.dbValue !== '' ) {
                    searchActive = true;
                }
                for( var i = 0; i < ctx.currentLevel.children.length; i++ ) {
                    var firstLvlChild = ctx.currentLevel.children[ i ];
                    var secondLevelChildren = [];
                    var secLvlChildren = [];
                    var classID = firstLvlChild.id;
                    if( response && response.classChildren && response.classChildren[ classID ] &&
                        response.classChildren[ classID ].children ) {
                        secLvlChildren = response.classChildren[ classID ].children;
                    }

                    var parentTreeNode = null;
                    if( searchActive ) {
                        // Get the tree node for the current classID
                        parentTreeNode = exports.getTreeNodeFromClassId( data, classID );
                    }

                    secLvlChildren.forEach( ( secLvlChildObj ) => {
                        var secLvlChildId = classifyService.getPropertyValue( secLvlChildObj.properties, classifyService.UNCT_CLASS_ID );

                        if( searchActive ) {
                            // If search is active then add secLvlChildId only if it is to be added to firstLvlChild.children
                            if( !exports.checkIfChildClassToBeAddedToVNC( parentTreeNode, secLvlChildId ) ) {
                                return;
                            }
                        }
                        var secLvlChildName = classifyService.getPropertyValue( secLvlChildObj.properties, classifyService.UNCT_CLASS_NAME );
                        var vmProperty = uwPropertyService.createViewModelProperty( secLvlChildId, secLvlChildName, 'STRING', '', '' );
                        vmProperty.className = secLvlChildName;
                        var parentInfo = {
                            $$hashKey: firstLvlChild.$$hashKey,
                            childCount: firstLvlChild.childCount,
                            className: firstLvlChild.className,
                            id: firstLvlChild.id,
                            typeIconFileUrl: firstLvlChild.typeIconFileUrl,
                            type: firstLvlChild.type
                        };
                        vmProperty.parent = parentInfo;
                        classifyService.parseIndividualClassDescriptor( secLvlChildObj, true, vmProperty );
                        secondLevelChildren.push( vmProperty );
                    } );

                    firstLvlChild.children = [];
                    firstLvlChild.children = secondLevelChildren;
                    ctx.currentLevel.children[ i ].children = [];
                    ctx.currentLevel.children[ i ].children = secondLevelChildren;
                }
            } );
    } else {
        ctx.childrenClsClassDescriptors = [];
        soaPromise = new Promise( function( resolve ) {
            AwTimeoutService.instance( () => {
                resolve();
            }, 0 );
        } );
    }
    /**
     * Common code which is to be called after second level VNC is loaded
     */
    function vncLoadCompleteted() {
        ctx.isClsSearchButtonVisible = true;
        // At this point, tree and VNCs are loaded. Safe to fire event for performing any expansion
        // Not sure if this is required anymore. But keeping it as is
        eventBus.publish( ctx.tableSummaryDataProviderName + '.performClassExpansion' );
    }
    // Set context properties when node is selected in tree or VNC
    if( ctx.selectedNode ) {
        if( ctx.selectedNode.isLeaf === true || ctx.selectedNode.childCount === 0 ) {
            eventBus.publish( ctx.tableSummaryDataProviderName + '.selectStorageNode' );
        } else{
            var context = {
            parent: true
            };
            eventBus.publish( ctx.tableSummaryDataProviderName + '.selectParentNode', context );
        }
    }
    return soaPromise.then( ( result ) => vncLoadCompleteted() );
};

/**
 * Following method gets used to get selection based upon previously selected node
 * As Framework has obseleted API to remember previous selections. Handling this use case in application code
 * @param {*} data Declarative view - model
 * @param {*} ctx Global context
 */
export let selectPreviousNode = function( data, ctx ) {
    if( ctx.selectedTreeNode ) {
        for( var i = 0; i < data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects.length; i++ ) {
            var node = data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects[ i ];
            if( node.id === ctx.selectedTreeNode.id ) {
                data.dataProviders[ data.tableSummaryDataProviderName ].selectionModel.setSelection( node );
                break;
            }
        }
    }
};

/**
 * Below function asserts visiblity of node as per the idToCheck
 * @param {*} data Declarative view model
 * @param {*} ctx Application context
 * @param {*} idToCheck id to check in view model
 * @returns {object} Returns the node if found
 */
export let assertVisibilityInViewModel = function( data, ctx, idToCheck ) {
    var node = null;
    if( ctx.panelIsClosed !== true ) {
        for( var i = 0; i < data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects.length; i++ ) {
            node = data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects[ i ];
            if( node.id === idToCheck ) {
                ctx.selectedTreeNode = node;
                return node;
            }
        }
    }
    node = null;
    return node;
};

/**
 * buildClsBreadcrumb - build the breadCrumb string when search is done
 * @param {Object} label context label
 * @param {Object} totalFound number of object founds
 * @param {Object} selectedClass selected class in hierarchy
 * @return {String}Returns breadcrumb object
 */
export let buildClsBreadcrumb = function( label, totalFound, selectedClass ) {
    return exports.loadBreadcrumbTitle( label, totalFound, selectedClass ).then( function( displayValue ) {
        var baseCrumb = {
            displayName: displayValue,
            clicked: false,
            selectedCrumb: true,
            showArrow: false
        };

        return {
            crumbs: [ baseCrumb ]
        };
    } );
};

/**
 * loadBreadcrumbTitle - load the breadCrumb string when search is done
 * @param {Object} label context label
 * @param {Object} totalFound number of object founds
 * @param {Object} selectedClass selected class in hierarchy
 * @return {String}Returns breadcrumb string
 */
export let loadBreadcrumbTitle = function( label, totalFound, selectedClass ) {
    return AwPromiseService.instance.all( {
        uiMessages: localeService.getTextPromise( label.source )
    } ).then( function( localizedText ) {
        if( selectedClass === null || totalFound === undefined || selectedClass === undefined || selectedClass.displayName === undefined ) {
            return '';
        }
        if( totalFound === 0 ) {
            appCtxService.ctx.clsLocation.noSearchResultsFound = {
                isNull: false,
                type: 'STRING',
                uiValue: localizedText.uiMessages.noSearchResultsFound.format( selectedClass.displayName )
            };
            return localizedText.uiMessages.noSearchResultsFound.format( selectedClass.displayName );
        }
        return localizedText.uiMessages.resultsCountLabel.format( totalFound, selectedClass.displayName );
    } );
};

/**
 * updateSelected update selected Object
 * @param {Object} eventData - eventData
 */
export let updateSelected = function( eventData ) {
    // Not changing these
    appCtxService.ctx.mselected = eventData.selectedUids;
    appCtxService.ctx.selected = eventData.selectedUids[ 0 ];
};

/* ------------------------------ SOME UTILITY FUNCTIONS --------------------------------------------- */
/**
 * @param {Object} response response from the getChildren SOA
 * @param {String-Array} searchKeyArray an array of strings to be used for searching for the right child map. If multiple, they are OR'd. If not provided, zeroth position is assumed.
 * @param {Object} data The declarative viewmodel data
 * @returns {ObjectArray} The array of child node objects to be displayed.
 */
export let extractChildren = function( response, searchKeyArray, data ) {
    var childNodes = [];
    var counter = 0;
    if( response && response.classChildren ) {
        var keys = Object.keys( response.classChildren );
        var parentIdToBeUsed = null;
        if( searchKeyArray && !classifyUtils.isNullOrEmpty( searchKeyArray ) ) {
            for( var i = 0; i < searchKeyArray.length; i++ ) {
                // If the searchKey exists in the children keys, then use it
                parentIdToBeUsed = _.includes( keys, searchKeyArray[ i ] ) ? searchKeyArray[ i ] : parentIdToBeUsed;
                i = parentIdToBeUsed !== null ? searchKeyArray.length : i;
            }
        }
        // If parentIdToBeUsed is still null, assume zeroth position key to be used
        parentIdToBeUsed = parentIdToBeUsed === null ? keys[ 0 ] : parentIdToBeUsed;

        var children = response.classChildren[ parentIdToBeUsed ].children;
        var searchActive = false;
        var parentTreeNode = null;
        // Check if search is active
        if( data && data.searchBox && data.searchBox.dbValue && data.searchBox.dbValue !== '' ) {
            searchActive = true;
            parentTreeNode = exports.getTreeNodeFromClassId( data, parentIdToBeUsed );
        }

        _.forEach( children, function( child ) {
            var childClassId = classifyService.getPropertyValue( child.properties, classifyService.UNCT_CLASS_ID );

            if( searchActive ) {
                // If search is active and childClassId is not to be added to VNCs then do not push it to childNodes.
                if( !exports.checkIfChildClassToBeAddedToVNC( parentTreeNode, childClassId ) ) {
                    return;
                }
            }
            var classObject = {};

            classObject.index = counter++;
            classifyService.parseIndividualClassDescriptor( child, true, classObject );
            childNodes.push( classObject );
        } );
    }
    return childNodes;
};

/**
 * Following method iterates thorugh available view model to find the parent
 * @param {*} data Declarative view model
 * @param {*} ctx  application context
 * @param {*} parents current parent container
 * @param {*} currentNode evaluating node
 * @returns {bool} true/false
 */
export let getParents = function( data, ctx, parents, currentNode ) {
    if( ctx.panelIsClosed !== true ) {
        data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects.some( function( VMTN /* , index */ ) {
            if( currentNode.parent_Id === VMTN.id ) {
                var isExists = false;
                // To avoid data duplication issue, we need to check whether there is a node exists in the ctx.parents
                for( var i = 0; i < ctx.parents.length; i++ ) {
                    if( ctx.parents[ i ].id === VMTN.id ) {
                        isExists = true;
                    }
                }
                if( isExists === false ) {
                    ctx.parents.unshift( VMTN );
                }
                eventBus.publish( ctx.tableSummaryDataProviderName + '.updateClassBreadCrumb' );

                exports.getParents( data, ctx, parents, VMTN );

                return true;
            }
            return false;
        } );
    } else {
        /**
         * It means chop of remanining nodes
         */
        eventBus.publish( ctx.tableSummaryDataProviderName + '.updateClassBreadCrumb' );
        var temp = [];
        temp = ctx.parents;
        ctx.parents = [];

        for( var i = 0; i < temp.length; i++ ) {
            if( ctx.selectedCrumb.class_Id !== temp[ i ].id ) {
                ctx.parents.push( temp[ i ] );
            } else {
                ctx.parents.push( temp[ i ] );
                ctx.selectedNode = temp[ i ];
                break;
            }
        }
        exports.getFirstLevelChildrenForTree( data, ctx, ctx.selectedNode );
        return false;
    }
};

export default exports = {
    updateImageAndPublishEvent,
    getClassificationDataOptions,
    resetScope,
    getTreeStructure,
    navigateToNode,
    getParentHierarchy,
    loadPropertiesJS,
    loadTableProperties,
    loadColumns,
    sortHierarchy,
    resolveWithEmptyResults,
    performClassExpansion,
    parseVNC,
    workOnChildAndParentVNC,
    updateSelectedClassFromDataProvider,
    drillToNextLevel,
    parseExpansion,
    parseVNCforDeselection,
    parseChildandParentVNC,
    updateClassBreadCrumb,
    getSelectedCrumb,
    clearClassBreadCrumb,
    addTemporaryRootToHierarchy,
    getTreeNodeFromClassId,
    checkIfChildClassToBeAddedToVNC,
    getHighlightKeywords,
    getFirstLevelChildrenForTree,
    getNextLevelChildrenForTree,
    selectPreviousNode,
    assertVisibilityInViewModel,
    buildClsBreadcrumb,
    loadBreadcrumbTitle,
    updateSelected,
    extractChildren,
    getParents
};
/*
 * Classification panel service utility
 *
 * @memberof NgServices
 * @member classifyTreeService
 */
app.factory( 'classifyTreeService', () => exports );
