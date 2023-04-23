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

 * @module js/Psi0ChecklistService
 */

import app from 'app';
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
import awColumnSvc from 'js/awColumnService';
import AwStateService from 'js/awStateService';
import uwPropertyService from 'js/uwPropertyService';
import cmm from 'soa/kernel/clientMetaModel';
import colorDecoratorService from 'js/colorDecoratorService';
import ProgramScheduleManagerConstants from 'js/ProgramScheduleManagerConstants';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import dms from 'soa/dataManagementService';
import parsingUtils from 'js/parsingUtils';

import 'jquery';

var exports = {};

var m_openedObj = null;
var _checklistNonModifiableCols = [ 'psi0ID', 'psi0ResponsibleUser', 'psi0Event', 'psi0QuestionNumber', 'psi0ParentChecklist' ];


/**
 * Process the response from Server
 * @argument {Object} response  soa response
 * @returns {Object} checklists checklist object
 */
export let processChecklistObjects = function( response ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }
    var checklists = [];
    if( response.searchResultsJSON ) {
        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
        if( searchResults ) {
            for( var x = 0; x < searchResults.objects.length; ++x ) {
                var uid = searchResults.objects[ x ].uid;
                var obj = response.ServiceData.modelObjects[ uid ];
                if( obj ) {
                    checklists.push( obj );
                }
            }
        }
    }
    return checklists;
};

/**
 *  Process to get the ChecklistQuestions related to perticular checklist object
 *
 */

export let getChecklistQuestionsSearchResults = function( ctx ) {
    var deferred = AwPromiseService.instance.defer();

    var checklist = ctx.locationContext.modelObject.uid;

    var checklistQuestionList = [];

    soa_dataManagementService.getProperties( [ checklist ], [ 'psi0ChecklistQuestions' ] ).then( function() {
        for( var i = 0; i < ctx.locationContext.modelObject.props.psi0ChecklistQuestions.dbValues.length; i++ ) {
            var checklistQuestionObject = cdm.getObject( ctx.locationContext.modelObject.props.psi0ChecklistQuestions.dbValues[ i ] );
            if( checklistQuestionObject ) {
                checklistQuestionList.push( checklistQuestionObject );
            }
        }
        appCtxService.ctx.search.totalFound = checklistQuestionList.length;
        appCtxService.ctx.search.totalLoaded = checklistQuestionList.length;
        deferred.resolve( checklistQuestionList );
    } );
    return deferred.promise;
};

export let getCreateRelationsInput = function( data, ctx ) {
    var input = [];
    var inputData = {};
    var primaryObj = {};

    if ( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Timeline' || ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Checklists' ) {
        primaryObj = ctx.xrtSummaryContextObject;
    } else {
        primaryObj = ctx.locationContext.modelObject;
    }

    if( data.createdMainObject ) {
        inputData = {
            primaryObject: primaryObj,
            relationType: 'Psi0EventChecklistRelation',
            secondaryObject: data.createdMainObject,
            clientId: '',
            userData: {
                uid: 'AAAAAAAAAAAAAA',
                type: 'unknownType'
            }
        };
        input.push( inputData );
    } else {
        for( var index = 0; index < data.sourceObjects.length; index++ ) {
            inputData = {
                primaryObject: primaryObj,
                relationType: 'Psi0EventChecklistRelation',
                secondaryObject: cdm.getObject( data.sourceObjects[ index ].uid ),
                clientId: '',
                userData: {
                    uid: 'AAAAAAAAAAAAAA',
                    type: 'unknownType'
                }
            };
            input.push( inputData );
        }
    }
    return input;
};

/**
 * Method to prepare input to removeChidren SOA Call to cut checklist Object
 * @param {ctx} contextObject - Context Object
 */
export let getInputToCutChecklist = function( ctx ) {
    var inputData = [];
    var primaryObject = {};

    if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Timeline' || ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Checklists' ) {
        primaryObject = ctx.xrtSummaryContextObject;
    } else {
        primaryObject = ctx.locationContext.modelObject;
    }

    inputData = [ {
        clientId: '',
        propertyName: 'Psi0EventChecklistRelation',
        parentObj: primaryObject,
        childrenObj: ctx.mselected

    } ];
    return inputData;
};

/**
 * Method to set Grid and Cell Decorator calls setDecoratorStyles function
 * @param {ViewModelObject} vmo - ViewModelObject(s) to set style on
 */

 export let groupObjectsForDecorators = function( vmos ) {
    exports.setDecoratorStyles( vmos, false );
};
/**
 * Method to set Grid and Cell Decorator style to vmo through Constant Map
 * @param {ViewModelObject} vmo - ViewModelObject(s) to set style on
 */

var setRYGDecorator = function( vmo ) {
    var vmObj = vmo;
    if ( vmo.modelType.typeHierarchyArray.indexOf( 'Awp0XRTObjectSetRow' ) > -1 ) {
        if ( vmo.props.awp0Target.dbValue ) {
            vmObj = cdm.getObject( vmo.props.awp0Target.dbValue );
        }
    }

    if( vmObj && vmObj.props && vmObj.props.apm0RatedReference ) {
        var targetUid = vmObj.props.apm0RatedReference.dbValues;
        var targetObj = cdm.getObject( targetUid );
        var propsToLoad = [ 'apm0Rating' ];
        var uidArr = [ targetUid ];

        dms.getProperties( uidArr, propsToLoad )
            .then(
                function() {
                    var rygValue = targetObj.props.apm0Rating.dbValues[ 0 ];

                        if( rygValue ) {
                            var rygDecoratorMap = ProgramScheduleManagerConstants.RYG_DECORATOR_STYLE;
                            if( rygDecoratorMap && rygDecoratorMap[ rygValue ].cellDecoratorStyle ) {
                                vmo.cellDecoratorStyle = rygDecoratorMap[ rygValue ].cellDecoratorStyle;
                            }
                            if( rygDecoratorMap && rygDecoratorMap[ rygValue ].gridDecoratorStyle ) {
                                vmo.gridDecoratorStyle = rygDecoratorMap[ rygValue ].gridDecoratorStyle;
                            }
                        } else {
                            vmo.cellDecoratorStyle = '';
                            vmo.gridDecoratorStyle = '';
                        }
                }
            );
    }
};

/**
 * Method to set Grid and Cell Decorator style to vmo
 * @param {ViewModelObject} vmos - ViewModelObject(s) to set style on
 * @param {Boolean} clearStyles - Clear style passed as false
 */

 export let setDecoratorStyles = function( vmos, clearStyles ) {
    _.forEach( vmos, function( vmo ) {
        setRYGDecorator( vmo );
    } );
    colorDecoratorService.setDecoratorStyles( vmos );
};

/**
 * Method to set Grid and Cell Decorator style to vmo
 * @param {ViewModelObject} vmo - ViewModelObject(s) to set style on
 */
export let groupObjectsForDecoratorsChecklistQuestion = function( vmo ) {
    appCtxService.updatePartialCtx( 'decoratorToggle', true );
    setRYGDecorator( vmo );
};

/**
 * Method to set properties on checklist Business Object modifiable
 * @param {Object} columnConfig - columnConfig to set the properties non-modifiable
 * @returns {Object}
 */

export let setNonModifiablePropForAbsChecklist = function( response ) {
    for( var index = 0; index < response.columnConfig.columns.length; index++ ) {
        if( _checklistNonModifiableCols.indexOf( response.columnConfig.columns[ index ].propertyName ) !== -1 ) {
            response.columnConfig.columns[ index ].modifiable = false;
        }
    }
    return response.columnConfig;
};

export default exports = {
    getChecklistQuestionsSearchResults,
    getCreateRelationsInput,
    getInputToCutChecklist,
    groupObjectsForDecorators,
    setDecoratorStyles,
    groupObjectsForDecoratorsChecklistQuestion,
    processChecklistObjects,
    setNonModifiablePropForAbsChecklist
};
app.factory( 'Psi0ChecklistService', () => exports );
