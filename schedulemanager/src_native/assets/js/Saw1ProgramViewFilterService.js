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
 * @module js/Saw1ProgramViewFilterService
 */
import app from 'app';
import selectionService from 'js/selection.service';
import appCtxService from 'js/appCtxService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import smConstants from 'js/ScheduleManagerConstants';
import prgDataProcessor from 'js/Saw1ProgramViewDataProcessor';
import prgDataSource from 'js/Saw1ProgramViewDataSource';
import dateTimeSvc from 'js/dateTimeService';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import 'soa/kernel/clientDataModel';
import commandPanelService from 'js/commandPanel.service';

var exports = {};

export let parseProgramViewSOAResponse = function( response, ctx, data ) {
    prgDataProcessor.instance.clearAndReInitGantt( response, ctx, data, smConstants.MANAGE_PRG_VIEW_SOA_OP_TYPE_LOAD_USING_CONFIG );
};
export let getReferenceTaskUid = function( data ) {
    return prgDataSource.instance.getReferenceTaskUid( data );
};
export let getParentTaskUid = function( data, ctx ) {
    return prgDataSource.instance.getParentTaskUid( data, ctx );
};

export let getProgramViewObject = function( ctx ) {
    return prgDataSource.instance.getProgramViewObject( ctx );
};

/**
 * getProgramViewConfiguration to fetch the results
 *
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data for manageProgramView SOA.
 * @returns {object} programViewConfiguration for manageProgramView SOA.
 */
export let getProgramViewConfiguration = function( ctx, data ) {
    let conditions = data.ProgramViewFiltersConditions;
    let filterSets = [];
    let filterSet = {
        filters: []
    };
    if( conditions ) {
        for( let i = 0; i < conditions.length; i++ ) {
            let criteria = smConstants.PROGRAM_VIEW_CRITERIA_TYPE_LIST[ conditions[ i ].operatorName ];
            if( !criteria ) {
                criteria = conditions[ i ].operatorName;
            }
            let propertyName = conditions[ i ].propertyQName.split( '.' )[ 1 ];

            let filterObj = {
                attributeName: conditions[ i ].propertyQName,
                criteria: criteria,
                filterValue: propertyName === 'ResourceAssignment' && conditions[ i ].internalValue === 'Unassigned' ? '' : conditions[ i ].internalValue
            };
            if( conditions[ i ].conditionName === 'Or' ) {
                filterSets.push( filterSet );
                filterSet = {
                    filters: []
                };
            }
            filterSet.filters.push( filterObj );
        }
        filterSets.push( filterSet );
    }
    var programViewConfiguration = ctx.programViewConfiguration.configFromSOA;
    programViewConfiguration.filterSets = filterSets;
    return programViewConfiguration;
};
/**
 * Display the Program View Filter Panel
 *
 * @param {commandId} commandId - Command Id of Panel
 * @param {location} location - location of Panel
 */
export let getProgramViewFilterPanel = function( commandId, location ) {
    let ProgramViewFilter = 'ProgramView';
    let selection = selectionService.getSelection().selected;

    if( selection && selection.length > 0 ) {
        let ProgramViewFilterObj = {
            selectedObject: selection[ 0 ]
        };
        appCtxService.registerCtx( ProgramViewFilter, ProgramViewFilterObj );
    } else {
        appCtxService.unRegisterCtx( ProgramViewFilter );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};

/**
 * Reset Widgets db values
 *
 * @param {data} data - The data of view model
 */
var resetWidgets = function( data ) {
    if( data.genericWidget ) { data.genericWidget.dbValue = null; }
    if( data.genericEndWidget ) { data.genericEndWidget.dbValue = null; }
};

var setFieldName = function( ctx, index, typePropName, data ) {
    let boType = typePropName.split( '.' )[ 0 ];
    let propName = typePropName.split( '.' )[ 1 ];

    data.ProgramViewFiltersConditions[ index ].typeName = boType;
    data.ProgramViewFiltersConditions[ index ].propertyQName = typePropName; // Qualified property name

    if( ctx.ProgramViewTypesMap )
    {
        data.ProgramViewFiltersConditions[ index ].typeDisplayName = ctx.ProgramViewTypesMap[ boType ];
    }

    if( ctx.ProgramViewPropertiesMap ) {
        let prefProperties = ctx.ProgramViewPropertiesMap[ boType ];
        for( let k = 0; k < prefProperties.length; k++ ) {
            if( prefProperties[ k ].name === propName ) {
                data.ProgramViewFiltersConditions[ index ].propertyDisplayName = prefProperties[ k ].displayName;
                data.ProgramViewFiltersConditions[ index ].uid = Math.floor( Math.random() * 10000 + 1 ); // Uid generation for New Condition
                break;
            }
        }
    }
};

var setFieldValue = function( ctx, index, internalValue, typePropName, data ) {
    let propertyName = typePropName.split( '.' )[ 1 ];
    let localisedTo = ' ' + data.i18n.to + ' ';

    data.ProgramViewFiltersConditions[ index ].internalValue = internalValue;

    if( propertyName === 'actual_start_date' || propertyName === 'actual_finish_date' || propertyName === 'start_date' || propertyName === 'finish_date' ) {
        let startDate = internalValue.split( ',' )[ 0 ];
        let endDate = internalValue.split( ',' )[ 1 ];
        if( startDate ) {
            data.ProgramViewFiltersConditions[ index ].value = dateTimeSvc.formatDate( new Date( startDate ), 'DD-MMM-YYYY' );
        }
        if( endDate ) {
            data.ProgramViewFiltersConditions[ index ].value += localisedTo + dateTimeSvc.formatDate( new Date( endDate ), 'DD-MMM-YYYY' );
        }
    } else if( propertyName === 'ResourceAssignment' ) {
        if( internalValue === '' ) {
            data.ProgramViewFiltersConditions[ index ].internalValue = 'Unassigned';
            data.ProgramViewFiltersConditions[ index ].value = data.i18n.Saw1Unassigned;
        } else {
            data.ProgramViewFiltersConditions[ index ].value = internalValue;
        }
    } else {
        data.ProgramViewFiltersConditions[ index ].value = internalValue;
        let startValue = internalValue.split( ',' )[ 0 ];
        let endValue = internalValue.split( ',' )[ 1 ];
        if( startValue ) {
            data.ProgramViewFiltersConditions[ index ].value = startValue;
        }
        if( endValue ) {
            data.ProgramViewFiltersConditions[ index ].value += localisedTo + endValue;
        }
    }
};

/**
 * Populate the Program View Filters panel data based ProgramViewFiltersConditions registered in ctx.
 *
 * @param {dataProvider} dataProvider - The current dataProvider of the viewModel
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The qualified data of the viewModel
 */
export let getProgramViewConditions = function( dataProvider, ctx, data ) {
    if( data.activeView === 'Saw1ProgramViewFilterSub' ) {
        if( ctx.programViewConfiguration ) {
            let programViewConfiguration = ctx.programViewConfiguration.configFromSOA;
            if( programViewConfiguration.filterSets.length > 0 && !data.ProgramViewFiltersConditions ) {
                data.ProgramViewFiltersConditions = [];
                let filterSetLength = programViewConfiguration.filterSets.length;
                let count = 0;
                for( let j = 0; j < filterSetLength; j++ ) {
                    let filtersLength = programViewConfiguration.filterSets[ j ].filters.length;
                    for( let k = 0; k < filtersLength; k++ ) {
                        data.ProgramViewFiltersConditions[ count ] = [];
                        if( j === 0 || k !== 0 ) {
                            data.ProgramViewFiltersConditions[ count ].conditionName = 'And';
                            data.ProgramViewFiltersConditions[ count ].conditionDisplayName = data.i18n.and;
                        } else if( j !== 0 && k === 0 ) {
                            data.ProgramViewFiltersConditions[ count ].conditionName = 'Or';
                            data.ProgramViewFiltersConditions[ count ].conditionDisplayName = data.i18n.or;
                        }

                        let filter = programViewConfiguration.filterSets[ j ].filters[ k ];
                        let typePropName = filter.attributeName;
                        setFieldName( ctx, count, typePropName, data );

                        let operatorName = smConstants.PROGRAM_VIEW_CRITERIA_INTERNAL_NAME_LIST[ filter.criteria ];
                        data.ProgramViewFiltersConditions[ count ].operatorName = operatorName;
                        data.ProgramViewFiltersConditions[ count ].operatorDisplayName = data.i18n[ smConstants.PROGRAM_VIEW_CRITERIA_i18n_KEY_MAP[ operatorName ] ];
                        setFieldValue( ctx, count, filter.filterValue, typePropName, data );
                        count++;
                    }
                }
            }
        }
        if( data.ProgramViewFiltersConditions ) {
            for( let i = 0; i < data.ProgramViewFiltersConditions.length; i++ ) {
                if( dataProvider ) {
                    let mObj = viewModelObjectSvc.createViewModelObject( i + 1, 'EDIT' );
                    mObj = {
                        cellProperties: {}
                    };
                    mObj.uid = data.ProgramViewFiltersConditions[ i ].uid;
                    if ( i !== 0 ) {
                        mObj.cellHeader1 = data.ProgramViewFiltersConditions[ i ].conditionDisplayName;
                        mObj.cellHeaderInternalValue = data.ProgramViewFiltersConditions[ i ].conditionName;
                    }
                    mObj.cellProperties[ data.typeSection.dbValue ] = {
                        key: data.typeSection.uiValue,
                        value: data.ProgramViewFiltersConditions[ i ].typeDisplayName,
                        internalValue: data.ProgramViewFiltersConditions[ i ].typeName
                    };

                    mObj.cellProperties[ data.propertySection.dbValue ] = {
                        key: data.propertySection.uiValue,
                        value: data.ProgramViewFiltersConditions[ i ].propertyDisplayName,
                        internalValue: data.ProgramViewFiltersConditions[ i ].propertyQName
                    };

                    mObj.cellProperties[ data.operatorSection.dbValue ] = {
                        key: data.operatorSection.uiValue,
                        value: data.ProgramViewFiltersConditions[ i ].operatorDisplayName,
                        internalValue: data.ProgramViewFiltersConditions[ i ].operatorName
                    };

                    mObj.cellProperties[ data.ValueSection.dbValue ] = {
                        key: data.ValueSection.uiValue,
                        value: data.ProgramViewFiltersConditions[ i ].value,
                        internalValue: data.ProgramViewFiltersConditions[ i ].internalValue
                    };
                    mObj.typeIconURL = app.getBaseUrlPath() + '/image/cmdFilterActive24.svg';
                    dataProvider.viewModelCollection.loadedVMObjects.push( mObj );
                }
            }
        } else {
            data.ProgramViewFiltersConditions = [];
        }
    }
};
/**
 * Remove Filter Condition when clicked on the remove cell.
 *
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The qualified data of the viewModel
 * @param {object} deletedUid - The Uid to be deleted
 * @returns {boolean} true/false
 */
var removeFromProgramViewConditionsCtx = function( ctx, data, deletedUid ) {
    for( let i = 0; i < data.ProgramViewFiltersConditions.length; i++ ) {
        let cond = data.ProgramViewFiltersConditions[ i ];
        if( cond.uid === deletedUid ) {
            data.ProgramViewFiltersConditions.splice( i, 1 );
            break;
        }
    }
    resetWidgets( data );
    return true;
};

/**
 * Remove condition called when clicked on the remove cell.
 *
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The qualified data of the viewModel
 * @param {object} deletedUid - The Uid to be deleted
 */
export let removeCondition = function( ctx, data, deletedUid ) {
    let removeConditionUid = [];
    removeConditionUid.push( deletedUid );
    let memberModelObjects = data.dataProviders.getProgramViewConditions.viewModelCollection.loadedVMObjects;

    let modelObjects = $.grep( memberModelObjects, function( eachObject ) {
        return $.inArray( eachObject.uid, removeConditionUid ) === -1;
    } );
    data.dataProviders.getProgramViewConditions.update( modelObjects );
    removeFromProgramViewConditionsCtx( ctx, data, deletedUid );
};

/**
 * Execute the delete command.
 * Used to delete condition for Program Filter View
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {data} data - The qualified data of the viewModel
 */
export let deleteProgramViewCondition = function( vmo, data ) {
    if( vmo && vmo.uid && data ) {
        data.vmo = vmo;
        eventBus.publish( 'Saw1ProgramViewFilterSub.removeCondition', data );
    }
};

/**
 * Execute the edit command.
 * Edit condition functionality
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {data} data - The qualified data of the viewModel
 */
export let editProgramViewCondition = function( vmo, data ) {
    if( vmo && vmo.uid ) {
        if( !appCtxService.ctx.ProgramViewFilterConditonForEdit ) {
            appCtxService.registerCtx( 'ProgramViewFilterConditonForEdit', [] );
        }
        appCtxService.ctx.ProgramViewFilterConditonForEdit = _.cloneDeep( vmo );

        let destPanelId = 'Saw1ProgramAddFilters';
        let context = {
            destPanelId: destPanelId,
            title: data.i18n.addFilter,
            recreatePanel: true,
            supportGoBack: true
        };
        eventBus.publish( 'awPanel.navigate', context );
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
    }
};

exports = {
    parseProgramViewSOAResponse,
    getReferenceTaskUid,
    getParentTaskUid,
    getProgramViewObject,
    getProgramViewConfiguration,
    getProgramViewFilterPanel,
    getProgramViewConditions,
    removeCondition,
    deleteProgramViewCondition,
    editProgramViewCondition,
    cleanUpEdit
};

export default exports;
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Saw1ProgramViewFilterService
 */
app.factory( 'Saw1ProgramViewFilterService', () => exports );
