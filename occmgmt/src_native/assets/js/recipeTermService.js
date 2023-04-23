//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/**
 * @module js/recipeTermService
 */
import app from 'app';
import uwPropertyService from 'js/uwPropertyService';
import eventBus from 'js/eventBus';

var exports = {};

var _nSelectedText = null;

 /**
 * This method format Multi-Attribute recipe term to display on UI
 * Input string : "Logical Designator_$CAT_AAAA0*_$PROP_Name_$CAT_DE* "
 * formatted as  : "Logical Designator: AAAA0, Name: DE*
 *
 * @param {String} recipeDisplayName : Display Name for the recipe.
 * @return {String} : returns Strings for multiple attributes recipe term.
 */
export let getMultiAttributeRecipeTerm = function( recipeDisplayName ) {
    var recipeDisplayString = recipeDisplayName.replace( /_\$PROP_/g, ', ' );
    recipeDisplayString = recipeDisplayString.replace( /_\$CAT_/g, ': ' );

    return recipeDisplayString;
};


/**
* This method will extract the value for the input recipe criteria. For e.g., a
* partition name is a value for a physical partition type.
*
* @param {String} recipeDisplayName : Recipe Criteria Display Name
* @return {String} : The recipe value for the input recipe criteria.
*/
export let getRecipeValue = function( recipeDisplayName ) {
    var value = recipeDisplayName.split( '_$CAT_' );
    return value[ 1 ];
};

/**
 * This function will return the proximity recipe label as Within <distance><UOM> of <n> Selected
* eg
* input stream :Within 0.001 m of INTERIOR CK_SmartDiscovery/A;1-INTERIOR CK^POWERTRAIN DC_SmartDiscovery/A;1-POWERTRAIN DC
* output       :Within 0.001 m of 2 Selected
* @param {String}  nSelectedText : N selected text
* @param {String}  recipeDisplayName : Recipe Criteria Display Name
* @return {String}  proximity n selected label
*/
export let getProximityNSelectedLabel = function( nSelectedText, recipeDisplayName ) {
    var temp = recipeDisplayName;
    var selections = [];
    selections = temp.split( '^' );
    var pos = recipeDisplayName.indexOf( ' ' );
    for( var i = 1; i < 4; i++ ) {
            pos = recipeDisplayName.indexOf( ' ', pos + 1 );
    }
    var initialText = recipeDisplayName.slice( 0, pos + 1 );
    return initialText + selections.length + ' ' + nSelectedText;
};

/**
* This method will extract the Label for the input recipe criteria. For e.g., a
* partition Scheme Name is a Label for a selected physical partition type.
* For Proximity if isProximityTitle is true:
*   input stream :Within 0.001 m of INTERIOR CK_SmartDiscovery/A;1-INTERIOR CK^POWERTRAIN DC_SmartDiscovery/A;1-POWERTRAIN DC
*   output       :Within 0.001 m of INTERIOR CK_SmartDiscovery/A;1-INTERIOR CK
*                 POWERTRAIN DC_SmartDiscovery/A;1-POWERTRAIN DC
*
* For Proximity if isProximityTitle is false:
*      input stream :Within 0.001 m of INTERIOR CK_SmartDiscovery/A;1-INTERIOR CK^POWERTRAIN DC_SmartDiscovery/A;1-POWERTRAIN DC
*      output       :Within 0.001 m of 2 Selected
*
* @param {String} recipeItem : Recipe term to display
* @param {String} recipeDisplayName : Recipe Criteria Display Name
* @param {Boolean} isProximityTitle Optional :Is used to implement the title/extended tooltip for proximity
* @return {String} : The recipe Label for the input recipe criteria.
*/
export let getRecipeLabel = function( recipeItem, recipeDisplayName, isProximityTitle ) {
    if ( recipeItem.criteriaType === 'Proximity' ) {
        if ( recipeDisplayName.indexOf( '^' ) > 0 ) {
            if( isProximityTitle ) {
            return recipeDisplayName.replace( /\^/g, ',\n' );
            }

            recipeDisplayName = getProximityNSelectedLabel( _nSelectedText, recipeDisplayName );
    }
    return recipeDisplayName;
}
    return recipeDisplayName.split( '_$CAT_' )[0];
};


/**
* Function to get the tooltip for the recipe term
*
* @param {String} recipeItem  Recipe term to display
* @param {Boolean} showMultipleAttrInRecipeTerm  Boolean to indicate if this is multi attribute term
* @return {String} Tooltip for the recipe term
*/
export let getTooltip = function( recipeItem, showMultipleAttrInRecipeTerm ) {
    var strTooltip = null;

    if( showMultipleAttrInRecipeTerm ) {
        if( recipeItem.criteriaDisplayValue ) {
            strTooltip = recipeItem.criteriaDisplayValue;
        }else{
            strTooltip = recipeItem;
        }
        strTooltip = strTooltip.replace( /_\$PROP_/g, ', ' );
        strTooltip = strTooltip.replace( /_\$CAT_/g, ': ' );
    }else{
        strTooltip =  getRecipeLabel( recipeItem, recipeItem.criteriaDisplayValue, true );

        if( selectedTerms( recipeItem.criteriaDisplayValue ).length <= 1 ) {
            // Single select term
            if( strTooltip !== '' ) {
                strTooltip += ': ';
            }
            var recipeValue = getRecipeValue( recipeItem.criteriaDisplayValue );
            strTooltip += recipeValue;
        }
    }
    return strTooltip;
};


/**
 * This function will extract all selected terms in the input recipe criteria and return
 * them as an array.
 *
 * @param {String} recipeDisplayName : Recipe Criteria Display Name
 * @return {String[]} : An array of all selected terms in the input recipe criteria.
 */
export let selectedTerms = function( recipeDisplayName ) {
    var recipeValuesString = getRecipeValue( recipeDisplayName );
    var allSelectedTerms = {};
    if( recipeValuesString ) {
        allSelectedTerms = recipeValuesString.split( '^' );
    }
    return allSelectedTerms;
};

/**
 * This function is to toggle the list of n-selected link.
 *
 *  @param {object} data : The data object
 * @param {String} recipeTermSelected : Selected recipe term
 */
export let expandSelectedPartitionScheme = function( data, recipeTermSelected ) {
    data.expandPartitionSchemes[ String( recipeTermSelected ) ] = !data.expandPartitionSchemes[ String( recipeTermSelected ) ];
    data.doShowInnerRecipeElements = data.expandPartitionSchemes[ String( recipeTermSelected ) ];
};

/**
 * This function is to toggle the 'Group' link.
 *
 * @param {object} data : The data object
 * @param {String} groupTermSelected : Selected group term
 */
export let expandGroup = function( data, groupTermSelected ) {
    data.expandGroupTerms[ String( groupTermSelected ) ] = !data.expandGroupTerms[ String( groupTermSelected ) ];
    data.showGroupTerms =  data.expandGroupTerms[ String( groupTermSelected ) ];
};

export let expandMultipleAttributes = function( data, recipeDisplayName ) {
    data.expandMultiAttributeTerm[ String( recipeDisplayName ) ] = !data.expandMultiAttributeTerm[ String( recipeDisplayName ) ];
    data.showMultiAttributeTerm =  data.expandMultiAttributeTerm[ String( recipeDisplayName ) ];
};

/**
 * This method will extract all the attributes from the recipe display name and return
 * them as an array.
 *
 * @param {String} recipeDisplayName : Display Name for the recipe.
 * @return {String[]} : returns an array of Strings that contain the multiple attributes
 *         in the recipe.
 */
export let getAllAttrFromRecipeTerm = function( recipeDisplayName ) {
    return recipeDisplayName.split( '_$PROP_' );
};

export let deleteRecipe = function( recipeItem, index ) {
    //Publish 'recipeDeleted' event
    eventBus.publish( 'recipeDeleted', {
        recipeItem: recipeItem,
        recipeIndex: index
    } );
};

export let modifyRecipeFilter = function( data, event ) {
    var selectedRecipeOperator = event.currentTarget.id;
    if( selectedRecipeOperator !== data.currentSelection ) {
        //Publish 'operatorModified' event
        eventBus.publish( 'operatorModified', {
            recipeIndex: data.index,
            criteriaOperatorType: selectedRecipeOperator
        } );
    }
};
/**
 * This method will extract the proximity value from the recipe term.
 *
 * @param {Object} recipeItem : Recipe item object.
 * @returns {String} Proximity distance in proximity recipe term
 */
export let getProximityValue = function( recipeItem ) {
    var values = recipeItem.criteriaValues;
    return values[ values.length - 1 ];
};


/**
 * This method will update the proximity value for the recipe term when the user will press the
 * 'Enter' key from the keyboard.
 *
 * @param {object} data : The data object.
 * @param {object} subPanelContext : The subPanelContext object.
 */
export let updateProximityValue = function( data, subPanelContext ) {
    var newProxValue = data.proximityDistanceProp.dbValue;
    //make sure that the input value is valid.
    //check that the new value is not the same as the already set value.
    if( newProxValue && !data.proximityDistanceProp.error && newProxValue !== getProximityValue( subPanelContext.recipeItem ) ) {
        //Publish 'proximityFilterApplied' event, parent directive will modify recipe accordingly and will trigger 'recipeUpdated' event
        eventBus.publish( 'proximityValueUpdated', {
            recipeIndex: data.index,
            newProximityValue: newProxValue
        } );

        //close proximity widget
        eventBus.publish( 'popupService.hide' );
    }
};


export let initializeRecipeTermDisplayValues = function( data, subPanelContext ) {
    if ( data ) {
        if( subPanelContext ) {
            if( subPanelContext.parentIndex ) {
            //append to the present index.
            data.index = subPanelContext.parentIndex + '.' + subPanelContext.index;
            }else{
                data.index = subPanelContext.index;
            }
        }

        _nSelectedText = data.nSelectedText.propertyDisplayName;

        // Multi attribute recipe term is expanded based on
        // user selection. This method will store a map for each
        // multi attribute term in the recipe and its corresponding expansion value.
        data.expandMultiAttributeTerm = {};
        // Initialize variable to indicate if multiple attributes are needed to be shown for recipe term
        data.showMultipleAttrInRecipeTerm = subPanelContext.recipeItem.criteriaDisplayValue.split( '_$PROP_' ).length > 1;

        // Current partition scheme type is expanded based on
        // user selection. This method will store a map for each
        // partition scheme in the recipe and its corresponding expansion state.
        data.expandPartitionSchemes = {};
        // Boolean to indicate if Partition term is shown expanded
        data.doShowInnerRecipeElements = false;

        // Selected 'Group' term is expanded/collapsed based
        // on user selection. This variable will store a map for each
        // group term in the recipe and its corresponding expansion state.
        data.expandGroupTerms = {};
        // Boolean to indicate if Group term is shown expanded
        data.showGroupTerms = false;

        // Representation of recipe term
        data.recipeTermProp = {};

        // N selected recipe term
        data.selectedTerms = selectedTerms( subPanelContext.recipeItem.criteriaDisplayValue );

        // Display name for recipe term
        var recipeTermDisplayName = '';

        if( subPanelContext.recipeItem.criteriaType === 'Group' ) {
            //Create a view model property for storing the proximity term link property.
            recipeTermDisplayName = getRecipeLabel( subPanelContext.recipeItem, subPanelContext.recipeItem.criteriaDisplayValue );
        } else if( subPanelContext.recipeItem.criteriaType === 'Proximity' ) {
            data.proximityDistanceProp = uwPropertyService.createViewModelProperty( '', '', 'STRING', '', '' );
            data.proximityDistanceProp.isEditable = true;
            data.proximityDistanceProp.dbValue = getProximityValue( subPanelContext.recipeItem );
            data.proximityDistanceProp.autofocus = true;

            //Create a view model property for storing the proximity term link property.
            recipeTermDisplayName = getRecipeLabel( subPanelContext.recipeItem, subPanelContext.recipeItem.criteriaDisplayValue );
        } else if( data.selectedTerms.length > 1 ) {
            recipeTermDisplayName = data.selectedTerms.length +  ' '  + _nSelectedText;
        } else if( data.showMultipleAttrInRecipeTerm ) {
            recipeTermDisplayName = getMultiAttributeRecipeTerm( subPanelContext.recipeItem.criteriaDisplayValue );
            data.allAttrFromRecipeTerm = getAllAttrFromRecipeTerm( subPanelContext.recipeItem.criteriaDisplayValue );
            data.allAttrLabels = {};
            data.allAttrValues = {};
            data.allAttrIds = {};
            for( var i = 0; i < data.allAttrFromRecipeTerm.length; ++i ) {
                data.allAttrLabels[data.allAttrFromRecipeTerm[i]] = getRecipeLabel( subPanelContext.recipeItem, data.allAttrFromRecipeTerm[i] );
                data.allAttrValues[data.allAttrFromRecipeTerm[i]] = getRecipeValue(  data.allAttrFromRecipeTerm[i] );
                data.allAttrIds[data.allAttrFromRecipeTerm[i]] = getTooltip( data.allAttrFromRecipeTerm[i], true );
            }
        }

        data.recipeTermProp = uwPropertyService.createViewModelProperty( '', recipeTermDisplayName, 'STRING', '', '' );
        data.recipeTermProp.uiValue = recipeTermDisplayName;
        data.recipeTermLabel.displayName = getRecipeLabel( subPanelContext.recipeItem, subPanelContext.recipeItem.criteriaDisplayValue );
        data.recipeTermValue.displayName = getRecipeValue( subPanelContext.recipeItem.criteriaDisplayValue );
        data.tooltip = getTooltip( subPanelContext.recipeItem, data.showMultipleAttrInRecipeTerm );

        data.deleteRecipeInInnerRecipeList = function( selectedValue, recipeItem, index ) {
            eventBus.publish( 'recipeDeleted', {
                selectedValue: selectedValue,
                recipeItem: recipeItem,
                recipeIndex: index
            } );
        };
    }
};

export default exports = {
    getTooltip,
    selectedTerms,
    getMultiAttributeRecipeTerm,
    expandMultipleAttributes,
    getRecipeValue,
    getProximityNSelectedLabel,
    getRecipeLabel,
    expandSelectedPartitionScheme,
    expandGroup,
    getAllAttrFromRecipeTerm,
    deleteRecipe,
    modifyRecipeFilter,
    getProximityValue,
    updateProximityValue,
    initializeRecipeTermDisplayValues
};
app.factory( 'recipeTermService', () => exports );
