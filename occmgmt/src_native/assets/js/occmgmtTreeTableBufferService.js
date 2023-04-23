/* eslint-disable max-lines */
//@<COPYRIGHT>@
//==================================================
//Copyright 2022.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 * @module js/occmgmtTreeTableBufferService
 */

import app from 'app';
import appCtxSvc from 'js/appCtxService';
import awTableStateService from 'js/awTableStateService';
import awTableSvc from 'js/awTableService';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';

/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};

var _getBufferPageSize = function() {
    var bufferPageSize = 400; // default page size
    if( !_.isUndefined( appCtxSvc.ctx.preferences ) && !_.isUndefined( appCtxSvc.ctx.preferences.AWB_BufferPropLoadPageSize ) && appCtxSvc.ctx.preferences.AWB_BufferPropLoadPageSize.length > 0 ) {
        bufferPageSize = parseInt( appCtxSvc.ctx.preferences.AWB_BufferPropLoadPageSize[ 0 ] );
    }
    return bufferPageSize;
};

var _getInitialPropertyLoadPageSize = function() {
    var initialPropLoadPageSize = 100; // default page size
    if( !_.isUndefined( appCtxSvc.ctx.preferences ) && !_.isUndefined( appCtxSvc.ctx.preferences.AWB_InitialPropLoadPageSize ) && appCtxSvc.ctx.preferences.AWB_InitialPropLoadPageSize.length > 0 ) {
        initialPropLoadPageSize = parseInt( appCtxSvc.ctx.preferences.AWB_InitialPropLoadPageSize[ 0 ] );
    }
    return initialPropLoadPageSize;
};

var _isScrolledPagePropertyLoadIsInProgress = function( vmc, scrollPosition ) {
    for( var inx = scrollPosition.firstIndex; inx <= scrollPosition.lastIndex; ++inx ) {
        var vmo = vmc.getViewModelObject( inx );
        if( !_.isUndefined( vmo ) && ( _.isUndefined( vmo.props ) || vmo.props.length === 0 ) ) {
            return true;
        }
    }
    return false;
};

var _getEmptyVmosBasedOnPosition = function( vmNodes, startPos, lastPos, maxPageSize, bufferPageWidth ) {
    var totalNoOfPages = parseInt( vmNodes.length / maxPageSize ) + 1;
    var pageOfStartIndex = parseInt( startPos / maxPageSize ) - bufferPageWidth > 0 ? parseInt( startPos / maxPageSize ) - bufferPageWidth : 0;
    var pageOfEndIndex = parseInt( lastPos / maxPageSize ) + bufferPageWidth < totalNoOfPages ? parseInt( lastPos / maxPageSize ) + bufferPageWidth : totalNoOfPages;
    var page = {
        startIndex: -1,
        endIndex: -1,
        emptyVmos: []
    };

    page.startIndex = pageOfStartIndex * maxPageSize;
    page.endIndex = ( pageOfEndIndex + 1 ) * maxPageSize;
    for( var inx = page.startIndex; inx < page.endIndex; ++inx ) {
        var vmo = vmNodes[ inx ];
        if( !_.isUndefined( vmo ) && _.isUndefined( vmo.props ) && page.emptyVmos.length < maxPageSize ) {
            page.emptyVmos.push( vmo );
        }
    }
    return page;
};

var _bufferProperties = function( contextKey, declViewModel, uwDataProvider, uwPropertyProvider, emptyVmos ) {
    if( _.isUndefined( declViewModel ) || _.isUndefined( uwDataProvider ) || _.isUndefined( uwPropertyProvider ) ) {
        return;
    }
    if( _.isUndefined( emptyVmos ) || !_.isUndefined( emptyVmos.length ) && emptyVmos.length <= 0 ) {
        return;
    }
    var columnInfos = [];

    _.forEach( uwDataProvider.cols, function( columnInfo ) {
        if( !columnInfo.isTreeNavigation ) {
            columnInfos.push( columnInfo );
        }
    } );
    var propertyLoadRequest = {
        parentNode: null,
        childNodes: emptyVmos,
        columnInfos: columnInfos
    };
    var dataCtxNode = {
        data: declViewModel,
        ctx: appCtxSvc.ctx,
        $parent: {
            contextKey: contextKey
        }
    };
    var propertyLoadInput = awTableSvc.createPropertyLoadInput( [ propertyLoadRequest ] );
    return uwPropertyProvider.getProperties( dataCtxNode, propertyLoadInput );
};

var _getNextNodeForExpandBelow = function( declViewModel, vmc ) {
    var gridId = Object.keys( declViewModel.grids )[ 0 ];
    var ttState = awTableStateService.getTreeTableState( declViewModel, gridId );
    var vmoForExpandBelow;
    _.forEach( vmc.loadedVMObjects, function( vmo ) {
        if( _.isUndefined( vmoForExpandBelow ) && !_.isUndefined( vmo ) && awTableStateService.isNodeExpanded( ttState, vmo ) &&
            ( _.isUndefined( vmo.children ) || _.isUndefined( vmo.children.length === 0 ) ) ) {
            vmoForExpandBelow = vmo;
        }
    } );
    return vmoForExpandBelow;
};

var _bufferExpandBelowPage = function( vmoForExpandBelow, declViewModel, vmc, uwDataProvider ) {
    var gridId = Object.keys( declViewModel.grids )[ 0 ];
    var ttState = awTableStateService.getTreeTableState( declViewModel, gridId );
    if( !_.isUndefined( vmoForExpandBelow ) && !_.isUndefined( vmoForExpandBelow.isInExpandBelowMode ) && vmoForExpandBelow.isInExpandBelowMode === true ) {
        if( awTableStateService.isNodeExpanded( ttState, vmoForExpandBelow ) && ( _.isUndefined( vmoForExpandBelow.children ) || _.isUndefined( vmoForExpandBelow.children.length === 0 ) ) ) {
            var vmoIdx = vmc.findViewModelObjectById( vmoForExpandBelow.uid );
            var contextKey = appCtxSvc.getCtx( 'aceActiveContext.key' ); //$NON-NLS-1$
            if( !_.isUndefined( uwDataProvider.scrollPosition ) && uwDataProvider.scrollPosition.firstIndex > vmoIdx || uwDataProvider.scrollPosition.lastIndex < vmoIdx ) {
                var dataCtxNode = {
                    data: declViewModel,
                    ctx: appCtxSvc.ctx,
                    $parent: {
                        contextKey: contextKey
                    }
                };
                return uwDataProvider.getTreeNodePage( dataCtxNode, vmoForExpandBelow, null, true, vmc.loadedVMObjects[ 0 ] );
            }
        }
    }
};

/*
 */
export let bufferExtraPages = function( declViewModel, uwDataProvider, uwPropertyProvider, scrollEventData ) {
    var maxPageSize = _getBufferPageSize();
    if( maxPageSize <= 0 ) { // property load buffering is disabled.
        return AwPromiseService.instance.resolve( null );
    }

    // return if already buffering in progress
    if( !_.isUndefined( uwDataProvider.bufferExtraPagesInProgress ) && uwDataProvider.bufferExtraPagesInProgress === true ) {
        return AwPromiseService.instance.resolve( null );
    }

    // verify input args are invalid
    if( _.isUndefined( declViewModel ) || _.isUndefined( uwDataProvider ) || _.isUndefined( uwPropertyProvider ) ||
        _.isUndefined( scrollEventData ) || _.isUndefined( scrollEventData.firstRenderedItem ) || _.isUndefined( scrollEventData.lastRenderedItem ) ) {
        return AwPromiseService.instance.resolve( null );
    }

    // if scroll position has not changed then no action to be done
    if( !_.isUndefined( uwDataProvider.scrollPosition ) &&
        ( uwDataProvider.scrollPosition.firstIndex === scrollEventData.firstRenderedItem.index ||
            uwDataProvider.scrollPosition.lastIndex === scrollEventData.lastRenderedItem.index ) ) {
        return AwPromiseService.instance.resolve( null );
    }

    // Scroll position is changed, so buffer extra pages
    // get scroll position from scroll event data
    uwDataProvider.scrollPosition = {
        firstIndex: scrollEventData.firstRenderedItem.index,
        lastIndex: scrollEventData.lastRenderedItem.index
    };

    // get VMOs in active view
    var contextKey = appCtxSvc.getCtx( 'aceActiveContext.key' ); //$NON-NLS-1$
    var context = appCtxSvc.getCtx( contextKey );
    var vmc = context.vmc;
    if( _.isUndefined( vmc ) || _.isUndefined( vmc.loadedVMObjects ) || vmc.loadedVMObjects.length <= 0 ) {
        return AwPromiseService.instance.resolve( null );
    }

    // if tree loading or property loading in progress then ignore.
    if( _isScrolledPagePropertyLoadIsInProgress( vmc, uwDataProvider.scrollPosition ) ) {
        return AwPromiseService.instance.resolve( null );
    }

    // identify empty VMOs
    var empyVmoPage;
    var bufferPageWidth = 1;
    do {
        empyVmoPage = _getEmptyVmosBasedOnPosition( vmc.loadedVMObjects, uwDataProvider.scrollPosition.firstIndex, uwDataProvider.scrollPosition.lastIndex, maxPageSize, bufferPageWidth );
        bufferPageWidth++; // increase buffer page width to attempt bufferring of broader data around scroll
    } while( empyVmoPage.emptyVmos.length < maxPageSize && ( empyVmoPage.endIndex < vmc.loadedVMObjects.length || 0 !== empyVmoPage.startIndex ) );

    var emptyVmos = empyVmoPage.emptyVmos;
    if( emptyVmos.length > 0 ) {
        // buffer properties
        var promise = _bufferProperties( contextKey, declViewModel, uwDataProvider, uwPropertyProvider, emptyVmos );
        if( !_.isUndefined( promise ) && promise !== null ) {
            uwDataProvider.bufferExtraPagesInProgress = true;
            promise.then( function() {
                // success
                uwDataProvider.bufferExtraPagesInProgress = false;
            }, function() {
                // error
                uwDataProvider.bufferExtraPagesInProgress = false;
            } ).catch( function() {
                // exception
                uwDataProvider.bufferExtraPagesInProgress = false;
            } );
            return promise;
        }
    } else if( !_.isUndefined( context.nodeUnderExpandBelow ) ) {
        // buffer next expand below page
        var vmoForExpandBelow = _getNextNodeForExpandBelow( declViewModel, vmc );
        if( !_.isUndefined( vmoForExpandBelow ) ) {
            // mock vmo expanded state to true
            vmoForExpandBelow.isExpanded = true;
            var promise = _bufferExpandBelowPage( vmoForExpandBelow, declViewModel, vmc, uwDataProvider );
            if( !_.isUndefined( promise ) && promise !== null ) {
                uwDataProvider.bufferExtraPagesInProgress = true;
                promise.then( function() {
                    // success
                    uwDataProvider.bufferExtraPagesInProgress = false;
                }, function() {
                    // error
                    uwDataProvider.bufferExtraPagesInProgress = false;
                    vmoForExpandBelow.isExpanded = false;
                } ).catch( function() {
                    // exception
                    uwDataProvider.bufferExtraPagesInProgress = false;
                    vmoForExpandBelow.isExpanded = false;
                } );
                return promise;
            }
            vmoForExpandBelow.isExpanded = false;
        }
    }
    return AwPromiseService.instance.resolve( null );
};

var addExtraBufferToPage = function( input, uwDataProvider, allVMNodes ) {
    var firstPageSize = _getInitialPropertyLoadPageSize();
    if( firstPageSize <= 0 ) { // initial property load buffering is disabled.
        return;
    }

    if( _.isUndefined( input ) || _.isUndefined( uwDataProvider ) ) {
        return;
    }
    // we might have vmNodes array as input or propertyLoadInput as input, extract vmNodes array from input
    var vmNodes;
    if( !_.isUndefined( input.propertyLoadInput ) && !_.isUndefined( input.propertyLoadInput.propertyLoadRequests ) &&
        !_.isEmpty( input.propertyLoadInput.propertyLoadRequests ) ) {
        vmNodes = input.propertyLoadInput.propertyLoadRequests[ 0 ].childNodes;
    } else {
        vmNodes = input.vmNodes;
    }

    if( _.isUndefined( vmNodes ) || _.isEmpty( vmNodes ) || firstPageSize <= vmNodes.length ) {
        return;
    }

    if( _.isUndefined( allVMNodes ) ) {
        var vmc = uwDataProvider.viewModelCollection;
        if( _.isUndefined( vmc ) ) {
            return;
        }
        allVMNodes = vmc.loadedVMObjects;
    }

    var vmoStartIndex = allVMNodes.indexOf( vmNodes[ 0 ] );
    var vmoLastIndex = allVMNodes.indexOf( vmNodes[ vmNodes.length - 1 ] );
    var bufferPageWidth = 1;
    var empyVmoPage = _getEmptyVmosBasedOnPosition( allVMNodes, vmoStartIndex, vmoLastIndex, firstPageSize, bufferPageWidth );

    // update output
    _.forEach( empyVmoPage.emptyVmos, function( vmo ) {
        var nodeFoundInInput = _.find( vmNodes, function( inputVmo ) {
            return inputVmo.uid === vmo.uid;
        } );

        if( _.isUndefined( nodeFoundInInput ) ) {
            vmNodes.push( vmo );
        }
    } );
};

export default exports = {
    addExtraBufferToPage,
    bufferExtraPages
};

/**
 * @memberof NgServices
 * @member occmgmtTreeTableBufferService
 */
app.factory( 'occmgmtTreeTableBufferService', () => exports );
