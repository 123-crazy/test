// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global define */

/**
 * @module js/Awp0ParticipantPanelService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import uwPropertySvc from 'js/uwPropertyService';
import awColumnSvc from 'js/awColumnService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import awTableService from 'js/awTableService';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import wrkflwSortFilterSvc from 'js/Awp0WorkflowSortFilterService';
import _ from 'lodash';
import _t from 'js/splmTableNative';

var exports = {};
var PREFIX_NAME_SUFFIX = '_displayable_participant_types';

/**
 * Table Cell Renderer for PL Table for participantValue column
 */
var _cellRenderer = function() {
    return {
        action: function( column, vmo, tableElem ) {
            var cellContent = _t.util.createElement( 'div', _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT );
            cellContent.classList.add( _t.Const.CLASS_TABLE_CELL_TOP );
            var cellDispValue = _.get( vmo, 'props.' + column.field + '.uiValue' );

            if( cellDispValue ) {
                cellContent.textContent = cellDispValue;
                cellContent.title = cellDispValue;
            }
            tableElem.classList.add( _t.Const.CLASS_TABLE_CELL_TOP_DYNAMIC );
            cellContent.classList.add( _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT_DYNAMIC );
            cellContent.classList.add( 'aw-workflow-requiredParticipantText');
            cellContent.classList.add( 'aw-theme-errorText');
            return cellContent;
        },
        condition: function( column, vmo ) {
            // Check if VMO is not null and contains isRequiredParticipant and column field is participantValue
            // then only return true as we need to show custom renderer for that column
            return vmo && vmo.isRequiredParticipant && column && column.field === 'participantValue';
        }
    };
};


function _getTableColumnInfos( columns ) {
    var columnInfos = [];
    // Get the custom cell renderer
    var renderer = _cellRenderer();
    _.forEach( columns, function( attrObj ) {
        var propName = attrObj.propName;
        var propDisplayName = attrObj.propDisplayName;
        var width = attrObj.width;
        var minWidth = attrObj.minWidth;

        var columnInfo = awColumnSvc.createColumnInfo();
        //Set values for common properties
        columnInfo.name = propName;
        columnInfo.displayName = propDisplayName;
        columnInfo.enableFiltering = true;
        columnInfo.isTreeNavigation = attrObj.isTreeNavigation;
        columnInfo.width = width;
        columnInfo.minWidth = minWidth;
        columnInfo.maxWidth = 800;
        columnInfo.modifiable = false;
        columnInfo.isActionColumn = false;
        // Below two variable need to set to hide the Hide columns menu from table
        // As we use hard coded column so we don't have arrange panel right now. So to overcome
        // the issue setting these variables.
        columnInfo.enableHiding = false;
        columnInfo.enableColumnHiding = false;

        if( attrObj.cellTemplate ) {
            columnInfo.cellTemplate = attrObj.cellTemplate;
        }
        // Check if property name participantValue then we need to add custom renderer for that column
        if( propName === 'participantValue' ) {
            columnInfo.cellRenderers = [ renderer ];
        }

        //Set values for un-common properties
        columnInfo.typeName = attrObj.type;
        columnInfo.enablePinning = true;
        columnInfo.enableSorting = true;
        columnInfo.enableCellEdit = false;

        columnInfos.push( columnInfo );
    } );
    return columnInfos;
}

/**
 * Populate handler arguments column data
 *
 * @param {object} uwDataProvider - the data provider
 * @param {object} data - data Object
 *  @param {object} ctx - ctx Object
 * @return {deferred} - deferred object
 */
export let loadParticipantTableColumns = function( data, dataProvider, columns ) {
    var deferred = AwPromiseService.instance.defer();
    dataProvider.showDecorators = true;

    // Get the column configuration info
    var columnInfos = _getTableColumnInfos( columns );
    dataProvider.columnConfig = {
        columns: columnInfos
    };
    deferred.resolve( {
        columnInfos: columnInfos
    } );
    if( data ) {
        data.columnsloaded = true;
    }
    return deferred.promise;
};

/**
 * Check if input object is of type input type. If yes then
 * return true else return false.
 *
 * @param {Object} obj Object to be match
 * @param {String} type Object type to match
 *
 * @return {boolean} True/False
 */
var isOfType = function( obj, type ) {
    if( obj && obj.modelType && obj.modelType.typeHierarchyArray.indexOf( type ) > -1 ) {
        return true;
    }
    return false;
};

/**
 * Get the input object property and return the internal or display value.
 *
 * @param {Object} modelObject Model object whose propeties need to be loaded
 * @param {String} propName Property name that need to be checked
 * @param {boolean} isDispValue Display value need to be get or internal value
 *
 * @returns {Array} Property internal value or display value
 */
var _getPropValue = function( modelObject, propName, isDispValue ) {
    var propValue = null;
    if( modelObject && modelObject.props && modelObject.props[ propName ] ) {
        var values = null;
        if( isDispValue ) {
            values = modelObject.props[ propName ].uiValues;
        } else {
            values = modelObject.props[ propName ].dbValues;
        }
        if( values && values[ 0 ] ) {
            propValue = values[ 0 ];
        }
    }
    return propValue;
};

/**
 * Get all supported participant types that need to be shown on the table.
 *
 * @param {Object} selectedObject Selected object from UI.
 * @param {Array} preferences Preferences array
 *
 * @returns {Array} String array that will tell all participant types that need to be shown.
 */
var _populateSupportedParticipantTypes = function( selectedObject, preferences ) {
    if( !selectedObject || !selectedObject.modelType || !selectedObject.modelType.typeHierarchyArray
        || !preferences || _.isEmpty( preferences ) ) {
        return [];
    }

    // Get type hierarchy array to get correct preference value that will tell about
    // all participant types that need to be shown
    var typeHierarchyArray = selectedObject.modelType.typeHierarchyArray;
    for( var idx = 0; idx < typeHierarchyArray.length; idx++ ) {
        var typeName = typeHierarchyArray[ idx ];
        // Build the preference name
        var prefName = typeName + PREFIX_NAME_SUFFIX;

        if( preferences.hasOwnProperty( prefName ) && preferences[ prefName ] ) {
            return preferences[ prefName ];
        }
    }
    return [];
};

/**
 * Get the participant type input for constant need to be loaded.
 *
 * @param {Array} preferences Preferences array values
 * @param {Object} selectedObject Selected object from UI
 *
 * @returns {Array} Constant array for constant values need to be fetched
 */
export let getParticipantConstantLoaded = function( preferences, selectedObject ) {
    var supportedParticipantTypes = _populateSupportedParticipantTypes( selectedObject, preferences );
    var constantTypesPopulated = [];
    if( supportedParticipantTypes && !_.isEmpty( supportedParticipantTypes ) ) {
        _.forEach( supportedParticipantTypes, function( participantType  ) {
            var object = {
                typeName: participantType,
                constantName: 'ParticipantAllowMultipleAssignee'
            };
            constantTypesPopulated.push( object );
        } );
    }
    return constantTypesPopulated;
};

/**
 * Get the participant type constant values that needs to be shown in table.
 *
 * @param {Array} preferences Preferences array values
 * @param {Object} selectedObject Selected object from UI
 *
 * @returns {Array} Constant array for constant values need to be shown in table
 */
export let loadParticipantConstantTypes = function( preferences, selectedObject ) {
    // We are making this call in JS code as if invalid values are defiend in preference
    // then we don't want to show the error instead we want to get the values for correct
    // types and return the correct values and ignore the error if any present on service data.
    // Fix for defect # LCS-545443
    var constantTypesPopulated = getParticipantConstantLoaded( preferences, selectedObject );
    return soaSvc.postUnchecked( 'BusinessModeler-2007-06-Constants', 'getTypeConstantValues', {
        keys: constantTypesPopulated
    } ).then( function( response ) {
        var typeConstantValues = [];
        if( response && response.constantValues && response.constantValues.length > 0 ) {
            typeConstantValues = response.constantValues;
        }
        return typeConstantValues;
    } );
};

/**
 * Populate all supported participant type along with its display names.
 *
 * @param {Object} data Data view model object
 * @param {Object} selectedObject Selected object from UI.
 *
 * @returns {Object} Participant type map that hold internal name along with display name
 */
var _populateParticipantTypeNameMap = function( data, selectedObject ) {
    // If input object is not valid then return empty map.
    if( !selectedObject || !selectedObject.uid || !data ) {
        return {};
    }
    var validTargetObject = cdm.getObject( selectedObject.uid );
    var participantTypes = [];
    // Get the allowable_participant_types property to populate participant type display names
    if( validTargetObject && validTargetObject.props.allowable_participant_types && validTargetObject.props.allowable_participant_types.dbValues ) {
        participantTypes = validTargetObject.props.allowable_participant_types.dbValues;
    }
    var participantTypeMap = new Object();
    // Iterate for all allowable participant types and iterate for populate the map.
    if( participantTypes && participantTypes.length > 0 ) {
        for( var idx = 0; idx < participantTypes.length; idx++ ) {
            var typeName = cmm.extractTypeNameFromUID( participantTypes[ idx ] );
            var uiValue = validTargetObject.props.allowable_participant_types.uiValues[ idx ];

            // Check if type name present in locale file then use that as dispaly value
            if( data.i18n && data.i18n[ typeName ] ) {
                uiValue = data.i18n[ typeName ];
            }
            // If uiValue is still null then use the internal name as display name
            if( !uiValue ) {
                uiValue = typeName;
            }
            participantTypeMap[ typeName ] = uiValue;
        }
    }
    return participantTypeMap;
};

/**
 * Populate all assignable participant type along with its display names.
 *
 * @param {Object} data Data view model object
 * @param {Object} selectedObject Selected object from UI.
 *
 * @returns {Object} Participant type map that hold internal name along with display name that can be assigned
 */
var _populateAssignableParticipantTypeNameMap = function( data, selectedObject ) {
    // If input object is not valid then return empty map.
    if( !selectedObject || !selectedObject.uid || !data ) {
        return {};
    }
    var validTargetObject = cdm.getObject( selectedObject.uid );
    var participantTypes = [];
    // Get the assignable_participant_types property to populate participant type display names
    if( validTargetObject && validTargetObject.props.assignable_participant_types && validTargetObject.props.assignable_participant_types.dbValues ) {
        participantTypes = validTargetObject.props.assignable_participant_types.dbValues;
    }
    var participantTypeMap = new Object();
    // Iterate for all allowable participant types and iterate for populate the map.
    if( participantTypes && participantTypes.length > 0 ) {
        for( var idx = 0; idx < participantTypes.length; idx++ ) {
            var typeName = cmm.extractTypeNameFromUID( participantTypes[ idx ] );
            var uiValue = validTargetObject.props.assignable_participant_types.uiValues[ idx ];

            // Check if type name present in locale file then use that as dispaly value
            if( data.i18n && data.i18n[ typeName ] ) {
                uiValue = data.i18n[ typeName ];
            }
            // If uiValue is still null then use the internal name as display name
            if( !uiValue ) {
                uiValue = typeName;
            }
            participantTypeMap[ typeName ] = uiValue;
        }
    }
    return participantTypeMap;
};


/**
 * Populate the participant info map object
 * @param {Object} selectedObject Selected object for participant info need to be populated
 *
 * @returns {Object} Participant info map object for type and actual participant objects present.
 */
var _populateParticipantDataMap = function( selectedObject ) {
    // If input object is not valid then return empty map.
    if( !selectedObject || !selectedObject.uid ) {
        return {};
    }

    var validTargetObject = cdm.getObject( selectedObject.uid );
    var modelObjects = [];
    // Get all participant objects from input object if present and add to array so that it can be used.
    if( validTargetObject && validTargetObject.props.HasParticipant && validTargetObject.props.HasParticipant.dbValues ) {
        var hasParticipants = validTargetObject.props.HasParticipant.dbValues;

        for( var idx in hasParticipants ) {
            var modelObj = cdm.getObject( hasParticipants[ idx ] );
            modelObjects.push( modelObj );
        }
    }
    var existingParticipantMap = new Object();
    // Iterate for all participant objects and get the assignee and add to the map so that will hold participant type
    // correspond to these exisitng participants.
    _.forEach( modelObjects, function( modelObject ) {
        if( modelObject && modelObject.props && modelObject.props.assignee &&  modelObject.props.assignee.dbValues
            &&  modelObject.props.assignee.dbValues[ 0 ] ) {
            var assigneeUid = modelObject.props.assignee.dbValues[ 0 ];
            var assigneeProp = _.clone( modelObject.props.assignee );
            var assigneeObj = cdm.getObject( assigneeUid );
            // For group member we need to show user on table and for resource pool we will show
            // resource pool string.
            if( isOfType( assigneeObj, 'GroupMember' ) ) {
                assigneeProp = modelObject.props.fnd0AssigneeUser;
                var userDbValue = _getPropValue( modelObject, 'fnd0AssigneeUser' );
                if( !userDbValue ) {
                    userDbValue = assigneeUid;
                }
                assigneeUid = userDbValue;
            } else {
                var resourcepoolDispValue = _getPropValue( modelObject, 'object_string', true );
                assigneeProp.uiValues = [ resourcepoolDispValue ];
            }
            // Create the participant VMO object and add the assigneePropObject on it so that it
            // can be used while displaying it in table
            var participantVMOObject = viewModelObjectSvc.createViewModelObject( modelObject.uid );
            var dpTypeName = modelObject.type;
            var participantList = existingParticipantMap[ dpTypeName ];
            if( !participantList ) {
                participantList = [];
            }
            participantVMOObject.assigneePropObject = assigneeProp;
            if( participantVMOObject && participantList ) {
                participantList.push( participantVMOObject );
                existingParticipantMap[ dpTypeName ] = participantList;
            }
        }
    } );
    return existingParticipantMap;
};

/**
 * Populate the properties on participant object that need to be shown on table
 *
 * @param {Object} data Data view model object
 * @param {String} participantInternalName Participant type internal name
 * @param {String} participantDispName participant type display name
 * @param {Objet} participantObject Participant object for properties need to be populated
 */
var _populateRowProps = function( data, participantInternalName, participantDispName, participantObject ) {
    // Get the table columns that need to be shown in table and if null or empty then return from here.
    var tableColumns = data.participantTableColumns;
    if( !tableColumns || _.isEmpty( tableColumns )) {
        return;
    }

    // Iterate for all table columns and populate the properties on input VMO object
    // so that it can be shown in table.
    _.forEach( tableColumns, function( tableColumn ) {
        var vmProp = null;
        var dbValue = '';
        var uiValues = [];
        var propName = tableColumn.propName;
        // Check if assigneePropObject is present that means actual participant object exist and it's value need to be shown
        if( propName === 'participantValue' && participantObject.assigneePropObject && participantObject.assigneePropObject.dbValues &&
            participantObject.assigneePropObject.dbValues[ 0 ] && participantObject.assigneePropObject.uiValues) {
            dbValue = participantObject.assigneePropObject.dbValues[ 0 ];
            uiValues = participantObject.assigneePropObject.uiValues;
        } else if( propName === 'participantName' &&  participantInternalName && participantDispName ) {
            dbValue = participantInternalName;
            uiValues = [ participantDispName ];
        } else if( propName === 'participantValue' && participantObject.isRequiredParticipant ) {
            dbValue = 'required';
            uiValues = [ data.i18n.required ];
        }
        // Create the view model property and add it to input VMO object
        vmProp = uwPropertySvc.createViewModelProperty( propName, tableColumn.propDisplayName, tableColumn.type,
            dbValue , uiValues );
        vmProp.dbValues = [ dbValue ];
        vmProp.uiValues = uiValues;
        participantObject.props[ propName ] = vmProp;
    } );
};

/**
 * Get the selection mode for input participant type and return the selection mode
 *
 * @param {Array} typeConstantValues Type constant values array
 * @param {String} participantType Participant type string for selection mode need to be fetched
 *
 * @returns {String} Selection type string for specific participant type
 */
var _getParticipantTypeConstant = function( typeConstantValues, participantType ) {
    var participantSelectionMode = 'single';
    if( !typeConstantValues || _.isEmpty( typeConstantValues ) || !participantType ) {
        return participantSelectionMode;
    }
    // Get the type constant value for specific participant type
    var typeConstant = _.find( typeConstantValues, function( typeConstant ) {
        return typeConstant.key && typeConstant.key.typeName === participantType;
    } );

    // Check if typeConstant is not null and it contains value then based on value return
    // the selection mode value
    if( typeConstant && typeConstant.value ) {
        if( typeConstant.value === 'false' ) {
            participantSelectionMode = 'single';
        } else if( typeConstant.value === 'true' ) {
            participantSelectionMode = 'multiple';
        }
    }
    return participantSelectionMode;
};

/**
 * Check if input participant is required or not.
 *
 * @param {Object} selectedObject Selected object for participant info need to be populated
 * @param {String} participantType Participant type string that need to be checked
 *
 * @returns {boolean} True/False based on participant type is required or not
 */
var _isRequiredParticipant = function( selectedObject, participantType ) {
    if( !selectedObject || !selectedObject.uid || !participantType ) {
        return false;
    }
    if( selectedObject.props && selectedObject.props.awp0RequiredParticipants
        && selectedObject.props.awp0RequiredParticipants.dbValues ) {
        var index = _.indexOf( selectedObject.props.awp0RequiredParticipants.dbValues, participantType );
        if( index >=0 ) {
            return true;
        }
    }
    return false;
};

/**
 * Populate all participant VMO objects and return them that need to be shown in table
 * @param {Object} data Data view model object
 * @param {Object} participantMap This hold the information for all participants present on select object
 * @param {Object} participantTypeMap This hold the information for all participant type along with it's display names
 * @param {Object} assignableParticipantTypeMap This hold the information for all participant type along with it's display names that can be assigned
 * @param {Array} supportedParticipantTypes Supported Participant types that selected object can support and need to be displayed
 *
 * @returns {Array} View model objects array that need to be shown on table
 */
var _populateParticipantRows = function( data, selectedObject, participantMap, participantTypeMap, assignableParticipantTypeMap, supportedParticipantTypes ) {
    var vmObjects = [];
    // Check if any required map is empty then return empty array
    if( !participantMap || !participantTypeMap || !supportedParticipantTypes ) {
        return vmObjects;
    }
    var validAssignableParticipantTypes = [];
    // Iterate for all supported types and check if it's valid and present in participantTypeMap
    // then process further either to create emtpy participant object or actual participant object.
    _.forEach( supportedParticipantTypes, function( participantType ) {
        if( participantTypeMap.hasOwnProperty( participantType ) ) {
            var modelObjects = participantMap[ participantType ];

            // Get the participant display name and if null then use the internal name only
            var participantDispName = participantTypeMap[ participantType ];
            if( !participantDispName ) {
                participantDispName = participantType;
            }

            // Get the selection mode based on participant type for single or multiple
            var participantSelectionMode = _getParticipantTypeConstant( data.typeConstantValues, participantType );

            if( !modelObjects || _.isEmpty( modelObjects) ) {
                // As participant is not assigned then create empty VMO to represent that row in table
                var vmObject = viewModelObjectSvc.constructViewModelObjectFromModelObject( null, '' );
                vmObject.type = participantType;
                vmObject.uid = participantType;
                vmObject.isRequiredParticipant = _isRequiredParticipant( selectedObject, participantType );

                modelObjects = [];
                modelObjects.push( vmObject );
            }

            // Iterate for all participant objects and populate the required props for needed to show in table
            _.forEach( modelObjects, function( modelObject ) {
                if( participantSelectionMode ) {
                    modelObject.participantSelectionMode = participantSelectionMode;
                }
                // Participant type string on model object
                modelObject.participantType = participantType;
                _populateRowProps( data, participantType, participantDispName, modelObject );
                vmObjects.push( modelObject );
            });

            // Check if assignableParticipantTypeMap is not empty and contains the participant type then check for
            // either participant need to be mutiple assignee or is not assined then only we need to add to array that will
            // be sued further. If participant type is not required but it's empty then also ad it to the list if it can be assigend
            if( assignableParticipantTypeMap && assignableParticipantTypeMap.hasOwnProperty( participantType )  && modelObjects && modelObjects[ 0 ]
                && ( modelObjects[ 0 ].participantSelectionMode === 'multiple' ||  modelObjects[ 0 ].isRequiredParticipant
                ||  !modelObjects[ 0 ].modelType )) {
                    var assignableObject = {
                        propInternalValue : participantType,
                        propDisplayValue : participantDispName
                    };
                    validAssignableParticipantTypes.push( assignableObject );
            }
        }
    });
    // Register the participant table context on app context service
    var participantCtx = {
        assignableParticipantTypes : validAssignableParticipantTypes,
        isParticipantTable : true
    };
    appCtxSvc.registerCtx( 'participantCtx', participantCtx );

    return vmObjects;
};

/**
 * Populate all participant data that need to be shown for input selected object based on
 * participant types present in preference.
 * @param {Object} response Response object after getProperties SOA call
 * @param {Object} data Data view model object
 * @param {Object} ctx App context object
 * @param {Object} selectedObject Selected object for participant info need to be populated
 * @param {Array} supportedParticipantTypes All supported participant types
 *
 * @return {Object} Object that hold info for rows need to be shown
 */
export let populateParticipantData = function( response, data, ctx, selectedObject, supportedParticipantTypes1 ) {
    var vmObjects = [];
    // Check if input response object is not null then populate all participant info and then create
    // the rows that need to be shown in the table.
    if( response ) {
        var supportedParticipantTypes = _populateSupportedParticipantTypes( selectedObject, ctx.preferences );
        var participantTypeMap = _populateParticipantTypeNameMap( data, selectedObject );
        var assignableParticipantTypeMap = _populateAssignableParticipantTypeNameMap( data, selectedObject );
        var existingParticipantMap = _populateParticipantDataMap( selectedObject );
        vmObjects = _populateParticipantRows( data, selectedObject, existingParticipantMap, participantTypeMap, assignableParticipantTypeMap, supportedParticipantTypes );
    }

    // Apply the filters on the table
    if( data.columnProviders.participantTableColumnProvider.columnFilters &&
        data.columnProviders.participantTableColumnProvider.columnFilters[0] ) {
        vmObjects = wrkflwSortFilterSvc.filterTableData( data.columnProviders.participantTableColumnProvider.columnFilters, vmObjects );
    }

    // Apply the sorting on the table
    if( data.columnProviders.participantTableColumnProvider.sortCriteria &&
        data.columnProviders.participantTableColumnProvider.sortCriteria[ 0 ] ) {
        wrkflwSortFilterSvc.applyTableSort( data.columnProviders.participantTableColumnProvider.sortCriteria, vmObjects );
    }

    // Create the table load result and return
    var loadResult = awTableService.createTableLoadResult( vmObjects.length );
    loadResult.searchResults = vmObjects;
    loadResult.searchIndex = -1;
    loadResult.totalFound = vmObjects.length;

    return loadResult;
};

/**
 * Based on all selected objects and check if there is any valid participant object that can be
 * removed.
 * @param {Object} dataProvider Data provider object
 * @param {Array} selectedObjects Selected objects array from UI
 * @param {Object} participantCtx Participant object context object
 */
export let evaluateSelections = function( dataProvider, selectedObjects, participantCtx ) {
    // Check if data provider is not valid or selected objects are null or empty then no need
    // to process further and return from here
    if( participantCtx ) {
        participantCtx.isRemoveCmdVisible = false;
    }
    if( !dataProvider || !selectedObjects || _.isEmpty(selectedObjects) ) {
        return;
    }

    var isRemoveCmdVisible = false;
    // Iterate for all selected objects and if selected object is of type Participant then
    // just return true from here as one object can be removed
    for( var idx = 0; idx < selectedObjects.length; idx++ ) {
        if( selectedObjects[ idx ] && isOfType( selectedObjects[ idx ], 'Participant') ) {
            isRemoveCmdVisible = true;
            break;
        }
    }
    if( participantCtx ) {
        participantCtx.isRemoveCmdVisible = isRemoveCmdVisible;
    }
};

export default exports = {
    loadParticipantTableColumns,
    populateParticipantData,
    evaluateSelections,
    getParticipantConstantLoaded,
    loadParticipantConstantTypes
};

/**
 * @memberof NgServices
 * @member awTableDataService
 */
app.factory( 'Awp0ParticipantPanelService', () => exports );
