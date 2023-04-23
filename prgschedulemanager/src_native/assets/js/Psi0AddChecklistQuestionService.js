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

 * @module js/Psi0AddChecklistQuestionService
 */

import app from 'app';
import eventBus from 'js/eventBus';
import cdm from 'soa/kernel/clientDataModel';
import dateTimeSvc from 'js/dateTimeService';
import selectionService from 'js/selection.service';
import appCtxService from 'js/appCtxService';
import ClipboardService from 'js/clipboardService';
import AwPromiseService from 'js/awPromiseService';
import soa_dataManagementService from 'soa/dataManagementService';
import editHandlerSvc from 'js/editHandlerService';
import messagingService from 'js/messagingService';
import localeService from 'js/localeService';
import addObjectUtils from 'js/addObjectUtils';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';
import ProgramScheduleManagerConstants from 'js/ProgramScheduleManagerConstants';

import 'jquery';

var saveHandler = {};

var exports = {};

var m_openedObj = null;

/**
 * Get save handler.
 *
 * @return Save Handler
 */
export let getSaveHandler = function() {
    return saveHandler;
};

/**
 * Get save handler.
 *
 * @return Save Handler
 */
saveHandler.saveEdits = function( dataSource ) {
    var deferred = AwPromiseService.instance.defer();

    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    //var dataSource = activeEditHandler.getDataSource();
    m_openedObj = appCtxService.ctx.mselected[ 0 ];
    var modifiedViewModelProperties = dataSource.getAllModifiedProperties();
    var modifiedPropsWithoutSubProp = dataSource.getModifiedPropertiesMap( modifiedViewModelProperties );
    var inputs = [];
    var AnswerFlag = false;
    var queNumber = [];
    var questionNumberArray = [];
    var lastQuestionNumber;

    for( var i in modifiedPropsWithoutSubProp ) {
        var viewModelObj = modifiedPropsWithoutSubProp[ i ].viewModelObject;

        var input = soa_dataManagementService.getSaveViewModelEditAndSubmitToWorkflowInput( viewModelObj );

        modifiedPropsWithoutSubProp[ i ].viewModelProps.forEach( function( modifiedVMProperty ) {
            //for each prop
            if( modifiedVMProperty.propertyName === 'psi0Answer' && modifiedVMProperty.newValue === 'NA' && ( viewModelObj.props.psi0IsMandatory.dbValues[ 0 ] === '1' || viewModelObj.props
                    .psi0IsMandatory.dbValues[ 0 ] === true ) ) {
                modifiedVMProperty.dbValue = modifiedVMProperty.value;
                modifiedVMProperty.newValue = modifiedVMProperty.value;

                AnswerFlag = true;
                queNumber.push( viewModelObj.props.psi0QuestionNumber.dbValues[ 0 ] );
            }
            if( modifiedVMProperty.propertyName === 'psi0IsMandatory' && modifiedVMProperty.newValue === true && viewModelObj.props.psi0Answer.dbValues[ 0 ] === 'NA' ) {
                viewModelObj.props.psi0Answer.dbValue = '';
                viewModelObj.props.psi0Answer.newValue = '';

                AnswerFlag = true;
                queNumber.push( viewModelObj.props.psi0QuestionNumber.dbValues[ 0 ] );
                soa_dataManagementService.pushViewModelProperty( input, viewModelObj.props.psi0Answer );
            }

            soa_dataManagementService.pushViewModelProperty( input, modifiedVMProperty );
            setRYGDecorator( viewModelObj );
        } );
        inputs.push( input );
    }
    var index;
    if( queNumber.length > 1 ) {
        for( index = 0; index < queNumber.length - 1; index++ ) {
            questionNumberArray.push( queNumber[ index ] );
        }
    }
    lastQuestionNumber = queNumber.pop();

    var saveEditInput = {
        inputs
    };

    if( activeEditHandler ) {
        activeEditHandler.saveEditsPostActions( true );
    }
    exports.callSaveEditSoa( saveEditInput ).then( function() {
        refreshSelectedObjects( activeEditHandler, AnswerFlag, lastQuestionNumber, questionNumberArray );
        deferred.resolve();
    }, function( err ) {
        deferred.reject();
    } );
    return deferred.promise;
};

/**
 * Call Versioning SOA for specifications and handle success and failure cases
 *@param {Input} input
 * @return  {Response} promise when all modified Function Specification properties get saved
 */
export let callSaveEditSoa = function( input ) {
    return soaSvc.post( 'Internal-AWS2-2018-05-DataManagement', 'saveViewModelEditAndSubmitWorkflow2', input ).then(
        function( response ) {
            return response;
        },
        function( error ) {
            var errMessage = messagingService.getSOAErrorMessage( error );
            messagingService.showError( errMessage );
            throw error;
        }
    );
};

/**
 * Set context to select node after edit complete and reset primary work area
 * @param {ActiveEditHandler} activeEditHandler current active edit handler
 */
var refreshSelectedObjects = function( activeEditHandler, AnswerFlag, lastQuestionNumber, questionNumberArray ) {
    if( activeEditHandler ) {
        activeEditHandler.saveEditsPostActions( true );
    }

    var resource = 'PrgScheduleManagerMessages';
    var localTextBundle = localeService.getLoadedText( resource );

    if( AnswerFlag === true && questionNumberArray.length === 0 ) {
        var errMsg1 = localTextBundle.SaveEditSingleChecklistQuestionErrorMsg;
        messagingService.showError( errMsg1.replace( '{0}', lastQuestionNumber ) );
    } else if( AnswerFlag === true && questionNumberArray.length >= 1 ) {
        var errMsg2 = localTextBundle.SaveEditMultipleChecklistQuestionErrorMsg;
        messagingService.showError( errMsg2.replace( '{0}', questionNumberArray ).replace( '{1}', lastQuestionNumber ) );
    }
    eventBus.publish( 'cdm.relatedModified', {
        relatedModified: [
            appCtxService.ctx.locationContext.modelObject

        ]
    } );
};

/**
 * Returns dirty bit.
 * @returns {Boolean} isDirty bit
 */
saveHandler.isDirty = function( dataSource ) {
    var modifiedPropCount = dataSource.getAllModifiedProperties().length;
    if( modifiedPropCount === 0 ) {
        return false;
    }
    return true;
};

/**


/**
 * Return the UTC format date string "yyyy-MM-dd'T'HH:mm:ssZZZ"
 *
 * @param {dateObject} dateObject - The date object
 * @return {dateValue} The date string value
 */
export let getDateString_DueDate = function( dateObject ) {
    var dateValue = {};
    dateValue = dateTimeSvc.formatUTC( dateObject );
    return dateValue;
};

/**
 * Return the Primary object(checklist) of ChecklistQuestion
 *
 * @param {ctx} contextObject - Context Object
 */
export let getParentChecklist = function( ctx ) {
    var checklistParent;

    if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'Psi0Checklist' ) > -1 ) {
        checklistParent = ctx.selected.uid;
    } else {
        checklistParent = ctx.pselected.uid;
    }
    return checklistParent;
};

/**
 * Return the input for Primary object for createRelations SOA call
 *
 * @param {ctx} contextObject - Context Object
 */
export let getPrimaryObject = function( ctx ) {
    if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'Psi0Checklist' ) > -1 ) {
        return ctx.selected;
    }

    return ctx.pselected;
};

export let cutChecklistQuestionOperation = function() {
    var selection = selectionService.getSelection().selected;

    var checklistName = appCtxService.ctx.pselected.props.object_string.dbValues[ 0 ];

    var tasksToBeCut = [];

    if( selection !== null && selection.length > 0 ) {
        for( var index = 0; index < selection.length; index++ ) {
            var objectToBeCut = cdm.getObject( selection[ index ].uid );
            tasksToBeCut.push( objectToBeCut );
        }
        selectionService.updateSelection( tasksToBeCut, appCtxService.ctx.pselected );
        ClipboardService.instance.setContents( tasksToBeCut );
    }
    return checklistName;
};

/**
 * prepare the input for set properties SOA call to add the responsible User
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 * @param {ctx} contextObject - Context Object
 */

export let pasteChecklistQuestion = function( ctx, data ) {
    var deferred = AwPromiseService.instance.defer();

    var inputData = [];

    var parentChecklist = ctx.pselected.uid;

    var arrayHie = _.get( ctx, 'selected.modelType.typeHierarchyArray' );

    if( arrayHie !== null || arrayHie !== undefined ) {
        var isChecklistQuestion = arrayHie.indexOf( 'Psi0ChecklistQuestion' );

        if( isChecklistQuestion > -1 && ctx.awClipBoardProvider[ 0 ].props.psi0ParentChecklist.dbValues[ 0 ] === ctx.selected.props.psi0ParentChecklist.dbValues[ 0 ] ) {
            soa_dataManagementService.getProperties( [ parentChecklist ], [ 'psi0ChecklistQuestions' ] ).then( function() {
                var infoObj = {};

                infoObj.object = cdm.getObject( parentChecklist );

                infoObj.timestamp = '';

                var temp = {};

                var tempQuestions = [];

                var QuestionArray = ctx.pselected.props.psi0ChecklistQuestions.dbValues;

                var tempClipBoardArray = [];

                for(var clipIndex = 0; clipIndex < ctx.awClipBoardProvider.length ; clipIndex++ )
                {
                    tempClipBoardArray.push(ctx.awClipBoardProvider[clipIndex].uid);
                }

                for( var index = 0; index < QuestionArray.length; index++ ) {

                    if( QuestionArray[ index ] === ctx.selected.uid )
                    {
                        for(var clipobardIndex = 0; clipobardIndex < ctx.awClipBoardProvider.length ; clipobardIndex++)
                        {
                            checkIfQuestionExistOrAddInArray( ctx.awClipBoardProvider[ clipobardIndex ].uid, tempQuestions );
                        }
                        checkIfQuestionExistOrAddInArray( ctx.pselected.props.psi0ChecklistQuestions.dbValues[ index ], tempQuestions );
                    }
                    else if( ( ctx.awClipBoardProvider.length === 1 && QuestionArray[ index ] !== ctx.awClipBoardProvider[ '0' ].uid ) ||
                    (ctx.awClipBoardProvider.length > 1 && (tempClipBoardArray.indexOf(QuestionArray[ index ] ) === -1)) ) {
                        checkIfQuestionExistOrAddInArray( ctx.pselected.props.psi0ChecklistQuestions.dbValues[ index ], tempQuestions );
                    }

                }
                temp.name = 'psi0ChecklistQuestions';

                temp.values = tempQuestions;

                var vecNameVal = [];
                vecNameVal.push( temp );

                infoObj.vecNameVal = vecNameVal;
                inputData.push( infoObj );

                deferred.resolve( inputData );
            } );
        } else if( isChecklistQuestion > -1 && ctx.awClipBoardProvider[ 0 ].props.psi0ParentChecklist.dbValues[ 0 ] !== ctx.selected.props.psi0ParentChecklist.dbValues[ 0 ] ) {
            messagingService.showError( data.i18n.moveChecklistQuestion );
            deferred.resolve();
        }
    }
    return deferred.promise;
};

/**
 * Check if Current Question Exist in Array if not then Add
 *
 * @param { CurrentQuestion, QuestionArray} data
 */
function checkIfQuestionExistOrAddInArray( question, updatedArray ) {
    var index = updatedArray.indexOf( question );
    if( index === -1 ) {
        updatedArray.push( question );
    }
}
/**
 * Add the selected object to data
 *
 * @param {object} data - The qualified data of the viewModel
 * @param {object} selection - The selected object
 */
export let addSelectedObject = function( data, selection ) {
    if( selection && selection[ 0 ] ) {
        data.selectedObject = selection[ 0 ];
    } else {
        data.selectedObject = null;
    }
};

/**
 * Perform the paste behavior for the IModelObjects from schedulemanager/paste.json onto the given 'target'
 * IModelObject creating the given relationship type between them.
 *
 * @param {Object} targetObject - The 'target' IModelObject for the paste.
 * @param {Array} sourceObjects - Array of 'source' IModelObjects to paste onto the 'target' IModelObject
 * @param {String} relationType - relation type name (object set property name)
 *
 */
export let psi0DefaultPasteHandler = function( targetObject, sourceObjects, relationType ) {
    if( targetObject.uid !== sourceObjects[ 0 ].props.psi0ParentChecklist.dbValues[ 0 ] ) {
        var resource = 'PrgScheduleManagerMessages';
        var localTextBundle = localeService.getLoadedText( resource );
        var errMsg = localTextBundle.moveChecklistQuestion;
        messagingService.showError( errMsg );
        throw 'Question was not moved across checklists because question is always unique to a checklist.';
    }
};

/**
 * method throws error if isMandatory property on Checklist Question object is True and User sets Answer property to NA.
 * Update Answer property to NULL if Modified property for Mandary Question is True and Answer property already Set to NA.
 * method covers User sould not be able to Save Answer to Mandary Question as NS from Info panel
 *
 * @param {Boolean} InfoPanel - true if the Save operation perfromed from Info Panel.
 * @returns {Object} Returns inputData to saveViewModelEditAndSubmitWorkflow SOA call
 */
export let saveEditsChecklistQuestionOperation = function( InfoPanel ) {
    if( InfoPanel ) {
        editHandlerSvc.setActiveEditHandlerContext( 'INFO_PANEL_CONTEXT' );
    }
    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var dataSource = activeEditHandler.getDataSource();
    m_openedObj = appCtxService.ctx.mselected[ 0 ];
    var modifiedViewModelProperties = dataSource.getAllModifiedProperties();
    var modifiedPropsWithoutSubProp = dataSource.getModifiedPropertiesMap( modifiedViewModelProperties );
    var inputs = [];
    var AnswerFlag = false;
    var queNumber = [];
    var questionNumberArray = [];
    var lastQuestionNumber;

    for( var i in modifiedPropsWithoutSubProp ) {
        var viewModelObj = modifiedPropsWithoutSubProp[ i ].viewModelObject;

        var input = soa_dataManagementService.getSaveViewModelEditAndSubmitToWorkflowInput( viewModelObj );

        modifiedPropsWithoutSubProp[ i ].viewModelProps.forEach( function( modifiedVMProperty ) {
            //for each prop
            if( modifiedVMProperty.propertyName === 'psi0Answer' && modifiedVMProperty.newValue === 'NA' && ( viewModelObj.props.psi0IsMandatory.dbValues[ 0 ] === '1' || viewModelObj.props.psi0IsMandatory.dbValues[ 0 ] === true ) ) {
                modifiedVMProperty.dbValue = modifiedVMProperty.value;
                modifiedVMProperty.newValue = modifiedVMProperty.value;

                AnswerFlag = true;
                queNumber.push( viewModelObj.props.psi0QuestionNumber.dbValues[ 0 ] );
            }
            if( modifiedVMProperty.propertyName === 'psi0IsMandatory' && modifiedVMProperty.newValue === true && viewModelObj.props.psi0Answer.dbValues[ 0 ] === 'NA' ) {
                viewModelObj.props.psi0Answer.dbValue = '';
                viewModelObj.props.psi0Answer.newValue = '';

                AnswerFlag = true;
                queNumber.push( viewModelObj.props.psi0QuestionNumber.dbValues[ 0 ] );
                soa_dataManagementService.pushViewModelProperty( input, viewModelObj.props.psi0Answer );
            }

            soa_dataManagementService.pushViewModelProperty( input, modifiedVMProperty );
            setRYGDecorator(viewModelObj);
        } );
        inputs.push( input );
    }
    var index;
    if( queNumber.length > 1 ) {
        for( index = 0; index < queNumber.length - 1; index++ ) {
            questionNumberArray.push( queNumber[ index ] );
        }
    }
    lastQuestionNumber = queNumber.pop();

    var response = {
        inputs: inputs,
        AnswerFlag: AnswerFlag,
        questionNumberArray: questionNumberArray,
        lastQuestionNumber: lastQuestionNumber
    };
    if( InfoPanel && activeEditHandler ) {
        activeEditHandler.saveEditsPostActions( true );
    }
    return response;
};

/**
 * Method to set Grid and Cell Decorator style to vmo through Constant Map
 * @param {ViewModelObject} vmo - ViewModelObject(s) to set style on
 */

var setRYGDecorator = function ( vmo ) {
    if ( vmo.props.apm0RatedReference ) {
        var targetUid = vmo.props.apm0RatedReference.dbValues;
        var targetObj = cdm.getObject( targetUid );
        var propsToLoad = [ 'apm0Rating' ];
        var uidArr = [ targetUid ];

        soa_dataManagementService.getProperties( uidArr, propsToLoad )
            .then(
                function () {
                    var rygValue = targetObj.props.apm0Rating.dbValues[ 0 ];
                    if(targetObj.props.apm0Rating.valueUpdated === true || rygValue)
                    {
                        if ( rygValue ) {
                            var rygDecoratorMap = ProgramScheduleManagerConstants.RYG_DECORATOR_STYLE;
                            if ( rygDecoratorMap && rygDecoratorMap[ rygValue ].cellDecoratorStyle ) {
                                vmo.cellDecoratorStyle = rygDecoratorMap[ rygValue ].cellDecoratorStyle;
                            }
                            if ( rygDecoratorMap && rygDecoratorMap[ rygValue ].gridDecoratorStyle ) {
                                vmo.gridDecoratorStyle = rygDecoratorMap[ rygValue ].gridDecoratorStyle;
                            }
                        } else {
                            vmo.cellDecoratorStyle = '';
                            vmo.gridDecoratorStyle = '';
                        }

                    }
                }
            );
    }
};

export let getInputForCreateObject = function( data, ctx ) {
    var input = addObjectUtils.getCreateInput( data );
    //Set the Parent Checklist
    var checklistParent;

    if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'Psi0Checklist' ) > -1 ) {
        checklistParent = ctx.selected.uid;
    } else {
        checklistParent = ctx.pselected.uid;
    }
    input[ 0 ].createData.propertyNameValues.psi0ParentChecklist = [ checklistParent ];
    input[ 0 ].pasteProp = "psi0ChecklistQuestions";
    if( ctx.ViewModeContext.ViewModeContext === 'TableView' || ctx.ViewModeContext.ViewModeContext === 'ListView' ) {
        input[ 0 ].targetObject = {
            uid: ctx.locationContext.modelObject.uid,
            type: ctx.locationContext.modelObject.type
        };
    } else {
        input[ 0 ].targetObject = {
            uid: ctx.xrtSummaryContextObject.uid,
            type: ctx.xrtSummaryContextObject.type
        };
    }

    return input;
};

export default exports = {
    getSaveHandler,
    callSaveEditSoa,
    getDateString_DueDate,
    getParentChecklist,
    pasteChecklistQuestion,
    addSelectedObject,
    psi0DefaultPasteHandler,
    saveEditsChecklistQuestionOperation,
    getInputForCreateObject,
    getPrimaryObject,
    cutChecklistQuestionOperation
};
app.factory( 'Psi0AddChecklistQuestionService', () => exports );
