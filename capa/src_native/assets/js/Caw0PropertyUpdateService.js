/* eslint-disable sonarjs/no-one-iteration-loop */
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
 * @module js/Caw0PropertyUpdateService
 */
import app from 'app';

import editHandlerService from 'js/editHandlerService';
import _uwPropertySvc from 'js/uwPropertyService';
import _cdmSvc from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import _dms from 'soa/dataManagementService';
import appCtxService from 'js/appCtxService';
import 'js/pasteService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import 'js/dataSourceService';

import soaSvc from 'soa/kernel/soaService';
import 'js/editHandlerFactory';
import 'js/xrtParser.service';
import 'soa/kernel/clientMetaModel';
import 'soa/dataManagementService';

import msgService from 'js/messagingService';
import AwPromiseService from 'js/awPromiseService';
import _CAW0capaUtilsService from 'js/CAW0capaUtilsService';
import _CAW0EditTreeStructure from 'js/CAW0EditTreeStructure';

import reportCommnSrvc from 'js/reportsCommonService';
import showReportBuilderReportsService from 'js/showReportBuilderReportsService';

import _localeSvc from 'js/localeService';

var exports = {};

var resource = app.getBaseUrlPath() + '/i18n/CAW0CapaMessages';
var localTextBundle = _localeSvc.getLoadedText( resource );

var isCauseGroupDeleted = false;
var isValidationInitialize = false;

export let setTeamList = function( data ) {
    return [ {
            propDisplayValue: data.i18n.caw08DTeam,
            propDisplayDescription: '',
            propInternalValue: data.i18n.caw08DTeam
        },
        {
            propDisplayValue: data.i18n.caw0All,
            propDisplayDescription: '',
            propInternalValue: data.i18n.caw0All
        }
    ];
};

export let getSelectedUsers = function( data ) {
    if( data.team.dbValue === data.i18n.caw08DTeam ) {
        return data.dataProviders.load8DTeamDataprovider.selectedObjects;
    }
    return data.dataProviders.userPerformSearch.selectedObjects;
};

export let selectTeam = function( data ) {
    if( data.team.dbValue === data.i18n.caw08DTeam ) {
        eventBus.publish( 'load8DTeam' );
    } else {
        eventBus.publish( 'loadAllUser' );
    }
    return data.team.dbValue === data.i18n.caw08DTeam ? data.i18n.caw08DTeam : data.i18n.caw0All;
};

export let getLoadedTeamUsers = function( response, data, ctx ) {
    var availableSecondaryObject = [];
    var valueOfArrayToReturn = [];
    if( data.myFilterBox.dbValue === '' || data.myFilterBox.dbValue === undefined ) {
        if( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) {
            for( let i = 0; i < response.output[ 0 ].relationshipData[ 0 ].relationshipObjects.length; i++ ) {
                if( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ i ].otherSideObject.type !== 'Requestor' ) {
                    availableSecondaryObject[ i ] = response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ i ].otherSideObject;
                }
            }
        }

        valueOfArrayToReturn = availableSecondaryObject.filter( value => Object.keys( value ).length !== 0 );
        ctx.responseOf8DTeam = response;
        ctx.valueOfArrayToReturn = valueOfArrayToReturn;
    }
    return valueOfArrayToReturn;
};

export let getLoadedSymtomDefects = function( response, data, ctx ) {
    //var availableSecondaryObject = [];
    var valueOfArrayToReturn = [];
    var rawSymptomDefectsObjects = JSON.parse( response.searchResultsJSON ).objects;
    valueOfArrayToReturn = rawSymptomDefectsObjects.map( function( obj ) {
        return response.ServiceData.modelObjects[ obj.uid ];
    } );

    // if( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) {
    //     for( let i = 0; i < response.output[ 0 ].relationshipData[ 0 ].relationshipObjects.length; i++ ) {
    //         availableSecondaryObject[ i ] = response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ i ].otherSideObject;
    //     }
    // }

    //valueOfArrayToReturn = availableSecondaryObject.filter( value => Object.keys( value ).length !== 0 );
    return valueOfArrayToReturn;
};

/**
 * This method is used to get the LOV values for the Create Ishikawa panel.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getICGValues = function( response ) {
    return response.preferences[ 0 ].values.map( function( value ) {
        return {
            propDisplayValue: value,
            propDisplayDescription: '',
            propInternalValue: value
        };
    } );
};

export let rejectSuggestions = function( selected, suggestion, data, ctx ) {
    if( !isCauseGroupDeleted ) {
        var valid = !0;
        var message = '';
        var addedValue;
        var newTextExists = false;
        var isExsists = false;
        var count = 0;
        if( suggestion && data.caw0IshikawaCauseGroup ) {
            var isTextPresent = data.caw0IshikawaCauseGroup.dbValue.filter( function( value ) {
                var valueUpper = value.toUpperCase();
                var newValue = suggestion.toUpperCase();
                return valueUpper === newValue;
            } );
            newTextExists = isTextPresent.length > 0;
        }
        if( suggestion && data.caw0CauseGroupInfo ) {
            isTextPresent = data.caw0CauseGroupInfo.dbValue.filter( function( value ) {
                var valueUpper = value.toUpperCase();
                var newValue = suggestion.toUpperCase();
                return valueUpper === newValue;
            } );
            newTextExists = isTextPresent.length > 0;
        }
        addedValue = selected[ selected.length - 1 ].propDisplayValue;

        selected.filter( function( value ) {
            if( value.propDisplayValue === addedValue ) {
                count += 1;
            }
        } );

        if( addedValue && data.caw0IshikawaCauseGroup ) {
            var isPresent = data.caw0IshikawaCauseGroup.dbValue.filter( function( value ) {
                var valueUpper = value.toUpperCase();
                var newValue = addedValue.toUpperCase();
                return valueUpper === newValue;
            } );
            isExsists = isPresent.length > 0;
        }

        if( addedValue !== null && data.caw0IshikawaCauseGroupInfo ) {
            isPresent = data.caw0IshikawaCauseGroupInfo.dbValue.filter( function( value ) {
                var valueUpper = value.toUpperCase();
                var newValue = addedValue.toUpperCase();
                return valueUpper === newValue;
            } );
            isExsists = isPresent.length > 0;
        }

        if( newTextExists && addedValue === suggestion || isExsists ) {
            message = localTextBundle.caw0CauseAlreadyExist;
            return {
                valid: false,
                message: message
            };
        }
        isValidationInitialize = true;
        return {
            valid: valid,
            message: message
        };
    }
    isCauseGroupDeleted = false;
    isValidationInitialize = false;
};

export let resetCauseGroup = function( data, ctx ) {
    var vmProp = _.get( data, 'cause' );
    var updateObject = _cdmSvc.getObject( ctx.selected.uid );
    if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && ctx.selected.props && ctx.selected.props.caw0CauseGroup ) {
        _setPropertyVaule( vmProp, updateObject.props.caw0CauseGroup.dbValues, true );
    }
};

/**
 * This method is used to get the LOV values for the versioning panel.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getLOVList = function( response ) {
    var lovsValue = response.lovValues.map( function( obj ) {
        return {
            propDisplayValue: obj.propDisplayValues.lov_values[ 0 ],
            propDisplayDescription: obj.propDisplayValues.lov_value_descriptions ? obj.propDisplayValues.lov_value_descriptions[ 0 ] : obj.propDisplayValues.lov_values[ 0 ],
            propInternalValue: obj.propInternalValues.lov_values[ 0 ]
        };
    } );

    if( appCtxService.ctx.tcSessionData.tcMajorVersion >= 13 ) {
        lovsValue.unshift( {
            propDisplayValue: '',
            propDisplayDescription: '',
            propInternalValue: ''
        } );
    }

    return lovsValue;
};

export let getLOVListOfAnalysis = function( response ) {
    var lovsValue = getLOVList( response );

    // lovsValue.unshift( {
    //     propDisplayValue: '',
    //     propDisplayDescription: '',
    //     propInternalValue: ''
    // } );

    return lovsValue;
};

// export let getLOVListOfCategory = function( response ) {
//     var lovs = getLOVList( response );

//     lovs.unshift( {
//         propDisplayValue: '',
//         propDisplayDescription: '',
//         propInternalValue: ''
//     } );

//     return lovs;
// };

export let updateICGValues = function( data, ctx, flag ) {
    //ctx & flag will only come when this function called fromEdit
    if( data.caw0IshikawaCauseGroup ) {
        var causeGroupWithEdit = _.get( data, 'caw0IshikawaCauseGroup' );
        var IshikawaObject = null;
        if( ctx ) {
            var selectedObject = _cdmSvc.getObject( ctx.selected.uid );
            IshikawaObject = selectedObject.modelType && selectedObject.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 ? _cdmSvc.getObject( ctx.selected.uid ) : null;
        }

        var defaultCauses = flag === 'fromEdit' && IshikawaObject !== null ? IshikawaObject.props.caw0IshikawaCauseGroup.dbValues : data.preferences.map( function( pref ) {
            return pref.propDisplayValue;
        } );
        if( causeGroupWithEdit && !causeGroupWithEdit.valueUpdated ) {
            _setPropertyVaule( causeGroupWithEdit, defaultCauses, true );
        }
        if( ctx ) {
            var cause = _.get( ctx, 'caw0CauseGroup' );
            _setPropertyVaule( cause, defaultCauses, true );
        }
        // if( causeGroupWithoutEdit && !causeGroupWithoutEdit.valueUpdated ) {
        //     _setPropertyVaule( causeGroupWithoutEdit, defaultCauses, true );
        // }
    }
    if( data.caw0IshikawaCauseGroupInfo && data.caw0CauseGroupInfo ) {
        var causeGroupWithEditInfo = _.get( data, 'caw0IshikawaCauseGroupInfo' );
        var causeGroupWithoutEditInfo = _.get( data, 'caw0CauseGroupInfo' );
        var IshikawaObjectInfo = ctx && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 ? _cdmSvc.getObject( ctx.selected.uid ) : null;
        var defaultCausesInfo = flag === 'fromEdit' && IshikawaObjectInfo !== null ? IshikawaObjectInfo.props.caw0IshikawaCauseGroup.dbValues : data.preferences.map( function( pref ) {
            return pref.propDisplayValue;
        } );
        if( causeGroupWithEditInfo && !causeGroupWithEditInfo.valueUpdated ) {
            _setPropertyVaule( causeGroupWithEditInfo, defaultCausesInfo, true );
        }
        if( causeGroupWithoutEditInfo && !causeGroupWithoutEditInfo.valueUpdated ) {
            _setPropertyVaule( causeGroupWithoutEditInfo, defaultCausesInfo, true );
        }
    }

    // if( data.caw0IshikawaCauseGroup === undefined && ctx.selected.props.caw0IshikawaCauseGroup && ctx.caw0CauseGroup !== undefined ) {
    //     var cause = _.get( ctx, 'caw0CauseGroup' );
    //     _setPropertyVaule( cause, ctx.selected.props.caw0IshikawaCauseGroup.uiValues, true );
    // }

    isCauseGroupDeleted = false;
    isValidationInitialize = false;
};

export let loadIshikawaCauses = function( data, ctx ) {
    //var vmProp = _.get( data, 'caw0CauseGroup' );
    if( ctx.selected.type === 'CAW0Ishikawa' || ( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 ) ) {
        var IshikawaObject = _cdmSvc.getObject( ctx.selected.uid );
        var causes = IshikawaObject.props.caw0IshikawaCauseGroup.dbValues;
        var value = causes.map( function( cause ) {
            return {
                propDisplayValue: cause,
                propInternalValue: cause
            };
        } );
        // value.unshift( {
        //     propDisplayValue: '',
        //     propInternalValue: ''
        // } );
        return { causeGroups: value };
    }
};

export let loadIshikawaCausesInGraph = function( data, ctx ) {
    //var vmProp = _.get( data, 'caw0CauseGroup' );
    if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 ) {
        var IshikawaObject = _cdmSvc.getObject( ctx.selected.uid );
        var causes = IshikawaObject.props.caw0IshikawaCauseGroup.dbValues;
        var value = causes.map( function( cause ) {
            return {
                propDisplayValue: cause,
                propInternalValue: cause
            };
        } );
        value.unshift( {
            propDisplayValue: '',
            propInternalValue: ''
        } );
        return { causeGroups: value };
    }
    if( ctx.selected.type === 'CauseGroup' ) {
        var IshikawaObject = _cdmSvc.getObject( ctx.pselected.uid );
        var causes = IshikawaObject.props.caw0IshikawaCauseGroup.dbValues;
        var value = causes.map( function( cause ) {
            return {
                propDisplayValue: cause,
                propInternalValue: cause
            };
        } );
        value.unshift( {
            propDisplayValue: '',
            propInternalValue: ''
        } );
        return { causeGroups: value };
    }
};

export let setcause = function( data, ctx ) {
    var updateObject = _cdmSvc.getObject( ctx.selected.uid );
    var causeGroupValue = updateObject.props.caw0CauseGroup.dbValues;
    if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && data.caw0CauseGroup ) {
        var vmProp1 = _.get( data, 'caw0CauseGroup' );
        _setPropertyVaule( vmProp1, causeGroupValue, false );
        var vmProp2 = _.get( data, 'cause' );
        _setPropertyVaule( vmProp2, causeGroupValue, false );
    } else {
        return;
    }
};

export let setcauseInMethodology = function( data, ctx ) {
    if( ctx.selected.type === 'CauseGroup' ) {
        ctx.selectedCategory = ctx.selected.id;
        var vmProp = _.get( data, 'caw0CauseGroup' );
        vmProp.displayValues = ctx.selected.id;
        vmProp.uiValues = ctx.selected.id;
        vmProp.dbValues = ctx.selected.id;
        vmProp.uiValue = ctx.selected.id;
        vmProp.dbValue = ctx.selected.id;
    } else {
        return;
    }
};

export let updateSelectionForCause = function( data ) {
    appCtxService.ctx.updateSelectionForCause = data.caw0CauseGroup.dbValue;
    var vmProp = _.get( data, 'cause' );
    _setPropertyVaule( vmProp, [ data.caw0CauseGroup.dbValue ], true );
    _upatedPropertyAfterEdit( 'caw0CauseGroup', data.caw0CauseGroup.dbValue );
};

export let updateCauseOnOverviewFromInfo = function( data ) {
    var vmProp1 = _.get( data, 'cause' );
    _setPropertyVaule( vmProp1, [ appCtxService.ctx.updateSelectionForCause ], true );

    var vmProp2 = _.get( data, 'caw0CauseGroup' );
    _setPropertyVaule( vmProp2, [ appCtxService.ctx.updateSelectionForCause ], true );
};

export let updateCauseselectioninMethodology = function( data, ctx ) {
    ctx.selectedCategory = data.caw0CauseGroup.dbValue;
};

export let loadCauses = function( data ) {
    if( data.response && data.response.output[ 0 ] ) {
        var causes = data.response.output[ 0 ].otherSideObjData[ 0 ].otherSideObjects[ 0 ].props.caw0IshikawaCauseGroup.dbValues;
        var value = causes.map( function( cause ) {
            return {
                propDisplayValue: cause,
                propInternalValue: cause
            };
        } );
        return { causeGroups: value };
    }
};

export let resetEditsPostFailure = function( ctx, data, error ) {
    appCtxService.unRegisterCtx( 'valueUpdated' );
    if( ctx.INFO_PANEL_CONTEXT ) {
        eventBus.publish( 'resetICGValues' );
        editHandlerService.saveEditsPostActions( false );
    }
    if( ctx.tcSessionData.tcMajorVersion < 13 ) {
        eventBus.publish( 'resetICGValues' );
        editHandlerService.saveEditsPostActions( false );
    }
    if( error ) {
        eventBus.publish( 'resetICGValues' );
    } else {
        editHandlerService.saveEditsPostActions( false );
    }
};

export let resetCauseGroupInMethodology = function( ctx, data ) {
    if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 && ctx.selected.props.caw0IshikawaCauseGroup ) {
        var caw0IshikawaCauseGroup = _.get( data, 'caw0IshikawaCauseGroup' );
        var originalValue = ctx.selected.props.caw0IshikawaCauseGroup.uiValues;
        _setPropertyVaule( caw0IshikawaCauseGroup, originalValue, false );
    }
};

export let resetICGValues = function( ctx, data ) {
    if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 && ctx.selected.props.caw0IshikawaCauseGroup ) {
        var activeEditHandler = editHandlerService.getActiveEditHandler();
        if( activeEditHandler ) {
            if( data.caw0CauseGroup && !ctx.caw0IshikawaCauseGroup ) {
                var dataSource = activeEditHandler.getDataSource();
                var caw0IshikawaCauseGroup = _.get( data, 'caw0CauseGroup' );
                var originalValue = ctx.selected.props.caw0IshikawaCauseGroup.uiValues;
                _setPropertyVaule( caw0IshikawaCauseGroup, originalValue, false );
                dataSource.resetUpdates();
            }
            if( data.caw0CauseGroupInfo ) {
                var dataSourceInfo = activeEditHandler.getDataSource();
                var caw0IshikawaCauseGroupInfo = _.get( data, 'caw0CauseGroupInfo' );
                var originalValueInfo = ctx.selected.props.caw0IshikawaCauseGroup.uiValues;
                _setPropertyVaule( caw0IshikawaCauseGroupInfo, originalValueInfo, false );
                dataSourceInfo.resetUpdates();
                editHandlerService.saveEditsPostActions( false );
            }
        }
    }
};

export let resetCauseDataValue = function( ctx, data ) {
    if( data.caw0CauseGroupInfo && ctx.caw0CauseGroupInfo ) {
        var caw0IshikawaCauseGroup = _.get( data, 'caw0CauseGroupInfo' );
        var caw0CauseGroup = _.get( data, 'caw0IshikawaCauseGroupInfo' );
        var originalValue = ctx.caw0CauseGroupInfo.dbValue;
        _setPropertyVaule( caw0IshikawaCauseGroup, originalValue, false );
        _setPropertyVaule( caw0CauseGroup, originalValue, false );
    }

    if( data.caw0CauseGroup && !ctx.caw0CauseGroupInfo && ctx.tcSessionData.tcMajorVersion > 12 ) {
        var caw0CauseGroup = _.get( data, 'caw0CauseGroup' );
        originalValue = ctx.updateSelectionForCause;
        _setPropertyVaule( caw0CauseGroup, originalValue, true );
        // _upatedPropertyAfterEdit( 'caw0CauseGroup', originalValue );
    }
};

export let setcauseInCtx = function( data, ctx ) {
    var caw0CauseGroup = _.get( data, 'caw0CauseGroup' );
    ctx.caw0CauseGroup = caw0CauseGroup;

    var caw0CauseGroupInfo = _.get( data, 'caw0CauseGroupInfo' );
    ctx.caw0CauseGroupInfo = caw0CauseGroupInfo;
};

export let udpateVMOProperty = function( data, ctx ) {
    if( ctx.caw0CauseGroup && ctx.caw0CauseGroup.dbValue && ctx.caw0CauseGroup.dbValue.length >= 1 ) {
        _upatedPropertyAfterEdit( 'caw0IshikawaCauseGroup', ctx.caw0CauseGroup.dbValue );
        _upatedPropertyAfterEdit( 'caw0CauseGroup', data.caw0CauseGroup.dbValue );
    }
    if( data.caw0CauseGroupInfo && data.caw0CauseGroupInfo.dbValue && data.caw0CauseGroupInfo.dbValue.length >= 1 ) {
        _upatedPropertyAfterEdit( 'caw0CauseGroup', data.caw0CauseGroupInfo.dbValue );
        _upatedPropertyAfterEdit( 'caw0IshikawaCauseGroup', data.caw0CauseGroupInfo.dbValue );
    }

    if( data.caw0IshikawaCauseGroup && data.caw0IshikawaCauseGroup.dbValue && data.caw0IshikawaCauseGroup.dbValue.length >= 1 ) {
        _upatedPropertyAfterEdit( 'caw0IshikawaCauseGroup', data.caw0IshikawaCauseGroup.dbValue );
        _upatedPropertyAfterEdit( 'caw0CauseGroup', data.caw0IshikawaCauseGroup.dbValue );
    }
};

export let udpateNonEditVMOProperty = function( data, ctx ) {
    if( data.caw0IshikawaCauseGroup && !ctx.INFO_PANEL_CONTEXT ) {
        var caw0CauseGroup = _.get( data, 'caw0IshikawaCauseGroup' );
        if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Overview' ) {
            _setPropertyVaule( caw0CauseGroup, data.caw0CauseGroup.dbValue, true );
        } else if( ctx.tcSessionData.tcMajorVersion < 13 ) {
            _setPropertyVaule( caw0CauseGroup, data.caw0CauseGroup.dbValue, true );
        } else {
            _setPropertyVaule( caw0CauseGroup, data.eventData.dataSource.caw0IshikawaCauseGroup.dbValues, true );
        }
    }
    if( ctx.caw0CauseGroupInfo || data.caw0CauseGroupInfo && ctx.INFO_PANEL_CONTEXT ) {
        var caw0IshikawaCauseGroup;
        if( data.caw0IshikawaCauseGroupInfo ) {
            caw0CauseGroup = _.get( data, 'caw0IshikawaCauseGroupInfo' );
            caw0IshikawaCauseGroup = _.get( data, 'caw0CauseGroupInfo' );
        } else if( data.caw0IshikawaCauseGroup ) {
            caw0CauseGroup = _.get( data, 'caw0IshikawaCauseGroup' );
            caw0IshikawaCauseGroup = _.get( data, 'caw0CauseGroup' );
        }

        if( ctx.caw0CauseGroupInfo && ctx.INFO_PANEL_CONTEXT ) {
            _setPropertyVaule( caw0CauseGroup, ctx.caw0CauseGroupInfo.dbValue, true );
            _setPropertyVaule( caw0IshikawaCauseGroup, ctx.caw0CauseGroupInfo.dbValue, true );
        } else if( data.caw0CauseGroupInfo ) {
            _setPropertyVaule( caw0CauseGroup, data.caw0CauseGroupInfo.dbValue, true );
            _setPropertyVaule( caw0IshikawaCauseGroup, data.caw0CauseGroupInfo.dbValue, true );
        }
    }
};

var _setPropertyVaule = function( vmProp, value, isDirty ) {
    _uwPropertySvc.setValue( vmProp, _.clone( value ) );
    _uwPropertySvc.setWidgetDisplayValue( vmProp, _.clone( value ) );
    _uwPropertySvc.setDirty( vmProp, isDirty );
};

var _upatedPropertyAfterEdit = function( porpertyName, updatedValues ) {
    var activeEditHandler = editHandlerService.getActiveEditHandler();
    if( activeEditHandler ) {
        var dataSource = activeEditHandler.getDataSource();
        var editableProperties = dataSource.getAllEditableProperties();
        for( let index = 0; index < editableProperties.length; index++ ) {
            if( editableProperties[ index ].propertyName === porpertyName ) {
                editableProperties[ index ].valueUpdated = true;
                editableProperties[ index ].newValue = updatedValues;
                editableProperties[ index ].dbValue = updatedValues;
            }
        }
    }
};

// This function is used to filter out 8dTeam data, this is custom filter for 8D
export let getFilter8DTeamValue = function( data, ctx ) {
    var response = ctx.responseOf8DTeam;
    var availableSecondaryObject = [];
    var valueOfArrayToReturn = [];
    if( data.myFilterBox.dbValue !== '' ) {
        if( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) {
            for( let i = 0; i < response.output[ 0 ].relationshipData[ 0 ].relationshipObjects.length; i++ ) {
                var obj = response.ServiceData.modelObjects[ response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ i ].otherSideObject.uid ];
                if( obj.props.object_string.dbValues[ 0 ].toUpperCase().includes( data.myFilterBox.dbValue.toUpperCase() ) ) {
                    availableSecondaryObject[ i ] = response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ i ].otherSideObject;
                }
            }
        }
        valueOfArrayToReturn = availableSecondaryObject.filter( value => Object.keys( value ).length !== 0 );
    } else {
        valueOfArrayToReturn = ctx.valueOfArrayToReturn;
    }
    return valueOfArrayToReturn;
};

export let lovValueChanged = function( data, ctx ) {
    appCtxService.ctx.ishikawaCauseGrpLOVModified = false;
    // //var valueBackUp = JSON.parse( JSON.stringify( data.caw0IshikawaCauseGroup.dbValue ) );
    // if( data.eventData.lovValue && data.eventData.lovValue.propInternalValue ) {
    //     data.caw0IshikawaCauseGroupInfo.dbValue.push( data.eventData.lovValue.propInternalValue );
    //     appCtxService.ctx.ishikawaCauseGrpLOVModified = true;
    // } else if( data.eventData && data.eventData.dbValue ) {
    //     data.caw0IshikawaCauseGroupInfo.dbValue.pop( data.eventData.dbValue );
    //     appCtxService.ctx.ishikawaCauseGrpLOVModified = true;
    // }
    // appCtxService.ctx.ctxValueOfIshikawaCauseGrp = data.caw0IshikawaCauseGroupInfo.dbValue;
    appCtxService.ctx.caw0CauseGroup = data.caw0CauseGroup;
    appCtxService.ctx.removedCauseGroup = data.eventData.dbValue;
    //data.caw0IshikawaCauseGroup.dbValue = valueBackUp;
};

export let setPropertyInfoEdit = function( data, ctx ) {
    var propVal;
    var propName;

    /*
    // Commenting this as updating Name prop through server
    */
    if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 && data.eventData && ctx.tcSessionData.tcMajorVersion < 13 ) {
        propVal = [ '5Why-' + data.eventData.dataSource.caw05WhyType.uiValue ];
        propName = 'object_name';
    }

    if( appCtxService.ctx.updateSelectionForCause && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && ctx.selected.props.caw0Context && ctx.selected.props.caw0Context.dbValues[
            0 ] === 'Ishikawa' ) {
        propName = 'caw0CauseGroup';
        propVal = [ appCtxService.ctx.updateSelectionForCause ];
    }

    if( data.caw0CauseGroupInfo && !data.caw0IshikawaCauseGroup ) {
        propVal = data.caw0CauseGroupInfo.dbValue;
        propName = 'caw0IshikawaCauseGroup';
    }
    if( ctx.ctxValueOfIshikawaCauseGrp && data.caw0IshikawaCauseGroup ) {
        propVal = ctx.ctxValueOfIshikawaCauseGrp;
        propName = 'caw0IshikawaCauseGroup';
    }
    if( ctx.tcSessionData.tcMajorVersion < 13 && ctx.caw0CauseGroup && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 ) {
        propVal = ctx.caw0CauseGroup.dbValue;
        propName = 'caw0IshikawaCauseGroup';
    }

    if( propVal ) {
        var type = ctx.selected.type;
        var uid = ctx.selected.uid;
        var input = {
            object: { type, uid },
            vecNameVal: [ {
                name: propName,
                values: propVal
            } ]
        };
        return _dms.setProperties( [ input ] );
        //eventBus.publish( 'doUpdateCauseGroupData' );
    }
};

export let updatePanel = function( data ) {
    if( data.eventData.selectedObjects.length > 0 ) {
        var type_name = data.eventData.selectedObjects[ 0 ].props.type_name;
        appCtxService.ctx.selectedObjectType = type_name.dbValue;
        data.isObjectTypeSelected = true;
        type_name.propertyDisplayName = type_name.uiValue;
        appCtxService.ctx.type_name = type_name;
        data.firstTimeLoad = true;
    } else {
        data.isObjectTypeSelected = false;
    }
};

export let clearSelectedType = function( data ) {
    data.isObjectTypeSelected = false;
};

/**
 * Auto select the type if there is single type
 *
 * @param {object} data - The qualified data of the viewModel
 */
export let autoSelectType = function( data ) {
    data.totalTypeFound = data.dataProviders.awTypeSelector.viewModelCollection.totalFound;
    if( data.totalTypeFound === 1 && !data.firstTimeLoad ) {
        var eventData = {
            selectedObjects: [ data.dataProviders.awTypeSelector.getViewModelCollection().getViewModelObject( 0 ) ]
        };
        eventBus.publish( 'awTypeSelector.selectionChangeEvent', eventData );
    }
};

export let showWarningOnSwitch = function( data, ctx ) {
    var activeEditHandler = editHandlerService.getActiveEditHandler();
    if( activeEditHandler ) {
        var dataSourceInfo = activeEditHandler.getDataSource();
        var caw0IshikawaCauseGroup = _.get( data, 'caw0CauseGroupInfo' );
        var originalValue = data.eventData.dataSource.caw0IshikawaCauseGroup.dbValue;
        _setPropertyVaule( caw0IshikawaCauseGroup, originalValue, false );
        dataSourceInfo.resetUpdates();
        editHandlerService.saveEditsPostActions( false );
    }
};

export let getSelectedFailures = function( data ) {
    return {
        selectedFailureObjects: data.eventData.selectedObjects
    };
};

export let updateAdded5WhyFlag = function( ctx ) {
    ctx.isNew5WhyAdded = true;
};

export let updatePanelData = function( data, ctx ) {
    var createdObject = _cdmSvc.getObject( ctx.selected.uid );
    var targetObject = viewModelObjectSvc.constructViewModelObjectFromModelObject( createdObject, 'EDIT' );
    if( createdObject.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && ctx.sidenavCommandId === "CAW0Add5Why" && appCtxService.ctx.tcSessionData.tcMajorVersion >= 13 ) {
        var vmPropPD = _.get( data, 'caw0ProbDefinition' );
        _setPropertyVaule( vmPropPD, createdObject.props.object_name.dbValues, true );
        var vmPropAD = _.get( data, 'caw0AnalysisDimensionStatic' );
        _setPropertyVaule( vmPropAD, createdObject.props.caw0AnalysisDimension.dbValues, true );
    }
    ctx.parentContextObject = targetObject;
};
export let deletePanelData = function( ctx ) {
    appCtxService.unRegisterCtx( 'parentContextObject' );
};

export let resetAdded5WhyFlag = function( ctx ) {
    appCtxService.unRegisterCtx( 'isNew5WhyAdded' );
};

export let checkEditingPDChild = function( data, ctx ) {
    var activeEditHandler = editHandlerService.getActiveEditHandler();
    var dataSource = activeEditHandler.getDataSource();
    var modifiedViewModelProperties = dataSource.getAllModifiedProperties();
    var flag = false;
    var updatedDimension;
    modifiedViewModelProperties.forEach( property => {
        if( property.propertyName === 'caw0AnalysisDimension' && property.valueUpdated ) {
            flag = true;
            updatedDimension = property.newDisplayValues[ 0 ];
        }
    } );
    if( flag ) {
        displayConfirmationMessage( data, ctx, activeEditHandler, updatedDimension );
    } else {
        _CAW0capaUtilsService.addEdit5whyHandler().then( function( response ) {
            soaSvc.post( 'Internal-AWS2-2018-05-DataManagement', 'saveViewModelEditAndSubmitWorkflow2', response ).then(
                function( response ) {
                    data.serviceData = response;
                    _CAW0EditTreeStructure.updateTreeTable( ctx, data );
                },
                function( error, errorCode ) {
                    var errMessage = msgService.getSOAErrorMessage( error );
                    exports.resetEditsPostFailure( ctx, data, error );
                    msgService.showError( errMessage );
                    throw error;
                } );
        } );
    }
};

/**
 * Display confirmation message
 * @param {String} message the message text
 * @param {String} confirmButtonName the text to display for the confirm button
 * @param {String} cancelButtonName the text to display for the cancel button
 * @returns {Promise} promise
 */
export function displayConfirmationMessage( data, ctx, activeEditHandler, newDimensionValue ) {
    var deferred = AwPromiseService.instance.defer();
    var buttonArray = [];
    buttonArray.push( createButton( localTextBundle.caw0Cancel, function( $noty ) {
        $noty.close();
        deferred.reject();
        deferred = null;
    } ) );

    buttonArray.push( createButton( localTextBundle.caw0Update, function( $noty ) {
        _CAW0capaUtilsService.addEdit5whyHandler().then( function( response ) {
            $noty.close();
            deferred.resolve();
            deferred = null;
            soaSvc.post( 'Internal-AWS2-2018-05-DataManagement', 'saveViewModelEditAndSubmitWorkflow2', response ).then(
                function( response ) {
                    data.serviceData = response;
                    _CAW0EditTreeStructure.updateTreeTable( ctx, data );
                },
                function( error, errorCode ) {
                    var errMessage = msgService.getSOAErrorMessage( error );
                    exports.resetEditsPostFailure( ctx, data, error );
                    msgService.showError( errMessage );
                    throw error;
                } );
        } );
    } ) );

    var confirmationMessage = localTextBundle.caw0editDimensionConfirmation.format( newDimensionValue );
    msgService.showWarning( confirmationMessage, buttonArray );
    return deferred.promise;
}

/**
 * Create button for use in notification messages
 *
 * @param {String} label label
 * @param {Function} callback callback
 * @return {Object} button
 */
export function createButton( label, callback ) {
    return {
        addClass: 'btn btn-notify',
        text: label,
        onClick: callback
    };
}

export let resetUiValues = function( data, ctx ) {
    if( data && data.object_desc && data.object_name ) {
        data.object_desc.dbValue = '';
        data.object_desc.uiValue = '';
        data.object_name.dbValue = '';
        data.object_name.uiValue = '';
    }
};

export let getCreateObjectInput = function( data, ctx, addingObject ) {
    var propertyNameValues;

    switch ( addingObject ) {
        case "addingDefect":
            propertyNameValues = {
                object_name: [ data.object_name.dbValue ],
                object_desc: [ data.object_desc.dbValue ],
                caw0category: [ data.caw0category.dbValue ],
                caw0reoccuring: [ data.caw0reoccuring.dbValue.toString() ]
            };
            break;
        case "adding5Why":
            propertyNameValues = {
                caw0Id: [ data.nextId ],
                object_name: [ "5Why-" + data.caw05WhyType.uiValue ],
                object_desc: [ data.object_desc.dbValue ],
                caw0ProbDefinition: [ data.caw0ProbDefinition.dbValue ]
            };
            break;
        case "addingWhy":
            propertyNameValues = {
                object_name: [ data.object_name.dbValue ],
                object_desc: [ data.object_desc.dbValue ],
                caw0Context: [ ctx.selected.uid ]
            };
            break;
        case "addingCause":
            if( ctx.xrtSummaryContextObject ) {
                propertyNameValues = {
                    object_name: [ data.object_name.dbValue ],
                    object_desc: [ data.object_desc.dbValue ],
                    caw0Context: [ ctx.xrtSummaryContextObject.uid ],
                    caw0CauseGroup: [ data.caw0CauseGroup.dbValue ]
                };
            } else {
                propertyNameValues = {
                    object_name: [ data.object_name.dbValue ],
                    object_desc: [ data.object_desc.dbValue ],
                    caw0Context: [ ctx.selected.uid ],
                    caw0CauseGroup: [ data.caw0CauseGroup.dbValue ]
                };
            }
            break;
        case "addingIshikawa":
            propertyNameValues = {
                caw0Id: [ data.nextId ],
                object_name: [ data.object_name.dbValue ],
                object_desc: [ data.object_desc.dbValue ],
                caw0ProbDefinition: [ data.caw0ProbDefinition.dbValue ],
                caw0IshikawaCauseGroup: data.caw0IshikawaCauseGroup.dbValue
            };
            break;

    }

    if( ctx.tcSessionData.tcMajorVersion >= 13 ) {
        if( addingObject === 'addingDefect' ) {
            propertyNameValues.caw0AnalysisType = [ data.caw0AnalysisType.dbValue ];
        }
        if( addingObject === 'adding5Why' ) {
            propertyNameValues.caw05WhyType = [ data.caw0AnalysisType.dbValue ];
        }
        if( ctx.selected.caw0Context && ctx.selected.caw0Context === 'Capa' ) {
            propertyNameValues.caw0AnalysisDimension = [ data.caw0AnalysisDimension.dbValue ];
        }

        propertyNameValues.caw0ParentObject = ctx.selected.type === 'CauseGroup' ? [ ctx.selected.parentId ] : [ ctx.selected.uid ];

    } else {
        if( addingObject === 'adding5Why' ) {
            propertyNameValues.caw05WhyType = [ data.caw05WhyType.dbValue ];
        }
    }

    return [ {
        clientId: "CreateObject",
        createData: {
            boName: ctx.selectedObjectType,
            propertyNameValues: propertyNameValues,
            compoundCreateInput: {}
        },
        workflowData: {}
    } ];
};

export let setObjectSetView = function( selectedView, viewToggleState, ctx ) {

    if( _.isEqual( selectedView, 'tableDisplay' ) ) {
        ctx.showCompareView = false;
        ctx.showTableView = true;
    } else if( _.isEqual( selectedView, 'compareDisplay' ) ) {
        ctx.showCompareView = true;
        ctx.showTableView = false;
    }
};

export let changeOfWhyOption = function( data, ctx ) {
    appCtxService.registerCtx( 'selected5WhyProp' );
    if( data.fiveWhyOptionsDimension.dbValue !== "" ) {
        ctx.selected5WhyProp = data.fiveWhyOptionsDimension.dbValue;
        data.fiveWhyOptionsAnalysis.dbValue = "";
    }

};
export let changeOf5WhyAnalsysType = function( data, ctx ) {
    appCtxService.registerCtx( 'selected5WhyProp' );
    if( data.fiveWhyOptionsAnalysis.dbValue !== "" ) {
        ctx.selected5WhyProp = data.fiveWhyOptionsAnalysis.dbValue;
        data.fiveWhyOptionsDimension.dbValue = "";
    }
};

export let setSelectionOf5Why = function( ctx ) {
    if( ctx.selected5WhyProp === 'analysisDimension' ) {
        ctx.treeVMO.viewModelCollection.loadedVMObjects[ 0 ].selected = true;
        ctx.rootCauseContext.selectionModel.setSelection( ctx.treeVMO.viewModelCollection.loadedVMObjects[ 0 ].uid );
        appCtxService.unRegisterCtx( 'selected5WhyProp' );
    } else if( ctx.uidOfParentFor5Why ) {
        ctx.rootCauseContext.selectionModel.setSelection( ctx.uidOfParentFor5Why );
        appCtxService.unRegisterCtx( 'uidOfParentFor5Why' );
    }
};

export let getParentOfCurr5Why = function( response, ctx ) {
    let value = response.output[ 0 ].info[ 0 ].referencer.uid;
    if( ctx.selected5WhyProp === 'analysisType' ) {
        ctx.uidOfParentFor5Why = value;
        appCtxService.unRegisterCtx( 'selected5WhyProp' );
    }
};

export let getParent5Why = function( ctx ) {
    if(ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Methodology' && ctx.pselected.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
        return ctx.pselected;
    }
    if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
        return ctx.selected;
    } else {
        let selected = ctx.selected;
        let loadedVMObjects = ctx.treeVMO.viewModelCollection.loadedVMObjects;
        var selectedIndex = loadedVMObjects.findIndex( function( treeNode ) { return treeNode.uid === ctx.selected.uid; } );
        var parent5Why;
        for( let index = selectedIndex; index > 0; index-- ) {
            if( loadedVMObjects[ index ].levelNdx < selected.levelNdx && loadedVMObjects[ index ].modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
                parent5Why = loadedVMObjects[ index ];
            }
        }
        return parent5Why;
    }
};

export let setCauseFor5why = function( data, ctx ) {

    ctx.treeVMO.viewModelCollection.loadedVMObjects.forEach( obj => {
        if( obj.uid === data.createdObject.uid ) {
            obj.selected = true;
        }
    } );

    ctx.rootCauseContext.selectionModel.setSelection( data.createdObject.uid );
    appCtxService.unRegisterCtx( 'selectedValueForCause' );
};

export let setCauseForIshikawa = function( data, ctx ) {
    ctx.treeVMO.viewModelCollection.loadedVMObjects[ 0 ].selected = true;
    ctx.rootCauseContext.selectionModel.setSelection( ctx.treeVMO.viewModelCollection.loadedVMObjects[ 0 ].uid );
    ctx.treeVMO.viewModelCollection.loadedVMObjects[ 0 ].selected = true;
    appCtxService.unRegisterCtx( 'selectedValueForCause' );
};

export let getSelected5why = function( data, ctx ) {
    appCtxService.registerCtx( 'selectedValueForCause' );
    if( data.fiveWhyOption.dbValue !== "" ) {
        ctx.selectedValueForCause = data.fiveWhyOption.dbValue;
        data.ishikawaOption.dbValue = "";
    }
};

export let getSelectedIshikawa = function( data, ctx ) {
    appCtxService.registerCtx( 'selectedValueForCause' );
    if( data.ishikawaOption.dbValue !== "" ) {
        ctx.selectedValueForCause = data.ishikawaOption.dbValue;
        data.fiveWhyOption.dbValue = "";
    }
};

export let clearCTXfor5Why = function( ctx ) {
    if( ctx.selectedValueForCause ) {
        ctx.selectedValueForCause = '';
        appCtxService.unRegisterCtx( 'selectedValueForCause' );
    }
};

export let getLoadedVendorData = function( response, data, ctx ) {
    var valueOfArrayToReturn = [];
    var rawDataObjects = JSON.parse( response.searchResultsJSON ).objects;
    valueOfArrayToReturn = rawDataObjects.map( function( obj ) {
        return response.ServiceData.modelObjects[ obj.uid ];
    } );
    return valueOfArrayToReturn;
};

export let getPreferenceForDashboard = function() {
    var preference_Name;
    if( appCtxService.ctx.sublocation.nameToken === 'com.siemens.splm.client.qualityCenterManager:showPSPDashboard' ) {
        preference_Name = 'CAW0_PSPDashboard_TC_Report';
    }
    if( appCtxService.ctx.sublocation.nameToken === 'com.siemens.splm.client.qualityCenterManager:showQIMDashboard' ) {
        preference_Name = 'CAW0_QIMDashboard_TC_Report';
    }
    return { preference_Name: preference_Name };
};

export let getReportDefinitionVal = function( response ) {
    var reportDefinitions = showReportBuilderReportsService.getReportDefinitionVal( response );
    reportDefinitions = reportDefinitions.reportdefinitions.filter( function( rd ) {
        return rd.type === 'ReportDefinition' && rd.props.rd_type.dbValues[ 0 ] === '4';
    } );
    var preference_Name = getPreferenceForDashboard().preference_Name;

    if( appCtxService.ctx.preferences[ preference_Name ] !== null && appCtxService.ctx.preferences[ preference_Name ].length > 0 ) {

        var addedReportDefinations = appCtxService.getCtx( 'preferences.' + preference_Name ).map( function( report ) {
            return report.split( ':' )[ 0 ];
        } );

        reportDefinitions = reportDefinitions.filter( ( repDefObj ) => !addedReportDefinations.includes( repDefObj.props.rd_id.dbValues[ 0 ] ) );
    }

    return {
        reportdefinitions: reportDefinitions
    };
};

export let raiseEventToPerformFiltering = function( filterStr ) {
    appCtxService.updatePartialCtx( 'awp0SummaryReports.reportFilter', filterStr );
    eventBus.publish( 'caw0.reveal' );
};

export default exports = {
    getICGValues,
    rejectSuggestions,
    resetCauseGroup,
    getLOVList,
    updateICGValues,
    loadIshikawaCauses,
    setcause,
    updateSelectionForCause,
    loadCauses,
    resetEditsPostFailure,
    resetICGValues,
    setcauseInCtx,
    udpateVMOProperty,
    udpateNonEditVMOProperty,
    loadIshikawaCausesInGraph,
    setcauseInMethodology,
    updateCauseselectioninMethodology,
    resetCauseGroupInMethodology,
    setTeamList,
    getSelectedUsers,
    selectTeam,
    getLoadedTeamUsers,
    getFilter8DTeamValue,
    lovValueChanged,
    setPropertyInfoEdit,
    resetCauseDataValue,
    getLoadedSymtomDefects,
    updatePanel,
    clearSelectedType,
    autoSelectType,
    showWarningOnSwitch,
    getSelectedFailures,
    updateCauseOnOverviewFromInfo,
    updateAdded5WhyFlag,
    resetAdded5WhyFlag,
    getLOVListOfAnalysis,
    checkEditingPDChild,
    resetUiValues,
    getCreateObjectInput,
    setObjectSetView,
    changeOfWhyOption,
    setSelectionOf5Why,
    getParentOfCurr5Why,
    changeOf5WhyAnalsysType,
    setCauseFor5why,
    setCauseForIshikawa,
    getSelected5why,
    getSelectedIshikawa,
    clearCTXfor5Why,
    getLoadedVendorData,
    updatePanelData,
    deletePanelData,
    getPreferenceForDashboard,
    getReportDefinitionVal,
    raiseEventToPerformFiltering,
    getParent5Why

};
app.factory( 'Caw0PropertyUpdateService', () => exports );
