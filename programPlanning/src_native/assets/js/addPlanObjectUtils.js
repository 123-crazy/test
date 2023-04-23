// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/addPlanObjectUtils
 */
import _ from 'lodash';
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import dateTimeService from 'js/dateTimeService';
import soaSvc from 'soa/kernel/soaService';
import uwPropSrv from 'js/uwPropertyService';
import addObjectUtils from 'js/addObjectUtils';

var exports = {};

var _getCreateInputObject = function( boName, propertyNameValues, compoundCreateInput ) {
    return {
        boName: boName,
        propertyNameValues: propertyNameValues,
        compoundCreateInput: compoundCreateInput
    };
};

export let getNRObject = function( data ) {
   var nrPattern;
   if( data.preferredPattern && data.preferredPattern.length > 0 && data.preferredPattern[0] !== '' ) {
       nrPattern = data.preferredPattern[0];
   } else if( data.patterns && data.patterns.length > 0 ) {
       var isNRPatternString = _.isString( data.patterns[0] );
       if( isNRPatternString ) {
        nrPattern = data.patterns[0];
       } else {
           nrPattern = '';
       }
   }
   var timelineContext = appCtxSvc.getCtx( 'timelineContext' );
   timelineContext.timelineNRPattern = nrPattern;
   appCtxSvc.updateCtx( 'timelineContext', timelineContext );
};

let registerDisplayNames = function( pref, ObjectType ) {
    var planObjects = [];
    var prefMap = {};
    var planTypeDescInput = [];
    if( pref ) {
        for( var index = 0; index < pref.length; index++ ) {
            var splitString = pref[index].split( ':' );
            var type = String( splitString[0] );
            planObjects.push( splitString[0] );
            if( splitString[1] ) {
                prefMap[type] = splitString[1];
                planTypeDescInput.push( splitString[1] );
            }
        }

        var promise = soaSvc.ensureModelTypesLoaded( planTypeDescInput );
        if( promise ) {
            promise.then( function() {
                var objectDisplayNames = {};
                for( var index = 0; index < planTypeDescInput.length; index++ ) {
                    var typeNameType = cmm.getType( planTypeDescInput[index] );
                    objectDisplayNames[planTypeDescInput[index]] = typeNameType.displayName;
                }
                var timelineContext = appCtxSvc.getCtx( 'timelineContext' );
                if( ObjectType === 'Plan' ) {
                    timelineContext.planObjectDisplayNames = objectDisplayNames;
                } else {
                    timelineContext.eventObjectDisplayNames = objectDisplayNames;
                }
                appCtxSvc.updateCtx( 'timelineContext', timelineContext );
            } );
        }
        var timelineContext = appCtxSvc.getCtx( 'timelineContext' );
        if( ObjectType === 'Plan' ) {
            timelineContext.planQuickCreateObjects = planObjects;
        } else {
            timelineContext.eventQuickCreateObjects = planObjects;
        }
        appCtxSvc.updateCtx( 'timelineContext', timelineContext );
    }
};

export let checkPlanAndEventQuickPreference = function( data ) {
    let openedObj = appCtxSvc.ctx.locationContext.modelObject;
    if( openedObj && openedObj.modelType.typeHierarchyArray.indexOf( 'Prg0AbsPlan' ) < 0 ) {
        openedObj = appCtxSvc.ctx.selected;
    }
    let parentPlans = [];
    if( openedObj && openedObj.modelType.typeHierarchyArray.indexOf( 'Prg0AbsPlan' ) > -1 ) {
        parentPlans.push( openedObj.uid );
        while( openedObj && openedObj.props.prg0ParentPlan ) {
            let parentUid = openedObj.props.prg0ParentPlan.dbValues[0];
            if( parentUid ) {
                parentPlans.push( parentUid );
                openedObj = cdm.getObject( parentUid );
            }else{
                openedObj = null;
            }
        }
    }
    appCtxSvc.registerCtx( 'timelineContext', {
        selected: appCtxSvc.ctx.selected,
        timelineNRPattern: '',
        planObjectDisplayNames: {},
        eventObjectDisplayNames: {},
        childObj: [],
        planObjects: [],
        eventQuickCreateObjects: [],
        planQuickCreateObjects: [],
        isPsi0TemplateInstalled: '',
        parentPlansForOpenedObject: parentPlans
    } );
    registerDisplayNames( data.preferences.PP_Quick_Create_Plan_Types, 'Plan' );
    registerDisplayNames( data.preferences.PP_Quick_Create_Event_Types, 'Event' );
};

export let getBOName = function( pref ) {
    var prefMap = {};
    for ( var index = 0; index < pref.length; index++ ) {
        var splitString = pref[index].split( ':' );
        var type = String( splitString[0] );
        if( splitString[1] ) {
            prefMap[type] = splitString[1];
        }
    }
    var childObj = [];
    for ( var mapIndex in prefMap ) {
        if ( mapIndex === appCtxSvc.ctx.timelineContext.selected.type ) {
            childObj.push( mapIndex );
            childObj.push( prefMap[mapIndex] );
        }
    }
    var timelineContext = appCtxSvc.getCtx( 'timelineContext' );
    timelineContext.childObj = childObj;
    appCtxSvc.updateCtx( 'timelineContext', timelineContext );
    return childObj[1];
};

let createQuickCreateInput = function( data, type ) {
    var createInputMap = {};
    var childObj = [];
    var displayNames;
    if( type === 'Plan' ) {
        getBOName( data.preferences.PP_Quick_Create_Plan_Types );
        displayNames = appCtxSvc.ctx.timelineContext.planObjectDisplayNames;
    }else {
        getBOName( data.preferences.PP_Quick_Create_Event_Types );
        displayNames = appCtxSvc.ctx.timelineContext.eventObjectDisplayNames;
    }
    childObj = appCtxSvc.ctx.timelineContext.childObj;
    for( var mapIndex in displayNames ) {
        if ( mapIndex === childObj[1] ) {
            childObj.push( displayNames[mapIndex] );
        }
    }
    createInputMap[ '' ] = _getCreateInputObject( childObj[1], {}, {} );

    var objectInfo;
    if( type === 'Plan' ) {
        objectInfo = {
            createType: childObj[1],
            propNamesForCreate: [ 'prg0PlanId', 'object_name' ]
        };
        data.objCreateInfo = objectInfo;
        data.objCreateInfo.propNamesForCreate.push( 'prg0ParentPlan' );
    }else {
        objectInfo = {
            createType: childObj[1],
            propNamesForCreate: [ 'prg0EventId', 'object_name', 'prg0PlannedDate' ]
        };
        data.objCreateInfo = objectInfo;
        data.objCreateInfo.propNamesForCreate.push( 'prg0PlanObject' );
    }

    _.forEach( data.objCreateInfo.propNamesForCreate, function( propName ) {
        var valueStrings;
        if( propName === 'object_name' ) {
            if( childObj[0] === appCtxSvc.ctx.timelineContext.selected.type ) {
                valueStrings = [ childObj[2] ];
            }
        }
        if( propName === 'prg0PlanId' ) {
            valueStrings = [ data.prg0PlanId ];
        }
        if( propName === 'prg0EventId' ) {
            valueStrings = [ data.prg0EventId ];
        }
        if( propName === 'prg0PlannedDate' ) {
            var currentdate = new Date();
            var formattedCurrentDate = dateTimeService.formatUTC( currentdate );
            valueStrings = [ formattedCurrentDate ];
        }
        if( propName === 'prg0ParentPlan' ) {
            valueStrings = [ appCtxSvc.ctx.timelineContext.selected.uid ];
        }
        if( propName === 'prg0PlanObject' ) {
            valueStrings = [ appCtxSvc.ctx.timelineContext.selected.uid ];
        }
        var fullPropertyName = '';
        var createInput = createInputMap[fullPropertyName];
        if ( createInput ) {
            var propertyNameValues = createInput.propertyNameValues;
            _.set( propertyNameValues, propName, valueStrings );
        }
    } );

    return createInputMap;
};
export let getCreateInputQuickEvent = function( data ) {
    var createInputMap = createQuickCreateInput( data, 'Event' );
    return [ {
        clientId: 'CreateObject',
        createData: _.get( createInputMap, '' ),
        dataToBeRelated: {},
        workflowData: {},
        targetObject: null,
        pasteProp: ''
    } ];
};

export let getCreateInputQuickPlan = function( data ) {
    var createInputMap = createQuickCreateInput( data, 'Plan' );

    return [ {
        clientId: 'CreateObject',
        createData: _.get( createInputMap, '' ),
        dataToBeRelated: {},
        workflowData: {},
        targetObject: null,
        pasteProp: ''
    } ];
};

/**
 * Get input data for object creation.
 *
 * @param {Object} data the view model data object
 */
export let getCreateInput = function( data ) {
    var createInputMap = {};
    createInputMap[ '' ] = _getCreateInputObject( data.objCreateInfo.createType, {}, {} );
    let createInput = addObjectUtils.getCreateInput(data);
    let propName = null;
    if( appCtxSvc.ctx.programPlanningContext.parentName === 'Prg0AbsEvent' ) {
        propName = 'prg0PlanObject';
    }
    if( appCtxSvc.ctx.programPlanningContext.parentName === 'Prg0AbsPlan') {
        propName = "prg0ParentPlan";
    }
    if( appCtxSvc.ctx.programPlanningContext.parentName === 'Prg0AbsCriteria' ) {
        if( appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Timeline' || appCtxSvc.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Timeline' ) {
            data.targetObject = appCtxSvc.ctx.programPlanningContext.parent;
        } else {
            data.targetObject = appCtxSvc.ctx.xrtSummaryContextObject;
        }
        propName = 'prg0EventObject';
    }

    var vmProp = _.get( data, propName );
    if( vmProp && ( vmProp.isAutoAssignable || uwPropSrv.isModified( vmProp ) ) ||
        propName === 'prg0ParentPlan' || propName === 'prg0PlanObject' ||
        propName === 'prg0EventObject' ) {
        var valueStrings = uwPropSrv.getValueStrings( vmProp );
        createInput[0].createData.propertyNameValues[propName] = valueStrings;
    }
   
    return createInput;
};

/**
 * Private method to create input for create item
 *
 * @param fullPropertyName property name
 * @param count current count
 * @param propertyNameTokens property name tokens
 * @param createInputMap create input map
 * @param operationInputViewModelObject view model object
 * @return String full property name
 */
var _addChildInputToParentMap = function( fullPropertyName, count, propertyNameTokens, createInputMap,
    vmProp ) {
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
                childCreateInput = _getCreateInputObject( compoundObject.modelType.owningType, {}, {} );
                if( !parentCreateInput.compoundCreateInput.hasOwnProperty( propName ) ) {
                    parentCreateInput.compoundCreateInput[ propName ] = [];
                }
                parentCreateInput.compoundCreateInput[ propName ].push( childCreateInput );

                createInputMap[ childFullPropertyName ] = childCreateInput;
            }
        }
    }
    return childFullPropertyName;
};

/**
 * Get created object. Return ItemRev if the creation type is Item.
 *
 * @param {Object} response the response of createRelateAndSubmitObjects SOA call
 */
export let getCreatedObject = function( response ) {
    if( response.output.length > 0 && response.output[ 0 ].objects ) {
        var created = response.output[ 0 ].objects[ 0 ];
        if( created.modelType.typeHierarchyArray.indexOf( 'Item' ) > -1 &&
            response.output[ 0 ].objects.length >= 3 ) {
            created = response.output[ 0 ].objects[ 2 ];
        }

        return created;
    }
};

/**
 * Get projects
 *
 * @param {Object} response the response of getProperties SOA call
 */
export let getProjects = function( response ) {
    var projects = _.values( response.modelObjects );
    projects = _.filter( projects, function( o ) {
        return o.type === 'TC_Project';
    } );
    return projects;
};

/**
 * It prepares the parameters for failure message in case of multi-selection
 *
 * @param {Object} data - View model data object
 */
export let getParamsForMultipleDeleteFailureMsg = function( data ) {
    var successCount = 0;
    if( !_.isEmpty( data.deletedObjectUids ) ) {
        successCount = data.deletedObjectUids.length;
    }
    var totalCount = successCount;
    if( !_.isEmpty( data.deleteObjectsPartialErrors ) ) {
        totalCount += data.deleteObjectsPartialErrors.length;
    }
    return {
        successCount: successCount,
        totalCount: totalCount,
        partialErrors: data.deleteObjectsPartialErrors
    };
};

export default exports = {
    getParamsForMultipleDeleteFailureMsg,
    getCreateInput,
    getCreatedObject,
    getProjects,
    getCreateInputQuickPlan,
    getCreateInputQuickEvent,
    checkPlanAndEventQuickPreference,
    getNRObject,
    getBOName
};
app.factory( 'addPlanObjectUtils', () => exports );
