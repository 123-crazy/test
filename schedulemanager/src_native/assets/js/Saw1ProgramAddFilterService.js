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
 * @module js/Saw1ProgramAddFilterService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import smConstants from 'js/ScheduleManagerConstants';
import soaSvc from 'soa/kernel/soaService';
import dateTimeSvc from 'js/dateTimeService';
import AwPromiseService from 'js/awPromiseService';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import _ from 'lodash';

import 'js/selection.service';

import 'soa/kernel/clientDataModel';

var exports = {};

var _editCondition = null;

var finalStatusResponse = [];

var _addResource = null;

var _resetEditWidgets = false;

/**
 * Populate Priorities from soa call
 *
 * @param {ctx} ctx - The context of view model
 * @param {data} data - The data of view model
 * @returns {response} response of SOA
 */
var getPriorities = function( ctx, data ) {
    let inputData = {
        initialData: {
            lovInput: {
                owningObject: {
                    uid: 'AAAAAAAAAAAAAA',
                    type: 'unknownType'
                },
                boName: 'Schedule',
                operationName: 'Search'
            },
            propertyName: 'priority',
            filterData: {
                maxResults: 0,
                numberToReturn: 100,
                order: 1
            }
        }
    };
    return soaSvc.post( 'Core-2013-05-LOV', 'getInitialLOVValues', inputData )
        .then( function( response ) {
            for( let i = 0; i < response.lovValues.length; i++ ) {
                response.lovValues[ i ].propDisplayValues.lov_value_descriptions[ 0 ];
                data.genericValueContextValues.dbValues[ i ] = [];
                data.genericValueContextValues.dbValues[ i ].propDisplayValue = response.lovValues[ i ].propDisplayValues.lov_value_descriptions[ 0 ];
                data.genericValueContextValues.dbValues[ i ].propInternalValue = response.lovValues[ i ].propDisplayValues.lov_values[ 0 ];
            }
            data.genericValueContextValues.dbValue = _.clone( data.genericValueContextValues.dbValues );
            data.genericEndValueContextValues.dbValue = _.clone( data.genericValueContextValues.dbValues );
            data.genericEndValueContextValues.dbValues = _.clone( data.genericValueContextValues.dbValues );

            ctx.ProgramViewPriorities = _.clone( data.genericValueContextValues.dbValues );
            data.genericEndValueContext.propertyDisplayName = data.i18n.to;
        } );
};

/**
 * Populate States from soa call
 *
 * @param {ctx} ctx - The context of view model
 * @param {data} data - The data of view model
 * @param {object} internalName - Internal name of field selected
 * @returns {response} response of SOA
 */
var getState = function( ctx, data, internalName ) {
    let inputData = {
        initialData: {
            lovInput: {
                owningObject: {
                    uid: 'AAAAAAAAAAAAAA',
                    type: 'unknownType'
                },
                boName: 'Schedule',
                operationName: 'Search'
            },
            propertyName: 'fnd0state',
            filterData: {
                maxResults: 0,
                numberToReturn: 25,
                order: 1
            }
        }
    };
    return soaSvc.post( 'Core-2013-05-LOV', 'getInitialLOVValues', inputData )
        .then( function( response ) {
            for( let i = 0; i < response.lovValues.length; i++ ) {
                response.lovValues[ i ].propDisplayValues.lov_value_descriptions[ 0 ];
                data.genericValueContextValues.dbValues[ i ] = [];
                data.genericValueContextValues.dbValues[ i ].propDisplayValue = response.lovValues[ i ].propDisplayValues.lov_values[ 0 ];
                data.genericValueContextValues.dbValues[ i ].propInternalValue = response.lovValues[ i ].propInternalValues.lov_values[ 0 ];
            }
            data.genericValueContextValues.dbValue = _.clone( data.genericValueContextValues.dbValues );

            ctx.ProgramViewStates = _.clone( data.genericValueContextValues.dbValues );
            data.genericValueContext.propertyDisplayName = data.propertyContext.uiValue;

            if( internalName ) {
                getStatus( 0, ctx, data );
            }
        } );
};

/**
 * Populate Status from soa call
 *
 * @param {index} index - The index of ProgramViewStates array
 * @param {ctx} ctx - The context of view model
 * @param {data} data - The data of view model
 * @returns {response} response of SOA
 */
var getStatus = function( index, ctx, data ) {
    if( ctx.ProgramViewStates ) {
        let length = ctx.ProgramViewStates.length;
        for( let i = index; i < length; ) {
            let inputData = {
                initialData: {
                    lovInput: {
                        owningObject: {
                            uid: 'AAAAAAAAAAAAAA',
                            type: 'unknownType'
                        },
                        boName: 'Schedule',
                        operationName: 'Edit',
                        propertyValues: {
                            fnd0state: [
                                ctx.ProgramViewStates[ i ].propInternalValue
                            ],
                            fnd0status: [ '' ]
                        }
                    },
                    propertyName: 'fnd0status',
                    filterData: {
                        maxResults: 0,
                        numberToReturn: 25,
                        order: 1
                    }
                }
            };
            return soaSvc.post( 'Core-2013-05-LOV', 'getInitialLOVValues', inputData ).then( function( response ) {
                if( i < length ) {
                    finalStatusResponse.push( response );
                }
                if( i + 1 === length ) {
                    let count = 0;
                    for( let j = 0; j < finalStatusResponse.length; j++ ) {
                        for( let k = 0; k < finalStatusResponse[ j ].lovValues.length; k++ ) {
                            finalStatusResponse[ j ].lovValues[ k ].propDisplayValues.lov_value_descriptions[ 0 ];
                            data.genericValueContextValues.dbValues[ count ] = [];
                            data.genericValueContextValues.dbValues[ count ].propDisplayValue = finalStatusResponse[ j ].lovValues[ k ].propDisplayValues.lov_values[ 0 ];
                            data.genericValueContextValues.dbValues[ count++ ].propInternalValue = finalStatusResponse[ j ].lovValues[ k ].propInternalValues.lov_values[ 0 ];
                        }
                    }
                    data.genericValueContextValues.dbValue = _.clone( data.genericValueContextValues.dbValues );
                    ctx.ProgramViewStatus = _.clone( data.genericValueContextValues.dbValues );
                    data.genericValueContext.propertyDisplayName = data.propertyContext.uiValue;
                    return;
                }
                getStatus( i + 1, ctx, data );
            } );
        }
    }
};

var resetWidgets = function( data ) {
    if( data.genericWidget ) { data.genericWidget.dbValue = null; }
    if( data.genericEndWidget ) { data.genericEndWidget.dbValue = null; }
    resetListBox( data );
    exports.removeResource( data.filterResourceValue );
};

var resetListBox = function( data ) {
    data.genericValueContextValues.dbValues = [];
    data.genericValueContextValues.dbValue = [];
    data.genericEndValueContextValues.dbValues = [];
    data.genericEndValueContextValues.dbValue = [];
};

/**
 * Populate condition types based on panel field selection
 *
 * @param {data} data - The data of view model
 * @param {object} conditions - The conditions to be assigned
 */
var populateConditionTypes = function( ctx, data, conditions ) {
    let listData = [];
    for( let i = 0; i < conditions.length; i++ ) {
        let listValue = {
            propInternalValue: conditions[ i ],
            propDisplayValue: data.i18n[ smConstants.PROGRAM_VIEW_CRITERIA_i18n_KEY_MAP[ conditions[ i ] ] ]
        };
        listData.push( listValue );
    }
    data.operatorTypeContextValues.dbValue = listData;
};

/**
 * Populate Priorities from soa call or ctx
 *
 * @param {ctx} ctx - The context of view model
 * @param {data} data - The data of view model
 */
export let populatePriorties = function( ctx, data ) {
    resetListBox( data );
    if( !ctx.ProgramViewPriorities ) {
        getPriorities( ctx, data );
    } else {
        populatePriortiesFromCtx( ctx, data );
    }
};
/**
 * Populate Priorities from ctx
 *
 * @param {ctx} ctx - The context of view model
 * @param {data} data - The data of view model
 */
var populatePriortiesFromCtx = function( ctx, data ) {
    data.genericValueContextValues.dbValues = _.clone( ctx.ProgramViewPriorities );
    data.genericValueContextValues.dbValue = data.genericValueContextValues.dbValues;
    data.genericEndValueContextValues.dbValues = _.clone( ctx.ProgramViewPriorities );
    data.genericEndValueContextValues.dbValue = data.genericEndValueContextValues.dbValues;
};
/**
 * Populate States from ctx
 *
 * @param {ctx} ctx - The context of view model
 * @param {data} data - The data of view model
 */
var populateStatesFromCtx = function( ctx, data ) {
    data.genericValueContextValues.dbValues = _.clone( ctx.ProgramViewStates );
    data.genericValueContextValues.dbValue = data.genericValueContextValues.dbValues;
    data.genericValueContext.propertyDisplayName = data.propertyContext.uiValue;
};
/**
 * Populate Status from ctx
 *
 * @param {ctx} ctx - The context of view model
 * @param {data} data - The data of view model
 */
var populateStatusFromCtx = function( ctx, data ) {
    data.genericValueContextValues.dbValues = _.clone( ctx.ProgramViewStatus );
    data.genericValueContextValues.dbValue = data.genericValueContextValues.dbValues;
    data.genericValueContext.propertyDisplayName = data.propertyContext.uiValue;
};
/**
 * Populate State or Status from soa call ot ctx
 *
 * @param {ctx} ctx - The context of view model
 * @param {data} data - The data of view model
 */
export let populateStateOrStatus = function( ctx, data ) {
    let internalName = data.propertyContext.dbValue.split( '.' )[ 1 ];
    resetListBox( data );
    if( internalName === 'fnd0state' ) {
        if( !ctx.ProgramViewStates ) {
            getState( ctx, data );
        } else {
            populateStatesFromCtx( ctx, data );
        }
    } else if( internalName === 'fnd0status' ) {
        if( !ctx.ProgramViewStates ) {
            getState( ctx, data, internalName ); // If Status are not populated when status is selected on Panel.
        }

        if( !ctx.ProgramViewStatus ) {
            getStatus( 0, ctx, data );
        } else {
            populateStatusFromCtx( ctx, data ); // Populate existing cached status from the Ctx.
        }
    }
};

var getInternalValue = function( data, ctx ) {
    for( let i = 0; i < data.ProgramViewFiltersConditions.length; i++ ) {
        if( data.ProgramViewFiltersConditions[ i ].uid === ctx.ProgramViewFilterConditonForEdit.uid ) {
            return data.ProgramViewFiltersConditions[ i ].internalValue;
        }
    }
    return;
};

/**
 * Edit Functionality : Sets the other Widget on the edit Panel
 *
 * @param {ctx} ctx - The context of view model
 * @param {data} data - The data of view model
 * @param {widget} widget - The current active widget of view model
 * @param {endWidget} endWidget - The current active End widget of view model
 */
var setGenericBoxes = function( ctx, data, widget, endWidget ) {
    let fieldValue = ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.ValueSection.dbValue ].value;
    let localisedTo = ' ' + data.i18n.to + ' ';

    if( fieldValue ) {
        let endValue = null;
        endValue = fieldValue.split( localisedTo )[ 1 ];

        let startValue = null;
        let internalValue = null;
        if( widget.type === 'LISTBOX' ) {
            internalValue = getInternalValue( data, ctx );
        }
        if( endValue ) {
            startValue = fieldValue.split( localisedTo )[ 0 ];
            if( widget.type === 'LISTBOX' ) {
                endWidget.dbValue = internalValue.split( ',' )[ 1 ];
            } else {
                endWidget.dbValue = endValue;
            }
            endWidget.uiValue = endValue;
        } else {
            startValue = fieldValue;
        }

        if( startValue ) {
            if( widget.type === 'BOOLEAN' ) { // to support boolean data type
                widget.dbValue = startValue === 'true';
            } else if( widget.type === 'LISTBOX' ) {
                widget.dbValue = endValue ? internalValue.split( ',' )[ 0 ] : internalValue;
            } else {
                widget.dbValue = startValue;
            }
            widget.uiValue = widget.propertyName === 'filterResourceValue' && widget.dbValue === 'Unassigned' ? data.i18n.Saw1Unassigned : startValue;
        }
    }
};
/**
 * Edit Functionality : Sets the Date Widget on the edit Panel
 *
 * @param {ctx} ctx - The context of view model
 * @param {data} data - The data of view model
 */
var setDates = function( ctx, data ) {
    let fieldValue = ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.ValueSection.dbValue ].value;
    let localisedTo = ' ' + data.i18n.to + ' ';

    if( fieldValue ) {
        let endDate = fieldValue.split( localisedTo )[ 1 ];
        let startDate = null;
        if( endDate ) {
            endDate = Date.parse( endDate );
            startDate = fieldValue.split( localisedTo )[ 0 ];
            startDate = Date.parse( startDate );

            data.genericEndWidget.dbValue = endDate;
            data.genericEndWidget.uiValue = endDate;
            data.genericEndWidget.dateApi.dateValue = dateTimeSvc.formatDate( endDate, data.genericEndWidget.dateApi.dateFormatPlaceholder );
        } else {
            startDate = Date.parse( fieldValue );
        }

        if( startDate ) {
            data.genericWidget.dbValue = startDate;
            data.genericWidget.uiValue = startDate;
            data.genericWidget.dateApi.dateValue = dateTimeSvc.formatDate( startDate, data.genericWidget.dateApi.dateFormatPlaceholder );
        }
    }
};

/**
 * Condition Context handling on Panel
 *
 * @param {data} data - The data of view model
 */
export let selectionChangeOfOperatorContext = function( data ) {
    if( data.operatorTypeContext.dbValue ) {
        if( data.operatorTypeContext.dbValue.toLowerCase() === 'between' ) {
            data.currentConditionValueType.dbValue = 'true';

            let internalName = data.propertyContext.dbValue.split( '.' )[ 1 ];
            let widgetType = smConstants.PROGRAM_VIEW_WIDGET_TYPE_LIST[ internalName ];
            if( widgetType ) {
                if( widgetType !== 'LISTBOX' ) {
                    data.genericEndWidget.type = widgetType;
                    if( data.genericEndWidget.dbValue < 0 ) {
                        data.genericEndWidget.dbValue = null;
                    }
                } else {
                    data.genericValueContext.propertyDisplayName = data.i18n.from;
                }
                data.currentFieldValueType.dbValue = widgetType;
            } else {
                data.genericEndWidget.type = data.genericWidget.type;
                data.genericValueContext.propertyDisplayName = data.i18n.from;
                data.currentFieldValueType.dbValue = data.genericWidget.type;
            }
            data.genericWidget.propertyDisplayName = data.i18n.from;
        } else {
            data.currentConditionValueType.dbValue = undefined;
            data.genericWidget.propertyDisplayName = data.propertyContext.uiValue;
            data.genericValueContext.propertyDisplayName = data.propertyContext.uiValue;
        }
    }
};

export let populateTypeNames = function( typeInternalName, ctx, data ) {
    if( typeInternalName ) {
        let count = 0;
        let properties = ctx.ProgramViewPreferenceMap[ typeInternalName ];
        if( properties ) {
            let prefProperties = ctx.ProgramViewPropertiesMap[ typeInternalName ];
            for( let j = 0; j < properties.length; j++ ) {
                for( let k = 0; k < prefProperties.length; k++ ) {
                    if( prefProperties[ k ].name === properties[ j ] ) {
                        data.propertyContextValues.dbValues[ count ] = [];
                        data.propertyContextValues.dbValues[ count ].propDisplayValue = prefProperties[ k ].displayName;
                        data.propertyContextValues.dbValues[ count ].propInternalValue = typeInternalName + '.' + prefProperties[ k ].name;
                        data.propertyContextValues.dbValues[ count ].valueType = prefProperties[ k ].valueType;
                        count++;
                        break;
                    }
                }
            }
        }
        data.propertyContextValues.dbValue = _.clone( data.propertyContextValues.dbValues );
    }
};
export let selectionChangeOfTypeContext = function( data ) {

    data.propertyContextValues.dbValues = [];
    data.propertyContextValues.dbValue = [];

    exports.populateTypeNames( data.typeContext.dbValue, appCtxService.ctx, data );
};

/**
 * Selection change event for Changed Field Value on Panel
 *
 * @param {data} data - The data of view model
 */
export let selectionChangeOfPropertyContext = function( data ) {
    let ctx = appCtxService.ctx;

    if( data.propertyContext.dbValue ) {
        var valueType = null;
        for( let j = 0; j < data.propertyContextValues.dbValues.length; j++ ) {
            if( data.propertyContext.dbValue === data.propertyContextValues.dbValues[ j ].propInternalValue ) {
                valueType = data.propertyContextValues.dbValues[ j ].valueType;
                break;
            }
        }
        if( valueType !== null && valueType >= 0 ) {
            let conditions = smConstants.PROGRAM_VIEW_CONDITIONS_LIST[ valueType ];
            if( !conditions ) { //default conditions to support newly added value in RAC for ProgramViewFilterProperties
                conditions = [];
                conditions.push( 'Equal To' );
                conditions.push( 'Not Equal To' );
            }
            let internalName = data.propertyContext.dbValue.split( '.' )[ 1 ];
            let widgetType = smConstants.PROGRAM_VIEW_WIDGET_TYPE_LIST[ internalName ];
            if( widgetType ) {
                if( widgetType !== 'LISTBOX' && widgetType !== 'PANEL' ) {
                    data.genericWidget.type = widgetType;
                    data.genericWidget.propertyDisplayName = data.propertyContext.uiValue;
                }
            } else {
                widgetType = smConstants.PROGRAM_VIEW_VALUE_TYPE_TO_WIDGET_TYPE_LIST[ valueType ]; //fetch the widgetType to support newly added value in RAC for ProgramViewFilterProperties
                data.genericWidget.type = widgetType;
                data.genericWidget.propertyDisplayName = data.propertyContext.uiValue;
            }
            data.currentFieldValueType.dbValue = widgetType;
            populateConditionTypes( ctx, data, conditions );
            exports.selectionChangeOfOperatorContext( data, widgetType );

            if( internalName === 'priority' ) {
                exports.populatePriorties( ctx, data );
                _resetEditWidgets = false;
            } else if( internalName === 'fnd0state' || internalName === 'fnd0status' ) {
                exports.populateStateOrStatus( ctx, data );
                _resetEditWidgets = false;
            } else {
                resetWidgets( data );
            }
        }

        if( ctx.ProgramViewFilterConditonForEdit ) {
            if ( _resetEditWidgets ) {
                resetWidgets( data );
                ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.ValueSection.dbValue ].value = '';
            } else {
                if( data.currentFieldValueType.dbValue === 'LISTBOX' ) {
                    setGenericBoxes( ctx, data, data.genericValueContext, data.genericEndValueContext );
                } else if( data.currentFieldValueType.dbValue === 'DATE' ) {
                    setDates( ctx, data );
                } else if( data.currentFieldValueType.dbValue !== 'PANEL' ) {
                    setGenericBoxes( ctx, data, data.genericWidget, data.genericEndWidget );
                } else if ( data.currentFieldValueType.dbValue === 'PANEL' ) {
                    setGenericBoxes( ctx, data, data.filterResourceValue, data.genericEndWidget );
                }
                _resetEditWidgets = true;
            }
        }
    }
};

/**
 * Display the property preferences , It would populate the field names for Panel
 *
 * @param {object} typeInternalName - The type internal name
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The qualified data of the viewModel
 */
export let displayPropertyPreferencesAction = function( typeInternalName, ctx, data ) {
    if( typeInternalName ) {
        let count = 0;
        let properties = ctx.ProgramViewPreferenceMap[ typeInternalName ];
        if( properties ) {
            let prefProperties = ctx.ProgramViewPropertiesMap[ typeInternalName ];
            for( let j = 0; j < properties.length; j++ ) {
                for( let k = 0; k < prefProperties.length; k++ ) {
                    if( prefProperties[ k ].name === properties[ j ] ) {
                        let edit = ctx.ProgramViewFilterConditonForEdit;
                        if( edit && edit.cellProperties[ data.propertySection.dbValue ].internalValue.split( '.' )[ 1 ] === prefProperties[ k ].name ) {
                            data.propertyContext.dbValue = typeInternalName + '.' + prefProperties[ k ].name;
                            data.propertyContext.uiValue = prefProperties[ k ].displayName;
                        }
                        data.propertyContextValues.dbValues[ count ] = [];
                        data.propertyContextValues.dbValues[ count ].propDisplayValue = prefProperties[ k ].displayName;
                        data.propertyContextValues.dbValues[ count ].propInternalValue = typeInternalName + '.' + prefProperties[ k ].name;
                        data.propertyContextValues.dbValues[ count ].valueType = prefProperties[ k ].valueType;
                        count++;
                        break;
                    }
                }
            }
        }
        data.propertyContextValues.dbValue = _.clone( data.propertyContextValues.dbValues );
    }
    eventBus.publish( 'selectionChangeOfPropertyContext', data );
};

/**
 * Get the BO type for the current fitler being created or edited
 *
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The qualified data of the viewModel
 */
export let getFilterBOType = function( ctx, data ) {

    let boType = "ScheduleTask"; // default to ScheduleTask

    if( ctx.ProgramViewFilterConditonForEdit )
    {
        boType = ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.typeSection.dbValue ].internalValue;
    }

    return boType;
};

/**
 * Get the property preferences configured in RAC for ProgramViewFilterProperties
 *
 * @param {object} typeInternalName - The type internal name
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The qualified data of the viewModel
 * @param {boolean} noDisplay - true/false
 */
export let getPropertyPreferences = function( typeInternalName, ctx, data, noDisplay ) {
    _resetEditWidgets = false;
    if( !ctx.ProgramViewPreferenceMap ) {
        soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
            preferenceNames: [ 'ProgramViewFilterProperties' ],
            includePreferenceDescriptions: true
        } ).then( function( preferenceResult ) {
            if( preferenceResult ) {
                let preferenceProp = preferenceResult.response[ 0 ].values.values;
                let objs = [];
                ctx.ProgramViewPreferenceMap = {};
                for( let i = 0; i < preferenceProp.length; i++ ) {
                    let objName = preferenceProp[ i ].split( '.' )[ 0 ];
                    let propertyName = preferenceProp[ i ].split( '.' )[ 1 ];
                    let indexOfObj = objs.indexOf( objName );

                    if( indexOfObj === -1 ) {
                        objs.push( objName );
                    }
                    if( ctx.ProgramViewPreferenceMap[ objName ] === undefined ) { ctx.ProgramViewPreferenceMap[ objName ] = []; }
                    ctx.ProgramViewPreferenceMap[ objName ].push( propertyName );
                }
                soaSvc.postUnchecked( 'Core-2015-10-Session', 'getTypeDescriptions2', {
                    typeNames: objs,
                    options: {}
                } ).then( function( descResult ) {
                    if( descResult.types ) {
                        ctx.ProgramViewTypesMap = {};
                        ctx.ProgramViewPropertiesMap = {};
                        for( let k = 0; k < descResult.types.length; k++ ) {
                            ctx.ProgramViewTypesMap[ descResult.types[ k ].name ] = descResult.types[ k ].displayName;
                            ctx.ProgramViewPropertiesMap[ descResult.types[ k ].name ] = descResult.types[ k ].propertyDescriptors;
                        }
                        if( noDisplay ) {
                            exports.displayPropertyPreferencesAction( objs[ 0 ], ctx, data );
                        }
                    }
                } );
            }
        } );
    } else if( noDisplay ) {
        exports.displayPropertyPreferencesAction( typeInternalName, ctx, data );
    }
};

/**
 * check for 'Work Complete Percent' value criteria
 *
 * @param {data} data - The current data of the viewModel
 * @param {object} genericWidget - The current active widget
 * @returns {boolean} true/false
 */
var checkForWorkCompletePercentCriteria = function( data, genericWidget ) {
    if( data.currentFieldValueType.dbValue === 'DOUBLE' && data.propertyContext.dbValue.split( '.' )[ 1 ] === 'complete_percent' ) {
        if( genericWidget.dbValue <= 100 && genericWidget.dbValue >= 0 ) {
            return false;
        }
        eventBus.publish( 'Saw1ProgramViewFilter.workCompletePercentError' );
        let deferred = AwPromiseService.instance.defer();
        deferred.reject( data.i18n.workCompletePercentErrorMsg );
        return true;
    }
    return false;
};

/**
 * check for value Widget Empty or Not .
 *
 * @param {data} data - The current data of view model
 * @param {object} genericWidget - The current active widget
 * @returns {boolean} true/false
 */
var checkWidgetEmptyOrNot = function( data, genericWidget ) {
    if( genericWidget.type === 'DATE' ) {
        if( genericWidget.dbValue > 0 ) {
            return false;
        }
    } else if( genericWidget.dbValue || genericWidget.dbValue === 0 || genericWidget.dbValue === false ) { // false is added to support boolean type
        return false;
    }
    eventBus.publish( 'Saw1ProgramViewFilter.fieldsEmptyError' );
    let deferred = AwPromiseService.instance.defer();
    deferred.reject( data.i18n.fieldsEmptyErrorMsg );
    return true;
};

var calculateHoursValue = function( hoursStringdbValue, duration ) {
    let hoursValue = '';
    let len = hoursStringdbValue.length;
    if( duration === 'w' ) {
        hoursValue = hoursStringdbValue.substring( 0, len - 1 ) * 5 * 8;
    } else if( duration === 'd' ) {
        hoursValue = hoursStringdbValue.substring( 0, len - 1 ) * 8;
    } else if( duration === 'h' ) {
        hoursValue = hoursStringdbValue.substring( 0, len - 1 );
    } else if( duration === 'mo' ) {
        hoursValue = hoursStringdbValue.slice( 0, -2 ) * 20 * 8;
    }
    return hoursValue;
};
/**
 * Calculate and return the value of the work effort.
 *
 * @param {string} hoursStringdbValue - Value of the Work Effort in the Add Schedule Task panel
 * @returns {boolean} true/false
 */
var getHoursValue = function( hoursStringdbValue ) {
    let len = hoursStringdbValue.length;
    let duration = hoursStringdbValue.slice( -1 ).toLowerCase();

    if( duration === 'h' || duration === 'd' || duration === 'w' ) {
        if( /^\d*[0-9](\.\d*[0-9])?$/.test( hoursStringdbValue.substring( 0, len - 1 ) ) === false ) {
            return false;
        }
        return calculateHoursValue( hoursStringdbValue, duration );
    }
    duration = hoursStringdbValue.slice( -2 ).toLowerCase();
    if( duration === 'mo' ) {
        if( /^\d*[0-9](\.\d*[0-9])?$/.test( hoursStringdbValue.substring( 0, len - 2 ) ) === false ) {
            return false;
        }
        return calculateHoursValue( hoursStringdbValue, duration );
    }
    return false;
};

/**
 * Check For Valid Hours Data
 *
 * @param {object} genericWidget - The qualified data of the viewModel
 * @param {string} unitOfTimeMeasure - Unit of Time Measure value
 * @returns {number} number
 */
var getHoursComplete = function( genericWidget, unitOfTimeMeasure ) {
    let hoursStringdbValue = genericWidget.dbValue.toString();
    let hoursStringValue = hoursStringdbValue.replace( / /g, '' );
    let workHours = 1;
    if( hoursStringValue !== '' ) {
        if( /^\d*[0-9](\.\d*[0-9])?$/.test( hoursStringValue ) ) {
            hoursStringdbValue += unitOfTimeMeasure;
        }
        workHours = getHoursValue( hoursStringdbValue );
    }
    return workHours;
};

/**
 * Check For Valid Hours Data
 *
 * @param {ctx} ctx - The qualified ctx of the viewModel
 * @param {object} data - The qualified data of the viewModel
 * @param {widget} genericWidget - Unit of Time Measure value
 * @returns {boolean} true/false
 */
var checkForHoursCriteria = function( ctx, data, genericWidget ) {
    let internalName = data.propertyContext.dbValue.split( '.' )[ 1 ];

    if( internalName === 'work_complete' || internalName === 'duration' || internalName === 'work_estimate' ) {
        if( genericWidget.dbValue ) {
            let workHours = getHoursComplete( genericWidget, 'h' );
            if( workHours ) {
                genericWidget.dbValue = workHours;
                return false;
            }
        }
        eventBus.publish( 'Saw1ProgramViewFilter.invalidHoursError' );
        let deferred = AwPromiseService.instance.defer();
        deferred.reject( data.i18n.invalidHoursErrorMsg );
        return true;
    }
    return false;
};

/**
 * checkForValidations
 *
 * @param {var} i - The index
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The qualified data of the viewModel
 * @param {boolean} generateUid - Whether to generate UID or not
 * @returns {boolean} true/false
 */
var checkForValidations = function( i, ctx, data, generateUid ) {
    let localisedTo = ' ' + data.i18n.to + ' ';
    data.ProgramViewFiltersConditions[ i ].conditionName = i === 0 ? 'And' : data.conditionContext.dbValue;
    data.ProgramViewFiltersConditions[ i ].conditionDisplayName = i === 0 ? data.i18n.and : data.conditionContext.uiValue;
    data.ProgramViewFiltersConditions[ i ].typeName = data.typeContext.dbValue;
    data.ProgramViewFiltersConditions[ i ].typeDisplayName = data.typeContext.uiValue;
    data.ProgramViewFiltersConditions[ i ].propertyQName = data.propertyContext.dbValue;
    data.ProgramViewFiltersConditions[ i ].propertyDisplayName = data.propertyContext.uiValue;
    data.ProgramViewFiltersConditions[ i ].operatorName = data.operatorTypeContext.dbValue;
    data.ProgramViewFiltersConditions[ i ].operatorDisplayName = data.operatorTypeContext.uiValue;

    if( data.currentFieldValueType.dbValue === 'LISTBOX' ) {
        if( checkWidgetEmptyOrNot( data, data.genericValueContext ) ) {
            return false;
        }
        data.ProgramViewFiltersConditions[ i ].value = data.genericValueContext.uiValue.toString();
        data.ProgramViewFiltersConditions[ i ].internalValue = data.genericValueContext.dbValue.toString();

        if( data.currentConditionValueType.dbValue ) {
            if( checkWidgetEmptyOrNot( data, data.genericEndValueContext ) ) {
                return false;
            }
            data.ProgramViewFiltersConditions[ i ].value += localisedTo + data.genericEndValueContext.uiValue.toString();
            data.ProgramViewFiltersConditions[ i ].internalValue += ',' + data.genericEndValueContext.dbValue.toString();
        }
    } else {
        if( data.currentFieldValueType.dbValue === 'DATE' ) {
            if( checkWidgetEmptyOrNot( data, data.genericWidget ) ) {
                return false;
            }
            let date = new Date( parseInt( data.genericWidget.dbValue ) );
            let formatDate = dateTimeSvc.formatDate( date, data.genericWidget.dateApi.dateFormatPlaceholder );
            data.ProgramViewFiltersConditions[ i ].value = formatDate;
            data.ProgramViewFiltersConditions[ i ].internalValue = dateTimeSvc.formatUTC( date );
            if( data.currentConditionValueType.dbValue ) {
                if( checkWidgetEmptyOrNot( data, data.genericEndWidget ) ) {
                    return false;
                }
                if( data.genericEndWidget.dbValue >= 0 ) {
                    let endDate = new Date( parseInt( data.genericEndWidget.dbValue ) );
                    let formatEndDate = dateTimeSvc.formatDate( endDate, data.genericEndWidget.dateApi.dateFormatPlaceholder );
                    data.ProgramViewFiltersConditions[ i ].value += localisedTo + formatEndDate;
                    data.ProgramViewFiltersConditions[ i ].internalValue += ',' + dateTimeSvc.formatUTC( endDate );
                }
            }
        } else if( data.currentFieldValueType.dbValue === 'PANEL' ) {
            data.filterResourceValue.dbValue === '' ? data.ProgramViewFiltersConditions[ i ].value = 'Unassigned' : data.ProgramViewFiltersConditions[ i ].value = data.filterResourceValue.dbValue;
            data.filterResourceValue.dbValue === '' ? data.ProgramViewFiltersConditions[ i ].internalValue = 'Unassigned' : data.ProgramViewFiltersConditions[ i ].internalValue = data.filterResourceValue.dbValue;
        } else {
            let internalName = data.propertyContext.dbValue.split( '.' )[ 1 ];
            if( internalName !== 'object_name' && internalName !== 'ResourceAssignment' && internalName !== 'object_desc' ) {
                if( checkWidgetEmptyOrNot( data, data.genericWidget ) ) {
                    return false;
                }
                if( checkForWorkCompletePercentCriteria( data, data.genericWidget ) || checkForHoursCriteria( ctx, data, data.genericWidget ) ) {
                    return false;
                }
                data.ProgramViewFiltersConditions[ i ].value = data.genericWidget.uiValue.toString();
                data.ProgramViewFiltersConditions[ i ].internalValue = data.genericWidget.dbValue.toString();
            } else {
                data.ProgramViewFiltersConditions[ i ].value = data.genericWidget.uiValue;
                data.ProgramViewFiltersConditions[ i ].internalValue = data.genericWidget.dbValue;
            }
            if( data.currentConditionValueType.dbValue ) {
                if( checkForWorkCompletePercentCriteria( data, data.genericEndWidget ) || checkForHoursCriteria( ctx, data, data.genericEndWidget ) ) {
                    return false;
                }
                if( checkWidgetEmptyOrNot( data, data.genericEndWidget ) ) {
                    return false;
                }
                data.ProgramViewFiltersConditions[ i ].value += localisedTo + data.genericEndWidget.uiValue.toString();
                data.ProgramViewFiltersConditions[ i ].internalValue += ',' + data.genericEndWidget.dbValue.toString();
            }
        }
    }
    if( generateUid ) {
        data.ProgramViewFiltersConditions[ i ].uid = Math.floor( Math.random() * 10000 + 1 ); // Uid generation for New Condition
    }
    return true;
};

/**
 * Edit filter condition when clicked on the remove cell.
 *
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The qualified data of the viewModel
 * @returns {boolean} true/false
 */
var editFromProgramViewConditionsCtx = function( ctx, data ) {
    for( let i = 0; i < data.ProgramViewFiltersConditions.length; i++ ) {
        let cond = data.ProgramViewFiltersConditions[ i ];
        if( cond.uid === _editCondition.uid ) {
            if( !checkForValidations( i, ctx, data ) ) {
                return false;
            }
            break;
        }
    }
    resetWidgets( data );
    return true;
};

var addResource = function( ctx, data, selectedTab, newAdd ) {
    let valueSection = {};
    if( selectedTab === 'UserSub' ) {
        if ( data.dataProviders.userPerformSearch.selectedObjects.length ) {
            if ( newAdd ) {
                ctx.ProgramViewFilterConditonForEdit = data.dataProviders.userPerformSearch.selectedObjects[ 0 ];
            }
            let internalValue = data.dataProviders.userPerformSearch.selectedObjects[ 0 ].props.user.uiValues[0].split( ' (' )[1];
            valueSection = {
                key: data.ValueSection.dbValue,
                value: internalValue.split( ')' )[0]
            };
        }
    } else if( selectedTab === 'Saw1AddResourcePoolToSchedule' ) {
        if ( data.dataProviders.getResourcePool.selectedObjects.length ) {
            if ( newAdd ) {
                ctx.ProgramViewFilterConditonForEdit = data.dataProviders.getResourcePool.selectedObjects[ 0 ];
            }
            valueSection = {
                key: data.ValueSection.dbValue,
                value: data.dataProviders.getResourcePool.selectedObjects[0].props.object_string.dbValue
            };
        }
    } else if( selectedTab === 'Saw1AddDisciplinesToSchedule' ) {
        if ( data.dataProviders.getDisciplines.selectedObjects.length ) {
            if ( newAdd ) {
                ctx.ProgramViewFilterConditonForEdit = data.dataProviders.getDisciplines.selectedObjects[ 0 ];
            }
            valueSection = {
                key: data.ValueSection.dbValue,
                value: data.dataProviders.getDisciplines.selectedObjects[0].cellHeader1
            };
        }
    }
    ctx.ProgramViewFilterConditonForEdit.cellProperties = {
        Condition : {
            key: data.conditionSection.dbValue,
            value: data.conditionContext.uiValue
        },
        Type : {
            key: data.typeSection.dbValue,
            value: data.typeContext.uiValue
        },
        Property : {
            key: data.propertySection.dbValue,
            value: data.propertyContext.uiValue
        },
        Operator : {
            key: data.operatorSection.dbValue,
            value: data.operatorTypeContext.uiValue
        },
        Value : valueSection
    };

    let context = {
        destPanelId: 'Saw1ProgramAddFilters',
        title: data.i18n.addFilter,
        recreatePanel: false,
        supportGoBack: true
    };
    eventBus.publish( 'awPanel.navigate', context );
    eventBus.publish( 'selectionChangeOfPropertyContext', data );
};

export let editProgramViewCondition = function( ctx, data, selectedTab ) {
    if( selectedTab ) {
        if ( ctx.ProgramViewFilterConditonForEdit ) {
            addResource( ctx, data, selectedTab );
        } else {
            ctx.ProgramViewFilterConditonForEdit = {
                cellProperties: {}
            };
            addResource( ctx, data, selectedTab, true );
            _addResource = ctx.ProgramViewFilterConditonForEdit;
        }
        _resetEditWidgets = false;
    }
};

/**
 * Add the Program view filter condition to ctx
 *
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The qualified data of the viewModel
 * @returns {Object} test
 */
export let addProgramViewConditionToCtx = function( ctx, data ) {
    if( !data.ProgramViewFiltersConditions ) {
        data.ProgramViewFiltersConditions = [];
    }
    let deferred = AwPromiseService.instance.defer();
    if( ctx.ProgramViewFilterConditonForEdit && _addResource === null ) {
        _editCondition = ctx.ProgramViewFilterConditonForEdit;
        if( !editFromProgramViewConditionsCtx( ctx, data ) ) {
            return deferred.promise;
        }
        ctx.ProgramViewFilterConditonForEdit = [];
        _editCondition = null;
    } else {
        let length = data.ProgramViewFiltersConditions.length;
        data.ProgramViewFiltersConditions[ length ] = [];

        if( !checkForValidations( length, ctx, data, true ) ) {
            data.ProgramViewFiltersConditions.pop();
            return deferred.promise;
        }
    }
    _addResource = null;
    _resetEditWidgets = false;
    exports.cleanUpEdit( ctx );
    let destPanelId = 'Saw1ProgramViewFilterSub';
    let context = {
        destPanelId: destPanelId,
        recreatePanel: true
    };
    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * Edit condition when clicked on the edit cell.
 *
 * @param {ctx} ctx - The condition available for edit
 * @param {data} data - The qualified data of the viewModel
 *
 */
export let editProgramViewFilterConditon = function( ctx, data ) {
    if( ctx.ProgramViewFilterConditonForEdit ) {
        data.conditionContext.dbValue = data.ProgramViewFiltersConditions.length === 1 ? 'And' : ctx.ProgramViewFilterConditonForEdit.cellHeaderInternalValue;
        data.conditionContext.uiValue = data.ProgramViewFiltersConditions.length === 1 ? data.i18n.and : ctx.ProgramViewFilterConditonForEdit.cellHeader1;
        data.typeContext.dbValue = ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.typeSection.dbValue ].internalValue;
        data.typeContext.uiValue = ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.typeSection.dbValue ].value;
        data.propertyContext.dbValue = ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.propertySection.dbValue ].internalValue;
        data.propertyContext.uiValue = ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.propertySection.dbValue ].value;
        data.operatorTypeContext.dbValue = ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.operatorSection.dbValue ].internalValue;
        data.operatorTypeContext.uiValue = ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.operatorSection.dbValue ].value;
        var typeInternalName = smConstants.PROGRAM_VIEW_VALID_OBJECT_LIST[ data.typeContext.dbValue ];
        typeInternalName = typeInternalName ? typeInternalName : data.typeContext.dbValue;
        exports.getPropertyPreferences( typeInternalName, ctx, data, true );
    }
};

/**
 * Clean up the registers
 *
 * @param {ctx} ctx - The ctx of the viewModel
 */
export let cleanUpEdit = function( ctx ) {
    if( ctx.ProgramViewFilterConditonForEdit ) {
        appCtxService.unRegisterCtx( 'ProgramViewFilterConditonForEdit' );
        _editCondition = null;
    }
};

export let getPropertyPreferenceForFilters = function( ctx, data ) {
    if( ctx.programViewConfiguration ) {
        let programViewConfiguration = ctx.programViewConfiguration.configFromSOA;
        if( programViewConfiguration.filterSets ) {
            let filterSetLength = programViewConfiguration.filterSets.length;
            if( filterSetLength > 0 ) {
                if( programViewConfiguration.filterSets[ 0 ].filters.length > 0 ) {
                    exports.getPropertyPreferences( programViewConfiguration.filterSets[ 0 ].filters[ 0 ].attributeName.split( '.' )[ 0 ], ctx, data, false );
                    return;
                }
            }
        }
        exports.getPropertyPreferences( 'ScheduleTask', ctx, data, false );
    }
};

export let removeResource = function( filterResourceValue ) {
    filterResourceValue.dbValue = '';
    filterResourceValue.uiValue = '';
};

export let saveResourceSelectionValues = function( ctx, data ) {
    if( ctx.ProgramViewFilterConditonForEdit ) {
        ctx.ProgramViewFilterConditonForEdit.cellHeaderInternalValue = data.conditionContext.dbValue;
        ctx.ProgramViewFilterConditonForEdit.cellHeader1 = data.conditionContext.uiValue;
        ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.typeSection.dbValue ].internalValue = data.typeContext.dbValue;
        ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.typeSection.dbValue ].value = data.typeContext.uiValue;
        ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.propertySection.dbValue ].internalValue = data.propertyContext.dbValue;
        ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.propertySection.dbValue ].value = data.propertyContext.uiValue;
        ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.operatorSection.dbValue ].internalValue = data.operatorTypeContext.dbValue;
        ctx.ProgramViewFilterConditonForEdit.cellProperties[ data.operatorSection.dbValue ].value = data.operatorTypeContext.uiValue;
        resetWidgets( data );
    }
};

export default exports = {
    populatePriorties,
    populateStateOrStatus,
    selectionChangeOfOperatorContext,
    populateTypeNames,
    selectionChangeOfTypeContext,
    selectionChangeOfPropertyContext,
    displayPropertyPreferencesAction,
    getFilterBOType,
    getPropertyPreferences,
    addProgramViewConditionToCtx,
    editProgramViewFilterConditon,
    cleanUpEdit,
    getPropertyPreferenceForFilters,
    editProgramViewCondition,
    removeResource,
    saveResourceSelectionValues
};
/**
 * This factory creates a service and returns exports
 *
 * @param {object} appCtxService - The ctx Service
 * @param {object} smConstants - The Schedule manager constants
 * @param {object} soaSvc - The Soa Service
 * @param {object} dateTimeSvc - The date time service
 * @param {object} $q -
 * @returns {exports} exports
 *
 * @memberof NgServices
 * @member Saw1ProgramAddFilterService
 */
app.factory( 'Saw1ProgramAddFilterService', () => exports );
