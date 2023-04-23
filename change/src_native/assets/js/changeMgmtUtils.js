// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/changeMgmtUtils
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import localeSvc from 'js/localeService';
import lovService from 'js/lovService';
import messagingService from 'js/messagingService';
import dateTimeSvc from 'js/dateTimeService';
import uwPropertyService from 'js/uwPropertyService';
import cmm from 'soa/kernel/clientMetaModel';
import hostFeedbackSvc from 'js/hosting/sol/services/hostFeedback_2015_03';
import objectRefSvc from 'js/hosting/hostObjectRefService';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import soaSvc from 'soa/kernel/soaService';
import adapterService from 'js/adapterService';
import dmSvc from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';

var exports = {};

/**
 * flag used to turn on trace level logging
 */
var _debug_logIssuesActivity = browserUtils.getWindowLocationAttributes().logIssuesActivity !== undefined;

/**
 * Get Revise Inputs for reviseObjects soa
 *
 * @param deepCopyData property name
 * @return A list of deep copy datas
 */
export let getReviseInputsJs = function( mselected ) {
    var deferred = AwPromiseService.instance.defer();
    var reviseInputsArray = [];
    var reviseInputsMap = new Map();
    var impactedItems = mselected;
    for( var i = 0; i < impactedItems.length; i++ ) {
        var reviseInputs = {};
        if( impactedItems[i].modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
            reviseInputs.item_revision_id = [ '' ];
        }
        reviseInputs.object_desc = [ '' ];
        reviseInputs.fnd0ContextProvider = [ appCtxSvc.ctx.pselected.uid ];

        var reviseInput = {};
        reviseInput.targetObject = impactedItems[ i ];
        reviseInput.reviseInputs = reviseInputs;
        reviseInputsArray.push( reviseInput );
        reviseInputsMap.set( impactedItems[ i ].uid, reviseInput );
    }

    var promise = self.setReviseInDeepCopyData( impactedItems, reviseInputsMap );
    if( promise ) {
        promise.then( function( response ) {
            deferred.resolve( response );
        } );
    }
    return deferred.promise;
};

/**
 * Set deep copy data in revise inputs
 *
 * @param impactedItems The impacted items
 * @param reviseInputsMap Map of impacted items to their reviseIn
 * @return A list of revise inputs with the deep copy datas
 */
self.setReviseInDeepCopyData = function( impactedItems, reviseInputsMap ) {
    var deferred = AwPromiseService.instance.defer();
    var deepCopyDataInputs = [];
    for( var i = 0; i < impactedItems.length; i++ ) {
        var dcd = {
            operation: 'Revise',
            businessObject: impactedItems[ i ]
        };
        deepCopyDataInputs.push( dcd );
    }

    var inputData = {
        deepCopyDataInput: deepCopyDataInputs
    };

    var deepCopyInfoMap = [];
    var promise = soaSvc.post( 'Core-2014-10-DataManagement', 'getDeepCopyData', inputData );
    if( promise ) {
        promise.then( function( response ) {
            if( response !== undefined ) {
                deepCopyInfoMap = response.deepCopyInfoMap;
                for( var i = 0; i < impactedItems.length; i++ ) {
                    for( var b in deepCopyInfoMap[ 0 ] ) {
                        if( deepCopyInfoMap[ 0 ][ b ].uid === impactedItems[ i ].uid ) {
                            var reviseIn = reviseInputsMap.get( deepCopyInfoMap[ 0 ][ b ].uid );
                            reviseIn.deepCopyDatas = self.convertDeepCopyData( deepCopyInfoMap[ 1 ][ b ] );
                            break;
                        }
                    }
                }
            }
            deferred.resolve( Array.from( reviseInputsMap.values() ) );
        } );
    }
    return deferred.promise;
};

/**
 * Convert Deep Copy Data from client to server format
 *
 * @param deepCopyData property name
 * @return A list of deep copy datas
 */
self.convertDeepCopyData = function( deepCopyData ) {
    var deepCopyDataList = [];
    for( var i = 0; i < deepCopyData.length; i++ ) {
        var newDeepCopyData = {};
        newDeepCopyData.attachedObject = deepCopyData[ i ].attachedObject;
        newDeepCopyData.copyAction = deepCopyData[ i ].propertyValuesMap.copyAction[ 0 ];
        newDeepCopyData.propertyName = deepCopyData[ i ].propertyValuesMap.propertyName[ 0 ];
        newDeepCopyData.propertyType = deepCopyData[ i ].propertyValuesMap.propertyType[ 0 ];

        var value = false;
        var tempStrValue = deepCopyData[ i ].propertyValuesMap.copy_relations[ 0 ];
        if( tempStrValue === '1' ) {
            value = true;
        }
        newDeepCopyData.copyRelations = value;

        value = false;
        tempStrValue = deepCopyData[ i ].propertyValuesMap.isTargetPrimary[ 0 ];
        if( tempStrValue === '1' ) {
            value = true;
        }
        newDeepCopyData.isTargetPrimary = value;

        value = false;
        tempStrValue = deepCopyData[ i ].propertyValuesMap.isRequired[ 0 ];
        if( tempStrValue === '1' ) {
            value = true;
        }
        newDeepCopyData.isRequired = value;

        newDeepCopyData.operationInputTypeName = deepCopyData[ i ].operationInputTypeName;

        var operationInputs = {};
        operationInputs = deepCopyData[ i ].operationInputs;
        newDeepCopyData.operationInputs = operationInputs;

        var aNewChildDeepCopyData = [];
        if( deepCopyData[ i ].childDeepCopyData && deepCopyData[ i ].childDeepCopyData.length > 0 ) {
            aNewChildDeepCopyData = self.convertDeepCopyData( deepCopyData[ i ].childDeepCopyData );
        }
        newDeepCopyData.childDeepCopyData = aNewChildDeepCopyData;
        deepCopyDataList.push( newDeepCopyData );
    }

    return deepCopyDataList;
};

export let getCreateInputObject = function( boName, propertyNameValues, compoundDeriveInput ) {
    return {
        boName: boName,
        propertyNameValues: propertyNameValues,
        compoundDeriveInput: compoundDeriveInput
    };
};

/**
 * Private method to create input for create item
 *
 * @param fullPropertyName property name
 * @param count current count
 * @param propertyNameTokens property name tokens
 * @param createInputMap create input map
 * @param operationInputViewModelObject view model object
 * @return {String} full property name
 */
export let addChildInputToParentMap = function( fullPropertyName, count, propertyNameTokens, createInputMap, vmProp ) {
    var propName = propertyNameTokens[ count ];
    var childFullPropertyName = fullPropertyName;
    if( count > 0 ) {
        childFullPropertyName += '__' + propName; //$NON-NLS-1$
    } else {
        childFullPropertyName += propName;
    }

    // Check if the child create input is already created
    var childCreateInput = _.get( createInputMap, childFullPropertyName );
    if( !childCreateInput && vmProp && vmProp.intermediateCompoundObjects ) {
        var compoundObject = _.get( vmProp.intermediateCompoundObjects, childFullPropertyName );
        if( compoundObject ) {
            // Get the parent create input
            var parentCreateInput = _.get( createInputMap, fullPropertyName );
            if( parentCreateInput ) {
                // Create the child create input
                // Add the child create input to parent create input
                childCreateInput = exports.getCreateInputObject( compoundObject.modelType.owningType, {}, {} );
                if( !parentCreateInput.compoundDeriveInput.hasOwnProperty( propName ) ) {
                    parentCreateInput.compoundDeriveInput[ propName ] = [];
                }
                parentCreateInput.compoundDeriveInput[ propName ].push( childCreateInput );

                createInputMap[ childFullPropertyName ] = childCreateInput;
            }
        }
    }
    return childFullPropertyName;
};

export let processPropertyForCreateInput = function( propName, vmProp, createInputMap ) {
    if( vmProp ) {
        var valueStrings = uwPropertyService.getValueStrings( vmProp );
        if( valueStrings && valueStrings.length > 0 ) {
            var propertyNameTokens = propName.split( '__' );
            var fullPropertyName = '';
            for( var i = 0; i < propertyNameTokens.length; i++ ) {
                if( i < propertyNameTokens.length - 1 ) {
                    // Handle child create inputs
                    fullPropertyName = exports.addChildInputToParentMap( fullPropertyName, i, propertyNameTokens,
                        createInputMap, vmProp );
                } else {
                    // Handle property
                    var createInput = createInputMap[ fullPropertyName ];
                    if( createInput ) {
                        var propertyNameValues = createInput.propertyNameValues;
                        _.set( propertyNameValues, propertyNameTokens[ i ], valueStrings );
                    }
                }
            }
        }
    }
};

/**
 * Get input data for object creation.
 *
 * @param {Object} data - the view model data object
 * @return {Object} create input
 */
export let getCreateInputFromDerivePanel = function( data ) {
    var createInputMap = {};
    createInputMap[ '' ] = exports.getCreateInputObject( data.objCreateInfo.createType, {}, {} );

    _.forEach( data.objCreateInfo.propNamesForCreate, function( propName ) {
        var vmProp = _.get( data, propName );
        if( vmProp && ( vmProp.isAutoAssignable || uwPropertyService.isModified( vmProp ) ) ) {
            exports.processPropertyForCreateInput( propName, vmProp, createInputMap );
        }
    } );

    var _fileInputForms = data.fileInputForms;
    if( !_fileInputForms ) {
        _fileInputForms = [];
    }

    _.forEach( data.customPanelInfo, function( customPanelVMData ) {
        // copy custom panel's fileInputForms
        var customFileInputForms = customPanelVMData.fileInputForms;
        if( customFileInputForms ) {
            _fileInputForms = _fileInputForms.concat( customFileInputForms );
        }

        // copy custom panel's properties
        var oriVMData = customPanelVMData._internal.origDeclViewModelJson.data;
        _.forEach( oriVMData, function( propVal, propName ) {
            if( _.has( customPanelVMData, propName ) ) {
                var vmProp = customPanelVMData[ propName ];
                exports.processPropertyForCreateInput( propName, vmProp, createInputMap );
            }
        } );
    } );

    return _.get( createInputMap, '' );
};

/**
 * Updating occmgmt context isChangeEnabled
 *
 * @param {string} changeToggleState true if change is enabled else false.
 */
export let updateCtxWithShowChangeValue = function( changeToggleState ) {
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.isChangeEnabled', changeToggleState === 'true' );
    appCtxSvc.updateCtx( 'isRedLineMode', changeToggleState );
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture',  'CHANGES_TOGGLE_CHANGE' );
    appCtxSvc.updatePartialCtx( 'showChange', changeToggleState === 'true' );
};

/**
 * Check version whether to call new SOA for derive or old SOA. New SOA was introduced in Tc12.3
 *
 * @function callNewSOAForDerive
 *
 */
export let callNewSOAForDerive = function() {
    if( appCtxSvc.ctx.tcSessionData && ( appCtxSvc.ctx.tcSessionData.tcMajorVersion >= 12 && appCtxSvc.ctx.tcSessionData.tcMinorVersion >= 3  || appCtxSvc.ctx.tcSessionData.tcMajorVersion >= 13  ) ) {
        return true;
    }
    return false;
};

/**
 * Add "No Change Context" List to values
 *
 * @param {Object} response - response of LOV SOA
 */
export let generateChangeContextList = function( data ) {
    var deferedLOV = AwPromiseService.instance.defer();

    data.dataProviders.changeContextLinkLOV.validateLOV = function() {
        // no op
    };

    lovService.getInitialValues( '', deferedLOV, appCtxSvc.ctx.userSession.props.cm0GlobalChangeContext,
        'Create', appCtxSvc.ctx.userSession, 100, 100, '', '' );

    /**
     * Process response when LOV 'getInitialValues' has been performed.
     */
    return deferedLOV.promise.then( function( response ) {
        if( response ) {
            var resource = 'ChangeMessages';
            var localTextBundle = localeSvc.getLoadedText( resource );
            var noChangecontextString = localTextBundle.noChangeContext;

            //Create an entry for "No Change Context"
            var noChangeContextEntry = JSON.parse( JSON.stringify( response[ 0 ] ) );
            noChangeContextEntry.propDisplayValue = noChangecontextString;
            noChangeContextEntry.propInternalValue = '';

            response.unshift( noChangeContextEntry );

            data.listofEcns = response;
        }
    }, function( response ) {
        var resource = 'ChangeMessages';
        var localTextBundle = localeSvc.getLoadedText( resource );
        var noChangecontextString = localTextBundle.noChangeContext;

        var noChangeContextEntry = {};
        noChangeContextEntry.propDisplayValue = noChangecontextString;
        noChangeContextEntry.propInternalValue = '';
        data.listofEcns = [];
        data.listofEcns.push( noChangeContextEntry );

        var msgObj = {
            msg: '',
            level: 0
        };

        if( response.cause.partialErrors.length > 0 ) {
            for( var x = 0; x < response.cause.partialErrors[ 0 ].errorValues.length; x++ ) {
                if( response.cause.partialErrors[ 0 ].errorValues[ x ].code !== 54060 ) {
                    msgObj.msg += response.cause.partialErrors[ 0 ].errorValues[ x ].message;
                    msgObj.msg += '<BR/>';
                    msgObj.level = _.max( [ msgObj.level, response.cause.partialErrors[ 0 ].errorValues[ x ].level ] );
                }
            }
        }
        if( msgObj.msg !== '' ) {
            messagingService.showError( msgObj.msg );
        }
    } );
};
/**
 * Honours CopyFromOriginal Property Constant
 * while populating create panel properties
 * on Derive Change
 *
 * @param {String} data - The view model data
 * @param {String} propToLoad - properties on create panel
 */
export let populateCreatePanelPropertiesOnDerive = function( data ) {
    var selectedChangeObjects = appCtxSvc.ctx.mselected;
    var propToLoad = data.objCreateInfo.propNamesForCreate;

    if( selectedChangeObjects === null || propToLoad === null ) {
        return;
    }
    var selectedChange = selectedChangeObjects[ 0 ];
    var selectedChangeObjRev = cdm.getObject( selectedChange.uid );
    var selectedChangeObjItemUid = selectedChangeObjRev.props.items_tag.dbValues[ 0 ];
    dmSvc.getProperties(  [ selectedChange.uid, selectedChangeObjItemUid ], propToLoad ).then( function() {
        for ( var propIndex in propToLoad ) {
            if ( propToLoad[propIndex] === '' || propToLoad[propIndex] === null ) {
                continue;
            }
            var viewModelProp = propToLoad[propIndex];
            var property = propToLoad[propIndex];
            var matched = property.indexOf( '__' );
            var propertyOnObjType = null;

            if ( matched > -1 ) {
                propertyOnObjType = property.substring( 0, matched );
                property = property.substring( matched + 2, property.length );
            }

            var objectToConsider = cdm.getObject( selectedChange.uid );
            if ( _.isUndefined( objectToConsider.props[property] ) ) {
                objectToConsider = cdm.getObject( selectedChangeObjItemUid );
                if( _.isUndefined( objectToConsider.props[property] ) ) {
                    continue;
                }
            }

            var isCopyTrue = isCopyFromOriginal( data, propertyOnObjType, property );
            if ( isCopyTrue === true &&
                ( data[viewModelProp].dbValue === null || data[viewModelProp].dbValue === '' || data[ viewModelProp ].dbValue === 0 || data[ viewModelProp ].dbValue.length === 0 || data[ viewModelProp ].dbValues[0] === null ) ) {
                        setValueOnCreatePanel( data, objectToConsider, property, viewModelProp );
            }
        }
    } );
};
/**
 * checks if CopyFromOriginal Property Constant
 * is set to true for the property of Object/related object
 * for the target object to be created
 *
 * @param {object} data - The view model data
 * @param {String} property - property of Object to be created
 * @param {String} propertyOnObjType - relation of object on which property resides
 */
function isCopyFromOriginal( data, propertyOnObjType, property ) {
    var typeName;
    if( propertyOnObjType !== null && propertyOnObjType === 'revision' ) {
        typeName = data.objCreateInfo.createType + 'Revision';
    } else {
        typeName = data.objCreateInfo.createType;
    }
    var objCreateModelType = cmm.getType( typeName );
    if( objCreateModelType === null ) {
        typeName += 'CreI';
        objCreateModelType = cmm.getType( typeName );
    }
    if( objCreateModelType === null ) {
        return false;
    }
    var propDescriptor = objCreateModelType.propertyDescriptorsMap[ property ];
    if( _.isUndefined( propDescriptor ) ) {
        return false;
    }
    var propConstantMap = propDescriptor.constantsMap;
    var isCopyFromOrigin = propConstantMap.copyFromOriginal;
    if( isCopyFromOrigin !== null && isCopyFromOrigin === '1' ) {
        return true;
    }
    return false;
}
var setDateValueForProp = function( vmoProp, dateVal ) {
    uwPropertyService.setValue( vmoProp, dateVal.getDate() );
    vmoProp.dateApi.dateObject = dateVal;
    vmoProp.dateApi.dateValue = dateTimeSvc.formatDate( dateVal, dateTimeSvc
        .getSessionDateFormat() );
    vmoProp.dateApi.timeValue = dateTimeSvc.formatTime( dateVal, dateTimeSvc
        .getSessionDateFormat() );
};
/**
 * gets value of property from source object
 * and sets it on the create panel for the object to be created
 *
 * @param {object} data - The view model data
 * @param {object} selectedChange - source change object
 * @param {String} property - property of Object to be created
 * @param {String} viewModelProp - view model property for the object
 */
function setValueOnCreatePanel( data, selectedChange, property, viewModelProp ) {
    var propertyVal = null;
    if( selectedChange !== null && !_.isUndefined( selectedChange.props[ property ].dbValue ) ) {
        propertyVal = selectedChange.props[ property ].dbValue;
    } else if( selectedChange !== null && !_.isUndefined( selectedChange.props[ property ].dbValues ) && propertyVal === null ) {
        propertyVal = selectedChange.props[ property ].dbValues[ 0 ];
    }
    if( _.isUndefined( data[ viewModelProp ] ) || propertyVal === null ) {
        return;
    }

    if ( data[viewModelProp].type === 'DATE' ) {
        var dateProp = data[viewModelProp];
        var date = new Date( propertyVal );
        setDateValueForProp( dateProp, date );
    }

    data[ viewModelProp ].dbValue = propertyVal;
    data[ viewModelProp ].valueUpdated = true;

    if( data[ viewModelProp ].hasLov === true ) {
        data[ viewModelProp ].dbValues = selectedChange.props[ property ].dbValues;
        data[ viewModelProp ].displayValues = selectedChange.props[ property ].displayValues;
        data[ viewModelProp ].uiValues = selectedChange.props[ property ].uiValues;
        data[ viewModelProp ].displayValsModel = selectedChange.props[ property ].displayValsModel;

        // Fix for defect LCS-683790, Multiselect LOV property uiValue and dbValue was not getting populated.
        // And for same reason was not showing in Derive Change panel correctly.
        if( data[ viewModelProp ].isArray === true ) {
            data[ viewModelProp ].dbValue = data[ viewModelProp ].dbValues;
            data[ viewModelProp ].uiValue = selectedChange.props[ property ].uiValues.join( ', ' );
        }
    }
}

export let sendEventToHost = function( data ) {
    if( appCtxSvc.getCtx( 'aw_hosting_enabled' ) ) {
        var createIssueFromVisMode = appCtxSvc.getCtx( 'CreateIssueHostedMode' );
        if( createIssueFromVisMode ) {
            if( _debug_logIssuesActivity ) {
                logger.info( 'hostIssues: ' + 'in sendEventToHost and CreateIssueHostedMode ctx exists.' );
            }
            eventBus.publish( 'changeObjectCreated', data );
        }

        var curHostedComponentId = appCtxSvc.getCtx( 'aw_hosting_state.currentHostedComponentId' );
        if( curHostedComponentId === 'com.siemens.splm.client.change.CreateChangeComponent' ) {
            if( data.createdChangeObject !== null ) {
                var uid = data.createdChangeObject.uid;
                var feedbackMessage = hostFeedbackSvc.createHostFeedbackRequestMsg();
                var objectRef = objectRefSvc.createBasicRefByModelObject( data.createdChangeObject );
                feedbackMessage.setFeedbackTarget( objectRef );
                feedbackMessage.setFeedbackString( 'ECN  Successfully created' );
                var feedbackProxy = hostFeedbackSvc.createHostFeedbackProxy();
                feedbackProxy.fireHostEvent( feedbackMessage );
            }
        }
    }
};

export let getAdaptedObjectsForSelectedObjects = function( selectedObjects ) {
    var adaptedObjects = adapterService.getAdaptedObjectsSync( selectedObjects );
    if( adaptedObjects !== null ) {
       return adaptedObjects;
    }

        return selectedObjects;
};

/**
 * This method sets the createInput fnd0contextProvider.
 * @param { Boolean } data: viewModel for create/Add panel
 */
export function updateChangeContextProviderForCreate( data ) {
    if( appCtxSvc.getCtx( 'pselected.changeContextProvider' ) !== undefined ) {
        let changeContextObjectUid = appCtxSvc.getCtx( 'pselected.changeContextProvider' );
        data.revision__fnd0ContextProvider.dbValue = changeContextObjectUid;
        data.revision__fnd0ContextProvider.dbValues = changeContextObjectUid;
    }
}
/**
 * Check the uid in extraAttachementWithRelations,
 * find the secondary object for the UID .Also
 * get the relation name.Pass this information , along with primary
 * derived object to relation info.
 *
 * @param {*} data
 */
export let getVisAttachmentData = function( data ) {
    var visAttachmentInfo = [];
    var currentCtx = appCtxSvc.ctx.CreateChangePanel;

    // FORMAT of extraAttachementWithRelations: QYUIxtYAG:CMHasProblemItem
    // i.e. uid:relationName
    var visExtraAttachs = currentCtx.extraAttachementWithRelations;
    var secondaryObjUids = data.attachmentsUids;
    var derivedChangeObj = cdm.getObject( data.derivedObjectUid );
    for ( var inx = 0; inx < secondaryObjUids.length; inx++ ) {
        if ( visExtraAttachs[secondaryObjUids[inx]] === null ) {
            continue;
        }
        var secondaryObjects = data.attachments;
        // check if secondary object uid is present in extraAttachementWithRelations
        // if yes, find the relation.
        for ( var ijx = 0; ijx < secondaryObjects.length; ijx++ ) {
            if ( secondaryObjects[ijx].uid === secondaryObjUids[inx] ) {
                var visRelation = visExtraAttachs[secondaryObjUids[inx]];
                if ( visRelation !== null ) {
                    var relationInfo = {
                        relationType: visRelation,
                        primaryObject: derivedChangeObj,
                        secondaryObject: secondaryObjects[ijx]
                    };
                    visAttachmentInfo.push( relationInfo );
                    break;
                }
            }
        }
    }
    return visAttachmentInfo;
};
/**
 * Populate Implements Section of Derive Panel
 * @param {*} selectedChangeObjects
 * @param {*} declViewModel
 */
export let populateImplementsSection = function( selectedChangeObjects, declViewModel ) {
    var currentCtx = appCtxSvc.ctx.CreateChangePanel;
            if( currentCtx.clientId !== '' ) {
                declViewModel.dataProviders.getImplements.update( selectedChangeObjects,
                    selectedChangeObjects.length );
            } else if ( declViewModel.attachments !== undefined && declViewModel.attachments !== null ) {
                    declViewModel.dataProviders.getImplements.update( declViewModel.attachments,
                        declViewModel.attachments.length );
                }
};
/**
 * Get Initial Change Types for Derive Panel
 * @param {*} initialTypes
 * @param {*} selectedChangeObjects
 */
export let getInitialChangeTypesForDerivePanel = function( initialTypes, selectedChangeObjects ) {
    var currentCtx = appCtxSvc.ctx.CreateChangePanel;
    // Default to specific Change Type for Derived Panel based on
    // input sent (exactTypeToCreate) from visualization
    if ( currentCtx.exactTypeToCreate !== '' && currentCtx.clientId !== '' ) {
        var allInitialTypes = selectedChangeObjects[0].props.cm0DerivableTypes.dbValues;
        for ( var inx = 0; inx < allInitialTypes.length; inx++ ) {
            var changeType = allInitialTypes[inx].substring( 0, allInitialTypes[inx].indexOf( '/' ) );
            if ( changeType === currentCtx.exactTypeToCreate ) {
                initialTypes.push( allInitialTypes[inx] );
                break;
            }
        }
    } else {
        initialTypes = selectedChangeObjects[0].props.cm0DerivableTypes.dbValues;
        for ( var k = 1; k < selectedChangeObjects.length; k++ ) {
            var derivableTypes = selectedChangeObjects[k].props.cm0DerivableTypes.dbValues;
            var commonTypes = _.intersection( initialTypes, derivableTypes );
            initialTypes = commonTypes;
        }
    }

    return initialTypes;
};
/**
 * populating dataToBeRelated for createRelateAndSubmitObjects SOA call input
 * @param {*} parentData
 * @param {*} data
 */
export let populateDataToBePopulated = function( parentData, data ) {
    var currentCtx = appCtxSvc.ctx.CreateChangePanel;
    // for Visualization use-cases where secondary objects are related with specific relations
    // dataToBeRelated will have relation name & secondaryobject uid
    // e.g. dataToBeRelated= {
    //  rel1:UID1
    //  rel2:UID2 }

    if ( currentCtx !== undefined && currentCtx.extraAttachementWithRelations !== undefined
        && Object.keys( currentCtx.extraAttachementWithRelations ).length !== 0 ) {
        var extraAttachments = currentCtx.extraAttachementWithRelations;
        var parentUids = parentData.attachmentsUids;
        data.dataToBeRelated = {};
        for ( var inx = 0; inx < parentUids.length; inx++ ) {
            var relation = extraAttachments[parentUids[inx]];
            var uids = [];
            if ( data.dataToBeRelated[relation] ) {
                uids = data.dataToBeRelated[relation];
            }

            uids.push( parentUids[inx] );
            data.dataToBeRelated[relation] = uids;
        }
    } else if ( parentData.attachmentsUids ) {
        data.dataToBeRelated = {
            '': parentData.attachmentsUids
        };
    }
};

/**
 * Get the supported SOA to get the change summary data based on tc server release.
 * If tc server is based on tc12 then we need to call old SOA else new SOA.
 * @param {Object} ctx App context object
 *
 * @returns { Object} Object with supported service name and operation name
 */
export let getSupportedChangeSummarySOA = function( ctx ) {
    if( !ctx || !ctx.tcSessionData || ctx.tcSessionData.tcMajorVersion < 13 ) {
        return {
            serviceName: 'Internal-CmAws-2018-12-Changes',
            operationName: 'getChangeSummaryData'
        };
    }
    return {
        serviceName: 'Internal-CmAws-2021-06-Changes',
        operationName: 'getChangeSummaryData2'
    };
};

/**
 * Get the input key value from additional data and return the correct value accordingly.
 * If AW server is based on tc13x, then to render change summary table we will be calling
 * getChangeSummaryData2 and this SOA returns all values in additionalData object and
 * right now it supports these keys isOddRow,hasChildren,isCompareRow, isAbsOccInContextParent.
 * Key isAbsOccInContextParent is used to render the changes for incontext only. This key will
 * be returned from server when platform version is tc13.2 or more. In olde release this key
 * value will not be returned.
 * If AW server is based on tc12x, then to render change summary table we will be calling
 * getChangeSummaryData and this SOA returns all values in dataObject object and
 * right now it supports these keys isOddRow,hasChildren,isCompareRow.
 *
 *
 * @param {Object} dataObject Data obejct that store all info returned from server
 * @param {String} keyName Key name that need to be fetched from additional data object
 * @param {boolean} isBooleanPropValue True/False based on that proeprty return value will be either
 *                  boolean or string.
 *
 * @param {Object} Object Property return value got from additional data
 */
export let getAdditionalDataValue = function( dataObject, keyName, isBooleanPropValue ) {
    if( dataObject && dataObject.additionalData && dataObject.additionalData[ keyName ] ) {
        var keyValues = dataObject.additionalData[ keyName ];
        if( keyValues && keyValues[ 0 ] ) {
            var propValue = keyValues[ 0 ];
            var returnPropValue = keyValues[ 0 ];
            if( isBooleanPropValue && propValue ) {
                returnPropValue = propValue.toLowerCase() === 'true';
            }
            return returnPropValue;
        }
    } else if( dataObject && dataObject.hasOwnProperty( keyName ) ) {
        return dataObject[ keyName ];
    }
    if( isBooleanPropValue ) {
        return false;
    }
    return null;
};

/**
 * Get the change summary soa input data.
 *
 * @param {TreeLoadInput} treeLoadInput - Input parameter load Tree-Table
 * @param {Object} ctx App context object
 * @param {UwDataProvider} dataProvider - The data provider for Change Summary Table.
 *
 * @return {Object} Input data to call SOA
 */
export let getChangeSummaryInputData = function( ctx, treeLoadInput, dataProvider ) {
    // getChangeSummaryData requires following input
    // 1. changeNoticeRevision - Selected ChangeNoticeRevision
    // 2. selectedRow - Selected Object from Change Summary table( In case of expanding parent )
    // 3. isOddRowSelected - Flag to indicate whether selected row is rendered as odd background color or even background color.
    //                       Based on this background color flag for child row is calculated on server.
    // 4. startIndex - StartIndex for next page. Change Summary table pagination at first level.
    // 5. pageSize - Number of objects should be returned per SOA call. Change Summary Table only support pagination at first level.
    var changeNoticeRevision =  appCtxSvc.getCtx( 'xrtSummaryContextObject' ).uid;

    var selectedRow = ''; // Selected row in case of expanding parent
    var isOddRowSelected = false; // if we are displaying change summary table first time ( not-expanding parent, isOddRowSelected is passed as false. )
    var isAbsOccInContextParent = false;
    if( treeLoadInput.parentNode.levelNdx > -1 ) {
        selectedRow = treeLoadInput.parentNode.uid;
        isOddRowSelected = treeLoadInput.parentNode.isOdd;
        isAbsOccInContextParent = treeLoadInput.parentNode.isAbsOccInContextParent;
    }

    // we can't reply on treeLoadInput.startIndexForNextPage to retrive next page of data. Change Summary table contains group of rows in case of replace.
    // So number of row displayed will be more than number of loaded solutions available in ChangeNoticeRevision.
    // And hence maintaining same variable on data provider which will provide index of net page.
    var isTopNode = treeLoadInput.parentNode.levelNdx === -1;
    var startIndexForNextPage = 0;
    if( isTopNode && dataProvider.startIndexForNextPage ) {
        startIndexForNextPage = dataProvider.startIndexForNextPage;
    }

    var inputData = {
        changeNoticeRevision: changeNoticeRevision,
        isOddRowSelected: isOddRowSelected,
        startIndex: startIndexForNextPage,
        pageSize: treeLoadInput.pageSize
    };

    if( ctx.tcSessionData && ctx.tcSessionData.tcMajorVersion >= 13 ) {
        inputData.inputObject = selectedRow;
    } else {
        inputData.selectedRow = selectedRow;
    }

    // Check if this is true then we need to pass AbsOcc in context info to SOA so that
    // server will send info only for incontext changes
    if( isAbsOccInContextParent ) {
        inputData.additionalData = {
            isAbsOccInContextParent : [ 'true' ]
        };
    }

    return inputData;
};

export let populateChangeContext = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var openedItemRevisionUid = appCtxSvc.ctx.aceActiveContext.context.openedElement.props.awb0UnderlyingObject.dbValues[ 0 ];
    var openedItemRevision = cdm.getObject( openedItemRevisionUid );
    var ecnForOpenedElementUid = openedItemRevision.props.cm0AuthoringChangeRevision.dbValues[ 0 ];

    if( appCtxSvc.ctx.aceActiveContext.context.supportedFeatures.Awb0RevisibleOccurrenceFeature && appCtxSvc.ctx.aceActiveContext.context.supportedFeatures.Awb0RevisibleOccurrenceFeature === true ) {
        ecnForOpenedElementUid = '';
        ecnForOpenedElementUid = appCtxSvc.ctx.userSession.props.cm0GlobalChangeContext.dbValue;
    }

    if( ecnForOpenedElementUid !== null && ecnForOpenedElementUid !== '' ) {
        dmSvc.getProperties( [ ecnForOpenedElementUid ], [ 'object_string' ] ).then( function() {
            var ecnVMO = cdm.getObject( ecnForOpenedElementUid );
            if( ecnVMO !== null && ecnVMO !== undefined ) {
                data.changeContextValue = {
                    type: 'OBJECT',
                    isNull: false,
                    uiValue: ecnVMO.props.object_string.dbValues[ 0 ],
                    dbValue: ecnForOpenedElementUid
                };
                appCtxSvc.ctx.ecnForOpenedElement = ecnVMO;
            }
            deferred.resolve();
        } );
    }

    return deferred.promise;
};
/**
 * Get logical value from string value
 * @param {*} stringValue
 */
export let isPropertyValueTrue = function( stringValue ) {
    return stringValue && stringValue !== '0' &&
        ( String( stringValue ).toLowerCase === 'true' || stringValue === '1' );
};

/**
 * Set an active ECN effectivity flag and reset the structure
 */
export let setRequestPrefAndResetStructure = function() {
    let viewKeys = [];
    if( appCtxSvc.ctx.splitView && appCtxSvc.ctx.splitView.mode ) {
        _.forEach( appCtxSvc.ctx.splitView.viewKeys, function( viewKey ) {
            viewKeys.push( viewKey );
        } );
    } else {
        viewKeys.push( 'aceActiveContext.context' );
    }
    _.forEach( viewKeys, function( viewKey ) {
        let contextObject = appCtxSvc.getCtx( viewKey );
        if( contextObject.supportedFeatures.Awb0RevisibleOccurrenceFeature ) {
            appCtxSvc.updatePartialCtx( viewKey + '.configContext', {
                r_uid: contextObject.productContextInfo.props.awb0CurrentRevRule.dbValues[ 0 ],
                startFreshNavigation: true
            } );
            appCtxSvc.updatePartialCtx( viewKey + '.transientRequestPref', {
                useActiveECNEff: true
            } );
        }
    } );
};

export default exports = {
    getReviseInputsJs,
    getCreateInputObject,
    addChildInputToParentMap,
    processPropertyForCreateInput,
    getCreateInputFromDerivePanel,
    updateCtxWithShowChangeValue,
    callNewSOAForDerive,
    generateChangeContextList,
    populateCreatePanelPropertiesOnDerive,
    sendEventToHost,
    getAdaptedObjectsForSelectedObjects,
    updateChangeContextProviderForCreate,
    getVisAttachmentData,
    populateImplementsSection,
    getInitialChangeTypesForDerivePanel,
    populateDataToBePopulated,
    getSupportedChangeSummarySOA,
    populateChangeContext,
    getAdditionalDataValue,
    getChangeSummaryInputData,
    isPropertyValueTrue,
    setRequestPrefAndResetStructure
};
/**
 * @member Cm1CreateChangeService
 * @memberof NgServices
 */
app.factory( 'changeMgmtUtils', () => exports );
