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
 * @module js/acePartialSelectionService
 */

 import app from 'app';
 import appCtxSvc from 'js/appCtxService';
 import cdm from 'soa/kernel/clientDataModel';
 import eventBus from 'js/eventBus';
 import _t from 'js/splmTableNative';
 import _ from 'lodash';

 'use strict';

 var exports = {};

 var evaluateIsUnpackCommandVisibility = function() {
     var context = appCtxSvc.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$
     if( _.isUndefined( context ) || _.isUndefined( context.acePartialSelection ) ) {
         return;
     }
     var acePartialSelection = context.acePartialSelection;
     acePartialSelection.isPackedHiddenNodeSelected = false;
     for ( const [ key, value ] of acePartialSelection.partialSelectionInfo.entries() ) {
         var visibleObject = cdm.getObject( value );
         if( !_.isUndefined( visibleObject )
         && !_.isUndefined( visibleObject.props.awb0IsPacked )
         &&  visibleObject.props.awb0IsPacked.dbValues.length > 0
         &&  visibleObject.props.awb0IsPacked.dbValues[0] === '1'  ) {
             acePartialSelection.isPackedHiddenNodeSelected = true;
             break;
         }
     }
 };

 export let restorePartialSelection = function() {
     var context = appCtxSvc.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$
     if( _.isUndefined( context ) || _.isUndefined( context.acePartialSelection ) || _.isUndefined( context.vmc ) || _.isUndefined( appCtxSvc.ctx.mselected ) ) {
         return;
     }
     var acePartialSelection = context.acePartialSelection;
     _.forEach( appCtxSvc.ctx.mselected, function( selected ) {
         // check if vm node exists for selection, else its hidden selection
         var isHiddenNode = context.vmc.findViewModelObjectById( selected.uid ) === -1;

         if( isHiddenNode === true ) {
             // we have hidden node, we need to find corresponding visible node
             _.forEach( acePartialSelection.partialSelectionInfoCache, function( partialSelectionInfoCacheSet ) {
                 if( partialSelectionInfoCacheSet.has( selected.uid ) === true ) {
                     _.forEach( Array.from( partialSelectionInfoCacheSet ), function( elementUid ) {
                         var isVisibleNode = context.vmc.findViewModelObjectById( elementUid ) !== -1;
                         if( isVisibleNode === true ) {
                             acePartialSelection.partialSelectionInfo.set( selected.uid, elementUid );
                             acePartialSelection.partialSelectionInfo.set( elementUid, elementUid );
                             return false; // break;
                         }
                     } );
                 }
             } );
         }
     } );
 };

 export let setPartialSelection = function( objectsToSelect, objectsToHighlight ) {
     if( _.isUndefined( objectsToSelect ) || _.isUndefined( objectsToHighlight ) ) {
         return;
     }

     var context = appCtxSvc.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$
     if( _.isUndefined( context.acePartialSelection ) ) {
         context.acePartialSelection = {
             partialSelectionInfo : new Map(),
             partialSelectionInfoCache : [],
             isPackedHiddenNodeSelected : false
         };
     }
     var acePartialSelection = context.acePartialSelection;

     var partialSelectionChanged = false;
     for( var inx = 0; inx < objectsToSelect.length; inx++ ) {
         if( !_.isUndefined( objectsToHighlight[ inx ] ) ) {
             var objectToHighligh = cdm.getObject( objectsToHighlight[inx].uid );
             if( !_.isUndefined( objectToHighligh ) && objectToHighligh !== null ) {
                 partialSelectionChanged = true;
                 acePartialSelection.partialSelectionInfo.set( objectsToSelect[inx].uid, objectsToHighlight[inx].uid );

                 // update partialSelectionInfoCache
                 var partialSelectionSetExist = false;
                 _.forEach( acePartialSelection.partialSelectionInfoCache, function( partialSelectionInfoCacheSet ) {
                     if( partialSelectionInfoCacheSet.has( objectsToSelect[inx].uid ) ||
                         partialSelectionInfoCacheSet.has( objectsToHighlight[inx].uid ) ) {
                             partialSelectionSetExist = true;
                             partialSelectionInfoCacheSet.add( objectsToSelect[inx].uid );
                             partialSelectionInfoCacheSet.add( objectsToHighlight[inx].uid );
                             return false; // break
                     }
                 } );
                 if( partialSelectionSetExist === false ) {
                     var partialSelectionInfoCacheSet = new Set();
                     partialSelectionInfoCacheSet.add( objectsToSelect[inx].uid );
                     partialSelectionInfoCacheSet.add( objectsToHighlight[inx].uid );
                     acePartialSelection.partialSelectionInfoCache.push( partialSelectionInfoCacheSet );
                 }
             }
         }
     }
     if( partialSelectionChanged === true ) {
         eventBus.publish( 'reRenderTableOnClient' );
         evaluateIsUnpackCommandVisibility();
     }
 };

 export let removePartialSelection = function( newSelections, oldSelections ) {
     if( _.isUndefined( newSelections ) || _.isUndefined( oldSelections ) ) {
         return;
     }

     var context = appCtxSvc.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$
     if( _.isUndefined( context ) || _.isUndefined( context.acePartialSelection ) ) {
         return;
     }
     var acePartialSelection = context.acePartialSelection;
     var removedSelections = oldSelections.filter( x => !newSelections.includes( x ) );
     var partialSelectiionChanged = false;
     for( var inx = 0; inx < removedSelections.length; ++inx ) {
         if( isPartiallySelected( removedSelections[inx] ) ) {
             partialSelectiionChanged = true;
             acePartialSelection.partialSelectionInfo.delete( removedSelections[inx] );
         }
     }
     if( partialSelectiionChanged === true || newSelections.length === 0 ) {
         eventBus.publish( 'reRenderTableOnClient' );
         evaluateIsUnpackCommandVisibility();
     }
 };

 export let isPartiallySelected = function( elementUid ) {
     var context = appCtxSvc.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$
     if( _.isUndefined( context ) || _.isUndefined( context.acePartialSelection ) || _.isUndefined( elementUid ) ) {
         return false;
     }
     return context.acePartialSelection.partialSelectionInfo.has( elementUid );
 };

 export let isPartiallySelectedInTree = function( elementUid ) {
     var context = appCtxSvc.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$
     var isNodeVisibleInTree = context.vmc.findViewModelObjectById( elementUid ) !== -1;
     if( !isNodeVisibleInTree ) {
         //If the node is not visible it may be hidden under packed visible node
         var visibleUid = context.acePartialSelection.partialSelectionInfo.get( elementUid );
         var isVisible = context.vmc.findViewModelObjectById( visibleUid ) !== -1;
     }
     if( isNodeVisibleInTree || isVisible ) {
         return true;
     }
     context.acePartialSelection.hiddenNode = null;
     context.acePartialSelection.hiddenNode = elementUid;
     context.transientRequestPref.focusSelectionFromViz = true;
     return false;
 };

 export let doesContainHiddenPackedSelection = function( ) {
     var context = appCtxSvc.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$
     if( _.isUndefined( context ) || _.isUndefined( context.acePartialSelection ) || _.isUndefined( context.acePartialSelection.hiddenNode ) ) {
         return false;
     }
     return context.acePartialSelection.hiddenNode !== null;
 };

 export let doesContainHiddenPackedSelectionBasedOnPCI = function( pci_uid ) {
    if( !_.isUndefined( pci_uid ) ) {
        var context = appCtxSvc.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$
        var productCtx = cdm.getObject( pci_uid );
        if( productCtx  && !_.isUndefined( productCtx.props ) && !_.isUndefined( productCtx.props.awb0PackSimilarElements ) && productCtx.props.awb0PackSimilarElements.dbValues[ 0 ] === '0' && context && context.acePartialSelection ) {
            context.acePartialSelection.hiddenNode = null;
            return false;
        }
    }
    return doesContainHiddenPackedSelection();
};

 export let doesContainPartialSelections = function( elements ) {
     var isPartialSelection = false;
     _.forEach( elements, function( element ) {
         if( !_.isUndefined( element ) && isPartiallySelected( element.uid ) ) {
             isPartialSelection = true;
             return false; // break
         }
     } );
     return isPartialSelection;
 };

 export let isHiddenNodePresentInPartialSelection = function( elementUid, elementContextKey ) {
    var context;
    if( !_.isUndefined( elementContextKey ) ) {
        context = appCtxSvc.getCtx( elementContextKey );
    } else {
        context = appCtxSvc.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$
    }
     if( _.isUndefined( context ) || _.isUndefined( context.acePartialSelection ) || _.isUndefined( elementUid ) ) {
         return false;
     }
     if( context.acePartialSelection.partialSelectionInfo.has( elementUid ) ) {
         var visibleUid = context.acePartialSelection.partialSelectionInfo.get( elementUid );
         return visibleUid !== elementUid;  // hidden node will have different visible node.
     }
     return false;
 };

 export let isVisibleNodePresentInPartialSelection = function( elementUid ) {
     var context = appCtxSvc.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$
     if( _.isUndefined( context ) || _.isUndefined( context.acePartialSelection ) || _.isUndefined( elementUid ) ) {
         return false;
     }

     for ( const [ key, value ] of context.acePartialSelection.partialSelectionInfo.entries() ) {
         if( !_.isUndefined( value ) && value === elementUid ) {
             return true;
         }
     }
     return false;
 };

 export let getVisibleNodeForHiddenNodeInPartialSelection = function( elementUid ) {
     var context = appCtxSvc.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$
     if( _.isUndefined( context ) || _.isUndefined( context.acePartialSelection ) || _.isUndefined( elementUid ) ) {
         return;
     }

     if( context.acePartialSelection.partialSelectionInfo.has( elementUid ) ) {
         return context.acePartialSelection.partialSelectionInfo.get( elementUid );
     }
 };

 let partialSelectionRenderer = {
     action: function( column, vmo, tableElem, rowElem ) {
         var cellContent = _t.Cell.createElement( column, vmo, tableElem, rowElem );
         if( rowElem ) {
             rowElem.classList.add( 'aw-occmgmtjs-partialSelection' );
         }
         return cellContent;
     },
     condition: function( column, vmo ) {
         if( isVisibleNodePresentInPartialSelection( vmo.uid ) === true ) {
             return true;
         }
         return false;
     },
     name: 'partialSelectionRenderer'
 };

 export default exports = {
     setPartialSelection,
     removePartialSelection,
     restorePartialSelection,
     isPartiallySelected,
     isPartiallySelectedInTree,
     doesContainPartialSelections,
     isHiddenNodePresentInPartialSelection,
     isVisibleNodePresentInPartialSelection,
     getVisibleNodeForHiddenNodeInPartialSelection,
     partialSelectionRenderer,
     doesContainHiddenPackedSelection,
     doesContainHiddenPackedSelectionBasedOnPCI
 };
 app.factory( 'acePartialSelectionService', () => exports );

