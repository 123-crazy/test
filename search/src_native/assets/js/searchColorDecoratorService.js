//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/searchColorDecoratorService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import colorDecoratorService from 'js/colorDecoratorService';
import soa_kernel_soaService from 'soa/kernel/soaService';
import soa_preferenceService from 'soa/preferenceService';
import searchSnippetsService from 'js/searchSnippetsService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import 'js/filterPanelUtils';

var _coloToggleSubscription = null;

export let initializeColorDecors = function() {
    _coloToggleSubscription = eventBus.subscribe( 'condition.valueChanged', function( event ) {
        if( event.condition === 'conditions.isColorFilterSuported' ) {
            appCtxSvc.updatePartialCtx( 'supportsColorToggleCommand', event.newValue );
            soa_preferenceService.getStringValue( 'AWC_ColorFiltering' ).then( function( prefValue ) {
                if( prefValue === 'true' ) {
                    appCtxSvc.updatePartialCtx( 'decoratorToggle', true );
                }
            } );
        }
    } );
};

export let destroyColorDecors = function() {
    eventBus.unsubscribe( _coloToggleSubscription );
    appCtxSvc.updatePartialCtx( 'supportsColorToggleCommand', false );
};

var isChartColorapplicable = function( vmo, className ) {
    var isApplicable = ( !vmo.cellDecoratorStyle || !vmo.gridDecoratorStyle ) && ( appCtxSvc.ctx.search && appCtxSvc.ctx.searchResponseInfo &&
        appCtxSvc.ctx.searchResponseInfo.objectsGroupedByProperty );
    if( isApplicable ) {
        var groupedObjectsList = appCtxSvc.ctx.searchResponseInfo.objectsGroupedByProperty;
        if( groupedObjectsList && groupedObjectsList.groupedObjectsMap && groupedObjectsList.groupedObjectsMap.length > 0 ) {
            for( var key in groupedObjectsList.groupedObjectsMap[ 0 ] ) {
                if( vmo.uid === groupedObjectsList.groupedObjectsMap[ 0 ][ key ].uid && className === groupedObjectsList.groupedObjectsMap[ 1 ][ key ][ 0 ] ) {
                    return true;
                }
            }
        }
    }
    return false;
};

export let isChartColor1applicable = function( vmo ) {
    return isChartColorapplicable( vmo, 'aw-charts-chartColor1' );
};

export let isChartColor2applicable = function( vmo ) {
    return isChartColorapplicable( vmo, 'aw-charts-chartColor2' );
};

export let isChartColor3applicable = function( vmo ) {
    return isChartColorapplicable( vmo, 'aw-charts-chartColor3' );
};

export let isChartColor4applicable = function( vmo ) {
    return isChartColorapplicable( vmo, 'aw-charts-chartColor4' );
};

export let isChartColor5applicable = function( vmo ) {
    return isChartColorapplicable( vmo, 'aw-charts-chartColor5' );
};

export let isChartColor6applicable = function( vmo ) {
    return isChartColorapplicable( vmo, 'aw-charts-chartColor6' );
};

export let isChartColor7applicable = function( vmo ) {
    return isChartColorapplicable( vmo, 'aw-charts-chartColor7' );
};

export let isChartColor8applicable = function( vmo ) {
    return isChartColorapplicable( vmo, 'aw-charts-chartColor8' );
};

export let isChartColor9applicable = function( vmo ) {
    return isChartColorapplicable( vmo, 'aw-charts-chartColor9' );
};

export let getColorPrefValue = function() {
    if( soa_preferenceService.getLoadedPrefs().AWC_ColorFiltering ) {
        if( soa_preferenceService.getLoadedPrefs().AWC_ColorFiltering[ 0 ] === 'true' ) {
            return true;
        }
    }
    return false;
};
/**
 * @param {ViewModelObject|ViewModelObjectArray} vmos - ViewModelObject(s) to set style on.
 * @param {Boolean} clearStyles - true to clear the decorator styles.
 */
export let setDecoratorStyles = function( vmos, clearStyles ) {
    if( clearStyles ) {
        for( var key in vmos ) {
            vmos[ key ].cellDecoratorStyle = '';
            vmos[ key ].gridDecoratorStyle = '';
        }
    }
    colorDecoratorService.setDecoratorStyles( vmos );
};

/**
 * @param {ViewModelObjectArray} vmos - ViewModelObject(s) to set style on.
 */
export let groupObjectsByProperties = function( vmos ) {
    var ctx = appCtxSvc.ctx;
    searchSnippetsService.addSnippetsToVMO( vmos );
    if( ctx.decoratorToggle &&
        ctx.searchResponseInfo.objectsGroupedByProperty.groupedObjectsMap ) {
        exports.setDecoratorStyles( vmos, ctx.search.endIndex === ctx.search.defaultPageSize );
    } else {
        var propGroupingValues = ctx.searchResponseInfo.propGroupingValues;
        propGroupingValues = exports.removeEmptyPropertyGroupingValues( propGroupingValues );
        var typePropName = ctx.searchResponseInfo.objectsGroupedByProperty.internalPropertyName;
        if( ctx.decoratorToggle && typePropName && propGroupingValues ) {
            var propNameIndex = typePropName.indexOf( '.' );
            var propName = typePropName.substring( propNameIndex + 1 );
            var input = {
                objectPropertyGroupInputList: [ {
                    internalPropertyName: propName,
                    objectList: vmos,
                    propertyValues: propGroupingValues
                } ]
            };
            soa_kernel_soaService.postUnchecked( 'Query-2014-11-Finder', 'groupObjectsByProperties', input ).then(
                function( response ) {
                    if( response && response.groupedObjectsList ) {
                        appCtxSvc.updatePartialCtx( 'searchResponseInfo.objectsGroupedByProperty',
                            response.groupedObjectsList[ 0 ] );
                        exports.setDecoratorStyles( vmos, true );
                    }
                } );
        }
    }
};

/**
 * this function is to ensure that no empty propertyValue is sent to the groupObjectsByProperties call
 * @param {Array} propGroupingValues - the property values from context
 * @returns {Array} updatedPropGroupingValues - the property values which have empty propertyGroupID have been discarded
 */
export let removeEmptyPropertyGroupingValues = function( propGroupingValues ) {
    if( propGroupingValues ) {
        var updatedPropGroupingValues = [];
        for( var index = 0; index < propGroupingValues.length; index++ ) {
            var eachPropGroupingValue = propGroupingValues[ index ];
            if( eachPropGroupingValue && eachPropGroupingValue.propertyGroupID && eachPropGroupingValue.propertyGroupID !== '' ) {
                updatedPropGroupingValues.push( eachPropGroupingValue );
            }
        }
        return updatedPropGroupingValues;
    }
    return propGroupingValues;
};

const exports = {
    initializeColorDecors,
    destroyColorDecors,
    isChartColor1applicable,
    isChartColor2applicable,
    isChartColor3applicable,
    isChartColor4applicable,
    isChartColor5applicable,
    isChartColor6applicable,
    isChartColor7applicable,
    isChartColor8applicable,
    isChartColor9applicable,
    getColorPrefValue,
    setDecoratorStyles,
    groupObjectsByProperties,
    removeEmptyPropertyGroupingValues
};

export default exports;

app.factory( 'searchColorDecoratorService', () => exports );
