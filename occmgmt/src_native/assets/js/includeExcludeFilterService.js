//@<COPYRIGHT>@
//==================================================
//Copyright 2021.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/includeExcludeFilterService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import localeService from 'js/localeService';
import objectToCSIDGeneratorService from 'js/objectToCSIDGeneratorService';

var exports = {};

/**
 * Function to apply selected element recipe
 * trigger acePwa.reset event to reload content
 */
export let applySelectedElementFilterInRecipe = function() {
    var selected = appCtxSvc.ctx.aceActiveContext.context.selectedModelObjects;

    var selectedObjCloneIds = [];
    var selectedObjUiValues = [];

    for( var i = 0; i < selected.length; i++ ) {
        if( selected.length > 0 ) {
            selectedObjCloneIds[ i ] = objectToCSIDGeneratorService.getCloneStableIdChain( selected[ i ] );
            selectedObjUiValues[ i ] = selected[ i ].props.awb0Archetype.uiValues[ 0 ];
        }
    }

    var displayString = createTransientSelectedElementDisplayString( selectedObjUiValues );
    var selectedElementCriteria = {
        criteriaType: 'SelectedElement',
        criteriaOperatorType: appCtxSvc.ctx.panelContext.operation,
        criteriaDisplayValue: displayString,
        criteriaValues: selectedObjCloneIds,
        subCriteria: []
    };

    // Trigger the event to update selected element recipe
    eventBus.publish( 'discoveryFilter.recipeAdded', {
        addedRecipe: selectedElementCriteria } );

    // Reset the operaation on panel context after the include/exclude
    appCtxSvc.ctx.panelContext.operation = '';
};

var createTransientSelectedElementDisplayString = function( selectedObjUiValues ) {
    var selectedString = '';
     if( selectedObjUiValues !== null && selectedObjUiValues.length > 0 ) {
        // Get the filter separator value from the preference AW_FacetValue_Separator
        var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[ 0 ] : '^';
        for( var i = 0; i < selectedObjUiValues.length; i++ ) {
            selectedString = selectedString.concat( selectedObjUiValues[ i ] );
            if ( i !== selectedObjUiValues.length - 1 ) {
                selectedString = selectedString.concat( filterSeparator );
            }
        }
        var resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/OccurrenceManagementSubsetConstants' );
        var selectedElementDisplayString = resource.selectedElementDisplayString + '_$CAT_' + selectedString;
    }
    return selectedElementDisplayString;
};

export default exports = {
        applySelectedElementFilterInRecipe
};
app.factory( 'includeExcludeFilterService', () => exports );
