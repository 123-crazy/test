// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */
import eventBus from 'js/eventBus';

'use strict';

/**
 * @module js/recipeOperatorService
 */

/**
 * This method adds the click action on the data
 *
 * @param {Object} data view model data
 *
 */
export let initializeClickListener = function( data ) {
    data.recipeLogicClickAction = function( currentSelection, index, event ) {
        var selectedRecipeOperator = event.currentTarget.id;
                    if( selectedRecipeOperator !== currentSelection ) {
                        eventBus.publish( 'operatorModified', {
                            recipeIndex: index,
                            criteriaOperatorType: selectedRecipeOperator
                        } );
                        eventBus.publish( 'popupService.hide' );
                    }
    };
};

export default {
    initializeClickListener
};
