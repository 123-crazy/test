// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/occmgmtSubsetUtils
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import commandMapSvc from 'js/commandsMapService';
import cdmService from 'soa/kernel/clientDataModel';
import dateTimeSvc from 'js/dateTimeService';
import _ from 'lodash';

var exports = {};


/**
 * Return the selected objects if they belong to the same product/subset
 *
 * @param {String} contextKey - context key
 * @returns {Object} Valid target objects
 */
export let validateSelectionsToBeInSingleProduct = function( contextKey ) {
    var selections = appCtxService.getCtx( 'mselected' );
    var selectionObjs = [];
    if( selections ) {
        // fetch product of last selected element and it should be equal to product of rest selections
        var pciOfLastSelectedElement = cdmService.getObject( getProductContextForProvidedObject( selections[ selections.length - 1 ] ), contextKey  );
        if( pciOfLastSelectedElement ) {
            var productOfLastSelectedElement = pciOfLastSelectedElement.props.awb0Product.dbValues[ 0 ];

            if( selections !== null && selections.length > 0 ) {
                for( var i = 0; i < selections.length; i++ ) {
                    if( commandMapSvc.isInstanceOf( 'Fgf0PartitionElement', selections[ i ].modelType ) ) {
                        // Partitions are not supported in AW 5.2 for inclusion in recipe
                       continue;
                    }

                    if ( appCtxService.ctx.aceActiveContext && appCtxService.ctx.aceActiveContext.context &&
                         appCtxService.ctx.aceActiveContext.context.openedElement && appCtxService.ctx.aceActiveContext.context.openedElement.modelType ) {
                        //For session, the opened item is not equal to root item. The selection of root item is
                        // not a valid target for filter recipe
                        if ( appCtxService.ctx.aceActiveContext.context.openedElement.modelType.typeHierarchyArray.indexOf( 'Fnd0AppSession' ) > -1 &&
                        appCtxService.ctx.aceActiveContext.context.rootElement.uid === selections[i].uid ) {
                            continue;
                        }

                        var underlyingObj = null;
                        //  Subset under Workset is not supported as valid object for recipe creation
                        var parentUid = exports.getParentUid( selections[ i ] );
                        if( parentUid ) {
                            var parentObj = cdmService.getObject( parentUid );
                            if( parentObj ) {
                            if( parentObj.props.awb0UnderlyingObject ) {
                                    var parentUnderlyingObj = cdmService.getObject( parentObj.props.awb0UnderlyingObject.dbValues[ 0 ] );
                                    if( parentUnderlyingObj && parentUnderlyingObj.modelType.typeHierarchyArray.indexOf( 'Fnd0WorksetRevision' ) > -1 ) {
                                        continue;
                                    }
                            }else{
                                continue;
                            }
                            }
                        }

                        if( commandMapSvc.isInstanceOf( 'Awb0Element', selections[ i ].modelType ) &&
                            pciOfLastSelectedElement.uid === cdmService.getObject( getProductContextForProvidedObject( selections[ i ] ) ).uid &&
                            appCtxService.ctx.aceActiveContext.context.openedElement.uid !== selections[ i ].uid  ) {
                            underlyingObj = cdmService.getObject( selections[ i ].props.awb0UnderlyingObject.dbValues[ 0 ] );
                        }
                        if( underlyingObj !== null ) {
                            selectionObjs.push( selections[ i ] );
                        }
                    }
                }
            }
        }
    }
    return selectionObjs;
};

/**
 * Get the product context for the given object
 * @param {Object} object Object whose UID needs to be figured out
 * @param {String} contextKey the context key
 * @return {Object} Uid of the productContext corresponding to the selected object if it is available in the elementToPCIMap;
 *         the productContext from the URL otherwise
 */
 export let getProductContextForProvidedObject = function( object, contextKey ) {
    var contextObj;
    if( contextKey ) {
        contextObj = appCtxService.ctx[contextKey];
    } else {
        contextObj = appCtxService.ctx.aceActiveContext;
    }
    if( contextObj && contextObj.context ) {
        if( contextObj.context.elementToPCIMap ) {
            var parentObject = object;

            do {
                if( contextObj.context.elementToPCIMap[ parentObject.uid ] ) {
                    return contextObj.context.elementToPCIMap[ parentObject.uid ];
                }

                var parentUid = exports.getParentUid( parentObject );
                parentObject = cdmService.getObject( parentUid );
            } while( parentObject );
        } else if( contextObj.context.currentState ) {
            return contextObj.context.currentState.pci_uid;
        }
    }
    return null;
};

/** Returns the parent UID
 * @param {IModelObject} modelObject - model object
 * @return {Object} parent uid if found or null
 */
export let getParentUid = function( modelObject ) {
    if( modelObject && modelObject.props ) {
        var props = modelObject.props;

        var uid;

        if( props.awb0BreadcrumbAncestor && !_.isEmpty( props.awb0BreadcrumbAncestor.dbValues ) ) {
            uid = props.awb0BreadcrumbAncestor.dbValues[ 0 ];
        } else if( props.awb0Parent && !_.isEmpty( props.awb0Parent.dbValues ) ) {
            uid = props.awb0Parent.dbValues[ 0 ];
        }

        if( cdmService.isValidObjectUid( uid ) ) {
            return uid;
        }
    }

    return null;
};

/** Sets the ui value for replay date
 * @param {Object} data - view model data object
 */
export let setReplayDate = function( data ) {
    if( data && data.replayDate ) {
        var date = new Date( data.replayDate.dbValue );
        if( date && date.getTime() ) {
            data.replayDate.uiValue = dateTimeSvc.formatSessionDateTime( date );
        }
    }
};

/**
 * This method is used for calling Drag and drop functionality to Session object
 */
 export let sessionPasteHandler = function() {
    // Disable paste for session object
    return;
};

export default exports = {
    validateSelectionsToBeInSingleProduct,
    getProductContextForProvidedObject,
    getParentUid,
    setReplayDate,
    sessionPasteHandler

};
/**
 * @memberof NgServices
 * @member occmgmtSubsetUtils
 */
app.factory( 'occmgmtSubsetUtils', () => exports );
