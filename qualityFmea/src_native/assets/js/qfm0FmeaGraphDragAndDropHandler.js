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
 * This implements the graph drag and drop handler interface APIs defined by aw-graph widget to provide graph drag and
 * drop functionalities.
 *
 * @module js/qfm0FmeaGraphDragAndDropHandler
 */
import app from 'app';
import eventBus from 'js/eventBus';
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import messagingService from 'js/messagingService';
import appCtxService from 'js/appCtxService';
import _localeSvc from 'js/localeService';
import qfm0FmeaManagerUtils from 'js/qfm0FmeaManagerUtils';
import qfm0FmeaManagerUtils2 from 'js/qfm0FmeaManagerUtils2';

var exports = {};

var BCN_NODE_HOVERED_CLASS = 'relation_node_hovered_style_svg';

var BCN_TEXT_HOVERED_CLASS = 'relation_TEXT_hovered_style_svg';

/**
 * Set the node CSS class for high light / normal status
 *
 * @param {Object} graph - graph interface to update the binding
 * @param {Object} graphItem - graph item needs to highlight or not
 * @param {String} className - CSS name for highlight or not
 */
var setNodeHoveredClass = function( graph, graphItem, className ) {
    if( graphItem && graphItem.getItemType() === 'Node' ) {
        var nodeObject = graphItem.getAppObj();
        var bindingData = {};
        if( nodeObject ) {
            if( className && className.length > 0 ) {
                bindingData[ BCN_NODE_HOVERED_CLASS ] = className;
                bindingData[ BCN_TEXT_HOVERED_CLASS ] = className;
            } else {
                bindingData[ BCN_NODE_HOVERED_CLASS ] = 'aw-graph-noeditable-area';
                bindingData[ BCN_TEXT_HOVERED_CLASS ] = '';
            }
        }

        graph.updateNodeBinding( graphItem, bindingData );
    }
};

/**
 * Check whether the graph item could be a target of current DnD operation. The Apps should implement the API
 * itself.
 *
 * @param {Object[]} draggingGraphItems - array of the graph items been dragging
 * @param {Object} hoveredGraphItem - the graph item under the dragging cursor, null for empty area of the graph
 * @return {Boolean} true - the graph item could be the target, otherwise false.
 */
var isDroppable = function (draggingGraphItems, hoveredGraphItem) {
    // Just the check the hovered item and dragging items relations
    if (!hoveredGraphItem) {
        return true;
    }
    if (typeof draggingGraphItems[0] === 'string') {
        let draggingObj = cdm.getObject(draggingGraphItems[0]);

        if ((hoveredGraphItem.appData && hoveredGraphItem.appData.nodeObject.modelType.typeHierarchyArray.indexOf('Qfm0FunctionElement') > -1) && (draggingObj.modelType.typeHierarchyArray.indexOf('Qfm0FunctionEleSpec') > -1 || draggingObj.modelType.typeHierarchyArray.indexOf('Qfm0FunctionElement') > -1)) {
            return true;
        }
        if ((hoveredGraphItem.appData && hoveredGraphItem.appData.nodeObject.modelType.typeHierarchyArray.indexOf('Qfm0FailureElement') > -1) && (draggingObj.modelType.typeHierarchyArray.indexOf('Qc0Failure') > -1 || draggingObj.modelType.typeHierarchyArray.indexOf('Qfm0FailureElement') > -1)) {
            return true;
        }
    }
    return false;
};


/**
 * API to check whether the graph item can be the target item of the DnD operation
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object[]} draggingGraphItems - array of the graph items been dragging
 * @param {Object} hoveredGraphItem - the graph item under the dragging cursor, null for empty area of the graph
 * @param {String} dragEffect - String to indicate the gesture, should be 'COPY' or 'MOVE' for paste and cut
 *            respectively
 * @param {Object[]} outItems - the dragging graph items just out of graph items, the app can update the status when
 *            the DnD out of some graph items.
 * @param {PointD} cursorLocation - the cursor location
 * @return {Boolean} - true if the hoveredGraphItem is a valid droppable graph item, otherwise false
 */
export let onGraphDragOver = function( graphModel, draggingGraphItems, hoveredGraphItem, dragEffect, outItems,
    cursorLocation ) {
    var graph = graphModel.graphControl.graph;
    var droppable = isDroppable( draggingGraphItems, hoveredGraphItem );
    if( hoveredGraphItem && droppable ) {
        setNodeHoveredClass( graph, hoveredGraphItem, 'aw-qualityFmea-netViewHover' );
    }

    // Turn off the high light effect.
    if( outItems && outItems.length > 0 ) {
        for( var index = 0; index < outItems.length; index++ ) {
            setNodeHoveredClass( graph, outItems[ index ], null );
        }
    }
    return droppable;
};


/**
 * to create rlation between target node and dragging object
 * @param {Array} draggingGraphItems - list of dragging object ID
 * @param {Object} targetGraphItem - target object
 */
var createNewRelationforNode = function( draggingGraphItems, targetGraphItem ) {
    if( draggingGraphItems.length > 0 && typeof draggingGraphItems[ 0 ] === 'string' ) {
        var secondaryObjectsArray = [];
        let draggingObjName = '';
        let draggingObjType = '';
        var buttonClass = 'btn btn-notify';
        var finalMessage;
        var buttons = [];
        var sourceObjectString = '';
        var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
        var localTextBundle = _localeSvc.getLoadedText( resource );

        draggingGraphItems.forEach( function( selectedObj ) {
            let draggingObj = cdm.getObject( selectedObj );
            draggingObjName = draggingObj && draggingObj.props && draggingObj.props.object_string ? draggingObj.props.object_string.uiValues[0] : draggingObj.type;
            draggingObjType = draggingObj.type;
            if( draggingObj ) {
                secondaryObjectsArray.push( {
                    uid: draggingObj.uid,
                    type: draggingObj.type
                } );
            }
        } );


        if( targetGraphItem && targetGraphItem.appData.nodeObject.modelType.typeHierarchyArray.indexOf( 'Qfm0FunctionElement' ) > -1 ) {
            let inputData = {
                clientId: 'AWClient',
                focusElementFunction:  {
                    uid: targetGraphItem.appData.nodeObject.uid,
                    type: targetGraphItem.appData.nodeObject.type
                },
                functions: secondaryObjectsArray,
                relationName: ''
            };
             buttons = [
                {
                    addClass: buttonClass,
                    text: localTextBundle.higherLevel,
                    onClick: function( $noty ) {
                        $noty.close();
                        inputData.relationName = 'Qfm0CalledBy';
                        createRelationSoa( 'Internal-FmeaManager-2020-05-FMEADataManagement', 'addHigherLowerLevelFunctions', [ inputData ], draggingGraphItems, targetGraphItem, 'backward', draggingObjType );
                    }
                },
                {
                    addClass: buttonClass,
                    text: localTextBundle.lowerLevel,
                    onClick: function( $noty ) {
                        $noty.close();
                        inputData.relationName = 'Qfm0Calling';
                        createRelationSoa( 'Internal-FmeaManager-2020-05-FMEADataManagement', 'addHigherLowerLevelFunctions', [ inputData ], draggingGraphItems, targetGraphItem, 'forward', draggingObjType );
                    }
                } ];

            if ( secondaryObjectsArray.length === 1 ) {
                sourceObjectString = draggingObjName;
            }else {
                sourceObjectString = secondaryObjectsArray.length;
            }

            finalMessage = localTextBundle.qfm0FunctionToBeAdded;
                    finalMessage = finalMessage.replace( '{0}', sourceObjectString );
    }else if( targetGraphItem && targetGraphItem.appData.nodeObject.modelType.typeHierarchyArray.indexOf( 'Qfm0FailureElement' ) > -1 ) {
        let  inputData = {
            clientId: 'AWClient',
            failureModeObject:  {
                uid: targetGraphItem.appData.nodeObject.uid,
                type: targetGraphItem.appData.nodeObject.type
            },
            failureObjects: secondaryObjectsArray,
            relationName: ''
        };
        buttons = [
            {
                addClass: buttonClass,
                text: localTextBundle.qfm0Effect,
                onClick: function( $noty ) {
                    $noty.close();
                    inputData.relationName = 'Qfm0Effect';
                    createRelationSoa( 'Internal-FmeaManager-2019-12-FailureModeManagement', 'addCausesAndEffects', [ inputData ], draggingGraphItems, targetGraphItem, 'backward', draggingObjType );
                }
            },
            {
                addClass: buttonClass,
                text: localTextBundle.qfm0Cause,
                onClick: function( $noty ) {
                    $noty.close();
                    inputData.relationName = 'Qfm0Cause';
                    createRelationSoa( 'Internal-FmeaManager-2019-12-FailureModeManagement', 'addCausesAndEffects', [ inputData ], draggingGraphItems, targetGraphItem, 'forward', draggingObjType );
                }
            } ];
        if ( secondaryObjectsArray.length === 1 ) {
            sourceObjectString = draggingObjName;
        }else {
            sourceObjectString = secondaryObjectsArray.length;
        }
        finalMessage = localTextBundle.qfm0FunctionToBeAdded;
        finalMessage = finalMessage.replace( '{0}', sourceObjectString );
    }
    buttons.push(
        {
        addClass: buttonClass,
        text: localTextBundle.qfm0Cancel,
        onClick: function( $noty ) {
            $noty.close();
        }
    } );
    messagingService.showWarning( finalMessage, buttons );
    }
};

/**
 * call soa to create relation
 * @param {String} soaName - Name of soa
 * @param {String} soaMethod - soa method
 * @param {Array} input - input for soa
 * @param {Array} draggingGraphItems- dragging object list
 * @param {Object} targetGraphItem - target object
 * @param {*String} expandDirection - expand direction
 */
let createRelationSoa = function( soaName, soaMethod, input, draggingGraphItems, targetGraphItem, expandDirection, objType ) {
    soaSvc.post( soaName, soaMethod, { inputs:input } ).then( function( response ) {
            var newElementAdded = {};
            if( objType !== 'Qc0Failure' && objType !== 'Qfm0FunctionEleSpec' ) {
                newElementAdded = draggingGraphItems;
            }

            let updatedFailureElements = qfm0FmeaManagerUtils.getObjectIDsToUpdateOrAddInNetViewForRelations(response);
            let createdCauseEffectRelationObjects = qfm0FmeaManagerUtils2.getCreatedCauseEffectRelationObjects(response);
            let eventData = {
                expandDirection: expandDirection,
                rootIDs: [
                    targetGraphItem.appData.nodeObject.uid
                ],
                fmeaElementToAdd:newElementAdded,
                updatedFailureElements: updatedFailureElements,
                isCauseEffectAdded: "true",
                modelObjects: response.modelObjects,
                createdCauseEffectRelationObjects: createdCauseEffectRelationObjects
            };
           eventBus.publish( 'Rv1RelationsBrowser.expandGraph', eventData );

        }, function( error ) {
            var msgObj = {
                msg: '',
                level: 0
            };
            var informationMsg = {
                compltdMsg: '',
                inProgressMsg: ''
            };

            if( error.cause ) {
                if ( error.cause.partialErrors ) {
                    var partialErrors = error.cause.partialErrors;
                    for (var i = 0; i < partialErrors.length; i++) {
                        qfm0FmeaManagerUtils.getMessageString( partialErrors[i].errorValues, msgObj );
                        qfm0FmeaManagerUtils.getInformationMessageString( partialErrors[i].errorValues, informationMsg );
                    }                  
                } 
            }

            if(informationMsg.compltdMsg || informationMsg.inProgressMsg){
                appCtxService.registerCtx( 'fmeaNodeToUpdate', draggingGraphItems );
                let updatedFailureElements = qfm0FmeaManagerUtils.getObjectIDsToUpdateOrAddInNetViewForRelations(error.cause);
                let createdCauseEffectRelationObjects = qfm0FmeaManagerUtils2.getCreatedCauseEffectRelationObjects(error.cause);
                let eventData = {
                    expandDirection: expandDirection,
                    rootIDs: [
                        targetGraphItem.appData.nodeObject.uid
                    ],
                    updatedFailureElements: updatedFailureElements,
                    isCauseEffectAdded: "true",
                    modelObjects: error.cause.modelObjects,
                    createdCauseEffectRelationObjects: createdCauseEffectRelationObjects
                };        
                eventBus.publish( 'Rv1RelationsBrowser.expandGraph', eventData );

                if(informationMsg.compltdMsg && informationMsg.inProgressMsg){
                    var combinedMessage = {};
                    combinedMessage += informationMsg.compltdMsg;
                    combinedMessage += '<BR/>';
                    combinedMessage += informationMsg.inProgressMsg;
                    messagingService.showInfo(combinedMessage);
                }else if(informationMsg.compltdMsg){
                    messagingService.showInfo(informationMsg.compltdMsg);
                }else if(informationMsg.inProgressMsg){
                    messagingService.showInfo(informationMsg.inProgressMsg);
                }    
            }
            if(msgObj.msg){
                messagingService.showError( msgObj.msg );
            }                      
        } );
};

/**
 * API to be called when the graph item being dropped on the targetGraphModel
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object[]} draggingGraphItems - array of the graph items been dragging
 * @param {Object} targetGraphItem - the target graph item, null for empty area of the graph
 * @param {String} dragEffect - String to indicate the gesture, should be 'COPY' or 'MOVE' for paste and cut
 *            respectively
 * @param {PointD} cursorLocation - the cursor location
 * @return {Boolean} - true if the app handle the gesture normally, otherwise false to let the GC handle it.
 */
export let onGraphDrop = function( graphModel, draggingGraphItems, targetGraphItem, dragEffect, cursorLocation,
    dragDelta ) {
    if( !targetGraphItem || !isDroppable( draggingGraphItems, targetGraphItem ) ) {
        return false;
    }

    if( draggingGraphItems && draggingGraphItems.length <= 0 ) {
        return false;
    }

    var graph = graphModel.graphControl.graph;
    if( typeof draggingGraphItems[ 0 ] === 'string' ) {
        createNewRelationforNode( draggingGraphItems, targetGraphItem );
    }


    // Turn off the highlight effect
    setNodeHoveredClass( graph, targetGraphItem, null );
    return true;
};

export default exports = {
    onGraphDragOver,
    onGraphDrop
};
/**
 * Define graph drag and drop handler
 *
 * @memberof NgServices
 * @member qfm0FmeaGraphDragAndDropHandler
 */
app.factory( 'qfm0FmeaGraphDragAndDropHandler', () => exports );
