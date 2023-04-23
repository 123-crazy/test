/* eslint-disable max-lines */
// @<COPYRIGHT>@
// ==================================================
// Copyright 2015.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0NewWorkflowProcess
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import listBoxService from 'js/listBoxService';
import dmSvc from 'soa/dataManagementService';
import soaSvc from 'soa/kernel/soaService';
import policySvc from 'soa/kernel/propertyPolicyService';
import prefSvc from 'soa/preferenceService';
import hostFeedbackSvc from 'js/hosting/sol/services/hostFeedback_2015_03';
import objectRefSvc from 'js/hosting/hostObjectRefService';
import cdm from 'soa/kernel/clientDataModel';
import localeSvc from 'js/localeService';
import messagingSvc from 'js/messagingService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import awp0InboxUtils from 'js/Awp0InboxUtils';
import parsingUtils from 'js/parsingUtils';
import workflowUtils from 'js/Awp0WorkflowUtils';
import popupUtils from 'js/popupUtils';
import 'js/hosting/sol/services/hostComponent_2014_07';
import workflowAssignmentSvc from 'js/Awp0WorkflowAssignmentService';
import editHandlerSvc from 'js/editHandlerService';
import workflowAssinmentUtilSvc from 'js/Awp0WorkflowAssignmentUtils';
import viewModelService from 'js/viewModelObjectService';
import notyService from 'js/NotyModule';

/** AW intermediate preference */
var CR_ALLOW_ALTERNATE_PROCEDURES_PREFERENCE = 'CR_allow_alternate_procedures'; //$NON-NLS-1$

var exports = {};

export let sendEventToHost = function( data ) {
    var uids = data.createdProcess;

    dmSvc.loadObjects( uids ).then( function() {
        localeSvc.getTextPromise( 'WorkflowCommandPanelsMessages' ).then( function( textBundle ) {
            var modelObject = cdm.getObject( uids[ 0 ] );

            var objectRef = objectRefSvc.createBasicRefByModelObject( modelObject );

            var feedbackMessage = hostFeedbackSvc.createHostFeedbackRequestMsg();

            var msg = messagingSvc.applyMessageParamsWithoutContext( textBundle.singleSubmitToWorkflowSuccess, [ modelObject.toString() ] );

            feedbackMessage.setFeedbackTarget( objectRef );
            feedbackMessage.setFeedbackString( msg );

            hostFeedbackSvc.createHostFeedbackProxy().fireHostEvent( feedbackMessage );
        } );
    } );
};

/**
 * Get the filter template boolean flag based on preference value
 *
 * @param {data} data - The qualified data of the viewModel
 *
 * @return {Object} - isFetchFilteredTemplates that will contain true or false value
 */
var isFetchFilteredTemplatesValue = function( data ) {
    var isFetchFilteredTemplates = true;
    if( data.preferences.CR_allow_alternate_procedures[ 0 ] === 'none' || data.preferences.CR_allow_alternate_procedures[ 0 ] === 'Assigned' ) {
        isFetchFilteredTemplates = true;
    } else if( data.preferences.CR_allow_alternate_procedures[ 0 ] === 'any' ) {
        isFetchFilteredTemplates = false;
    }

    return isFetchFilteredTemplates;
};

/**
 * Check if target are present or not and based on that return true or false.
 * @returns {boolean} True/False based on target is present or not
 */
var _isProcessTargetsEmpty = function() {
    if( appCtxSvc.ctx.workflow_process_candidates ) {
        var selectedObjects = appCtxSvc.ctx.workflow_process_candidates.workFlowObjects;
        if( selectedObjects && selectedObjects.length > 0 ) {
            return false;
        }
    }
    return true;
};

/**
 * Get the filter template boolean flag based on preference value
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Boolean} isFetchFilteredTemplates - The true or false to identify what templates to be shown
 * @param {Boolean} isAddRemoveTargetCase - The true or false to identify target are being added or removed
 * @return {Object} - templatesObjects All workflow templates that will be shown to user
 */
var _getPreSelectTemplateUid = function( data, isFetchFilteredTemplates, isAddRemoveTargetCase ) {
    var templatesObjects = [];
    var prevSelTemplateUid = data.prevSelTemplateUid;
    // Check if filter template is false or process target is empty then we need to show all templates
    // all time.
    if( !isFetchFilteredTemplates || _isProcessTargetsEmpty() ) {
        templatesObjects = data.allTemplates;
    } else {
        templatesObjects = data.filterTemplates;
    }
    // Check if add/ remove target case is not in progress then we return the template objects
    // and return from here
    if( !isAddRemoveTargetCase ) {
        return {
            templatesObjects: templatesObjects,
            prevSelTemplateUid: prevSelTemplateUid
        };
    }

    // Check if workflow process candidates are not null and contains workflow objects are present then based
    // objects or preference value set all or assigned options correctly and then show the templates also.
    if( appCtxSvc.ctx.workflow_process_candidates && appCtxSvc.ctx.workflow_process_candidates.workFlowObjects ) {
        var selectedObjects = appCtxSvc.ctx.workflow_process_candidates.workFlowObjects;
        var oldValue = data.allowAlternateProcedures.dbValue;
        // If case of target object is not present or empty then we need to select all option
        // for showing the templates and get the previous selected template UID and check if this
        // UID is present in new list then select that template else we need to select default template
        if( !selectedObjects || selectedObjects.length <= 0 ) {
            data.allowAlternateProcedures.dbValue = true;
            templatesObjects = data.allTemplates;
            if( !oldValue && data.workflowTemplates.dbValue ) {
                prevSelTemplateUid = data.workflowTemplates.dbValue.uid;
            }
        } else if( selectedObjects && selectedObjects.length === 1 && isFetchFilteredTemplates ) {
            // If case of 1 target object is present and preference value is none or assigned then we need to select assigend option
            // for showing the assigend templates and get the previous selected template UID and check if this
            // UID is present in new list then select that template else we need to select default template
            templatesObjects = data.filterTemplates;
            data.allowAlternateProcedures.dbValue = false;
            if( oldValue && data.workflowTemplates.dbValue ) {
                prevSelTemplateUid = data.workflowTemplates.dbValue.uid;
            }
        } else if( selectedObjects && selectedObjects.length === 1 && !isFetchFilteredTemplates ) {
            // If case of 1 target object is present and preference value is any then we need to select all option
            // for showing the all templates and get the previous selected template UID and check if this
            // UID is present in new list then select that template else we need to select default template
            templatesObjects = data.allTemplates;
            data.allowAlternateProcedures.dbValue = true;
            if( oldValue && data.workflowTemplates.dbValue ) {
                prevSelTemplateUid = data.workflowTemplates.dbValue.uid;
            }
        }
    }
    // Set it on data object and this will be used mainly when we change the template filter options from all to assigned
    // or vice versa then it automatically calls getValidTemplates method and that also it should select the template if
    // present in the template list
    data.prevSelTemplateUid = prevSelTemplateUid;
    return {
        templatesObjects: templatesObjects,
        prevSelTemplateUid: prevSelTemplateUid
    };
};

/**
 * Get the filter template boolean flag based on preference value
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Boolean} isFetchFilteredTemplates - The true or false to identify what templates to be shown
 * @param {Boolean} isAddRemoveTargetCase - The true or false to identify target are being added or removed
 * @return {Object} - templatesObjects All workflow templates that will be shown to user
 */
var populateWorkflowTemplatesData = function( data, isFetchFilteredTemplates, isAddRemoveTargetCase ) {
    var templatesObjects = [];
    var prevSelTemplateUid = null;

    // Get the templates that need to be shown and get the previous selected template UID and template list
    // that need to be shown here.
    var preSelectObject = _getPreSelectTemplateUid( data, isFetchFilteredTemplates, isAddRemoveTargetCase );

    if( preSelectObject ) {
        templatesObjects = preSelectObject.templatesObjects;
        prevSelTemplateUid = preSelectObject.prevSelTemplateUid;
    }

    if( templatesObjects && templatesObjects.length > 0 ) {
        // Create the list model object that will be displayed
        templatesObjects = listBoxService.createListModelObjects( templatesObjects, 'props.template_name' );
        var templatesObject = templatesObjects[ 0 ];
        var isFnd0InstructionsAvailable = false;

        //Check if fnd0Instructions property is available.
        //If available use fnd0Instructions property as description
        if( templatesObject && templatesObject.propInternalValue && templatesObject.propInternalValue.props.fnd0Instructions ) {
            isFnd0InstructionsAvailable = true;
        }

        for( var idx = 0; idx < templatesObjects.length; idx++ ) {
            var object = templatesObjects[ idx ];
            var descValue = object.propInternalValue.props.object_desc.uiValues[ 0 ];
            if( isFnd0InstructionsAvailable ) {
                descValue = object.propInternalValue.props.fnd0Instructions.uiValues[ 0 ];
            }
            templatesObjects[ idx ].propDisplayDescription = descValue;
        }
    }

    var idx1 = -1;
    // Check if add/remove target case is in progress or previous selected template is not null then get
    // that template index in new template list so that previous selected template can remain selected
    // and if this template is not found then select the 0th index template
    if( isAddRemoveTargetCase || prevSelTemplateUid ) {
        var prevSelTemplate = data.workflowTemplates.dbValue;

        // Check if add remove target case is undefined and prevSelTemplateUid is present then
        // get the workflow template object and use that to preselect that template
        if( isAddRemoveTargetCase === undefined && prevSelTemplateUid ) {
            prevSelTemplate = cdm.getObject( prevSelTemplateUid );
        }
        if( prevSelTemplate && prevSelTemplate.uid ) {
            idx1 = _.findIndex( templatesObjects, function( templateObj ) {
                return templateObj.propInternalValue && templateObj.propInternalValue.uid === prevSelTemplate.uid;
            } );
        }
    }
    // Check if index is < 0 then set it to 0 so that it will select
    // first template.
    if( idx1 < 0 ) {
        idx1 = 0;
    }

    // If add/ remove target case is not in progress and previous selected template
    // prenset that means code comes here due to chaiging all/assigend option values
    // so we need to reset that so it won't be used any more.
    if( isAddRemoveTargetCase === undefined && prevSelTemplateUid ) {
        data.prevSelTemplateUid = null;
    }
    data.workflowTemplates.dbValue = '';
    data.workflowTemplates.uiValue = '';

    // Select the default selected process template vased on index
    if( templatesObjects && templatesObjects.length > 0 && templatesObjects[ idx1 ] ) {
        data.workflowTemplates.dbValue = templatesObjects[ idx1 ].propInternalValue;
        data.workflowTemplates.uiValue = templatesObjects[ idx1 ].propDisplayValue;
        data.workflowTemplates.dbOriginalValue = templatesObjects[ idx1 ].propInternalValue;
        data.workflowTemplates.selectedLovEntries = [];
        data.workflowTemplates.selectedLovEntries[ 0 ] = templatesObjects[ idx1 ];
        data.workflowTemplates.selectedLovEntries[ 0 ].sel = true;
    }

    data.templates = templatesObjects;
    if( data.templates && data.templates.length === 0 ) {
        data.processAssignmentParticipants = [];
    }
    data.workflowTemplates.isEditable = true;
    data.workflowTemplates.isEnabled = true;
    // Check if template that need to be shown is 0 or 1 then don't show the template list as LOV and
    // put the widget edit mode to false.
    if( data.templates && data.templates.length <= 1 ) {
        data.workflowTemplates.isEditable = false;
        data.workflowTemplates.isEnabled = false;
    }

    return templatesObjects;
};

/**
 * Populate the panel data based on selection and add the additional search criteria so that duplicate reviewer
 * will be avoided.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {object} selection - the current selection object
 * @param {boolean} isAddRemoveTargetCase - Is process target already loaded or not
 * @param {boolean} isProcessTargetsLoaded - Is process target already loaded or not
 */
export let populatePanelData = function( data, selection, isAddRemoveTargetCase, isProcessTargetsLoaded ) {
    // Set this to false so that submit button will be hidden so that user can't click on submit button multiple times
    // This fix has been submitted as PR # 3053176
    data.submitActionInProgress = false;
    var isNarrowMode = workflowAssinmentUtilSvc.isNarrowMode();
    data.isNarrowMode = isNarrowMode;

    // Check if parentData is not set and data is valid then set the parent data correctly
    if( !appCtxSvc.ctx.parentData && data ) {
        appCtxSvc.ctx.parentData = data;
    }

    var getTemplatesInput = [];

    data.allTemplates = [];
    data.filterTemplates = [];

    var allInputInternal = {
        clientId: 'allTemplates',
        getFiltered: false,
        targetObjects: selection
    };

    getTemplatesInput.push( allInputInternal );

    var filterInputInternal = {
        clientId: 'filterTemplates',
        getFiltered: true,
        targetObjects: selection
    };

    getTemplatesInput.push( filterInputInternal );

    var policy = {
        types: [ {
            name: 'EPMTaskTemplate',
            properties: [ {
                    name: 'template_name'
                },
                {
                    name: 'object_desc'
                },
                {
                    name: 'fnd0Instructions'
                }
            ]
        } ]
    };

    policySvc.register( policy );
    var inputData = {};
    inputData.input = getTemplatesInput;
    soaSvc.post( 'Workflow-2013-05-Workflow', 'getWorkflowTemplates', inputData ).then( function( response ) {
        if( policy ) {
            policySvc.unregister( policy );
        }

        var output = response.templatesOutput;

        _.forEach( output, function( object ) {
            if( object.clientId === 'allTemplates' ) {
                var allTemplates = object.workflowTemplates;
                data.allTemplates = allTemplates;
            } else if( object.clientId === 'filterTemplates' ) {
                var filterTemplates = object.workflowTemplates;
                data.filterTemplates = filterTemplates;
            }
        } );

        if( data.preferences.CR_allow_alternate_procedures ) {
            // Get the option to show all or filter templates based on preference value and then use them to populate the templates
            var isFetchFilteredTemplates = isFetchFilteredTemplatesValue( data );

            // Populate the workflow templates based on preference values
            populateWorkflowTemplatesData( data, isFetchFilteredTemplates, isAddRemoveTargetCase );

            // This call is mainly needed to populate the assignement section for submit to workflow,
            // create workflow and other cases. Without this call assignment section was empty so added
            // it to populate the assignment table correctly. Fix for defect LCS-610509
            exports.checkForAssignmentSection( data, appCtxSvc.ctx );

            exports.isFetchFilteredTemplates( data, isAddRemoveTargetCase );
            //Populate the workflow process name
            populateWorkflowProcessName( data );
        } else {
            exports.loadPreference( data );
        }
    } );

    // This is mainly needed for submit to workflow where user selects item revisions from
    // PWA and bring up the panel then clearing the selection from panel should not clear
    // the PWA selection.
    if( isProcessTargetsLoaded === undefined ) {
        var selectedObjects = appCtxSvc.ctx.workflow_process_candidates.workFlowObjects;
        var validSelectedObjects = [];
        _.forEach( selectedObjects, function( selObject ) {
            var vmObject = viewModelService.createViewModelObject( selObject.uid );
            validSelectedObjects.push( vmObject );
        } );
        if( validSelectedObjects.length > 0 ) {
            appCtxSvc.ctx.workflow_process_candidates.workFlowObjects = validSelectedObjects;
        }
    }

    // Update the data provider with all objects that need to be submitted
    if( data.dataProviders.attachTargets && appCtxSvc.ctx.workflow_process_candidates ) {
        data.dataProviders.attachTargets.update( appCtxSvc.ctx.workflow_process_candidates.workFlowObjects, appCtxSvc.ctx.workflow_process_candidates.workFlowObjects.length );
    }
};

/**
 * After adding a new target, refresh only the target section in submit to workflow
 * @param {data} data - The qualified data of the viewModel
 */
let updateTargetsToSubmit = function( data ) {
    // Update the data provider with all objects that need to be submitted
    if( data.dataProviders && data.dataProviders.attachTargets && appCtxSvc.ctx.workflow_process_candidates && appCtxSvc.ctx.workflow_process_candidates.workFlowObjects ) {
        data.dataProviders.attachTargets.update( appCtxSvc.ctx.workflow_process_candidates.workFlowObjects, appCtxSvc.ctx.workflow_process_candidates.workFlowObjects.length );
    }
};

export let loadPreference = function( data ) {
    prefSvc.getStringValue( CR_ALLOW_ALTERNATE_PROCEDURES_PREFERENCE ).then( function( prefValue ) {
        if( !prefValue || prefValue.length <= 0 ) {
            prefValue = 'none';
        }
        data.preferences.CR_allow_alternate_procedures = [];
        data.preferences.CR_allow_alternate_procedures[ 0 ] = prefValue;

        // Get the option to show all or filter templates based on preference value and then use them to populate the templates
        var isFetchFilteredTemplates = isFetchFilteredTemplatesValue( data );

        // Populate the workflow templates based on preference values
        populateWorkflowTemplatesData( data, isFetchFilteredTemplates );

        exports.isFetchFilteredTemplates( data );
        //Populate the workflow process name
        populateWorkflowProcessName( data );
    } );
};

/**
 * Fetch All Templates
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let isFetchFilteredTemplates = function( data, isAddRemoveTargetCase ) {
    var isFetchFilteredTemplates = true;

    data.isAllowAlternateProcedures.dbValue = true;
    if( data.preferences.CR_allow_alternate_procedures[ 0 ] === 'none' ) {
        data.isAllowAlternateProcedures.dbValue = false;
    } else if( data.preferences.CR_allow_alternate_procedures[ 0 ] === 'any' ) {
        isFetchFilteredTemplates = false;
        data.allowAlternateProcedures.dbValue = true;
    } else if( data.preferences.CR_allow_alternate_procedures[ 0 ] === 'Assigned' ) {
        data.allowAlternateProcedures.dbValue = false;
    }

    // Check if process target is empty then we need to show all option as selected all time
    if( _isProcessTargetsEmpty() ) {
        data.allowAlternateProcedures.dbValue = true;
    }

    // Set this to false so that submit button will be hidden so that user can't click on submit button multiple times
    // This fix has been submitted as PR # 3053176
    data.submitActionInProgress = false;

    //Populate the workflow process name
    populateWorkflowProcessName( data );

    return isFetchFilteredTemplates;
};

/**
 * extract type name from uid
 *
 * @param {string} uid model type uid
 * @returns {string}  Type name extraced from input
 */
var _getModelTypeNameFromUid = function( uid ) {
    var tokens = uid.split( '::' );
    if( tokens.length === 4 && tokens[ 0 ] === 'TYPE' ) {
        return tokens[ 1 ];
    }
    return null;
};

/**
 * Populate all participant types based on input values.
 *
 * @param {Array} supportedParticipants Supported participants objects
 * @param {Array} participantTypeList Participant type list for all participant internal and display name
 * @param {Object} ctx Context object
 * @param {Object} data - The qualified data of the viewModel
 */
var _populateParticipantTypes = function( supportedParticipants, participantTypeList, ctx, data ) {
    if( supportedParticipants && supportedParticipants.dbValues && participantTypeList ) {
        for( var index = 0; index < supportedParticipants.dbValues.length; index++ ) {
            var typeName = _getModelTypeNameFromUid( supportedParticipants.dbValues[ index ] );
            var typeDisplayName = supportedParticipants.uiValues[ index ];

            // Below change is for PR LCS-234054. For Plant Problem Report the display name of participant should be Implementer and Responsible User
            if( supportedParticipants.uiValues[ index ] === data.i18n.analystTypeName && ctx.workflow_process_candidates && ctx.workflow_process_candidates.workFlowObjects &&
                ctx.workflow_process_candidates.workFlowObjects.length > 0 && ctx.workflow_process_candidates.workFlowObjects[ 0 ].modelType.typeHierarchyArray.indexOf( 'Pdm1ProblemItemRevision' ) > -1
                ) {
                typeDisplayName = data.i18n.implementer;
            } else if( supportedParticipants.uiValues[ index ] === data.i18n.changeSpecialistTypeName && ctx.workflow_process_candidates &&
                ctx.workflow_process_candidates.workFlowObjects && ctx.workflow_process_candidates.workFlowObjects.length > 0 && ctx.workflow_process_candidates.workFlowObjects[ 0 ].modelType
                .typeHierarchyArray.indexOf( 'Pdm1ProblemItemRevision' ) > -1 ) {
                typeDisplayName = data.i18n.responsibleUser;
            }

            var participant = {
                typeName: typeName,
                typeDisplayName: typeDisplayName
            };

            participantTypeList.push( participant );
        }
    }
};

var _isTc131OrLater = function() {
    return workflowAssinmentUtilSvc.isTCReleaseAtLeast131( appCtxSvc.ctx );
};

/**
 * Get the first target object that is being submitted to workflow
 *
 * @returns {Object}  Target object
 */
var _getTargetObject = function() {
    var targetObject = null;
    if( appCtxSvc.ctx && appCtxSvc.ctx.workflow_process_candidates && appCtxSvc.ctx.workflow_process_candidates.workFlowObjects &&
        appCtxSvc.ctx.workflow_process_candidates.workFlowObjects.length > 0 && appCtxSvc.ctx.workflow_process_candidates.workFlowObjects[ 0 ] ) {
        targetObject = appCtxSvc.ctx.workflow_process_candidates.workFlowObjects[ 0 ];
    }
    return targetObject;
};

export let populateParticipantPanel = function( data, workflowTemplate, ctx ) {
    var participantList = [];
    var optionalParticipants = null;
    var requiredParticipants = null;
    if( workflowTemplate ) {
        var modelObject = cdm.getObject( workflowTemplate.uid );
        if( modelObject ) {
            optionalParticipants = modelObject.props.fnd0OptionalParticipants;
            requiredParticipants = modelObject.props.fnd0RequiredParticipants;
        }
    }

    if( optionalParticipants && optionalParticipants.dbValues && optionalParticipants.dbValues.length > 0 ) {
        _populateParticipantTypes( optionalParticipants, participantList, ctx, data );
    }

    if( requiredParticipants && requiredParticipants.dbValues && requiredParticipants.dbValues.length > 0 ) {
        _populateParticipantTypes( requiredParticipants, participantList, ctx, data );
    }

    data.processAssignmentParticipants = participantList;
    data.isDifferentTemplateSelected = true;
    if( !data.isNarrowMode ) {
        ctx.openCategoriesPanel = false;
        if( !ctx.workflow ) {
            ctx.workflow = {};
        }
        ctx.workflow.additionalSearchCriteria = {};
        ctx.isManualTreeRefresh = false;
        var referenceEl = popupUtils.getElement( popupUtils.extendSelector( '.aw-popup-contentContainer .aw-layout-panelContent' ) );
        if( referenceEl && ( ctx.openUserPickerPanel || ctx.openAddTargetPanel || ctx.openAddReferencePanel ) ) {
            referenceEl.style.width = '900px';
            eventBus.publish( 'workflow.revealUserPickerPanel' );
        } else if( referenceEl ) {
            referenceEl.style.width = '600px';
        }
    }
    ctx.parentData = data;
    ctx.isTemplateListboxValueChanged = true;
    var targetObject = _getTargetObject();
    if( data.workflowTemplates && data.workflowTemplates.dbValue ) {
        var context = {
            isEditHandlerNeeded: false,
            isInsidePanel: true,
            validTaskAssignmentObject: data.workflowTemplates.dbValue,
            isNarrowViewMode: data.isNarrowMode,
            maxTableRowsToShow: 7
        };
        // Check if target is not null and UID present then we need add as additional data to server
        // for target info
        if( targetObject && targetObject.uid ) {
            context.additionalTargetData = {
                dp_target_object: [ targetObject.uid ]
            };
        }
        appCtxSvc.registerCtx( 'taskAssignmentCtx', context );
    }

    if( participantList.length > 0 && !_isTc131OrLater() ) {
        if( !data.isNarrowMode ) {
            ctx.openUserPickerPanel = false;
            if( referenceEl ) {
                referenceEl.style.width = '600px';
            }
        }
        appCtxSvc.updateCtx( 'isDynamicParticipantAssignmentPresent', true );
        return;
    }
    appCtxSvc.updateCtx( 'isDynamicParticipantAssignmentPresent', false );
};

/**
 * Return if load filtered.
 *
 * @param {boolean} isAll - The boolean to determine all templates will be available or not
 *
 * @return {boolean} The boolean value to tell that templates are filtered or not
 */
export let getValidTemplates = function( data, isAll ) {
    if( appCtxSvc.ctx.workflow ) {
        appCtxSvc.ctx.openCategoriesPanel = false;
        appCtxSvc.ctx.workflow.additionalSearchCriteria = {};
        eventBus.publish( 'workflow.revealUserPickerPanel' );
    }
    var templates = populateWorkflowTemplatesData( data, isAll );
    exports.checkForAssignmentSection( data, appCtxSvc.ctx );
    return templates;
};

/**
 * Populate the workflow name on the panel based on first selected object
 *
 * @param { Object }data - The qualified data of the viewModel
 */
function populateWorkflowProcessName( data ) {
    if( appCtxSvc.ctx.workflow_process_candidates && //
        appCtxSvc.ctx.workflow_process_candidates.workFlowObjects && //
        appCtxSvc.ctx.workflow_process_candidates.workFlowObjects.length > 0 ) {
        // Check if object string is not null and not undefined then get the name directly else get the process name from getProperties SOA call
        if( appCtxSvc.ctx.workflow_process_candidates.workFlowObjects[ 0 ].props &&
            appCtxSvc.ctx.workflow_process_candidates.workFlowObjects[ 0 ].props.object_string ) {
            var workFlowName = appCtxSvc.ctx.workflow_process_candidates.workFlowObjects[ 0 ].props.object_string.uiValues[ 0 ];
            var processName = data.workflowTemplates.uiValue + ' : ' + workFlowName;
            // Maximum we can have 128 characters in process name
            processName = returnProcessName( data, processName, workFlowName );
            var processValue = workflowUtils.getPropTrimValue( data.workFlowName.maxLength, processName );
            data.workFlowName.dbValue = processValue;
        } else {
            var uidsToLoad = [];
            uidsToLoad.push( appCtxSvc.ctx.workflow_process_candidates.workFlowObjects[ 0 ].uid );
            return dmSvc
                .getProperties( uidsToLoad, [ 'object_string' ] )
                .then(
                    function() {
                        var workFlowName = appCtxSvc.ctx.workflow_process_candidates.workFlowObjects[ 0 ].props.object_string.uiValues[ 0 ];
                        // Maximum we can have 128 characters in process name
                        var processName = data.workflowTemplates.uiValue + ' : ' + workFlowName;
                        // Maximum we can have 128 characters in process name
                        processName = returnProcessName( data, processName, workFlowName );
                        var processValue = workflowUtils.getPropTrimValue( data.workFlowName.maxLength, processName );
                        data.workFlowName.dbValue = processValue;
                    } );
        }
    } else if( data.workflowTemplates && data.workflowTemplates.uiValue ) {
        let processName = data.workflowTemplates.uiValue + ' : No Targets';
        processName = returnProcessName( data, processName, 'No Targets' );
        let processValue = workflowUtils.getPropTrimValue( data.workFlowName.maxLength, processName );
        data.workFlowName.dbValue = processValue;
    }
}

// Reads the preference value to determine whether the template name is prepended when submitting object to workflow
function returnProcessName( data, processName, workFlowName ) {
    var workFlowProcessName = processName;
    if( data.preferences.WRKFLW_add_template_name_for_new_process && data.preferences.WRKFLW_add_template_name_for_new_process[ 0 ] === 'false' ) {
        workFlowProcessName = workFlowName;
    }
    return workFlowProcessName;
}

/**
 * Return if load filtered.
 *
 * @param {boolean} isAll - The boolean to determine all templates will be available or not
 *
 * @return {boolean} The boolean value to tell that templates are filtered or not
 */
export let getFiltered = function( isAll ) {
    return !isAll;
};

/**
 * Get the origin id that need to be used for saving.
 *
 * @param {Object} modelObject Model object for assignment need to be fetched
 *
 * @returns {String} Origin UID string
 */
var _getAssignmentOrigin = function( modelObject ) {
    var originId = 'AAAAAAAAAAAAAA';
    if( modelObject && modelObject.assignmentOrigin && modelObject.assignmentOrigin !== null &&
        modelObject.assignmentOrigin.uid ) {
        originId = modelObject.assignmentOrigin.uid;
    }
    return originId;
};

/**
 * Get the profile object associated with assignment if yes then return profile uid else
 * return null uid.
 * @param {Object} modelObject Assignment model object
 *
 * @returns {Object} Profile object for assignment coming for profile assignment
 */
var _getProfileObjectUid = function( modelObject ) {
    if( modelObject.signoffProfile && modelObject.signoffProfile.uid ) {
        return modelObject.signoffProfile.uid;
    }
    return 'AAAAAAAAAAAAAA';
};

/**
 * True or false based on task assignment is valid or not.
 *
 * @param {Object} modelObject object have assignment info
 *
 * @returns{boolean} True/False
 */
var _isValidTaskAssignment = function( modelObject ) {
    if( !modelObject || !modelObject.taskAssignment || modelObject.taskAssignment.uid === 'unstaffedUID' ||
        modelObject.internalName ) {
        return false;
    }
    return true;
};

/**
 * Get all assignment info for non DP based task template.
 *
 * @param {Object} ctx Context object
 * @param {Object} data Data view model object
 * @param {Object} taskAssignmentDataObject Task based assignment object that hold all assignment information
 *
 * @returns {Array} Task based assignment array that have info for each task and corresponding assignments
 */
var _getTaskNonDPBasedAssignments = function( ctx, data, taskAssignmentDataObject ) {
    var taskBasedAssignmentInfo = [];
    data.attachmentType = [];
    if( !ctx.taskAssignmentCtx || !ctx.taskAssignmentCtx.taskAssignmentDataObject || !taskAssignmentDataObject ) {
        return [];
    }
    var tempTaskAssignmentObject = taskAssignmentDataObject;
    var updatedTaskUids = ctx.taskAssignmentCtx.updatedTaskObjects;
    var updatedTaskObjects = [];
    _.forEach( updatedTaskUids, function( taskUid ) {
        var taskObject = cdm.getObject( taskUid );
        if( taskObject ) {
            updatedTaskObjects.push( taskObject );
        }
    } );
    tempTaskAssignmentObject = workflowAssignmentSvc.populateAssignmentFullTableRowData( tempTaskAssignmentObject, updatedTaskObjects, true );
    for( var taskId in tempTaskAssignmentObject.taskInfoMap ) {
        var taskObject = tempTaskAssignmentObject.taskInfoMap[ taskId ];
        var taskTemplate = taskId;
        var members = null;
        var action = null;
        var profiles = null;
        var origins = null;
        // Iterate for each proerpty present for task assignment
        for( var propName in taskObject.props ) {
            var currentAction;
            var currentProfile;
            var assignmentObjects = taskObject.props[ propName ].modelObjects;
            // Check if assignemnt objects are invalid then no need to process further
            if( !assignmentObjects || assignmentObjects.length <= 0 ) {
                continue;
            }

            // Iterate for all assignment objects and find out the individual assignment and populate
            // all required properties for that assignment
            for( var idx = 0; idx < assignmentObjects.length; idx++ ) {
                var modelObject = assignmentObjects[ idx ];
                // If it's invalid task assignment then no need to process this assignment
                if( !_isValidTaskAssignment( modelObject ) ) {
                    continue;
                }

                // Populate the member that need to be assigned
                if( !members ) {
                    members = modelObject.taskAssignment.uid;
                } else {
                    members = members + '|' + modelObject.taskAssignment.uid;
                }

                // Populate the origin that need to be assigned
                var originId = _getAssignmentOrigin( modelObject );
                if( !origins ) {
                    origins = originId;
                } else {
                    origins = origins + '|' + originId;
                }

                // Based on assignment type, we need to populate profile and action and that
                // will be used further
                switch ( modelObject.assignmentType ) {
                    case 'assignee': {
                        currentAction = 0;
                        currentProfile = 'AAAAAAAAAAAAAA';
                        break;
                    }
                    case 'notifyees': {
                        currentAction = 3;
                        currentProfile = 'AAAAAAAAAAAAAA';
                        break;
                    }
                    case 'acknowledgers': {
                        currentAction = 2;
                        currentProfile = _getProfileObjectUid( modelObject );
                        break;
                    }
                    case 'reviewers': {
                        currentAction = 1;
                        currentProfile = _getProfileObjectUid( modelObject );
                    }
                }
                if( action === null ) {
                    action = currentAction;
                } else {
                    action = action + '|' + currentAction;
                }
                if( !profiles ) {
                    profiles = currentProfile;
                } else {
                    profiles = profiles + '|' + currentProfile;
                }
            }
        }
        // Check if all values are present then only we need to create task info and add it as attachment type
        // so that these resources can be assigned
        if( taskTemplate && members && profiles && action !== null && origins ) {
            var tasksInfo = taskTemplate + ',{' + members + '},' + '{' + profiles + '}' + ',{' + action + '}' + ',{' + origins + '}';
            taskBasedAssignmentInfo.push( tasksInfo );
            data.attachmentType.push( 200 );
        }
    }
    _getTaskDPBasedAssignments( data, tempTaskAssignmentObject, taskBasedAssignmentInfo );

    return taskBasedAssignmentInfo;
};

/**
 * Get all assignment info for DP based task template.
 *
 * @param {Object} data Context object
 * @param {Object} taskAssignmentDataObject Data view model object
 * @param {Object} taskBasedAssignmentInfo Task based assignment object that hold all assignment information
 *
 *
 */
var _getTaskDPBasedAssignments = function( data, taskAssignmentDataObject, taskBasedAssignmentInfo ) {
    var participantInfoMap = taskAssignmentDataObject.participantInfoMap;
    if( !participantInfoMap || _.isEmpty( participantInfoMap ) ) {
        return;
    }
    for( var participantName in participantInfoMap ) {
        var assigneeObjects = participantInfoMap[ participantName ].assignees;
        var dpAssignment = participantName;
        if( assigneeObjects && assigneeObjects.length > 0 ) {
            _.forEach( assigneeObjects, function( assignee ) {
                if( assignee && assignee.taskAssignment && assignee.taskAssignment.uid && assignee.taskAssignment.uid !== 'unstaffedUID' ) {
                    dpAssignment += ',' + assignee.taskAssignment.uid;
                }
            } );
        }
        taskBasedAssignmentInfo.push( dpAssignment );
        data.attachmentType.push( 100 );
    }
};

/**
 * Return the input model object array UID array
 *
 * @param { Object }data - The qualified data of the viewModel
 * @param {Array} modelObjects - Array of model object
 * @param {Array} processAssignmentParticipants - Array of participants data providers
 *
 * @return {StringArray} UID's string array
 */
export let getUids = function( data, modelObjects, processAssignmentParticipants, taskAssignmentDataObject, ctx, referenceObjects ) {
    var uids = [];
    var attachmentList = [];
    var taskBasedAssignmentInfo = [];

    // Set this to true to indicate that submit action is in progress so that submit button is hidden from panel until action is in progress
    data.submitActionInProgress = true;

    for( var x in modelObjects ) {
        if( modelObjects[ x ] && modelObjects[ x ].uid ) {
            var targetUid = modelObjects[ x ].uid;
            if( modelObjects[ x ].type === 'Awp0XRTObjectSetRow' ) {
                var targetObj = _.get( modelObjects[ x ], 'props.awp0Target' );
                if( targetObj && targetObj.dbValue ) {
                    targetUid = targetObj.dbValue;
                }
            }
            if( targetUid ) {
                uids.push( targetUid );
            }
        }
    }
    if( processAssignmentParticipants && processAssignmentParticipants.length > 0 ) {
        attachmentList = getParticipantsType( processAssignmentParticipants );
    }

    var attachments = uids.concat( attachmentList );

    if( !ctx.isDynamicParticipantAssignmentPresent && taskAssignmentDataObject ) {
        taskBasedAssignmentInfo = _getTaskNonDPBasedAssignments( ctx, data, taskAssignmentDataObject );
    }

    if( referenceObjects && referenceObjects.length > 0 ) {
        let referenceAttachments = [];
        for( let i = 0; i < referenceObjects.length; i++ ) {
            referenceAttachments.push( referenceObjects[ i ].uid );
        }
        attachments = attachments.concat( referenceAttachments );
    }

    return attachments.concat( taskBasedAssignmentInfo );
};

var getParticipantsType = function( processAssignmentParticipants ) {
    var participantsType;
    var attachmentList = [];
    for( var idx in processAssignmentParticipants ) {
        if( processAssignmentParticipants[ idx ].dataProvider ) {
            var participantAdded = processAssignmentParticipants[ idx ].dataProvider.viewModelCollection.totalFound;
            if( participantAdded > 0 ) {
                participantsType = processAssignmentParticipants[ idx ].typeName;
                var participants = getParticipants( processAssignmentParticipants[ idx ] );
                participantsType += ',';
                participantsType += participants;
                attachmentList.push( participantsType );
            } else if( processAssignmentParticipants[ idx ].allParticipantRemoved ) {
                participantsType = processAssignmentParticipants[ idx ].typeName;
                participantsType += ',';
                attachmentList.push( participantsType );
            }
        }
    }
    return attachmentList;
};

var getParticipants = function( processAssignmentParticipant ) {
    var participantsUid;
    var participantsAdded = processAssignmentParticipant.dataProvider.viewModelCollection.loadedVMObjects;
    if( participantsAdded ) {
        for( var participantsIdx in participantsAdded ) {
            if( typeof participantsUid === typeof undefined ) {
                participantsUid = participantsAdded[ participantsIdx ].uid;
            } else {
                participantsUid = participantsUid + ',' + participantsAdded[ participantsIdx ].uid;
            }
        }
    }
    return participantsUid;
};

/**
 * Return all available attachment types
 *
 * @param {Array} modelObjects - Array of model object
 * @param {Array} processAssignmentParticipants - Array of process Assignments
 *
 * @return {NumberArray} Attachment type array
 */
export let getAttachmentTypes = function( modelObjects, processAssignmentParticipants, data, referenceObjects ) {
    var attachmentTypes = [];
    if( modelObjects ) {
        for( var idx = 0; idx < modelObjects.length; idx++ ) {
            attachmentTypes.push( 1 );
        }
    }

    if( processAssignmentParticipants && processAssignmentParticipants.length > 0 ) {
        for( var indx in processAssignmentParticipants ) {
            if( processAssignmentParticipants[ indx ].dataProvider ) {
                var participantAdded = processAssignmentParticipants[ indx ].dataProvider.viewModelCollection.totalFound;
                if( participantAdded > 0 || processAssignmentParticipants[ indx ].allParticipantRemoved ) {
                    attachmentTypes.push( 100 );
                }
            }
        }
    }

    if( referenceObjects ) {
        for( let i = 0; i < referenceObjects.length; i++ ) {
            attachmentTypes.push( 3 );
        }
    }

    if( data && typeof data.attachmentType !== typeof undefined && data.attachmentType.length > 0 ) {
        attachmentTypes = attachmentTypes.concat( data.attachmentType );
    }
    return attachmentTypes;
};

/**
 * This method will fetch the PAL List and return it to SOA.
 * @param {object} data - data
 * @returns PALList
 */
export let getProcessAssignmentList = function( data ) {
    if( data && data.palList && data.palList.dbValue && data.palList.dbValue !== data.i18n.none ) {
        return data.palList.dbValue.props.object_string.dbValues[ 0 ];
    }
    return '';
};

/**
 * Reset the submitActionInProgress value if its true so that submit button can be enabled if panel is not
 * closed
 *
 * @param { Object }data - The qualified data of the viewModel
 *
 */
export let resetValue = function( data ) {
    // Check if data is not null and submit action in progress value is true
    // then only reset it to false
    if( data && data.submitActionInProgress ) {
        data.submitActionInProgress = false;
    }
};

/**
 * Check input error code is to be ignore or not
 *
 * @param {object} errCode - the error code that needs to be check
 * @return {boolean} - True if error code needs to be ignored else false
 */
var _isIgnoreErrorCode = function( errCode ) {
    if( errCode === 33321 || errCode === 214000 ) {
        return true;
    }
    if( errCode === 33086 || errCode === 33083 || errCode === 33084 || errCode === 33085 ) {
        return true;
    }
    return false;
};

/**
 * Populate the error message based on the SOA response output and filters the partial errors and shows the
 * correct errors only to the user.
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
export let populateErrorMessageOnNewWorkflowProcess = function( response ) {
    var err = null;
    var message = '';

    // Check if input response is not null and contains partial errors then only
    // create the error object
    if( response && ( response.ServiceData.partialErrors || response.ServiceData.PartialErrors ) ) {
        err = soaSvc.createError( response );
    }

    // Check if error object is not null and has partial errors then iterate for each error code
    // and filter out the errors which we don't want to display to user
    if( err && err.cause && err.cause.ServiceData.partialErrors ) {
        _.forEach( err.cause.ServiceData.partialErrors, function( partErr ) {
            if( partErr.errorValues ) {
                _.forEach( partErr.errorValues, function( errVal ) {
                    if( errVal.code && !_isIgnoreErrorCode( errVal.code ) ) {
                        if( message && message.length > 0 ) {
                            message += '</br>' + errVal.message;
                        } else {
                            message += errVal.message;
                        }
                    }
                } );
            }
        } );
    }

    return message;
};

export let enableTheFlagForDifferentTemplateSelected = function( data ) {
    data.isDifferentTemplateSelected = false;
};

export let checkForAssignmentSection = function( data, ctx ) {
    ctx.isTemplateListboxValueChanged = false;
    ctx.isDynamicParticipantAssignmentPresent = false;
    appCtxSvc.unRegisterCtx( 'messageData' );
    appCtxSvc.unRegisterCtx( 'assignmentsChanged' );
    populateWorkflowProcessName( data );
    // This is needed to reload the assignment section correctly.
    setTimeout( function() {
        eventBus.publish( 'workflowProcessAssignement.getProperties' );
    }, 0 );
};

/**
 * Un-register the values from app context when panel
 * is being unloaded.
 */
export let unregisterContext = function() {
    appCtxSvc.unRegisterCtx( 'isDynamicParticipantAssignmentPresent' );
    appCtxSvc.unRegisterCtx( 'isTemplateListboxValueChanged' );
    appCtxSvc.unRegisterCtx( 'submitWorkflowPopupCtx' );
    appCtxSvc.unRegisterCtx( 'taskAssignmentCtx' );
    appCtxSvc.unRegisterCtx( 'hideTargetCommands' );
    appCtxSvc.unRegisterCtx( 'showReferenceCommands' );
    appCtxSvc.unRegisterCtx( 'openAddTargetPanel' );
    appCtxSvc.unRegisterCtx( 'openAddReferencePanel' );
    appCtxSvc.unRegisterCtx( 'addTargetCommand' );
    appCtxSvc.unRegisterCtx( 'addReferenceCommand' );
    appCtxSvc.unRegisterCtx( 'messageData' );
    appCtxSvc.unRegisterCtx( 'assignmentsChanged' );
    appCtxSvc.unRegisterCtx( 'parentData' );
    exports.resetCtxValuesForUserPickerAndCategoriesPanel();
};

/**
 * Un-register the values from app context when panel
 * is being unloaded.
 */
export let resetCtxValuesForUserPickerAndCategoriesPanel = function() {
    appCtxSvc.unRegisterCtx( 'openCategoriesPanel' );
    appCtxSvc.unRegisterCtx( 'openUserPickerPanel' );
    appCtxSvc.unRegisterCtx( 'submitWorkflowPopupCtx' );
    appCtxSvc.unRegisterCtx( 'workflow_process_references' );
    editHandlerSvc.setActiveEditHandlerContext( 'NONE' );
};

/**
 * Returns the task UID for sub process need to be created. Like if user selected
 * Signoff object then get the parent task and retutn that parent task uid.
 * @param {Object} selected Selected object from UI
 *
 * @returns {String} Returns the selected task uid for subprocess creation
 */
export let getDependentTaskObject = function( selected ) {
    var taskObject = awp0InboxUtils.getTaskObject( selected );
    if( taskObject ) {
        return taskObject.uid;
    }
    return '';
};

/**
 * Remove the input objects from attachment data provider and populate the workflow templates
 * based on valid templates and process name.
 * @param {Object} context Context view model object from object need to be removed
 * @param {Array} removeObjects Objects that need to be removed
 * @param {Object} ctx context object
 * @param {boolean} isRemoveAllCase Is all object need to be removed or not
 */
export let removeWorkflowProcessTargets = function( context, removeObjects, ctx, isRemoveAllCase, targetReference ) {
    var dataProvider = context;
    // if( context && context.dataProviders.attachTargets ) {
    //     dataProvider = context.dataProviders.attachTargets;
    // }
    if( removeObjects && dataProvider && removeObjects.length > 0 ) {
        var modelObjects = dataProvider.viewModelCollection.loadedVMObjects;
        var selectedIndexs = dataProvider.getSelectedIndexes();
        var isTemplateUpdateNeeded = isRemoveAllCase;

        // Check if user is removing all targets or some specific target and target that is being removed
        // present on 0th index for which template is valid then we need to repopulate the template based
        // on new valid target present on 0th index
        if( !isTemplateUpdateNeeded ) {
            var isExist = _.find( selectedIndexs, function( index ) { return index === 0; } );
            if( isExist !== undefined ) {
                isTemplateUpdateNeeded = true;
            }
        }

        var validObjects = _.difference( modelObjects, removeObjects );

        dataProvider.update( validObjects, validObjects.length );

        _.forEach( removeObjects, function( target ) {
            if( target.selected === true ) {
                target.selected = false;
            }
        } );

        if( targetReference === 'Target' ) {
            if( ctx.workflow_process_candidates && ctx.workflow_process_candidates.workFlowObjects ) {
                ctx.workflow_process_candidates.workFlowObjects = validObjects;
            }
            if( isTemplateUpdateNeeded ) {
                if( validObjects > 1 ) {
                    updateTargetsToSubmit( ctx.parentData );
                } else {
                    exports.populatePanelData( ctx.parentData, validObjects, true );
                }
            }
        } else if( ctx.parentData && targetReference === 'Reference' ) {
            ctx.workflow_process_references.workFlowObjects = validObjects;
            ctx.parentData.dataProviders.attachReferences.update( appCtxSvc.ctx.workflow_process_references.workFlowObjects, appCtxSvc.ctx.workflow_process_references.workFlowObjects.length );
        }
    }
};

export let updateProcessContextInfo = function( ctx, dataProvider, isPanelUpdateNeeded ) {
    var validObjects = [];
    if( ctx.workflow_process_candidates && ctx.workflow_process_candidates.workFlowObjects ) {
        validObjects = dataProvider.viewModelCollection.loadedVMObjects;
        ctx.workflow_process_candidates.workFlowObjects = validObjects;
    }

    if( isPanelUpdateNeeded ) {
        exports.populatePanelData( ctx.parentData, validObjects, false, true );
    }
};

/**
 * Add the input selected object into the data provider.
 *
 * @param {Object} dataProvider Data provide object where pbject need to be added
 * @param {Array} selectedObjects Selected objects that need to be added
 * @param {Object} ctx Context object
 */
export let addProcessAttachments = function( dataProvider, selectedObjects, ctx, data ) {
    if( dataProvider.name === 'attachTargets' && ctx.workflow_process_candidates ) {
        dataProvider.viewModelCollection.loadedVMObjects = ctx.workflow_process_candidates.workFlowObjects;
    }

    if( dataProvider.name === 'attachReferences' && ctx.workflow_process_references ) {
        dataProvider.viewModelCollection.loadedVMObjects = ctx.parentData.dataProviders.attachReferences.viewModelCollection.loadedVMObjects;
    }

    if ( dataProvider.name === 'attachTargets' ) {
        var checkedOutObjects = '';
        var numberOfCheckedOut = 0;
        var message = '';

        for ( var i = 0; i < selectedObjects.length; i++ ) {
            if ( selectedObjects[i].props.checked_out_user && selectedObjects[i].props.checked_out_user.dbValue !== null ) {
                //build a list of selected objects that are checked out
                if ( numberOfCheckedOut > 0 ) {
                    checkedOutObjects += '\n';
                }
                checkedOutObjects += '"' + selectedObjects[i].props.object_name.uiValue + '"';
                numberOfCheckedOut++;
            }
        }
        if ( numberOfCheckedOut === 1 ) {
            message = data.i18n.singleCheckedOutError;
            message = message.replace( '{0}', checkedOutObjects );
            notyService.showError( message );
            return;
        } else if ( numberOfCheckedOut > 1 ) {
            message = data.i18n.multipleCheckedOutError;
            message += '\n' + checkedOutObjects;
            notyService.showError( message );
            return;
        }
    }

    if( dataProvider && selectedObjects && selectedObjects.length > 0 ) {
        var targetObjects = selectedObjects;

        //find which cell is currently selected, and set selected to false so that
        // on panel it won't show as selected
        _.forEach( targetObjects, function( target ) {
            if( target.selected === true ) {
                target.selected = false;
            }
        } );
        var presetObjects = dataProvider.viewModelCollection.loadedVMObjects;
        var isDataProviderEmpty = dataProvider.viewModelCollection.loadedVMObjects.length <= 0;
        let dataAddedPreviously = dataProvider.viewModelCollection.loadedVMObjects.length > 1;

        // Prevents the first add target from replacing the original target
        // Prevents changing template from clearing added targets
        if( isDataProviderEmpty || dataAddedPreviously ) {
            presetObjects = presetObjects.concat( dataProvider.viewModelCollection.loadedVMObjects );
        }

        Array.prototype.push.apply( presetObjects, targetObjects );

        // Remove the duplicates if present in presetObjects list.
        targetObjects = _.uniqWith( presetObjects, function( objA, objB ) {
            return objA.uid === objB.uid;
        } );

        dataProvider.update( targetObjects, targetObjects.length );
        if( dataProvider.name === 'attachReferences' ) {
            ctx.parentData.dataProviders.attachReferences.update( targetObjects, targetObjects.length );
            ctx.workflow_process_references.workFlowObjects = ctx.parentData.dataProviders.attachReferences.viewModelCollection.loadedVMObjects;
        }
        if( dataProvider.name === 'attachTargets' && ctx && ctx.workflow_process_candidates && ctx.workflow_process_candidates.workFlowObjects ) {
            ctx.workflow_process_candidates.workFlowObjects = targetObjects;
        }
        if( dataProvider.name === 'attachTargets' ) {
            if( !isDataProviderEmpty ) {
                updateTargetsToSubmit( ctx.parentData );
            } else {
                exports.populatePanelData( ctx.parentData, selectedObjects, true );
            }
        }
    }
};

/**
 * Parse the input response object and get all types that can be submit to workflow
 * and based on that get the fnd0InternalName and return it as string seperated by ,.
 * This is needed to show all types in pallete or search tab.
 *
 * @param {Object} response Response object that will contain all submittable types
 *
 * @returns {String} Submittable type string seperated by ','
 */
export let getSubmittableObjectTypes = function( response ) {
    var allowedTypes = [];
    if( response && response.searchResultsJSON ) {
        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
        if( searchResults ) {
            for( var i = 0; i < searchResults.objects.length; i++ ) {
                var uid = searchResults.objects[ i ].uid;
                var typeObject = response.ServiceData.modelObjects[ uid ];
                if( typeObject && typeObject.props.fnd0InternalName &&
                    typeObject.props.fnd0InternalName.dbValues && typeObject.props.fnd0InternalName.dbValues[ 0 ] ) {
                    var internalName = typeObject.props.fnd0InternalName.dbValues[ 0 ];
                    if( internalName && internalName !== '' ) {
                        allowedTypes.push( internalName );
                    }
                }
            }
        }
    }
    var allowedTypeString = 'ItemRevision';
    if( allowedTypes && allowedTypes.length > 0 ) {
        allowedTypeString = allowedTypes.join( ',' );
    }
    return allowedTypeString;
};

/**
 * Get the workflow process target that are already attached to selected process.
 * @param {Object} response Response object
 *
 * @returns {Array} Process target array
 */
export let getWorkflowProcessTargets = function( response ) {
    var processTargets = [];
    if( !response || !response.searchResultsJSON ) {
        return processTargets;
    }
    var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
    if( !searchResults || !searchResults.objects || searchResults.objects.length <= 0 ) {
        return processTargets;
    }
    _.forEach( searchResults.objects, function( searchResult ) {
        var modelObject = response.ServiceData.modelObjects[ searchResult.uid ];
        if( modelObject && modelObject.type === 'Awp0XRTObjectSetRow' ) {
            var targetObj = _.get( modelObject, 'props.awp0Target' );
            if( targetObj && targetObj.dbValues && targetObj.dbValues[ 0 ] ) {
                var underlyingObject = cdm.getObject( targetObj.dbValues[ 0 ] );
                if( underlyingObject ) {
                    processTargets.push( underlyingObject );
                }
            }
        } else if( modelObject ) {
            processTargets.push( targetObj );
        }
    } );

    return processTargets;
};

/**
 * This will disable the selection on tree
 * @param {object} eventData - eventData
 * @param {object} ctx - context
 */
export let openUserPickerPanel = function( eventData, ctx, data ) {
    var referenceEl = popupUtils.getElement( popupUtils.extendSelector( '.aw-popup-contentContainer .aw-layout-panelContent' ) );
    if( eventData.caption === data.i18n.assignments && eventData.isCollapsed === true ) {
        ctx.openUserPickerPanel = false;
        ctx.openCategoriesPanel = false;
        if( referenceEl && !ctx.openAddTargetPanel && !ctx.openAddReferencePanel ) {
            referenceEl.style.width = '600px';
        }
        eventBus.publish( 'worfklow.clearTableSelection' );
    } else if( eventData.caption === data.i18n.assignments && eventData.isCollapsed === false && referenceEl ) {
        var context = {
            loadProjectData: true,
            selectionModelMode: 'multiple',
            isHideAddButtonOnUserPanel: true
        };
        appCtxSvc.registerCtx( 'workflow', context );
        referenceEl.style.width = '900px';
        ctx.openAddTargetPanel = false;
        ctx.openAddReferencePanel = false;
        ctx.openUserPickerPanel = true;
    }
};

var isOfType = function( obj, type ) {
    if( obj && obj.modelType && obj.modelType.typeHierarchyArray.indexOf( type ) > -1 ) {
        return true;
    }
    return false;
};

/**
 * Open task category panel if selection is not null and of type task template.
 *
 * @param {object} ctx - ctx
 * @param {object} selectedObject - Selected object from tree
 *
 */
var _populateTaskCategoryPanel = function( ctx, selectedObject ) {
    // Check if previous selected task and new input selected obejct both are same and category panel is open then
    // no need to set the panel context again and return from here.
    if( selectedObject && ctx.openCategoriesPanel && ctx.taskAssignmentCtx && ctx.taskAssignmentCtx.selectedTaskObject &&
        ctx.taskAssignmentCtx.selectedTaskObject.uid === selectedObject.uid ) {
        return;
    }
    var panelContext = workflowAssignmentSvc.registerAssignmentPanelContext( ctx.taskAssignmentCtx, selectedObject );
    ctx.taskAssignmentCtx.parentContext = panelContext;
    var referenceEl = popupUtils.getElement( popupUtils.extendSelector( '.aw-popup-contentContainer .aw-layout-panelContent' ) );
    if( referenceEl ) {
        referenceEl.style.width = '1200px';
        ctx.openCategoriesPanel = true;
        eventBus.publish( 'workflow.refreshPanel' );
        if( ctx.taskAssignmentCtx ) {
            ctx.taskAssignmentCtx.enableModifyButton = false;
        }
    }
};

/**
 * This will auto open the panel on selection of tree node
 * @param {object} selectedObject - Selected object from tree
 * @param {object} ctx - ctx
 */
export let taskTemplateNodeSelection = function( data, selectedObject, ctx, isNarrowMode ) {
    if( isNarrowMode ) {
        var parentContext = workflowAssignmentSvc.registerAssignmentPanelContext( ctx.taskAssignmentCtx, selectedObject );
        ctx.taskAssignmentCtx.parentContext = parentContext;
        if( !isOfType( selectedObject, 'EPMTaskTemplate' ) ) {
            return;
        }
        eventBus.publish( 'awPanel.navigate', {
            destPanelId: 'Awp0TemplateAssignmentSubPanel',
            title: data.i18n.add,
            recreatePanel: true
        } );
        return;
    }
    // Check if selection is empty or not valid and panel is open then close the panel.
    if( !selectedObject || !isOfType( selectedObject, 'EPMTaskTemplate' ) ) {
        ctx.taskAssignmentCtx.parentContext = null;
        exports.closeCategoriesPanel( ctx );
        return;
    }

    // Check if category panel is already open then just update the category and return from here
    if( ctx.openCategoriesPanel ) {
        _populateTaskCategoryPanel( ctx, selectedObject );
    }
};

/**
 * Open task category panel if selection is not null and of type task template.
 *
 * @param {object} ctx - ctx
 * @param {object} selectedObject - Selected object from tree
 *
 */
export let openTaskCategoriesPanel = function( ctx, selectedObject ) {
    // Check if selection is empty or not valid and panel is open then close the panel.
    if( selectedObject && isOfType( selectedObject, 'EPMTaskTemplate' ) ) {
        _populateTaskCategoryPanel( ctx, selectedObject );
    }
};

export let closeCategoriesPanel = function( ctx ) {
    var referenceEl = popupUtils.getElement( popupUtils.extendSelector( '.aw-popup-contentContainer .aw-layout-panelContent' ) );

    if( referenceEl && ctx.openCategoriesPanel ) {
        referenceEl.style.width = '900px';
        ctx.openCategoriesPanel = false;
        if( !ctx.workflow ) {
            ctx.workflow = {};
        }
        ctx.workflow.additionalSearchCriteria = {};
        eventBus.publish( 'workflow.revealUserPickerPanel' );
    }
};

/**
 * Clear the table selection if user is collapsing assignment section
 * @param {Object} eventData Event data object for collapse section
 * @param {Object} data Data view model object
 */
export let collapseSection = function( eventData, data ) {
    if( eventData && eventData.caption === data.i18n.assignments && eventData.isCollapsed === true ) {
        eventBus.publish( 'worfklow.clearTableSelection' );
    }
};

// eslint-disable-next-line valid-jsdoc

export default exports = {
    sendEventToHost,
    populatePanelData,
    loadPreference,
    isFetchFilteredTemplates,
    populateParticipantPanel,
    getValidTemplates,
    getFiltered,
    getUids,
    getAttachmentTypes,
    getProcessAssignmentList,
    resetValue,
    populateErrorMessageOnNewWorkflowProcess,
    enableTheFlagForDifferentTemplateSelected,
    checkForAssignmentSection,
    unregisterContext,
    getDependentTaskObject,
    removeWorkflowProcessTargets,
    addProcessAttachments,
    getSubmittableObjectTypes,
    updateProcessContextInfo,
    getWorkflowProcessTargets,
    openUserPickerPanel,
    taskTemplateNodeSelection,
    closeCategoriesPanel,
    resetCtxValuesForUserPickerAndCategoriesPanel,
    collapseSection,
    openTaskCategoriesPanel
};
/**
 * This factory creates service to listen to subscribe to the event when templates are loaded
 *
 * @memberof NgServices
 * @member Awp0NewWorkflowProcess
 */
app.factory( 'Awp0NewWorkflowProcess', () => exports );
