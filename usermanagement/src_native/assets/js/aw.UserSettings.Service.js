// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define Promise */

/**
 * @module js/aw.UserSettings.Service
 */
import app from 'app';
import uwPropertySvc from 'js/uwPropertyService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import soaSvc from 'soa/kernel/soaService';
import tcServerVersion from 'js/TcServerVersion';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import assert from 'assert';

var _dataProvider;
var _data;

var _groupMemberArray;
var _oldDefaultGroup;
var _selectedDefaultGroup;

eventBus.subscribe( 'tableDestroyed', function() {
    _dataProvider = null;
} );

var exports = {};

/**
 * The function will get all the role object from the group members. This logic is same as the getGroupMembers
 *
 * @param {Object} response - Response object from the Administration-2012-09-UserManagement::getUserGroupMembers SOA API
 * @param {string} selectedGroupName - name of selected group in group role table
 * @return {object} Array of the unique roles under particular group
 */
export let getRolesForSelectedGroup = function( response, selectedGroupName ) {
    assert( selectedGroupName, 'selectedGroupName should have some value.' );
    let groupArray = _.filter( response.ServiceData.modelObjects, mo => mo && mo.props && mo.type === 'GroupMember' );
    _groupMemberArray = groupArray;

    let uniqueRoles = [];
    let listRoles = [];
    _.forEach( groupArray, function( groupObject ) {
        let groupStatus = groupObject.props.status;
        let group = groupObject.props.group;
        let role = groupObject.props.role;
        let isFalseStatus = groupStatus.dbValues[ 0 ] !== '0';
        // process only active grp members
        if( group && role && groupStatus && !isFalseStatus ) {
            // prepare the role list
            if( group.uiValues[ 0 ] === selectedGroupName ) {
                if( role.uiValues[ 0 ] ) {
                    listRoles[ role.uiValues[ 0 ] ] = groupObject;
                }
            }
        }
    } );

    for( var role in listRoles ) {
        let roleObject = {
            propDisplayValue: role,
            propInternalValue: role
        };
        uniqueRoles.push( roleObject );
    }
    return uniqueRoles;
};

export let initializeTableData = function( eventData ) {
    if( eventData && !_dataProvider ) {
        _data = eventData.scope.data;
    }
};

/**
 * Get ViewModelRows of required Object
 *
 * @param {Object} response of the getGroupRoleViewModelRows SOA
 * @return {object} Array of viewModelObjects corresponding to rows of group-role table
 */
export let processGroupRoleViewModelRowsOutput = function( response ) {
    var displayedRows = [];

    _.forEach( response.viewModelRows, function( groupMemberRow ) {
        var groupMemberVMO = viewModelObjectSvc
            .constructViewModelObjectFromModelObject( groupMemberRow.modelObject, 'Edit' );

        _.forEach( groupMemberRow.viewModelProperties, function( groupMemberRowProp, index ) {
            let groupMemberVMProperty = uwPropertySvc.createViewModelProperty(
                groupMemberRowProp.propInternalName, groupMemberRowProp.propDisplayName,
                'STRING', groupMemberRowProp.propDBValue, [ groupMemberRowProp.propUIValue ] );

            uwPropertySvc.setIsPropertyModifiable( groupMemberVMProperty, groupMemberRowProp.isModifiable );

            if( groupMemberRowProp.propInternalName === 'default_role' ) {
                groupMemberVMProperty.dataProvider = 'rolesProvider';
            }

            groupMemberVMProperty.parentUid = index;
            uwPropertySvc.setIsEditable( groupMemberVMProperty, groupMemberRowProp.isEditable );
            uwPropertySvc.setHasLov( groupMemberVMProperty, groupMemberRowProp.hasLOV );

            groupMemberVMProperty.dbValues = [ groupMemberRowProp.propDBValue ];
            if( groupMemberRowProp.propInternalName === 'group' ) {
                var groupDisplayName = groupMemberRow.modelObject.props.object_string.uiValues[ 0 ].split( '/' );
                groupMemberVMProperty.uiValues = [ groupDisplayName[ 0 ] ];
                groupMemberVMProperty.uiValue = groupDisplayName[ 0 ];
            }

            groupMemberVMProperty.getViewModel = function() {
                return _data;
            };

            groupMemberVMO.props[ groupMemberRowProp.propDisplayName ] = groupMemberVMProperty;
        } );
        displayedRows.push( groupMemberVMO );
    } );

    return displayedRows;
};

/**
 * Filter role corresponding to every groups and call 'setGroupMemberProperties' SOA to update
 * value on server
 *
 * @param {object} groupRoleTableDataProvider - the group-role table data provider Object
 */
export let callSetGroupMemberProperties = function( groupRoleTableDataProvider ) {
    var forDefaultGroupToOne = [];
    _.forEach( groupRoleTableDataProvider.viewModelCollection.loadedVMObjects, function( vmObject ) {
        _.forEach( _groupMemberArray, function( groupMemberObject ) {
            if( groupMemberObject && groupMemberObject.props && groupMemberObject.type === 'GroupMember' ) {
                if(  vmObject.props.group.uiValue === groupMemberObject.props.group.uiValues[ 0 ]  &&
                     vmObject.props.default_role.dbValue === groupMemberObject.props.role.uiValues[ 0 ]  ) {
                    groupMemberObject.props.default_role.dbValues[ 0 ] = '1';
                    forDefaultGroupToOne.push( groupMemberObject );
                }
            }
        } );
    } );

    var inputObjects = [];
    _.forEach( forDefaultGroupToOne, function( forDefaultGroupToOneObject ) {
        let inputObj =  {
            groupMember: forDefaultGroupToOneObject,
            groupMemberPropValuesMap: {
                default_role: forDefaultGroupToOneObject.props.role.dbValues
            }
        };
        inputObjects.push( inputObj );
    } );

    var input = {
        inputObjects: inputObjects
    };

    if( inputObjects.length !== 0 ) {
        soaSvc.post( 'Administration-2012-09-UserManagement', 'setGroupMemberProperties', input ).then( function( resp ) {
            return resp;
        }, function( err ) {
            return err;
        } );
    }
};

/**
 * The function will get all the group object from the group members.
 *
 * @param {Object} response - Response object from the Core-2006-03-Session::getGroupMembership SOA
 * @return {object} Array of the unique groups
 */
export let getGroups = function( response ) {
    var groupArray = response.groupMembers;
    var defaultGroups = [];
    var uniqueGroups = [];
    var listGroups = [];

    _.forEach( groupArray, function( groupObject ) {
        if( groupObject && groupObject.props && groupObject.type === 'GroupMember' ) {
            var group_status = groupObject.props.status;
            var group = groupObject.props.group;
            var role = groupObject.props.role;
            var isFalseStatus = group_status.dbValues[ 0 ] !== '0';
            // process only active group members
            if( group && role && group_status && !isFalseStatus ) {
                var default_role = groupObject.props.default_role;
                var grp_value = group.uiValues[ 0 ];
                var isFalseRole = default_role.dbValues[ 0 ] !== '0';
                if( default_role && isFalseRole ) {
                    defaultGroups[ grp_value ] = groupObject;
                    listGroups[ grp_value ] = groupObject;
                } else {
                    var grpObj = _.get( defaultGroups, group );
                    if( grpObj ) {
                        listGroups[ grp_value ] = grpObj;
                    } else {
                        listGroups[ grp_value ] = groupObject;
                    }
                }
            }
        }
    } );

    for( var group in listGroups ) {
        uniqueGroups.push( listGroups[ group ] );
    }

    var groups = [];
    for( var i = 0; i < uniqueGroups.length; i++ ) {
        let obj = {
            propDisplayValue: uniqueGroups[ i ].props.group.uiValues[ 0 ],
            propInternalValue: uniqueGroups[ i ].props.group.uiValues[ 0 ]
        };
        groups.push( obj );
    }
    return groups;
};

/**
 * Set selected Default Group from data to Commit it to Database
 *
 * @param {object} data - Data of Object
 * @return {string} - name of selected group
 */
export let setSelectedDefaultGroup = function( data ) {
    _selectedDefaultGroup = data.currentGroup.dbValue;
    return _selectedDefaultGroup;
};

/**
 * Update edit state for attribute Default Group Widget
 *
 * @param {object} context - context object
 */
export let updateDefaultGroup = function( context ) {
    var inputData = [ {
        userId: context.xrtSummaryContextObject.props.userid.dbValues[0],
        person: '',
        password: '',
        defaultGroup: _selectedDefaultGroup,
        newOwner: '',
        newOwningGroup: '',
        userPropertyMap: {
            Allow_Login_User_To_Update: [ 'true' ]
        },
        userAddlPropertyMap: {
        }
    } ];

    soaSvc.post( 'Administration-2015-07-UserManagement', 'createOrUpdateUser', { userInputs: inputData } ).then(
        function( resp ) {},
        function( errObj ) {} );
};

export let checkVersionSupportForGroupRole = function( major, minor, qrm ) {
    if( tcServerVersion.majorVersion > major ) {
        // For TC versions like TC12
        return true;
    }
    if( tcServerVersion.majorVersion < major ) {
        // For TC versions like TC10
        return false;
    }
    if( tcServerVersion.minorVersion > minor ) {
        // For TC versions like TC11.3
        return true;
    }
    if( tcServerVersion.minorVersion < minor ) {
        // For TC versions like TC11.1
        return false;
    }
    //compare only versions like TC11.2.2, TC11.2.3....
    return tcServerVersion.qrmNumber >= qrm;
};

/**
 * Update edit state for attribute Default Group Widget
 *
 * @param {object} data - Data of Object
 * @param {object} eventData - the eventdata object of editHandlerStateChange
 * @param {object} context - context object
 */

export let modifyUserDefaultGroup = function( data, eventData, context ) {
    if( eventData.state === 'starting' ) {
        data.currentGroup.type = 'STRING';
        data.currentGroup.isEnabled = true;
        data.currentGroup.isEditable = true;
        _oldDefaultGroup = _selectedDefaultGroup;
    } else if( eventData.state === 'canceling' ) {
        data.currentGroup.isEditable = false;
        data.currentGroup.dbValue = _oldDefaultGroup;
        data.currentGroup.uiValue = _oldDefaultGroup;
    } else if( eventData.state === 'saved' ) {
        exports.updateDefaultGroup( context );
        data.currentGroup.isEditable = false;
        _oldDefaultGroup = '';
    }
};

/**
 * The function will get the default Group for the logged in user
 *
 * @param {Object} response - Response object from the getProperties SOA
 * @return {object} Default group value for the User currently set in the DB
 */
export let getCurrentDefaultGroup = function( response ) {
    var currentDefaultGroupVal;
    var userObjectArray = response.modelObjects;

    _.forEach( userObjectArray, function( userObject ) {
        if( userObject.modelType.name === 'Group' ) {
            currentDefaultGroupVal = userObject.props.object_string.uiValues[ 0 ];
        }
    } );

    return currentDefaultGroupVal;
};

export default exports = {
    callSetGroupMemberProperties,
    getRolesForSelectedGroup,
    initializeTableData,
    processGroupRoleViewModelRowsOutput,
    getGroups,
    setSelectedDefaultGroup,
    updateDefaultGroup,
    checkVersionSupportForGroupRole,
    modifyUserDefaultGroup,
    getCurrentDefaultGroup
};
/**
 * @memberof NgServices
 * @member awUserSettingsService
 */
app.factory( 'awUserSettingsService', () => exports );
