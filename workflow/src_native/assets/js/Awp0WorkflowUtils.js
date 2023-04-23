// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Awp0WorkflowUtils
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import policySvc from 'soa/kernel/propertyPolicyService';
import soaService from 'soa/kernel/soaService';
import listBoxService from 'js/listBoxService';
import parsingUtils from 'js/parsingUtils';
import eventBus from 'js/eventBus';
import iconSvc from 'js/iconService';
import _ from 'lodash';

/**
 * Define public API
 */
var exports = {};

var getInitialLOVValueDeferred;

/**
 * Create the input stricture that will be pass to server to get the
 * group member from user obejct.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Array} selection - The selection object array
 *
 * @return {Object} - userInput object that holds the correct values .
 */
var getInputData = function( data, selection ) {
    var userInput = {};
    var input = {};

    // Check if selection is not null and 0th index object is also not null
    // then only add it to the view model
    if( data && selection && selection.length > 0 ) {
        var userId = selection[ 0 ].props.user_id.dbValues[ 0 ];
        var groupName;
        var roleName;

        if( data.additionalSearchCriteria ) {
            if( data.additionalSearchCriteria.group && data.additionalSearchCriteria.role ) {
                groupName = data.additionalSearchCriteria.group;
                roleName = data.additionalSearchCriteria.role;
            } else if( !data.additionalSearchCriteria.group && data.additionalSearchCriteria.role ) {
                groupName = '*';
                roleName = data.additionalSearchCriteria.role;
            } else if( data.additionalSearchCriteria.group && !data.additionalSearchCriteria.role ) {
                groupName = data.additionalSearchCriteria.group;
                roleName = '*';
            } else {
                groupName = selection[ 0 ].props.default_group.uiValue;
            }
        } else {
            groupName = selection[ 0 ].props.default_group.uiValue;
        }

        // Check if object is selected then only create the input structure
        if( selection[ 0 ].selected ) {
            input = {
                userID: userId,
                userName: userId,
                groupName: groupName,
                roleName: roleName,
                includeInactive: false,
                includeSubGroups: true
            };
        }
    }
    userInput.input = input;
    return userInput;
};

/**
 * Get the valid selected obejct from input selected objects. If input selection
 * has user obejct then it will get group memebr from user otherwise directly return input.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Array} selection - The selection object array
 *
 * @return {Object} - userInput object that holds the correct values .
 */
export let getValidObjectsToAdd = function( data, selection ) {
    var deferred = AwPromiseService.instance.defer();
    if( selection[ 0 ] && selection[ 0 ].type && selection[ 0 ].type === 'User' ) {
        var input = getInputData( data, selection );
        var policyId = policySvc.register( {
            types: [ {
                    name: 'User',
                    properties: [ {
                        name: 'user_id',
                        modifiers: [ {
                            name: 'withProperties',
                            Value: 'true'
                        } ]
                    } ]
                },
                {
                    name: 'GroupMember',
                    properties: [ {
                        name: 'default_role'
                    } ]
                }
            ]
        } );
        soaService.postUnchecked( 'Internal-Administration-2012-10-OrganizationManagement',
            'getOrganizationGroupMembers', input ).then(
            function( response ) {
                if( policyId ) {
                    policySvc.unregister( policyId );
                }
                var gmObject = null;
                if( response && response.groupElementMap && response.groupElementMap[ 1 ][ '0' ] ) {
                    //check for default_role property on returned groupmembers
                    var groupMembers = response.groupElementMap[ 1 ][ '0' ].members;
                    var foundDefaultRole = false;

                    for( var i = 0; i < groupMembers.length; i++ ) {
                        var propValue = groupMembers[ i ].members[ 0 ].props.default_role;
                        if( propValue.dbValues[ 0 ] === '1' ) {
                            gmObject = groupMembers[ i ].members[ 0 ];
                            foundDefaultRole = true;
                            break;
                        }
                    }
                    if( !foundDefaultRole ) {
                        gmObject = response.groupElementMap[ 1 ][ '0' ].members[ '0' ].members[ '0' ];
                    }
                }

                // If valid group member is not found then return empty array from here
                if( !gmObject ) {
                    return deferred.resolve( [] );
                }

                // Add cellHeaders to GM
                var gmVMObject = viewModelObjectService.createViewModelObject( gmObject );
                gmVMObject.selected = true;
                gmVMObject.cellHeader1 = selection[ 0 ].cellHeader1;
                var groupMemberObjects = [];
                groupMemberObjects.push( gmVMObject );
                return deferred.resolve( groupMemberObjects );
            } );
    } else {
        deferred.resolve( selection );
    }
    return deferred.promise;
};

/**
 * Check if isVersion supported o rnot.
 *
 * @returns {boolean} True/False
 */
var _isVersionSupported = function() {
    if( appCtxSvc.ctx && appCtxSvc.ctx.workflow && appCtxSvc.ctx.workflow.isVersionSupported ) {
        return true;
    }
    return false;
};

var _isDefaultLOVValueExist = function( data, filterContent, prop ) {
    if( !data.isFnd0ParticipantEligibility || !_isVersionSupported() ) {
        return true;
    }
    var participantGroupRoleMap = null;
    if( appCtxSvc.ctx.workflow && appCtxSvc.ctx.workflow.participantGroupRoleMap ) {
        participantGroupRoleMap = appCtxSvc.ctx.workflow.participantGroupRoleMap;
    }
    if( !filterContent || !prop ) {
        return false;
    }
    if( participantGroupRoleMap && !_.isEmpty( participantGroupRoleMap ) ) {
        if( participantGroupRoleMap[ filterContent ] && participantGroupRoleMap[ filterContent ] === prop.propertyName ) {
            return true;
        }

        var splitGroupString = filterContent.split( '.' );
        if( splitGroupString && splitGroupString.length > 0 && splitGroupString[ splitGroupString.length - 1] ) {
            var topGroupname = splitGroupString[ splitGroupString.length - 1];
            if( topGroupname && participantGroupRoleMap[ topGroupname ]  && participantGroupRoleMap[ topGroupname ] === prop.propertyName ) {
                return true;
            }
        }
    }
    return false;
};

/**
 * Based on latest selection from group or role check if previous value is valid for new valid values then
 * return that value as it's still valid for new selection. If that is not valid then get the 0thindex value
 * from new array and return that.
 *
 * @param {Array} selectedLovEntries Previous selected LOV entry array
 * @param {Array} lovEntries Latest group or role LOV values array
 *
 * @returns {Object} LOV entry that need to be pre select.
 */
var _getValidPreSelectLOV = function( selectedLovEntries, lovEntries ) {
    if( ( !selectedLovEntries || !selectedLovEntries[ 0 ] ) && lovEntries && lovEntries[ 0 ] ) {
        return lovEntries[ 0 ];
    }
    var oldSelValue = null;
    if( selectedLovEntries && selectedLovEntries[ 0 ] ) {
        oldSelValue = selectedLovEntries[ 0 ];
    }
    // Check if previous selected value is not null and present if new LOV entries then return
    // that value
    if( oldSelValue && oldSelValue.propInternalValue && lovEntries && lovEntries.length > 0 ) {
        var previousSelUid = oldSelValue.propInternalValue.uid;
        var preselectLOV = _.find( lovEntries, function( lovEntry ) {
            return  lovEntry.propInternalValue && previousSelUid === lovEntry.propInternalValue.uid;
        } );
        return preselectLOV;
    }
    return null;
};

/**
 * This operation is invoked to query the data for a property having an LOV attachment. The results returned
 * from the server also take into consideration any filter string that is in the input. This method calls
 * 'getInitialLOVValues' and returns initial set of lov values.
 *
 * @param {filterString} filterString - The filter text for lov's
 * @param {deferred} deferred - $q object to resolve the 'promise' with a an array of LOVEntry objects.
 * @param {ViewModelProperty} prop - Property to aceess LOV values for.
 * @param {Object} prop Property object
 * @param {String} filterContent Filter content string
 * @param {String} defaultString To be populate on group or role LOV
 * @param {String} filterStr Filter string
 */
var getInitialLOVValues = function( data, deferred, prop, filterContent, defaultString, filterStr ) {
    if( !getInitialLOVValueDeferred ) {
        getInitialLOVValueDeferred = deferred;

        var lovValues = [];
        exports.performRoleSearchByGroup( prop, 0, filterContent, filterStr ).then( function( validObjects ) {
            if( validObjects ) {
                if( _isDefaultLOVValueExist( data, filterContent, prop ) ) {
                    lovValues = listBoxService.createListModelObjectsFromStrings( [ defaultString ] );
                }
                // Create the list model object that will be displayed
                Array.prototype.push.apply( lovValues, validObjects );
                if( prop && prop.preSelected ) {
                    prop.preSelected = false;
                    var preSelectLOV = _getValidPreSelectLOV( prop.selectedLovEntries, lovValues );
                    // Check if previous selected LOV is not valid for new criteria and lov entries are present
                    // then use the 0th index lov value to preselect.
                    if( !preSelectLOV && lovValues[ 0 ] ) {
                        preSelectLOV = lovValues[ 0 ];
                    }
                    if( preSelectLOV ) {
                        prop.dbValue = preSelectLOV.propInternalValue;
                        prop.dbOriginalValue = preSelectLOV.propInternalValue;
                        prop.uiValue = preSelectLOV.propDisplayValue;
                        prop.selectedLovEntries.propInternalValue = preSelectLOV.propInternalValue;
                        prop.selectedLovEntries.propDisplayValue = preSelectLOV.propDisplayValue;
                        prop.value = preSelectLOV.propDisplayValue;
                        var additionalCriteria = prop.uiValue;
                        if( prop.dbValue && !prop.dbValue.uid ) {
                            additionalCriteria = null;
                        }
                        if( prop.propertyName === 'allRoles' ) {
                            data.additionalSearchCriteria.role = additionalCriteria;
                            data.roleName = prop.uiValue;
                            prop.error = null;
                        } else {
                            data.additionalSearchCriteria.group = additionalCriteria;
                            data.groupName = prop.uiValue;
                            prop.error = null;
                        }
                    }

                    eventBus.publish( 'awPopupWidget.close', {
                        propObject: prop
                    } );
                }
            }
            deferred.resolve( lovValues );
            getInitialLOVValueDeferred = null;
        }, function( reason ) {
            deferred.reject( reason );
            getInitialLOVValueDeferred = null;
        } );
    }
};

/**
 * Generate the next LOV values when user is doing pagination in LOV.
 * @param {deferred} deferred - $q object to resolve the 'promise' with a an array of LOVEntry objects.
 * @param {Object} prop Property object
 * @param {String} filterContent Filter content string
 */
var getNextLOVValues = function( deferred, prop, filterContent ) {
    var lovEntries = [];

    // Check if more values exist then only call SOA.
    if( prop.moreValuesExist ) {
        var startIdx = prop.endIndex;
        exports.performRoleSearchByGroup( prop, startIdx, filterContent, null ).then( function( validObjects ) {
            lovEntries = validObjects;
            deferred.resolve( lovEntries );
        } );
    } else {
        deferred.resolve( lovEntries );
    }
    return deferred.promise;
};

/**
 * Populate the group LOV values.
 *
 * @param {Object} data Data view model object
 * @param {Object} prop Property object
 */
export let populateGroupLOV = function( data, prop ) {
    var parentData = data;
    prop.lovApi = {};

    prop.contentType = 'Group';
    //change the contentType to get only the eligible group from the data provider if eligibilty constatnt is true
    if( data.isFnd0ParticipantEligibility && _isVersionSupported() ) {
        prop.contentType = 'ParticipantEligibilityGroup';
    }
    // This is needed to remove the first empty entry fromn LOV values
    prop.emptyLOVEntry = false;
    prop.lovApi.getInitialValues = function( filterStr, deferred ) {
        getInitialLOVValues( data, deferred, prop, data.roleName, data.i18n.allGroups, filterStr );
    };

    prop.lovApi.getNextValues = function( deferred ) {
        getNextLOVValues( deferred, prop, data.roleName, null );
    };

    prop.lovApi.validateLOVValueSelections = function( lovEntries ) {
        //validate if we are selecting the same group as searched already and also checked the version as TC13.1
        if( parentData.isFnd0ParticipantEligibility && parentData.groupName && _isVersionSupported() ) {
            var groupName = '';
            if( lovEntries[ 0 ].propInternalValue.uid ) {
                 groupName = lovEntries[ 0 ].propInternalValue.props.object_full_name.dbValues[ 0 ];
            } else {
                groupName = lovEntries[ 0 ].propInternalValue;
            }
            if( groupName ===  parentData.groupName ) {
                eventBus.publish( 'awPopupWidget.close', {
                    propObject: prop
                } );
                return;
            }
        }
        parentData.groupName = null;
        if( lovEntries[ 0 ].propInternalValue.uid ) {
            parentData.groupName = lovEntries[ 0 ].propInternalValue.props.object_full_name.dbValues[ 0 ];
        } else if( lovEntries[ 0 ].propInternalValue !== data.i18n.allGroups ) {
            // This is needed when user entered some wrong value which is not present
            // then set to default all groups
            prop.dbValue = data.i18n.allGroups;
            prop.uiValue = data.i18n.allGroups;
        }
        if( parentData.additionalSearchCriteria ) {
            parentData.additionalSearchCriteria.group = parentData.groupName;
        }
         //if user does not select anything from the lov than avoid taking this path
         if( data.isFnd0ParticipantEligibility && parentData.groupName && _isVersionSupported() ) {
            var deferred = AwPromiseService.instance.defer();
            var prop = data.allRoles;
            prop.contentType = 'ParticipantEligibilityRole';
            prop.preSelected = true;
            getInitialLOVValues( data, deferred, prop, data.groupName, data.i18n.allRoles, '' );
            return;
        }
        eventBus.publish( 'awPopupWidget.close', {
            propObject: prop
        } );
    };
};

/**
 * Populate the role LOV values.
 *
 * @param {Object} data Data view model object
 * @param {Object} prop Property object
 */
export let populateRoleLOV = function( data, prop ) {
    var parentData = data;
    prop.contentType = 'Role';
    prop.lovApi = {};
    //change the contentType to get only the eligible group from the data provider if eligibilty constant is true
    if( data.isFnd0ParticipantEligibility && _isVersionSupported() ) {
        prop.contentType = 'ParticipantEligibilityRole';
    }
    // Check if searchSubGroup present on data that means we need
    // to search role inside sub group
    if( data.searchSubGroup ) {
        prop.searchSubGroup = true;
    }

    // This is needed to remove the first empty entry fromn LOV values
    prop.emptyLOVEntry = false;
    prop.lovApi.getInitialValues = function( filterStr, deferred ) {
        getInitialLOVValues( data, deferred, prop, data.groupName, data.i18n.allRoles, filterStr );
    };

    prop.lovApi.getNextValues = function( deferred ) {
        getNextLOVValues( deferred, prop, data.groupName, null );
    };

    prop.lovApi.validateLOVValueSelections = function( lovEntries ) {
        //validate if we are selecting the same role as searched already and also checked the version as TC13.1
        if( parentData.isFnd0ParticipantEligibility && parentData.roleName && _isVersionSupported() ) {
            var roleName = '';
            if( lovEntries[ 0 ].propInternalValue.uid ) {
                roleName = lovEntries[ 0 ].propInternalValue.props.role_name.dbValues[ 0 ];
            } else {
                roleName = lovEntries[ 0 ].propInternalValue;
            }
            if( roleName ===  parentData.roleName ) {
                eventBus.publish( 'awPopupWidget.close', {
                    propObject: prop
                } );
                return;
            }
        }
        parentData.roleName = null;
        if( lovEntries[ 0 ].propInternalValue.uid ) {
            parentData.roleName = lovEntries[ 0 ].propInternalValue.props.role_name.dbValues[ 0 ];
        } else if( lovEntries[ 0 ].propInternalValue !== data.i18n.allRoles ) {
            // This is needed when user entered some wrong value which is not present
            // then set to default all roles
            prop.dbValue = data.i18n.allRoles;
            prop.uiValue = data.i18n.allRoles;
        }
        if( parentData.additionalSearchCriteria ) {
            parentData.additionalSearchCriteria.role = parentData.roleName;
        }
        //if user does not select anything from the lov than avoid taking this path
        if( data.isFnd0ParticipantEligibility && parentData.roleName && _isVersionSupported() ) {
            var deferred = AwPromiseService.instance.defer();
            var prop = data.allGroups;
            prop.contentType = 'ParticipantEligibilityGroup';
            prop.preSelected = true;
            getInitialLOVValues( data, deferred, prop, data.roleName, data.i18n.allGroups, '' );
            return;
        }
        eventBus.publish( 'awPopupWidget.close', {
            propObject: prop
        } );
    };
};

/**
 * Get the group or role content based on input values and created LOV entries and return.
 *
 * @param {Object} prop Property obejct whose properties needs to be populated
 * @param {int} startIndex Start index value
 * @param {Object} filterContent Filter content object that can be filter group or role
 * @param {Object} filterStr Filter string to filter group or role. This is when user is tryong on LOV
 *
 * @returns {Promise} Promise object
 */
export let performRoleSearchByGroup = function( prop, startIndex, filterContent, filterStr ) {
    var deferred = AwPromiseService.instance.defer();
    var contentType = prop.contentType;
    var searchCriteria = {
        resourceProviderContentType: contentType
    };

    if( contentType === 'ParticipantEligibilityGroup' || contentType === 'Group' && filterContent ) {
        searchCriteria.role = filterContent;
    } else if( contentType === 'ParticipantEligibilityRole' || contentType === 'Role' && filterContent ) {
        searchCriteria.group = filterContent;
    }

    if( filterStr ) {
        searchCriteria.searchString = filterStr;
    }

    // Check if sub group need to be search. Pass that value to server
    if( prop.searchSubGroup ) {
        searchCriteria.searchSubGroup = 'true';
    }

    // By default resource provider will be Awp0ResourceProvider if other resource provider exist in
    // ctx then it will use that
    var resourceProvider = 'Awp0ResourceProvider';
    if( appCtxSvc.ctx.workflow && appCtxSvc.ctx.workflow.resourceProvider ) {
        resourceProvider = appCtxSvc.ctx.workflow.resourceProvider;
    }
    searchCriteria.participantType = '';
    // Get the participant type from context that need to be populated
    if( appCtxSvc.ctx.workflow && appCtxSvc.ctx.workflow.participantGroupRole && appCtxSvc.ctx.workflow.participantType ) {
        searchCriteria.participantType = appCtxSvc.ctx.workflow.participantType;
    }
    var inputData = {
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: ''
        },
        inflateProperties: false,
        saveColumnConfigData: {},
        searchInput: {
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: resourceProvider,
            searchCriteria: searchCriteria,
            cursor: {
                startIndex: startIndex,
                endReached: false,
                startReached: false,
                endIndex: 0
            },
            searchSortCriteria: [],
            searchFilterFieldSortType: 'Alphabetical'
        }
    };

    // SOA call made to get the content
    soaService.post( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', inputData ).then( function( response ) {
        var lovEntries = [];
        var modelObjects = [];

        if( response.searchResultsJSON ) {
            var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
            if( searchResults ) {
                for( var i = 0; i < searchResults.objects.length; i++ ) {
                    var uid = searchResults.objects[ i ].uid;
                    var obj = response.ServiceData.modelObjects[ uid ];
                    modelObjects.push( obj );
                }
            }
            if( modelObjects ) {
                // Create the list model object that will be displayed
                var groups = listBoxService.createListModelObjects( modelObjects, 'props.object_string' );
                Array.prototype.push.apply( lovEntries, groups );
            }
        }

        // Populate the end index and more values present or not
        var endIndex = response.cursor.endIndex;
        var moreValuesExist = !response.cursor.endReached;
        if( endIndex > 0 && moreValuesExist ) {
            endIndex += 1;
        }
        prop.endIndex = endIndex;
        prop.moreValuesExist = moreValuesExist;
        deferred.resolve( lovEntries );
    } );

    return deferred.promise;
};

/**
 *
 * @param {String} iconPathArr path of the icon
 * @returns {String} name of the icon
 */
var getIconNameFromPath = function( iconPathArr ) {
    var iconPath = _.split( iconPathArr, '/' );
    var iconName = '';
    if( iconPath.length > 2 && iconPath[ iconPath.length - 1 ] ) {
        iconName = iconPath[ iconPath.length - 1 ];
    }
    return iconName;
};

var getFinishNodeCategory = function( stateValue ) {
    var category = 'EPM_pending';
    switch ( stateValue ) {
        case 2:
        case 4: {
            category = 'EPM_pending';
            break;
        }
        case 8: {
            category = 'EPM_completed';
            break;
        }
        case 16:
        case 128: {
            category = 'EPM_suspended';
            break;
        }
        case 32: {
            category = 'EPM_aborted';
            break;
        }
        case 64: {
            category = 'EPM_failed';
            break;
        }
        default:
            category = 'EPM_unassigned';
    }
    if( stateValue > 128 ) {
        category = 'EPM_suspended';
    }

    return category;
};

/**
 * Get the start or finish node category
 * @param {String} nodeType Node type string
 * @param {int} stateValue State int value
 *
 * @returns {String} Node type category
 */
export let getStartFinishNodeCategory = function( nodeType, stateValueProp ) {
    var category = 'EPM_completed';
    var stateValue = parseInt( stateValueProp );
    if( nodeType === 'start' ) {
        if( stateValue === 32 ) {
            category = 'EPM_aborted';
        } else if( stateValue === 2 ) {
            category = 'EPM_pending';
        }
    } else if( nodeType === 'finish' ) {
        category = getFinishNodeCategory( stateValue );
    }
    return category;
};

/**
 * Get the icon string url for input object and return.
 *
 * @param {Object} nodeObject Node object for which icon need to be fetched.
 * @param {Object} taskTypeString Task type string for icon need to be fetched
 *
 * @returns {String} Image Url string for input node object
 */
export let getTaskFlowBasedIcon = function( nodeObject, taskTypeString ) {
    var iconFileName = '';
    var taskType = null;
    // Check if node object is not null then get the type from that else use the input type string
    // to get the correct icon
    if( nodeObject ) {
        taskType = nodeObject.type;
    } else if( !nodeObject && taskTypeString ) {
        taskType = taskTypeString;
    }

    var taskTypesArray = [
        { name: 'EPMDoTask', iconFileName: 'typeFlowDoTask48.svg'  },
        { name: 'EPMDoTaskTemplate',  iconFileName: 'typeFlowDoTask48.svg' },
        { name: 'EPMConditionTask', iconFileName : 'typeFlowConditionTask48.svg' },
        { name: 'EPMConditionTaskTemplate',  iconFileName: 'typeFlowConditionTask48.svg' },
        { name: 'EPMRouteTask', iconFileName: 'typeFlowRouteTask48.svg' },
        { name: 'EPMRouteTaskTemplate', iconFileName : 'typeFlowRouteTask48.svg' },
        { name: 'EPMReviewTask', iconFileName: 'typeFlowReviewTask48.svg' },
        { name: 'EPMReviewTaskTemplate', iconFileName: 'typeFlowReviewTask48.svg' },
        { name: 'EPMAcknowledgeTask', iconFileName: 'typeFlowAcknowledgeTask48.svg' },
        { name: 'EPMAcknowledgeTaskTemplate', iconFileName: 'typeFlowAcknowledgeTask48.svg' },
        { name: 'EPMAddStatusTask', iconFileName : 'typeFlowAddStatusTask48.svg' },
        { name: 'EPMAddStatusTaskTemplate', iconFileName: 'typeFlowAddStatusTask48.svg' },
        { name: 'EPMValidateTask', iconFileName: 'typeFlowValidateTask48.svg' },
        { name: 'EPMValidateTaskTemplate', iconFileName : 'typeFlowValidateTask48.svg' },
        { name: 'EPMOrTask', iconFileName: 'typeFlowOrTask48.svg' },
        { name: 'EPMOrTaskTemplate', iconFileName: 'typeFlowOrTask48.svg' },
        { name: 'EPMPerformSignoffTask', iconFileName : 'typeFlowPerformSignOffTask48.svg' },
        { name: 'EPMPerformSignoffTaskTemplate', iconFileName: 'typeFlowPerformSignOffTask48.svg' },
        { name: 'EPMSelectSignoffTask', iconFileName: 'typeFlowSelectSignoffTask48.svg' },
        { name: 'EPMSelectSignoffTaskTemplate', iconFileName : 'typeFlowSelectSignoffTask48.svg' },
        { name: 'EPMNotifyTask', iconFileName : 'typeFlowNotifyTask48.svg' },
        { name: 'EPMNotifyTaskTemplate', iconFileName: 'typeFlowNotifyTask48.svg' },
        { name: 'EPMTask', iconFileName: 'typeFlowTask48.svg' },
        { name: 'EPMTaskTemplate', iconFileName : 'typeFlowTask48.svg' }
    ];

    // Iterate for all task types array and find the correct object based on type match
    // so that correct icon can be used
    var taskTypeObjectMatch = _.find( taskTypesArray, function( type ) {
        return  taskType === type.name;
    } );

    if( taskTypeObjectMatch ) {
        iconFileName = taskTypeObjectMatch.iconFileName;
    }

    if( !iconFileName && taskType ) {
        var iconURL = iconSvc.getTypeIconURL( taskType );
        iconFileName = getIconNameFromPath( iconURL );
        // Check if file name is empty then use the default icon
        if( iconFileName === '' ) {
            iconFileName = 'typeFlowTask48.svg';
        }
    }
    // Check if still icon file not exist then use the default task flow icon
    if( iconFileName === '' || !iconFileName || iconFileName.indexOf( 'typeTask48' ) > -1   ) {
        iconFileName = 'typeFlowTask48.svg';
    }
    return iconSvc.getTypeIconFileUrl( iconFileName );
};

/**
 * Get the proeprty value based on limit and return the trim value.
 *
 * @param {int} propLimit Property max limit to trim the value
 * @param {String} propValue Property value that need to be trim
 *
 * @returns {String} Trim prop value that need to be used.
 */
export let getPropTrimValue = function( propLimit, propValue ) {
    if( !propLimit || !propValue ) {
        return;
    }

    /*
    * getting the input size in bytes ( as english have 1 byte char, chinese have 2 byte char, japanese
    * have 3 byte char, etc ).
    * in UTF8 encodings, each character uses between 1 and 4 bytes
    */
    var encodeStr = encodeURIComponent( propValue ).match( /%[89ABab]/g );
    var len =  propValue.length + ( encodeStr ? encodeStr.length : 0 );

    /*
    * This is for handling the copy usecase.
    * If user copy the text input, where length( in terms of byte size ) is more than max-length,
    * then we need to trim the extra chars for those language's input
    * so that user can paste only those chars that are specified by max-length.
    */
    if( len > propLimit ) {
        var newInput = '';
        var newInputLength = 0;
        for( var i = 0; i < propValue.length; i++ ) {
            encodeStr = encodeURIComponent( propValue[ i ] ).match( /%[89ABab]/g );
            newInputLength = newInputLength + propValue[ i ].length +
                ( encodeStr ? encodeStr.length : 0 );

            if( newInputLength <= propLimit ) {
                newInput += propValue[ i ];
            } else {
                break;
            }
        }
        return newInput;
    }
    return propValue;
};

/**
 * Get the search criteria that is needed to load the filter values for specific column.
 *
 * @param {Object} searchCriteria Search criteria object
 * @param {String} columnField COlumn field name
 *
 * @returns {Object} Search criteria object to load filter values
 */
export let getFilterValuesSearchCriteria = function( searchCriteria, columnField ) {
    if( !searchCriteria ) {
        searchCriteria = {};
    }

    if( columnField ) {
        searchCriteria.columnName = columnField;
    } else if( !columnField && searchCriteria.hasOwnProperty( 'columnName' ) ) {
        delete searchCriteria.columnName;
    }
    return searchCriteria;
};

export let isTcReleaseAtLeast131 = function() {
    var tcSessionData = appCtxSvc.getCtx( 'tcSessionData' );
    if ( tcSessionData && ( tcSessionData.tcMajorVersion > 13 || tcSessionData.tcMajorVersion === 13 && tcSessionData.tcMinorVersion >= 1 ) ) {
        return true;
    }
    return false;
};


/**
 * This factory creates a service and returns exports
 *
 * @member Awp0WorkflowUtils
 */

export default exports = {
    getValidObjectsToAdd,
    populateGroupLOV,
    populateRoleLOV,
    performRoleSearchByGroup,
    getTaskFlowBasedIcon,
    getPropTrimValue,
    getStartFinishNodeCategory,
    getFilterValuesSearchCriteria,
    isTcReleaseAtLeast131
};
app.factory( 'Awp0WorkflowUtils', () => exports );
